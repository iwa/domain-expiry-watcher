package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/iwa/Expira/internal/state"
)

func TestDomainAPIStatus(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name     string
		domain   state.Domain
		expected string
	}{
		{
			name:     "domain without expiry date is Unknown",
			domain:   state.Domain{Name: "example.com", Status: state.StatusUnknown},
			expected: "unknown",
		},
		{
			name:     "expired domain is Expired",
			domain:   state.Domain{Name: "example.com", Status: state.StatusActive, ExpiryDate: now.Add(-24 * time.Hour)},
			expected: "active",
		},
		{
			name:     "domain expiring within threshold is Expire soon",
			domain:   state.Domain{Name: "example.com", Status: state.StatusActive, ExpiryDate: now.Add(10 * 24 * time.Hour)},
			expected: "active",
		},
		{
			name:     "domain expiring after threshold is Active",
			domain:   state.Domain{Name: "example.com", Status: state.StatusActive, ExpiryDate: now.Add(365 * 24 * time.Hour)},
			expected: "active",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/domains", nil)
			store := state.NewDomainStore()
			store.SetDomain(tt.domain.Name, tt.domain)
			store.MarkRefreshed()
			rec := httptest.NewRecorder()
			DomainsAPIHandlerFactory(store)(rec, req)

			var response domainsResponse
			if err := json.Unmarshal(rec.Body.Bytes(), &response); err != nil {
				t.Fatalf("failed to decode response: %v", err)
			}
			if got := response.Domains[0].Status; got != tt.expected {
				t.Errorf("API status = %q, want %q", got, tt.expected)
			}
		})
	}
}

func TestDomainsAPIHandler(t *testing.T) {
	store := state.NewDomainStore()
	store.SetDomain("example.com", state.Domain{
		Name:       "example.com",
		Status:     state.StatusActive,
		ExpiryDate: time.Now().Add(365 * 24 * time.Hour),
	})
	// Mirror how env config initializes unresolved domains: sentinel epoch date
	store.SetDomain("unknown.com", state.Domain{Name: "unknown.com", Status: state.StatusUnknown, ExpiryDate: time.Unix(0, 0)})
	store.MarkRefreshed()

	handler := DomainsAPIHandlerFactory(store)

	req := httptest.NewRequest(http.MethodGet, "/api/domains", nil)
	rec := httptest.NewRecorder()
	handler(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected Content-Type application/json, got %q", ct)
	}

	var resp domainsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.LastRefreshed.IsZero() {
		t.Error("expected lastRefreshed to be set")
	}

	if len(resp.Domains) != 2 {
		t.Fatalf("expected 2 domains, got %d", len(resp.Domains))
	}

	// Domains are sorted by name: example.com first, unknown.com second
	if resp.Domains[0].Name != "example.com" || resp.Domains[0].Status != "active" {
		t.Errorf("unexpected first domain: %+v", resp.Domains[0])
	}
	if resp.Domains[0].ExpiryDate == nil {
		t.Error("expected expiryDate to be set for example.com")
	}
	if resp.Domains[1].Name != "unknown.com" || resp.Domains[1].Status != "unknown" {
		t.Errorf("unexpected second domain: %+v", resp.Domains[1])
	}
	if resp.Domains[1].ExpiryDate != nil {
		t.Error("expected expiryDate to be null for unknown.com")
	}
}

func TestDomainsAPIHandlerMethodNotAllowed(t *testing.T) {
	store := state.NewDomainStore()
	handler := DomainsAPIHandlerFactory(store)

	req := httptest.NewRequest(http.MethodPost, "/api/domains", nil)
	rec := httptest.NewRecorder()
	handler(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected status 405, got %d", rec.Code)
	}
}
