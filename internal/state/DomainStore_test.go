package state

import (
	"sync"
	"testing"
	"time"
)

func TestNewDomainStore(t *testing.T) {
	store := NewDomainStore()

	if store == nil {
		t.Fatal("NewDomainStore returned nil")
	}

	if store.Count() != 0 {
		t.Errorf("Expected empty store, got %d domains", store.Count())
	}
}

func TestSetAndGetDomain(t *testing.T) {
	store := NewDomainStore()
	domain := Domain{
		Name:       "example.com",
		Status:     StatusActive,
		ExpiryDate: time.Date(2025, 12, 31, 0, 0, 0, 0, time.UTC),
	}

	store.SetDomain(domain.Name, domain)

	retrievedDomain, found := store.GetDomain("example.com")

	if !found {
		t.Fatal("Domain not found in store")
	}

	if retrievedDomain != domain {
		t.Errorf("Retrieved domain does not match set domain. Got %+v, expected %+v", retrievedDomain, domain)
	}
}

func TestGetDomainNotFound(t *testing.T) {
	store := NewDomainStore()
	_, ok := store.GetDomain("nonexistent.com")
	if ok {
		t.Error("expected domain not to be found")
	}
}

func TestConcurrentAccess(t *testing.T) {
	store := NewDomainStore()
	var wg sync.WaitGroup

	// Test concurrent writes
	for i := range 100 {
		wg.Go(func() {
			store.SetDomain("domain"+string(rune(i)), Domain{Name: "test"})
		})
	}
	wg.Wait()
}
