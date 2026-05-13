// Leads API — tipos e funções
// Os tipos serão gerados da OpenAPI quando o backend estiver pronto

import type { ApiClient } from "./index";

export interface Lead {
  id: string;
  tenantId: string;
  programId: string;
  partnerId: string;
  name: string;
  email?: string;
  phone?: string;
  referralCode?: string;
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus =
  | "new"
  | "in_progress"
  | "qualified"
  | "closed"
  | "lost";

export interface CreateLeadRequest {
  name: string;
  email?: string;
  phone?: string;
  referralCode?: string;
  programId: string;
}

export interface UpdateLeadStatusRequest {
  status: LeadStatus;
}

export interface Reward {
  id: string;
  leadId: string;
  partnerId: string;
  type: string;
  amount?: number;
  status: "pending" | "approved" | "paid" | "cancelled";
  createdAt: string;
}

export function leadsApi(client: ApiClient) {
  return {
    list: (filters?: { programId?: string; status?: LeadStatus; partnerId?: string }) => {
      const params = new URLSearchParams();
      if (filters?.programId) params.set("programId", filters.programId);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.partnerId) params.set("partnerId", filters.partnerId);
      const query = params.toString();
      return client.get<Lead[]>(`/leads${query ? `?${query}` : ""}`);
    },

    getById: (id: string) => client.get<Lead>(`/leads/${id}`),

    create: (data: CreateLeadRequest) =>
      client.post<Lead>("/leads", data),

    updateStatus: (id: string, data: UpdateLeadStatusRequest) =>
      client.patch<Lead>(`/leads/${id}/status`, data),

    // Recompensas
    getRewards: (leadId: string) =>
      client.get<Reward[]>(`/leads/${leadId}/rewards`),

    // Painel do parceiro — minhas indicações
    myReferrals: () => client.get<Lead[]>("/partners/me/referrals"),

    myRewards: () => client.get<Reward[]>("/partners/me/rewards"),
  };
}
