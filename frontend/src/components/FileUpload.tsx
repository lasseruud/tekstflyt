import { useState, useRef } from 'react'
import { uploadFile } from '../api/upload'
import type { UploadResult } from '../api/upload'

interface Props {
  onUpload: (result: UploadResult) => void
  accept?: string
  required?: boolean
}

export default function FileUpload({ onUpload, accept, required }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState<UploadResult | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError('')
    setUploading(true)
    try {
      const result = await uploadFile(file)
      setUploaded(result)
      onUpload(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opplasting feilet')
    } finally {
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Vedlegg {required && <span className="text-red-500">*</span>}
      </label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-kvtas-500 bg-kvtas-50 dark:bg-kvtas-900/20'
            : uploaded
            ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />
        {uploading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Laster opp...</p>
        ) : uploaded ? (
          <div>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">{uploaded.filename}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {(uploaded.size / 1024).toFixed(0)} KB - Klikk for å bytte fil
            </p>
          </div>
        ) : (
          <div>
            <UploadIcon />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Dra og slipp fil, eller klikk for å velge
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              PDF, DOCX, DOC, XLSX, XLS, JPG, PNG (maks 20 MB)
            </p>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>}
    </div>
  )
}

function UploadIcon() {
  return (
    <svg className="w-8 h-8 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  )
}
