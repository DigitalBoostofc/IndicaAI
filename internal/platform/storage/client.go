package storage

import "io"

// Client defines the interface for object storage (R2/S3).
type Client interface {
	Upload(bucket, key string, reader io.Reader, contentType string) error
	GenerateSignedURL(bucket, key string, expirySeconds int) (string, error)
}

// StubClient is a no-op implementation for development/testing.
type StubClient struct{}

func (s *StubClient) Upload(bucket, key string, reader io.Reader, contentType string) error {
	return nil
}

func (s *StubClient) GenerateSignedURL(bucket, key string, expirySeconds int) (string, error) {
	return "https://stub.storage/" + key, nil
}
