package utils

import (
	"os"
	"strings"
	"time"

	"github.com/iwa/domain-expiry-watcher/internal/state"
)

func ImportEnv(appState *state.AppState) {
	importDomains(appState)
	importTelegramConfig(appState)
	importDiscordConfig(appState)
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

	if len(appState.Domains) == 0 {
		panic("[ERROR] No valid domains found in the DOMAINS environment variable.")
	}

	println("[INFO] Imported domains:", len(appState.Domains))
}

func importTelegramConfig(appState *state.AppState) {
	appState.TelegramNotification = os.Getenv("TELEGRAM_NOTIFICATION") == "true"
	appState.TelegramChatID = os.Getenv("TELEGRAM_CHAT_ID")
	appState.TelegramToken = os.Getenv("TELEGRAM_TOKEN")

	if appState.TelegramNotification && (appState.TelegramChatID == "" || appState.TelegramToken == "") {
		panic("[ERROR] Telegram notification is enabled but chat ID or token is not set.")
	}
}

func importDiscordConfig(appState *state.AppState) {
	appState.DiscordNotification = os.Getenv("DISCORD_NOTIFICATION") == "true"
	appState.DiscordWebhookURL = os.Getenv("DISCORD_WEBHOOK_URL")

	if appState.DiscordNotification && appState.DiscordWebhookURL == "" {
		panic("[ERROR] Discord notification is enabled but webhook URL is not set.")
	}
}
