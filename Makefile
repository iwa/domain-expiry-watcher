all: build

build: go.mod
	go build -o bin/domain-expiry-watcher cmd/domain-expiry-watcher/main.go

run:
	go run cmd/domain-expiry-watcher/main.go

clean:
	rm -r bin

.PHONY: all build run clean