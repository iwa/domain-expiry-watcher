package state

import (
	"testing"
	"time"
)

func TestDomainGetDaysUntilExpiry(t *testing.T) {
	tests := []struct {
		description string
		domain      Domain
		expected    int
	}{
		{
			"should return correct value",
			Domain{
				Name:       "example.org",
				Exists:     true,
				ExpiryDate: time.Now().Add(30 * 24 * time.Hour), // 30 days after now
			},
			30,
		},
		{
			"should return zero on expiry day",
			Domain{
				Name:       "example.org",
				Exists:     true,
				ExpiryDate: time.Now(),
			},
			0,
		},
		{
			"should return -1 for expired domain",
			Domain{
				Name:       "example.org",
				Exists:     true,
				ExpiryDate: time.Now().Add(-1 * 30 * 24 * time.Hour), // 30 days before now
			},
			-1,
		},
	}

	for _, tt := range tests {

		t.Run(tt.description, func(t *testing.T) {
			result := tt.domain.GetDaysUntilExpiry()

			if result != tt.expected {
				t.Error("wrong result, got", result, "instead of", tt.expected)
			}
		})
	}
}
