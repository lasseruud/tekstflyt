import { fetchApi } from './client'

export interface Customer {
  id: number
  name: string
  address: string | null
  postal_code: string | null
  city: string | null
  contact_person: string | null
  phone: string | null
  email: string | null
  customer_type: 'business' | 'private'
  created_at: string
  updated_at: string
}

export async function searchCustomers(query?: string, limit?: number): Promise<Customer[]> {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (limit) params.set('limit', String(limit))
  const qs = params.toString()
  return fetchApi<Customer[]>(`/api/customers${qs ? `?${qs}` : ''}`)
}

export async function getCustomer(id: number): Promise<Customer> {
  return fetchApi<Customer>(`/api/customers/${id}`)
}

export async function createCustomer(data: Partial<Customer>): Promise<Customer> {
  return fetchApi<Customer>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateCustomer(id: number, data: Partial<Customer>): Promise<Customer> {
  return fetchApi<Customer>(`/api/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}
