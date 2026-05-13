package referral

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Referral connects a partner to a lead with a snapshot of the rule.
type Referral struct {
	ID                uuid.UUID       `json:"id"`
	TenantID          uuid.UUID       `json:"tenant_id"`
	ProgramID         uuid.UUID       `json:"program_id"`
	PartnerID         uuid.UUID       `json:"partner_id"`
	PartnerLinkID     *uuid.UUID      `json:"partner_link_id,omitempty"`
	RuleSnapshot      json.RawMessage `json:"rule_snapshot"`
	SplitChoice       json.RawMessage `json:"split_choice,omitempty"`
	AttributionModel  string          `json:"attribution_model"`
	AttributionScore  float64         `json:"attribution_score"`
	AttributedAt      *time.Time      `json:"attributed_at,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

// Attribution records how a referral was attributed.
type Attribution struct {
	ID        uuid.UUID  `json:"id"`
	TenantID  uuid.UUID  `json:"tenant_id"`
	ReferralID uuid.UUID `json:"referral_id"`
	PartnerID  uuid.UUID `json:"partner_id"`
	ClickID   *uuid.UUID `json:"click_id,omitempty"`
	Model     string     `json:"model"`
	Score     float64    `json:"score"`
	MatchedBy string     `json:"matched_by"`
	Reason    *string    `json:"reason,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}
