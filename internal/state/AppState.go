package state

type AppState struct {
	Domains          map[string]Domain
	NotificationDays []int

	TelegramNotification bool
	TelegramChatID       string
	TelegramToken        string

	DiscordNotification bool
	DiscordWebhookURL   string
}

var instance AppState

// Initialize the singleton instance when the package is loaded
func init() {
	instance = AppState{}
}

func GetInstance() *AppState {
	return &instance
}
