import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { projectAdminKey, applyAdminPatch, createAdminPatch } from '../src/admin-data.js'
import { createMariaDbStore } from './mariadb-store.mjs'
import { ARCPOL_INITIAL_MIGRATION, syncDocumentsToMariaDb } from './sync-mariadb-documents.mjs'

const root = process.env.ARCPOL_TELEGRAM_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = async (name, fallback) => {
  try { return JSON.parse(await fs.readFile(path.join(root, name), 'utf8')) }
  catch (error) { if (error.code === 'ENOENT' && fallback !== undefined) return fallback; throw error }
}
const database = createMariaDbStore(root)
const databaseReady = await database.isConfigured() && await database.hasMigration(ARCPOL_INITIAL_MIGRATION)
const readDocument = async (key, file, fallback) => databaseReady ? (await database.getDocument(key) ?? fallback) : read(file, fallback)
const inbox = await readDocument('telegram-live-inbox', '.local-data/telegram-live-inbox.json', [])
const decisions = await readDocument('telegram-reviewed', '.local-data/telegram-reviewed.json', [])
const journal = await readDocument('telegram-publication-state', '.local-data/telegram-publication-state.json', { published: {} })
const overridePath = path.join(root, 'src/admin-overrides.json')
const originalFileSnapshot = await fs.readFile(overridePath, 'utf8')
const overrides = await readDocument('admin-overrides', 'src/admin-overrides.json')
const originalDatabaseSnapshot = JSON.stringify(overrides)
const site = await readDocument('site-data', 'src/site-data.json')
const telegramProjects = await readDocument('telegram-projects', 'src/telegram-projects.json', [])
const telegramReports = await readDocument('telegram-reports', 'src/telegram-reports.json', [])
const records = [...site.projects, ...telegramProjects, ...telegramReports, ...overrides.projects.added]
let changed = 0
let journalChanged = false
const publishedMediaAssets = []

const reviewSourceSnapshot = source => ({
  recordKey: source.recordKey,
  sourceUpdateId: source.sourceUpdateId ?? null,
  sourceMessageId: source.sourceMessageId ?? null,
  sourceMessageIds: source.sourceMessageIds ?? [],
  sourceChatId: source.sourceChatId ?? null,
  replyToMessageId: source.replyToMessageId ?? null,
  replyContext: source.replyContext ?? '',
  mediaGroupId: source.mediaGroupId ?? null,
  date: source.date ?? null,
  editedAt: source.editedAt ?? null,
  from: source.from ?? '',
  text: source.text ?? '',
  photoPaths: source.photoPaths ?? [],
  hasDocument: Boolean(source.hasDocument),
  hasVideo: Boolean(source.hasVideo),
})

for (const decision of decisions) {
  if (decision.approved !== true || !decision.projectKey || !decision.title || !decision.summary) continue
  const source = inbox.find(item => item.recordKey === decision.recordKey)
  if (!source) throw new Error('Reviewed source record is missing')
  const relatedKeys = [...new Set(decision.relatedRecordKeys ?? [])]
  if (relatedKeys.includes(source.recordKey)) throw new Error('A related review record must be distinct from the primary record')
  const relatedSources = relatedKeys.map(key => inbox.find(item => item.recordKey === key))
  if (relatedSources.some(item => !item)) throw new Error('A related review source record is missing')
  if (relatedSources.some(item => String(item.sourceChatId) !== String(source.sourceChatId))) {
    throw new Error('Related review records must come from the same Telegram group')
  }
  const reviewSources = [source, ...relatedSources]
  const sourceRevision = createHash('sha256').update(JSON.stringify(reviewSources.map(reviewSourceSnapshot))).digest('hex')
  const revision = JSON.stringify({ sourceRevision, decision })
  const previousRevision = journal.published[source.recordKey]
  if (previousRevision === revision) continue

  // Migrate an unchanged report that was already published before source fingerprints existed.
  if (!relatedSources.length && previousRevision) {
    try {
      const previous = JSON.parse(previousRevision)
      const priorDecision = { ...decision }
      delete priorDecision.sourceRevision
      const priorSource = [source.sourceUpdateId ?? null, source.sourceMessageIds, source.text, source.photoPaths]
      if (Array.isArray(previous)
        && JSON.stringify(previous.slice(0, 4)) === JSON.stringify(priorSource)
        && JSON.stringify(previous[4]) === JSON.stringify(priorDecision)
        && decision.sourceRevision === sourceRevision) {
        journal.published[source.recordKey] = revision
        journalChanged = true
        continue
      }
    } catch {}
  }
  if (decision.sourceRevision !== sourceRevision) {
    throw new Error('Reviewed source changed or has no matching sourceRevision; review the current inbox entry again')
  }

  const images = []
  for (const photo of decision.photoPaths ?? source.photoPaths ?? []) {
    if (!(source.photoPaths ?? []).includes(photo)) throw new Error('Image must belong to the reviewed report')
    const absolute = path.resolve(root, photo)
    if (!absolute.startsWith(path.join(root, '.local-data', 'attachments') + path.sep)) throw new Error('Invalid attachment path')
    const filename = `live-${path.basename(absolute)}`
    await fs.mkdir(path.join(root, 'public/telegram'), { recursive: true })
    await fs.copyFile(absolute, path.join(root, 'public/telegram', filename))
    images.push(`/telegram/${filename}`)
    const target = path.join(root, 'public/telegram', filename)
    const stat = await fs.stat(target)
    const extension = path.extname(filename).toLowerCase()
    const type = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg'
    publishedMediaAssets.push({ path: `/telegram/${filename}`, name: filename, type, bytes: stat.size, category: 'reports', private: false, storagePath: `public/telegram/${filename}` })
  }
  if (!images.length) continue
  let record = records.find(item => String(item.id) === String(decision.projectKey) || item.code === decision.projectKey)
  if (!record) {
    if (!String(decision.projectKey).startsWith('LIVE-')) throw new Error('Unknown existing project; use a stable LIVE- key for a confirmed new project')
    const details = decision.newProject ?? {}
    const allowedStatuses = new Set(['in-progress', 'completed', 'history'])
    const allowedUsages = new Set(['مسکونی', 'تجاری'])
    if (details.status && !allowedStatuses.has(details.status)) throw new Error('Invalid new-project status')
    if (details.usage && !allowedUsages.has(details.usage)) throw new Error('Invalid new-project usage')
    record = {
      id: Math.max(1000000, ...records.map(item => Number(item.id) || 0)) + 1,
      code: decision.projectKey,
      status: details.status ?? 'history',
      type: details.type ?? 'نظارت',
      address: details.address ?? '',
      usage: details.usage ?? 'مسکونی',
      description: details.description ?? 'گزارش تصویری پروژه‌های شرکت.',
      tags: details.tags ?? [],
      services: details.services ?? ['نظارت'],
      source: 'field-reports',
      timeline: [],
      images: [],
      finalImage: null,
    }
    overrides.projects.added.push(record)
    records.push(record)
  }
  const stableKey = projectAdminKey(record)
  if (overrides.projects.deleted.includes(stableKey)) throw new Error('Target project was removed by the administrator')
  const effective = applyAdminPatch(record, overrides.projects.patches[stableKey])
  const publicRecordKey = createHash('sha256').update(source.recordKey).digest('hex')
  const timeline = [...(effective.timeline ?? [])].filter(event => event.liveRecordKey !== publicRecordKey)
  images.forEach(image => timeline.push({ date: source.date, title: decision.title, summary: decision.summary, status: 'logged', image, liveRecordKey: publicRecordKey }))
  timeline.sort((a,b) => Date.parse(b.date) - Date.parse(a.date))
  const edited = { ...effective, timeline, images: timeline.map(event => event.image).filter(Boolean), updatedAt: timeline[0].date }
  const addedIndex = overrides.projects.added.findIndex(item => projectAdminKey(item) === stableKey)
  if (addedIndex >= 0) {
    overrides.projects.added[addedIndex] = edited
    records[records.indexOf(record)] = edited
    delete overrides.projects.patches[stableKey]
  } else {
    overrides.projects.patches[stableKey] = createAdminPatch(record, edited)
  }
  journal.published[source.recordKey] = revision
  changed++
}
if (changed) {
  if (await fs.readFile(overridePath, 'utf8') !== originalFileSnapshot) throw new Error('Administrator data changed during review; retry publication')
  if (databaseReady && JSON.stringify(await database.getDocument('admin-overrides')) !== originalDatabaseSnapshot) throw new Error('Administrator data changed during review; retry publication')
  const candidatePath = path.join(root, '.local-data/telegram-publication-candidate.json')
  await fs.writeFile(candidatePath, JSON.stringify(overrides, null, 2) + '\n')
  const audit = spawnSync(process.execPath, [path.join(root, 'scripts/audit-public-projects.mjs')], { cwd: root, encoding: 'utf8', env: { ...process.env, ARCPOL_ADMIN_OVERRIDES_FILE: candidatePath } })
  if (audit.status !== 0) {
    throw new Error('Public data audit failed; site data was not changed. ' + String(audit.stdout ?? '').slice(-1500))
  }
  if (await fs.readFile(overridePath, 'utf8') !== originalFileSnapshot) throw new Error('Administrator data changed during audit; retry publication')
  await fs.rename(candidatePath, overridePath)
}
if (changed || journalChanged) {
  journal.updatedAt = new Date().toISOString()
  const journalPath = path.join(root, '.local-data/telegram-publication-state.json')
  await fs.writeFile(journalPath + '.tmp', JSON.stringify(journal, null, 2) + '\n')
  await fs.rename(journalPath + '.tmp', journalPath)
  const documents = {}
  if (changed) documents['admin-overrides'] = overrides
  if (changed || journalChanged) documents['telegram-publication-state'] = journal
  await syncDocumentsToMariaDb(root, documents, { backupKeys: changed ? ['admin-overrides'] : [], mediaAssets: publishedMediaAssets })
}
await database.close()
console.log(`Published ${changed} reviewed reports. Inbox: ${inbox.length}.`)
