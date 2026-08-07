package utils

import (
	"time"

	"github.com/iwa/Expira/internal/state"
)

// ReportStatusInConsole displays the current status of all domains in the console.
// It uses the provided store to read domain data.
func ReportStatusInConsole(store *state.DomainStore) {
	println("[INFO] Generating domains report...")

	println("\n --- Current Domains Status ---")

	currentTime := time.Now()

	domains := store.GetAllDomains()
	for domain, domainData := range domains {
		if domainData.Status == state.StatusUnknown {
			println("Domain:", domain, "- Unknown, no expiry date available, domain might not exist")
			continue
		}

		daysLeft := int(domainData.ExpiryDate.Sub(currentTime).Hours()/24) + 1
		if daysLeft < 0 {
			println("Domain:", domain, "- Expired", -daysLeft, "Days Ago - Expiry date:", domainData.ExpiryDate.Format("2006-01-02 15:04:05"))
			continue
		}

		println("Domain:", domain, "- In", daysLeft, "Days - Expiry date:", domainData.ExpiryDate.Format("2006-01-02 15:04:05"))
	}

	println(" ------------------------------\n")
}
