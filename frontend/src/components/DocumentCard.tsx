import { useNavigate } from 'react-router-dom'
import type { Document } from '../api/documents'
import { getDownloadUrl } from '../api/documents'
import { formatDateTime, DOC_TYPE_LABELS, DOC_TYPE_COLORS } from '../utils/format'
import { downloadFile } from '../utils/download'
import { useDeleteDocument, useCloneDocument } from '../hooks/useDocuments'

export default function DocumentCard({ doc }: { doc: Document }) {
  const navigate = useNavigate()
  const deleteMutation = useDeleteDocument()
  const cloneMutation = useCloneDocument()

  function handleClick() {
    if (doc.status === 'draft') {
      navigate(`/wizard/${doc.id}`)
    }
  }

  function handleClone(e: React.MouseEvent) {
    e.stopPropagation()
    cloneMutation.mutate(doc.id, {
      onSuccess: (cloned) => navigate(`/wizard/${cloned.id}`),
    })
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (confirm('Er du sikker på at du vil slette dette dokumentet?')) {
      deleteMutation.mutate(doc.id)
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 transition-colors ${
        doc.status === 'draft' ? 'cursor-pointer hover:border-kvtas-300 dark:hover:border-kvtas-700' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DOC_TYPE_COLORS[doc.document_type]}`}>
              {DOC_TYPE_LABELS[doc.document_type]}
            </span>
            {doc.status === 'finalized' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                Fullført
              </span>
            )}
          </div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {doc.document_name}
          </h3>
          {doc.recipient_name && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {doc.recipient_name}
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
            {formatDateTime(doc.updated_at)}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {doc.status === 'finalized' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                downloadFile(getDownloadUrl(doc.id, 'pdf'), `${doc.document_name}.pdf`)
              }}
              className="p-1.5 text-gray-400 hover:text-kvtas-500 transition-colors cursor-pointer"
              title="Last ned PDF"
            >
              <DownloadIcon />
            </button>
          )}
          <button
            onClick={handleClone}
            className="p-1.5 text-gray-400 hover:text-kvtas-500 transition-colors cursor-pointer"
            title="Bruk som utgangspunkt"
          >
            <CopyIcon />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
            title="Slett"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

function DownloadIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  )
}
