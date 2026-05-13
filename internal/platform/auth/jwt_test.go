package auth_test

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/indica-ai/indica-ai/internal/platform/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJWTService(t *testing.T) {
	svc := auth.NewJWTService("test-secret-key-at-least-32-chars-long!", 15*time.Minute, 30*24*time.Hour)

	userID := uuid.New()
	tenantID := uuid.New()

	t.Run("generate and validate access token", func(t *testing.T) {
		token, err := svc.GenerateAccessToken(userID, tenantID, "user")
		require.NoError(t, err)
		assert.NotEmpty(t, token)

		claims, err := svc.ValidateToken(token)
		require.NoError(t, err)
		assert.Equal(t, userID, claims.UserID)
		assert.Equal(t, tenantID, claims.TenantID)
		assert.Equal(t, "user", claims.Role)
		assert.Equal(t, auth.TokenAccess, claims.Type)
	})

	t.Run("generate and validate refresh token", func(t *testing.T) {
		familyID := uuid.New()
		token, jti, err := svc.GenerateRefreshToken(userID, tenantID, familyID)
		require.NoError(t, err)
		assert.NotEmpty(t, token)
		assert.NotEmpty(t, jti)

		claims, err := svc.ValidateToken(token)
		require.NoError(t, err)
		assert.Equal(t, auth.TokenRefresh, claims.Type)
	})

	t.Run("reject invalid token", func(t *testing.T) {
		_, err := svc.ValidateToken("invalid.token.here")
		assert.Error(t, err)
	})

	t.Run("reject token with wrong secret", func(t *testing.T) {
		otherSvc := auth.NewJWTService("different-secret-key-at-least-32-chars!", 15*time.Minute, 30*24*time.Hour)
		token, err := svc.GenerateAccessToken(userID, tenantID, "user")
		require.NoError(t, err)

		_, err = otherSvc.ValidateToken(token)
		assert.Error(t, err)
	})
}

func TestPasswordHashing(t *testing.T) {
	t.Run("hash and verify", func(t *testing.T) {
		hash, err := auth.HashPassword("mySecurePassword123!")
		require.NoError(t, err)
		assert.NotEmpty(t, hash)
		assert.Contains(t, hash, "$argon2id$")

		valid, err := auth.VerifyPassword("mySecurePassword123!", hash)
		require.NoError(t, err)
		assert.True(t, valid)
	})

	t.Run("reject wrong password", func(t *testing.T) {
		hash, err := auth.HashPassword("correctPassword")
		require.NoError(t, err)

		valid, err := auth.VerifyPassword("wrongPassword", hash)
		require.NoError(t, err)
		assert.False(t, valid)
	})
}

func TestHashToken(t *testing.T) {
	hash1 := auth.HashToken("test-token")
	hash2 := auth.HashToken("test-token")
	hash3 := auth.HashToken("different-token")

	assert.Equal(t, hash1, hash2)
	assert.NotEqual(t, hash1, hash3)
}

func TestMagicLinkToken(t *testing.T) {
	token1, err := auth.GenerateMagicLinkToken()
	require.NoError(t, err)
	assert.NotEmpty(t, token1)

	token2, err := auth.GenerateMagicLinkToken()
	require.NoError(t, err)
	assert.NotEqual(t, token1, token2)
}
