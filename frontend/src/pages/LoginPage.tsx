import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login({ username, password })
    } catch {
      setError('Feil brukernavn eller passord')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Header with logos */}
      <header className="flex items-center justify-between px-8 pt-8">
        <div className="text-2xl font-bold text-kvtas-500 dark:text-kvtas-400 tracking-tight">
          TekstFlyt
        </div>
        <img
          src="/logo-kvtas-light.png"
          alt="KVTAS"
          className="h-10 dark:hidden"
        />
        <img
          src="/logo-kvtas-dark.png"
          alt="KVTAS"
          className="h-10 hidden dark:block"
        />
      </header>

      {/* Centered login form */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 text-center mb-8">
            Logg inn
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Brukernavn
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-kvtas-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Passord
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-kvtas-500 focus:border-transparent"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-kvtas-500 hover:bg-kvtas-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors cursor-pointer"
            >
              {loading ? 'Logger inn...' : 'Logg inn'}
            </button>
          </form>
        </div>
      </main>

      <footer className="text-center text-xs text-gray-400 dark:text-gray-600 pb-4">
        TekstFlyt v2 &middot; Kulde- & Varmepumpeteknikk AS
      </footer>
    </div>
  )
}
