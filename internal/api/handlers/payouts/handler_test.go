package payouts

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestValidatePixKey(t *testing.T) {
	tests := []struct {
		name      string
		pixKey    string
		pixType   string
		expectErr bool
	}{
		// Valid CPF
		{"valid cpf", "12345678901", "cpf", false},
		{"invalid cpf short", "1234567890", "cpf", true},
		{"invalid cpf long", "123456789012", "cpf", true},
		{"invalid cpf letters", "1234567890a", "cpf", true},

		// Valid CNPJ
		{"valid cnpj", "12345678901234", "cnpj", false},
		{"invalid cnpj short", "1234567890123", "cnpj", true},
		{"invalid cnpj long", "123456789012345", "cnpj", true},

		// Valid email
		{"valid email", "user@example.com", "email", false},
		{"valid email with dots", "user.name+tag@example.co.uk", "email", false},
		{"invalid email no at", "userexample.com", "email", true},
		{"invalid email no domain", "user@", "email", true},

		// Valid phone
		{"valid phone br", "+5511999999999", "phone", false},
		{"valid phone us", "+12025551234", "phone", false},
		{"invalid phone no plus", "5511999999999", "phone", true},
		{"invalid phone short", "+12345", "phone", true},

		// Valid random
		{"valid random", "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4", "random", false},
		{"invalid random short", "a1b2c3d4e5f6", "random", true},
		{"invalid random spaces", "a1b2c3d4e5f6 a1b2c3d4e5f6a1b2", "random", true},

		// Invalid type
		{"invalid type", "anything", "bitcoin", true},
		{"empty type", "anything", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidatePixKey(tt.pixKey, tt.pixType)
			if tt.expectErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}
