package cron

import (
	"time"

	"github.com/iwa/domain-expiry-watcher/internal/state"
	"github.com/iwa/domain-expiry-watcher/internal/utils"
)

func StartCronLoop() {
	println("[INFO] Starting cron job...")

	appState := state.GetInstance()
	ticker := time.NewTicker(time.Hour)
	done := make(chan bool)

	go func() {
		for {
			select {
			case <-done:
				return
			case t := <-ticker.C:
				if checkMidnight(t) {
					println("[INFO] Daily domains refresh cron job triggered at", t.Format("2006-01-02 15:04:05"))

					utils.UpdateDomains(appState)

					utils.Notify(appState)

					utils.ReportStatusInConsole(appState)
				}
			}
		}
	}()
}

// Check if the current hour is 0 (midnight)
func checkMidnight(t time.Time) bool {
	return t.Hour() == 0
}
