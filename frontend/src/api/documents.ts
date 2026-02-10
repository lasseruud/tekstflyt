import { fetchApi } from './client'

export interface Document {
  id: number
  user_id: number
  customer_id: number | null
  document_type: 'tilbud' | 'brev' | 'notat' | 'omprofilering' | 'svar_paa_brev'
  document_name: string
  recipient_name: string | null
  recipient_address: string | null
  recipient_postal_code: string | null
  recipient_city: string | null
  recipient_person: string | null
  recipient_phone: string | null
  recipient_email: string | null
  customer_type: 'business' | 'private' | null
  price_product: number | null
  price_installation: number | null
  document_text: string | null
  ai_prompt: string | null
  ai_model: string | null
  status: 'draft' | 'finalized'
  file_path_word: string | null
  file_path_word_signed: string | null
  file_path_pdf: string | null
  file_path_pdf_signed: string | null
  file_path_attachment: string | null
  created_at: string
  updated_at: string
  finalized_at: string | null
}

export interface CreateDocumentRequest {
  document_type: Document['document_type']
  document_name?: string
  customer_id?: number
  recipient_name?: string
  recipient_address?: string
  recipient_postal_code?: string
  recipient_city?: string
  recipient_person?: string
  recipient_phone?: string
  recipient_email?: string
  customer_type?: 'business' | 'private'
  price_product?: number
  price_installation?: number
}

export async function listDocuments(search?: string, type?: string): Promise<Document[]> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (type) params.set('type', type)
  const qs = params.toString()
  return fetchApi<Document[]>(`/api/documents${qs ? `?${qs}` : ''}`)
}

export async function getDocument(id: number): Promise<Document> {
  return fetchApi<Document>(`/api/documents/${id}`)
}

export async function createDocument(data: CreateDocumentRequest): Promise<Document> {
  return fetchApi<Document>('/api/documents', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateDocument(id: number, data: Partial<Document>): Promise<Document> {
  return fetchApi<Document>(`/api/documents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteDocument(id: number): Promise<void> {
  return fetchApi<void>(`/api/documents/${id}`, { method: 'DELETE' })
}

export async function generateText(id: number, prompt?: string): Promise<Document> {
  return fetchApi<Document>(`/api/documents/${id}/generate`, {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  })
}

export async function finalizeDocument(id: number): Promise<Document> {
  return fetchApi<Document>(`/api/documents/${id}/finalize`, { method: 'POST' })
}

export async function cloneDocument(id: number): Promise<Document> {
  return fetchApi<Document>(`/api/documents/${id}/clone`, { method: 'POST' })
}

export async function emailDocument(id: number): Promise<{ message: string }> {
  return fetchApi<{ message: string }>(`/api/documents/${id}/email`, { method: 'POST' })
}

export function getDownloadUrl(id: number, type: 'word' | 'word_signed' | 'pdf' | 'pdf_signed'): string {
  const base = import.meta.env.VITE_API_URL || ''
  return `${base}/api/documents/${id}/download/${type}`
}
