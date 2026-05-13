package dto

import (
	"encoding/json"
	"time"
)

// Auth DTOs
type RegisterRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
	Name     string `json:"name" validate:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type MagicLinkRequest struct {
	Email string `json:"email" validate:"required,email"`
}

type MagicLinkVerifyRequest struct {
	Token string `json:"token" validate:"required"`
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	ExpiresIn    int    `json:"expires_in"`
}

// Tenant DTOs
type CreateTenantRequest struct {
	Name      string `json:"name" validate:"required"`
	Subdomain string `json:"subdomain" validate:"required,alphanum"`
}

type TenantResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Subdomain string    `json:"subdomain"`
	Plan      string    `json:"plan"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

// Program DTOs
type CreateProgramRequest struct {
	Name          string          `json:"name" validate:"required"`
	Description   string          `json:"description"`
	Rules         json.RawMessage `json:"rules" validate:"required"`
	RedirectType  string          `json:"redirect_type" validate:"required,oneof=website whatsapp landing checkout"`
	RedirectURL   string          `json:"redirect_url"`
	WhatsAppNumber string         `json:"whatsapp_number"`
}

type ProgramResponse struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	Description     string    `json:"description"`
	Status          string    `json:"status"`
	Rules           json.RawMessage `json:"rules"`
	RedirectType    string    `json:"redirect_type"`
	RedirectURL     string    `json:"redirect_url"`
	WhatsAppNumber  string    `json:"whatsapp_number"`
	CreatedAt       time.Time `json:"created_at"`
}

// Partner DTOs
type CreatePartnerRequest struct {
	Name      string  `json:"name" validate:"required"`
	Email     string  `json:"email" validate:"email"`
	Phone     string  `json:"phone"`
	PixKey    string  `json:"pix_key"`
	PixKeyType string `json:"pix_key_type"`
}

type PartnerResponse struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Email      string    `json:"email"`
	Status     string    `json:"status"`
	PixKey     string    `json:"pix_key,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

// Lead DTOs
type CreateLeadRequest struct {
	Name          string `json:"name"`
	Phone         string `json:"phone" validate:"required"`
	Email         string `json:"email" validate:"email"`
	ReferralCode  string `json:"referral_code"`
	Source        string `json:"source"`
	Notes         string `json:"notes"`
}

type UpdateLeadStatusRequest struct {
	Status string `json:"status" validate:"required,oneof=new in_progress qualified closed lost"`
}

type LeadResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Phone     string    `json:"phone"`
	Email     string    `json:"email"`
	Status    string    `json:"status"`
	Source    string    `json:"source"`
	Notes     string    `json:"notes"`
	ClosedAt  *time.Time `json:"closed_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

// Reward DTOs
type RewardResponse struct {
	ID           string    `json:"id"`
	PartnerID    string    `json:"partner_id"`
	PartnerName  string    `json:"partner_name"`
	LeadName     string    `json:"lead_name"`
	Type         string    `json:"type"`
	AmountCents  int64     `json:"amount_cents"`
	Currency     string    `json:"currency"`
	Status       string    `json:"status"`
	ApprovedAt   *time.Time `json:"approved_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

// Payout DTOs
type PayoutRequest struct {
	RewardIDs  []string `json:"reward_ids" validate:"required"`
	PixKey     string   `json:"pix_key" validate:"required"`
	PixKeyType string   `json:"pix_key_type" validate:"required"`
}

type PayoutResponse struct {
	ID          string    `json:"id"`
	AmountCents int64     `json:"amount_cents"`
	Currency    string    `json:"currency"`
	Method      string    `json:"method"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

type PayoutListItemResponse struct {
	ID           string    `json:"id"`
	PartnerID    string    `json:"partner_id"`
	PartnerName  string    `json:"partner_name"`
	PixKey       string    `json:"pix_key"`
	PixKeyType   string    `json:"pix_key_type"`
	AmountCents  int64     `json:"amount_cents"`
	Currency     string    `json:"currency"`
	Method       string    `json:"method"`
	Status       string    `json:"status"`
	RewardCount  int       `json:"reward_count"`
	CreatedAt    time.Time `json:"created_at"`
}

type PaidPayoutRequest struct {
	PaidAt     *time.Time `json:"paid_at,omitempty"`
	ReceiptURL string     `json:"receipt_url,omitempty"`
}

type CancelPayoutRequest struct {
	Reason string `json:"reason,omitempty"`
}

type ListPayoutsResponse struct {
	Payouts    []PayoutListItemResponse `json:"payouts"`
	TotalCount int64                    `json:"total_count"`
	Page       int                      `json:"page"`
	Limit      int                      `json:"limit"`
}

// Wallet DTOs
type WalletResponse struct {
	AvailableCents int64  `json:"available_cents"`
	HoldCents      int64  `json:"hold_cents"`
	PendingCents   int64  `json:"pending_cents"`
	TotalPaidCents int64  `json:"total_paid_cents"`
	Currency       string `json:"currency"`
}

type UpdatePixKeyRequest struct {
	PixKey     string `json:"pix_key" validate:"required"`
	PixKeyType string `json:"pix_key_type" validate:"required,oneof=cpf cnpj email phone random"`
}

type PartnerPayoutListItemResponse struct {
	ID          string     `json:"id"`
	AmountCents int64      `json:"amount_cents"`
	Currency    string     `json:"currency"`
	Method      string     `json:"method"`
	Status      string     `json:"status"`
	PaidAt      *time.Time `json:"paid_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

type PartnerPayoutsResponse struct {
	Payouts    []PartnerPayoutListItemResponse `json:"payouts"`
	TotalCount int64                           `json:"total_count"`
	Page       int                             `json:"page"`
	Limit      int                             `json:"limit"`
}

// Tracking DTOs
type ClickEventRequest struct {
	Slug        string `json:"slug" validate:"required"`
	VisitorID   string `json:"visitor_id"`
	Fingerprint string `json:"fingerprint"`
	IP          string `json:"ip"`
	UA          string `json:"ua"`
	AcceptLang  string `json:"accept_lang"`
	Referer     string `json:"referer"`
}

// LGPD DTOs
type LGPDRequest struct {
	RequestType string `json:"request_type" validate:"required,oneof=export erase rectify access"`
}

// Webhook DTOs
type WebhookDelivery struct {
	EventID   string          `json:"event_id"`
	EventType string          `json:"event_type"`
	TenantID  string          `json:"tenant_id"`
	Data      json.RawMessage `json:"data"`
	Timestamp time.Time       `json:"timestamp"`
	Attempt   int             `json:"attempt"`
}

// Common
type ErrorResponse struct {
	Error   string `json:"error"`
	Details string `json:"details,omitempty"`
}

type PaginationParams struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
}

func (p *PaginationParams) Offset() int {
	if p.Page <= 0 {
		p.Page = 1
	}
	if p.Limit <= 0 {
		p.Limit = 20
	}
	return (p.Page - 1) * p.Limit
}
