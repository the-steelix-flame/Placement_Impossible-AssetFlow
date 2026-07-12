// ============================================================
// API fetch wrapper & error handling
// Dev B owns this file — placeholder stub until SYNC 1 merge.
// ============================================================

import type { ConflictError } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: any,
    message: string = "An API error occurred"
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  
  // In a real app, Dev B will attach the Supabase JWT here
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    if (response.status === 409) {
      throw new ConflictApiError(errorData as ConflictError);
    }
    
    throw new ApiError(response.status, errorData, errorData.detail || response.statusText);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}
