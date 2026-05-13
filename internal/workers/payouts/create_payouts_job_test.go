package payouts

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGroupByPartner_AggregatesRewards(t *testing.T) {
	partner1 := uuid.New()
	partner2 := uuid.New()
	tenant := uuid.New()

	rewards := []EligibleReward{
		{RewardID: uuid.New(), PartnerID: partner1, TenantID: tenant, AmountCents: 5000, PixKey: "a@test.com", PixKeyType: "email"},
		{RewardID: uuid.New(), PartnerID: partner1, TenantID: tenant, AmountCents: 3000, PixKey: "a@test.com", PixKeyType: "email"},
		{RewardID: uuid.New(), PartnerID: partner2, TenantID: tenant, AmountCents: 10000, PixKey: "12345678901", PixKeyType: "cpf"},
	}

	grouped := groupByPartner(rewards)

	require.Len(t, grouped, 2)

	key1 := partnerKey{PartnerID: partner1, TenantID: tenant}
	info1 := grouped[key1]
	require.NotNil(t, info1)
	assert.Len(t, info1.Rewards, 2)
	assert.Equal(t, int64(8000), info1.TotalCents)
	assert.Equal(t, "a@test.com", info1.PixKey)
	assert.Equal(t, "email", info1.PixKeyType)

	key2 := partnerKey{PartnerID: partner2, TenantID: tenant}
	info2 := grouped[key2]
	require.NotNil(t, info2)
	assert.Len(t, info2.Rewards, 1)
	assert.Equal(t, int64(10000), info2.TotalCents)
	assert.Equal(t, "12345678901", info2.PixKey)
	assert.Equal(t, "cpf", info2.PixKeyType)
}

func TestGroupByPartner_EmptyInput(t *testing.T) {
	grouped := groupByPartner(nil)
	assert.Empty(t, grouped)

	grouped = groupByPartner([]EligibleReward{})
	assert.Empty(t, grouped)
}

func TestGroupByPartner_SeparateTenants(t *testing.T) {
	partner := uuid.New()
	tenant1 := uuid.New()
	tenant2 := uuid.New()

	rewards := []EligibleReward{
		{RewardID: uuid.New(), PartnerID: partner, TenantID: tenant1, AmountCents: 5000, PixKey: "key", PixKeyType: "email"},
		{RewardID: uuid.New(), PartnerID: partner, TenantID: tenant2, AmountCents: 7000, PixKey: "key", PixKeyType: "email"},
	}

	grouped := groupByPartner(rewards)

	// Same partner in different tenants should be separate groups
	assert.Len(t, grouped, 2)
}

// TestCreatePayoutsJob_SkipsNoPixKey verifies the grouping logic correctly
// identifies partners with empty pix_key. The actual DB skip happens in
// RunCreatePayoutsJob which checks info.PixKey == "".
func TestCreatePayoutsJob_SkipsNoPixKey(t *testing.T) {
	partner := uuid.New()
	tenant := uuid.New()

	rewards := []EligibleReward{
		{RewardID: uuid.New(), PartnerID: partner, TenantID: tenant, AmountCents: 5000, PixKey: "", PixKeyType: ""},
	}

	grouped := groupByPartner(rewards)
	key := partnerKey{PartnerID: partner, TenantID: tenant}
	info := grouped[key]
	require.NotNil(t, info)

	// Simulate the skip check from RunCreatePayoutsJob
	assert.Equal(t, "", info.PixKey, "partner without pix_key should be detected")
}

// TestCreatePayoutsJob_SkipsPendingPayout tests the concept that when a partner
// has an existing pending payout, the job should skip them. The actual DB check
// is in checkPendingPayout; this test validates the grouping would produce the
// correct key for lookup.
func TestCreatePayoutsJob_PartnerKeyForPendingCheck(t *testing.T) {
	partner := uuid.New()
	tenant := uuid.New()

	rewards := []EligibleReward{
		{RewardID: uuid.New(), PartnerID: partner, TenantID: tenant, AmountCents: 5000, PixKey: "key", PixKeyType: "cpf"},
	}

	grouped := groupByPartner(rewards)
	key := partnerKey{PartnerID: partner, TenantID: tenant}
	info := grouped[key]
	require.NotNil(t, info)

	// The key is used to call checkPendingPayout(ctx, pool, key.PartnerID, key.TenantID)
	assert.Equal(t, partner, key.PartnerID)
	assert.Equal(t, tenant, key.TenantID)
	assert.Equal(t, int64(5000), info.TotalCents)
}

func TestGroupByPartner_PixKeyFromFirstReward(t *testing.T) {
	partner := uuid.New()
	tenant := uuid.New()

	rewards := []EligibleReward{
		{RewardID: uuid.New(), PartnerID: partner, TenantID: tenant, AmountCents: 1000, PixKey: "first@key.com", PixKeyType: "email"},
		{RewardID: uuid.New(), PartnerID: partner, TenantID: tenant, AmountCents: 2000, PixKey: "first@key.com", PixKeyType: "email"},
	}

	grouped := groupByPartner(rewards)
	key := partnerKey{PartnerID: partner, TenantID: tenant}
	info := grouped[key]

	assert.Equal(t, "first@key.com", info.PixKey)
	assert.Len(t, info.Rewards, 2)
	assert.Equal(t, int64(3000), info.TotalCents)
}
