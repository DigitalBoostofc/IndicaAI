package fraud

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

// Action is the fraud decision action.
type Action string

const (
	ActionOK     Action = "ok"
	ActionReview Action = "review"
	ActionBlock  Action = "block"
)

// Signal is a single fraud signal evaluated by the engine.
type Signal struct {
	Name    string         `json:"name"`
	Points  int            `json:"points"`
	Evidence map[string]any `json:"evidence,omitempty"`
}

// Result is the output of a fraud check.
type Result struct {
	Score    int              `json:"score"`
	Action   Action           `json:"action"`
	Signals  []Signal         `json:"signals"`
	Evidence map[string]any   `json:"evidence"`
}

// LeadCreationInput is the data needed to run fraud checks on lead creation.
type LeadCreationInput struct {
	PartnerID uuid.UUID
	TenantID  uuid.UUID
	PhoneHash string
	EmailHash string
	Now       time.Time
}

// Querier abstracts the database operations needed by the fraud engine.
// *pgxpool.Pool satisfies this interface in production.
type Querier interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}
