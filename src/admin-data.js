const PATCH_MARKER = '__arcpolAdminPatch'

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function emptyAdminOverrides() {
  return {
    version: 1,
    projects: { patches: {}, deleted: [], added: [] },
    articles: { patches: {}, deleted: [], added: [] },
    articleDetails: { patches: {}, deleted: [], added: [] },
    siteContent: null,
  }
}

export function normalizeAdminOverrides(value) {
  const defaults = emptyAdminOverrides()
  if (!isPlainObject(value)) return defaults
  return {
    ...defaults,
    ...value,
    version: 1,
    projects: { ...defaults.projects, ...(isPlainObject(value.projects) ? value.projects : {}) },
    articles: { ...defaults.articles, ...(isPlainObject(value.articles) ? value.articles : {}) },
    articleDetails: { ...defaults.articleDetails, ...(isPlainObject(value.articleDetails) ? value.articleDetails : {}) },
    siteContent: isPlainObject(value.siteContent) ? value.siteContent : null,
  }
}

export function projectAdminKey(record) {
  return `${record?.source || 'company'}:${record?.id}`
}

export function idAdminKey(record) {
  return String(record?.id)
}

export function applyAdminPatch(base, patch) {
  if (patch === null || patch === undefined) return clone(base)
  if (!isPlainObject(patch) || patch[PATCH_MARKER] !== true) return clone(patch)
  const result = isPlainObject(base) ? clone(base) : {}
  for (const key of patch.unset || []) delete result[key]
  for (const [key, value] of Object.entries(patch.fields || {})) {
    result[key] = isPlainObject(value) && value[PATCH_MARKER] === true
      ? applyAdminPatch(result[key], value)
      : clone(value)
  }
  return result
}

export function createAdminPatch(base, edited) {
  if (JSON.stringify(base) === JSON.stringify(edited)) return null

  if (!isPlainObject(base) || !isPlainObject(edited)) return clone(edited)

  const fields = {}
  const unset = Object.keys(base).filter((key) => !Object.hasOwn(edited, key))
  for (const [key, value] of Object.entries(edited)) {
    if (!Object.hasOwn(base, key)) {
      fields[key] = clone(value)
      continue
    }
    const next = createAdminPatch(base[key], value)
    if (next !== null) fields[key] = next
  }

  if (!Object.keys(fields).length && !unset.length) return null
  return { [PATCH_MARKER]: true, fields, unset }
}

export function mergeAdminCollection(baseRecords, collection, keyOf) {
  const state = isPlainObject(collection) ? collection : {}
  const patches = isPlainObject(state.patches) ? state.patches : {}
  const deleted = new Set(Array.isArray(state.deleted) ? state.deleted.map(String) : [])
  const baseKeys = new Set(baseRecords.map(keyOf))
  const records = baseRecords
    .filter((record) => !deleted.has(String(keyOf(record))))
    .map((record) => patches[keyOf(record)] ? applyAdminPatch(record, patches[keyOf(record)]) : record)

  for (const record of Array.isArray(state.added) ? state.added : []) {
    const key = String(keyOf(record))
    if (!baseKeys.has(key) && !deleted.has(key)) records.push(record)
  }
  return records
}

export function setCollectionRecord(collection, key, baseRecord, editedRecord, isNew = false) {
  const state = {
    patches: { ...(collection?.patches || {}) },
    deleted: [...(collection?.deleted || [])].map(String),
    added: [...(collection?.added || [])],
  }
  const normalizedKey = String(key)
  state.deleted = state.deleted.filter((item) => item !== normalizedKey)

  if (isNew) {
    const index = state.added.findIndex((record) => String(record.id) === String(editedRecord.id))
    if (index < 0) state.added.push(editedRecord)
    else state.added[index] = editedRecord
  } else {
    const patch = createAdminPatch(baseRecord, editedRecord)
    if (patch === null) delete state.patches[normalizedKey]
    else state.patches[normalizedKey] = patch
  }
  return state
}

export function deleteCollectionRecord(collection, record, key) {
  const state = {
    patches: { ...(collection?.patches || {}) },
    deleted: [...(collection?.deleted || [])].map(String),
    added: [...(collection?.added || [])],
  }
  const normalizedKey = String(key)
  if (state.added.some((item) => String(item.id) === String(record.id))) {
    state.added = state.added.filter((item) => String(item.id) !== String(record.id))
    delete state.patches[normalizedKey]
  } else if (!state.deleted.includes(normalizedKey)) {
    state.deleted.push(normalizedKey)
  }
  return state
}
