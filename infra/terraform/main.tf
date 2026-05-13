# Indica AÍ! — Cloudflare DNS + R2 buckets (shared infrastructure).
#
# Application platforms (Vercel, Fly.io, Cloudflare Workers) are managed via
# their own descriptive configs (vercel.json, fly.toml, wrangler.toml) — only
# resources that span multiple platforms live here.
#
# Apply with:
#   cd infra/terraform
#   terraform init
#   terraform plan -var-file=prod.tfvars
#   terraform apply -var-file=prod.tfvars

terraform {
  required_version = ">= 1.6"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }

  cloud {
    organization = "indica-ai"
    workspaces {
      name = "infra-prod"
    }
  }
}

variable "cloudflare_api_token" {
  type        = string
  sensitive   = true
  description = "Cloudflare API token with DNS + R2 permissions."
}

variable "cloudflare_zone_id" {
  type        = string
  description = "Cloudflare zone ID for indica.ai."
}

variable "fly_api_hostname" {
  type        = string
  default     = "indica-api-prod.fly.dev"
  description = "Fly.io public hostname for the API service."
}

variable "vercel_cname_target" {
  type        = string
  default     = "cname.vercel-dns.com"
  description = "Vercel CNAME target for custom domains."
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# ---------- DNS ----------

resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "api"
  type    = "CNAME"
  content = var.fly_api_hostname
  proxied = true
  comment = "Backend Go API on Fly.io (region gru)"
}

resource "cloudflare_record" "app" {
  zone_id = var.cloudflare_zone_id
  name    = "app"
  type    = "CNAME"
  content = var.vercel_cname_target
  proxied = false
  comment = "Dashboard app (tenant admin) on Vercel"
}

resource "cloudflare_record" "partner" {
  zone_id = var.cloudflare_zone_id
  name    = "partner"
  type    = "CNAME"
  content = var.vercel_cname_target
  proxied = false
  comment = "Partner self-service app on Vercel"
}

resource "cloudflare_record" "root" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  type    = "CNAME"
  content = var.vercel_cname_target
  proxied = false
  comment = "Public landing/marketing on Vercel"
}

# r.indica.ai points to the Worker route configured in wrangler.toml.
# Listed here for visibility — actual route binding is managed by Workers.

# ---------- R2 buckets ----------

resource "cloudflare_r2_bucket" "exports" {
  account_id = var.cloudflare_account_id
  name       = "indica-exports-prod"
  location   = "WNAM"
}

variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare account ID."
}
