package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/rueidis"
)

// Client wraps rueidis for cache and rate limiting operations.
type Client struct {
	client rueidis.Client
}

// New creates a new cache Client connected to Redis.
func New(ctx context.Context, redisURL string) (*Client, error) {
	opt, err := rueidis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}

	client, err := rueidis.NewClient(opt)
	if err != nil {
		return nil, fmt.Errorf("create redis client: %w", err)
	}

	// Verify connection
	if err := client.Do(ctx, client.B().Ping().Build()).Error(); err != nil {
		client.Close()
		return nil, fmt.Errorf("ping redis: %w", err)
	}

	return &Client{client: client}, nil
}

// Close closes the Redis connection.
func (c *Client) Close() {
	c.client.Close()
}

// Get retrieves a value by key. Returns ("", nil) if not found.
func (c *Client) Get(ctx context.Context, key string) (string, error) {
	result := c.client.Do(ctx, c.client.B().Get().Key(key).Build())
	if rueidis.IsRedisNil(result.Error()) {
		return "", nil
	}
	if err := result.Error(); err != nil {
		return "", fmt.Errorf("redis get: %w", err)
	}
	return result.ToString()
}

// Set stores a value with a TTL.
func (c *Client) Set(ctx context.Context, key, value string, ttl time.Duration) error {
	cmd := c.client.B().Set().Key(key).Value(value)
	if ttl > 0 {
		cmd.Ex(ttl)
	}
	return c.client.Do(ctx, cmd.Build()).Error()
}

// Delete removes a key.
func (c *Client) Delete(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}
	return c.client.Do(ctx, c.client.B().Del().Key(keys...).Build()).Error()
}

// Incr atomically increments a counter and returns the new value.
func (c *Client) Incr(ctx context.Context, key string) (int64, error) {
	return c.client.Do(ctx, c.client.B().Incr().Key(key).Build()).AsInt64()
}

// RateLimit implements a token bucket rate limiter using a Lua script.
// Returns (allowed bool, remaining int64, error).
func (c *Client) RateLimit(ctx context.Context, key string, limit int64, window time.Duration) (bool, int64, error) {
	// Token bucket Lua script
	script := `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local info = redis.call('HMGET', key, 'tokens', 'last')
local tokens = tonumber(info[1]) or limit
local last = tonumber(info[2]) or now

local elapsed = now - last
local refill = math.floor(elapsed * limit / window)
tokens = math.min(limit, tokens + refill)

local allowed = 0
if tokens > 0 then
    tokens = tokens - 1
    allowed = 1
end

redis.call('HMSET', key, 'tokens', tokens, 'last', now)
redis.call('EXPIRE', key, math.ceil(window / 1000))

return {allowed, tokens}
`

	now := time.Now().UnixMilli()
	result := c.client.Do(ctx, c.client.B().Eval().
		Script(script).
		Numkeys(1).
		Key(key).
		Arg(fmt.Sprintf("%d", limit)).
		Arg(fmt.Sprintf("%d", window.Milliseconds())).
		Arg(fmt.Sprintf("%d", now)).
		Build())

	if err := result.Error(); err != nil {
		return false, 0, fmt.Errorf("rate limit eval: %w", err)
	}

	arr, err := result.AsIntSlice()
	if err != nil {
		return false, 0, fmt.Errorf("rate limit parse: %w", err)
	}

	allowed := arr[0] == 1
	remaining := arr[1]
	return allowed, remaining, nil
}

// SetNX sets a key only if it doesn't exist (for idempotency).
func (c *Client) SetNX(ctx context.Context, key, value string, ttl time.Duration) (bool, error) {
	result := c.client.Do(ctx, c.client.B().Set().Key(key).Value(value).Nx().Ex(ttl).Build())
	if rueidis.IsRedisNil(result.Error()) {
		return false, nil
	}
	if err := result.Error(); err != nil {
		return false, fmt.Errorf("redis setnx: %w", err)
	}
	return true, nil
}
