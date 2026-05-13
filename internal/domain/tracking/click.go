package tracking

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ClickEvent represents a tracked click on a partner link.
type ClickEvent struct {
	ID          uuid.UUID       `json:"id"`
	TenantID    uuid.UUID       `json:"tenant_id"`
	ProgramID   uuid.UUID       `json:"program_id"`
	PartnerID   uuid.UUID       `json:"partner_id"`
	Slug        string          `json:"slug"`
	VisitorID   uuid.UUID       `json:"visitor_id"`
	Fingerprint string          `json:"fingerprint"`
	IPInet      *string         `json:"ip_inet,omitempty"`
	UA          *string         `json:"ua,omitempty"`
	AcceptLang  *string         `json:"accept_lang,omitempty"`
	Referer     *string         `json:"referer,omitempty"`
	UTM         json.RawMessage `json:"utm,omitempty"`
	OccurredAt  time.Time       `json:"occurred_at"`
}

// AttributionScore constants.
const (
	ScoreCodeMatch      = 1.0
	ScoreCookieMatch    = 0.85
	ScoreFingerprintMatch = 0.4
	ScoreManualReviewThreshold = 0.5
)
