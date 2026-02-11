import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFinalizeDocument, useEmailDocument } from '../../hooks/useDocuments'
import { getDownloadUrl } from '../../api/documents'
import type { Document } from '../../api/documents'
import { DOC_TYPE_LABELS } from '../../utils/format'
import { downloadFile } from '../../utils/download'

interface Props {
  doc: Document
}

export default function Step5Complete({ doc }: Props) {
  const navigate = useNavigate()
  const finalizeMutation = useFinalizeDocument()
  const emailMutation = useEmailDocument()
  const [emailSent, setEmailSent] = useState(false)
  const [localDoc, setLocalDoc] = useState(doc)

  const isFinalized = localDoc.status === 'finalized'

  async function handleFinalize() {
    const updated = await finalizeMutation.mutateAsync(localDoc.id)
    setLocalDoc(updated)
  }

  async function handleEmail() {
    await emailMutation.mutateAsync(localDoc.id)
    setEmailSent(true)
  }

  return (
    <div className="text-center">
      {!isFinalized ? (
        <>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Fullfør dokumentet
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Klikk for å generere Word- og PDF-filer. Dokumentet vil bli låst etter fullføring.
          </p>

          {finalizeMutation.isError && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              Fullføring feilet. Prøv igjen.
            </p>
          )}

          <button
            onClick={handleFinalize}
            disabled={finalizeMutation.isPending}
            className="px-8 py-3 bg-kvtas-500 hover:bg-kvtas-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors cursor-pointer"
          >
            {finalizeMutation.isPending ? 'Genererer filer...' : 'Fullfør og generer filer'}
          </button>
        </>
      ) : (
        <>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {DOC_TYPE_LABELS[localDoc.document_type]} fullført!
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {localDoc.document_name}
          </p>

          {/* PDF generation warning */}
          {!localDoc.file_path_pdf && localDoc.file_path_word && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
              PDF-filer kunne ikke genereres. Last ned Word-filene i stedet.
            </p>
          )}

          {/* Download buttons */}
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mb-6">
            {localDoc.file_path_word && (
              <DownloadButton
                href={getDownloadUrl(localDoc.id, 'word')}
                label="Word"
              />
            )}
            {localDoc.file_path_word_signed && (
              <DownloadButton
                href={getDownloadUrl(localDoc.id, 'word_signed')}
                label="Word (signert)"
              />
            )}
            {localDoc.file_path_pdf && (
              <DownloadButton
                href={getDownloadUrl(localDoc.id, 'pdf')}
                label="PDF"
              />
            )}
            {localDoc.file_path_pdf_signed && (
              <DownloadButton
                href={getDownloadUrl(localDoc.id, 'pdf_signed')}
                label="PDF (signert)"
              />
            )}
          </div>

          {/* Email button */}
          <div className="mb-8">
            {emailSent ? (
              <p className="text-sm text-green-600 dark:text-green-400">
                Dokumenter sendt til din e-post!
              </p>
            ) : (
              <button
                onClick={handleEmail}
                disabled={emailMutation.isPending}
                className="px-6 py-2 border border-kvtas-500 text-kvtas-600 dark:text-kvtas-400 hover:bg-kvtas-50 dark:hover:bg-kvtas-900/20 text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {emailMutation.isPending ? 'Sender...' : 'Send på e-post'}
              </button>
            )}
            {emailMutation.isError && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                Kunne ikke sende e-post. Last ned filene manuelt.
              </p>
            )}
          </div>

          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            Tilbake til dashboard
          </button>
        </>
      )}
    </div>
  )
}

function DownloadButton({ href, label }: { href: string; label: string }) {
  const ext = label.toLowerCase().includes('pdf') ? '.pdf' : '.docx'
  const filename = `${label}${ext}`

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    downloadFile(href, filename)
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-kvtas-300 dark:hover:border-kvtas-700 transition-colors cursor-pointer"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      {label}
    </button>
  )
}
