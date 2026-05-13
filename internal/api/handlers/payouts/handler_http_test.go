package payouts_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/indica-ai/indica-ai/internal/api/dto"
	"github.com/indica-ai/indica-ai/internal/api/handlers/payouts"
)

func newTestRouter(handler *payouts.Handler) http.Handler {
	r := chi.NewRouter()
	r.Route("/tenants/me/payouts", func(r chi.Router) {
		r.Get("/", handler.List)
		r.Post("/{id}/confirm", handler.Confirm)
		r.Post("/{id}/paid", handler.Paid)
		r.Post("/{id}/cancel", handler.Cancel)
	})
	return r
}

func TestConfirmHandler_InvalidID(t *testing.T) {
	handler := payouts.New(nil)
	router := newTestRouter(handler)

	req := httptest.NewRequest(http.MethodPost, "/tenants/me/payouts/not-a-uuid/confirm", nil)
	req.Header.Set("Idempotency-Key", "test-key")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var resp dto.ErrorResponse
	require.NoError(t, json.NewDecoder(w.Body).Decode(&resp))
	assert.Equal(t, "invalid payout id", resp.Error)
}

func TestPaidHandler_InvalidID(t *testing.T) {
	handler := payouts.New(nil)
	router := newTestRouter(handler)

	body, _ := json.Marshal(dto.PaidPayoutRequest{})
	req := httptest.NewRequest(http.MethodPost, "/tenants/me/payouts/not-a-uuid/paid", bytes.NewReader(body))
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestCancelHandler_InvalidID(t *testing.T) {
	handler := payouts.New(nil)
	router := newTestRouter(handler)

	body, _ := json.Marshal(dto.CancelPayoutRequest{Reason: "test"})
	req := httptest.NewRequest(http.MethodPost, "/tenants/me/payouts/not-a-uuid/cancel", bytes.NewReader(body))
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestPaidHandler_EmptyBody(t *testing.T) {
	// Verify empty body doesn't cause a decode error
	var req dto.PaidPayoutRequest
	err := json.Unmarshal([]byte(`{}`), &req)
	assert.NoError(t, err)
	assert.Nil(t, req.PaidAt)
	assert.Empty(t, req.ReceiptURL)
}

func TestCancelRequest_WithReason(t *testing.T) {
	body := `{"reason":"partner left program"}`
	var req dto.CancelPayoutRequest
	err := json.Unmarshal([]byte(body), &req)
	assert.NoError(t, err)
	assert.Equal(t, "partner left program", req.Reason)
}
