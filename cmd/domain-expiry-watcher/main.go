package main

import (
	"github.com/iwa/domain-expiry-watcher/internal/cron"
	"github.com/iwa/domain-expiry-watcher/internal/state"
	"github.com/iwa/domain-expiry-watcher/internal/utils"
)

func main() {
	println(" --- Domain Expiry Watcher ---")

	appState := state.AppState{}

	utils.ImportEnv(&appState)

	println("[INFO] Starting domain expiry watcher...")

	utils.UpdateDomains(&appState)

	utils.ReportStatusInConsole(&appState)

	utils.Notify(&appState)

	cron.StartCronLoop(&appState)

	select {} // Keep the main goroutine running
}
