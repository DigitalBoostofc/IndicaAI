// Cliente TypeScript para a API Go do Indica AÍ!
// Futuramente será gerado automaticamente da OpenAPI spec via openapi-typescript

export interface ApiClientOptions {
  baseUrl: string;
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
}

export class IndicaApiError extends Error {
  public readonly code: string;
  public readonly status: number;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "IndicaApiError";
    this.code = error.code;
    this.status = error.status;
  }
}

export function createClient(options: ApiClientOptions) {
  const { baseUrl, credentials = "include", headers = {} } = options;

  async function request<T>(
    path: string,
    init?: RequestInit
  ): Promise<T> {
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, {
      ...init,
      credentials,
      headers: {
        "Content-Type": "application/json",
        ...headers,
        ...init?.headers,
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({
        message: response.statusText,
        code: "UNKNOWN_ERROR",
        status: response.status,
      }));
      throw new IndicaApiError(errorBody as ApiError);
    }

    // 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  return {
    get: <T>(path: string, init?: RequestInit) =>
      request<T>(path, { ...init, method: "GET" }),

    post: <T>(path: string, body?: unknown, init?: RequestInit) =>
      request<T>(path, {
        ...init,
        method: "POST",
        body: body ? JSON.stringify(body) : undefined,
      }),

    put: <T>(path: string, body?: unknown, init?: RequestInit) =>
      request<T>(path, {
        ...init,
        method: "PUT",
        body: body ? JSON.stringify(body) : undefined,
      }),

    patch: <T>(path: string, body?: unknown, init?: RequestInit) =>
      request<T>(path, {
        ...init,
        method: "PATCH",
        body: body ? JSON.stringify(body) : undefined,
      }),

    delete: <T>(path: string, init?: RequestInit) =>
      request<T>(path, { ...init, method: "DELETE" }),
  };
}

export type ApiClient = ReturnType<typeof createClient>;
