import { getCsrfToken } from './client'

const API_BASE = import.meta.env.VITE_API_URL || ''

export interface UploadResult {
  filename: string
  stored_name: string
  path: string
  size: number
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const formData = new FormData()
  formData.append('file', file)

  const headers: Record<string, string> = {}
  const csrf = getCsrfToken()
  if (csrf) headers['X-CSRF-Token'] = csrf

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: formData,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(body.error || res.statusText)
  }

  return res.json()
}
