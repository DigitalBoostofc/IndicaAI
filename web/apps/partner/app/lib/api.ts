export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error || res.statusText, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
};

export interface ProgramRules {
  schemaVersion?: number;
  trigger?: string;
  attributionWindowDays?: number;
  reward?: {
    type: string;
    max_pct?: number;
    amount_brl?: number;
    pct?: number;
    metric?: string;
    tiers?: unknown[];
  };
  payout?: { method: string; schedule: string; minAmountBrl?: number };
  limits?: Record<string, unknown>;
}

export interface PartnerMe {
  partner_id: string;
  name: string;
  email: string | null;
  phone_e164: string | null;
  status: string;
  program_id: string;
  program_name: string;
  program_rules: ProgramRules;
  link_url: string | null;
  clicks: number;
  referrals: number;
  pending_rewards_cents: number;
  approved_rewards_cents: number;
  paid_rewards_cents: number;
  created_at: string;
}

export interface PartnerReferral {
  lead_id: string;
  lead_name: string | null;
  status: "new" | "in_progress" | "qualified" | "closed" | "lost";
  source: string;
  created_at: string;
  closed_at: string | null;
  sale_amount_cents: number | null;
  reward_cents: number | null;
  reward_status: string | null;
}

export const authApi = {
  requestMagicLink: (email: string) =>
    api.post<{ message: string; dev_token?: string }>("/api/auth/magic-link", { email }),
  verifyMagicLink: (token: string) =>
    api.post<{ access_token: string }>("/api/auth/magic-link/verify", { token }),
  logout: () => api.post<{ message: string }>("/api/auth/logout"),
  me: () =>
    api.get<{ id: string; email: string; name: string; tenant_id?: string; tenant_name?: string }>(
      "/api/me",
    ),
};

export interface SplitChoice {
  commission_pct: number;
  discount_pct: number;
}

export interface CreatePartnerLeadRequest {
  name?: string;
  phone_e164: string;
  email?: string;
  notes?: string;
  split_choice?: SplitChoice;
}

export interface Wallet {
  available_cents: number;
  hold_cents: number;
  pending_cents: number;
  total_paid_cents: number;
}

export interface Payout {
  id: string;
  partner_id: string;
  reward_ids: string[];
  amount_cents: number;
  currency: string;
  method: string;
  status: "pending" | "processing" | "paid" | "failed" | "cancelled";
  pix_key: string | null;
  pix_key_type: string | null;
  paid_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

export const partnerApi = {
  me: () => api.get<PartnerMe>("/api/partner/me"),
  referrals: () => api.get<PartnerReferral[]>("/api/partner/referrals"),
  createLead: (data: CreatePartnerLeadRequest) =>
    api.post<{ lead_id: string; referral_id: string }>(
      "/api/partner/leads",
      data,
    ),
  wallet: () => api.get<Wallet>("/api/partners/me/wallet"),
  payouts: (params?: { limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.limit != null) qs.set("limit", String(params.limit));
    if (params?.offset != null) qs.set("offset", String(params.offset));
    const query = qs.toString();
    return api.get<{ items: Payout[]; total: number }>(
      `/api/partners/me/payouts${query ? `?${query}` : ""}`,
    );
  },
  updatePixKey: (data: { pix_key: string; pix_key_type: PixKeyType }) =>
    api.patch<{ message: string }>("/api/partners/me/pix-key", data),
};
