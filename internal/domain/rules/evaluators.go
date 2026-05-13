package rules

import (
	"encoding/json"
	"fmt"
	"math"
)

// CommissionFixedEvaluator pays a fixed amount per conversion.
type CommissionFixedEvaluator struct{}

func (e *CommissionFixedEvaluator) Evaluate(rule *RuleSchema, event *Event) (*RewardOutcome, error) {
	amount := int64(*rule.Reward.AmountBRL * 100) // convert to cents
	return &RewardOutcome{
		Type:        RewardTypeCommissionFixed,
		AmountCents: amount,
		Metadata:    mustJSON(map[string]interface{}{"amount_brl": *rule.Reward.AmountBRL}),
	}, nil
}

// CommissionPctEvaluator pays a percentage of the sale amount.
type CommissionPctEvaluator struct{}

func (e *CommissionPctEvaluator) Evaluate(rule *RuleSchema, event *Event) (*RewardOutcome, error) {
	if event.SaleAmount <= 0 {
		return nil, fmt.Errorf("sale amount required for commission_pct")
	}
	pct := *rule.Reward.Pct
	amount := int64(math.Round(float64(event.SaleAmount) * pct / 100))
	return &RewardOutcome{
		Type:        RewardTypeCommissionPct,
		AmountCents: amount,
		Metadata: mustJSON(map[string]interface{}{
			"sale_amount_cents": event.SaleAmount,
			"pct":               pct,
			"commission_cents":  amount,
		}),
	}, nil
}

// FlexibleSplitEvaluator handles the Wenox-style split between commission and discount.
type FlexibleSplitEvaluator struct{}

func (e *FlexibleSplitEvaluator) Evaluate(rule *RuleSchema, event *Event) (*RewardOutcome, error) {
	if event.SaleAmount <= 0 {
		return nil, fmt.Errorf("sale amount required for flexible_split")
	}

	// Parse split choice from the referral
	var split struct {
		CommissionPct float64 `json:"commission_pct"`
		DiscountPct   float64 `json:"discount_pct"`
	}
	if event.SplitChoice != nil {
		if err := json.Unmarshal(event.SplitChoice, &split); err != nil {
			return nil, fmt.Errorf("parse split_choice: %w", err)
		}
	} else {
		// Default: all commission
		split.CommissionPct = *rule.Reward.MaxPct
		split.DiscountPct = 0
	}

	// Validate split doesn't exceed max
	totalPct := split.CommissionPct + split.DiscountPct
	if totalPct > *rule.Reward.MaxPct {
		return nil, fmt.Errorf("split total %.1f%% exceeds max %.1f%%", totalPct, *rule.Reward.MaxPct)
	}

	commissionCents := int64(math.Round(float64(event.SaleAmount) * split.CommissionPct / 100))
	discountCents := int64(math.Round(float64(event.SaleAmount) * split.DiscountPct / 100))

	return &RewardOutcome{
		Type:        RewardTypeFlexibleSplit,
		AmountCents: commissionCents, // partner gets commission; discount is for the lead
		Metadata: mustJSON(map[string]interface{}{
			"sale_amount_cents": event.SaleAmount,
			"commission_pct":    split.CommissionPct,
			"discount_pct":      split.DiscountPct,
			"commission_cents":  commissionCents,
			"discount_cents":    discountCents,
		}),
	}, nil
}

// GoalBasedEvaluator rewards after N successful conversions.
type GoalBasedEvaluator struct{}

func (e *GoalBasedEvaluator) Evaluate(rule *RuleSchema, event *Event) (*RewardOutcome, error) {
	// Goal evaluation requires counting — this is done by the GoalRecalcJob worker.
	// The evaluator just creates a pending reward that will be confirmed by the worker.
	return &RewardOutcome{
		Type:        RewardTypeGoalBased,
		AmountCents: 0, // physical reward, no monetary value
		Metadata: mustJSON(map[string]interface{}{
			"goal_target": *rule.Reward.Target,
			"goal_status": "pending_count",
		}),
	}, nil
}

// PointsEvaluator awards points per conversion or per BRL spent.
type PointsEvaluator struct{}

func (e *PointsEvaluator) Evaluate(rule *RuleSchema, event *Event) (*RewardOutcome, error) {
	var points int64
	if rule.Reward.PointsPerBRL != nil && event.SaleAmount > 0 {
		amountBRL := float64(event.SaleAmount) / 100
		points = int64(math.Round(amountBRL * *rule.Reward.PointsPerBRL))
	} else if rule.Reward.PointsPerConversion != nil {
		points = int64(*rule.Reward.PointsPerConversion)
	}

	return &RewardOutcome{
		Type:        RewardTypePoints,
		AmountCents: 0, // points don't have monetary value directly
		Metadata: mustJSON(map[string]interface{}{
			"points": points,
		}),
	}, nil
}

// CashbackEvaluator returns a percentage of the sale to the buyer.
type CashbackEvaluator struct{}

func (e *CashbackEvaluator) Evaluate(rule *RuleSchema, event *Event) (*RewardOutcome, error) {
	if event.SaleAmount <= 0 {
		return nil, fmt.Errorf("sale amount required for cashback")
	}
	pct := *rule.Reward.Pct
	amount := int64(math.Round(float64(event.SaleAmount) * pct / 100))
	return &RewardOutcome{
		Type:        RewardTypeCashback,
		AmountCents: amount,
		Metadata: mustJSON(map[string]interface{}{
			"sale_amount_cents": event.SaleAmount,
			"pct":               pct,
			"cashback_cents":    amount,
		}),
	}, nil
}

// RecurringCommissionEvaluator handles subscription-based commissions.
type RecurringCommissionEvaluator struct{}

func (e *RecurringCommissionEvaluator) Evaluate(rule *RuleSchema, event *Event) (*RewardOutcome, error) {
	if event.SaleAmount <= 0 {
		return nil, fmt.Errorf("sale amount required for recurring_commission")
	}
	pct := *rule.Reward.Pct
	maxMonths := 12 // default
	if rule.Reward.MaxMonths != nil {
		maxMonths = *rule.Reward.MaxMonths
	}
	amount := int64(math.Round(float64(event.SaleAmount) * pct / 100))
	return &RewardOutcome{
		Type:        RewardTypeRecurringCommision,
		AmountCents: amount,
		Metadata: mustJSON(map[string]interface{}{
			"sale_amount_cents": event.SaleAmount,
			"pct":               pct,
			"max_months":        maxMonths,
			"current_month":     1,
		}),
	}, nil
}

// DiscountForLeadEvaluator gives a discount to the referred lead.
type DiscountForLeadEvaluator struct{}

func (e *DiscountForLeadEvaluator) Evaluate(rule *RuleSchema, event *Event) (*RewardOutcome, error) {
	var amount int64
	if rule.Reward.Pct != nil {
		amount = int64(math.Round(float64(event.SaleAmount) * *rule.Reward.Pct / 100))
	} else if rule.Reward.AmountBRL != nil {
		amount = int64(*rule.Reward.AmountBRL * 100)
	}
	return &RewardOutcome{
		Type:        RewardTypeDiscountForLead,
		AmountCents: 0, // discount applied to lead, not paid to partner
		Metadata: mustJSON(map[string]interface{}{
			"discount_cents": amount,
		}),
	}, nil
}

func mustJSON(v interface{}) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}
