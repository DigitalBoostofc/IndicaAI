package queue

import "context"

// WorkerFunc is a function that processes a job.
type WorkerFunc func(ctx context.Context, args []byte) error

// Queue defines the interface for job queue operations.
type Queue interface {
	// Enqueue adds a job to the queue.
	Enqueue(ctx context.Context, queue string, args []byte) error
	// Start begins processing jobs.
	Start(ctx context.Context) error
	// Stop gracefully shuts down the queue.
	Stop(ctx context.Context) error
}

// StubQueue is an in-memory queue for development/testing.
// Jobs are processed synchronously.
type StubQueue struct {
	handlers map[string]WorkerFunc
}

func NewStubQueue() *StubQueue {
	return &StubQueue{handlers: make(map[string]WorkerFunc)}
}

func (q *StubQueue) RegisterHandler(queue string, fn WorkerFunc) {
	q.handlers[queue] = fn
}

func (q *StubQueue) Enqueue(ctx context.Context, queue string, args []byte) error {
	if fn, ok := q.handlers[queue]; ok {
		return fn(ctx, args)
	}
	return nil
}

func (q *StubQueue) Start(ctx context.Context) error {
	return nil
}

func (q *StubQueue) Stop(ctx context.Context) error {
	return nil
}
