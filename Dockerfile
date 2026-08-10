FROM node:26-alpine AS web-builder

WORKDIR /app/web

COPY web/package.json web/package-lock.json ./

RUN npm ci

COPY web/ ./

RUN npm run build

FROM golang:1.26.5-alpine3.24 AS builder

ARG TARGETOS
ARG TARGETARCH

WORKDIR /app

COPY . .

COPY --from=web-builder /app/web/dist ./web/dist

RUN CGO_ENABLED=0 GOOS=$TARGETOS GOARCH=$TARGETARCH go build -o main ./cmd/expira/main.go

FROM alpine:3.24

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY --from=builder /app/main .

CMD [ "/app/main" ]
