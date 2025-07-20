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
