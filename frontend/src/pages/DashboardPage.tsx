import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDocuments } from '../hooks/useDocuments'
import DocumentCard from '../components/DocumentCard'
import SearchBar from '../components/SearchBar'
import { DOC_TYPE_LABELS } from '../utils/format'

const TYPES = ['', 'tilbud', 'brev', 'notat', 'omprofilering', 'svar_paa_brev', 'serviceavtale'] as const

export default function DashboardPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const { data: documents, isLoading } = useDocuments(search || undefined, typeFilter || undefined)

  const handleSearch = useCallback((value: string) => setSearch(value), [])

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Mine dokumenter
        </h1>
        <button
          onClick={() => navigate('/ny')}
          className="px-4 py-2 bg-kvtas-500 hover:bg-kvtas-600 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          + Nytt dokument
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <SearchBar value={search} onChange={handleSearch} placeholder="Søk i dokumenter..." />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-kvtas-500"
        >
          <option value="">Alle typer</option>
          {TYPES.filter(Boolean).map((t) => (
            <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-400 dark:text-gray-600">Laster dokumenter...</p>
      ) : !documents || documents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            {search || typeFilter ? 'Ingen dokumenter funnet.' : 'Ingen dokumenter ennå.'}
          </p>
          {!search && !typeFilter && (
            <button
              onClick={() => navigate('/ny')}
              className="px-4 py-2 bg-kvtas-500 hover:bg-kvtas-600 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              Opprett ditt første dokument
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </div>
      )}
    </div>
  )
}
