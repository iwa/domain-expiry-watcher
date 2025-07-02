package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/iwa/domain-expiry-watcher/internal/state"
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

				err := sendTelegramMessage(appState, message)
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

	println("[DEBUG] daysLeft:", daysLeft, "Expiry Date:", expriyDate.Format("2006-01-02 15:04:05"))

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

type TelegramMessage struct {
	ChatID              string `json:"chat_id"`
	Text                string `json:"text"`
	ParseMode           string `json:"parse_mode"`
	DisableNotification bool   `json:"disable_notification"`
	ProtectContent      bool   `json:"protect_content"`
}

func sendTelegramMessage(appState *state.AppState, message string) error {
	payload := TelegramMessage{
		ChatID:              appState.TelegramChatID,
		Text:                message,
		ParseMode:           "HTML",
		DisableNotification: true,
		ProtectContent:      false,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := http.Post(fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", appState.TelegramToken), "application/json", bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	fmt.Println("[INFO] Response from Telegram API:", string(responseBody))

	return nil
}
