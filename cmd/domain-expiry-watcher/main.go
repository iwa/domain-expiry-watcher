package main

import (
	"github.com/iwa/domain-expiry-watcher/internal/cron"
	"github.com/iwa/domain-expiry-watcher/internal/state"
	"github.com/iwa/domain-expiry-watcher/internal/utils"
)

func main() {
	println(" --- Domain Expiry Watcher ---")

	appState := state.GetInstance()

	utils.ImportEnv(appState)

	println("[INFO] Starting domain expiry watcher...")

	utils.UpdateDomains(appState)

	utils.Notify(appState)

	cron.StartCronLoop()

	select {} // Keep the main goroutine running
}
