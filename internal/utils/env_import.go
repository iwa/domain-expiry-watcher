package utils

import (
	"fmt"
	"os"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/iwa/domain-expiry-watcher/internal/state"
)

func ImportEnv(appState *state.AppState) {
	importDomains(appState)
	importNotificationDaysConfig(appState)
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

func importNotificationDaysConfig(appState *state.AppState) {
	daysEnv := os.Getenv("NOTIFICATION_DAYS")

	if daysEnv == "" {
		appState.NotificationDays = []int{30, 15, 7, 1} // Default values
		println("[INFO] No NOTIFICATION_DAYS environment variable found, using default values...")
		fmt.Println("[INFO] Notification will be sent this many days before expiry:", appState.NotificationDays)
	} else {
		daysStr := strings.Split(daysEnv, ",")

		if len(daysStr) == 0 {
			panic("[ERROR] No valid days found in NOTIFICATION_DAYS environment variable.")
		}

		appState.NotificationDays = make([]int, 0, len(daysStr))
		for _, day := range daysStr {
			value, err := strconv.Atoi(strings.TrimSpace(day))

			if err != nil {
				panic("[ERROR] Invalid value in NOTIFICATION_DAYS environment variable: " + day)
			}

			if value <= 0 {
				panic("[ERROR] Notification days must be greater than 0: " + day)
			}

			// Check for duplicates in the slice
			alreadyExists := false
			for j := range len(appState.NotificationDays) {
				if appState.NotificationDays[j] == value {
					alreadyExists = true
					break
				}
			}

			if !alreadyExists {
				appState.NotificationDays = append(appState.NotificationDays, value)
			}
		}

		slices.Sort(appState.NotificationDays)

		fmt.Println("[INFO] Notification will be sent this many days before expiry:", appState.NotificationDays)
	}
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
