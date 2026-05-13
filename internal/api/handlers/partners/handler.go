package partners

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/indica-ai/indica-ai/internal/api/dto"
	"github.com/indica-ai/indica-ai/internal/api/handlers/payouts"
	"github.com/indica-ai/indica-ai/internal/api/middleware"
	"github.com/indica-ai/indica-ai/internal/domain/fraud"
	"github.com/indica-ai/indica-ai/internal/platform/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Handler handles partner-facing endpoints.
type Handler struct {
	pool        *pgxpool.Pool
	fraudEngine *fraud.Engine
	logger      *slog.Logger
}

// New creates a new partners handler.
func New(pool *pgxpool.Pool, fraudEngine *fraud.Engine, logger *slog.Logger) *Handler {
	return &Handler{pool: pool, fraudEngine: fraudEngine, logger: logger}
}

// getPartnerID resolves the authenticated user to a partner within the tenant.
func (h *Handler) getPartnerID(r *http.Request) (uuid.UUID, error) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		return uuid.Nil, fmt.Errorf("missing claims")
	}
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	var partnerID uuid.UUID
	err := h.pool.QueryRow(r.Context(),
		`SELECT id FROM partners WHERE user_id = $1 AND tenant_id = $2 LIMIT 1`,
		claims.UserID, tenantID).Scan(&partnerID)
	return partnerID, err
}

// Wallet handles GET /partners/me/wallet — PAY-06
func (h *Handler) Wallet(w http.ResponseWriter, r *http.Request) {
	partnerID, err := h.getPartnerID(r)
	if err != nil {
		writeError(w, http.StatusNotFound, "partner not found for authenticated user")
		return
	}

	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	var wallet dto.WalletResponse
	err = h.pool.QueryRow(r.Context(),
		`SELECT
		    COALESCE(SUM(r.amount_cents), 0)
		        FILTER (WHERE r.status = 'approved'
		                  AND r.approved_at + COALESCE((p_prog.settings->>'hold_days')::int, 7) * INTERVAL '1 day' <= now())
		      - COALESCE(SUM(py.amount_cents), 0)
		        FILTER (WHERE py.status IN ('pending', 'processing', 'paid'))
		    AS available_cents,
		    COALESCE(SUM(r.amount_cents), 0)
		        FILTER (WHERE r.status = 'approved'
		                  AND r.approved_at + COALESCE((p_prog.settings->>'hold_days')::int, 7) * INTERVAL '1 day' > now())
		    AS hold_cents,
		    COALESCE(SUM(r.amount_cents), 0)
		        FILTER (WHERE r.status = 'pending')
		    AS pending_cents,
		    COALESCE(SUM(py.amount_cents), 0)
		        FILTER (WHERE py.status = 'paid')
		    AS total_paid_cents
		 FROM partners pa
		 JOIN programs p_prog ON p_prog.id = pa.program_id
		 LEFT JOIN rewards r ON r.partner_id = pa.id AND r.tenant_id = pa.tenant_id
		 LEFT JOIN payouts py ON py.partner_id = pa.id AND py.tenant_id = pa.tenant_id
		 WHERE pa.id = $1 AND pa.tenant_id = $2
		 GROUP BY pa.id`,
		partnerID, tenantID).Scan(
		&wallet.AvailableCents, &wallet.HoldCents,
		&wallet.PendingCents, &wallet.TotalPaidCents)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load wallet")
		return
	}
	wallet.Currency = "BRL"

	writeJSON(w, http.StatusOK, wallet)
}

// Payouts handles GET /partners/me/payouts — PAY-07
func (h *Handler) Payouts(w http.ResponseWriter, r *http.Request) {
	partnerID, err := h.getPartnerID(r)
	if err != nil {
		writeError(w, http.StatusNotFound, "partner not found for authenticated user")
		return
	}

	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Count
	var total int64
	h.pool.QueryRow(r.Context(),
		`SELECT COUNT(*) FROM payouts WHERE partner_id = $1 AND tenant_id = $2`,
		partnerID, tenantID).Scan(&total)

	rows, err := h.pool.Query(r.Context(),
		`SELECT id, amount_cents, currency, method, status, paid_at, created_at
		 FROM payouts
		 WHERE partner_id = $1 AND tenant_id = $2
		 ORDER BY created_at DESC
		 LIMIT $3 OFFSET $4`,
		partnerID, tenantID, limit, offset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list payouts")
		return
	}
	defer rows.Close()

	payouts := make([]dto.PartnerPayoutListItemResponse, 0)
	for rows.Next() {
		var p dto.PartnerPayoutListItemResponse
		if err := rows.Scan(&p.ID, &p.AmountCents, &p.Currency, &p.Method, &p.Status, &p.PaidAt, &p.CreatedAt); err != nil {
			continue
		}
		payouts = append(payouts, p)
	}

	writeJSON(w, http.StatusOK, dto.PartnerPayoutsResponse{
		Payouts:    payouts,
		TotalCount: total,
		Page:       page,
		Limit:      limit,
	})
}

// UpdatePixKey handles PATCH /partners/me/pix-key — PAY-08
func (h *Handler) UpdatePixKey(w http.ResponseWriter, r *http.Request) {
	partnerID, err := h.getPartnerID(r)
	if err != nil {
		writeError(w, http.StatusNotFound, "partner not found for authenticated user")
		return
	}

	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	var req dto.UpdatePixKeyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate pix key format
	if err := payouts.ValidatePixKey(req.PixKey, req.PixKeyType); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	_, err = h.pool.Exec(r.Context(),
		`UPDATE partners SET pix_key = $3, pix_key_type = $4, updated_at = now()
		 WHERE id = $1 AND tenant_id = $2`,
		partnerID, tenantID, req.PixKey, req.PixKeyType)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update pix key")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"message":       "pix key updated",
		"pix_key_type":  req.PixKeyType,
	})
}

// partnerMeResponse mirrors the frontend `PartnerMe` interface.
type partnerMeResponse struct {
	PartnerID            uuid.UUID       `json:"partner_id"`
	Name                 string          `json:"name"`
	Email                *string         `json:"email"`
	PhoneE164            *string         `json:"phone_e164"`
	Status               string          `json:"status"`
	ProgramID            uuid.UUID       `json:"program_id"`
	ProgramName          string          `json:"program_name"`
	ProgramRules         json.RawMessage `json:"program_rules"`
	LinkURL              *string         `json:"link_url"`
	Clicks               int64           `json:"clicks"`
	Referrals            int64           `json:"referrals"`
	PendingRewardsCents  int64           `json:"pending_rewards_cents"`
	ApprovedRewardsCents int64           `json:"approved_rewards_cents"`
	PaidRewardsCents     int64           `json:"paid_rewards_cents"`
	CreatedAt            time.Time       `json:"created_at"`
}

// Me handles GET /api/partner/me — home page bootstrap for the partner app.
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	partnerID, err := h.getPartnerID(r)
	if err != nil {
		writeError(w, http.StatusNotFound, "partner not found for authenticated user")
		return
	}
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	var resp partnerMeResponse
	err = h.pool.QueryRow(r.Context(),
		`SELECT
		    p.id, p.name, p.email, p.phone_e164, p.status, p.created_at,
		    prog.id, prog.name, prog.rules,
		    (SELECT url FROM partner_links WHERE partner_id = p.id ORDER BY created_at DESC LIMIT 1) AS link_url,
		    COALESCE((SELECT SUM(click_count)::bigint FROM partner_links WHERE partner_id = p.id), 0) AS clicks,
		    (SELECT COUNT(*)::bigint FROM referrals WHERE partner_id = p.id) AS referrals,
		    COALESCE((SELECT SUM(amount_cents)::bigint FROM rewards WHERE partner_id = p.id AND status = 'pending'), 0) AS pending_rewards,
		    COALESCE((SELECT SUM(amount_cents)::bigint FROM rewards WHERE partner_id = p.id AND status = 'approved'), 0) AS approved_rewards,
		    COALESCE((SELECT SUM(amount_cents)::bigint FROM rewards WHERE partner_id = p.id AND status = 'paid'), 0) AS paid_rewards
		 FROM partners p
		 JOIN programs prog ON prog.id = p.program_id
		 WHERE p.id = $1 AND p.tenant_id = $2`,
		partnerID, tenantID).Scan(
		&resp.PartnerID, &resp.Name, &resp.Email, &resp.PhoneE164, &resp.Status, &resp.CreatedAt,
		&resp.ProgramID, &resp.ProgramName, &resp.ProgramRules,
		&resp.LinkURL,
		&resp.Clicks, &resp.Referrals,
		&resp.PendingRewardsCents, &resp.ApprovedRewardsCents, &resp.PaidRewardsCents,
	)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load partner profile")
		return
	}

	writeJSON(w, http.StatusOK, resp)
}

// partnerReferralResponse mirrors the frontend `PartnerReferral` interface.
type partnerReferralResponse struct {
	LeadID          uuid.UUID  `json:"lead_id"`
	LeadName        *string    `json:"lead_name"`
	Status          string     `json:"status"`
	Source          string     `json:"source"`
	CreatedAt       time.Time  `json:"created_at"`
	ClosedAt        *time.Time `json:"closed_at"`
	SaleAmountCents *int64     `json:"sale_amount_cents"`
	RewardCents     *int64     `json:"reward_cents"`
	RewardStatus    *string    `json:"reward_status"`
}

// Referrals handles GET /api/partner/referrals — list of leads attributed to this partner.
func (h *Handler) Referrals(w http.ResponseWriter, r *http.Request) {
	partnerID, err := h.getPartnerID(r)
	if err != nil {
		writeError(w, http.StatusNotFound, "partner not found for authenticated user")
		return
	}
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	rows, err := h.pool.Query(r.Context(),
		`SELECT
		    l.id, l.name, l.status, l.source, l.created_at, l.closed_at,
		    s.amount_cents AS sale_amount_cents,
		    rw.amount_cents AS reward_cents,
		    rw.status AS reward_status
		 FROM leads l
		 JOIN referrals ref ON ref.id = l.referral_id
		 LEFT JOIN sales s ON s.lead_id = l.id
		 LEFT JOIN rewards rw ON rw.referral_id = ref.id
		 WHERE ref.partner_id = $1 AND ref.tenant_id = $2
		 ORDER BY l.created_at DESC
		 LIMIT 100`,
		partnerID, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list referrals")
		return
	}
	defer rows.Close()

	out := make([]partnerReferralResponse, 0)
	for rows.Next() {
		var ref partnerReferralResponse
		if err := rows.Scan(
			&ref.LeadID, &ref.LeadName, &ref.Status, &ref.Source, &ref.CreatedAt, &ref.ClosedAt,
			&ref.SaleAmountCents, &ref.RewardCents, &ref.RewardStatus,
		); err != nil {
			continue
		}
		out = append(out, ref)
	}

	writeJSON(w, http.StatusOK, out)
}

// createLeadRequest mirrors the frontend `CreatePartnerLeadRequest`.
type createLeadRequest struct {
	Name        string          `json:"name"`
	PhoneE164   string          `json:"phone_e164"`
	Email       string          `json:"email"`
	Notes       string          `json:"notes"`
	SplitChoice json.RawMessage `json:"split_choice"`
}

// CreateLead handles POST /api/partner/leads — partner-initiated manual lead creation.
func (h *Handler) CreateLead(w http.ResponseWriter, r *http.Request) {
	partnerID, err := h.getPartnerID(r)
	if err != nil {
		writeError(w, http.StatusNotFound, "partner not found for authenticated user")
		return
	}
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	var req createLeadRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.PhoneE164 = strings.TrimSpace(req.PhoneE164)
	if req.PhoneE164 == "" {
		writeError(w, http.StatusBadRequest, "phone_e164 is required")
		return
	}

	// Look up partner's program_id and current rules snapshot
	var programID uuid.UUID
	var rulesSnapshot json.RawMessage
	err = h.pool.QueryRow(r.Context(),
		`SELECT p.program_id, prog.rules
		   FROM partners p
		   JOIN programs prog ON prog.id = p.program_id
		  WHERE p.id = $1 AND p.tenant_id = $2`,
		partnerID, tenantID).Scan(&programID, &rulesSnapshot)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to load partner program")
		return
	}

	phoneHash := hashLower(req.PhoneE164)
	var emailHash *string
	if req.Email != "" {
		h := hashLower(strings.ToLower(req.Email))
		emailHash = &h
	}

	// Fraud check — fail-open on error (log but don't block the flow).
	attributionScore := 1.0
	var fraudResult *fraud.Result
	if h.fraudEngine != nil {
		emailHashStr := ""
		if emailHash != nil {
			emailHashStr = *emailHash
		}
		fraudResult, err = h.fraudEngine.Check(r.Context(), fraud.LeadCreationInput{
			PartnerID: partnerID,
			TenantID:  tenantID,
			PhoneHash: phoneHash,
			EmailHash: emailHashStr,
			Now:       time.Now(),
		})
		if err != nil {
			h.logger.Warn("fraud check failed, continuing (fail-open)", "error", err, "partner_id", partnerID)
		} else {
			// Audit log for all outcomes.
			fraud.LogAudit(r.Context(), h.pool, h.logger, tenantID, partnerID, fraudResult, extractIP(r), r.UserAgent())

			switch fraudResult.Action {
			case fraud.ActionBlock:
				writeError(w, http.StatusForbidden, "request rejected")
				return
			case fraud.ActionReview:
				attributionScore = fraud.AttributionScoreFor(fraud.ActionReview)
			}
		}
	}

	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin tx")
		return
	}
	defer tx.Rollback(r.Context())

	// SEC-01: arm Postgres RLS for this transaction so a logic bug in our
	// explicit tenant_id filtering can't leak data across tenants.
	if _, err := tx.Exec(r.Context(), "SET LOCAL app.current_tenant = $1", tid); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to set tenant context")
		return
	}

	// Dedup: if a lead already exists for (program_id, phone_hash), reuse it.
	var leadID uuid.UUID
	err = tx.QueryRow(r.Context(),
		`SELECT id FROM leads WHERE program_id = $1 AND phone_hash = $2`,
		programID, phoneHash).Scan(&leadID)
	if errors.Is(err, pgx.ErrNoRows) {
		// Create a placeholder referral first so we can satisfy leads.referral_id
		// in a single round-trip pattern. We'll backfill referral_id after insert.
		leadID = uuid.New()
		nameArg := pointerIfNotEmpty(req.Name)
		emailArg := pointerIfNotEmpty(req.Email)
		notesArg := pointerIfNotEmpty(req.Notes)
		_, err = tx.Exec(r.Context(),
			`INSERT INTO leads (id, tenant_id, program_id, name, email, email_hash, phone_e164, phone_hash, source, notes)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'manual', $9)`,
			leadID, tenantID, programID, nameArg, emailArg, emailHash, req.PhoneE164, phoneHash, notesArg)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to create lead")
			return
		}
	} else if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to dedup lead")
		return
	}

	// Create referral linking partner → lead → program
	referralID := uuid.New()
	var splitArg interface{}
	if len(req.SplitChoice) > 0 {
		splitArg = req.SplitChoice
	}
	_, err = tx.Exec(r.Context(),
		`INSERT INTO referrals (id, tenant_id, program_id, partner_id, rule_snapshot, split_choice, attribution_model, attribution_score, attributed_at)
		 VALUES ($1, $2, $3, $4, $5, $6, 'manual', $7, now())`,
		referralID, tenantID, programID, partnerID, rulesSnapshot, splitArg, attributionScore)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create referral")
		return
	}

	// Attach referral_id to lead (we may have created the lead in this tx OR reused an existing one).
	_, err = tx.Exec(r.Context(),
		`UPDATE leads SET referral_id = $1, updated_at = now() WHERE id = $2 AND referral_id IS NULL`,
		referralID, leadID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to link referral to lead")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{
		"lead_id":     leadID.String(),
		"referral_id": referralID.String(),
	})
}

func hashLower(v string) string {
	sum := sha256.Sum256([]byte(strings.ToLower(v)))
	return hex.EncodeToString(sum[:])
}

func pointerIfNotEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// ---------- Tenant-admin partner CRUD (called by the dashboard) ----------

func trackingBaseURL() string {
	if v := os.Getenv("TRACKING_BASE_URL"); v != "" {
		return strings.TrimRight(v, "/")
	}
	return "https://api.181-215-134-11.sslip.io"
}

type partnerAdminResponse struct {
	ID              uuid.UUID `json:"id"`
	Name            string    `json:"name"`
	Email           *string   `json:"email"`
	PhoneE164       *string   `json:"phone_e164"`
	Status          string    `json:"status"`
	ProgramID       uuid.UUID `json:"program_id"`
	ProgramName     string    `json:"program_name"`
	LinkSlug        *string   `json:"link_slug"`
	LinkURL         *string   `json:"link_url"`
	Referrals       int64     `json:"referrals"`
	Clicks          int64     `json:"clicks"`
	CommissionCents int64     `json:"commission_cents"`
	CreatedAt       time.Time `json:"created_at"`
}

type createPartnerAdminRequest struct {
	Name      string `json:"name"`
	Email     string `json:"email"`
	PhoneE164 string `json:"phone_e164"`
	ProgramID string `json:"program_id"`
}

// AdminCreate handles POST /api/partners — admin invites a partner into one
// of their programs. Creates partner + partner_link atomically so the admin
// has a shareable URL immediately.
func (h *Handler) AdminCreate(w http.ResponseWriter, r *http.Request) {
	var req createPartnerAdminRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}
	programID, err := uuid.Parse(req.ProgramID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid program_id")
		return
	}

	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	var programName string
	err = h.pool.QueryRow(r.Context(),
		`SELECT name FROM programs WHERE id = $1 AND tenant_id = $2`,
		programID, tenantID).Scan(&programName)
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "program not found")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to verify program")
		return
	}

	partnerID := uuid.New()
	var emailArg, emailHashArg, phoneArg, phoneHashArg *string
	if req.Email != "" {
		em := strings.ToLower(strings.TrimSpace(req.Email))
		emailArg = &em
		eh := hashLower(em)
		emailHashArg = &eh
	}
	if req.PhoneE164 != "" {
		p := strings.TrimSpace(req.PhoneE164)
		phoneArg = &p
		ph := hashLower(p)
		phoneHashArg = &ph
	}

	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin tx")
		return
	}
	defer tx.Rollback(r.Context())

	if _, err := tx.Exec(r.Context(), "SET LOCAL app.current_tenant = '"+tenantID.String()+"'"); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to set tenant context: "+err.Error())
		return
	}

	_, err = tx.Exec(r.Context(),
		`INSERT INTO partners (id, tenant_id, program_id, name, email, email_hash, phone_e164, phone_hash, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')`,
		partnerID, tenantID, programID, req.Name,
		emailArg, emailHashArg, phoneArg, phoneHashArg)
	if err != nil {
		writeError(w, http.StatusConflict, "partner with this email or phone already exists in the program")
		return
	}

	slug := partnerID.String()[:8]
	url := trackingBaseURL() + "/r/" + slug
	_, err = tx.Exec(r.Context(),
		`INSERT INTO partner_links (tenant_id, program_id, partner_id, slug, url)
		 VALUES ($1, $2, $3, $4, $5)`,
		tenantID, programID, partnerID, slug, url)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create tracking link")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit")
		return
	}

	writeJSON(w, http.StatusCreated, partnerAdminResponse{
		ID:          partnerID,
		Name:        req.Name,
		Email:       emailArg,
		PhoneE164:   phoneArg,
		Status:      "active",
		ProgramID:   programID,
		ProgramName: programName,
		LinkSlug:    &slug,
		LinkURL:     &url,
		Referrals:   0,
		Clicks:      0,
		CreatedAt:   time.Now(),
	})
}

// AdminList handles GET /api/partners — flat list of every partner in the
// tenant with the aggregates the dashboard table renders.
func (h *Handler) AdminList(w http.ResponseWriter, r *http.Request) {
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	rows, err := h.pool.Query(r.Context(),
		`SELECT
		    pa.id, pa.name, pa.email, pa.phone_e164, pa.status, pa.created_at,
		    pa.program_id, prog.name,
		    pl.slug, pl.url,
		    COALESCE(pl.click_count, 0)::bigint AS clicks,
		    (SELECT COUNT(*)::bigint FROM referrals WHERE partner_id = pa.id) AS referrals,
		    COALESCE((SELECT SUM(amount_cents)::bigint FROM rewards
		               WHERE partner_id = pa.id AND status IN ('approved','paid')), 0) AS commission
		 FROM partners pa
		 JOIN programs prog ON prog.id = pa.program_id
		 LEFT JOIN LATERAL (
		    SELECT slug, url, click_count FROM partner_links
		     WHERE partner_id = pa.id ORDER BY created_at DESC LIMIT 1
		 ) pl ON true
		 WHERE pa.tenant_id = $1
		 ORDER BY pa.created_at DESC`,
		tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list partners")
		return
	}
	defer rows.Close()

	out := make([]partnerAdminResponse, 0)
	for rows.Next() {
		var p partnerAdminResponse
		if err := rows.Scan(
			&p.ID, &p.Name, &p.Email, &p.PhoneE164, &p.Status, &p.CreatedAt,
			&p.ProgramID, &p.ProgramName,
			&p.LinkSlug, &p.LinkURL,
			&p.Clicks, &p.Referrals, &p.CommissionCents,
		); err != nil {
			continue
		}
		out = append(out, p)
	}
	writeJSON(w, http.StatusOK, out)
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, dto.ErrorResponse{Error: msg})
}

func extractIP(r *http.Request) net.IP {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		if ip := net.ParseIP(strings.Split(fwd, ",")[0]); ip != nil {
			return ip
		}
	}
	if ip := net.ParseIP(strings.Split(r.RemoteAddr, ":")[0]); ip != nil {
		return ip
	}
	return nil
}
