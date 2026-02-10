import { useState, useEffect } from 'react'

const ONE_LINERS = [
  'Setter sammen ord...',
  'Finner de rette formuleringene...',
  'Polerer setningene...',
  'Sjekker komma og punktum...',
  'Konsulterer ordboken...',
  'Justerer tonen...',
  'Velger de beste ordene...',
  'Gjennomgår grammatikken...',
  'Finjusterer innholdet...',
  'Skriver med stil...',
]

export default function LoadingOverlay() {
  const [lineIndex, setLineIndex] = useState(() => Math.floor(Math.random() * ONE_LINERS.length))

  useEffect(() => {
    const timer = setInterval(() => {
      setLineIndex((prev) => (prev + 1) % ONE_LINERS.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-kvtas-100 dark:bg-kvtas-900/30 mb-4">
          <svg className="w-6 h-6 text-kvtas-500 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
          {ONE_LINERS[lineIndex]}
        </p>
      </div>
    </div>
  )
}
