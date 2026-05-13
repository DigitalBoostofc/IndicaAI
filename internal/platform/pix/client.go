package pix

// Client defines the interface for Pix payment processing.
// Implementations: Asaas, Stripe, etc.
type Client interface {
	// CreateTransfer initiates a Pix transfer to the given key.
	CreateTransfer(amountCents int64, pixKey, pixKeyType, description string) (externalID string, err error)
	// GetTransferStatus checks the status of a transfer.
	GetTransferStatus(externalID string) (status string, err error)
}

// StubClient is a no-op implementation for development/testing.
type StubClient struct{}

func (s *StubClient) CreateTransfer(amountCents int64, pixKey, pixKeyType, description string) (string, error) {
	return "stub-tx-" + pixKey, nil
}

func (s *StubClient) GetTransferStatus(externalID string) (string, error) {
	return "paid", nil
}
