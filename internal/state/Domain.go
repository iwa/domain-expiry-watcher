package state

import (
	"math"
	"time"
)

// Default status is unknown
type DomainStatus string

const (
	StatusActive  DomainStatus = "active"
	StatusExpired DomainStatus = "expired"
	StatusUnknown DomainStatus = "unknown"
)

type Domain struct {
	Name       string
	Status     DomainStatus
	ExpiryDate time.Time
}

// Calculate how many days between now and Domain expiry
// Diff is calculated using time.Now()
//
// If the domain is already expired, returns -1
func (d *Domain) GetDaysUntilExpiry() int {
	currentTime := time.Now()
	daysLeft := int(math.Round(d.ExpiryDate.Sub(currentTime).Hours() / 24))

	if daysLeft < 0 {
		return -1
	}

	return daysLeft
}
