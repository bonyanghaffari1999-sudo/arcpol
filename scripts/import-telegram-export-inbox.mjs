import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { withTelegramInboxLock } from './telegram-inbox-lock.mjs'
import { syncDocumentsToMariaDb } from './sync-mariadb-documents.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const inboxPath = path.join(root, '.local-data', 'telegram-live-inbox.json')
const attachmentRoot = path.join(root, '.local-data', 'attachments')
const authorizedGroupTitle = 'گروه کنترل و نظارت مهندسین مشاور غفاری'
const exportDirectory = path.resolve(process.env.TELEGRAM_EXPORT_DIR ?? '')
const baseExportDirectory = path.resolve(process.env.TELEGRAM_BASE_EXPORT_DIR ?? path.resolve(root, '..', 'Telegram Desktop', 'ChatExport_2026-10-24'))
const cutoff = new Date(process.env.TELEGRAM_EXPORT_AFTER ?? '2026-10-24T20:30:00.000Z')
const envText = await fs.readFile(path.join(root, '.env.telegram.local'), 'utf8')
const groupId = envText.match(/^\s*TELEGRAM_GROUP_ID\s*=\s*(.*?)\s*$/mu)?.[1]?.trim().replace(/^(['"])(.*)\1$/u, '$2')
if (!groupId) throw new Error('Telegram group configuration is missing.')
if (!Number.isFinite(cutoff.getTime())) throw new Error('Invalid export start date.')
if (!process.env.TELEGRAM_EXPORT_DIR) throw new Error('Set TELEGRAM_EXPORT_DIR to the new group export folder.')

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

function stripHtml(value) {
  return decodeHtml(value
    .replace(/<br\s*\/?\s*>/giu, '\n')
    .replace(/<\/(?:p|div|li)>/giu, '\n')
    .replace(/<[^>]*>/gu, ' '))
    .replace(/[\u200b\ufeff]/gu, '')
    .replace(/[ \t]+/gu, ' ')
    .replace(/\s*\n\s*/gu, '\n')
    .trim()
}

function parseDate(rawDate) {
  const match = rawDate?.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+UTC([+-])(\d{2}):(\d{2})/u)
  if (!match) return null
  const [, day, month, year, hour, minute, second, sign, offsetHour, offsetMinute] = match
  const offset = (Number(offsetHour) * 60 + Number(offsetMinute)) * (sign === '+' ? 1 : -1)
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)) - offset * 60_000).toISOString()
}

function parseHtml(source) {
  const starts = [...source.matchAll(/<div class="message default clearfix[^"]*" id="message(\d+)"/gu)]
  const byId = new Map()
  for (let index = 0; index < starts.length; index++) {
    const start = starts[index].index
    const block = source.slice(start, starts[index + 1]?.index ?? source.length)
    // The final message block in a complete Telegram export is followed by
    // the document's </body></html> tags, so validate its own closing divs.
    const messageBlock = block.replace(/<\/body>\s*<\/html>\s*$/iu, '').trimEnd()
    if (!messageBlock.endsWith('</div>')) continue
    const id = Number(starts[index][1])
    const dateText = block.match(/<div class="pull_right date details" title="([^"]+)"/u)?.[1] ?? ''
    const date = parseDate(dateText)
    const text = [...block.matchAll(/<div class="text[^"]*">([\s\S]*?)<\/div>/gu)]
      .map((part) => stripHtml(part[1]))
      .filter(Boolean)
      .join('\n')
    const photos = [...new Set([...block.matchAll(/(?:href|src)="(photos\/[^"]+)"/gu)]
      .map((part) => decodeHtml(part[1]).replaceAll('\\/', '/'))
      .filter((name) => !/_thumb\.[^./]+$/iu.test(name)))]
    const from = stripHtml(block.match(/<div class="from_name[^"]*">([\s\S]*?)<\/div>/u)?.[1] ?? '')
    const replyToMessageId = Number(block.match(/go_to_message(\d+)/u)?.[1] ?? 0) || null
    const editedTitle = block.match(/class="[^"]*edited[^"]*"[^>]*title="([^"]+)"/u)?.[1]
    const record = {
      id,
      joined: /<div class="message default clearfix joined"/u.test(block),
      date,
      editedAt: parseDate(editedTitle),
      text,
      photos,
      from,
      replyToMessageId,
      hasDocument: /class="media_file|href="files\//u.test(block),
      hasVideo: /class="[^"]*\b(?:media_video|video_file(?:_wrap)?)\b[^"]*"/iu.test(block)
        || /(?:href|src)="[^"]*\.(?:mp4|mov|m4v|webm|mkv)(?:\?[^"]*)?"/iu.test(block),
    }
    const previous = byId.get(id)
    byId.set(id, previous ? mergeExportMessage(previous, record) : record)
  }
  return [...byId.values()].sort((left, right) => left.id - right.id)
}

function mergeExportMessage(previous, next) {
  const previousVersion = Date.parse(previous.editedAt ?? previous.date ?? 0) || 0
  const nextVersion = Date.parse(next.editedAt ?? next.date ?? 0) || 0
  if (nextVersion > previousVersion) return { ...previous, ...next }
  if (previousVersion > nextVersion) return previous
  return {
    ...previous,
    ...next,
    text: next.text.length > previous.text.length ? next.text : previous.text,
    photos: [...new Set([...previous.photos, ...next.photos])],
  }
}

async function readExport(directory) {
  const names = (await fs.readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /^messages\d*\.html$/iu.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  const messages = new Map()
  for (const name of names) {
    const html = await fs.readFile(path.join(directory, name), 'utf8')
    for (const message of parseHtml(html)) {
      const previous = messages.get(message.id)
      messages.set(message.id, previous ? mergeExportMessage(previous, message) : message)
    }
  }
  const sorted = [...messages.values()].sort((left, right) => left.id - right.id)
  let lastSender = ''
  for (const message of sorted) {
    if (message.from) lastSender = message.from
    else if (message.joined) message.from = lastSender
  }
  return sorted
}

const htmlName = (await fs.readdir(exportDirectory)).find((name) => /^messages\d*\.html$/iu.test(name))
if (!htmlName) throw new Error('The selected Telegram export has no message history.')
const html = await fs.readFile(path.join(exportDirectory, htmlName), 'utf8')
if (!html.includes('گروه کنترل و نظارت مهندسین مشاور غفاری')) throw new Error('The export does not match the authorized group.')

const [baseMessages, exportedMessages] = await Promise.all([
  readExport(baseExportDirectory).catch(() => []),
  readExport(exportDirectory),
])
const baseIds = new Set(baseMessages.map((message) => message.id))
const messagesById = new Map([...baseMessages, ...exportedMessages].map((message) => [message.id, message]))
const cutoffMs = cutoff.getTime()
let imported = 0
let updated = 0
let missingPhotos = 0
let reportsWithPhotos = 0
let inboxTotal = 0

const hashFile = async (file) => createHash('sha256').update(await fs.readFile(file)).digest('hex')
const samePaths = (left, right) => JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...new Set(right)].sort())
const belongsToExportMessage = (photoPath, messageId) => path.posix.basename(photoPath).startsWith(`export-${messageId}-`)

await withTelegramInboxLock(async () => {
  const existing = await fs.readFile(inboxPath, 'utf8').then(JSON.parse).catch((error) => {
    if (error.code === 'ENOENT') return []
    throw error
  })
  if (!Array.isArray(existing)) throw new Error('The private live inbox is not an array.')
  const inboxByKey = new Map(existing.map((record) => [record.recordKey, record]))

  await fs.mkdir(attachmentRoot, { recursive: true })
  for (const message of exportedMessages) {
    if (baseIds.has(message.id) || !message.date || Date.parse(message.date) < cutoffMs) continue
    if (!message.text && !message.photos.length && !message.hasDocument && !message.hasVideo) continue

    const recordKey = `${groupId}:${message.id}`
    let previous = inboxByKey.get(recordKey)
    if (!previous) {
      previous = [...inboxByKey.values()].find((record) => (record.sourceMessageIds ?? []).includes(message.id))
    }
    const previousPhotoPaths = previous?.photoPaths ?? (previous?.photoPath ? [previous.photoPath] : [])
    const previousExportPaths = previousPhotoPaths.filter((photoPath) => belongsToExportMessage(photoPath, message.id))
    const previousOtherPaths = previousPhotoPaths.filter((photoPath) => !belongsToExportMessage(photoPath, message.id))
    const currentPhotoPaths = []
    let missingPhotoForMessage = false

    for (const relativePhoto of message.photos) {
      const normalized = path.posix.normalize(relativePhoto.replaceAll('\\', '/'))
      if (!normalized.startsWith('photos/') || normalized.startsWith('../')) continue
      const source = path.resolve(exportDirectory, ...normalized.split('/'))
      if (!source.startsWith(path.resolve(exportDirectory) + path.sep)) continue

      let sourceHash
      try { sourceHash = await hashFile(source) }
      catch { missingPhotos++; missingPhotoForMessage = true; continue }

      const basename = path.basename(normalized)
      const suffix = `-${basename}`
      const matchingPrevious = previousExportPaths.find((photoPath) => path.posix.basename(photoPath).endsWith(suffix))
      let destination
      if (matchingPrevious) {
        const priorAbsolute = path.resolve(root, matchingPrevious)
        try {
          if (await hashFile(priorAbsolute) === sourceHash) destination = priorAbsolute
        } catch { /* A missing old attachment is replaced from the current export. */ }
      }

      const legacyFilename = `export-${message.id}-${basename}`
      const legacyPath = path.join(attachmentRoot, legacyFilename)
      if (!destination) {
        try {
          if (await hashFile(legacyPath) === sourceHash) destination = legacyPath
        } catch { /* Create this path below if it is not already present. */ }
      }

      if (!destination) {
        const versionedFilename = `export-${message.id}-${sourceHash.slice(0, 16)}-${basename}`
        destination = path.join(attachmentRoot, versionedFilename)
        await fs.copyFile(source, destination)
      }
      currentPhotoPaths.push(path.relative(root, destination).replaceAll(path.sep, '/'))
    }

    if (currentPhotoPaths.length) reportsWithPhotos++
    const photoPathsComplete = !missingPhotoForMessage
    const nextExportPaths = photoPathsComplete
      ? currentPhotoPaths
      : [...previousExportPaths, ...currentPhotoPaths]
    const photoPaths = [...new Set([
      ...previousOtherPaths,
      ...nextExportPaths,
    ])]
    const parent = message.replyToMessageId ? messagesById.get(message.replyToMessageId) : null
    const sourceMessageIds = [...new Set([...(previous?.sourceMessageIds ?? []), message.id])]
    const editedAt = message.editedAt ?? previous?.editedAt ?? null
    const text = message.editedAt ? message.text : (message.text || previous?.text || '')
    const hasDocument = message.editedAt
      ? Boolean(message.hasDocument)
      : Boolean(message.hasDocument || previous?.hasDocument)
    const hasVideo = message.editedAt
      ? Boolean(message.hasVideo)
      : Boolean(message.hasVideo || previous?.hasVideo)
    const sourceChanged = Boolean(previous && (
      previous.text !== text
      || previous.editedAt !== editedAt
      || !samePaths(previousPhotoPaths, photoPaths)
      || Boolean(previous.hasDocument) !== hasDocument
      || Boolean(previous.hasVideo) !== hasVideo
    ))

    const revisionHistory = [...(previous?.revisionHistory ?? [])]
    if (sourceChanged) {
      revisionHistory.push({
        sourceUpdateId: previous.sourceUpdateId ?? null,
        date: previous.date ?? null,
        editedAt: previous.editedAt ?? null,
        text: previous.text ?? '',
        photoPaths: previousPhotoPaths,
        hasDocument: Boolean(previous.hasDocument),
        hasVideo: Boolean(previous.hasVideo),
      })
    }

    const record = {
      ...(previous ?? {}),
      recordKey: previous?.recordKey ?? recordKey,
      sourceMessageId: previous?.sourceMessageId ?? message.id,
      sourceChatId: groupId,
      replyToMessageId: message.replyToMessageId,
      replyContext: parent?.text ?? previous?.replyContext ?? '',
      sourceMessageIds,
      mediaGroupId: previous?.mediaGroupId ?? null,
      date: message.date,
      editedAt,
      from: message.from || previous?.from || '',
      text,
      photoPaths,
      hasDocument,
      hasVideo,
      revisionHistory,
      importSource: previous?.importSource === 'telegram-live' ? 'telegram-live' : 'telegram-export-backfill',
    }

    const changed = !previous || sourceChanged || previous.replyContext !== record.replyContext
      || previous.from !== record.from || previous.replyToMessageId !== record.replyToMessageId
    if (!changed) continue
    inboxByKey.set(record.recordKey, record)
    if (previous) updated++
    else imported++
  }

  if (imported || updated) {
    const inbox = [...inboxByKey.values()].sort((left, right) => Date.parse(left.date ?? 0) - Date.parse(right.date ?? 0))
    const tempPath = `${inboxPath}.${process.pid}.tmp`
    await fs.writeFile(tempPath, JSON.stringify(inbox, null, 2) + '\n', 'utf8')
    await fs.rename(tempPath, inboxPath)
    await syncDocumentsToMariaDb(root, { 'telegram-live-inbox': inbox })
    inboxTotal = inbox.length
  } else {
    inboxTotal = existing.length
  }
})

console.log(JSON.stringify({ imported, updated, inboxTotal, reportsWithPhotos, missingPhotos, sourceMessages: exportedMessages.length, baseMessages: baseIds.size }))
