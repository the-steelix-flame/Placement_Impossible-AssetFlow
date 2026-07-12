import { getApiBaseUrl } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import type { ConflictError } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    message: string = "An API error occurred",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ConflictApiError extends ApiError {
  constructor(public conflictData: ConflictError) {
    super(409, conflictData, conflictData.detail);
    this.name = "ConflictApiError";
  }
}

type JsonBody = Record<string, unknown> | unknown[] | null | undefined;
type ApiRequestInit = Omit<RequestInit, "body"> & {
  body?: BodyInit | JsonBody;
};

export async function fetchApi<T>(endpoint: string, options: ApiRequestInit = {}): Promise<T> {
  const normalizedEndpoint = endpoint.startsWith("/api/v1/")
    ? endpoint.slice("/api/v1".length)
    : endpoint;
  const url = `${getApiBaseUrl()}${normalizedEndpoint.startsWith("/") ? normalizedEndpoint : `/${normalizedEndpoint}`}`;
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;
  const isBodyInit =
    typeof options.body === "string" ||
    options.body instanceof Blob ||
    options.body instanceof ArrayBuffer ||
    options.body instanceof URLSearchParams ||
    options.body instanceof ReadableStream;

  if (!isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const body =
    isFormData || isBodyInit || options.body == null
      ? (options.body as BodyInit | null | undefined)
      : JSON.stringify(options.body);

  const response = await fetch(url, { ...options, body, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    if (response.status === 409) {
      throw new ConflictApiError(errorData as ConflictError);
    }

    const message =
      typeof errorData === "object" &&
      errorData !== null &&
      "detail" in errorData &&
      typeof errorData.detail === "string"
        ? errorData.detail
        : response.statusText;

    throw new ApiError(response.status, errorData, message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => fetchApi<T>(endpoint),
  post: <T>(endpoint: string, body?: JsonBody) => fetchApi<T>(endpoint, { method: "POST", body }),
  patch: <T>(endpoint: string, body?: JsonBody) => fetchApi<T>(endpoint, { method: "PATCH", body }),
  delete: <T>(endpoint: string) => fetchApi<T>(endpoint, { method: "DELETE" }),
};
