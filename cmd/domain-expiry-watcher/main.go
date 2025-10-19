package main

import (
	"fmt"
	"net/http"

	"github.com/charmbracelet/lipgloss"
	"github.com/iwa/domain-expiry-watcher/internal/api"
	"github.com/iwa/domain-expiry-watcher/internal/cron"
	"github.com/iwa/domain-expiry-watcher/internal/state"
	"github.com/iwa/domain-expiry-watcher/internal/utils"
)

var titleStyle = lipgloss.NewStyle().
	Bold(true).
	Foreground(lipgloss.Color("#FAFAFA")).
	PaddingTop(1).
	PaddingBottom(1).
	PaddingLeft(4).
	PaddingRight(4).
	MarginLeft(7).
	BorderStyle(lipgloss.RoundedBorder()).
	BorderForeground(lipgloss.Color("#7D56F4"))

func main() {
	fmt.Println(titleStyle.Render("Domain Expiry Watcher"))

	appState := state.GetInstance()

	utils.ImportEnv(appState)

	println("[INFO] Starting domain expiry watcher...")

	utils.UpdateDomains(appState)

	utils.ReportStatusInConsole(appState)

	utils.Notify(appState)

	http.HandleFunc("/health", api.HealthHandler)
	http.HandleFunc("/status", api.StatusHandler)
	go http.ListenAndServe("0.0.0.0:8080", nil)

	cron.StartCronLoop(appState)

	select {} // Keep the main goroutine running
}
