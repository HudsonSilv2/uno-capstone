const API_BASE_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api`;

const TOKEN_KEY = 'uno.token';

/*
  API error with the HTTP status preserved. The screens use the status to decide
  what to do (401 drops the session, 403/400 become a message for the player)
  and the message always comes from the back-end's `error` field.
*/
export class ApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/*
  A 401 on an authenticated route means the stored token is no longer valid (it
  expired, or a logout invalidated it). Left untreated, the screen just repeated
  the error message on every poll while the client still considered the session
  active. AuthProvider registers here what to do in that case.
*/
type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

export const tokenStorage = {
  get(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
  },
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  /* Public routes (sign-in and sign-up) must not send the Authorization header. */
  auth?: boolean;
  signal?: AbortSignal;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const token = auth ? tokenStorage.get() : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError('Não foi possível falar com o servidor. Ele está rodando?', 0);
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : null) ?? `Falha na requisição (HTTP ${response.status})`;

    /*
      Only drop the session when it was the token we sent that got rejected. The
      401 from signing in with a wrong password does not reach this branch,
      because that route is public.
    */
    if (response.status === 401 && token) {
      tokenStorage.clear();
      onUnauthorized?.();
    }

    throw new ApiError(message, response.status);
  }

  return payload as T;
}
