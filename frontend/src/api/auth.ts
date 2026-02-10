import { fetchApi } from './client'

export interface User {
  id: number
  username: string
  display_name: string
  email: string
  role: 'user' | 'admin'
}

export interface LoginRequest {
  username: string
  password: string
}

export async function login(data: LoginRequest): Promise<User> {
  return fetchApi<User>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function logout(): Promise<void> {
  return fetchApi<void>('/api/auth/logout', { method: 'POST' })
}

export async function getMe(): Promise<User> {
  return fetchApi<User>('/api/auth/me')
}
