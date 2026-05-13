package domain

import "github.com/google/uuid"

// Strongly typed IDs prevent mixing up IDs at compile time.
type (
	TenantID    uuid.UUID
	ProgramID   uuid.UUID
	PartnerID   uuid.UUID
	PartnerLinkID uuid.UUID
	ReferralID  uuid.UUID
	LeadID      uuid.UUID
	SaleID      uuid.UUID
	RewardID    uuid.UUID
	PayoutID    uuid.UUID
	UserID      uuid.UUID
	ClickEventID uuid.UUID
)

// String returns the string representation of any ID type.
func idString(id uuid.UUID) string {
	return id.String()
}

// NewID generates a new UUIDv7 (time-ordered).
func NewID() uuid.UUID {
	id, _ := uuid.NewV7()
	return id
}

// LeadStatus represents the state machine for leads.
type LeadStatus string

const (
	LeadStatusNew        LeadStatus = "new"
	LeadStatusInProgress LeadStatus = "in_progress"
	LeadStatusQualified  LeadStatus = "qualified"
	LeadStatusClosed     LeadStatus = "closed"
	LeadStatusLost       LeadStatus = "lost"
)

// ValidTransitions defines allowed lead status transitions.
var ValidTransitions = map[LeadStatus][]LeadStatus{
	LeadStatusNew:        {LeadStatusInProgress, LeadStatusLost},
	LeadStatusInProgress: {LeadStatusQualified, LeadStatusClosed, LeadStatusLost},
	LeadStatusQualified:  {LeadStatusClosed, LeadStatusLost},
	LeadStatusClosed:     {}, // terminal
	LeadStatusLost:       {}, // terminal
}

// CanTransition checks if a status transition is valid.
func CanTransition(from, to LeadStatus) bool {
	allowed, ok := ValidTransitions[from]
	if !ok {
		return false
	}
	for _, s := range allowed {
		if s == to {
			return true
		}
	}
	return false
}

// RewardStatus constants.
const (
	RewardStatusPending   = "pending"
	RewardStatusApproved  = "approved"
	RewardStatusRejected  = "rejected"
	RewardStatusCancelled = "cancelled"
	RewardStatusPaid      = "paid"
)

// PayoutStatus constants.
const (
	PayoutStatusPending    = "pending"
	PayoutStatusProcessing = "processing"
	PayoutStatusPaid       = "paid"
	PayoutStatusFailed     = "failed"
	PayoutStatusCancelled  = "cancelled"
)

// PartnerStatus constants.
const (
	PartnerStatusActive    = "active"
	PartnerStatusSuspended = "suspended"
	PartnerStatusBlocked   = "blocked"
)

// ProgramStatus constants.
const (
	ProgramStatusDraft    = "draft"
	ProgramStatusActive   = "active"
	ProgramStatusPaused   = "paused"
	ProgramStatusArchived = "archived"
)
