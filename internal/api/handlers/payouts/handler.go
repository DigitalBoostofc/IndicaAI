package payouts

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/indica-ai/indica-ai/internal/api/dto"
	"github.com/indica-ai/indica-ai/internal/api/middleware"
	"github.com/indica-ai/indica-ai/internal/platform/db"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Handler handles payout endpoints.
type Handler struct {
	pool *pgxpool.Pool
}

// New creates a new payouts handler.
func New(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

// List handles GET /tenants/me/payouts — PAY-02
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	status := r.URL.Query().Get("status")
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if page <= 0 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Count total
	var total int64
	err := h.pool.QueryRow(r.Context(),
		`SELECT COUNT(*) FROM payouts WHERE tenant_id = $1 AND ($2 = '' OR status = $2)`,
		tenantID, status).Scan(&total)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to count payouts")
		return
	}

	rows, err := h.pool.Query(r.Context(),
		`SELECT p.id, p.partner_id, pt.name, p.pix_key, p.pix_key_type,
		        p.amount_cents, p.currency, p.method, p.status, p.created_at,
		        array_length(p.reward_ids, 1)
		 FROM payouts p
		 JOIN partners pt ON pt.id = p.partner_id AND pt.tenant_id = p.tenant_id
		 WHERE p.tenant_id = $1 AND ($2 = '' OR p.status = $2)
		 ORDER BY p.created_at DESC
		 LIMIT $3 OFFSET $4`,
		tenantID, status, limit, offset)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list payouts")
		return
	}
	defer rows.Close()

	payouts := make([]dto.PayoutListItemResponse, 0)
	for rows.Next() {
		var p dto.PayoutListItemResponse
		var pixKey, pixKeyType *string
		var rewardCount *int
		err := rows.Scan(&p.ID, &p.PartnerID, &p.PartnerName, &pixKey, &pixKeyType,
			&p.AmountCents, &p.Currency, &p.Method, &p.Status, &p.CreatedAt, &rewardCount)
		if err != nil {
			continue
		}
		if pixKey != nil {
			p.PixKey = *pixKey
		}
		if pixKeyType != nil {
			p.PixKeyType = *pixKeyType
		}
		if rewardCount != nil {
			p.RewardCount = *rewardCount
		}
		payouts = append(payouts, p)
	}

	writeJSON(w, http.StatusOK, dto.ListPayoutsResponse{
		Payouts:    payouts,
		TotalCount: total,
		Page:       page,
		Limit:      limit,
	})
}

// Confirm handles POST /tenants/me/payouts/{id}/confirm — PAY-03
func (h *Handler) Confirm(w http.ResponseWriter, r *http.Request) {
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)
	claims, _ := middleware.ClaimsFromContext(r.Context())

	payoutID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid payout id")
		return
	}

	// Idempotency check
	idempotencyKey := r.Header.Get("Idempotency-Key")
	if idempotencyKey == "" {
		idempotencyKey = fmt.Sprintf("confirm-payout-%s", payoutID)
	}

	if cached, ok := h.checkIdempotency(r, idempotencyKey, tenantID); ok {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(cached.StatusCode)
		w.Write(cached.Body)
		return
	}

	// Transition pending → processing
	var payoutIDOut uuid.UUID
	var status string
	err = h.pool.QueryRow(r.Context(),
		`UPDATE payouts SET status = 'processing', updated_at = now()
		 WHERE id = $1 AND tenant_id = $2 AND status = 'pending'
		 RETURNING id, status`, payoutID, tenantID).Scan(&payoutIDOut, &status)
	if err == pgx.ErrNoRows {
		// Check if payout exists but wrong status
		var currentStatus string
		h.pool.QueryRow(r.Context(),
			`SELECT status FROM payouts WHERE id = $1 AND tenant_id = $2`,
			payoutID, tenantID).Scan(&currentStatus)
		if currentStatus == "processing" || currentStatus == "paid" {
			// Already confirmed — idempotent response
			resp := map[string]string{"id": payoutID.String(), "status": currentStatus, "message": "already confirmed"}
			h.saveIdempotency(r, idempotencyKey, tenantID, http.StatusOK, resp)
			writeJSON(w, http.StatusOK, resp)
			return
		}
		writeError(w, http.StatusNotFound, "payout not found or not in pending status")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to confirm payout")
		return
	}

	// Audit log
	h.insertAuditLog(r.Context(), tenantID, claims.UserID, payoutID, "payout.confirmed", nil, map[string]string{"status": "processing"})

	resp := map[string]string{"id": payoutIDOut.String(), "status": status, "message": "payout confirmed"}
	h.saveIdempotency(r, idempotencyKey, tenantID, http.StatusOK, resp)
	writeJSON(w, http.StatusOK, resp)
}

// Paid handles POST /tenants/me/payouts/{id}/paid — PAY-04
func (h *Handler) Paid(w http.ResponseWriter, r *http.Request) {
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)
	claims, _ := middleware.ClaimsFromContext(r.Context())

	payoutID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid payout id")
		return
	}

	var req dto.PaidPayoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Empty body is ok
		req = dto.PaidPayoutRequest{}
	}

	// Build metadata for receipt_url
	metadata := "{}"
	if req.ReceiptURL != "" {
		metadata = fmt.Sprintf(`{"receipt_url":"%s"}`, req.ReceiptURL)
	}

	// Atomic: update payout + update rewards in a transaction
	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback(r.Context())

	// Set tenant for RLS
	// SET LOCAL doesn't accept bind parameters via prepared-statement protocol —
	// interpolate the (already-parsed) UUID directly so the GUC actually lands
	// and RLS sees the right tenant inside the tx.
	tx.Exec(r.Context(), "SET LOCAL app.current_tenant = '"+tenantID.String()+"'")

	// Transition processing → paid
	var payoutIDOut uuid.UUID
	var paidAt time.Time
	err = tx.QueryRow(r.Context(),
		`UPDATE payouts SET status = 'paid', paid_at = COALESCE($3, now()),
		        metadata = metadata || $4::jsonb, updated_at = now()
		 WHERE id = $1 AND tenant_id = $2 AND status = 'processing'
		 RETURNING id, paid_at`, payoutID, tenantID, req.PaidAt, metadata).Scan(&payoutIDOut, &paidAt)
	if err == pgx.ErrNoRows {
		// Check current status
		var currentStatus string
		h.pool.QueryRow(r.Context(),
			`SELECT status FROM payouts WHERE id = $1 AND tenant_id = $2`,
			payoutID, tenantID).Scan(&currentStatus)
		if currentStatus == "paid" {
			writeJSON(w, http.StatusOK, map[string]string{"id": payoutID.String(), "status": "paid", "message": "already paid"})
			return
		}
		writeError(w, http.StatusConflict, fmt.Sprintf("payout not in processing status (current: %s)", currentStatus))
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to mark payout as paid")
		return
	}

	// Update rewards that belong to this payout to status='paid'
	_, err = tx.Exec(r.Context(),
		`UPDATE rewards SET status = 'paid', updated_at = now()
		 WHERE id = ANY(SELECT unnest(reward_ids) FROM payouts WHERE id = $1 AND tenant_id = $2)
		   AND tenant_id = $2`, payoutID, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update rewards")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit transaction")
		return
	}

	// Audit log
	h.insertAuditLog(r.Context(), tenantID, claims.UserID, payoutID, "payout.paid",
		map[string]string{"status": "processing"},
		map[string]string{"status": "paid", "paid_at": paidAt.Format(time.RFC3339)})

	writeJSON(w, http.StatusOK, map[string]string{"id": payoutIDOut.String(), "status": "paid", "message": "payout marked as paid"})
}

// Cancel handles POST /tenants/me/payouts/{id}/cancel — PAY-05
func (h *Handler) Cancel(w http.ResponseWriter, r *http.Request) {
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)
	claims, _ := middleware.ClaimsFromContext(r.Context())

	payoutID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid payout id")
		return
	}

	var req dto.CancelPayoutRequest
	json.NewDecoder(r.Body).Decode(&req) // optional body

	// Atomic: cancel payout + revert rewards
	tx, err := h.pool.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to begin transaction")
		return
	}
	defer tx.Rollback(r.Context())

	// SET LOCAL doesn't accept bind parameters via prepared-statement protocol —
	// interpolate the (already-parsed) UUID directly so the GUC actually lands
	// and RLS sees the right tenant inside the tx.
	tx.Exec(r.Context(), "SET LOCAL app.current_tenant = '"+tenantID.String()+"'")

	var payoutIDOut uuid.UUID
	err = tx.QueryRow(r.Context(),
		`UPDATE payouts SET status = 'cancelled', failure_reason = $3, updated_at = now()
		 WHERE id = $1 AND tenant_id = $2 AND status IN ('pending', 'processing')
		 RETURNING id`, payoutID, tenantID, req.Reason).Scan(&payoutIDOut)
	if err == pgx.ErrNoRows {
		writeError(w, http.StatusNotFound, "payout not found or already in terminal state")
		return
	}
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to cancel payout")
		return
	}

	// Revert rewards to approved
	_, err = tx.Exec(r.Context(),
		`UPDATE rewards SET status = 'approved', updated_at = now()
		 WHERE id = ANY(SELECT unnest(reward_ids) FROM payouts WHERE id = $1 AND tenant_id = $2)
		   AND tenant_id = $2`, payoutID, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to revert rewards")
		return
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to commit transaction")
		return
	}

	// Audit log
	metadata := map[string]string{"status": "cancelled"}
	if req.Reason != "" {
		metadata["reason"] = req.Reason
	}
	h.insertAuditLog(r.Context(), tenantID, claims.UserID, payoutID, "payout.cancelled", nil, metadata)

	writeJSON(w, http.StatusOK, map[string]string{"id": payoutIDOut.String(), "status": "cancelled", "message": "payout cancelled"})
}

// CreatePayoutsJob — PAY-01
// Groups approved rewards with expired hold per partner → INSERT payouts (pending).
// Called by cron or manually. Returns the number of payouts created.
func CreatePayoutsJob(pool *pgxpool.Pool, logger *slog.Logger) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tid, _ := db.GetTenantID(r.Context())
		tenantID, _ := uuid.Parse(tid)

		// Get all eligible rewards grouped by partner
		rows, err := pool.Query(r.Context(),
			`SELECT r.id, r.partner_id, r.amount_cents, r.program_id
			 FROM rewards r
			 JOIN partners pa ON pa.id = r.partner_id AND pa.tenant_id = r.tenant_id
			 JOIN programs p ON p.id = r.program_id
			 WHERE r.tenant_id = $1
			   AND r.status = 'approved'
			   AND pa.pix_key IS NOT NULL AND pa.pix_key != ''
			   AND r.approved_at + COALESCE((p.settings->>'hold_days')::int, 7) * INTERVAL '1 day' <= now()
			 ORDER BY r.partner_id, r.approved_at ASC`, tenantID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to query eligible rewards")
			return
		}
		defer rows.Close()

		// Group by partner
		type rewardInfo struct {
			ID          uuid.UUID
			PartnerID   uuid.UUID
			AmountCents int64
			ProgramID   uuid.UUID
		}
		partnerRewards := make(map[uuid.UUID][]rewardInfo)
		for rows.Next() {
			var ri rewardInfo
			if err := rows.Scan(&ri.ID, &ri.PartnerID, &ri.AmountCents, &ri.ProgramID); err != nil {
				continue
			}
			partnerRewards[ri.PartnerID] = append(partnerRewards[ri.PartnerID], ri)
		}

		created := 0
		for partnerID, rewards := range partnerRewards {
			// Idempotency: skip if partner already has a pending payout
			var exists bool
			err := pool.QueryRow(r.Context(),
				`SELECT EXISTS(SELECT 1 FROM payouts WHERE partner_id = $1 AND tenant_id = $2 AND status = 'pending')`,
				partnerID, tenantID).Scan(&exists)
			if err != nil || exists {
				continue
			}

			// Sum amount
			var totalCents int64
			rewardIDs := make([]uuid.UUID, 0, len(rewards))
			for _, rw := range rewards {
				totalCents += rw.AmountCents
				rewardIDs = append(rewardIDs, rw.ID)
			}

			// Get partner pix_key snapshot
			var pixKey, pixKeyType string
			err = pool.QueryRow(r.Context(),
				`SELECT pix_key, pix_key_type FROM partners WHERE id = $1 AND tenant_id = $2`,
				partnerID, tenantID).Scan(&pixKey, &pixKeyType)
			if err != nil {
				continue
			}

			// Create payout
			payoutID, _ := uuid.NewV7()
			_, err = pool.Exec(r.Context(),
				`INSERT INTO payouts (id, tenant_id, partner_id, reward_ids, amount_cents, currency, method, status, pix_key, pix_key_type)
				 VALUES ($1, $2, $3, $4, $5, 'BRL', 'pix', 'pending', $6, $7)`,
				payoutID, tenantID, partnerID, rewardIDs, totalCents, pixKey, pixKeyType)
			if err != nil {
				logger.Error("failed to create payout", "partner_id", partnerID, "error", err)
				continue
			}
			created++
		}

		writeJSON(w, http.StatusOK, map[string]any{"created": created, "message": "payouts job completed"})
	}
}

// --- helpers ---

type idempotencyResult struct {
	StatusCode int
	Body       []byte
}

func (h *Handler) checkIdempotency(r *http.Request, key string, tenantID uuid.UUID) (idempotencyResult, bool) {
	var body []byte
	var statusCode int
	err := h.pool.QueryRow(r.Context(),
		`SELECT response_body, status_code FROM idempotency_keys
		 WHERE key = $1 AND tenant_id = $2 AND expires_at > now()`,
		key, tenantID).Scan(&body, &statusCode)
	if err != nil {
		return idempotencyResult{}, false
	}
	return idempotencyResult{StatusCode: statusCode, Body: body}, true
}

func (h *Handler) saveIdempotency(r *http.Request, key string, tenantID uuid.UUID, statusCode int, resp any) {
	body, _ := json.Marshal(resp)
	reqHash := sha256.Sum256(body)
	h.pool.Exec(r.Context(),
		`INSERT INTO idempotency_keys (key, tenant_id, request_hash, response_body, status_code, expires_at)
		 VALUES ($1, $2, $3, $4, $5, now() + interval '24 hours')
		 ON CONFLICT (key, tenant_id) DO UPDATE SET response_body = $4, status_code = $5`,
		key, tenantID, fmt.Sprintf("%x", reqHash), body, statusCode)
}

func (h *Handler) insertAuditLog(ctx context.Context, tenantID, userID uuid.UUID, entityID uuid.UUID, action string, oldValues, newValues any) {
	oldJSON, _ := json.Marshal(oldValues)
	newJSON, _ := json.Marshal(newValues)
	h.pool.Exec(ctx,
		`INSERT INTO audit_log (id, tenant_id, user_id, action, entity_type, entity_id, old_values, new_values, metadata)
		 VALUES ($1, $2, $3, $4, 'payout', $5, $6, $7, '{}')`,
		uuid.New(), tenantID, userID, action, entityID, oldJSON, newJSON)
}

// PixKey validation regexes
var (
	pixCPF    = regexp.MustCompile(`^\d{11}$`)
	pixCNPJ   = regexp.MustCompile(`^\d{14}$`)
	pixEmail  = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	pixPhone  = regexp.MustCompile(`^\+\d{10,15}$`)
	pixRandom = regexp.MustCompile(`^[0-9a-fA-F]{32}$`)
)

// ValidatePixKey validates the format of a pix key by type.
func ValidatePixKey(pixKey, pixKeyType string) error {
	switch pixKeyType {
	case "cpf":
		if !pixCPF.MatchString(pixKey) {
			return fmt.Errorf("invalid CPF format: must be 11 digits")
		}
	case "cnpj":
		if !pixCNPJ.MatchString(pixKey) {
			return fmt.Errorf("invalid CNPJ format: must be 14 digits")
		}
	case "email":
		if !pixEmail.MatchString(pixKey) {
			return fmt.Errorf("invalid email format")
		}
	case "phone":
		if !pixPhone.MatchString(pixKey) {
			return fmt.Errorf("invalid phone format: must be E.164 (e.g. +5511999999999)")
		}
	case "random":
		if !pixRandom.MatchString(pixKey) {
			return fmt.Errorf("invalid random key format: must be 32 hex characters")
		}
	default:
		return fmt.Errorf("invalid pix_key_type: must be cpf, cnpj, email, phone, or random")
	}
	return nil
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, dto.ErrorResponse{Error: msg})
}
