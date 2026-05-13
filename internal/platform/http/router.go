package http

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

// NewRouter creates a chi router with base middleware.
func NewRouter(logger *slog.Logger) *chi.Mux {
	r := chi.NewRouter()

	// Recovery
	r.Use(chimw.Recoverer)

	// Security headers
	r.Use(SecurityHeaders())

	// Request ID
	r.Use(chimw.RequestID)

	// Real IP
	r.Use(chimw.RealIP)

	// Structured logger
	r.Use(requestLogger(logger))

	// Timeout
	r.Use(chimw.Timeout(30 * time.Second))

	// CORS — production domain + Vercel preview + local dev
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{
			"https://*.indica.ai",
			"https://*.vercel.app", // Vercel preview + production aliases
			"http://localhost:*",
		},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID", "Idempotency-Key", "X-API-Key"},
		ExposedHeaders:   []string{"X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health check
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	})

	return r
}

// requestLogger creates a structured logging middleware.
func requestLogger(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := chimw.NewWrapResponseWriter(w, r.ProtoMajor)

			defer func() {
				logger.Info("http request",
					slog.String("method", r.Method),
					slog.String("path", r.URL.Path),
					slog.Int("status", ww.Status()),
					slog.Int("bytes", ww.BytesWritten()),
					slog.Duration("duration", time.Since(start)),
					slog.String("request_id", chimw.GetReqID(r.Context())),
					slog.String("remote_addr", r.RemoteAddr),
				)
			}()

			next.ServeHTTP(ww, r)
		})
	}
}
