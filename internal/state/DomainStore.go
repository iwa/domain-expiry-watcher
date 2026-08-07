package state

import (
	"maps"
	"sync"
	"time"
)

type DomainStore struct {
	mu            sync.RWMutex
	domains       map[string]Domain
	lastRefreshed time.Time
}

func NewDomainStore() *DomainStore {
	return &DomainStore{
		domains: make(map[string]Domain),
	}
}

// Returns the domain and true if found, or an empty domain and false if not found.
func (ds *DomainStore) GetDomain(name string) (Domain, bool) {
	ds.mu.RLock()
	defer ds.mu.RUnlock()

	domain, ok := ds.domains[name]
	return domain, ok
}

// This method is thread-safe and can be called from multiple goroutines.
func (ds *DomainStore) SetDomain(name string, domain Domain) {
	ds.mu.Lock()
	defer ds.mu.Unlock()

	ds.domains[name] = domain
}

// GetAllDomains returns a copy of all domains.
// This ensures the returned map cannot cause race conditions if modified by the caller.
func (ds *DomainStore) GetAllDomains() map[string]Domain {
	ds.mu.RLock()
	defer ds.mu.RUnlock()

	// Create a copy to avoid exposing internal map
	domainsCopy := make(map[string]Domain, len(ds.domains))
	maps.Copy(domainsCopy, ds.domains)

	return domainsCopy
}

// SetBulkDomains replaces all domains with the provided map.
func (ds *DomainStore) SetBulkDomains(domains map[string]Domain) {
	ds.mu.Lock()
	defer ds.mu.Unlock()

	domainsCopy := make(map[string]Domain, len(domains))
	maps.Copy(domainsCopy, domains)

	ds.domains = domainsCopy
}

// Count returns the number of domains in the store
func (ds *DomainStore) Count() int {
	ds.mu.RLock()
	defer ds.mu.RUnlock()

	return len(ds.domains)
}

// GetLastRefreshed returns the time the domains were last refreshed.
// Returns the zero time if no refresh has happened yet.
func (ds *DomainStore) GetLastRefreshed() time.Time {
	ds.mu.RLock()
	defer ds.mu.RUnlock()

	return ds.lastRefreshed
}

// MarkRefreshed records the current time as the last refresh time.
func (ds *DomainStore) MarkRefreshed() {
	ds.mu.Lock()
	defer ds.mu.Unlock()

	ds.lastRefreshed = time.Now()
}
