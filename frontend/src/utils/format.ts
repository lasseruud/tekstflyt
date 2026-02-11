export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('nb-NO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: 'NOK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPriceWithMva(amount: number, isBusiness: boolean): string {
  if (isBusiness) {
    return `${formatPrice(amount)} eks. mva`
  }
  return `${formatPrice(amount * 1.25)} inkl. mva`
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  tilbud: 'Tilbud',
  brev: 'Brev',
  notat: 'Notat',
  omprofilering: 'Omprofilering',
  svar_paa_brev: 'Svar på brev',
  serviceavtale: 'Serviceavtale',
}

export const DOC_TYPE_COLORS: Record<string, string> = {
  tilbud: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  brev: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  notat: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  omprofilering: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  svar_paa_brev: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  serviceavtale: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
}
