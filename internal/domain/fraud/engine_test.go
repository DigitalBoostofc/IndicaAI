package fraud

import (
	"context"
	"log/slog"
	"net"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---- mock rows (minimal pgx.Rows implementation) ----

type mockRows struct {
	data [][]any
	pos  int
	cols []string
	err  error
}

func (m *mockRows) Close()                       {}
func (m *mockRows) Err() error                    { return m.err }
func (m *mockRows) CommandTag() pgconn.CommandTag { return pgconn.CommandTag{} }
func (m *mockRows) Conn() *pgx.Conn               { return nil }
func (m *mockRows) FieldDescriptions() []pgconn.FieldDescription {
	descs := make([]pgconn.FieldDescription, len(m.cols))
	for i, c := range m.cols {
		descs[i] = pgconn.FieldDescription{Name: c}
	}
	return descs
}

func (m *mockRows) Next() bool {
	m.pos++
	return m.pos <= len(m.data)
}

func (m *mockRows) Scan(dest ...any) error {
	if m.pos < 1 || m.pos > len(m.data) {
		return pgx.ErrNoRows
	}
	row := m.data[m.pos-1]
	for i, d := range dest {
		if i >= len(row) {
			break
		}
		assign(d, row[i])
	}
	return nil
}

func (m *mockRows) Values() ([]any, error) {
	if m.pos < 1 || m.pos > len(m.data) {
		return nil, pgx.ErrNoRows
	}
	return m.data[m.pos-1], nil
}

func (m *mockRows) RawValues() [][]byte { return nil }

// assign copies src into dest, handling common pointer types (matching pgx scan semantics).
func assign(dest, src any) {
	switch d := dest.(type) {
	case *string:
		if src == nil {
			return
		}
		if s, ok := src.(*string); ok {
			if s != nil {
				*d = *s
			}
		} else if s, ok := src.(string); ok {
			*d = s
		}
	case **string:
		if src == nil {
			*d = nil
			return
		}
		if s, ok := src.(*string); ok {
			*d = s
		}
	case *int:
		if v, ok := src.(int); ok {
			*d = v
		}
	case *uuid.UUID:
		if v, ok := src.(uuid.UUID); ok {
			*d = v
		}
	case **uuid.UUID:
		if src == nil {
			*d = nil
			return
		}
		if v, ok := src.(*uuid.UUID); ok {
			*d = v
		}
	}
}

// mockQuerier returns canned responses for each SQL pattern.
type mockQuerier struct {
	partnerInfoRows *mockRows // self-referral
	velocityRows    *mockRows // velocity
	phoneDedupRows  *mockRows // phone dedup
	clickVelRows    *mockRows // click velocity
	ipUADupRows     *mockRows // ip/ua dup
}

// cloneRows creates a fresh copy with pos reset so each caller gets independent state.
func cloneRows(src *mockRows) *mockRows {
	if src == nil {
		return &mockRows{}
	}
	dst := &mockRows{data: src.data, cols: src.cols, err: src.err}
	return dst
}

func (m *mockQuerier) Query(_ context.Context, sql string, _ ...any) (pgx.Rows, error) {
	switch {
	case contains(sql, "FROM referrals") && contains(sql, "COUNT(*)"):
		return cloneRows(m.velocityRows), nil
	case contains(sql, "FROM click_events") && contains(sql, "COUNT(*)") && contains(sql, "partner_id"):
		if contains(sql, "fingerprint") || contains(sql, "GROUP BY") {
			return cloneRows(m.ipUADupRows), nil
		}
		return cloneRows(m.clickVelRows), nil
	case contains(sql, "phone_hash") && contains(sql, "JOIN leads"):
		return cloneRows(m.phoneDedupRows), nil
	}
	return &mockRows{}, nil
}

func (m *mockQuerier) QueryRow(_ context.Context, sql string, _ ...any) pgx.Row {
	switch {
	case contains(sql, "FROM partners") && contains(sql, "phone_hash"):
		return &mockRowScanner{rows: cloneRows(m.partnerInfoRows)}
	case contains(sql, "FROM referrals") && contains(sql, "COUNT(*)"):
		return &mockRowScanner{rows: cloneRows(m.velocityRows)}
	case contains(sql, "FROM click_events") && contains(sql, "COUNT(*)"):
		if contains(sql, "fingerprint") || contains(sql, "GROUP BY") || contains(sql, "HAVING") {
			return &mockRowScanner{rows: cloneRows(m.ipUADupRows)}
		}
		return &mockRowScanner{rows: cloneRows(m.clickVelRows)}
	case contains(sql, "phone_hash") && contains(sql, "JOIN leads"):
		return &mockRowScanner{rows: cloneRows(m.phoneDedupRows)}
	case contains(sql, "audit_log"):
		return &mockRowScanner{rows: &mockRows{}}
	}
	return &mockRowScanner{rows: &mockRows{}}
}

// mockRowScanner adapts pgx.Rows into a pgx.Row for QueryRow.
type mockRowScanner struct {
	rows pgx.Rows
}

func (r *mockRowScanner) Scan(dest ...any) error {
	if !r.rows.Next() {
		if err := r.rows.Err(); err != nil {
			return err
		}
		return pgx.ErrNoRows
	}
	return r.rows.Scan(dest...)
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(s) > 0 && findSubstring(s, sub))
}

func findSubstring(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

// ---- helpers ----

var testLogger = slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))

func newMockPartnerRows(phoneHash, emailHash *string) *mockRows {
	return &mockRows{
		data: [][]any{{phoneHash, emailHash}},
		cols: []string{"phone_hash", "email_hash"},
	}
}

func newMockCountRows(count int) *mockRows {
	return &mockRows{
		data: [][]any{{count}},
		cols: []string{"count"},
	}
}

func newMockEmptyRows() *mockRows {
	return &mockRows{cols: []string{}}
}

func newMockPhoneDedupRows(otherPartnerID uuid.UUID) *mockRows {
	return &mockRows{
		data: [][]any{{&otherPartnerID}},
		cols: []string{"partner_id"},
	}
}

// ---- tests ----

func fixedTime(hourUTC int) time.Time {
	return time.Date(2026, 5, 13, hourUTC, 0, 0, 0, time.UTC)
}

func TestEngine_SelfReferral_PhoneMatch_Review(t *testing.T) {
	phoneHash := "abc123"
	q := &mockQuerier{
		partnerInfoRows: newMockPartnerRows(&phoneHash, nil),
		velocityRows:    newMockCountRows(0),
		phoneDedupRows:  newMockEmptyRows(),
		clickVelRows:    newMockCountRows(0),
		ipUADupRows:     newMockCountRows(0),
	}

	engine := NewEngine(q, testLogger)
	result, err := engine.Check(context.Background(), LeadCreationInput{
		PartnerID: uuid.New(),
		TenantID:  uuid.New(),
		PhoneHash: "abc123",
		Now:       fixedTime(14), // 14:00 UTC = 11:00 BRT (normal hours)
	})

	require.NoError(t, err)
	assert.Equal(t, ActionReview, result.Action) // 50 → review (31-60)
	assert.Equal(t, 50, result.Score)
	assert.Len(t, result.Signals, 1)
	assert.Equal(t, "self_referral", result.Signals[0].Name)
}

func TestEngine_SelfReferral_EmailMatch_Review(t *testing.T) {
	emailHash := "def456"
	q := &mockQuerier{
		partnerInfoRows: newMockPartnerRows(nil, &emailHash),
		velocityRows:    newMockCountRows(0),
		phoneDedupRows:  newMockEmptyRows(),
		clickVelRows:    newMockCountRows(0),
		ipUADupRows:     newMockCountRows(0),
	}

	engine := NewEngine(q, testLogger)
	result, err := engine.Check(context.Background(), LeadCreationInput{
		PartnerID: uuid.New(),
		TenantID:  uuid.New(),
		PhoneHash: "different",
		EmailHash: "def456",
		Now:       fixedTime(14),
	})

	require.NoError(t, err)
	assert.Equal(t, ActionReview, result.Action) // 50 → review
	assert.Equal(t, 50, result.Score)
	assert.Len(t, result.Signals, 1)
	assert.Equal(t, "self_referral", result.Signals[0].Name)
}

func TestEngine_VelocityNormal_OK(t *testing.T) {
	q := &mockQuerier{
		partnerInfoRows: newMockPartnerRows(nil, nil),
		velocityRows:    newMockCountRows(5), // 5 leads in 1h — normal
		phoneDedupRows:  newMockEmptyRows(),
		clickVelRows:    newMockCountRows(0),
		ipUADupRows:     newMockCountRows(0),
	}

	engine := NewEngine(q, testLogger)
	result, err := engine.Check(context.Background(), LeadCreationInput{
		PartnerID: uuid.New(),
		TenantID:  uuid.New(),
		PhoneHash: "hash123",
		Now:       fixedTime(14),
	})

	require.NoError(t, err)
	assert.Equal(t, ActionOK, result.Action)
	assert.Equal(t, 0, result.Score)
	assert.Empty(t, result.Signals)
}

func TestEngine_VelocityHighPlusClickVelocity_ReviewOrBlock(t *testing.T) {
	// velocity=20 + click_velocity=25 = 45 → review
	q := &mockQuerier{
		partnerInfoRows: newMockPartnerRows(nil, nil),
		velocityRows:    newMockCountRows(15), // >10 → +20
		phoneDedupRows:  newMockEmptyRows(),
		clickVelRows:    newMockCountRows(60), // >50 → +25
		ipUADupRows:     newMockCountRows(0),
	}

	engine := NewEngine(q, testLogger)
	result, err := engine.Check(context.Background(), LeadCreationInput{
		PartnerID: uuid.New(),
		TenantID:  uuid.New(),
		PhoneHash: "hash123",
		Now:       fixedTime(14),
	})

	require.NoError(t, err)
	assert.Equal(t, ActionReview, result.Action)
	assert.Equal(t, 45, result.Score)
	assert.Len(t, result.Signals, 2)
}

func TestEngine_ImprobableHoursAlone_OK(t *testing.T) {
	// 03:00 BRT = 06:00 UTC. Only improbable_hours fires (+10). Score 10 → ok.
	q := &mockQuerier{
		partnerInfoRows: newMockPartnerRows(nil, nil),
		velocityRows:    newMockCountRows(0),
		phoneDedupRows:  newMockEmptyRows(),
		clickVelRows:    newMockCountRows(0),
		ipUADupRows:     newMockCountRows(0),
	}

	engine := NewEngine(q, testLogger)
	result, err := engine.Check(context.Background(), LeadCreationInput{
		PartnerID: uuid.New(),
		TenantID:  uuid.New(),
		PhoneHash: "hash123",
		Now:       fixedTime(6), // 06:00 UTC = 03:00 BRT
	})

	require.NoError(t, err)
	assert.Equal(t, ActionOK, result.Action)
	assert.Equal(t, 10, result.Score)
	assert.Len(t, result.Signals, 1)
	assert.Equal(t, "improbable_hours", result.Signals[0].Name)
}

func TestEngine_ThreeMediumSignals_Review(t *testing.T) {
	// velocity(+20) + click_velocity(+25) + ip_ua_dup(+15) = 60 → review
	q := &mockQuerier{
		partnerInfoRows: newMockPartnerRows(nil, nil),
		velocityRows:    newMockCountRows(15),
		phoneDedupRows:  newMockEmptyRows(),
		clickVelRows:    newMockCountRows(60),
		ipUADupRows: &mockRows{
			data: [][]any{{3}}, // 3 distinct fingerprints with >30 clicks each
			cols: []string{"count"},
		},
	}

	engine := NewEngine(q, testLogger)
	result, err := engine.Check(context.Background(), LeadCreationInput{
		PartnerID: uuid.New(),
		TenantID:  uuid.New(),
		PhoneHash: "hash123",
		Now:       fixedTime(14),
	})

	require.NoError(t, err)
	assert.Equal(t, ActionReview, result.Action)
	assert.Equal(t, 60, result.Score)
	assert.Len(t, result.Signals, 3)
}

func TestEngine_SelfReferralPlusVelocity_Block(t *testing.T) {
	// self_referral(+50) + velocity(+20) = 70 → block
	phoneHash := "match"
	q := &mockQuerier{
		partnerInfoRows: newMockPartnerRows(&phoneHash, nil),
		velocityRows:    newMockCountRows(15),
		phoneDedupRows:  newMockEmptyRows(),
		clickVelRows:    newMockCountRows(0),
		ipUADupRows:     newMockCountRows(0),
	}

	engine := NewEngine(q, testLogger)
	result, err := engine.Check(context.Background(), LeadCreationInput{
		PartnerID: uuid.New(),
		TenantID:  uuid.New(),
		PhoneHash: "match",
		Now:       fixedTime(14),
	})

	require.NoError(t, err)
	assert.Equal(t, ActionBlock, result.Action)
	assert.Equal(t, 70, result.Score)
}

func TestEngine_AllSignals_Block(t *testing.T) {
	// self_referral(50) + velocity(20) + phone_dedup(30) + click_velocity(25) + ip_ua(15) + hours(10) = 150 → block
	phoneHash := "match"
	otherPartner := uuid.New()
	q := &mockQuerier{
		partnerInfoRows: newMockPartnerRows(&phoneHash, nil),
		velocityRows:    newMockCountRows(20),
		phoneDedupRows:  newMockPhoneDedupRows(otherPartner),
		clickVelRows:    newMockCountRows(100),
		ipUADupRows: &mockRows{
			data: [][]any{{5}},
			cols: []string{"count"},
		},
	}

	engine := NewEngine(q, testLogger)
	result, err := engine.Check(context.Background(), LeadCreationInput{
		PartnerID: uuid.New(),
		TenantID:  uuid.New(),
		PhoneHash: "match",
		Now:       fixedTime(3), // 03:00 UTC = 00:00 BRT... wait, that's midnight BRT
		// Actually 03:00 UTC = 00:00 BRT. Let me use 06:00 UTC = 03:00 BRT for improbable hours.
	})

	require.NoError(t, err)
	assert.Equal(t, ActionBlock, result.Action)
	assert.True(t, result.Score >= 61)
}

func TestEngine_AllSignals_Block_ImprobableHours(t *testing.T) {
	// Same as above but with correct time for improbable hours
	phoneHash := "match"
	otherPartner := uuid.New()
	q := &mockQuerier{
		partnerInfoRows: newMockPartnerRows(&phoneHash, nil),
		velocityRows:    newMockCountRows(20),
		phoneDedupRows:  newMockPhoneDedupRows(otherPartner),
		clickVelRows:    newMockCountRows(100),
		ipUADupRows: &mockRows{
			data: [][]any{{5}},
			cols: []string{"count"},
		},
	}

	engine := NewEngine(q, testLogger)
	result, err := engine.Check(context.Background(), LeadCreationInput{
		PartnerID: uuid.New(),
		TenantID:  uuid.New(),
		PhoneHash: "match",
		Now:       fixedTime(6), // 06:00 UTC = 03:00 BRT → improbable hours
	})

	require.NoError(t, err)
	assert.Equal(t, ActionBlock, result.Action)
	assert.Equal(t, 150, result.Score) // 50+20+30+25+15+10
	assert.Len(t, result.Signals, 6)
}

func TestEngine_PhoneDedupAlone_OK(t *testing.T) {
	// Phone dedup alone gives +30 which is in the ok range (0-30).
	// Needs combination with another signal to reach review.
	otherPartner := uuid.New()
	q := &mockQuerier{
		partnerInfoRows: newMockPartnerRows(nil, nil),
		velocityRows:    newMockCountRows(0),
		phoneDedupRows:  newMockPhoneDedupRows(otherPartner),
		clickVelRows:    newMockCountRows(0),
		ipUADupRows:     newMockCountRows(0),
	}

	engine := NewEngine(q, testLogger)
	result, err := engine.Check(context.Background(), LeadCreationInput{
		PartnerID: uuid.New(),
		TenantID:  uuid.New(),
		PhoneHash: "stolen_phone",
		Now:       fixedTime(14),
	})

	require.NoError(t, err)
	assert.Equal(t, ActionOK, result.Action) // 30 = ok (boundary)
	assert.Equal(t, 30, result.Score)
	assert.Len(t, result.Signals, 1)
	assert.Equal(t, "phone_dedup", result.Signals[0].Name)
}

func TestEngine_PhoneDedupPlusImprobableHours_Review(t *testing.T) {
	// phone_dedup(+30) + improbable_hours(+10) = 40 → review
	otherPartner := uuid.New()
	q := &mockQuerier{
		partnerInfoRows: newMockPartnerRows(nil, nil),
		velocityRows:    newMockCountRows(0),
		phoneDedupRows:  newMockPhoneDedupRows(otherPartner),
		clickVelRows:    newMockCountRows(0),
		ipUADupRows:     newMockCountRows(0),
	}

	engine := NewEngine(q, testLogger)
	result, err := engine.Check(context.Background(), LeadCreationInput{
		PartnerID: uuid.New(),
		TenantID:  uuid.New(),
		PhoneHash: "stolen_phone",
		Now:       fixedTime(6), // 06:00 UTC = 03:00 BRT → improbable hours
	})

	require.NoError(t, err)
	assert.Equal(t, ActionReview, result.Action) // 30+10 = 40 → review
	assert.Equal(t, 40, result.Score)
	assert.Len(t, result.Signals, 2)
}

func TestEngine_DBError_FailOpen(t *testing.T) {
	// When the self-referral query fails, the engine should not return an error.
	// It should continue with other signals and produce a result.
	q := &mockQuerier{
		partnerInfoRows: &mockRows{err: assert.AnError},
		velocityRows:    newMockCountRows(0),
		phoneDedupRows:  newMockEmptyRows(),
		clickVelRows:    newMockCountRows(0),
		ipUADupRows:     newMockCountRows(0),
	}

	engine := NewEngine(q, testLogger)
	result, err := engine.Check(context.Background(), LeadCreationInput{
		PartnerID: uuid.New(),
		TenantID:  uuid.New(),
		PhoneHash: "hash123",
		Now:       fixedTime(14),
	})

	require.NoError(t, err) // engine itself should not error
	assert.NotNil(t, result)
	assert.Equal(t, ActionOK, result.Action) // no signals fired
}

func TestAttributionScoreFor(t *testing.T) {
	assert.Equal(t, 1.0, AttributionScoreFor(ActionOK))
	assert.Equal(t, 0.3, AttributionScoreFor(ActionReview))
	assert.Equal(t, 0.0, AttributionScoreFor(ActionBlock))
}

func TestLogAudit(t *testing.T) {
	q := &mockQuerier{}
	result := &Result{
		Score:   50,
		Action:  ActionReview,
		Signals: []Signal{{Name: "velocity", Points: 20}},
		Evidence: map[string]any{
			"score": 50,
		},
	}

	// Should not panic
	LogAudit(context.Background(), q, testLogger, uuid.New(), uuid.New(), result, net.ParseIP("1.2.3.4"), "test-agent")
}

// Ensure pgtype is used (import check).
var _ = pgtype.Text{}
