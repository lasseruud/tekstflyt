import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDocument } from '../../hooks/useDocuments'
import type { Document } from '../../api/documents'
import Step1Type from './Step1Type'
import Step2Fields from './Step2Fields'
import Step3Prompt from './Step3Prompt'
import Step4Preview from './Step4Preview'
import Step5Complete from './Step5Complete'

const STEP_LABELS = ['Type', 'Detaljer', 'Instruksjon', 'Forhåndsvisning', 'Fullfør']

export default function WizardLayout() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const docId = id ? Number(id) : undefined
  const { data: existingDoc } = useDocument(docId)
  const [step, setStep] = useState(0)
  const [doc, setDoc] = useState<Document | null>(null)
  const initializedRef = useRef(false)

  // Set step from existing doc only on initial load (not on every refetch)
  useEffect(() => {
    if (existingDoc && !initializedRef.current) {
      initializedRef.current = true
      setDoc(existingDoc)
      if (existingDoc.status === 'finalized') {
        setStep(4)
      } else if (existingDoc.document_text) {
        setStep(3)
      } else if (existingDoc.ai_prompt || existingDoc.file_path_attachment) {
        setStep(2)
      } else {
        setStep(1)
      }
    }
  }, [existingDoc])

  function handleDocCreated(newDoc: Document) {
    setDoc(newDoc)
    navigate(`/wizard/${newDoc.id}`, { replace: true })
    setStep(1)
  }

  function handleDocUpdated(updatedDoc: Document) {
    setDoc(updatedDoc)
  }

  function next() {
    setStep((s) => Math.min(s + 1, 4))
  }

  function prev() {
    setStep((s) => Math.max(s - 1, 0))
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                i === step
                  ? 'bg-kvtas-500 text-white'
                  : i < step
                  ? 'bg-kvtas-100 text-kvtas-700 dark:bg-kvtas-900/30 dark:text-kvtas-400'
                  : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
              }`}
            >
              {i < step ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className={`text-sm hidden sm:block ${
              i === step ? 'text-gray-900 dark:text-gray-100 font-medium' : 'text-gray-400 dark:text-gray-600'
            }`}>
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <div className={`w-8 h-px ${i < step ? 'bg-kvtas-300 dark:bg-kvtas-700' : 'bg-gray-200 dark:bg-gray-800'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 0 && <Step1Type onCreated={handleDocCreated} />}
      {step === 1 && doc && <Step2Fields doc={doc} onUpdated={handleDocUpdated} onNext={next} onPrev={prev} />}
      {step === 2 && doc && <Step3Prompt doc={doc} onUpdated={handleDocUpdated} onNext={next} onPrev={prev} />}
      {step === 3 && doc && <Step4Preview doc={doc} onUpdated={handleDocUpdated} onNext={next} onPrev={prev} />}
      {step === 4 && doc && <Step5Complete doc={doc} />}
    </div>
  )
}
