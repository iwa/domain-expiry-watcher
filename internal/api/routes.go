package api

import (
	"fmt"
	"net/http"

	"github.com/iwa/domain-expiry-watcher/internal/state"
)

func HealthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		return
	}

	fmt.Fprintf(w, "Service is running")
}

// GET /status
// Get a status report of all monitored domains and their expiry dates.
func StatusHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		return
	}

	var status string = "Domain Expiry Watcher Status:\n\n"

	appState := state.GetInstance()

	for _, domain := range appState.Domains {
		if domain.ExpiryDate.IsZero() {
			status += fmt.Sprintf("Domain %s: Expiry date not set\n", domain.Name)
		} else {
			status += fmt.Sprintf("Domain %s: Expires on %s\n", domain.Name, domain.ExpiryDate.Format("2006-01-02"))
		}
	}

	fmt.Fprintf(w, "%s", status)
}
