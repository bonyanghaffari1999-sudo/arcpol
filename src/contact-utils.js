import { localizeDigits, toLatinDigits } from './i18n/numbers.js'

export { toLatinDigits }

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

export function whatsappHref(value, message = '') {
  const number = iranianE164(value).replace(/\D/g, '')
  const text = String(message ?? '').trim()
  return number ? `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}` : ''
}

export function formatIranianPhone(value, locale = 'fa') {
  const digits = toLatinDigits(value).replace(/\D/g, '')
  let formatted = digits
  if (digits.length === 11 && digits.startsWith('09')) {
    formatted = `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
  } else if (digits.length === 11 && digits.startsWith('0')) {
    formatted = `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`
  }
  return localizeDigits(formatted, locale)
}
