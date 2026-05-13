package middleware

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/indica-ai/indica-ai/internal/platform/cache"
	"github.com/indica-ai/indica-ai/internal/platform/db"
)

// RateLimit creates a rate limiting middleware using Redis token bucket.
// Default behavior is fail-closed: if Redis is unavailable, requests are rejected with 503.
// Pass failOpen=true to allow requests through when Redis is down (use only for non-critical routes like tracking).
func RateLimit(c *cache.Client, limit int64, window time.Duration, keyFunc func(r *http.Request) string, failOpen ...bool) func(http.Handler) http.Handler {
	shouldFailOpen := len(failOpen) > 0 && failOpen[0]

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if c == nil {
				if shouldFailOpen {
					next.ServeHTTP(w, r)
					return
				}
				http.Error(w, `{"error":"service unavailable"}`, http.StatusServiceUnavailable)
				return
			}

			key := fmt.Sprintf("ratelimit:%s", keyFunc(r))
			allowed, remaining, err := c.RateLimit(r.Context(), key, limit, window)
			if err != nil {
				if shouldFailOpen {
					next.ServeHTTP(w, r)
					return
				}
				http.Error(w, `{"error":"service unavailable"}`, http.StatusServiceUnavailable)
				return
			}

			w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
			w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))

			if !allowed {
				http.Error(w, `{"error":"rate limit exceeded"}`, http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// clientIP extracts the real client IP, preferring X-Forwarded-For (first entry)
// over RemoteAddr, to work correctly behind reverse proxies.
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// XFF format: "client, proxy1, proxy2" — take the first (client) IP
		if idx := strings.IndexByte(xff, ','); idx > 0 {
			return strings.TrimSpace(xff[:idx])
		}
		return strings.TrimSpace(xff)
	}
	// Fallback to RemoteAddr (host:port format)
	if idx := strings.LastIndex(r.RemoteAddr, ":"); idx > 0 {
		return r.RemoteAddr[:idx]
	}
	return r.RemoteAddr
}

// RateLimitByIP creates a rate limiter keyed by client IP.
// Uses X-Forwarded-For (first entry) when present, falls back to RemoteAddr.
func RateLimitByIP(c *cache.Client, limit int64, window time.Duration, failOpen ...bool) func(http.Handler) http.Handler {
	return RateLimit(c, limit, window, func(r *http.Request) string {
		return "ip:" + clientIP(r)
	}, failOpen...)
}

// RateLimitByTenant creates a rate limiter keyed by tenant ID from context.
func RateLimitByTenant(c *cache.Client, limit int64, window time.Duration, failOpen ...bool) func(http.Handler) http.Handler {
	return RateLimit(c, limit, window, func(r *http.Request) string {
		tid, ok := db.GetTenantID(r.Context())
		if !ok {
			return "tenant:unknown"
		}
		return "tenant:" + tid
	}, failOpen...)
}
