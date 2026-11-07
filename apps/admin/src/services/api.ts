const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

let getClerkToken: (() => Promise<string | null>) | null = null;

export function setTokenGetter(getter: () => Promise<string | null>) {
  getClerkToken = getter;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiRequest<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, window.location.origin);

  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const headers = new Headers(options.headers || {});

  // Add Clerk token if available
  if (getClerkToken) {
    try {
      const token = await getClerkToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    } catch {
      // Session token retrieval handled gracefully
    }
  }

  // Set default Content-Type for JSON payloads
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('X-Correlation-Id', crypto.randomUUID());

  const response = await fetch(url.toString(), {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorPayload: any;
    try {
      errorPayload = await response.json();
    } catch {
      errorPayload = { error: { message: response.statusText || 'An error occurred' } };
    }
    const message = errorPayload?.error?.message || `Request failed with status ${response.status}`;
    const error = new Error(message) as any;
    error.statusCode = response.status;
    error.code = errorPayload?.error?.code;
    throw error;
  }

  // Return null for 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}
