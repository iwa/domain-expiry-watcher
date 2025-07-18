package providers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/iwa/domain-expiry-watcher/internal/state"
)

type TelegramMessage struct {
	ChatID              string `json:"chat_id"`
	Text                string `json:"text"`
	ParseMode           string `json:"parse_mode"`
	DisableNotification bool   `json:"disable_notification"`
	ProtectContent      bool   `json:"protect_content"`
}

func SendTelegramMessage(appState *state.AppState, message string) error {
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
