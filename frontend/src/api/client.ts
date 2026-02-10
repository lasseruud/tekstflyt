const API_BASE = import.meta.env.VITE_API_URL || ''

function getCsrfToken(): string | undefined {
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/)
  return match ? match[1] : undefined
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
    const csrf = getCsrfToken()
    if (csrf) csrfHeaders['X-CSRF-Token'] = csrf
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
