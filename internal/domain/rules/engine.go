package rules

import (
	"encoding/json"
	"fmt"
)

// Event represents something that happened in the system that triggers rule evaluation.
type Event struct {
	Type        string          `json:"type"` // matches Trigger
	SaleAmount  int64           `json:"sale_amount_cents,omitempty"`
	LeadStatus  string          `json:"lead_status,omitempty"`
	PartnerID   string          `json:"partner_id"`
	ReferralID  string          `json:"referral_id"`
	SaleID      string          `json:"sale_id,omitempty"`
	ProgramID   string          `json:"program_id"`
	TenantID    string          `json:"tenant_id"`
	SplitChoice json.RawMessage `json:"split_choice,omitempty"`
}

// RewardOutcome is the result of evaluating a rule.
type RewardOutcome struct {
	PartnerID     string          `json:"partner_id"`
	ReferralID    string          `json:"referral_id"`
	ProgramID     string          `json:"program_id"`
	TenantID      string          `json:"tenant_id"`
	SaleID        string          `json:"sale_id,omitempty"`
	Type          string          `json:"type"`
	AmountCents   int64           `json:"amount_cents"`
	Currency      string          `json:"currency"`
	Status        string          `json:"status"`
	PayoutMethod  string          `json:"payout_method,omitempty"`
	Metadata      json.RawMessage `json:"metadata,omitempty"`
}

// Engine evaluates rules against events to produce reward outcomes.
type Engine struct {
	evaluators map[string]Evaluator
}

// Evaluator calculates rewards for a specific reward type.
type Evaluator interface {
	Evaluate(rule *RuleSchema, event *Event) (*RewardOutcome, error)
}

// NewEngine creates a rules engine with all built-in evaluators registered.
func NewEngine() *Engine {
	e := &Engine{
		evaluators: make(map[string]Evaluator),
	}

	// Register all built-in evaluators
	e.Register(RewardTypeCommissionFixed, &CommissionFixedEvaluator{})
	e.Register(RewardTypeCommissionPct, &CommissionPctEvaluator{})
	e.Register(RewardTypeFlexibleSplit, &FlexibleSplitEvaluator{})
	e.Register(RewardTypeGoalBased, &GoalBasedEvaluator{})
	e.Register(RewardTypePoints, &PointsEvaluator{})
	e.Register(RewardTypeCashback, &CashbackEvaluator{})
	e.Register(RewardTypeRecurringCommision, &RecurringCommissionEvaluator{})
	e.Register(RewardTypeDiscountForLead, &DiscountForLeadEvaluator{})

	return e
}

// Register adds a new evaluator for a reward type.
func (e *Engine) Register(rewardType string, evaluator Evaluator) {
	e.evaluators[rewardType] = evaluator
}

// Evaluate checks conditions and runs the appropriate evaluator.
func (e *Engine) Evaluate(rule *RuleSchema, event *Event) (*RewardOutcome, error) {
	// Check conditions (short-circuit on first failure)
	if err := e.checkConditions(rule, event); err != nil {
		return nil, err
	}

	// Find evaluator
	eval, ok := e.evaluators[rule.Reward.Type]
	if !ok {
		return nil, fmt.Errorf("no evaluator for reward type: %s", rule.Reward.Type)
	}

	// Evaluate
	outcome, err := eval.Evaluate(rule, event)
	if err != nil {
		return nil, fmt.Errorf("evaluate %s: %w", rule.Reward.Type, err)
	}

	// Set common fields
	outcome.PartnerID = event.PartnerID
	outcome.ReferralID = event.ReferralID
	outcome.ProgramID = event.ProgramID
	outcome.TenantID = event.TenantID
	outcome.SaleID = event.SaleID
	outcome.Currency = "BRL"
	if outcome.Status == "" {
		outcome.Status = "pending"
	}

	return outcome, nil
}

// checkConditions evaluates all conditions. Returns nil if all pass.
func (e *Engine) checkConditions(rule *RuleSchema, event *Event) error {
	for _, cond := range rule.Conditions {
		if !evaluateCondition(cond, event) {
			return fmt.Errorf("condition not met: %s %s %v", cond.Field, cond.Op, cond.Value)
		}
	}
	return nil
}

// evaluateCondition evaluates a single condition against an event.
func evaluateCondition(cond Condition, event *Event) bool {
	actual := getFieldValue(cond.Field, event)

	switch cond.Op {
	case "eq":
		return fmt.Sprintf("%v", actual) == fmt.Sprintf("%v", cond.Value)
	case "neq":
		return fmt.Sprintf("%v", actual) != fmt.Sprintf("%v", cond.Value)
	default:
		return true // unknown ops pass by default
	}
}

// getFieldValue extracts a field value from an event.
func getFieldValue(field string, event *Event) interface{} {
	switch field {
	case "lead.status":
		return event.LeadStatus
	case "sale.amount":
		return event.SaleAmount
	default:
		return nil
	}
}
