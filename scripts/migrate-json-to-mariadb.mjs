import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createMariaDbStore } from './mariadb-store.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const migrationId = '2026-11-arcpol-json-to-mariadb-v1'
const imageTypes = new Map([
  ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.png', 'image/png'],
  ['.webp', 'image/webp'], ['.avif', 'image/avif'], ['.gif', 'image/gif'], ['.svg', 'image/svg+xml'],
])

async function readJson(relativePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(path.join(projectRoot, relativePath), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw new Error(`Could not read ${relativePath} as JSON: ${error.message}`)
  }
}

function categoryFor(relativePath) {
  const value = relativePath.replaceAll('\\', '/').toLowerCase()
  if (value.startsWith('uploads/prjdata/')) return 'company'
  if (value.startsWith('uploads/postsdata/')) return 'articles'
  if (value.startsWith('telegram/')) return 'reports'
  if (value.startsWith('uploads/admin/')) return 'uploaded'
  if (value.startsWith('source-assets/')) return 'source'
  if (value === 'favicon.svg' || value.startsWith('images/')) return 'site'
  return 'other'
}

async function walk(directory) {
  const files = []
  const pending = [directory]
  while (pending.length) {
    const current = pending.pop()
    let entries
    try { entries = await fs.readdir(current, { withFileTypes: true }) } catch { continue }
    for (const entry of entries) {
      const absolute = path.join(current, entry.name)
      if (entry.isDirectory()) pending.push(absolute)
      else if (entry.isFile()) files.push(absolute)
    }
  }
  return files
}

async function collectMedia() {
  const assets = []
  const publicDirectory = path.join(projectRoot, 'public')
  for (const absolute of await walk(publicDirectory)) {
    const type = imageTypes.get(path.extname(absolute).toLowerCase())
    if (!type) continue
    const relative = path.relative(publicDirectory, absolute).split(path.sep).join('/')
    const stat = await fs.stat(absolute)
    assets.push({
      path: `/${relative}`,
      name: path.basename(absolute),
      type,
      bytes: stat.size,
      category: categoryFor(relative),
      private: false,
      storagePath: `public/${relative}`,
    })
  }

  const privateSources = [
    { directory: path.join(projectRoot, 'tmp', 'private-team-assets'), category: 'private-team' },
    { directory: path.join(projectRoot, '.local-data', 'attachments'), category: 'telegram-private' },
  ]
  for (const source of privateSources) {
    for (const absolute of await walk(source.directory)) {
      const type = imageTypes.get(path.extname(absolute).toLowerCase())
      if (!type || type === 'image/svg+xml' || type === 'image/gif') continue
      const name = path.basename(absolute)
      const relative = path.relative(projectRoot, absolute).split(path.sep).join('/')
      const stat = await fs.stat(absolute)
      const prefix = source.category === 'telegram-private' ? '/api/admin/telegram-media/preview/' : '/api/admin/private-media/preview/'
      assets.push({
        path: `${prefix}${encodeURIComponent(name)}`,
        name,
        type,
        bytes: stat.size,
        category: source.category,
        private: true,
        storagePath: relative,
      })
    }
  }
  return assets
}

async function main() {
  const store = createMariaDbStore(projectRoot)
  if (!await store.isConfigured()) {
    throw new Error('MariaDB connection is not configured. Set MARIADB_URL in .env.mariadb; no data was changed.')
  }

  const [siteData, articleDetails, telegramProjects, telegramReports, adminOverrides, telegramSyncMeta, telegramInbox, telegramDraftLinks, telegramReviewed, telegramPublicationState, feedback, contactRequests, mediaAssets] = await Promise.all([
    readJson('src/site-data.json', { projects: [], articles: [] }),
    readJson('src/article-details.json', []),
    readJson('src/telegram-projects.json', []),
    readJson('src/telegram-reports.json', []),
    readJson('src/admin-overrides.json', null),
    readJson('src/telegram-sync-meta.json', {}),
    readJson('.local-data/telegram-live-inbox.json', []),
    readJson('.local-data/telegram-draft-links.json', {}),
    readJson('.local-data/telegram-reviewed.json', []),
    readJson('.local-data/telegram-publication-state.json', { published: {} }),
    readJson('data/admin-feedback.json', []),
    readJson('.local-data/contact-requests.json', []),
    collectMedia(),
  ])

  const validOverrides = adminOverrides?.version === 1
    && ['projects', 'articles', 'articleDetails'].every((name) => {
      const collection = adminOverrides[name]
      return collection && typeof collection === 'object' && !Array.isArray(collection)
        && collection.patches && typeof collection.patches === 'object' && !Array.isArray(collection.patches)
        && Array.isArray(collection.deleted) && Array.isArray(collection.added)
    })
  if (!Array.isArray(siteData?.projects) || !Array.isArray(siteData?.articles)
    || !Array.isArray(articleDetails) || !Array.isArray(telegramProjects) || !Array.isArray(telegramReports)
    || !validOverrides || !Array.isArray(telegramInbox) || !Array.isArray(telegramReviewed)
    || !telegramDraftLinks || typeof telegramDraftLinks !== 'object' || Array.isArray(telegramDraftLinks)
    || !telegramPublicationState || typeof telegramPublicationState !== 'object' || Array.isArray(telegramPublicationState)
    || !Array.isArray(feedback) || !Array.isArray(contactRequests)) {
    throw new Error('A required content or submission file is invalid. No data was changed.')
  }

  await store.ping()
  await store.initializeSchema()
  const result = await store.importInitialData({
    migrationId,
    documents: {
      'site-data': siteData,
      'article-details': articleDetails,
      'telegram-projects': telegramProjects,
      'telegram-reports': telegramReports,
      'admin-overrides': adminOverrides,
      'telegram-sync-meta': telegramSyncMeta,
      'telegram-live-inbox': telegramInbox,
      'telegram-draft-links': telegramDraftLinks,
      'telegram-reviewed': telegramReviewed,
      'telegram-publication-state': telegramPublicationState,
    },
    feedback,
    contactRequests,
    mediaAssets,
  })

  if (!result.applied) {
    process.stdout.write(`Migration ${migrationId} was already applied; the database was left unchanged.\n`)
  } else {
    process.stdout.write(`Initial MariaDB import completed: ${JSON.stringify(result.summary)}\n`)
    process.stdout.write('Photo files remain in their existing storage folders; only paths and metadata were imported.\n')
  }
  await store.close()
}

main().catch((error) => {
  process.stderr.write(`MariaDB import stopped: ${error.message}\n`)
  process.exitCode = 1
})
