package api

import (
	"encoding/json"
	"net/http"
	"sort"
	"time"

	"github.com/iwa/Expira/internal/state"
)

type domainJSON struct {
	Name          string     `json:"name"`
	Status        string     `json:"status"`
	ExpiryDate    *time.Time `json:"expiryDate"`
	RemainingDays int        `json:"remainingDays"`
}

type domainsResponse struct {
	LastRefreshed time.Time    `json:"lastRefreshed"`
	Domains       []domainJSON `json:"domains"`
}

func DomainsAPIHandlerFactory(store *state.DomainStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		domains := store.GetAllDomains()

		list := make([]domainJSON, 0, len(domains))
		for _, domain := range domains {

			// if status is unknown, send null date
			var expiryDate *time.Time
			if domain.Status != state.StatusUnknown {
				expiryDate = &domain.ExpiryDate
			}

			list = append(list, domainJSON{
				Name:          domain.Name,
				Status:        string(domain.Status),
				ExpiryDate:    expiryDate,
				RemainingDays: domain.GetDaysUntilExpiry(),
			})
		}

		// sort by name for a predictable result
		sort.Slice(list, func(i, j int) bool {
			return list[i].Name < list[j].Name
		})

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(domainsResponse{
			LastRefreshed: store.GetLastRefreshed(),
			Domains:       list,
		}); err != nil {
			http.Error(w, "Error encoding response", http.StatusInternalServerError)
		}
	}
}
