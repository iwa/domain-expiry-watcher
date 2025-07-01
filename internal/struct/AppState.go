package internal

type AppState struct {
	Domains              []Domain
	TelegramNotification bool
	TelegramChatID       string
	TelegramToken        string
}
