all: build

build: go.mod
	go build -o bin/expira cmd/expira/main.go

run:
	go run cmd/expira/main.go

clean:
	rm -r bin

test:
	go test ./...

.PHONY: all build run clean test
