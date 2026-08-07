package utils

import (
	"fmt"
	"os"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
	"github.com/charmbracelet/lipgloss/table"
	"github.com/iwa/Expira/internal/state"
)

// LoadConfig loads configuration from environment variables.
// Returns a Config instance and a DomainStore initialized with domains from env.
func LoadConfig() (*state.Config, *state.DomainStore) {
	config := state.NewConfig()
	store := state.NewDomainStore()

	t := table.New().
		Border(lipgloss.RoundedBorder()).
		BorderStyle(lipgloss.NewStyle().Foreground(lipgloss.Color("#7D56F4"))).
		StyleFunc(func(row, col int) lipgloss.Style {
			switch {
			case row == table.HeaderRow:
				return lipgloss.NewStyle().Bold(true).Align(lipgloss.Center)
			default:
				return lipgloss.NewStyle()
			}
		}).
		Headers(" Configuration from environment variables ")

	t.Row(importDomains(store))
	t.Row(importNotificationDaysConfig(config))
	importTelegramConfig(config)
	importDiscordConfig(config)
	importNtfyConfig(config)

	fmt.Println(t)

	return config, store
}

func importDomains(store *state.DomainStore) string {
	log := ""

	domainsEnv := os.Getenv("DOMAINS")
	if domainsEnv == "" {
		panic("[ERROR] No domains provided. Please set the DOMAINS environment variable as comma-separated values.")
	}

	domains := strings.Split(domainsEnv, ",")
	for i := range domains {
		domains[i] = strings.TrimSpace(domains[i])
	}

	domainMap := make(map[string]state.Domain, len(domains))
	for _, domain := range domains {
		if domain == "" {
			log = fmt.Sprintln(log, "[WARN] Empty domain found in the DOMAINS environment variable, skipping.")
			continue
		}

		domainMap[domain] = state.Domain{
			Name:       domain,
			Status:     state.StatusUnknown,
			ExpiryDate: time.Unix(0, 0), // Default expiry date
		}
	}

	if len(domainMap) == 0 {
		panic("[ERROR] No valid domains found in the DOMAINS environment variable.")
	}

	store.SetBulkDomains(domainMap)

	log = fmt.Sprintln(log, "Imported domains:", len(domainMap))

	return log
}

func importNotificationDaysConfig(config *state.Config) string {
	log := ""

	daysEnv := os.Getenv("NOTIFICATION_DAYS")

	if daysEnv == "" {
		config.NotificationDays = []int{30, 15, 7, 1} // Default values
		log = fmt.Sprintln(log, "No NOTIFICATION_DAYS environment variable found, using default values...")
		log = fmt.Sprintln(log, fmt.Sprint("Notification will be sent this many days before expiry: ", config.NotificationDays))
	} else {
		daysStr := strings.Split(daysEnv, ",")

		if len(daysStr) == 0 {
			panic("[ERROR] No valid days found in NOTIFICATION_DAYS environment variable.")
		}

		config.NotificationDays = make([]int, 0, len(daysStr))
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
			for j := range len(config.NotificationDays) {
				if config.NotificationDays[j] == value {
					alreadyExists = true
					break
				}
			}

			if !alreadyExists {
				config.NotificationDays = append(config.NotificationDays, value)
			}
		}

		slices.Sort(config.NotificationDays)

		log = fmt.Sprintln(log, fmt.Sprint("Notification will be sent this many days before expiry:", config.NotificationDays))
	}

	return log
}

func importTelegramConfig(config *state.Config) {
	config.TelegramNotification = os.Getenv("TELEGRAM_NOTIFICATION") == "true"
	config.TelegramChatID = os.Getenv("TELEGRAM_CHAT_ID")
	config.TelegramToken = os.Getenv("TELEGRAM_TOKEN")

	if config.TelegramNotification && (config.TelegramChatID == "" || config.TelegramToken == "") {
		panic("[ERROR] Telegram notification is enabled but chat ID or token is not set.")
	}

	if config.TelegramNotification && config.TelegramChatID != "" && config.TelegramToken != "" {
		println("[INFO] │ Telegram notification enabled to channel", config.TelegramChatID)
	}
}

func importDiscordConfig(config *state.Config) {
	config.DiscordNotification = os.Getenv("DISCORD_NOTIFICATION") == "true"
	config.DiscordWebhookURL = os.Getenv("DISCORD_WEBHOOK_URL")

	if config.DiscordNotification && config.DiscordWebhookURL == "" {
		panic("[ERROR] Discord notification is enabled but webhook URL is not set.")
	}

	if config.DiscordNotification && config.DiscordWebhookURL != "" {
		println("[INFO] │ Discord notification enabled to webhook", config.DiscordWebhookURL)
	}
}

func importNtfyConfig(config *state.Config) {
	config.NtfyNotification = os.Getenv("NTFY_NOTIFICATION") == "true"
	config.NtfyURL = os.Getenv("NTFY_URL")

	if config.NtfyNotification && config.NtfyURL == "" {
		panic("[ERROR] Ntfy notification is enabled but webhook URL is not set.")
	}

	if config.NtfyNotification && config.NtfyURL != "" {
		println("[INFO] Ntfy notification enabled to webhook", config.NtfyURL)
	}
}
