package email

// Client defines the interface for sending transactional emails.
type Client interface {
	Send(to, subject, htmlBody string) error
}

// StubClient is a no-op implementation for development/testing.
type StubClient struct{}

func (s *StubClient) Send(to, subject, htmlBody string) error {
	return nil
}
