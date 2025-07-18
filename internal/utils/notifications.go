package utils

import (
	"fmt"
	"time"

	"github.com/iwa/domain-expiry-watcher/internal/state"
	"github.com/iwa/domain-expiry-watcher/internal/utils/providers"
)

type DaysUntil int

const (
	ThirtyDays   DaysUntil = 30
	FourteenDays DaysUntil = 14
	SevenDays    DaysUntil = 7
)

func Notify(appState *state.AppState) {
	println("[INFO] Sending notifications...")

	for domain, domainData := range appState.Domains {
		daysUntil, shouldNotify := checkDaysForNotification(domainData.ExpiryDate)

		if shouldNotify {
			if appState.TelegramNotification && (appState.TelegramChatID != "" && appState.TelegramToken != "") {
				message := fmt.Sprintf("<b>⚠️ Domain %s will expire in %d days </b>\nExpiry date: <code>%s</code>", domain, daysUntil, domainData.ExpiryDate.Format("2006-01-02 15:04:05"))

				err := providers.SendTelegramMessage(appState, message)
				if err != nil {
					println("[ERROR] Failed to send notification for domain", domain, ":", err)
				}
			}
		}
	}
}

func checkDaysForNotification(expriyDate time.Time) (DaysUntil, bool) {
	currentTime := time.Now()
	daysLeft := int(expriyDate.Sub(currentTime).Hours()/24) + 1 // Add 1 to include the current day

	switch daysLeft {
	case 30:
		println("[INFO] Domain expiry is exactly 30 days:", expriyDate.Format("2006-01-02 15:04:05"))
		return DaysUntil(ThirtyDays), true
	case 14:
		println("[INFO] Domain expiry is exactly 14 days:", expriyDate.Format("2006-01-02 15:04:05"))
		return DaysUntil(FourteenDays), true
	case 7:
		println("[INFO] Domain expiry is exactly 7 days:", expriyDate.Format("2006-01-02 15:04:05"))
		return DaysUntil(SevenDays), true
	default:
		return DaysUntil(0), false
	}
}
