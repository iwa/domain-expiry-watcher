package api

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/iwa/Expira/internal/state"
)

// Server wraps the HTTP server with graceful lifecycle management
type Server struct {
	server *http.Server
	errors chan error
}

func NewServer(addr string, store *state.DomainStore) *Server {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", HealthHandler)
	mux.HandleFunc("/status", StatusHandlerFactory(store))
	mux.HandleFunc("/api/domains", DomainsAPIHandlerFactory(store))
	// mux.HandleFunc("/", DomainsPageHandlerFactory(store))

	return &Server{
		server: &http.Server{
			Addr:    addr,
			Handler: mux,
		},
		errors: make(chan error, 1),
	}
}

// Start begins listening for HTTP requests in a goroutine
func (s *Server) Start() {
	go func() {
		fmt.Printf("[INFO] HTTP server starting on %s\n", s.server.Addr)
		if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			s.errors <- fmt.Errorf("[ERROR] HTTP server error: %w", err)
		}
	}()
}

// Errors returns a channel that receives server errors
func (s *Server) Errors() <-chan error {
	return s.errors
}

// Shutdown gracefully stops the server with a timeout
func (s *Server) Shutdown(timeout time.Duration) error {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	return s.server.Shutdown(ctx)
}
