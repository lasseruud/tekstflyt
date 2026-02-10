import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useDarkMode } from '../hooks/useDarkMode'

export default function LoginPage() {
  const { login } = useAuth()
  const [dark, toggleDark] = useDarkMode()
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
        <img
          src="/logo-tekstflyt-light.png"
          alt="TekstFlyt"
          className="h-10 dark:hidden"
        />
        <img
          src="/logo-tekstflyt-dark.png"
          alt="TekstFlyt"
          className="h-10 hidden dark:block"
        />
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

      <footer className="flex items-center justify-between px-8 pb-4">
        <span className="text-xs text-gray-400 dark:text-gray-600">
          TekstFlyt v2 &middot; Kulde- &amp; Varmepumpeteknikk AS
        </span>
        <button
          onClick={toggleDark}
          className="p-2 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          title={dark ? 'Light mode' : 'Dark mode'}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
      </footer>
    </div>
  )
}

function SunIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  )
}
