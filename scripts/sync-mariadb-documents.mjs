import { createMariaDbStore } from './mariadb-store.mjs'

export const ARCPOL_INITIAL_MIGRATION = '2026-11-arcpol-json-to-mariadb-v1'

export async function syncDocumentsToMariaDb(projectRoot, documents, { backupKeys = [], mediaAssets = [], deleteMediaPaths = [] } = {}) {
  const store = createMariaDbStore(projectRoot)
  try {
    if (!await store.isConfigured() || !await store.hasMigration(ARCPOL_INITIAL_MIGRATION)) return false
    for (const [key, value] of Object.entries(documents)) {
      await store.putDocument(key, value, { backup: backupKeys.includes(key) })
    }
    if (mediaAssets.length) await store.upsertMediaAssets(mediaAssets)
    for (const assetPath of deleteMediaPaths) await store.deleteMediaAsset(assetPath)
    return true
  } finally {
    await store.close()
  }
}
