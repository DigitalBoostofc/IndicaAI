package config

import (
	"time"

	"github.com/caarlos0/env/v10"
)

type Config struct {
	// Database
	DatabaseURL string `env:"DATABASE_URL,required"`

	// Redis
	RedisURL string `env:"REDIS_URL,required"`

	// JWT
	JWTSecret     string        `env:"JWT_SECRET,required"`
	JWTAccessTTL  time.Duration `env:"JWT_ACCESS_TTL" envDefault:"15m"`
	JWTRefreshTTL time.Duration `env:"JWT_REFRESH_TTL" envDefault:"720h"`

	// Server
	HTTPAddr  string `env:"HTTP_ADDR" envDefault:":8080"`
	LogLevel  string `env:"LOG_LEVEL" envDefault:"info"`
	LogFormat string `env:"LOG_FORMAT" envDefault:"json"`
	AppEnv    string `env:"APP_ENV" envDefault:"development"`

	// Observability
	OTELEndpoint  string `env:"OTEL_EXPORTER_OTLP_ENDPOINT" envDefault:""`
	PrometheusAddr string `env:"PROMETHEUS_ADDR" envDefault:":9090"`

	// Storage (R2)
	R2Endpoint  string `env:"R2_ENDPOINT" envDefault:""`
	R2AccessKey string `env:"R2_ACCESS_KEY" envDefault:""`
	R2SecretKey string `env:"R2_SECRET_KEY" envDefault:""`
	R2Bucket    string `env:"R2_BUCKET" envDefault:""`
	R2PublicURL string `env:"R2_PUBLIC_URL" envDefault:""`

	// Email
	ResendAPIKey string `env:"RESEND_API_KEY" envDefault:""`

	// WhatsApp
	WhatsAppAPIURL   string `env:"WHATSAPP_API_URL" envDefault:""`
	WhatsAppAPIToken string `env:"WHATSAPP_API_TOKEN" envDefault:""`

	// Pix
	AsaasAPIKey string `env:"ASAAS_API_KEY" envDefault:""`
	AsaasAPIURL string `env:"ASAAS_API_URL" envDefault:"https://sandbox.asaas.com/api/v3"`

	// Feature flags
	EnableMFA       bool `env:"ENABLE_MFA" envDefault:"true"`
	RateLimitEnabled bool `env:"RATE_LIMIT_ENABLED" envDefault:"true"`
}

func Load() (*Config, error) {
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, err
	}
	return cfg, nil
}
