package config

import (
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoad(t *testing.T) {
	os.Setenv("DATABASE_URL", "postgres://test:test@localhost/test")
	os.Setenv("REDIS_URL", "redis://localhost:6379/0")
	os.Setenv("JWT_SECRET", "test-secret-key-at-least-32-chars-long!!")
	defer os.Unsetenv("DATABASE_URL")
	defer os.Unsetenv("REDIS_URL")
	defer os.Unsetenv("JWT_SECRET")

	cfg, err := Load()
	require.NoError(t, err)
	assert.Equal(t, "postgres://test:test@localhost/test", cfg.DatabaseURL)
	assert.Equal(t, "redis://localhost:6379/0", cfg.RedisURL)
	assert.Equal(t, 15*time.Minute, cfg.JWTAccessTTL)
	assert.Equal(t, ":8080", cfg.HTTPAddr)
}
