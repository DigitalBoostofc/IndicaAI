package lead

import (
	"time"

	"github.com/google/uuid"
)

// Lead represents a person who was referred.
type Lead struct {
	ID         uuid.UUID  `json:"id"`
	TenantID   uuid.UUID  `json:"tenant_id"`
	ProgramID  uuid.UUID  `json:"program_id"`
	ReferralID *uuid.UUID `json:"referral_id,omitempty"`
	Name       *string    `json:"name,omitempty"`
	Email      *string    `json:"email,omitempty"`
	PhoneE164  *string    `json:"phone_e164,omitempty"`
	PhoneHash  string     `json:"phone_hash"`
	Status     string     `json:"status"`
	Source     string     `json:"source"`
	Notes      *string    `json:"notes,omitempty"`
	ClosedAt   *time.Time `json:"closed_at,omitempty"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

// CreateLeadInput contains data to create a new lead.
type CreateLeadInput struct {
	TenantID   uuid.UUID
	ProgramID  uuid.UUID
	ReferralID *uuid.UUID
	Name       *string
	Email      *string
	PhoneE164  *string
	PhoneHash  string
	Source     string
	Notes      *string
}
