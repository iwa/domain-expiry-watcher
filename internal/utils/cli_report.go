package utils

import (
	"time"

	"github.com/iwa/domain-expiry-watcher/internal/state"
)

func ReportStatusOnCLI(appState *state.AppState) {
	println("[INFO] Generating domains report...")

	println("\n --- Current Domains Status ---")

	currentTime := time.Now()

	for domain, domainData := range appState.Domains {
		daysLeft := int(domainData.ExpiryDate.Sub(currentTime).Hours()/24) + 1
		println("Domain:", domain, "- In", daysLeft, "Days - Expiry date:", domainData.ExpiryDate.Format("2006-01-02 15:04:05"))
	}

	println(" ------------------------------\n")
}
