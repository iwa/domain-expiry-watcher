package main

import (
	state "github.com/iwa/domain-expiry-watcher/internal/struct"
	"github.com/iwa/domain-expiry-watcher/internal/utils"
)

func main() {
	println(" --- Domain Expiry Watcher ---")

	appState := state.GetInstance()

	utils.ImportEnv(appState)

	println("[INFO] Starting domain expiry watcher...")

	utils.UpdateDomains(appState)
}
