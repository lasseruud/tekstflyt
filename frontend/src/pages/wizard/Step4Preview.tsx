import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useUpdateDocument, useGenerateText } from '../../hooks/useDocuments'
import PriceSection from '../../components/PriceSection'
import LoadingOverlay from '../../components/LoadingOverlay'
import type { Document } from '../../api/documents'
import { DOC_TYPE_LABELS } from '../../utils/format'

interface Props {
  doc: Document
  onUpdated: (doc: Document) => void
  onNext: () => void
  onPrev: () => void
}

export default function Step4Preview({ doc, onUpdated, onNext, onPrev }: Props) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(doc.document_text || '')
  const [updatePrompt, setUpdatePrompt] = useState('')
  const updateMutation = useUpdateDocument()
  const generateMutation = useGenerateText()

  async function handleSaveText() {
    const updated = await updateMutation.mutateAsync({
      id: doc.id,
      data: { document_text: text },
    })
    onUpdated(updated)
    setEditing(false)
  }

  async function handleRegenerate() {
    if (!updatePrompt.trim()) return
    const updated = await generateMutation.mutateAsync({ id: doc.id, prompt: updatePrompt })
    onUpdated(updated)
    setText(updated.document_text || '')
    setUpdatePrompt('')
  }

  async function handleNext() {
    // Save any text changes before proceeding
    if (text !== doc.document_text) {
      const updated = await updateMutation.mutateAsync({
        id: doc.id,
        data: { document_text: text },
      })
      onUpdated(updated)
    }
    onNext()
  }

  return (
    <div>
      {generateMutation.isPending && <LoadingOverlay />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {DOC_TYPE_LABELS[doc.document_type]} - Forhåndsvisning
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Se over og rediger teksten. Generer på nytt ved behov.
          </p>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
        >
          {editing ? 'Forhåndsvis' : 'Rediger'}
        </button>
      </div>

      {/* Preview / Editor */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6 mb-4 min-h-[300px]">
        {editing ? (
          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={20}
              className="w-full bg-transparent text-gray-900 dark:text-gray-100 text-sm font-mono focus:outline-none resize-y"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={handleSaveText}
                disabled={updateMutation.isPending}
                className="px-4 py-1.5 bg-kvtas-500 hover:bg-kvtas-600 text-white text-sm rounded-lg transition-colors cursor-pointer"
              >
                Lagre endringer
              </button>
            </div>
          </div>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{text || '*Ingen tekst generert ennå*'}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Regenerate section */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Oppdater teksten
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={updatePrompt}
            onChange={(e) => setUpdatePrompt(e.target.value)}
            placeholder='F.eks. "Legg til info om montering" eller "Gjør tonen mer formell"'
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-kvtas-500"
          />
          <button
            onClick={handleRegenerate}
            disabled={!updatePrompt.trim() || generateMutation.isPending}
            className="px-4 py-2 bg-kvtas-500 hover:bg-kvtas-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            Oppdater
          </button>
        </div>
      </div>

      {/* Price section for tilbud */}
      {doc.document_type === 'tilbud' && (
        <PriceSection
          priceProduct={doc.price_product}
          priceInstallation={doc.price_installation}
          customerType={doc.customer_type}
          readonly
        />
      )}

      {/* AI model info */}
      {doc.ai_model && (
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-2">
          Generert med {doc.ai_model}
        </p>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={onPrev}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors cursor-pointer"
        >
          Tilbake
        </button>
        <button
          onClick={handleNext}
          disabled={!text || updateMutation.isPending}
          className="px-6 py-2 bg-kvtas-500 hover:bg-kvtas-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          Fullfør dokument
        </button>
      </div>
    </div>
  )
}
