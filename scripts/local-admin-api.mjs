import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { createMariaDbStore } from './mariadb-store.mjs'

const MAX_JSON_BYTES = 12 * 1024 * 1024
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024
const LOCAL_HOSTS = new Set(['127.0.0.1', '::1', 'localhost', 'arcpol', 'arcpol.localhost'])

function sendJson(response, status, value) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(value))
}

function requestIsLocal(request) {
  const address = String(request.socket?.remoteAddress || '').replace(/^::ffff:/, '').toLowerCase()
  const host = String(request.headers.host || '').replace(/^\[|\](:\d+)?$/g, '').split(':')[0].toLowerCase()
  return LOCAL_HOSTS.has(address) && LOCAL_HOSTS.has(host)
}

function sameOriginLocalRequest(request) {
  const origin = request.headers.origin
  if (!origin) return false
  try {
    const parsed = new URL(origin)
    return LOCAL_HOSTS.has(parsed.hostname.toLowerCase())
      && parsed.host.toLowerCase() === String(request.headers.host || '').toLowerCase()
  } catch {
    return false
  }
}

function normalizeContactPhone(value) {
  const digits = String(value ?? '').replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  const compact = digits.replace(/[\s()\-]/g, '')
  return /^\+?\d{7,15}$/.test(compact) ? compact : ''
}

function plainText(value, limit) {
  return typeof value === 'string' ? value.replace(/[<>]/g, '').trim().slice(0, limit) : ''
}

function readJson(request, limit = MAX_JSON_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let length = 0
    request.on('data', (chunk) => {
      length += chunk.length
      if (length > limit) {
        reject(Object.assign(new Error('درخواست از اندازهٔ مجاز بزرگ‌تر است.'), { status: 413 }))
        request.destroy()
        return
      }
      chunks.push(chunk)
    })
    request.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(Object.assign(new Error('ساختار JSON معتبر نیست.'), { status: 400 }))
      }
    })
    request.on('error', reject)
  })
}

async function readJsonFile(file, fallback) {
  try {
    return JSON.parse(await fs.promises.readFile(file, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

async function writeJsonFile(file, value, backup = false) {
  await fs.promises.mkdir(path.dirname(file), { recursive: true })
  if (backup) {
    try { await fs.promises.copyFile(file, `${file}.bak`) } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
  const temporary = `${file}.${crypto.randomUUID()}.tmp`
  await fs.promises.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' })
  await fs.promises.rename(temporary, file)
}

function validOverrides(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && value.version === 1
    && ['projects', 'articles', 'articleDetails'].every((name) => {
      const collection = value[name]
      return collection && typeof collection === 'object' && !Array.isArray(collection)
        && collection.patches && typeof collection.patches === 'object' && !Array.isArray(collection.patches)
        && Array.isArray(collection.deleted) && Array.isArray(collection.added)
    })
    && (value.siteContent === null || (value.siteContent && typeof value.siteContent === 'object' && !Array.isArray(value.siteContent)))
}

function imageSignatureIsValid(buffer, mimeType) {
  if (mimeType === 'image/jpeg') return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  if (mimeType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (mimeType === 'image/webp') return buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP'
  if (mimeType === 'image/avif') return buffer.subarray(4, 8).toString() === 'ftyp' && /avif|avis/.test(buffer.subarray(8, 20).toString())
  return false
}

const MEDIA_MIME_BY_EXTENSION = new Map([
  ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.png', 'image/png'],
  ['.webp', 'image/webp'], ['.avif', 'image/avif'], ['.gif', 'image/gif'], ['.svg', 'image/svg+xml'],
])
const PRIVATE_IMAGE_MIME = new Map([
  ['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp'], ['image/avif', 'avif'],
])

function safeMediaName(value) {
  const name = String(value || '')
  return name.length <= 180 && /^[\w.-]+$/u.test(name) && path.basename(name) === name ? name : null
}

function safeTelegramAttachmentName(value) {
  const name = String(value || '')
  return name.length <= 180 && /^[\w.@+-]+$/u.test(name) && path.basename(name) === name ? name : null
}

function mediaCategory(relativePath) {
  const value = relativePath.replaceAll('\\', '/').toLowerCase()
  if (value.startsWith('uploads/prjdata/')) return 'company'
  if (value.startsWith('uploads/postsdata/')) return 'articles'
  if (value.startsWith('telegram/')) return 'reports'
  if (value.startsWith('uploads/admin/')) return 'uploaded'
  if (value.startsWith('source-assets/')) return 'source'
  if (value === 'favicon.svg' || value.startsWith('images/')) return 'site'
  return 'other'
}

async function collectPublicMedia(publicDirectory) {
  const files = []
  const pending = [publicDirectory]
  while (pending.length) {
    const directory = pending.pop()
    let entries
    try { entries = await fs.promises.readdir(directory, { withFileTypes: true }) } catch { continue }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        pending.push(absolute)
        continue
      }
      if (!entry.isFile()) continue
      const extension = path.extname(entry.name).toLowerCase()
      const type = MEDIA_MIME_BY_EXTENSION.get(extension)
      if (!type) continue
      const relative = path.relative(publicDirectory, absolute).split(path.sep).join('/')
      files.push({ absolute, relative, name: entry.name, type })
    }
  }
  const assets = []
  const batchSize = 192
  for (let index = 0; index < files.length; index += batchSize) {
    const batch = await Promise.all(files.slice(index, index + batchSize).map(async (file) => {
      try {
        const stat = await fs.promises.stat(file.absolute)
        return { path: `/${file.relative}`, name: file.name, type: file.type, bytes: stat.size, category: mediaCategory(file.relative), private: false }
      } catch {
        return null
      }
    }))
    assets.push(...batch.filter(Boolean))
  }
  return assets.sort((left, right) => left.path.localeCompare(right.path))
}

async function listPrivateImages(directory) {
  let entries
  try { entries = await fs.promises.readdir(directory, { withFileTypes: true }) } catch { return [] }
  const assets = []
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const type = MEDIA_MIME_BY_EXTENSION.get(path.extname(entry.name).toLowerCase())
    if (!type || type === 'image/svg+xml' || type === 'image/gif') continue
    const stat = await fs.promises.stat(path.join(directory, entry.name))
    assets.push({ name: entry.name, path: `/api/admin/private-media/preview/${encodeURIComponent(entry.name)}`, type, bytes: stat.size, private: true })
  }
  return assets.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }))
}

async function listPrivateTrash(directory) {
  let entries
  try { entries = await fs.promises.readdir(directory, { withFileTypes: true }) } catch { return [] }
  const assets = []
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const name = entry.name.split('--').at(-1)
    const type = MEDIA_MIME_BY_EXTENSION.get(path.extname(name).toLowerCase())
    if (!type || type === 'image/svg+xml' || type === 'image/gif') continue
    const stat = await fs.promises.stat(path.join(directory, entry.name))
    assets.push({ name, trashId: entry.name, type, bytes: stat.size, private: true })
  }
  return assets.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }))
}

async function readPrivateImage(request, response, file) {
  const type = MEDIA_MIME_BY_EXTENSION.get(path.extname(file).toLowerCase())
  if (!type || type === 'image/svg+xml' || type === 'image/gif') return sendJson(response, 404, { error: 'تصویر پیدا نشد.' })
  try {
    const image = await fs.promises.readFile(file)
    response.statusCode = 200
    response.setHeader('Content-Type', type)
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.end(image)
  } catch {
    sendJson(response, 404, { error: 'تصویر پیدا نشد.' })
  }
}

async function parseUploadedImage(request) {
  const value = await readJson(request, Math.ceil(MAX_UPLOAD_BYTES * 1.4) + 64 * 1024)
  const extension = PRIVATE_IMAGE_MIME.get(value?.type)
  if (!extension || typeof value.data !== 'string') throw Object.assign(new Error('فقط تصویر JPG، PNG، WebP یا AVIF پذیرفته می‌شود.'), { status: 400 })
  const image = Buffer.from(value.data, 'base64')
  if (!image.length || image.length > MAX_UPLOAD_BYTES || !imageSignatureIsValid(image, value.type)) {
    throw Object.assign(new Error('محتوای تصویر معتبر نیست یا از ۱۲ مگابایت بزرگ‌تر است.'), { status: 400 })
  }
  return { image, extension }
}

export function localAdminApi(projectRoot) {
  const database = createMariaDbStore(projectRoot)
  const overridesFile = path.join(projectRoot, 'src', 'admin-overrides.json')
  const feedbackFile = path.join(projectRoot, 'data', 'admin-feedback.json')
  const contactRequestsFile = path.join(projectRoot, '.local-data', 'contact-requests.json')
  const telegramInboxFile = path.join(projectRoot, '.local-data', 'telegram-live-inbox.json')
  const telegramReviewFile = path.join(projectRoot, '.local-data', 'telegram-reviewed.json')
  const telegramPublicationFile = path.join(projectRoot, '.local-data', 'telegram-publication-state.json')
  const telegramDraftLinksFile = path.join(projectRoot, '.local-data', 'telegram-draft-links.json')
  const telegramAttachmentsDirectory = path.join(projectRoot, '.local-data', 'attachments')
  const mediaDirectory = path.join(projectRoot, 'public', 'uploads', 'admin')
  const publicDirectory = path.join(projectRoot, 'public')
  const privateMediaDirectory = path.join(projectRoot, 'tmp', 'private-team-assets')
  const privateMediaBackupDirectory = path.join(projectRoot, '.local-data', 'private-team-media-backup')
  const privateMediaTrashDirectory = path.join(projectRoot, '.local-data', 'private-team-media-trash')
  const emptyFeedback = []

  const middleware = async (request, response, next) => {
    const url = new URL(request.url || '/', 'http://127.0.0.1')
    if (!url.pathname.startsWith('/api/admin/') && url.pathname !== '/api/site-content' && url.pathname !== '/api/feedback' && url.pathname !== '/api/contact-request') return next()
    if (!requestIsLocal(request)) return sendJson(response, 403, { error: 'پنل فقط از همین رایانه در دسترس است.' })

    const isMutation = ['POST', 'PUT', 'DELETE'].includes(request.method)
    if (isMutation && !sameOriginLocalRequest(request)) {
      return sendJson(response, 403, { error: 'مبدأ درخواست معتبر نیست.' })
    }

    try {
      if (request.method === 'GET' && url.pathname === '/api/admin/status') {
        const mariaDbEnabled = await database.isConfigured()
        if (mariaDbEnabled) await database.ping()
        const hasBackup = mariaDbEnabled
          ? await database.hasDocumentBackup('admin-overrides')
          : await fs.promises.access(`${overridesFile}.bak`).then(() => true, () => false)
        return sendJson(response, 200, { enabled: true, localOnly: true, hasBackup, storage: mariaDbEnabled ? 'mariadb' : 'json' })
      }
      if (request.method === 'GET' && url.pathname === '/api/site-content') {
        const mariaDbEnabled = await database.isConfigured()
        if (mariaDbEnabled) {
          const documents = await database.listDocuments(['site-data', 'article-details', 'telegram-projects', 'telegram-reports', 'telegram-sync-meta', 'admin-overrides'])
          if (!documents['site-data'] || !documents['admin-overrides']) {
            return sendJson(response, 503, { error: 'مهاجرت اولیهٔ اطلاعات سایت به MariaDB هنوز انجام نشده است.' })
          }
          return sendJson(response, 200, {
            siteData: documents['site-data'],
            articleDetails: documents['article-details'] || [],
            telegramProjects: documents['telegram-projects'] || [],
            telegramReports: documents['telegram-reports'] || [],
            telegramSyncMeta: documents['telegram-sync-meta'] || {},
            adminOverrides: documents['admin-overrides'],
          })
        }
        const [siteData, articleDetails, telegramProjects, telegramReports, telegramSyncMeta, adminOverrides] = await Promise.all([
          readJsonFile(path.join(projectRoot, 'src', 'site-data.json'), null),
          readJsonFile(path.join(projectRoot, 'src', 'article-details.json'), []),
          readJsonFile(path.join(projectRoot, 'src', 'telegram-projects.json'), []),
          readJsonFile(path.join(projectRoot, 'src', 'telegram-reports.json'), []),
          readJsonFile(path.join(projectRoot, 'src', 'telegram-sync-meta.json'), {}),
          readJsonFile(overridesFile, null),
        ])
        if (!siteData || !adminOverrides) return sendJson(response, 503, { error: 'اطلاعات پایهٔ سایت پیدا نشد.' })
        return sendJson(response, 200, { siteData, articleDetails, telegramProjects, telegramReports, telegramSyncMeta, adminOverrides })
      }
      if (request.method === 'GET' && url.pathname === '/api/admin/telegram-inbox') {
        const mariaDbEnabled = await database.isConfigured()
        const [inbox, links, decisions, journal] = await Promise.all([
          mariaDbEnabled ? database.getDocument('telegram-live-inbox').then((value) => value ?? []) : readJsonFile(telegramInboxFile, []),
          mariaDbEnabled ? database.getDocument('telegram-draft-links').then((value) => value ?? {}) : readJsonFile(telegramDraftLinksFile, {}),
          mariaDbEnabled ? database.getDocument('telegram-reviewed').then((value) => value ?? []) : readJsonFile(telegramReviewFile, []),
          mariaDbEnabled ? database.getDocument('telegram-publication-state').then((value) => value ?? { published: {} }) : readJsonFile(telegramPublicationFile, { published: {} }),
        ])
        if (!Array.isArray(inbox)) return sendJson(response, 500, { error: 'صندوق تلگرام ساختار معتبری ندارد.' })
        const decisionByKey = new Map((Array.isArray(decisions) ? decisions : []).map((decision) => [decision.recordKey, decision]))
        const items = inbox.map((record) => {
          const photoNames = [...new Set((record.photoPaths || (record.photoPath ? [record.photoPath] : []))
            .map((value) => path.basename(String(value).replaceAll('\\\\', '/')))
            .filter((name) => safeTelegramAttachmentName(name) && PRIVATE_IMAGE_MIME.has(MEDIA_MIME_BY_EXTENSION.get(path.extname(name).toLowerCase()))))]
          const reviewSource = {
            recordKey: record.recordKey,
            sourceUpdateId: record.sourceUpdateId ?? null,
            sourceMessageId: record.sourceMessageId ?? null,
            sourceMessageIds: record.sourceMessageIds ?? [],
            sourceChatId: record.sourceChatId ?? null,
            replyToMessageId: record.replyToMessageId ?? null,
            replyContext: record.replyContext ?? '',
            mediaGroupId: record.mediaGroupId ?? null,
            date: record.date ?? null,
            editedAt: record.editedAt ?? null,
            from: record.from ?? '',
            text: record.text ?? '',
            photoPaths: record.photoPaths ?? [],
            hasDocument: Boolean(record.hasDocument),
            hasVideo: Boolean(record.hasVideo),
          }
          const sourceRevision = createHash('sha256').update(JSON.stringify([reviewSource])).digest('hex')
          const decision = decisionByKey.get(record.recordKey)
          const decisionCurrent = decision?.sourceRevision === sourceRevision
          let publicationCurrent = false
          const publishedRevision = journal?.published?.[record.recordKey]
          if (typeof publishedRevision === 'string') {
            try { publicationCurrent = JSON.parse(publishedRevision)?.sourceRevision === sourceRevision } catch {}
          }
          const draftProjectId = Number(links?.[record.recordKey])
          const reviewState = Number.isSafeInteger(draftProjectId) && draftProjectId > 0
            ? 'draft'
            : publicationCurrent
              ? 'published'
              : decisionCurrent
                ? decision.approved === true ? 'approved' : 'held'
                : 'pending'
          return {
            recordKey: String(record.recordKey || ''),
            date: record.date || null,
            editedAt: record.editedAt || null,
            text: typeof record.text === 'string' ? record.text.slice(0, 6000) : '',
            project: typeof record.project === 'string' ? record.project.slice(0, 160) : '',
            category: typeof record.category === 'string' ? record.category.slice(0, 120) : '',
            status: typeof record.status === 'string' ? record.status.slice(0, 80) : '',
            hasDocument: Boolean(record.hasDocument),
            hasVideo: Boolean(record.hasVideo),
            photoUrls: photoNames.map((name) => `/api/admin/telegram-media/preview/${encodeURIComponent(name)}`),
            draftProjectId: Number.isSafeInteger(draftProjectId) && draftProjectId > 0 ? draftProjectId : null,
            reviewState,
          }
        }).filter((record) => record.recordKey).sort((left, right) => (Date.parse(right.date) || 0) - (Date.parse(left.date) || 0))
        return sendJson(response, 200, { items, total: items.length })
      }
      if (request.method === 'GET' && url.pathname.startsWith('/api/admin/telegram-media/preview/')) {
        const name = safeTelegramAttachmentName(decodeURIComponent(url.pathname.slice('/api/admin/telegram-media/preview/'.length)))
        if (!name) return sendJson(response, 404, { error: 'تصویر پیدا نشد.' })
        return readPrivateImage(request, response, path.join(telegramAttachmentsDirectory, name))
      }
      if (request.method === 'POST' && url.pathname === '/api/admin/telegram-inbox/link') {
        const value = await readJson(request, 8 * 1024)
        const recordKey = typeof value?.recordKey === 'string' ? value.recordKey.trim() : ''
        const projectId = Number(value?.projectId)
        if (!recordKey || recordKey.length > 240 || !Number.isSafeInteger(projectId) || projectId < 1) {
          return sendJson(response, 400, { error: 'شناسهٔ گزارش یا پیش‌نویس معتبر نیست.' })
        }
        const mariaDbEnabled = await database.isConfigured()
        const [inbox, overrides] = await Promise.all([
          mariaDbEnabled ? database.getDocument('telegram-live-inbox') : readJsonFile(telegramInboxFile, []),
          mariaDbEnabled ? database.getDocument('admin-overrides') : readJsonFile(overridesFile, null),
        ])
        if (!Array.isArray(inbox) || !inbox.some((record) => String(record.recordKey || '') === recordKey)) {
          return sendJson(response, 404, { error: 'گزارش تلگرام پیدا نشد.' })
        }
        const draft = overrides?.projects?.added?.find((record) => Number(record.id) === projectId && record.adminStatus === 'draft')
        if (!draft) return sendJson(response, 400, { error: 'پیش‌نویس پروژه پیدا نشد.' })
        const links = mariaDbEnabled ? (await database.getDocument('telegram-draft-links') || {}) : await readJsonFile(telegramDraftLinksFile, {})
        if (links?.[recordKey] && Number(links[recordKey]) !== projectId) {
          return sendJson(response, 409, { error: 'این گزارش قبلاً به پیش‌نویس دیگری وصل شده است.' })
        }
        links[recordKey] = projectId
        if (mariaDbEnabled) await database.putDocument('telegram-draft-links', links)
        else await writeJsonFile(telegramDraftLinksFile, links)
        return sendJson(response, 200, { recordKey, projectId })
      }
      if (request.method === 'GET' && url.pathname === '/api/admin/content') {
        const mariaDbEnabled = await database.isConfigured()
        const value = mariaDbEnabled ? await database.getDocument('admin-overrides') : await readJsonFile(overridesFile, null)
        if (!value) return sendJson(response, 500, { error: 'فایل اطلاعات مدیریتی پیدا نشد.' })
        return sendJson(response, 200, value)
      }
      if (request.method === 'PUT' && url.pathname === '/api/admin/content') {
        const value = await readJson(request)
        if (!validOverrides(value)) return sendJson(response, 400, { error: 'ساختار اطلاعات مدیریتی معتبر نیست.' })
        const publishesPrivateTelegramPhoto = (value.projects.added || []).some((record) => record.adminStatus !== 'draft'
          && (record.images || []).some((image) => String(image).startsWith('/api/admin/telegram-media/preview/')))
        if (publishesPrivateTelegramPhoto) {
          return sendJson(response, 400, { error: 'عکس‌های تلگرام هنوز خصوصی هستند. پیش از انتشار، آن‌ها را با عکس مجاز عمومی جایگزین کنید یا از پیش‌نویس بردارید.' })
        }
        if (await database.isConfigured()) await database.putDocument('admin-overrides', value, { backup: true })
        else await writeJsonFile(overridesFile, value, true)
        return sendJson(response, 200, value)
      }
      if (request.method === 'POST' && url.pathname === '/api/admin/restore-last') {
        if (await database.isConfigured()) {
          const previous = await database.restoreDocument('admin-overrides')
          if (!previous || !validOverrides(previous)) return sendJson(response, 404, { error: 'نسخهٔ قبلی برای بازگردانی وجود ندارد.' })
          return sendJson(response, 200, previous)
        }
        const backupFile = `${overridesFile}.bak`
        const previous = await readJsonFile(backupFile, null)
        if (!previous || !validOverrides(previous)) return sendJson(response, 404, { error: 'نسخهٔ قبلی برای بازگردانی وجود ندارد.' })
        const current = await readJsonFile(overridesFile, null)
        await writeJsonFile(overridesFile, previous, false)
        await writeJsonFile(backupFile, current || emptyOverrides(), false)
        return sendJson(response, 200, previous)
      }
      if (request.method === 'GET' && url.pathname === '/api/admin/media') {
        const mariaDbEnabled = await database.isConfigured()
        const [publicAssets, privateAssets, privateTrash] = await Promise.all(mariaDbEnabled
          ? database.listMediaAssets().then((assets) => [assets.filter((asset) => !asset.private), assets.filter((asset) => asset.private), listPrivateTrash(privateMediaTrashDirectory)])
          : Promise.all([collectPublicMedia(publicDirectory), listPrivateImages(privateMediaDirectory), listPrivateTrash(privateMediaTrashDirectory)]))
        const privateBackups = await fs.promises.readdir(privateMediaBackupDirectory).catch(() => [])
        return sendJson(response, 200, { publicAssets, privateAssets, privateBackups, privateTrash })
      }
      if (request.method === 'GET' && url.pathname.startsWith('/api/admin/private-media/preview/')) {
        const name = safeMediaName(decodeURIComponent(url.pathname.slice('/api/admin/private-media/preview/'.length)))
        if (!name) return sendJson(response, 404, { error: 'تصویر پیدا نشد.' })
        return readPrivateImage(request, response, path.join(privateMediaDirectory, name))
      }
      if (request.method === 'POST' && url.pathname === '/api/admin/private-media/upload') {
        const { image, extension } = await parseUploadedImage(request)
        await fs.promises.mkdir(privateMediaDirectory, { recursive: true })
        const filename = `staff-${crypto.randomUUID()}.${extension}`
        const target = path.join(privateMediaDirectory, filename)
        await fs.promises.writeFile(target, image, { flag: 'wx' })
        if (await database.isConfigured()) await database.upsertMediaAssets([{ path: `/api/admin/private-media/preview/${encodeURIComponent(filename)}`, name: filename, type: MEDIA_MIME_BY_EXTENSION.get(`.${extension}`), bytes: image.length, category: 'private-team', private: true, storagePath: path.relative(projectRoot, target).split(path.sep).join('/') }])
        return sendJson(response, 201, { name: filename })
      }
      if (request.method === 'POST' && url.pathname === '/api/admin/private-media/replace') {
        const value = await readJson(request, Math.ceil(MAX_UPLOAD_BYTES * 1.4) + 64 * 1024)
        const name = safeMediaName(value?.name)
        const extension = PRIVATE_IMAGE_MIME.get(value?.type)
        const image = typeof value?.data === 'string' ? Buffer.from(value.data, 'base64') : Buffer.alloc(0)
        if (!name || !extension || !image.length || image.length > MAX_UPLOAD_BYTES || !imageSignatureIsValid(image, value.type)) {
          return sendJson(response, 400, { error: 'نام یا محتوای تصویر معتبر نیست.' })
        }
        const storedExtension = path.extname(name).slice(1).toLowerCase()
        if (!(storedExtension === extension || (extension === 'jpg' && storedExtension === 'jpeg'))) {
          return sendJson(response, 400, { error: 'فرمت تصویر جایگزین باید با فرمت فایل فعلی یکسان باشد.' })
        }
        const target = path.join(privateMediaDirectory, name)
        await fs.promises.access(target)
        await fs.promises.mkdir(privateMediaBackupDirectory, { recursive: true })
        const backup = path.join(privateMediaBackupDirectory, name)
        await fs.promises.copyFile(target, backup)
        const temporary = `${target}.${crypto.randomUUID()}.tmp`
        await fs.promises.writeFile(temporary, image, { flag: 'wx' })
        await fs.promises.rename(temporary, target)
        if (await database.isConfigured()) await database.upsertMediaAssets([{ path: `/api/admin/private-media/preview/${encodeURIComponent(name)}`, name, type: value.type, bytes: image.length, category: 'private-team', private: true, storagePath: path.relative(projectRoot, target).split(path.sep).join('/') }])
        return sendJson(response, 200, { name, restorable: true })
      }
      if (request.method === 'POST' && url.pathname === '/api/admin/private-media/restore-last') {
        const value = await readJson(request, 4 * 1024)
        const name = safeMediaName(value?.name)
        if (!name) return sendJson(response, 400, { error: 'نام تصویر معتبر نیست.' })
        const target = path.join(privateMediaDirectory, name)
        const backup = path.join(privateMediaBackupDirectory, name)
        const current = await fs.promises.readFile(target)
        const previous = await fs.promises.readFile(backup).catch(() => null)
        if (!previous) return sendJson(response, 404, { error: 'نسخهٔ قبلی این تصویر پیدا نشد.' })
        const temporary = `${target}.${crypto.randomUUID()}.tmp`
        await fs.promises.writeFile(temporary, previous, { flag: 'wx' })
        await fs.promises.writeFile(backup, current)
        await fs.promises.rename(temporary, target)
        if (await database.isConfigured()) await database.upsertMediaAssets([{ path: `/api/admin/private-media/preview/${encodeURIComponent(name)}`, name, type, bytes: previous.length, category: 'private-team', private: true, storagePath: path.relative(projectRoot, target).split(path.sep).join('/') }])
        return sendJson(response, 200, { name, restorable: true })
      }
      if (request.method === 'DELETE' && url.pathname.startsWith('/api/admin/private-media/')) {
        const name = safeMediaName(decodeURIComponent(url.pathname.slice('/api/admin/private-media/'.length)))
        if (!name) return sendJson(response, 400, { error: 'نام تصویر معتبر نیست.' })
        const source = path.join(privateMediaDirectory, name)
        await fs.promises.mkdir(privateMediaTrashDirectory, { recursive: true })
        const trashId = `${Date.now()}--${crypto.randomUUID()}--${name}`
        await fs.promises.rename(source, path.join(privateMediaTrashDirectory, trashId))
        if (await database.isConfigured()) await database.deleteMediaAsset(`/api/admin/private-media/preview/${encodeURIComponent(name)}`)
        return sendJson(response, 200, { name, trashId })
      }
      if (request.method === 'POST' && url.pathname === '/api/admin/private-media/restore') {
        const value = await readJson(request, 4 * 1024)
        const trashId = safeMediaName(value?.trashId)
        if (!trashId || !trashId.includes('--')) return sendJson(response, 400, { error: 'شناسهٔ تصویر معتبر نیست.' })
        const name = trashId.split('--').at(-1)
        if (!safeMediaName(name)) return sendJson(response, 400, { error: 'نام تصویر معتبر نیست.' })
        const destination = path.join(privateMediaDirectory, name)
        try { await fs.promises.access(destination); return sendJson(response, 409, { error: 'تصویری با این نام از قبل وجود دارد.' }) } catch {}
        await fs.promises.rename(path.join(privateMediaTrashDirectory, trashId), destination)
        if (await database.isConfigured()) {
          const type = MEDIA_MIME_BY_EXTENSION.get(path.extname(name).toLowerCase())
          const stat = await fs.promises.stat(destination)
          await database.upsertMediaAssets([{ path: `/api/admin/private-media/preview/${encodeURIComponent(name)}`, name, type, bytes: stat.size, category: 'private-team', private: true, storagePath: path.relative(projectRoot, destination).split(path.sep).join('/') }])
        }
        return sendJson(response, 200, { name })
      }
      if (request.method === 'GET' && url.pathname === '/api/admin/feedback') {
        const records = await database.isConfigured() ? await database.listFeedback() : await readJsonFile(feedbackFile, emptyFeedback)
        return sendJson(response, 200, records)
      }
      if (request.method === 'PUT' && url.pathname === '/api/admin/feedback') {
        const value = await readJson(request, 2 * 1024 * 1024)
        if (!Array.isArray(value)) return sendJson(response, 400, { error: 'فهرست بازخورد معتبر نیست.' })
        if (await database.isConfigured()) await database.replaceFeedback(value)
        else await writeJsonFile(feedbackFile, value, true)
        return sendJson(response, 200, value)
      }
      if (request.method === 'POST' && url.pathname === '/api/feedback') {
        const value = await readJson(request, 64 * 1024)
        if (!value || typeof value !== 'object' || !value.name || !value.subject || !value.details) {
          return sendJson(response, 400, { error: 'نام، موضوع و متن بازخورد لازم است.' })
        }
        const record = { ...value, savedAt: value.savedAt || new Date().toISOString() }
        if (await database.isConfigured()) await database.addFeedback(record)
        else {
          const feedback = await readJsonFile(feedbackFile, emptyFeedback)
          await writeJsonFile(feedbackFile, [...feedback, record])
        }
        return sendJson(response, 201, { saved: true })
      }
      if (request.method === 'GET' && url.pathname === '/api/admin/contact-requests') {
        const records = await database.isConfigured() ? await database.listContactRequests() : await readJsonFile(contactRequestsFile, [])
        return sendJson(response, 200, records)
      }
      if (request.method === 'PUT' && url.pathname === '/api/admin/contact-requests') {
        const value = await readJson(request, 2 * 1024 * 1024)
        if (!Array.isArray(value) || value.length > 1000 || value.some((entry) => !entry || typeof entry.id !== 'string' || !normalizeContactPhone(entry.phone) || !['new', 'contacted'].includes(entry.status))) {
          return sendJson(response, 400, { error: 'فهرست درخواست‌های تماس معتبر نیست.' })
        }
        if (await database.isConfigured()) await database.replaceContactRequests(value)
        else await writeJsonFile(contactRequestsFile, value, true)
        return sendJson(response, 200, value)
      }
      if (request.method === 'POST' && url.pathname === '/api/contact-request') {
        const value = await readJson(request, 16 * 1024)
        const phone = normalizeContactPhone(value?.phone)
        if (!phone) return sendJson(response, 400, { error: 'شمارهٔ تماس معتبر نیست.' })
        const requests = await database.isConfigured() ? await database.listContactRequests() : await readJsonFile(contactRequestsFile, [])
        if (!Array.isArray(requests) || requests.length >= 1000) return sendJson(response, 409, { error: 'ثبت درخواست تازه فعلاً ممکن نیست.' })
        const record = {
          id: crypto.randomUUID(),
          name: plainText(value.name, 80),
          phone,
          service: plainText(value.service, 100),
          details: plainText(value.details, 500),
          createdAt: new Date().toISOString(),
          status: 'new',
        }
        if (await database.isConfigured()) await database.addContactRequest(record)
        else await writeJsonFile(contactRequestsFile, [record, ...requests])
        return sendJson(response, 201, { saved: true })
      }
      if (request.method === 'POST' && url.pathname === '/api/admin/upload') {
        const value = await readJson(request, Math.ceil(MAX_UPLOAD_BYTES * 1.4) + 64 * 1024)
        const allowedTypes = new Map([
          ['image/jpeg', 'jpg'],
          ['image/png', 'png'],
          ['image/webp', 'webp'],
          ['image/avif', 'avif'],
        ])
        const extension = allowedTypes.get(value?.type)
        if (!extension || typeof value.data !== 'string') return sendJson(response, 400, { error: 'فقط تصویر JPG، PNG، WebP یا AVIF پذیرفته می‌شود.' })
        const image = Buffer.from(value.data, 'base64')
        if (!image.length || image.length > MAX_UPLOAD_BYTES || !imageSignatureIsValid(image, value.type)) {
          return sendJson(response, 400, { error: 'محتوای تصویر معتبر نیست یا از ۱۲ مگابایت بزرگ‌تر است.' })
        }
        await fs.promises.mkdir(mediaDirectory, { recursive: true })
        const filename = `${crypto.randomUUID()}.${extension}`
        await fs.promises.writeFile(path.join(mediaDirectory, filename), image, { flag: 'wx' })
        if (await database.isConfigured()) await database.upsertMediaAssets([{ path: `/uploads/admin/${filename}`, name: filename, type: value.type, bytes: image.length, category: 'uploaded', private: false, storagePath: `public/uploads/admin/${filename}` }])
        return sendJson(response, 201, { path: `/uploads/admin/${filename}` })
      }
      return sendJson(response, 404, { error: 'این مسیر مدیریتی وجود ندارد.' })
    } catch (error) {
      if (!response.headersSent) sendJson(response, error.status || 500, { error: error.status ? error.message : 'ذخیره‌سازی انجام نشد.' })
    }
  }

  return {
    name: 'arcpol-local-admin-api',
    configureServer(server) { server.middlewares.use(middleware) },
    configurePreviewServer(server) { server.middlewares.use(middleware) },
  }
}

function emptyOverrides() {
  return {
    version: 1,
    projects: { patches: {}, deleted: [], added: [] },
    articles: { patches: {}, deleted: [], added: [] },
    articleDetails: { patches: {}, deleted: [], added: [] },
    siteContent: null,
  }
}
