// Programs API — tipos e funções
// Os tipos serão gerados da OpenAPI quando o backend estiver pronto

import type { ApiClient } from "./index";

export interface Program {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  status: "active" | "paused" | "draft";
  rules: ProgramRules;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramRules {
  schemaVersion: number;
  trigger: string;
  attributionWindowDays: number;
  reward: RewardRule;
  payout: PayoutRule;
  limits: LimitsRule;
}

export interface RewardRule {
  type: string;
  [key: string]: unknown;
}

export interface PayoutRule {
  method: string;
  schedule: string;
  minAmountBrl?: number;
}

export interface LimitsRule {
  maxPerPartnerPerDay?: number;
  maxTotalPayoutBrl?: number;
}

export interface CreateProgramRequest {
  name: string;
  rules: ProgramRules;
}

export function programsApi(client: ApiClient) {
  return {
    list: () => client.get<Program[]>("/programs"),

    getById: (id: string) => client.get<Program>(`/programs/${id}`),

    create: (data: CreateProgramRequest) =>
      client.post<Program>("/programs", data),

    update: (id: string, data: Partial<CreateProgramRequest>) =>
      client.patch<Program>(`/programs/${id}`, data),

    delete: (id: string) => client.delete<void>(`/programs/${id}`),
  };
}
