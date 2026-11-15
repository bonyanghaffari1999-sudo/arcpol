import fs from 'node:fs/promises'
import { createHash, timingSafeEqual } from 'node:crypto'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { withTelegramInboxLock } from './telegram-inbox-lock.mjs'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const privateDirectory = path.join(projectRoot, '.local-data')
const stateFile = path.join(privateDirectory, 'telegram-bot-state.json')
const inboxFile = path.join(privateDirectory, 'telegram-live-inbox.json')
const healthFile = path.join(privateDirectory, 'telegram-health.json')
const ownerFile = path.join(privateDirectory, 'telegram-owner.json')
const ownerPairingFile = path.join(privateDirectory, 'telegram-owner-pairing.json')
const attachmentDirectory = path.join(privateDirectory, 'attachments')
const localEnvFile = path.join(projectRoot, '.env.telegram.local')
const apiTransportFile = path.join(projectRoot, 'scripts', 'telegram-api.ps1')
const authorizedGroupTitle = 'گروه کنترل و نظارت مهندسین مشاور غفاری'
const sessions = new Map()

async function loadLocalEnvironment() {
  let source = ''
  try { source = await fs.readFile(localEnvFile, 'utf8') } catch { return }
  for (const line of source.split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/u)
    if (!match || match[1] in process.env) continue
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/u, '$2')
  }
}

await loadLocalEnvironment()

const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
const groupId = process.env.TELEGRAM_GROUP_ID?.trim()
const automaticCapture = process.env.TELEGRAM_CAPTURE_MODE === 'automatic'
let botUsername = ''

const submissionCategories = [
  { id: 'full', title: 'پروژهٔ کامل از طراحی تا تحویل' },
  { id: 'design', title: 'طراحی و مدارک' },
  { id: 'execution', title: 'اجرا و پیشرفت کار' },
  { id: 'supervision', title: 'نظارت و بازدید' },
  { id: 'quality', title: 'ایراد و کنترل کیفیت' },
  { id: 'safety', title: 'ایمنی و پایدارسازی' },
  { id: 'correction', title: 'اصلاح و رفع ایراد' },
  { id: 'handover', title: 'تکمیل و تحویل' },
]

if (!token) {
  throw new Error('TELEGRAM_BOT_TOKEN is missing. Add it to .env.telegram.local; do not paste it into chat.')
}

async function telegram(method, parameters = {}) {
  let response
  try {
    response = await telegramViaWindowsTransport(method, parameters)
  } catch (error) {
    throw new Error(`Telegram ${method} request failed: ${error.message}`)
  }
  const payload = response.body
  if (response.statusCode < 200 || response.statusCode >= 300 || !payload?.ok) {
    throw new Error(`Telegram ${method} failed: ${payload?.description ?? `HTTP ${response.statusCode}`}`)
  }
  return payload.result
}

function telegramViaWindowsTransport(method, parameters) {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', [
      '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', apiTransportFile,
    ], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] })
    let stdout = ''
    let settled = false
    const finish = (error, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      if (error) reject(error)
      else resolve(value)
    }
    const timer = setTimeout(() => {
      child.kill()
      finish(new Error('Windows network request timed out'))
    }, 40000)
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.on('error', () => finish(new Error('Windows network transport could not start')))
    child.on('close', (code) => {
      if (code !== 0) return finish(new Error('Windows network transport failed'))
      try {
        const result = JSON.parse(stdout)
        if (!Number.isInteger(result.statusCode) || result.body === undefined) throw new Error('Invalid transport response')
        finish(null, result)
      } catch {
        finish(new Error('Windows network transport returned an unreadable response'))
      }
    })
    child.stdin.end(JSON.stringify({ method, parameters }))
  })
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) } catch (error) {
    if (error.code === 'ENOENT') return fallback
    throw error
  }
}

async function writeJsonAtomically(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const temporary = `${file}.${process.pid}.tmp`
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  await fs.rename(temporary, file)
}

const pause = (duration) => new Promise((resolve) => setTimeout(resolve, duration))

function cleanText(message) {
  return String(message.text ?? message.caption ?? '')
    .replace(/[\u200e\u200f\u202a-\u202e]/gu, '')
    .trim()
}

function projectLabel(text) {
  const match = text.match(/(?:^|\s)پروژه\s+([^\n]+)/u)
  if (!match) return 'نامشخص / نیازمند تعیین پروژه'
  return match[1]
    .split(/\s+(?=کارفرما\s*[:：]?|پلاک(?:\s+ثبتی)?\s*[:：]?|تاریخ\s+(?:بازدید|:)|در\s+مرحله|مرحله\s*[:：])/u)[0]
    .split(/[،,؛;\n]/u)[0]
    .replace(/^[\s:：-]+|[\s:：-]+$/gu, '') || 'نامشخص / نیازمند تعیین پروژه'
}

function classify(text) {
  const value = text.normalize('NFKC').replace(/[\u064a\u0649]/gu, 'ی').replace(/\u0643/gu, 'ک')
  const categories = []
  const add = (label, expression) => { if (expression.test(value)) categories.push(label) }

  add('ایمنی و پایدارسازی', /گودبردار|سازه\s*نگهبان|ایمنی|خطر|حفاظ|داربست|ریزش|ترانشه/u)
  add('سازه، سقف و آرماتور', /تیرچه|تریچه|فورجینگ|خاموت|آرماتور|میلگرد|ستون|سقف|اتصال/u)
  add('کیفیت بتن', /بتن|کرمو|بتن.?ریزی|ترک/u)
  add('نقشه و جانمایی', /نقشه|آکس|محور|جانمایی|ابعاد/u)
  add('تأسیسات', /تأسیسات|تاسیسات|لوله.?کشی|برق|مکانیک/u)
  add('نازک‌کاری و نما', /نازک.?کاری|کاشی|گچ.?کاری|نما|رنگ/u)
  add('طراحی و مدارک', /طراحی|نقشه.?اجرایی|محاسبات|مدارک/u)
  if (!categories.length) categories.push('پیشرفت عمومی کارگاه')

  const resolved = /(?:برطرف|رفع|اصلاح)\s+(?:شد|گردید)|مشکل\s+حل\s+شد/u.test(value)
  const completed = /(?:پروژه|عملیات)\s+(?:به\s+)?(?:اتمام|پایان)\s+رسید|پروژه\s+(?:تکمیل|تحویل)\s+شد|تحویل\s+نهایی/u.test(value)
  const issue = /بد\s+بسته|بد\s+اجرا|درست\s+نیست|عدم\s+اجرا|اجرا\s+نشده|کرمو|ترک|خطر|غیر\s+ایمن|غیر\s+اصولی|اشتباه|اشکال|ایراد|تذکر|رعایت\s+نکرد|مشکل|نیاز\s+به\s+اصلاح/u.test(value)

  let stage = 'بازدید و ثبت پیشرفت'
  if (/طراحی|محاسبات|نقشه.?اجرایی/u.test(value)) stage = 'طراحی و مدارک'
  else if (/گودبردار|سازه\s*نگهبان|پایدارسازی/u.test(value)) stage = 'گودبرداری و پایدارسازی'
  else if (/فونداسیون|پی.?سازی/u.test(value)) stage = 'فونداسیون'
  else if (/فورجینگ/u.test(value)) stage = 'کنترل اتصال فورجینگ'
  else if (/آرماتور|میلگرد/u.test(value) && /ستون/u.test(value)) stage = 'آرماتوربندی ستون'
  else if (/آرماتور|میلگرد|تیرچه/u.test(value) && /سقف/u.test(value)) stage = 'آرماتوربندی و جزئیات سقف'
  else if (/بتن/u.test(value)) stage = 'کنترل بتن و بتن‌ریزی'
  else if (/آرماتور|میلگرد/u.test(value)) stage = 'کنترل آرماتوربندی'
  else if (/سقف/u.test(value)) stage = 'اجرای سقف'
  else if (/تأسیسات|تاسیسات|لوله.?کشی|برق/u.test(value)) stage = 'اجرای تأسیسات'
  else if (/نازک.?کاری|کاشی|گچ.?کاری|نما/u.test(value)) stage = 'نازک‌کاری و نما'
  else if (completed) stage = 'تکمیل و تحویل'

  const service = /از\s+صفر\s+تا\s+صد|کامل\s+تا\s+تحویل/u.test(value)
    ? 'پروژهٔ کامل'
    : /طراحی|محاسبات/u.test(value)
      ? 'طراحی'
      : /نظارت|بازدید|کنترل/u.test(value)
        ? 'نظارت و کنترل'
        : /اجرا|ساخت|پیمانکار/u.test(value)
          ? 'اجرا و ساخت'
          : 'نیازمند بررسی'

  return {
    project: projectLabel(text),
    categories: [...new Set(categories)],
    stage,
    status: completed ? 'تکمیل صریح' : resolved ? 'رفع‌شده' : issue ? 'نیازمند پیگیری' : 'گزارش‌شده',
    service,
  }
}

function newestPhoto(message) {
  const sizes = message.photo ?? []
  return sizes.at(-1) ?? null
}

function hasMedia(message) {
  return Boolean(newestPhoto(message) || message.document || message.video || message.animation)
}

async function storePhoto(message, photo) {
  if (!photo?.file_id) return null
  const extension = '.jpg'
  const photoKey = String(photo.file_unique_id ?? photo.file_id).replace(/[^A-Za-z0-9_-]/gu, '')
  const filename = `${message.chat.id}-${message.message_id}-${photoKey}${extension}`
  const destination = path.join(attachmentDirectory, filename)
  try {
    await fs.access(destination)
    return path.relative(projectRoot, destination).replaceAll(path.sep, '/')
  } catch { /* Download the attachment below. */ }

  if (photo.file_size && photo.file_size > 20 * 1024 * 1024) return null
  const file = await telegram('getFile', { file_id: photo.file_id })
  if (!file.file_path) return null
  const downloaded = await telegramViaWindowsTransport('downloadFile', { filePath: file.file_path, destination })
  if (downloaded.statusCode < 200 || downloaded.statusCode >= 300 || downloaded.body.savedBytes > 20 * 1024 * 1024) {
    await fs.rm(destination, { force: true })
    if (downloaded.body.savedBytes > 20 * 1024 * 1024) return null
    throw new Error(`Telegram photo download failed: HTTP ${downloaded.statusCode}`)
  }
  return path.relative(projectRoot, destination).replaceAll(path.sep, '/')
}

function commandFrom(text) {
  const match = text.match(/^\/([a-z_]+)(?:@([A-Za-z0-9_]+))?(?:\s|$)/iu)
  if (!match || (match[2] && match[2].toLowerCase() !== botUsername.toLowerCase())) return null
  return match[1].toLowerCase()
}

function sessionKey(chatId, userId, threadId = 0) {
  return `${chatId}:${threadId ?? 0}:${userId}`
}

async function showCategoryMenu(message) {
  const rows = []
  for (let index = 0; index < submissionCategories.length; index += 2) {
    rows.push(submissionCategories.slice(index, index + 2).map((category) => ({
      text: category.title,
      callback_data: `category:${category.id}`,
    })))
  }
  await telegram('sendMessage', {
    chat_id: message.chat.id,
    reply_parameters: { message_id: message.message_id, allow_sending_without_reply: true },
    text: 'برای ثبت اطلاعات تازه، دستهٔ مناسب را انتخاب کنید:',
    reply_markup: { inline_keyboard: rows },
  })
}

async function processCategorySelection(query) {
  const chat = query.message?.chat
  const userId = query.from?.id
  const categoryId = query.data?.match(/^category:([a-z]+)$/u)?.[1]
  const category = submissionCategories.find((item) => item.id === categoryId)
  const inAuthorizedGroup = ['group', 'supergroup'].includes(chat?.type) && String(chat.id) === groupId
  const owner = chat?.type === 'private' ? await readJson(ownerFile, null) : null
  const isPairedOwner = chat?.type === 'private' && String(owner?.userId || '') === String(userId || '')
  if (!chat || (!inAuthorizedGroup && !isPairedOwner) || !userId || !category) {
    await telegram('answerCallbackQuery', { callback_query_id: query.id, text: 'این انتخاب برای این گروه معتبر نیست.' })
    return
  }

  const threadId = query.message.message_thread_id ?? 0
  await telegram('answerCallbackQuery', { callback_query_id: query.id, text: `انتخاب شد: ${category.title}` })
  const prompt = await telegram('sendMessage', {
    chat_id: chat.id,
    reply_parameters: { message_id: query.message.message_id, allow_sending_without_reply: true },
    text: `دستهٔ «${category.title}» انتخاب شد. برای ثبت، حتماً به همین پیام پاسخ دهید و نام پروژه و شرح گزارش را بفرستید؛ عکس را با شرح یا کپشن به همین پیام پیوست کنید. پیام‌های دیگر ذخیره نمی‌شوند.\nبرای لغو: /cancel@${botUsername}`,
  })
  sessions.set(sessionKey(chat.id, userId, threadId), {
    categoryId: category.id,
    categoryTitle: category.title,
    promptMessageId: prompt.message_id,
    startedAt: Date.now(),
  })
}

async function discoverGroup() {
  const me = await telegram('getMe')
  botUsername = me.username
  console.log(`Bot @${me.username} آماده است. در گروه موردنظر دستور /connect@${me.username} را بفرستید؛ پیام‌های دیگر ذخیره نمی‌شوند.`)
  let offset = 0
  while (true) {
    const updates = await telegram('getUpdates', {
      offset: offset || undefined,
      limit: 100,
      timeout: 25,
      allowed_updates: ['message'],
    })
    for (const update of updates) {
      offset = update.update_id + 1
      const message = update.message
      if (!message || !['group', 'supergroup'].includes(message.chat?.type)) continue
      if (message.chat.title !== authorizedGroupTitle) continue
      const command = cleanText(message).match(/^\/connect(?:@([A-Za-z0-9_]+))?\s*$/iu)
      if (!command || (command[1] && command[1].toLowerCase() !== me.username.toLowerCase())) continue
      await writeJsonAtomically(stateFile, { lastUpdateId: update.update_id })
      console.log(`Authorized group found: ${message.chat.title}`)
      console.log(`Set TELEGRAM_GROUP_ID=${message.chat.id} in .env.telegram.local, then run npm run telegram:bot`)
      return
    }
  }
}

async function processMessage(message, updateId, inbox) {
  if (!message?.chat) return false
  const isPrivate = message.chat.type === 'private'
  const isAuthorizedGroup = ['group', 'supergroup'].includes(message.chat.type) && String(message.chat.id) === groupId
  if (!isPrivate && !isAuthorizedGroup) return false
  if (message.from?.is_bot) return false
  const text = cleanText(message)
  const command = commandFrom(text)
  const threadId = message.message_thread_id ?? 0
  const key = message.from?.id ? sessionKey(message.chat.id, message.from.id, threadId) : null
  const owner = isPrivate ? await readJson(ownerFile, null) : null
  const isPairedOwner = isPrivate && String(owner?.userId || '') === String(message.from?.id || '')
  const replyToMessage = (reply) => telegram('sendMessage', {
    chat_id: message.chat.id,
    reply_parameters: { message_id: message.message_id, allow_sending_without_reply: true },
    text: reply,
  })

  if (isPrivate && command === 'start') {
    const payload = text.match(/^\/start(?:@[A-Za-z0-9_]+)?(?:\s+([A-Za-z0-9_-]{1,64}))?/iu)?.[1] || ''
    if (isPairedOwner) {
      await replyToMessage('سلام. بات گزارش‌های تلگرام آماده است. برای دستورها /help را بفرستید.')
      return false
    }
    const pairing = payload ? await readJson(ownerPairingFile, null) : null
    const providedHash = payload ? createHash('sha256').update(payload).digest() : Buffer.alloc(0)
    const expectedHash = pairing?.codeHash ? Buffer.from(pairing.codeHash, 'hex') : Buffer.alloc(0)
    const validPairing = Boolean(payload)
      && !owner?.userId
      && !pairing?.usedAt
      && Date.parse(pairing?.expiresAt || '') > Date.now()
      && expectedHash.length === providedHash.length
      && timingSafeEqual(expectedHash, providedHash)
    if (validPairing) {
      await writeJsonAtomically(ownerFile, { userId: String(message.from.id), chatId: String(message.chat.id), pairedAt: new Date().toISOString() })
      await writeJsonAtomically(ownerPairingFile, { ...pairing, codeHash: '', usedAt: new Date().toISOString() })
      await replyToMessage('اتصال مدیر فعال شد. از اینجا می‌توانید وضعیت صندوق را ببینید و گزارش تازه بفرستید. /help')
    } else {
      await replyToMessage('این گفت‌وگو هنوز به مدیر سایت وصل نشده است. برای راهنمای دستورهای عمومی /help را بفرستید.')
    }
    return false
  }

  if (isPrivate && command === 'help') {
    await replyToMessage('من گزارش‌های گروه پروژه را در سایت محلی جمع می‌کنم. مدیرِ وصل‌شده می‌تواند /new برای گزارش تازه، /status برای وضعیت دریافت و /pending برای تعداد گزارش‌های بررسی‌نشده بفرستد. گفت‌وگوی آزاد هوش مصنوعی در این بات فعال نیست.')
    return false
  }
  if (isPrivate && !isPairedOwner) {
    await replyToMessage('این بات برای گفت‌وگوی خصوصی فقط به مدیر سایت وصل می‌شود. گزارش‌های گروه همچنان در صندوق محلی ثبت می‌شوند.')
    return false
  }
  if (isPrivate && (command === 'status' || command === 'pending')) {
    const pending = inbox.filter((record) => !['published', 'dismissed'].includes(record.review))
    if (command === 'status') {
      const health = await readJson(healthFile, {})
      const checkedAt = Date.parse(health.checkedAt || '')
      const connected = health.status === 'connected' && Date.now() - checkedAt < 120000
      const photos = pending.reduce((total, record) => total + (record.photoPaths?.length || (record.photoPath ? 1 : 0)), 0)
      await replyToMessage(`وضعیت بات: ${connected ? 'متصل' : 'نیازمند بررسی'}\nگزارش‌های بررسی‌نشده: ${pending.length}\nعکس‌های خصوصی در صندوق: ${photos}`)
    } else {
      const preview = pending.slice(-3).reverse().map((record) => {
        const summary = String(record.text || 'گزارش تصویری بدون متن').replace(/\s+/gu, ' ').slice(0, 110)
        return `• ${record.project || record.category || 'گزارش تلگرام'} — ${summary}`
      }).join('\n')
      await replyToMessage(`گزارش‌های بررسی‌نشده: ${pending.length}${preview ? `\n\nتازه‌ترین موارد:\n${preview}` : ''}`)
    }
    return false
  }

  if (command === 'new' || command === 'report') {
    await showCategoryMenu(message)
    return false
  }
  if (command === 'cancel') {
    if (key) sessions.delete(key)
    await telegram('sendMessage', {
      chat_id: message.chat.id,
      reply_parameters: { message_id: message.message_id, allow_sending_without_reply: true },
      text: 'ثبت گزارش لغو شد.',
    })
    return false
  }
  if (command === 'help') {
    await telegram('sendMessage', {
      chat_id: message.chat.id,
      reply_parameters: { message_id: message.message_id, allow_sending_without_reply: true },
      text: `برای ثبت گزارش دسته‌بندی‌شده، /new@${botUsername} را بفرستید، دسته را انتخاب کنید و سپس به پیام بات پاسخ دهید. فقط پاسخ به پیام ثبت انتخاب‌شده ذخیره می‌شود.`,
    })
    return false
  }
  if (/^\/[a-z_]+(?:@[A-Za-z0-9_]+)?(?:\s|$)/iu.test(text) && !command) {
    if (isPrivate) await replyToMessage('این دستور را نمی‌شناسم. /help را بفرستید.')
    return false
  }
  const isEdited = Boolean(message.edit_date)
  if (command || (!text && !hasMedia(message) && !isEdited)) return false

  const pendingSession = key ? sessions.get(key) : null
  if (pendingSession && Date.now() - pendingSession.startedAt >= 60 * 60 * 1000) {
    sessions.delete(key)
  }
  const session = pendingSession
    && Date.now() - pendingSession.startedAt < 60 * 60 * 1000
    && (isPrivate || message.reply_to_message?.message_id === pendingSession.promptMessageId)
    ? pendingSession
    : null
  if (isPrivate && !session && (text || hasMedia(message))) {
    await replyToMessage('برای ارسال گزارش تازه، اول /new را بفرستید. برای دستورهای بات /help را ببینید.')
    return false
  }
  if (!session && (isPrivate || !automaticCapture)) return false

  const photo = newestPhoto(message)
  let localPhoto = null
  if (photo) {
    try { localPhoto = await storePhoto(message, photo) }
    catch (error) { throw new Error(`Photo for message ${message.message_id} could not be saved; update retained for retry: ${error.message}`) }
  }

  const computedRecordKey = message.media_group_id
    ? `${message.chat.id}:album:${message.media_group_id}`
    : `${message.chat.id}:${message.message_id}`
  let previousIndex = inbox.findIndex((item) => item.recordKey === computedRecordKey)
  if (previousIndex < 0 && isEdited) {
    previousIndex = inbox.findIndex((item) => (item.sourceMessageIds ?? []).includes(message.message_id))
  }
  const previous = previousIndex >= 0 ? inbox[previousIndex] : null
  const previousPhotoPaths = previous?.photoPaths ?? (previous?.photoPath ? [previous.photoPath] : [])
  const editedPhotoPrefix = `${message.chat.id}-${message.message_id}`
  const isPreviousPhotoForEditedMessage = (photoPath) => {
    const filename = path.posix.basename(photoPath)
    return filename === `${editedPhotoPrefix}.jpg`
      || filename.startsWith(`${editedPhotoPrefix}-`)
      || filename.startsWith(`export-${message.message_id}-`)
  }
  const photoPaths = isEdited
    ? previousPhotoPaths.filter((photoPath) => !isPreviousPhotoForEditedMessage(photoPath))
    : [...previousPhotoPaths]
  if (localPhoto && !photoPaths.includes(localPhoto)) photoPaths.push(localPhoto)
  const classifiedText = isEdited ? text : (text || previous?.text || '')
  const classified = classify(classifiedText)
  const chosenCategory = session?.categoryTitle ?? previous?.selectedCategory ?? null
  const hasDocument = isEdited ? Boolean(message.document) : Boolean(message.document || previous?.hasDocument)
  const hasVideo = isEdited
    ? Boolean(message.video || message.animation)
    : Boolean(message.video || message.animation || previous?.hasVideo)
  const hasPhoto = photoPaths.length > 0
  const revisionHistory = [...(previous?.revisionHistory ?? [])]
  const sourceChanged = previous && (
    previous.text !== classifiedText
    || previous.editedAt !== (message.edit_date ? new Date(message.edit_date * 1000).toISOString() : null)
    || JSON.stringify(previous.photoPaths ?? []) !== JSON.stringify(photoPaths)
    || Boolean(previous.hasDocument) !== hasDocument
    || Boolean(previous.hasVideo) !== hasVideo
  )
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
    recordKey: previous?.recordKey ?? computedRecordKey,
    sourceUpdateId: updateId,
    sourceMessageId: previous?.sourceMessageId ?? message.message_id,
    sourceChatId: String(message.chat.id),
    replyToMessageId: message.reply_to_message?.message_id ?? null,
    replyContext: cleanText(message.reply_to_message ?? {}),
    sourceMessageIds: [...new Set([...(previous?.sourceMessageIds ?? []), message.message_id])],
    mediaGroupId: message.media_group_id ?? previous?.mediaGroupId ?? null,
    date: new Date(message.date * 1000).toISOString(),
    editedAt: message.edit_date ? new Date(message.edit_date * 1000).toISOString() : null,
    ...classified,
    category: chosenCategory ?? previous?.category ?? classified.categories[0],
    selectedCategory: chosenCategory,
    inputMode: chosenCategory ? 'category-menu' : 'automatic',
    text: classifiedText,
    hasPhoto,
    hasDocument,
    hasVideo,
    photoPaths: [...new Set(photoPaths)],
    revisionHistory,
    importSource: 'telegram-live',
    review: 'unreviewed',
  }
  if (previousIndex >= 0) inbox[previousIndex] = record
  else inbox.push(record)

  if (session) {
    try {
      await telegram('sendMessage', {
        chat_id: message.chat.id,
        reply_parameters: { message_id: message.message_id, allow_sending_without_reply: true },
        text: `ثبت شد. دسته: ${record.category} | پروژه: ${record.project} | وضعیت: ${record.status}`,
      })
    } catch (error) { console.warn(`Submission confirmation could not be sent: ${error.message}`) }
  }
  console.log(`[${record.date}] ${record.project} | ${record.categories.join(', ')} | ${record.status}`)
  return true
}

async function runBot() {
  if (!groupId) throw new Error('TELEGRAM_GROUP_ID is missing. First run: npm run telegram:discover-group')
  const me = await telegram('getMe')
  botUsername = me.username
  await telegram('setMyCommands', {
    scope: { type: 'all_private_chats' },
    commands: [
      { command: 'start', description: 'شروع گفت‌وگو با بات' },
      { command: 'new', description: 'ثبت گزارش تازه' },
      { command: 'cancel', description: 'لغو ثبت گزارش' },
      { command: 'help', description: 'راهنمای بات' },
      { command: 'status', description: 'وضعیت بات و صندوق' },
      { command: 'pending', description: 'گزارش‌های بررسی‌نشده' },
    ],
  })
  await telegram('setMyCommands', {
    scope: { type: 'all_group_chats' },
    commands: [
      { command: 'new', description: 'ثبت گزارش دسته‌بندی‌شده' },
      { command: 'cancel', description: 'لغو ثبت گزارش' },
      { command: 'help', description: 'راهنمای ثبت گزارش' },
    ],
  })
  await telegram('setMyCommands', {
    commands: [
      { command: 'start', description: 'شروع گفت‌وگو با بات' },
      { command: 'new', description: 'ثبت گزارش دسته‌بندی‌شده' },
      { command: 'cancel', description: 'لغو ثبت گزارش' },
      { command: 'help', description: 'راهنمای ثبت گزارش' },
      { command: 'status', description: 'وضعیت بات و صندوق' },
      { command: 'pending', description: 'گزارش‌های بررسی‌نشده' },
    ],
  })
  let state = await readJson(stateFile, { lastUpdateId: 0 })
  state = { ...state, lastUpdateId: Number(state.lastUpdateId ?? 0) }
  const targetGroup = await telegram('getChat', { chat_id: groupId })
  if (!['group', 'supergroup'].includes(targetGroup.type) || targetGroup.title !== authorizedGroupTitle) {
    throw new Error(`Configured group must be exactly: ${authorizedGroupTitle}`)
  }
  console.log(`Listening as @${me.username}; private inbox: ${path.relative(projectRoot, inboxFile)}`)
  console.log(`Capture mode: ${automaticCapture ? 'automatic group reports' : 'direct category replies'}; group: ${targetGroup.title}`)
  const membership = await telegram('getChatMember', { chat_id: groupId, user_id: me.id })
  const receivesOrdinaryMessages = Boolean(me.can_read_all_group_messages || membership.status === 'administrator')
  let lastSuccessfulPollAt = null
  const writeHealth = (extra = {}) => writeJsonAtomically(healthFile, {
    checkedAt: new Date().toISOString(),
    groupTitle: targetGroup.title,
    automaticCapture,
    privacyModeDisabled: Boolean(me.can_read_all_group_messages),
    groupMembershipStatus: membership.status,
    receivesOrdinaryMessages,
    publication: 'pending-assistant-review',
    ...(lastSuccessfulPollAt ? { lastSuccessfulPollAt } : {}),
    ...(state.lastOrdinaryGroupMessageAt ? { lastOrdinaryGroupMessageAt: state.lastOrdinaryGroupMessageAt } : {}),
    ...extra,
  })
  await writeHealth({ receiverProcessId: process.pid, status: 'connecting' })
  if (automaticCapture && !me.can_read_all_group_messages && membership.status !== 'administrator') {
    console.warn('ACTION REQUIRED: Telegram privacy mode prevents ordinary group report delivery. Disable bot privacy in BotFather, then remove and re-add the bot to this group, or grant administrator membership in this group.')
  }

  while (true) {
    let updates
    try {
      updates = await telegram('getUpdates', {
        offset: Number(state.lastUpdateId ?? 0) + 1,
        limit: 100,
        timeout: 15,
        allowed_updates: ['message', 'edited_message', 'callback_query'],
      })
      lastSuccessfulPollAt = new Date().toISOString()
      await writeHealth({ receiverProcessId: process.pid, status: 'connected' })
    } catch (error) {
      console.error(`${error.message}. Retrying in 5 seconds.`)
      await writeHealth({ receiverProcessId: process.pid, status: 'retrying', lastError: error.message })
      await pause(5000)
      continue
    }
    if (!updates.length) continue

    for (const update of updates) {
      try {
        if (update.callback_query) await processCategorySelection(update.callback_query)
        const message = update.message ?? update.edited_message
        const changed = message ? await withTelegramInboxLock(async () => {
          const inbox = await readJson(inboxFile, [])
          if (!Array.isArray(inbox)) throw new Error('The private Telegram inbox is not an array.')
          const captured = await processMessage(message, update.update_id, inbox)
          if (captured) await writeJsonAtomically(inboxFile, inbox)
          return captured
        }) : false
        if (changed) {
          state.lastOrdinaryGroupMessageAt = new Date().toISOString()
        }
        state.lastUpdateId = update.update_id
        state.lastReceivedAt = new Date().toISOString()
        await writeJsonAtomically(stateFile, state)
        if (changed) await writeHealth({ receiverProcessId: process.pid, status: 'connected' })
      } catch (error) {
        console.error(`Update ${update.update_id} failed: ${error.message}. Retrying without advancing the cursor.`)
        break
      }
    }
  }
}

if (process.argv.includes('--discover')) await discoverGroup()
else await runBot()
