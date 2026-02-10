import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listUsers, createUser, updateUser, deleteUser } from '../api/admin'
import { listKnowledge, deleteKnowledge, uploadKnowledge, searchKnowledge } from '../api/knowledge'
import type { AdminUser, CreateUserRequest } from '../api/admin'
import type { KnowledgeDocument } from '../api/knowledge'
import { formatDateTime } from '../utils/format'

type Tab = 'users' | 'knowledge'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users')

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
        Admin
      </h1>

      <div className="flex gap-1 mb-6">
        {(['users', 'knowledge'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              tab === t
                ? 'bg-kvtas-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {t === 'users' ? 'Brukere' : 'Kunnskapsbase'}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'knowledge' && <KnowledgeTab />}
    </div>
  )
}

// --- Users Tab ---

function UsersTab() {
  const qc = useQueryClient()
  const { data: users, isLoading } = useQuery({ queryKey: ['admin', 'users'], queryFn: listUsers })
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [creating, setCreating] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })

  if (isLoading) return <p className="text-gray-400">Laster brukere...</p>

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Brukere</h2>
        <button
          onClick={() => setCreating(true)}
          className="px-3 py-1.5 bg-kvtas-500 hover:bg-kvtas-600 text-white text-sm rounded-lg transition-colors cursor-pointer"
        >
          + Ny bruker
        </button>
      </div>

      {creating && <UserForm onDone={() => setCreating(false)} />}
      {editing && <UserForm user={editing} onDone={() => setEditing(null)} />}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Navn</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Brukernavn</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">E-post</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Rolle</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Siste innlogging</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {users?.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{u.display_name}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.username}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 dark:text-gray-600 text-xs">
                  {u.last_login ? formatDateTime(u.last_login) : 'Aldri'}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setEditing(u)}
                    className="text-xs text-kvtas-500 hover:text-kvtas-700 mr-2 cursor-pointer"
                  >
                    Rediger
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Slett ${u.display_name}?`)) deleteMutation.mutate(u.id)
                    }}
                    className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                  >
                    Slett
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UserForm({ user, onDone }: { user?: AdminUser; onDone: () => void }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<CreateUserRequest>({
    username: user?.username || '',
    password: '',
    display_name: user?.display_name || '',
    email: user?.email || '',
    role: user?.role || 'user',
  })
  const [error, setError] = useState('')

  const createMutation = useMutation({
    mutationFn: (data: CreateUserRequest) => createUser(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); onDone() },
    onError: (e) => setError(e.message),
  })
  const updateMutation = useMutation({
    mutationFn: (data: CreateUserRequest) => updateUser(user!.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'users'] }); onDone() },
    onError: (e) => setError(e.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (user) {
      updateMutation.mutate(form)
    } else {
      createMutation.mutate(form)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4 space-y-3">
      <h3 className="font-medium text-gray-900 dark:text-gray-100">
        {user ? 'Rediger bruker' : 'Ny bruker'}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <input
          value={form.display_name}
          onChange={(e) => setForm({ ...form, display_name: e.target.value })}
          placeholder="Navn"
          required
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
        />
        <input
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          placeholder="Brukernavn"
          required
          disabled={!!user}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm disabled:opacity-50"
        />
        <input
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="E-post"
          type="email"
          required
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
        />
        <input
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder={user ? 'Nytt passord (valgfritt)' : 'Passord'}
          type="password"
          required={!user}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
        />
      </div>
      <div className="flex items-center gap-3">
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as 'user' | 'admin' })}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
        >
          <option value="user">Bruker</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-kvtas-500 hover:bg-kvtas-600 text-white text-sm rounded-lg transition-colors cursor-pointer"
        >
          {user ? 'Oppdater' : 'Opprett'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 cursor-pointer"
        >
          Avbryt
        </button>
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  )
}

// --- Knowledge Tab ---

function KnowledgeTab() {
  const qc = useQueryClient()
  const { data: docs, isLoading } = useQuery({ queryKey: ['admin', 'knowledge'], queryFn: listKnowledge })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ content: string; filename: string; similarity: number }[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState('general')
  const [description, setDescription] = useState('')

  const deleteMutation = useMutation({
    mutationFn: deleteKnowledge,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'knowledge'] }),
  })

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadKnowledge(file, category, description)
      qc.invalidateQueries({ queryKey: ['admin', 'knowledge'] })
      setDescription('')
    } catch {
      alert('Opplasting feilet')
    } finally {
      setUploading(false)
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    const results = await searchKnowledge(searchQuery)
    setSearchResults(results)
  }

  if (isLoading) return <p className="text-gray-400">Laster kunnskapsbase...</p>

  return (
    <div className="space-y-6">
      {/* Upload */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Last opp nytt dokument</h3>
        <div className="flex gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Kategori</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
            >
              <option value="general">Generelt</option>
              <option value="daikin_luftluft">Daikin Luft-luft</option>
              <option value="daikin_luftvann">Daikin Luft-vann</option>
              <option value="firmadata">Firmadata</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Beskrivelse</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kort beskrivelse..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
            />
          </div>
          <label className={`px-4 py-2 bg-kvtas-500 hover:bg-kvtas-600 text-white text-sm rounded-lg transition-colors cursor-pointer ${uploading ? 'opacity-50' : ''}`}>
            {uploading ? 'Laster opp...' : 'Last opp PDF'}
            <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Document list */}
      <div>
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
          Dokumenter ({docs?.length || 0})
        </h3>
        {docs && docs.length > 0 ? (
          <div className="space-y-2">
            {docs.map((d: KnowledgeDocument) => (
              <div key={d.id} className="flex items-center justify-between bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{d.filename}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {d.category} &middot; {d.chunk_count} chunks &middot; {formatDateTime(d.uploaded_at)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Slett ${d.filename}?`)) deleteMutation.mutate(d.id)
                  }}
                  className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                >
                  Slett
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Ingen dokumenter i kunnskapsbasen.</p>
        )}
      </div>

      {/* Test search */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Test-søk</h3>
        <div className="flex gap-2 mb-3">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Søk i kunnskapsbasen..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-kvtas-500 hover:bg-kvtas-600 text-white text-sm rounded-lg cursor-pointer"
          >
            Søk
          </button>
        </div>
        {searchResults && (
          <div className="space-y-2">
            {searchResults.map((r, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded p-3">
                <p className="text-xs text-gray-400 mb-1">
                  {r.filename} &middot; {(r.similarity * 100).toFixed(1)}% match
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{r.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
