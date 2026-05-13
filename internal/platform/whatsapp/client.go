package whatsapp

// Client defines the interface for sending WhatsApp messages.
type Client interface {
	Send(to, message string) error
}

// StubClient is a no-op implementation for development/testing.
type StubClient struct{}

func (s *StubClient) Send(to, message string) error {
	return nil
}
