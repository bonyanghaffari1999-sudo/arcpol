export function toLatinDigits(value) {
  return String(value ?? '').replace(/[۰-۹٠-٩]/gu, (digit) => {
    const code = digit.charCodeAt(0)
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660)
  })
}

export function toPersianDigits(value) {
  return toLatinDigits(value).replace(/\d/gu, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])
}

export function localizeDigits(value, locale = 'fa') {
  return locale === 'en' ? toLatinDigits(value) : toPersianDigits(value)
}

export function formatNumber(value, locale = 'fa') {
  const number = Number(value)
  if (!Number.isFinite(number)) return localizeDigits(value, locale)
  const intlLocale = locale === 'en' ? 'en-u-nu-latn' : 'fa-IR-u-nu-arabext'
  return new Intl.NumberFormat(intlLocale).format(number)
}

export function numberLocale(locale = 'fa') {
  return locale === 'en' ? 'en-u-nu-latn' : 'fa-IR-u-nu-arabext'
}
