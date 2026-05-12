// Partners API — tipos e funções
// Os tipos serão gerados da OpenAPI quando o backend estiver pronto

import type { ApiClient } from "./index";

export interface Partner {
  id: string;
  tenantId: string;
  programId: string;
  name: string;
  email: string;
  phone?: string;
  slug: string;
  status: "active" | "inactive" | "blocked";
  pixKey?: string;
  totalReferrals: number;
  totalEarnings: number;
  createdAt: string;
}

export interface CreatePartnerRequest {
  name: string;
  email: string;
  phone?: string;
  programId: string;
}

export interface PartnerStats {
  totalClicks: number;
  totalReferrals: number;
  totalConversions: number;
  pendingEarnings: number;
  approvedEarnings: number;
  paidEarnings: number;
}

export function partnersApi(client: ApiClient) {
  return {
    list: (programId?: string) => {
      const params = programId ? `?programId=${programId}` : "";
      return client.get<Partner[]>(`/partners${params}`);
    },

    getById: (id: string) => client.get<Partner>(`/partners/${id}`),

    create: (data: CreatePartnerRequest) =>
      client.post<Partner>("/partners", data),

    update: (id: string, data: Partial<CreatePartnerRequest>) =>
      client.patch<Partner>(`/partners/${id}`, data),

    getStats: (id: string) =>
      client.get<PartnerStats>(`/partners/${id}/stats`),

    // Painel do parceiro
    me: () => client.get<Partner>("/partners/me"),

    myStats: () => client.get<PartnerStats>("/partners/me/stats"),
  };
}
