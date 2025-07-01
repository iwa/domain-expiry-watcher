package state

import "time"

type Domain struct {
	Name       string
	ExpiryDate time.Time
}
