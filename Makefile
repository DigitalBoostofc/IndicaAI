.PHONY: dev build test lint migrate-up migrate-down sqlc-gen seed

# Dev: start docker-compose and run API
dev:
	docker compose up -d
	sleep 2
	go run cmd/api/main.go

# Build all binaries
build:
	go build -o bin/api cmd/api/main.go
	go build -o bin/worker cmd/worker/main.go
	go build -o bin/migrate cmd/migrate/main.go
	go build -o bin/seed cmd/seed/main.go

# Run all tests
test:
	go test ./... -v -count=1

# Run linter
lint:
	golangci-lint run ./...

# Run migrations up
migrate-up:
	go run cmd/migrate/main.go up

# Run migrations down
migrate-down:
	go run cmd/migrate/main.go down

# Generate sqlc code
sqlc-gen:
	sqlc generate

# Seed dev database
seed:
	go run cmd/seed/main.go

# Run unit tests only
test-unit:
	go test ./internal/... -v -count=1 -short

# Run integration tests (requires Docker)
test-integration:
	go test ./... -v -count=1 -tags=integration

# Vet code
vet:
	go vet ./...
