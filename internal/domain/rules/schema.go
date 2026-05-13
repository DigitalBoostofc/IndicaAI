package rules

import (
	"encoding/json"
	"fmt"
)

// RuleSchema represents the complete rule configuration for a program.
type RuleSchema struct {
	SchemaVersion          int          `json:"schema_version"`
	Trigger                string       `json:"trigger"`
	AttributionWindowDays  int          `json:"attribution_window_days"`
	Conditions             []Condition  `json:"conditions,omitempty"`
	Reward                 RewardConfig `json:"reward"`
	Payout                 PayoutConfig `json:"payout,omitempty"`
	Limits                 LimitsConfig `json:"limits,omitempty"`
}

// Condition represents a rule condition that must be met.
type Condition struct {
	Op    string      `json:"op"`    // eq, neq, gt, lt, in, between
	Field string      `json:"field"` // lead.status, sale.amount, etc.
	Value interface{} `json:"value"`
}

// RewardConfig defines how rewards are calculated.
type RewardConfig struct {
	Type       string          `json:"type"`
	AmountBRL  *float64        `json:"amount_brl,omitempty"`  // for commission_fixed
	Pct        *float64        `json:"pct,omitempty"`         // for commission_pct, cashback
	MaxPct     *float64        `json:"max_pct,omitempty"`     // for flexible_split
	DecisionBy string          `json:"decision_by,omitempty"` // partner or company
	Options    []SplitOption   `json:"options,omitempty"`     // for flexible_split
	Target     *int            `json:"target,omitempty"`      // for goal_based
	Counting   *CountingConfig `json:"counting,omitempty"`   // for goal_based
	PointsPerBRL     *float64  `json:"points_per_brl,omitempty"`
	PointsPerConversion *int   `json:"points_per_conversion,omitempty"`
	MaxMonths  *int            `json:"max_months,omitempty"`  // for recurring_commission
}

// SplitOption defines an option in flexible_split.
type SplitOption struct {
	Kind          string  `json:"kind,omitempty"`
	CommissionPct float64 `json:"commission_pct,omitempty"`
	DiscountPct   float64 `json:"discount_pct,omitempty"`
	MaxTotalPct   float64 `json:"max_total_pct,omitempty"`
}

// CountingConfig defines how goal_based counts.
type CountingConfig struct {
	Scope          string `json:"scope"`           // per_partner, per_program
	StatusRequired string `json:"status_required"` // closed
}

// PayoutConfig defines payout rules.
type PayoutConfig struct {
	Method       string  `json:"method"`        // pix, bank_transfer, credit, coupon, physical, manual
	Schedule     string  `json:"schedule"`      // on_approval, monthly, weekly
	MinAmountBRL float64 `json:"min_amount_brl"`
	Kind         string  `json:"kind,omitempty"` // for goal_based: physical, credit, cashback
	SKU          string  `json:"sku,omitempty"`
}

// LimitsConfig defines program limits.
type LimitsConfig struct {
	MaxPerPartnerPerDay *int     `json:"max_per_partner_per_day,omitempty"`
	MaxTotalPayoutBRL   *float64 `json:"max_total_payout_brl,omitempty"`
}

// RewardType constants.
const (
	RewardTypeCommissionFixed    = "commission_fixed"
	RewardTypeCommissionPct      = "commission_pct"
	RewardTypeDiscountForLead    = "discount_for_lead"
	RewardTypeFlexibleSplit      = "flexible_split"
	RewardTypeGoalBased          = "goal_based"
	RewardTypePoints             = "points"
	RewardTypeCashback           = "cashback"
	RewardTypeRecurringCommision = "recurring_commission"
)

// Trigger constants.
const (
	TriggerSaleConfirmed     = "sale.confirmed"
	TriggerLeadCreated       = "lead.created"
	TriggerLeadQualified     = "lead.qualified"
	TriggerPaymentConfirmed  = "payment.confirmed"
)

// ParseRuleSchema parses a JSONB rule into a RuleSchema.
func ParseRuleSchema(data json.RawMessage) (*RuleSchema, error) {
	var rule RuleSchema
	if err := json.Unmarshal(data, &rule); err != nil {
		return nil, fmt.Errorf("parse rule schema: %w", err)
	}

	if err := rule.Validate(); err != nil {
		return nil, err
	}

	return &rule, nil
}

// Validate checks that the rule schema is well-formed.
func (r *RuleSchema) Validate() error {
	if r.SchemaVersion < 1 {
		return fmt.Errorf("schema_version must be >= 1, got %d", r.SchemaVersion)
	}

	if r.Trigger == "" {
		return fmt.Errorf("trigger is required")
	}

	validTriggers := map[string]bool{
		TriggerSaleConfirmed:    true,
		TriggerLeadCreated:      true,
		TriggerLeadQualified:    true,
		TriggerPaymentConfirmed: true,
	}
	if !validTriggers[r.Trigger] {
		return fmt.Errorf("invalid trigger: %s", r.Trigger)
	}

	if r.AttributionWindowDays <= 0 {
		r.AttributionWindowDays = 30 // default
	}

	return r.Reward.Validate()
}

// Validate checks the reward configuration.
func (rc *RewardConfig) Validate() error {
	if rc.Type == "" {
		return fmt.Errorf("reward.type is required")
	}

	validTypes := map[string]bool{
		RewardTypeCommissionFixed:    true,
		RewardTypeCommissionPct:      true,
		RewardTypeDiscountForLead:    true,
		RewardTypeFlexibleSplit:      true,
		RewardTypeGoalBased:          true,
		RewardTypePoints:             true,
		RewardTypeCashback:           true,
		RewardTypeRecurringCommision: true,
	}
	if !validTypes[rc.Type] {
		return fmt.Errorf("invalid reward type: %s", rc.Type)
	}

	switch rc.Type {
	case RewardTypeCommissionFixed:
		if rc.AmountBRL == nil || *rc.AmountBRL <= 0 {
			return fmt.Errorf("commission_fixed requires amount_brl > 0")
		}
	case RewardTypeCommissionPct, RewardTypeCashback:
		if rc.Pct == nil || *rc.Pct <= 0 || *rc.Pct > 100 {
			return fmt.Errorf("%s requires pct between 0 and 100", rc.Type)
		}
	case RewardTypeFlexibleSplit:
		if rc.MaxPct == nil || *rc.MaxPct <= 0 || *rc.MaxPct > 100 {
			return fmt.Errorf("flexible_split requires max_pct between 0 and 100")
		}
	case RewardTypeGoalBased:
		if rc.Target == nil || *rc.Target <= 0 {
			return fmt.Errorf("goal_based requires target > 0")
		}
	case RewardTypePoints:
		if rc.PointsPerBRL == nil && rc.PointsPerConversion == nil {
			return fmt.Errorf("points requires points_per_brl or points_per_conversion")
		}
	case RewardTypeRecurringCommision:
		if rc.Pct == nil || *rc.Pct <= 0 {
			return fmt.Errorf("recurring_commission requires pct > 0")
		}
	}

	return nil
}
