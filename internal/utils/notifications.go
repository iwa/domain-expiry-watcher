package utils

import (
	"fmt"
	"time"

	"github.com/iwa/domain-expiry-watcher/internal/state"
	"github.com/iwa/domain-expiry-watcher/internal/utils/providers"
)

func Notify(appState *state.AppState) {
	println("[INFO] Sending notifications...")

	for domain, domainData := range appState.Domains {
		daysUntil, shouldNotify := checkDaysForNotification(domainData.ExpiryDate, appState.NotificationDays)

		if shouldNotify {
			if appState.TelegramNotification && (appState.TelegramChatID != "" && appState.TelegramToken != "") {
				message := fmt.Sprintf("<b>⚠️ Domain %s will expire in %d days </b>\nExpiry date: <code>%s</code>", domain, daysUntil, domainData.ExpiryDate.Format("2006-01-02 15:04:05"))

				err := providers.SendTelegramMessage(appState, message)
				if err != nil {
					println("[ERROR] Failed to send notification for domain", domain, ":", err)
				}
			}

			if appState.NtfyNotification && appState.NtfyURL != "" {
				message := fmt.Sprintf("Domain %s will expire in %d days \nExpiry date: %s", domain, daysUntil, domainData.ExpiryDate.Format("2006-01-02 15:04:05"))

				err := providers.SendNtfyMessage(appState, message)
				if err != nil {
					println("[ERROR] Failed to send notification for domain", domain, ":", err)
				}
			}
		}
	}
}

func checkDaysForNotification(expriyDate time.Time, notificationDays []int) (int, bool) {
	currentTime := time.Now()
	daysLeft := int(expriyDate.Sub(currentTime).Hours()/24) + 1 // Add 1 to include the current day

	if daysLeft < 0 {
		println("[WARN] Domain", expriyDate.Format("2006-01-02 15:04:05"), "has already expired.")
		return 0, false
	}

	for _, days := range notificationDays {
		if daysLeft == days {
			println("[INFO] Domain expiry is exactly", days, "days away:", expriyDate.Format("2006-01-02 15:04:05"))
			return days, true
		}
	}

	return 0, false
}
