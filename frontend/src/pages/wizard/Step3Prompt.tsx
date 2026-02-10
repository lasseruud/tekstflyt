import { useState } from 'react'
import { useUpdateDocument, useGenerateText } from '../../hooks/useDocuments'
import FileUpload from '../../components/FileUpload'
import LoadingOverlay from '../../components/LoadingOverlay'
import type { Document } from '../../api/documents'
import type { UploadResult } from '../../api/upload'
import { DOC_TYPE_LABELS } from '../../utils/format'

interface Props {
  doc: Document
  onUpdated: (doc: Document) => void
  onNext: () => void
  onPrev: () => void
}

export default function Step3Prompt({ doc, onUpdated, onNext, onPrev }: Props) {
  const [prompt, setPrompt] = useState(doc.ai_prompt || '')
  const updateMutation = useUpdateDocument()
  const generateMutation = useGenerateText()

  const requiresAttachment = ['omprofilering', 'svar_paa_brev'].includes(doc.document_type)
  const requiresPrompt = doc.document_type !== 'omprofilering'

  async function handleUpload(result: UploadResult) {
    const updated = await updateMutation.mutateAsync({
      id: doc.id,
      data: { file_path_attachment: result.path },
    })
    onUpdated(updated)
  }

  async function handleGenerate() {
    // Save prompt first
    await updateMutation.mutateAsync({ id: doc.id, data: { ai_prompt: prompt } })
    // Generate text
    const updated = await generateMutation.mutateAsync({ id: doc.id, prompt })
    onUpdated(updated)
    onNext()
  }

  const canGenerate = (!requiresPrompt || prompt.trim()) &&
    (!requiresAttachment || doc.file_path_attachment)

  return (
    <div>
      {generateMutation.isPending && <LoadingOverlay />}

      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {DOC_TYPE_LABELS[doc.document_type]} - Instruksjon
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {doc.document_type === 'omprofilering'
          ? 'Last opp dokumentet som skal omprofileres.'
          : 'Beskriv hva dokumentet skal inneholde.'}
      </p>

      <div className="space-y-4">
        {/* File upload for types that need it */}
        {(requiresAttachment || ['tilbud', 'brev'].includes(doc.document_type)) && (
          <FileUpload
            onUpload={handleUpload}
            required={requiresAttachment}
          />
        )}

        {/* Prompt textarea */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Instruksjoner til AI {requiresPrompt && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            placeholder={
              doc.document_type === 'tilbud'
                ? 'Beskriv hva tilbudet gjelder, f.eks. "Tilbud på Daikin Stylish varmepumpe, 4 stk, med montering"'
                : doc.document_type === 'omprofilering'
                ? 'Valgfritt: Tilleggsinstruksjoner for omprofileringen'
                : doc.document_type === 'svar_paa_brev'
                ? 'Beskriv hva svaret skal inneholde, f.eks. "Takk for brevet, bekreft at vi kan levere i uke 12"'
                : 'Beskriv hva dokumentet skal inneholde...'
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-kvtas-500 focus:border-transparent resize-y"
          />
        </div>

        {generateMutation.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Generering feilet. Prøv igjen.
          </p>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={onPrev}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors cursor-pointer"
        >
          Tilbake
        </button>
        <button
          onClick={handleGenerate}
          disabled={!canGenerate || generateMutation.isPending}
          className="px-6 py-2 bg-kvtas-500 hover:bg-kvtas-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          Generer tekst
        </button>
      </div>
    </div>
  )
}
