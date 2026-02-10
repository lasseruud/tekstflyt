export async function downloadFile(url: string, filename: string) {
  const res = await fetch(url, { credentials: 'include' })
  if (!res.ok) throw new Error('Download failed')

  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}
