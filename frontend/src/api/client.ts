const API_BASE = import.meta.env.VITE_API_URL || ''

// CSRF token stored in memory (returned from login/me endpoints)
let _csrfToken: string | undefined

export function setCsrfToken(token: string | undefined) {
  _csrfToken = token
}

export function getCsrfToken(): string | undefined {
  return _csrfToken
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function fetchApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const csrfHeaders: Record<string, string> = {}
  const method = options.method?.toUpperCase()
  if (method && method !== 'GET' && method !== 'HEAD') {
    if (_csrfToken) csrfHeaders['X-CSRF-Token'] = _csrfToken
  }

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders,
      ...options.headers,
    },
    ...options,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, body.error || res.statusText)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}
