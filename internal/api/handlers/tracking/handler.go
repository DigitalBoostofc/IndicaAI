package tracking

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/indica-ai/indica-ai/internal/api/dto"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Handler handles tracking endpoints.
type Handler struct {
	pool *pgxpool.Pool
}

// New creates a new tracking handler.
func New(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

// HandleClick handles POST /events/click — public, idempotent.
func (h *Handler) HandleClick(w http.ResponseWriter, r *http.Request) {
	var req dto.ClickEventRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Resolve slug → partner + program + tenant
	var partnerID, programID, tenantID uuid.UUID
	var slug string
	err := h.pool.QueryRow(r.Context(),
		`SELECT pl.partner_id, pl.program_id, pl.tenant_id, pl.slug
		 FROM partner_links pl
		 WHERE pl.slug = $1 AND pl.is_active = true`, req.Slug).Scan(
		&partnerID, &programID, &tenantID, &slug)
	if err != nil {
		// Don't reveal that slug doesn't exist (anti-enumeration)
		w.WriteHeader(http.StatusAccepted)
		w.Write([]byte(`{"status":"accepted"}`))
		return
	}

	// Generate visitor_id if not provided
	visitorID, err := uuid.Parse(req.VisitorID)
	if err != nil {
		visitorID, _ = uuid.NewV7()
	}

	// Calculate fingerprint if not provided
	fingerprint := req.Fingerprint
	if fingerprint == "" {
		ip := extractIP(r)
		fingerprint = calculateFingerprint(ip, r.UserAgent(), r.Header.Get("Accept-Language"), tenantID.String())
	}

	// Insert click event
	clickID, _ := uuid.NewV7()
	_, err = h.pool.Exec(r.Context(),
		`INSERT INTO click_events (id, tenant_id, program_id, partner_id, slug, visitor_id, fingerprint, ip_inet, ua, accept_lang, referer, occurred_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())`,
		clickID, tenantID, programID, partnerID, slug, visitorID, fingerprint,
		extractIP(r), r.UserAgent(), r.Header.Get("Accept-Language"), r.Header.Get("Referer"))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to record click")
		return
	}

	// Increment click count (async-safe, fire-and-forget)
	h.pool.Exec(r.Context(),
		`UPDATE partner_links SET click_count = click_count + 1 WHERE id = $1`, clickID)

	w.WriteHeader(http.StatusAccepted)
	w.Write([]byte(`{"status":"accepted"}`))
}

// HandleRedirect handles GET /r/:slug — fallback if Cloudflare Worker is down.
func (h *Handler) HandleRedirect(w http.ResponseWriter, r *http.Request) {
	// Extract slug from path: /r/:slug
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 3 {
		http.NotFound(w, r)
		return
	}
	slug := parts[2]

	// Resolve slug
	var redirectType, redirectURL, whatsappNumber string
	var programID, tenantID, partnerID uuid.UUID
	err := h.pool.QueryRow(r.Context(),
		`SELECT pl.partner_id, pl.program_id, pl.tenant_id,
		        p.redirect_type, p.redirect_url, p.whatsapp_number
		 FROM partner_links pl
		 JOIN programs p ON p.id = pl.program_id
		 WHERE pl.slug = $1 AND pl.is_active = true`, slug).Scan(
		&partnerID, &programID, &tenantID,
		&redirectType, &redirectURL, &whatsappNumber)
	if err != nil {
		// Redirect to generic landing (anti-enumeration)
		http.Redirect(w, r, "https://indica.ai", http.StatusFound)
		return
	}

	// Record click asynchronously (best-effort)
	visitorID, _ := uuid.NewV7()
	ip := extractIP(r)
	fingerprint := calculateFingerprint(ip, r.UserAgent(), r.Header.Get("Accept-Language"), tenantID.String())
	clickID, _ := uuid.NewV7()

	go func() {
		h.pool.Exec(r.Context(),
			`INSERT INTO click_events (id, tenant_id, program_id, partner_id, slug, visitor_id, fingerprint, ip_inet, ua, accept_lang, referer, occurred_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())`,
			clickID, tenantID, programID, partnerID, slug, visitorID, fingerprint,
			ip, r.UserAgent(), r.Header.Get("Accept-Language"), r.Header.Get("Referer"))
		h.pool.Exec(r.Context(),
			`UPDATE partner_links SET click_count = click_count + 1 WHERE slug = $1`, slug)
	}()

	// Build redirect URL
	var target string
	switch redirectType {
	case "whatsapp":
		msg := fmt.Sprintf("Olá, vim pela indicação. Código: %s", strings.ToUpper(slug))
		target = fmt.Sprintf("https://wa.me/%s?text=%s", whatsappNumber, strings.ReplaceAll(msg, " ", "%20"))
	case "website", "landing", "checkout":
		separator := "?"
		if strings.Contains(redirectURL, "?") {
			separator = "&"
		}
		target = fmt.Sprintf("%s%sref=%s", redirectURL, separator, slug)
	default:
		target = redirectURL
	}

	http.Redirect(w, r, target, http.StatusFound)
}

func calculateFingerprint(ip, ua, acceptLang, tenantID string) string {
	// Truncate IP to /24
	ipParts := strings.Split(ip, ".")
	ip24 := ip
	if len(ipParts) >= 3 {
		ip24 = strings.Join(ipParts[:3], ".") + ".0"
	}
	h := sha256.Sum256([]byte(ip24 + ua + acceptLang + tenantID))
	return hex.EncodeToString(h[:])
}

func extractIP(r *http.Request) string {
	if cfIP := r.Header.Get("CF-Connecting-IP"); cfIP != "" {
		return cfIP
	}
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	return r.RemoteAddr
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
