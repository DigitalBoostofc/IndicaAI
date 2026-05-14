package sessions_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"

	"github.com/indica-ai/indica-ai/internal/api/handlers/sessions"
)

// Only validates the route-parameter parsing path. The list/revoke
// success paths touch the database and live in the integration suite.

func TestRevokeSession_InvalidID(t *testing.T) {
	h := sessions.New(nil)
	r := chi.NewRouter()
	r.Post("/api/me/sessions/{id}/revoke", h.Revoke)

	req := httptest.NewRequest(http.MethodPost, "/api/me/sessions/not-a-uuid/revoke", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}
