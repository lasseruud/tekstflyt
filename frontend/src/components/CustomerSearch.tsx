import { useState, useRef, useEffect } from 'react'
import { useCustomers } from '../hooks/useCustomers'
import type { Customer } from '../api/customers'

interface Props {
  onSelect: (customer: Customer) => void
  selectedName?: string
}

export default function CustomerSearch({ onSelect, selectedName }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data: customers } = useCustomers(open ? query : undefined)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(customer: Customer) {
    onSelect(customer)
    setQuery(customer.name)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Kunde
      </label>
      <input
        type="text"
        value={query || selectedName || ''}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Søk etter kunde..."
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-kvtas-500 focus:border-transparent"
      />
      {open && customers && customers.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {customers.map((c) => (
            <button
              key={c.id}
              onClick={() => handleSelect(c)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.name}</div>
              {c.contact_person && (
                <div className="text-xs text-gray-500 dark:text-gray-400">{c.contact_person}</div>
              )}
              {c.city && (
                <div className="text-xs text-gray-400 dark:text-gray-500">{c.city}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
