/**
 * API Client Utility
 * Handles all API communication with proper error handling and token management
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Generic default must stay `any` (not `unknown`) so callers that omit the
// type param keep inferring their SWR/response shape from context instead of
// collapsing to `unknown`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see ApiResponse above
export async function apiCall<T = any>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    body?: unknown;
    headers?: Record<string, string>;
    token?: string;
  } = {}
): Promise<T> {
  const { method = "GET", body, headers = {}, token } = options;

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE_URL}${endpoint}`;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  };

  if (body) {
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message =
        (typeof errorData.error === "string" ? errorData.error : errorData.error?.message) ||
        `HTTP ${response.status}`;
      throw new ApiError(response.status, message, errorData);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, error instanceof Error ? error.message : "Unknown error");
  }
}

// Convenience methods
export const api = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get: <T = any>(endpoint: string, token?: string) =>
    apiCall<T>(endpoint, { method: "GET", token }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post: <T = any>(endpoint: string, body?: unknown, token?: string) =>
    apiCall<T>(endpoint, { method: "POST", body, token }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  put: <T = any>(endpoint: string, body?: unknown, token?: string) =>
    apiCall<T>(endpoint, { method: "PUT", body, token }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete: <T = any>(endpoint: string, token?: string) =>
    apiCall<T>(endpoint, { method: "DELETE", token }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  patch: <T = any>(endpoint: string, body?: unknown, token?: string) =>
    apiCall<T>(endpoint, { method: "PATCH", body, token }),
};
