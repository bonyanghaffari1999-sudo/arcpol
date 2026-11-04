import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { projectAdminKey, applyAdminPatch, createAdminPatch } from '../src/admin-data.js'

const root = process.env.ARCPOL_TELEGRAM_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = async (name, fallback) => {
  try { return JSON.parse(await fs.readFile(path.join(root, name), 'utf8')) }
  catch (error) { if (error.code === 'ENOENT' && fallback !== undefined) return fallback; throw error }
}
const inbox = await read('.local-data/telegram-live-inbox.json', [])
const decisions = await read('.local-data/telegram-reviewed.json', [])
const journal = await read('.local-data/telegram-publication-state.json', { published: {} })
const overridePath = path.join(root, 'src/admin-overrides.json')
const original = await fs.readFile(overridePath, 'utf8')
const overrides = JSON.parse(original)
const site = await read('src/site-data.json')
const records = [...site.projects, ...await read('src/telegram-projects.json'), ...await read('src/telegram-reports.json'), ...overrides.projects.added]
let changed = 0
for (const decision of decisions) {
  if (decision.approved !== true || !decision.projectKey || !decision.title || !decision.summary) continue
  const source = inbox.find(item => item.recordKey === decision.recordKey)
  if (!source) throw new Error('Reviewed source record is missing')
  const revision = JSON.stringify([source.sourceUpdateId, source.sourceMessageIds, source.text, source.photoPaths, decision])
  if (journal.published[source.recordKey] === revision) continue
  const images = []
  for (const photo of decision.photoPaths ?? source.photoPaths ?? []) {
    if (!(source.photoPaths ?? []).includes(photo)) throw new Error('Image must belong to the reviewed report')
    const absolute = path.resolve(root, photo)
    if (!absolute.startsWith(path.join(root, '.local-data', 'attachments') + path.sep)) throw new Error('Invalid attachment path')
    const filename = `live-${path.basename(absolute)}`
    await fs.mkdir(path.join(root, 'public/telegram'), { recursive: true })
    await fs.copyFile(absolute, path.join(root, 'public/telegram', filename))
    images.push(`/telegram/${filename}`)
  }
  if (!images.length) continue
  let record = records.find(item => String(item.id) === String(decision.projectKey) || item.code === decision.projectKey)
  if (!record) {
    if (!String(decision.projectKey).startsWith('LIVE-')) throw new Error('Unknown existing project; use a stable LIVE- key for a confirmed new project')
    record = { id: Math.max(1000000, ...records.map(item => Number(item.id) || 0)) + 1, code: decision.projectKey, status: 'history', type: 'نظارت', address: '', usage: 'مسکونی', description: 'گزارش تصویری پروژه‌های شرکت.', tags: [], services: ['نظارت'], source: 'field-reports', timeline: [], images: [], finalImage: null }
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
  if (await fs.readFile(overridePath, 'utf8') !== original) throw new Error('Administrator data changed during review; retry publication')
  const candidatePath = path.join(root, '.local-data/telegram-publication-candidate.json')
  await fs.writeFile(candidatePath, JSON.stringify(overrides, null, 2) + '\n')
  const audit = spawnSync(process.execPath, [path.join(root, 'scripts/audit-public-projects.mjs')], { cwd: root, encoding: 'utf8', env: { ...process.env, ARCPOL_ADMIN_OVERRIDES_FILE: candidatePath } })
  if (audit.status !== 0) {
    throw new Error('Public data audit failed; site data was not changed. ' + String(audit.stdout ?? '').slice(-1500))
  }
  if (await fs.readFile(overridePath, 'utf8') !== original) throw new Error('Administrator data changed during audit; retry publication')
  await fs.rename(candidatePath, overridePath)
  journal.updatedAt = new Date().toISOString()
  const journalPath = path.join(root, '.local-data/telegram-publication-state.json')
  await fs.writeFile(journalPath + '.tmp', JSON.stringify(journal, null, 2) + '\n')
  await fs.rename(journalPath + '.tmp', journalPath)
}
console.log(`Published ${changed} reviewed reports. Inbox: ${inbox.length}.`)
