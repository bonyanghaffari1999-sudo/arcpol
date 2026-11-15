export function isCodedTelegramProject(item) {
  return item?.source === 'field-reports' && /^G-0*\d+$/iu.test(String(item.code || ''))
}

export function isDocumentedCompanyProject(item) {
  return !item?.source || item.source === 'manual' || isCodedTelegramProject(item)
}

export function isIndependentProjectReport(item) {
  return item?.source === 'telegram-report'
    || (item?.source === 'field-reports' && !isCodedTelegramProject(item))
}

export function archiveProjectKey(item) {
  if (item?.source === 'field-reports') {
    const groupCode = String(item.code || '').match(/^G-0*(\d+)$/iu)
    return groupCode ? `telegram-project:${Number(groupCode[1])}` : null
  }
  if (!item?.source) return `previous-site-record:${item?.id}`
  if (item.source === 'manual') return `company-record:${item.id}`
  return null
}

export function countDocumentedProjectRecords(records) {
  return new Set(records.map(archiveProjectKey).filter(Boolean)).size
}
