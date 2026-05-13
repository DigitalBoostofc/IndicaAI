package programs

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/indica-ai/indica-ai/internal/api/dto"
	"github.com/indica-ai/indica-ai/internal/domain/rules"
	"github.com/indica-ai/indica-ai/internal/platform/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Handler handles program endpoints.
type Handler struct {
	pool *pgxpool.Pool
}

// New creates a new programs handler.
func New(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

// Create handles POST /programs.
func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	var req dto.CreateProgramRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate rules JSON
	if _, err := rules.ParseRuleSchema(req.Rules); err != nil {
		writeError(w, http.StatusBadRequest, "invalid rules: "+err.Error())
		return
	}

	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)
	programID := uuid.New()

	// For MVP, use direct pool insert. In production, this should use BeginTenant.
	_, err := h.pool.Exec(r.Context(),
		`INSERT INTO programs (id, tenant_id, name, description, rules, redirect_type, redirect_url, whatsapp_number)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		programID, tenantID, req.Name, req.Description, req.Rules,
		req.RedirectType, req.RedirectURL, req.WhatsAppNumber)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create program")
		return
	}

	writeJSON(w, http.StatusCreated, dto.ProgramResponse{
		ID:             programID.String(),
		Name:           req.Name,
		Description:    req.Description,
		Status:         "draft",
		Rules:          req.Rules,
		RedirectType:   req.RedirectType,
		RedirectURL:    req.RedirectURL,
		WhatsAppNumber: req.WhatsAppNumber,
	})
}

// Get handles GET /programs/{id}.
func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid program id")
		return
	}

	var p struct {
		ID             uuid.UUID
		Name           string
		Description    *string
		Status         string
		Rules          json.RawMessage
		RedirectType   string
		RedirectURL    *string
		WhatsAppNumber *string
		CreatedAt      string
	}

	err = h.pool.QueryRow(r.Context(),
		`SELECT id, name, description, status, rules, redirect_type, redirect_url, whatsapp_number, created_at
		 FROM programs WHERE id = $1`, id).Scan(
		&p.ID, &p.Name, &p.Description, &p.Status, &p.Rules,
		&p.RedirectType, &p.RedirectURL, &p.WhatsAppNumber, &p.CreatedAt)
	if err != nil {
		writeError(w, http.StatusNotFound, "program not found")
		return
	}

	desc := ""
	if p.Description != nil {
		desc = *p.Description
	}
	redURL := ""
	if p.RedirectURL != nil {
		redURL = *p.RedirectURL
	}
	waNum := ""
	if p.WhatsAppNumber != nil {
		waNum = *p.WhatsAppNumber
	}

	writeJSON(w, http.StatusOK, dto.ProgramResponse{
		ID:             p.ID.String(),
		Name:           p.Name,
		Description:    desc,
		Status:         p.Status,
		Rules:          p.Rules,
		RedirectType:   p.RedirectType,
		RedirectURL:    redURL,
		WhatsAppNumber: waNum,
	})
}

// List handles GET /programs.
func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	rows, err := h.pool.Query(r.Context(),
		`SELECT id, name, description, status, rules, redirect_type, redirect_url, whatsapp_number, created_at
		 FROM programs WHERE tenant_id = $1 ORDER BY created_at DESC`, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list programs")
		return
	}
	defer rows.Close()

	programs := []dto.ProgramResponse{}
	for rows.Next() {
		var p struct {
			ID             uuid.UUID
			Name           string
			Description    *string
			Status         string
			Rules          json.RawMessage
			RedirectType   string
			RedirectURL    *string
			WhatsAppNumber *string
			CreatedAt      string
		}
		rows.Scan(&p.ID, &p.Name, &p.Description, &p.Status, &p.Rules,
			&p.RedirectType, &p.RedirectURL, &p.WhatsAppNumber, &p.CreatedAt)

		desc := ""
		if p.Description != nil {
			desc = *p.Description
		}
		redURL := ""
		if p.RedirectURL != nil {
			redURL = *p.RedirectURL
		}
		waNum := ""
		if p.WhatsAppNumber != nil {
			waNum = *p.WhatsAppNumber
		}

		programs = append(programs, dto.ProgramResponse{
			ID:             p.ID.String(),
			Name:           p.Name,
			Description:    desc,
			Status:         p.Status,
			Rules:          p.Rules,
			RedirectType:   p.RedirectType,
			RedirectURL:    redURL,
			WhatsAppNumber: waNum,
		})
	}

	writeJSON(w, http.StatusOK, programs)
}

// UpdateStatus handles PATCH /programs/{id}/status.
func (h *Handler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid program id")
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	validStatuses := map[string]bool{"draft": true, "active": true, "paused": true, "archived": true}
	if !validStatuses[req.Status] {
		writeError(w, http.StatusBadRequest, "invalid status")
		return
	}

	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)

	tag, err := h.pool.Exec(r.Context(),
		`UPDATE programs SET status = $1, updated_at = now() WHERE id = $2 AND tenant_id = $3`,
		req.Status, id, tenantID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update status")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "program not found")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": req.Status})
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, dto.ErrorResponse{Error: msg})
}
