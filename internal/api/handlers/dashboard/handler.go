// Package dashboard renders the tenant-admin home — the aggregate
// counters and tiny series the dashboard landing page shows above the
// fold.
package dashboard

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/indica-ai/indica-ai/internal/platform/db"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Handler {
	return &Handler{pool: pool}
}

type overviewResponse struct {
	ClicksLast7Days     int64           `json:"clicks_last_7_days"`
	ClicksDeltaPct      float64         `json:"clicks_delta_pct"`
	NewLeadsLast7Days   int64           `json:"new_leads_last_7_days"`
	LeadsDeltaPct       float64         `json:"leads_delta_pct"`
	PendingRewardsCents int64           `json:"pending_rewards_cents"`
	ActivePartners      int64           `json:"active_partners"`
	ClicksPerDay        []clicksPerDay  `json:"clicks_per_day"`
	TopPartners         []topPartner    `json:"top_partners"`
	RecentLeads         []recentLead    `json:"recent_leads"`
}

type clicksPerDay struct {
	Day   string `json:"day"`
	Count int64  `json:"count"`
}

type topPartner struct {
	Name        string `json:"name"`
	Referrals   int64  `json:"referrals"`
	AmountCents int64  `json:"amount_cents"`
}

type recentLead struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	PartnerName string    `json:"partner_name"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

// Overview handles GET /api/dashboard/overview. Returns counters comparing
// the last 7 days to the previous 7 (delta %) plus three small lists.
func (h *Handler) Overview(w http.ResponseWriter, r *http.Request) {
	tid, _ := db.GetTenantID(r.Context())
	tenantID, _ := uuid.Parse(tid)
	ctx := r.Context()

	var resp overviewResponse

	// Clicks last 7 vs prior 7 days.
	h.pool.QueryRow(ctx,
		`SELECT
		    COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '7 days'),
		    COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '14 days' AND created_at < now() - INTERVAL '7 days')
		 FROM click_events WHERE tenant_id = $1`,
		tenantID).Scan(new(int64), new(int64))
	var clicksRecent, clicksPrior int64
	h.pool.QueryRow(ctx,
		`SELECT
		    COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '7 days'),
		    COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '14 days' AND created_at < now() - INTERVAL '7 days')
		 FROM click_events WHERE tenant_id = $1`,
		tenantID).Scan(&clicksRecent, &clicksPrior)
	resp.ClicksLast7Days = clicksRecent
	resp.ClicksDeltaPct = pctDelta(clicksRecent, clicksPrior)

	// Leads last 7 vs prior 7.
	var leadsRecent, leadsPrior int64
	h.pool.QueryRow(ctx,
		`SELECT
		    COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '7 days'),
		    COUNT(*) FILTER (WHERE created_at >= now() - INTERVAL '14 days' AND created_at < now() - INTERVAL '7 days')
		 FROM leads WHERE tenant_id = $1`,
		tenantID).Scan(&leadsRecent, &leadsPrior)
	resp.NewLeadsLast7Days = leadsRecent
	resp.LeadsDeltaPct = pctDelta(leadsRecent, leadsPrior)

	h.pool.QueryRow(ctx,
		`SELECT COALESCE(SUM(amount_cents), 0) FROM rewards WHERE tenant_id = $1 AND status = 'pending'`,
		tenantID).Scan(&resp.PendingRewardsCents)

	h.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM partners WHERE tenant_id = $1 AND status = 'active'`,
		tenantID).Scan(&resp.ActivePartners)

	// Clicks per day for the last 7 days — left-join a generated date series
	// so empty days still render as zero (avoids gaps in the sparkline).
	resp.ClicksPerDay = make([]clicksPerDay, 0, 7)
	rows, err := h.pool.Query(ctx,
		`WITH days AS (
		    SELECT generate_series(
		        (now() - INTERVAL '6 days')::date,
		        now()::date,
		        '1 day'::interval
		    )::date AS day
		 )
		 SELECT d.day::text, COUNT(c.id)::bigint
		   FROM days d
		   LEFT JOIN click_events c
		     ON c.tenant_id = $1 AND c.created_at::date = d.day
		  GROUP BY d.day ORDER BY d.day`,
		tenantID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var c clicksPerDay
			if err := rows.Scan(&c.Day, &c.Count); err == nil {
				resp.ClicksPerDay = append(resp.ClicksPerDay, c)
			}
		}
	}

	// Top 5 partners by approved+paid commission.
	resp.TopPartners = make([]topPartner, 0, 5)
	tpRows, err := h.pool.Query(ctx,
		`SELECT pa.name,
		        COUNT(DISTINCT ref.id),
		        COALESCE(SUM(rw.amount_cents) FILTER (WHERE rw.status IN ('approved','paid')), 0)
		   FROM partners pa
		   LEFT JOIN referrals ref ON ref.partner_id = pa.id
		   LEFT JOIN rewards rw   ON rw.partner_id = pa.id
		  WHERE pa.tenant_id = $1
		  GROUP BY pa.id, pa.name
		  ORDER BY 3 DESC, 2 DESC
		  LIMIT 5`,
		tenantID)
	if err == nil {
		defer tpRows.Close()
		for tpRows.Next() {
			var t topPartner
			if err := tpRows.Scan(&t.Name, &t.Referrals, &t.AmountCents); err == nil {
				resp.TopPartners = append(resp.TopPartners, t)
			}
		}
	}

	// 5 most recent leads.
	resp.RecentLeads = make([]recentLead, 0, 5)
	rlRows, err := h.pool.Query(ctx,
		`SELECT l.id, COALESCE(l.name, ''), COALESCE(pa.name, ''), l.status, l.created_at
		   FROM leads l
		   LEFT JOIN referrals ref ON ref.id = l.referral_id
		   LEFT JOIN partners pa   ON pa.id = ref.partner_id
		  WHERE l.tenant_id = $1
		  ORDER BY l.created_at DESC
		  LIMIT 5`,
		tenantID)
	if err == nil {
		defer rlRows.Close()
		for rlRows.Next() {
			var l recentLead
			if err := rlRows.Scan(&l.ID, &l.Name, &l.PartnerName, &l.Status, &l.CreatedAt); err == nil {
				resp.RecentLeads = append(resp.RecentLeads, l)
			}
		}
	}

	writeJSON(w, http.StatusOK, resp)
}

func pctDelta(current, prior int64) float64 {
	if prior == 0 {
		if current == 0 {
			return 0
		}
		return 100
	}
	return float64(current-prior) / float64(prior) * 100
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
