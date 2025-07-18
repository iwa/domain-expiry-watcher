package providers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/iwa/domain-expiry-watcher/internal/state"
)

type DiscordMessage struct {
	Content string `json:"content"`
}

func SendDiscordMessage(appState *state.AppState, message string) error {
	payload := DiscordMessage{
		Content: message,
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := http.Post(appState.DiscordWebhookURL, "application/json", bytes.NewBuffer(data))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	fmt.Println("[INFO] Response from Discord API:", string(responseBody))

	return nil
}
