/**
 * API Client Utility
 * Handles all API communication with proper error handling and token management
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
    public data?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiCall<T = any>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    body?: any;
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
  get: <T = any>(endpoint: string, token?: string) =>
    apiCall<T>(endpoint, { method: "GET", token }),

  post: <T = any>(endpoint: string, body?: any, token?: string) =>
    apiCall<T>(endpoint, { method: "POST", body, token }),

  put: <T = any>(endpoint: string, body?: any, token?: string) =>
    apiCall<T>(endpoint, { method: "PUT", body, token }),

  delete: <T = any>(endpoint: string, token?: string) =>
    apiCall<T>(endpoint, { method: "DELETE", token }),

  patch: <T = any>(endpoint: string, body?: any, token?: string) =>
    apiCall<T>(endpoint, { method: "PATCH", body, token }),
};
