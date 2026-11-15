export const canonicalOrigin = 'https://arcpol.com'

const letterMap = {
  آ: 'a', ا: 'a', ب: 'b', پ: 'p', ت: 't', ث: 's', ج: 'j', چ: 'ch', ح: 'h', خ: 'kh',
  د: 'd', ذ: 'z', ر: 'r', ز: 'z', ژ: 'zh', س: 's', ش: 'sh', ص: 's', ض: 'z', ط: 't',
  ظ: 'z', ع: 'a', غ: 'gh', ف: 'f', ق: 'q', ک: 'k', گ: 'g', ل: 'l', م: 'm', ن: 'n',
  و: 'v', ه: 'h', ی: 'y', ء: 'a', ة: 'h',
}

export function normalizeServiceName(value) {
  return String(value ?? '').normalize('NFC')
    .replaceAll('ي', 'ی')
    .replaceAll('ك', 'ک')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function serviceHash(value) {
  let hash = 2166136261
  for (const character of normalizeServiceName(value)) {
    hash ^= character.codePointAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36).padStart(7, '0')
}

export function serviceSlug(value) {
  const name = normalizeServiceName(value)
  const transliteration = [...name.toLowerCase()]
    .map((character) => letterMap[character] ?? character)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 54)
    .replace(/-+$/g, '') || 'service'
  return `${transliteration}-${serviceHash(name)}`
}

export function serviceBySlug(slug, names) {
  const wanted = String(slug ?? '').toLowerCase()
  return names.find((name) => serviceSlug(name) === wanted) || ''
}
