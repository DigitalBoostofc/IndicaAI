package rules_test

import (
	"encoding/json"
	"testing"

	"github.com/indica-ai/indica-ai/internal/domain/rules"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParseRuleSchema(t *testing.T) {
	t.Run("valid commission_fixed", func(t *testing.T) {
		data := json.RawMessage(`{
			"schema_version": 1,
			"trigger": "sale.confirmed",
			"attribution_window_days": 30,
			"reward": {"type": "commission_fixed", "amount_brl": 100}
		}`)
		rule, err := rules.ParseRuleSchema(data)
		require.NoError(t, err)
		assert.Equal(t, 1, rule.SchemaVersion)
		assert.Equal(t, "sale.confirmed", rule.Trigger)
		assert.Equal(t, "commission_fixed", rule.Reward.Type)
		assert.Equal(t, 100.0, *rule.Reward.AmountBRL)
	})

	t.Run("valid flexible_split", func(t *testing.T) {
		data := json.RawMessage(`{
			"schema_version": 1,
			"trigger": "sale.confirmed",
			"reward": {
				"type": "flexible_split",
				"max_pct": 20,
				"decision_by": "partner",
				"options": [
					{"commission_pct": 20, "discount_pct": 0},
					{"commission_pct": 10, "discount_pct": 10}
				]
			}
		}`)
		rule, err := rules.ParseRuleSchema(data)
		require.NoError(t, err)
		assert.Equal(t, "flexible_split", rule.Reward.Type)
		assert.Equal(t, 20.0, *rule.Reward.MaxPct)
		assert.Len(t, rule.Reward.Options, 2)
	})

	t.Run("invalid schema_version", func(t *testing.T) {
		data := json.RawMessage(`{"schema_version": 0, "trigger": "sale.confirmed", "reward": {"type": "commission_fixed", "amount_brl": 100}}`)
		_, err := rules.ParseRuleSchema(data)
		assert.Error(t, err)
	})

	t.Run("missing trigger", func(t *testing.T) {
		data := json.RawMessage(`{"schema_version": 1, "reward": {"type": "commission_fixed", "amount_brl": 100}}`)
		_, err := rules.ParseRuleSchema(data)
		assert.Error(t, err)
	})

	t.Run("invalid reward type", func(t *testing.T) {
		data := json.RawMessage(`{"schema_version": 1, "trigger": "sale.confirmed", "reward": {"type": "invalid"}}`)
		_, err := rules.ParseRuleSchema(data)
		assert.Error(t, err)
	})
}

func TestCommissionFixedEvaluator(t *testing.T) {
	engine := rules.NewEngine()

	rule := &rules.RuleSchema{
		SchemaVersion: 1,
		Trigger:       "sale.confirmed",
		Reward: rules.RewardConfig{
			Type:      "commission_fixed",
			AmountBRL: float64Ptr(100),
		},
	}

	event := &rules.Event{
		Type:       "sale.confirmed",
		SaleAmount: 50000, // R$500
		PartnerID:  "partner-1",
		ReferralID: "ref-1",
		ProgramID:  "prog-1",
		TenantID:   "tenant-1",
	}

	outcome, err := engine.Evaluate(rule, event)
	require.NoError(t, err)
	assert.Equal(t, int64(10000), outcome.AmountCents) // R$100 in cents
	assert.Equal(t, "commission_fixed", outcome.Type)
	assert.Equal(t, "BRL", outcome.Currency)
	assert.Equal(t, "pending", outcome.Status)
}

func TestCommissionPctEvaluator(t *testing.T) {
	engine := rules.NewEngine()

	rule := &rules.RuleSchema{
		SchemaVersion: 1,
		Trigger:       "sale.confirmed",
		Reward: rules.RewardConfig{
			Type: "commission_pct",
			Pct:  float64Ptr(10),
		},
	}

	t.Run("calculates percentage correctly", func(t *testing.T) {
		event := &rules.Event{
			Type:       "sale.confirmed",
			SaleAmount: 100000, // R$1000
			PartnerID:  "p1",
			ReferralID: "r1",
			ProgramID:  "pr1",
			TenantID:   "t1",
		}

		outcome, err := engine.Evaluate(rule, event)
		require.NoError(t, err)
		assert.Equal(t, int64(10000), outcome.AmountCents) // 10% of R$1000 = R$100
	})

	t.Run("requires sale amount", func(t *testing.T) {
		event := &rules.Event{
			Type:       "sale.confirmed",
			SaleAmount: 0,
			PartnerID:  "p1",
			ReferralID: "r1",
			ProgramID:  "pr1",
			TenantID:   "t1",
		}

		_, err := engine.Evaluate(rule, event)
		assert.Error(t, err)
	})
}

func TestFlexibleSplitEvaluator(t *testing.T) {
	engine := rules.NewEngine()

	rule := &rules.RuleSchema{
		SchemaVersion: 1,
		Trigger:       "sale.confirmed",
		Reward: rules.RewardConfig{
			Type:    "flexible_split",
			MaxPct:  float64Ptr(20),
			Options: []rules.SplitOption{
				{CommissionPct: 20, DiscountPct: 0},
				{CommissionPct: 10, DiscountPct: 10},
				{CommissionPct: 0, DiscountPct: 20},
			},
		},
	}

	t.Run("all commission", func(t *testing.T) {
		event := &rules.Event{
			Type:        "sale.confirmed",
			SaleAmount:  100000,
			PartnerID:   "p1",
			ReferralID:  "r1",
			ProgramID:   "pr1",
			TenantID:    "t1",
			SplitChoice: json.RawMessage(`{"commission_pct": 20, "discount_pct": 0}`),
		}

		outcome, err := engine.Evaluate(rule, event)
		require.NoError(t, err)
		assert.Equal(t, int64(20000), outcome.AmountCents) // 20% of R$1000
	})

	t.Run("split 10/10", func(t *testing.T) {
		event := &rules.Event{
			Type:        "sale.confirmed",
			SaleAmount:  100000,
			PartnerID:   "p1",
			ReferralID:  "r1",
			ProgramID:   "pr1",
			TenantID:    "t1",
			SplitChoice: json.RawMessage(`{"commission_pct": 10, "discount_pct": 10}`),
		}

		outcome, err := engine.Evaluate(rule, event)
		require.NoError(t, err)
		assert.Equal(t, int64(10000), outcome.AmountCents) // 10% commission
	})

	t.Run("exceeds max pct", func(t *testing.T) {
		event := &rules.Event{
			Type:        "sale.confirmed",
			SaleAmount:  100000,
			PartnerID:   "p1",
			ReferralID:  "r1",
			ProgramID:   "pr1",
			TenantID:    "t1",
			SplitChoice: json.RawMessage(`{"commission_pct": 15, "discount_pct": 10}`),
		}

		_, err := engine.Evaluate(rule, event)
		assert.Error(t, err) // 25% > 20% max
	})

	t.Run("default split when no choice", func(t *testing.T) {
		event := &rules.Event{
			Type:       "sale.confirmed",
			SaleAmount: 100000,
			PartnerID:  "p1",
			ReferralID: "r1",
			ProgramID:  "pr1",
			TenantID:   "t1",
		}

		outcome, err := engine.Evaluate(rule, event)
		require.NoError(t, err)
		assert.Equal(t, int64(20000), outcome.AmountCents) // default: all commission
	})
}

func TestGoalBasedEvaluator(t *testing.T) {
	engine := rules.NewEngine()

	rule := &rules.RuleSchema{
		SchemaVersion: 1,
		Trigger:       "sale.confirmed",
		Reward: rules.RewardConfig{
			Type:   "goal_based",
			Target: intPtr(5),
		},
	}

	event := &rules.Event{
		Type:       "sale.confirmed",
		PartnerID:  "p1",
		ReferralID: "r1",
		ProgramID:  "pr1",
		TenantID:   "t1",
	}

	outcome, err := engine.Evaluate(rule, event)
	require.NoError(t, err)
	assert.Equal(t, int64(0), outcome.AmountCents) // physical reward
	assert.Equal(t, "goal_based", outcome.Type)
}

func TestCashbackEvaluator(t *testing.T) {
	engine := rules.NewEngine()

	rule := &rules.RuleSchema{
		SchemaVersion: 1,
		Trigger:       "sale.confirmed",
		Reward: rules.RewardConfig{
			Type: "cashback",
			Pct:  float64Ptr(5),
		},
	}

	event := &rules.Event{
		Type:       "sale.confirmed",
		SaleAmount: 200000, // R$2000
		PartnerID:  "p1",
		ReferralID: "r1",
		ProgramID:  "pr1",
		TenantID:   "t1",
	}

	outcome, err := engine.Evaluate(rule, event)
	require.NoError(t, err)
	assert.Equal(t, int64(10000), outcome.AmountCents) // 5% of R$2000 = R$100
}

func TestConditionEvaluation(t *testing.T) {
	engine := rules.NewEngine()

	rule := &rules.RuleSchema{
		SchemaVersion: 1,
		Trigger:       "sale.confirmed",
		Conditions: []rules.Condition{
			{Op: "eq", Field: "lead.status", Value: "closed"},
		},
		Reward: rules.RewardConfig{
			Type:      "commission_fixed",
			AmountBRL: float64Ptr(50),
		},
	}

	t.Run("condition met", func(t *testing.T) {
		event := &rules.Event{
			Type:       "sale.confirmed",
			LeadStatus: "closed",
			PartnerID:  "p1",
			ReferralID: "r1",
			ProgramID:  "pr1",
			TenantID:   "t1",
		}

		outcome, err := engine.Evaluate(rule, event)
		require.NoError(t, err)
		assert.NotNil(t, outcome)
	})

	t.Run("condition not met", func(t *testing.T) {
		event := &rules.Event{
			Type:       "sale.confirmed",
			LeadStatus: "new",
			PartnerID:  "p1",
			ReferralID: "r1",
			ProgramID:  "pr1",
			TenantID:   "t1",
		}

		_, err := engine.Evaluate(rule, event)
		assert.Error(t, err)
	})
}

func TestPointsEvaluator(t *testing.T) {
	engine := rules.NewEngine()

	t.Run("points per BRL", func(t *testing.T) {
		rule := &rules.RuleSchema{
			SchemaVersion: 1,
			Trigger:       "sale.confirmed",
			Reward: rules.RewardConfig{
				Type:         "points",
				PointsPerBRL: float64Ptr(10),
			},
		}

		event := &rules.Event{
			Type:       "sale.confirmed",
			SaleAmount: 50000, // R$500
			PartnerID:  "p1",
			ReferralID: "r1",
			ProgramID:  "pr1",
			TenantID:   "t1",
		}

		outcome, err := engine.Evaluate(rule, event)
		require.NoError(t, err)
		assert.Equal(t, "points", outcome.Type)
		meta := map[string]interface{}{}
		json.Unmarshal(outcome.Metadata, &meta)
		assert.Equal(t, float64(5000), meta["points"]) // 500 * 10
	})

	t.Run("points per conversion", func(t *testing.T) {
		rule := &rules.RuleSchema{
			SchemaVersion: 1,
			Trigger:       "sale.confirmed",
			Reward: rules.RewardConfig{
				Type:                "points",
				PointsPerConversion: intPtr(100),
			},
		}

		event := &rules.Event{
			Type:       "sale.confirmed",
			PartnerID:  "p1",
			ReferralID: "r1",
			ProgramID:  "pr1",
			TenantID:   "t1",
		}

		outcome, err := engine.Evaluate(rule, event)
		require.NoError(t, err)
		meta := map[string]interface{}{}
		json.Unmarshal(outcome.Metadata, &meta)
		assert.Equal(t, float64(100), meta["points"])
	})
}

func float64Ptr(f float64) *float64 { return &f }
func intPtr(i int) *int             { return &i }
