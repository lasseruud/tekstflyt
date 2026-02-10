import { formatPrice } from '../utils/format'

interface Props {
  priceProduct: number | null
  priceInstallation: number | null
  customerType: 'business' | 'private' | null
  onChange?: (field: string, value: number | null) => void
  readonly?: boolean
}

export default function PriceSection({ priceProduct, priceInstallation, customerType, onChange, readonly }: Props) {
  const product = priceProduct || 0
  const installation = priceInstallation || 0
  const total = product + installation
  const isBusiness = customerType === 'business'
  const mva = isBusiness ? 0 : total * 0.25
  const totalWithMva = total + mva

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Prisoppsett</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Produktpris</label>
          {readonly ? (
            <p className="text-sm text-gray-900 dark:text-gray-100">{formatPrice(product)}</p>
          ) : (
            <input
              type="number"
              value={priceProduct ?? ''}
              onChange={(e) => onChange?.('price_product', e.target.value ? Number(e.target.value) : null)}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
              placeholder="0"
            />
          )}
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Installasjon</label>
          {readonly ? (
            <p className="text-sm text-gray-900 dark:text-gray-100">{formatPrice(installation)}</p>
          ) : (
            <input
              type="number"
              value={priceInstallation ?? ''}
              onChange={(e) => onChange?.('price_installation', e.target.value ? Number(e.target.value) : null)}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm"
              placeholder="0"
            />
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Sum eks. mva</span>
          <span className="text-gray-900 dark:text-gray-100">{formatPrice(total)}</span>
        </div>
        {!isBusiness && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">MVA (25%)</span>
            <span className="text-gray-900 dark:text-gray-100">{formatPrice(mva)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-medium">
          <span className="text-gray-900 dark:text-gray-100">
            {isBusiness ? 'Totalt eks. mva' : 'Totalt inkl. mva'}
          </span>
          <span className="text-kvtas-600 dark:text-kvtas-400">
            {formatPrice(isBusiness ? total : totalWithMva)}
          </span>
        </div>
      </div>
    </div>
  )
}
