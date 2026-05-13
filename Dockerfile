# Multi-stage build for the Indica AÍ! Go binaries.
# Build with --build-arg BINARY=api (default) or BINARY=worker.

ARG GO_VERSION=1.24

FROM golang:${GO_VERSION}-alpine AS builder
RUN apk add --no-cache ca-certificates tzdata git
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .

ARG BINARY=api
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /out/app \
    ./cmd/${BINARY}

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /out/app /app
ENV TZ=America/Sao_Paulo
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/app"]
