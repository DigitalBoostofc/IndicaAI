// Auth API — tipos e funções
// Os tipos serão gerados da OpenAPI quando o backend estiver pronto

import type { ApiClient } from "./index";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  tenant: Tenant;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "owner" | "admin" | "member" | "saas_admin";
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export function authApi(client: ApiClient) {
  return {
    login: (data: LoginRequest) =>
      client.post<LoginResponse>("/auth/login", data),

    logout: () => client.post<void>("/auth/logout"),

    me: () => client.get<User>("/auth/me"),

    // Magic link para parceiros
    requestMagicLink: (email: string) =>
      client.post<void>("/auth/magic-link", { email }),

    verifyMagicLink: (token: string) =>
      client.post<LoginResponse>("/auth/magic-link/verify", { token }),
  };
}
