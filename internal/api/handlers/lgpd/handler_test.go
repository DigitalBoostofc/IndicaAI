package lgpd_test

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"

	"github.com/indica-ai/indica-ai/internal/api/handlers/lgpd"
)

// These tests exercise only the request-validation paths of the LGPD
// handlers — the parts that fail fast before touching the database.
// Success paths are covered by the integration suite, which has a real
// Postgres + worker behind it.

func newRouter() http.Handler {
	h := lgpd.New(nil, slog.Default())
	r := chi.NewRouter()
	r.Post("/api/me/consents", h.Grant)
	r.Delete("/api/me/consents/{id}", h.Revoke)
	return r
}

func TestGrantConsent_MissingFields(t *testing.T) {
	cases := []struct {
		name string
		body any
	}{
		{"empty body", map[string]any{}},
		{"only name", map[string]any{"policy_name": "privacy_policy"}},
		{"only version", map[string]any{"policy_version": "1.0.0"}},
		{"malformed json", json.RawMessage(`{not-json}`)},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			var body []byte
			if raw, ok := c.body.(json.RawMessage); ok {
				body = raw
			} else {
				body, _ = json.Marshal(c.body)
			}
			req := httptest.NewRequest(http.MethodPost, "/api/me/consents", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			newRouter().ServeHTTP(w, req)
			assert.Equal(t, http.StatusBadRequest, w.Code,
				"expected 400 for %s, got %d (%s)", c.name, w.Code, w.Body.String())
		})
	}
}

func TestRevokeConsent_InvalidID(t *testing.T) {
	req := httptest.NewRequest(http.MethodDelete, "/api/me/consents/not-a-uuid", nil)
	w := httptest.NewRecorder()
	newRouter().ServeHTTP(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}
