package auth_test

import (
	"testing"

	"github.com/indica-ai/indica-ai/internal/platform/auth"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestArgon2idOWASP(t *testing.T) {
	t.Run("different hashes for same password", func(t *testing.T) {
		hash1, err := auth.HashPassword("password123")
		require.NoError(t, err)

		hash2, err := auth.HashPassword("password123")
		require.NoError(t, err)

		// Different salts → different hashes
		assert.NotEqual(t, hash1, hash2)

		// Both should verify
		valid1, err := auth.VerifyPassword("password123", hash1)
		require.NoError(t, err)
		assert.True(t, valid1)

		valid2, err := auth.VerifyPassword("password123", hash2)
		require.NoError(t, err)
		assert.True(t, valid2)
	})

	t.Run("handles special characters", func(t *testing.T) {
		password := "P@$$w0rd!#%^&*()_+-=[]{}|;':\",./<>?"
		hash, err := auth.HashPassword(password)
		require.NoError(t, err)

		valid, err := auth.VerifyPassword(password, hash)
		require.NoError(t, err)
		assert.True(t, valid)
	})

	t.Run("handles unicode", func(t *testing.T) {
		password := "senha_com_acentos_ção_ãõ"
		hash, err := auth.HashPassword(password)
		require.NoError(t, err)

		valid, err := auth.VerifyPassword(password, hash)
		require.NoError(t, err)
		assert.True(t, valid)
	})
}
