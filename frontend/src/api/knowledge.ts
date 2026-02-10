import { fetchApi } from './client'

export interface KnowledgeDocument {
  id: number
  filename: string
  category: string
  description: string | null
  uploaded_by: number
  uploaded_at: string
  chunk_count: number
}

export interface KnowledgeChunk {
  id: number
  chunk_index: number
  content: string
  metadata: Record<string, unknown> | null
}

export interface SearchResult {
  content: string
  filename: string
  category: string
  similarity: number
}

export async function listKnowledge(): Promise<KnowledgeDocument[]> {
  return fetchApi<KnowledgeDocument[]>('/api/admin/knowledge')
}

export async function deleteKnowledge(id: number): Promise<void> {
  return fetchApi<void>(`/api/admin/knowledge/${id}`, { method: 'DELETE' })
}

export async function getChunks(id: number): Promise<KnowledgeChunk[]> {
  return fetchApi<KnowledgeChunk[]>(`/api/admin/knowledge/${id}/chunks`)
}

export async function searchKnowledge(query: string): Promise<SearchResult[]> {
  return fetchApi<SearchResult[]>(`/api/admin/knowledge/search?q=${encodeURIComponent(query)}`)
}

export async function uploadKnowledge(file: File, category: string, description: string): Promise<KnowledgeDocument> {
  const API_BASE = import.meta.env.VITE_API_URL || ''
  const formData = new FormData()
  formData.append('file', file)
  formData.append('category', category)
  formData.append('description', description)

  const csrfMatch = document.cookie.match(/(?:^|; )csrf_token=([^;]*)/)
  const headers: Record<string, string> = {}
  if (csrfMatch) headers['X-CSRF-Token'] = csrfMatch[1]

  const res = await fetch(`${API_BASE}/api/admin/knowledge`, {
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
