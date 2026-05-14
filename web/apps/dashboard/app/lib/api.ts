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
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export interface Program {
  id: string;
  tenant_id: string;
  name: string;
  description?: string | null;
  status: "active" | "paused" | "draft";
  rules: Record<string, unknown>;
  redirect_type: string;
  redirect_url?: string | null;
  whatsapp_number?: string | null;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface CreateProgramRequest {
  name: string;
  description?: string;
  rules: Record<string, unknown>;
  redirect_type: string;
  redirect_url?: string;
  whatsapp_number?: string;
  settings?: Record<string, unknown>;
}

export interface DashboardOverview {
  clicks_last_7_days: number;
  clicks_delta_pct: number;
  new_leads_last_7_days: number;
  leads_delta_pct: number;
  pending_rewards_cents: number;
  active_partners: number;
  clicks_per_day: { day: string; count: number }[];
  top_partners: { name: string; referrals: number; amount_cents: number }[];
  recent_leads: {
    id: string;
    name: string;
    partner_name: string;
    status: string;
    created_at: string;
  }[];
}

export const dashboardApi = {
  overview: () => api.get<DashboardOverview>("/api/dashboard/overview"),
};

export interface Partner {
  id: string;
  name: string;
  email: string | null;
  phone_e164: string | null;
  status: "active" | "pending" | "suspended";
  program_id: string;
  program_name: string;
  link_slug: string | null;
  link_url: string | null;
  referrals: number;
  clicks: number;
  commission_cents: number;
  created_at: string;
}

export interface CreatePartnerRequest {
  name: string;
  email?: string;
  phone_e164?: string;
  program_id: string;
}

export const partnersApi = {
  list: () => api.get<Partner[]>("/api/partners"),
  create: (data: CreatePartnerRequest) =>
    api.post<Partner>("/api/partners", data),
};

export type LeadStatus = "new" | "in_progress" | "qualified" | "closed" | "lost";

export interface Lead {
  id: string;
  name: string | null;
  phone_e164: string | null;
  email: string | null;
  status: LeadStatus;
  source: string;
  notes: string | null;
  closed_at: string | null;
  created_at: string;
  program_id: string;
  program_name: string;
  partner_id: string | null;
  partner_name: string | null;
  sale_amount_cents: number | null;
}

export const leadsApi = {
  list: (filters?: { status?: LeadStatus }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    const qs = params.toString();
    return api.get<Lead[]>(`/api/leads${qs ? `?${qs}` : ""}`);
  },
  updateStatus: (id: string, status: LeadStatus) =>
    api.patch<Lead>(`/api/leads/${id}/status`, { status }),
};

export type RewardStatus =
  | "pending"
  | "approved"
  | "paid"
  | "rejected"
  | "cancelled";

export interface Reward {
  id: string;
  type: string;
  amount_cents: number;
  currency: string;
  status: RewardStatus;
  approved_at: string | null;
  rejected_reason: string | null;
  created_at: string;
  program_id: string;
  program_name: string;
  partner_id: string;
  partner_name: string;
  lead_name: string | null;
}

export interface RewardSummary {
  pending: number;
  approved: number;
  paid: number;
  rejected: number;
  cancelled: number;
}

export interface Me {
  id: string;
  email: string;
  name: string;
  role: string;
  email_verified: boolean;
  tenant_id?: string;
  tenant_name?: string;
}

export const authApi = {
  me: () => api.get<Me>("/api/me"),
  logout: () => api.post<{ message: string }>("/api/auth/logout"),
};

export const rewardsApi = {
  list: (filters?: { status?: RewardStatus }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    const qs = params.toString();
    return api.get<Reward[]>(`/api/rewards${qs ? `?${qs}` : ""}`);
  },
  summary: () => api.get<RewardSummary>("/api/rewards/summary"),
  approve: (id: string) => api.patch<{ status: string }>(`/api/rewards/${id}/approve`),
  reject: (id: string, reason: string) =>
    api.patch<{ status: string }>(`/api/rewards/${id}/reject`, { reason }),
};

export const programsApi = {
  list: () => api.get<Program[] | null>("/api/programs"),
  get: (id: string) => api.get<Program>(`/api/programs/${id}`),
  create: (data: CreateProgramRequest) =>
    api.post<Program>("/api/programs", data),
  updateStatus: (id: string, status: string) =>
    api.patch<{ status: string }>(`/api/programs/${id}/status`, { status }),
};

export type PayoutStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled";

export interface Payout {
  id: string;
  partner_id: string;
  partner_name: string;
  pix_key: string | null;
  pix_key_type: string | null;
  amount_cents: number;
  currency: string;
  method: string;
  status: PayoutStatus;
  created_at: string;
  reward_count: number | null;
}

export interface PayoutsResponse {
  payouts: Payout[];
  total_count: number;
  page: number;
  limit: number;
}

export interface AuditEntry {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: unknown;
  new_values: unknown;
  ip_address: string | null;
  user_agent: string | null;
  metadata: unknown;
  created_at: string;
}

export interface AuditSummary {
  total_entries: number;
  fraud_ok: number;
  fraud_review: number;
  fraud_block: number;
  entries_last_7_days: number;
  entries_last_30_days: number;
  top_actions: { action: string; count: number }[];
}

export interface FraudEvaluation {
  id: string;
  partner_id: string;
  partner_name: string;
  lead_id: string | null;
  score: number;
  action: "ok" | "review" | "block";
  signals: { name: string; points: number; evidence?: Record<string, unknown> }[];
  evidence: Record<string, unknown>;
  created_at: string;
}

export const auditApi = {
  list: (filters?: { action?: string; entity_type?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.action) params.set("action", filters.action);
    if (filters?.entity_type) params.set("entity_type", filters.entity_type);
    if (filters?.limit) params.set("limit", String(filters.limit));
    const qs = params.toString();
    return api.get<AuditEntry[]>(`/api/audit-log${qs ? `?${qs}` : ""}`);
  },
  summary: () => api.get<AuditSummary>("/api/audit-log/summary"),
  fraudEvaluations: (filters?: { action?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.action) params.set("action", filters.action);
    if (filters?.limit) params.set("limit", String(filters.limit));
    const qs = params.toString();
    return api.get<FraudEvaluation[]>(`/api/audit-log/fraud-evaluations${qs ? `?${qs}` : ""}`);
  },
};

export interface Session {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  expires_at: string;
}

export const sessionsApi = {
  list: () => api.get<Session[]>("/api/me/sessions"),
  revoke: (id: string) =>
    api.post<{ status: string }>(`/api/me/sessions/${id}/revoke`),
  revokeAll: () =>
    api.post<{ status: string; revoked_count: number }>("/api/me/sessions/revoke-all"),
};

export const payoutsApi = {
  list: (filters?: { status?: PayoutStatus; page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));
    const qs = params.toString();
    return api.get<PayoutsResponse>(`/api/tenants/me/payouts${qs ? `?${qs}` : ""}`);
  },
  createJob: () =>
    api.post<{ created: number }>("/api/tenants/me/payouts/create-job"),
  confirm: (id: string) =>
    api.post<{ status: string; message?: string }>(`/api/tenants/me/payouts/${id}/confirm`),
  paid: (id: string, body?: { receipt_url?: string; paid_at?: string }) =>
    api.post<{ status: string; message?: string }>(`/api/tenants/me/payouts/${id}/paid`, body),
  cancel: (id: string, reason?: string) =>
    api.post<{ status: string }>(`/api/tenants/me/payouts/${id}/cancel`, reason ? { reason } : undefined),
};
