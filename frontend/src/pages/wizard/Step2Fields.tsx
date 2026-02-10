import { useState, useEffect } from 'react'
import { useUpdateDocument } from '../../hooks/useDocuments'
import CustomerSearch from '../../components/CustomerSearch'
import PriceSection from '../../components/PriceSection'
import type { Document } from '../../api/documents'
import type { Customer } from '../../api/customers'
import { DOC_TYPE_LABELS } from '../../utils/format'

interface Props {
  doc: Document
  onUpdated: (doc: Document) => void
  onNext: () => void
  onPrev: () => void
}

export default function Step2Fields({ doc, onUpdated, onNext, onPrev }: Props) {
  const updateMutation = useUpdateDocument()
  const [fields, setFields] = useState({
    recipient_name: doc.recipient_name || '',
    recipient_address: doc.recipient_address || '',
    recipient_postal_code: doc.recipient_postal_code || '',
    recipient_city: doc.recipient_city || '',
    recipient_person: doc.recipient_person || '',
    recipient_phone: doc.recipient_phone || '',
    recipient_email: doc.recipient_email || '',
    customer_type: doc.customer_type || 'private' as const,
    price_product: doc.price_product,
    price_installation: doc.price_installation,
    customer_id: doc.customer_id,
  })

  useEffect(() => {
    setFields({
      recipient_name: doc.recipient_name || '',
      recipient_address: doc.recipient_address || '',
      recipient_postal_code: doc.recipient_postal_code || '',
      recipient_city: doc.recipient_city || '',
      recipient_person: doc.recipient_person || '',
      recipient_phone: doc.recipient_phone || '',
      recipient_email: doc.recipient_email || '',
      customer_type: doc.customer_type || 'private',
      price_product: doc.price_product,
      price_installation: doc.price_installation,
      customer_id: doc.customer_id,
    })
  }, [doc])

  function handleCustomerSelect(customer: Customer) {
    setFields((f) => ({
      ...f,
      customer_id: customer.id,
      recipient_name: customer.name,
      recipient_address: customer.address || '',
      recipient_postal_code: customer.postal_code || '',
      recipient_city: customer.city || '',
      recipient_person: customer.contact_person || '',
      recipient_phone: customer.phone || '',
      recipient_email: customer.email || '',
      customer_type: customer.customer_type,
    }))
  }

  function set(field: string, value: string | number | null) {
    setFields((f) => ({ ...f, [field]: value }))
  }

  async function handleNext() {
    const updated = await updateMutation.mutateAsync({ id: doc.id, data: fields })
    onUpdated(updated)
    onNext()
  }

  const needsRecipient = ['tilbud', 'brev', 'svar_paa_brev'].includes(doc.document_type)
  const needsPrice = doc.document_type === 'tilbud'
  const isMinimal = ['notat', 'omprofilering'].includes(doc.document_type)

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        {DOC_TYPE_LABELS[doc.document_type]} - Detaljer
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Fyll inn informasjon om dokumentet.
      </p>

      <div className="space-y-4">
        {/* Customer search for types that need recipient */}
        {needsRecipient && (
          <>
            <CustomerSearch
              onSelect={handleCustomerSelect}
              onNameChange={(name) => set('recipient_name', name)}
              selectedName={fields.recipient_name}
            />

            <div className="grid grid-cols-2 gap-3">
              <InputField label="Adresse" value={fields.recipient_address} onChange={(v) => set('recipient_address', v)} />
              <div className="grid grid-cols-2 gap-2">
                <InputField label="Postnr" value={fields.recipient_postal_code} onChange={(v) => set('recipient_postal_code', v)} />
                <InputField label="Poststed" value={fields.recipient_city} onChange={(v) => set('recipient_city', v)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InputField label="Kontaktperson" value={fields.recipient_person} onChange={(v) => set('recipient_person', v)} />
              <InputField label="Telefon" value={fields.recipient_phone} onChange={(v) => set('recipient_phone', v)} />
            </div>

            <InputField label="E-post" value={fields.recipient_email} onChange={(v) => set('recipient_email', v)} type="email" />

            {/* Customer type toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kundetype
              </label>
              <div className="flex gap-2">
                {(['private', 'business'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => set('customer_type', t)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      fields.customer_type === t
                        ? 'bg-kvtas-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {t === 'private' ? 'Privat' : 'Bedrift'}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Price section for tilbud */}
        {needsPrice && (
          <PriceSection
            priceProduct={fields.price_product}
            priceInstallation={fields.price_installation}
            customerType={fields.customer_type}
            onChange={(field, value) => set(field, value)}
          />
        )}

        {isMinimal && !needsRecipient && (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Ingen ekstra felt for {DOC_TYPE_LABELS[doc.document_type].toLowerCase()}.
          </p>
        )}
      </div>

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
          disabled={updateMutation.isPending}
          className="px-6 py-2 bg-kvtas-500 hover:bg-kvtas-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
        >
          {updateMutation.isPending ? 'Lagrer...' : 'Neste'}
        </button>
      </div>
    </div>
  )
}

function InputField({ label, value, onChange, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-kvtas-500 focus:border-transparent"
      />
    </div>
  )
}
