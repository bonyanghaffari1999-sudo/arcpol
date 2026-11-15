import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const exportRoot = path.resolve(process.env.TELEGRAM_EXPORT_ROOT ?? path.resolve(root, '..', 'Telegram Desktop'))
const checkpointPath = path.join(root, '.local-data', 'telegram-export-import-state.json')
const authorizedGroupTitle = 'گروه کنترل و نظارت مهندسین مشاور غفاری'
const stableForMs = Number(process.env.TELEGRAM_EXPORT_STABLE_MS ?? 120_000)
const importerVersion = 2

function decodeHtml(value) {
  return value
    .replace(/&#x([\da-f]+);/giu, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/gu, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&nbsp;/giu, ' ')
    .replace(/&amp;/giu, '&')
    .replace(/&quot;/giu, '"')
    .replace(/&#39;|&apos;/giu, "'")
    .replace(/&lt;/giu, '<')
    .replace(/&gt;/giu, '>')
    .replace(/&zwnj;/giu, '\u200c')
    .replace(/&zwj;/giu, '\u200d')
}

async function fingerprintExport(directory, previousPhotoManifest = {}) {
  const names = (await fs.readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /^messages\d*\.html$/iu.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
  if (!names.length) return null

  const digest = createHash('sha256')
  const photos = new Set()
  const photoManifest = {}
  let matchingGroup = false
  let latestModified = 0

  for (const name of names) {
    const file = path.join(directory, name)
    const [html, stat] = await Promise.all([fs.readFile(file), fs.stat(file)])
    if (!/<\/body>\s*<\/html>\s*$/iu.test(html.toString('utf8'))) return null
    if (html.includes(authorizedGroupTitle)) matchingGroup = true
    digest.update(name).update('\0').update(html)
    latestModified = Math.max(latestModified, stat.mtimeMs)
    for (const match of html.toString('utf8').matchAll(/(?:href|src)="(photos\/[^"]+)"/gu)) {
      const relative = decodeHtml(match[1]).replaceAll('\\/', '/')
      if (!/_thumb\.[^./]+$/iu.test(relative)) photos.add(relative)
    }
  }
  if (!matchingGroup) return null

  for (const relative of [...photos].sort()) {
    const normalized = path.posix.normalize(relative.replaceAll('\\', '/'))
    if (!normalized.startsWith('photos/') || normalized.startsWith('../')) return null
    const file = path.resolve(directory, ...normalized.split('/'))
    if (!file.startsWith(path.resolve(directory) + path.sep)) return null
    let stat
    try {
      stat = await fs.stat(file)
    } catch {
      return null
    }
    if (!stat.isFile()) return null
    const previous = previousPhotoManifest[normalized]
    let hash = previous?.size === stat.size && previous?.mtimeMs === stat.mtimeMs
      ? previous.hash
      : null
    if (!hash) hash = createHash('sha256').update(await fs.readFile(file)).digest('hex')
    photoManifest[normalized] = { size: stat.size, mtimeMs: stat.mtimeMs, hash }
    digest.update(normalized).update('\0').update(String(stat.size)).update('\0').update(hash)
    latestModified = Math.max(latestModified, stat.mtimeMs)
  }

  return {
    directory: path.resolve(directory),
    signature: digest.digest('hex'),
    latestModified,
    sourceMessages: names.length,
    photoFiles: photos.size,
    photoManifest,
  }
}

async function inspectExportHeader(directory) {
  const names = (await fs.readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /^messages\d*\.html$/iu.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
  if (!names.length) return null

  let matchingGroup = false
  let latestHtmlModified = 0
  for (const name of names) {
    const file = path.join(directory, name)
    const [html, stat] = await Promise.all([fs.readFile(file, 'utf8'), fs.stat(file)])
    if (!/<\/body>\s*<\/html>\s*$/iu.test(html)) return null
    if (html.includes(authorizedGroupTitle)) matchingGroup = true
    latestHtmlModified = Math.max(latestHtmlModified, stat.mtimeMs)
  }
  return matchingGroup ? { directory: path.resolve(directory), latestHtmlModified } : null
}

async function writeCheckpoint(checkpoint) {
  await fs.mkdir(path.dirname(checkpointPath), { recursive: true })
  const temporary = `${checkpointPath}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8')
  await fs.rename(temporary, checkpointPath)
}

let directories
try {
  directories = (await fs.readdir(exportRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && /^ChatExport_/iu.test(entry.name))
    .map((entry) => path.join(exportRoot, entry.name))
} catch {
  console.log(JSON.stringify({ status: 'export-root-unavailable' }))
  process.exit(0)
}

let checkpoint = {}
try { checkpoint = JSON.parse(await fs.readFile(checkpointPath, 'utf8')) }
catch (error) { if (error.code !== 'ENOENT') throw error }

const exportHeaders = []
for (const directory of directories) {
  const header = await inspectExportHeader(directory)
  if (header) exportHeaders.push(header)
}
exportHeaders.sort((left, right) => right.latestHtmlModified - left.latestHtmlModified)
let selected = null
for (const header of exportHeaders) {
  const previousManifest = checkpoint.directory === header.directory ? checkpoint.photoManifest : {}
  selected = await fingerprintExport(header.directory, previousManifest)
  if (selected) break
}
if (!selected) {
  console.log(JSON.stringify({ status: 'no-complete-authorized-export' }))
  process.exit(0)
}
if (Date.now() - selected.latestModified < stableForMs) {
  console.log(JSON.stringify({ status: 'export-still-updating' }))
  process.exit(0)
}

if (checkpoint.directory === selected.directory && checkpoint.signature === selected.signature && checkpoint.importerVersion === importerVersion) {
  console.log(JSON.stringify({ status: 'unchanged' }))
  process.exit(0)
}

const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'import-telegram-export-inbox.mjs')], {
  cwd: root,
  encoding: 'utf8',
  windowsHide: true,
  env: { ...process.env, TELEGRAM_EXPORT_DIR: selected.directory },
})
if (result.error || result.status !== 0) {
  throw new Error(`Telegram export import failed: ${result.error?.message ?? String(result.stderr ?? '').trim()}`)
}

let imported
try { imported = JSON.parse(String(result.stdout ?? '').trim()) }
catch { throw new Error('Telegram export importer returned an unreadable result.') }
if (imported.missingPhotos > 0) {
  console.log(JSON.stringify({ status: 'waiting-for-export-media' }))
  process.exit(0)
}

const afterImport = await fingerprintExport(selected.directory, selected.photoManifest)
if (!afterImport || afterImport.signature !== selected.signature) {
  console.log(JSON.stringify({ status: 'export-changed-during-import' }))
  process.exit(0)
}

await writeCheckpoint({
  directory: selected.directory,
  signature: selected.signature,
  importerVersion,
  importedAt: new Date().toISOString(),
  sourceMessages: imported.sourceMessages,
  imported: imported.imported,
  updated: imported.updated,
  photoManifest: afterImport.photoManifest,
})
console.log(JSON.stringify({
  status: imported.imported || imported.updated ? 'imported' : 'unchanged',
  imported: imported.imported,
  updated: imported.updated,
  inboxTotal: imported.inboxTotal,
}))
