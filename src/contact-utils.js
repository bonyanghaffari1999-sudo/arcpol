export function toLatinDigits(value) {
  return String(value ?? '').replace(/[۰-۹٠-٩]/g, (digit) => {
    const code = digit.charCodeAt(0)
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660)
  })
}

function iranianE164(value) {
  const digits = toLatinDigits(value).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('0098')) return `+${digits.slice(2)}`
  if (digits.startsWith('98')) return `+${digits}`
  if (digits.startsWith('0')) return `+98${digits.slice(1)}`
  return `+${digits}`
}

export function telephoneHref(value) {
  const number = iranianE164(value)
  return number ? `tel:${number}` : ''
}

export function whatsappHref(value) {
  const number = iranianE164(value).replace(/\D/g, '')
  return number ? `https://wa.me/${number}` : ''
}

export function formatIranianPhone(value) {
  const digits = toLatinDigits(value).replace(/\D/g, '')
  let formatted = digits
  if (digits.length === 11 && digits.startsWith('09')) {
    formatted = `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  } else if (digits.length === 11 && digits.startsWith('0')) {
    formatted = `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`
  }
  return formatted.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])
}
