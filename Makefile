WEB_DIR := web

all: build

web-build:
	npm --prefix $(WEB_DIR) ci
	npm --prefix $(WEB_DIR) run build

build: web-build
	go build -o bin/expira cmd/expira/main.go

run: web-build
	go run cmd/expira/main.go

clean:
	rm -rf bin $(WEB_DIR)/dist

test: web-build
	go test ./...

.PHONY: all build web-build run clean test
