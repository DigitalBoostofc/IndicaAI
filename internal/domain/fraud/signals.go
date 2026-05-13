package fraud

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// checkSelfReferral detects if the lead's phone or email matches the partner's.
// Returns +50 for phone match, +50 for email match (not cumulative — first match wins).
func checkSelfReferral(ctx context.Context, q Querier, partnerID, tenantID uuid.UUID, phoneHash, emailHash string) (int, map[string]any) {
	var pHash, eHash *string
	err := q.QueryRow(ctx,
		`SELECT phone_hash, email_hash FROM partners WHERE id = $1 AND tenant_id = $2`,
		partnerID, tenantID).Scan(&pHash, &eHash)
	if err != nil {
		return 0, nil
	}

	if pHash != nil && *pHash == phoneHash {
		return 50, map[string]any{"signal": "self_referral", "match": "phone"}
	}
	if emailHash != "" && eHash != nil && *eHash == emailHash {
		return 50, map[string]any{"signal": "self_referral", "match": "email"}
	}
	return 0, nil
}

// checkVelocity detects if a partner has created too many leads in a short window.
// Returns +20 if more than 10 leads in the last 1 hour.
func checkVelocity(ctx context.Context, q Querier, partnerID, tenantID uuid.UUID, now time.Time) (int, map[string]any) {
	windowStart := now.Add(-1 * time.Hour)
	var count int
	err := q.QueryRow(ctx,
		`SELECT COUNT(*) FROM referrals
		 WHERE partner_id = $1 AND tenant_id = $2 AND created_at >= $3`,
		partnerID, tenantID, windowStart).Scan(&count)
	if err != nil {
		return 0, nil
	}

	if count > 10 {
		return 20, map[string]any{"signal": "velocity", "count": count, "window": "1h"}
	}
	return 0, nil
}

// checkPhoneDedup detects if the lead's phone hash was already used by another partner in the last 24h.
// Returns +30 if the phone appears in another partner's referral (potential attribution theft).
func checkPhoneDedup(ctx context.Context, q Querier, partnerID, tenantID uuid.UUID, phoneHash string, now time.Time) (int, map[string]any) {
	if phoneHash == "" {
		return 0, nil
	}
	windowStart := now.Add(-24 * time.Hour)
	var otherPartnerID *uuid.UUID
	err := q.QueryRow(ctx,
		`SELECT r.partner_id FROM referrals r
		 JOIN leads l ON l.referral_id = r.id
		 WHERE l.phone_hash = $1 AND r.tenant_id = $2 AND r.partner_id != $3 AND r.created_at >= $4
		 LIMIT 1`,
		phoneHash, tenantID, partnerID, windowStart).Scan(&otherPartnerID)
	if err != nil {
		return 0, nil
	}

	return 30, map[string]any{"signal": "phone_dedup", "other_partner_id": otherPartnerID.String()}
}

// checkClickVelocity detects if a partner has abnormally high click rates on any link.
// Returns +25 if more than 50 clicks in a 60-second window on any single partner_link.
func checkClickVelocity(ctx context.Context, q Querier, partnerID, tenantID uuid.UUID, now time.Time) (int, map[string]any) {
	windowStart := now.Add(-1 * time.Minute)
	var count int
	err := q.QueryRow(ctx,
		`SELECT COUNT(*) FROM click_events
		 WHERE partner_id = $1 AND tenant_id = $2 AND occurred_at >= $3`,
		partnerID, tenantID, windowStart).Scan(&count)
	if err != nil {
		return 0, nil
	}

	if count > 50 {
		return 25, map[string]any{"signal": "click_velocity", "count": count, "window": "60s"}
	}
	return 0, nil
}

// checkIPUADup detects if many clicks share the same (ip, user_agent) fingerprint in a short window.
// Returns +15 if more than 30 clicks from the same (ip, ua) hash in 1 hour.
func checkIPUADup(ctx context.Context, q Querier, partnerID, tenantID uuid.UUID, now time.Time) (int, map[string]any) {
	windowStart := now.Add(-1 * time.Hour)
	var count int
	err := q.QueryRow(ctx,
		`SELECT COUNT(*) FROM (
			SELECT fingerprint, COUNT(*) AS cnt
			FROM click_events
			WHERE partner_id = $1 AND tenant_id = $2 AND occurred_at >= $3
			GROUP BY fingerprint
			HAVING COUNT(*) > 30
		 ) AS repeated`,
		partnerID, tenantID, windowStart).Scan(&count)
	if err != nil {
		return 0, nil
	}

	if count > 0 {
		return 15, map[string]any{"signal": "ip_ua_dup", "distinct_fingerprints": count}
	}
	return 0, nil
}

// checkImprobableHours detects if the lead was created between 02:00-05:00 BRT.
// This is a weak signal (+10) meant to complement others, not block on its own.
func checkImprobableHours(ctx context.Context, _ Querier, now time.Time) (int, map[string]any) {
	loc := time.FixedZone("BRT", -3*60*60)
	local := now.In(loc)
	hour := local.Hour()

	if hour >= 2 && hour <= 4 {
		return 10, map[string]any{"signal": "improbable_hours", "hour_brt": hour}
	}
	return 0, nil
}
