# Expira

You're working on a Go project called Expira.
Expira aims to be a simple domain expiry monitor.
It is a console application, is configured entirely through env vars, supports notifications, and is runnable as a Docker container.

## Architecture

This is a Go project. It is architectured in this way:

- `cmd/expira/main.go` is the entrypoint of the application
- `internal/api` is the API layer of the application
- `internal/app` is the application layer of the application
- `internal/cron` is the cron layer of the application (using robfig/cron/v3 library)
- `internal/state` is the state layer of the application
- `internal/utils` is the utils layer of the application
- `internal/utils/providers` is the folder containing the logic for each notification provider supported
- `web` is a Astro (Astro 7 + Tailwind CSS v4) frontend consuming the Go API. It consumes `GET /api/domains` server-side. The frontend is embedded in the Go binary using `go:embed`.

## Good practices

This project aims to follow Go's good practices.
Try to stick with a clean DI approach to keep everything easily testable.
