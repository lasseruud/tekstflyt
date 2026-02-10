import { fetchApi } from './client'

export interface AdminUser {
  id: number
  username: string
  display_name: string
  email: string
  role: 'user' | 'admin'
  last_login: string | null
  created_at: string
}

export interface CreateUserRequest {
  username: string
  password: string
  display_name: string
  email: string
  role: 'user' | 'admin'
}

export interface UpdateUserRequest {
  display_name: string
  email: string
  role: 'user' | 'admin'
  password?: string
}

export async function listUsers(): Promise<AdminUser[]> {
  return fetchApi<AdminUser[]>('/api/admin/users')
}

export async function createUser(data: CreateUserRequest): Promise<AdminUser> {
  return fetchApi<AdminUser>('/api/admin/users', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function updateUser(id: number, data: UpdateUserRequest): Promise<AdminUser> {
  return fetchApi<AdminUser>(`/api/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function deleteUser(id: number): Promise<void> {
  return fetchApi<void>(`/api/admin/users/${id}`, { method: 'DELETE' })
}
