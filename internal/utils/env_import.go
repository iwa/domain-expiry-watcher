package utils

import (
	"os"
	"strings"
	"time"

	state "github.com/iwa/domain-expiry-watcher/internal/struct"
)

func ImportEnv(appState *state.AppState) {
	importDomains(appState)
}

func importDomains(appState *state.AppState) {
	domainsEnv := os.Getenv("DOMAINS")
	if domainsEnv == "" {
		panic("[ERROR] No domains provided. Please set the DOMAINS environment variable as comma-separated values.")
	}

	domains := strings.Split(domainsEnv, ",")
	for i := range domains {
		domains[i] = strings.TrimSpace(domains[i])
	}

	appState.Domains = make(map[string]state.Domain, len(domains))
	for _, domain := range domains {
		if domain == "" {
			println("[WARN] Empty domain found in the DOMAINS environment variable, skipping.")
			continue
		}

		appState.Domains[domain] = state.Domain{
			Name:       domain,
			ExpiryDate: time.Unix(0, 0), // Default expiry date
		}
	}
}
