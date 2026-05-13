package webhooks

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Worker handles webhook delivery with retry.
type Worker struct {
	pool       *pgxpool.Pool
	httpClient *http.Client
}

// NewWorker creates a new webhooks worker.
func NewWorker(pool *pgxpool.Pool) *Worker {
	return &Worker{
		pool: pool,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// DeliverWebhookJobInput is the input for webhook delivery.
type DeliverWebhookJobInput struct {
	WebhookID uuid.UUID `json:"webhook_id"`
	EventID   string    `json:"event_id"`
	EventType string    `json:"event_type"`
	TenantID  uuid.UUID `json:"tenant_id"`
	URL       string    `json:"url"`
	Secret    string    `json:"secret"`
	Payload   json.RawMessage `json:"payload"`
	Attempt   int       `json:"attempt"`
}

// Deliver sends a webhook with HMAC signature.
func (w *Worker) Deliver(ctx context.Context, input []byte) error {
	var job DeliverWebhookJobInput
	if err := json.Unmarshal(input, &job); err != nil {
		return fmt.Errorf("unmarshal job: %w", err)
	}

	// Build payload with metadata
	payload := map[string]interface{}{
		"event_id":   job.EventID,
		"event_type": job.EventType,
		"tenant_id":  job.TenantID.String(),
		"data":       json.RawMessage(job.Payload),
		"timestamp":  time.Now().UTC().Format(time.RFC3339),
		"attempt":    job.Attempt,
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal payload: %w", err)
	}

	// Calculate HMAC-SHA256 signature
	timestamp := time.Now().Unix()
	mac := hmac.New(sha256.New, []byte(job.Secret))
	mac.Write([]byte(fmt.Sprintf("%d.%s", timestamp, body)))
	signature := hex.EncodeToString(mac.Sum(nil))

	// Build request
	req, err := http.NewRequestWithContext(ctx, "POST", job.URL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Indica-Signature", fmt.Sprintf("t=%d,v1=%s", timestamp, signature))
	req.Header.Set("X-Indica-Event", job.EventType)
	req.Header.Set("X-Indica-Delivery", uuid.New().String())

	// Send
	resp, err := w.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("send webhook: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		slog.Info("webhook delivered",
			"url", job.URL,
			"event_type", job.EventType,
			"status", resp.StatusCode,
			"attempt", job.Attempt,
		)
		return nil
	}

	return fmt.Errorf("webhook returned status %d", resp.StatusCode)
}

// RetryDelays defines the exponential backoff for webhook retries.
var RetryDelays = []time.Duration{
	1 * time.Minute,
	5 * time.Minute,
	30 * time.Minute,
	2 * time.Hour,
	12 * time.Hour,
	24 * time.Hour,
}

// GetNextRetryTime returns when the next retry should happen, or zero if exhausted.
func GetNextRetryTime(attempt int) time.Time {
	if attempt >= len(RetryDelays) {
		return time.Time{} // exhausted
	}
	return time.Now().Add(RetryDelays[attempt])
}
