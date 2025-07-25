# Domain Expiry Watcher

Console application which checks domain name date expiry, with notification support.

- Set your list of watched domains
- Checks daily for the expiration date at midnight
- Automatically determine the right WHOIS server to query
- Sends notifications on selected days prior to expiry
- Supports Telegram & Discord notification

## Config

Everything in this app is configurable through env vars:

- `DOMAINS` **required**, comma-separated list of the domains to be watched
- `NOTIFICATION_DAYS`, comma-separated list of number of days before expiry notifications should be sent on
- `TELEGRAM_NOTIFICATION`, set to `true` if you want to enable Telegram notifiation
- `TELEGRAM_CHAT_ID`, Telegram chat id to send notifications to
- `TELEGRAM_TOKEN`, Telegram bot token
- `DISCORD_NOTIFICATION`, set to `true` if you want to enable Discord notifiation
- `DISCORD_WEBHOOK_URL`, Discord webhook to send notifications to

## Example

```dotenv
DOMAINS="google.com,example.org"
NOTIFICATION_DAYS="30,14,7,1"

TELEGRAM_NOTIFICATION="true"
TELEGRAM_CHAT_ID="..."
TELEGRAM_TOKEN="..."

DISCORD_NOTIFICATION="true"
DISCORD_WEBHOOK_URL="..."
```
