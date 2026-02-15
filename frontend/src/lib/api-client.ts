/**
 * Base API client for communicating with the backend.
 * In production, this will use auto-generated types from OpenAPI.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly body: unknown,
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    throw new ApiError(response.status, response.statusText, body);
  }
  return response.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  return handleResponse<T>(response);
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(response);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

export async function apiDelete(path: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    throw new ApiError(response.status, response.statusText, body);
  }
}

/** Health check */
export async function checkHealth(): Promise<{ status: string }> {
  return apiGet<{ status: string }>('/health');
}

/** Response from the Expert AI move endpoint */
export interface AiMoveResponse {
  notation: string;
  from: number;
  to: number;
  capturedSquares: number[];
  score: number;
  depthReached: number;
  timeConsumedMs: number;
}

/** Request an AI move from the backend Expert AI engine */
export async function requestAiMove(
  board: number[],
  currentPlayer: string,
  difficulty: string,
  timeLimitMs?: number,
): Promise<AiMoveResponse> {
  return apiPost<AiMoveResponse>('/ai/move', {
    board,
    currentPlayer,
    difficulty,
    timeLimitMs,
  });
}

/** Convenience object wrapping the standalone API functions */
export const apiClient = {
  get: apiGet,
  post: apiPost,
  patch: apiPatch,
  delete: apiDelete,
} as const;
