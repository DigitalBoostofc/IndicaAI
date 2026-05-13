package partner

import (
	"time"

	"github.com/google/uuid"
)

// Partner represents a referral partner in a program.
type Partner struct {
	ID            uuid.UUID  `json:"id"`
	TenantID      uuid.UUID  `json:"tenant_id"`
	ProgramID     uuid.UUID  `json:"program_id"`
	UserID        *uuid.UUID `json:"user_id,omitempty"`
	Name          string     `json:"name"`
	Email         *string    `json:"email,omitempty"`
	PhoneE164     *string    `json:"phone_e164,omitempty"`
	Document      *string    `json:"document,omitempty"`
	PixKey        *string    `json:"pix_key,omitempty"`
	PixKeyType    *string    `json:"pix_key_type,omitempty"`
	Status        string     `json:"status"`
	DefaultSplit  []byte     `json:"default_split,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// PartnerLink represents a tracking link for a partner.
type PartnerLink struct {
	ID         uuid.UUID `json:"id"`
	TenantID   uuid.UUID `json:"tenant_id"`
	ProgramID  uuid.UUID `json:"program_id"`
	PartnerID  uuid.UUID `json:"partner_id"`
	Slug       string    `json:"slug"`
	URL        string    `json:"url"`
	IsActive   bool      `json:"is_active"`
	ClickCount int       `json:"click_count"`
	CreatedAt  time.Time `json:"created_at"`
}
