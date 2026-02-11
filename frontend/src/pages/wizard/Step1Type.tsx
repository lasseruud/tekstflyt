import { useCreateDocument } from '../../hooks/useDocuments'
import type { Document } from '../../api/documents'

const DOC_TYPES = [
  {
    type: 'tilbud' as const,
    label: 'Tilbud',
    description: 'Salgstilbud med produktinfo, pris og MVA',
    icon: '📋',
  },
  {
    type: 'brev' as const,
    label: 'Brev',
    description: 'Formelt brev med mottakerinformasjon',
    icon: '✉️',
  },
  {
    type: 'notat' as const,
    label: 'Notat',
    description: 'Internt notat med minimal metadata',
    icon: '📝',
  },
  {
    type: 'omprofilering' as const,
    label: 'Omprofilering',
    description: 'Reprofilering av leverandørdokument til KVTAS',
    icon: '🔄',
  },
  {
    type: 'svar_paa_brev' as const,
    label: 'Svar på brev',
    description: 'Skriv svar på mottatt brev med KVTAS-profil',
    icon: '↩️',
  },
  {
    type: 'serviceavtale' as const,
    label: 'Serviceavtale',
    description: 'Serviceavtale med anleggsbeskrivelse og pris',
    icon: '🔧',
  },
]

interface Props {
  onCreated: (doc: Document) => void
}

export default function Step1Type({ onCreated }: Props) {
  const createMutation = useCreateDocument()

  async function handleSelect(type: (typeof DOC_TYPES)[number]['type']) {
    const doc = await createMutation.mutateAsync({ document_type: type })
    onCreated(doc)
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Velg dokumenttype
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Hva slags dokument vil du lage?
      </p>

      <div className="grid gap-3">
        {DOC_TYPES.map((dt) => (
          <button
            key={dt.type}
            onClick={() => handleSelect(dt.type)}
            disabled={createMutation.isPending}
            className="flex items-start gap-4 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-kvtas-300 dark:hover:border-kvtas-700 transition-colors text-left cursor-pointer disabled:opacity-50"
          >
            <span className="text-2xl">{dt.icon}</span>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">{dt.label}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{dt.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
