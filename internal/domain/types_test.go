package domain_test

import (
	"testing"

	"github.com/indica-ai/indica-ai/internal/domain"
	"github.com/stretchr/testify/assert"
)

func TestLeadStatusTransitions(t *testing.T) {
	tests := []struct {
		from     domain.LeadStatus
		to       domain.LeadStatus
		expected bool
	}{
		{domain.LeadStatusNew, domain.LeadStatusInProgress, true},
		{domain.LeadStatusNew, domain.LeadStatusLost, true},
		{domain.LeadStatusNew, domain.LeadStatusClosed, false},
		{domain.LeadStatusInProgress, domain.LeadStatusQualified, true},
		{domain.LeadStatusInProgress, domain.LeadStatusClosed, true},
		{domain.LeadStatusInProgress, domain.LeadStatusLost, true},
		{domain.LeadStatusQualified, domain.LeadStatusClosed, true},
		{domain.LeadStatusQualified, domain.LeadStatusLost, true},
		{domain.LeadStatusClosed, domain.LeadStatusNew, false},
		{domain.LeadStatusLost, domain.LeadStatusNew, false},
	}

	for _, tt := range tests {
		result := domain.CanTransition(tt.from, tt.to)
		assert.Equal(t, tt.expected, result,
			"CanTransition(%s, %s) should be %v", tt.from, tt.to, tt.expected)
	}
}
