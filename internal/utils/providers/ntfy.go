package providers

import (
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/iwa/domain-expiry-watcher/internal/state"
)

func SendNtfyMessage(appState *state.AppState, message string) error {
	req, _ := http.NewRequest("POST", appState.NtfyURL,
		strings.NewReader(message))

	req.Header.Set("Title", "Domain expiry alert")
	req.Header.Set("Priority", "urgent")
	req.Header.Set("Tags", "warning")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	fmt.Println("[INFO] Response from Ntfy API:", string(responseBody))

	return nil
}
