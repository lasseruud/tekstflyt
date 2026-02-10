import { fetchApi, setCsrfToken } from './client'

export interface User {
  id: number
  username: string
  display_name: string
  email: string
  role: 'user' | 'admin'
  csrf_token?: string
}

export interface LoginRequest {
  username: string
  password: string
}

export async function login(data: LoginRequest): Promise<User> {
  const user = await fetchApi<User>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (user.csrf_token) setCsrfToken(user.csrf_token)
  return user
}

export async function logout(): Promise<void> {
  const result = await fetchApi<void>('/api/auth/logout', { method: 'POST' })
  setCsrfToken(undefined)
  return result
}

export async function getMe(): Promise<User> {
  const user = await fetchApi<User>('/api/auth/me')
  if (user.csrf_token) setCsrfToken(user.csrf_token)
  return user
}
