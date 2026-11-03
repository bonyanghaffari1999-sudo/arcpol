import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const exportDirectory = process.env.TELEGRAM_EXPORT_DIR || path.resolve(projectRoot, '..', 'Telegram Desktop', 'ChatExport_2026-10-24')
const publicDirectory = path.join(projectRoot, 'public', 'telegram')
const outputFile = path.join(projectRoot, 'src', 'telegram-projects.json')
const reportsFile = path.join(projectRoot, 'src', 'telegram-reports.json')
const syncStateFile = path.join(projectRoot, 'src', 'telegram-sync-meta.json')
const syncLockFile = path.join(projectRoot, 'tmp', 'telegram-sync.lock')

const htmlEntities = {
  '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'",
  '&lt;': '<', '&gt;': '>', '&zwnj;': '\u200c', '&zwj;': '\u200d',
}

function decodeHtml(value) {
  return value
    .replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&(?:nbsp|amp|quot|apos|lt|gt|zwnj|zwj);/g, (entity) => htmlEntities[entity] ?? entity)
}

const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function acquireSyncLock() {
  await fs.mkdir(path.dirname(syncLockFile), { recursive: true })
  const deadline = Date.now() + 3 * 60_000
  while (Date.now() < deadline) {
    try {
      const handle = await fs.open(syncLockFile, 'wx')
      try {
        await handle.writeFile(`${process.pid}\n`)
      } catch (error) {
        await handle.close().catch(() => {})
        await fs.unlink(syncLockFile).catch(() => {})
        throw error
      }
      return async () => {
        await handle.close().catch(() => {})
        await fs.unlink(syncLockFile).catch(() => {})
      }
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      try {
        const [pidText, stat] = await Promise.all([
          fs.readFile(syncLockFile, 'utf8'),
          fs.stat(syncLockFile),
        ])
        const pid = Number(pidText.trim())
        let alive = Boolean(pid)
        if (pid) {
          try { process.kill(pid, 0) } catch (processError) {
            alive = processError.code === 'EPERM'
          }
        }
        if (!alive && Date.now() - stat.mtimeMs > 2_000) {
          await fs.unlink(syncLockFile).catch(() => {})
          continue
        }
      } catch (lockError) {
        if (lockError.code === 'ENOENT') continue
      }
      await pause(250)
    }
  }
  throw new Error('Timed out waiting for the Telegram sync lock.')
}

function stripHtml(value) {
  return decodeHtml(value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(?:p|div|li)>/gi, '\n')
    .replace(/<[^>]*>/g, ' '))
    .replace(/[\u200b\ufeff]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

function normalize(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\u064a\u0649]/g, 'ی')
    .replace(/\u0643/g, 'ک')
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[\u064b-\u065f\u0670]/g, '')
    .replace(/[\u200c\u200d\s]+/g, ' ')
    .replace(/[^\p{L}\p{N}/]+/gu, ' ')
    .trim()
    .toLocaleLowerCase('fa-IR')
}

function parseDate(rawDate) {
  const match = rawDate?.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+UTC([+-])(\d{2}):(\d{2})/)
  if (!match) return null
  const [, day, month, year, hour, minute, second, sign, offsetHour, offsetMinute] = match
  const offset = (Number(offsetHour) * 60 + Number(offsetMinute)) * (sign === '+' ? 1 : -1)
  const utc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)) - offset * 60_000
  return new Date(utc).toISOString()
}

function extractMessages(source) {
  const starts = [...source.matchAll(/<div class="message default clearfix[^\"]*" id="message(\d+)"/g)]
  return starts.map((match, index) => {
    const start = match.index
    const end = starts[index + 1]?.index ?? source.length
    const block = source.slice(start, end)
    const dateText = block.match(/<div class="pull_right date details" title="([^\"]+)"/)?.[1] ?? ''
    const text = [...block.matchAll(/<div class="text[^\"]*">([\s\S]*?)<\/div>/g)]
      .map((part) => stripHtml(part[1]))
      .filter(Boolean)
      .join('\n')
    const photos = [...new Set([...block.matchAll(/(?:href|src)="(photos\/[^\"]+)"/g)]
      .map((part) => decodeHtml(part[1]).replaceAll('\\/', '/'))
      .filter((name) => !/_thumb\.[^./]+$/i.test(name)))]
    return {
      id: Number(match[1]),
      date: parseDate(dateText),
      text,
      photos,
      complete: block.trimEnd().endsWith('</div>'),
    }
  }).filter((message) => message.complete && (message.text || message.photos.length))
}

async function readExports() {
  let entries
  try {
    entries = await fs.readdir(exportDirectory, { withFileTypes: true })
  } catch {
    return []
  }
  const files = entries
    .filter((entry) => entry.isFile() && /^messages\d*\.html$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
  const byId = new Map()
  for (const file of files) {
    let html
    try {
      html = await fs.readFile(path.join(exportDirectory, file), 'utf8')
    } catch {
      continue
    }
    for (const message of extractMessages(html)) {
      const existing = byId.get(message.id)
      byId.set(message.id, {
        ...existing,
        ...message,
        text: message.text.length > (existing?.text.length ?? 0) ? message.text : (existing?.text ?? message.text),
        photos: [...new Set([...(existing?.photos ?? []), ...message.photos])],
      })
    }
  }
  return [...byId.values()].sort((left, right) => left.id - right.id)
}

function projectFromMessage(message) {
  if (!message.text) return null
  const projectMatch = message.text.match(/(?:^|\s)پروژه\s+([^\n]+)/u)
  if (!projectMatch) return null
  const rest = projectMatch[1].trim()
  const title = rest.split(/\s+(?=کارفرما\s*[:：]?|پلاک(?:\s+ثبتی)?\s*[:：]?|تاریخ\s+(?:بازدید|:)|در\s+مرحله|مرحله\s*[:：])/u)[0]
    .split(/[،,؛;\n]/u)[0]
    .replace(/^[\s:：-]+|[\s:：-]+$/g, '')
  if (!title || normalize(title).length < 3 || /^(?:در\s+مرحله|مرحله|بدون\s+نام)$/u.test(normalize(title))) return null
  const stableId = message.text.match(/(?:پلاک\s*ثبتی|شناسه\s*پروژه|کد\s*پروژه|شماره\s*پروژه|کد\s*قرارداد|شماره\s*قرارداد)\s*[:：]?\s*([0-9۰-۹٠-٩][0-9۰-۹٠-٩/\-]*)/u)?.[1] ?? ''
  return { stableKey: normalize(stableId).replaceAll(' ', '') }
}

function locationFor(text) {
  const normalizedText = normalize(text)
  const has = (...terms) => terms.some((term) => normalizedText.includes(normalize(term)))

  if (has('فردیس')) {
    if (has('کانال', 'فلکه اول', 'فلکه دوم', 'فلکه سوم', 'فلکه چهارم', 'فلکه پنجم', 'خیام', 'قریشی', 'سرحدی')) return 'فردیس، منطقه ۱'
    if (has('شهرک وحدت', 'منظریه', 'خیابان اهری', 'رزکان نو', 'واریانشهر', 'شهرک ارم')) return 'فردیس، منطقه ۲'
    return 'فردیس'
  }

  const places = [
    ['نظرآباد', 'نظرآباد'], ['محمدشهر', 'محمدشهر'], ['مهستان', 'مهستان'],
    ['هشتگرد', 'هشتگرد'], ['ماهدشت', 'ماهدشت'], ['کلاک', 'کرج، کلاک'],
    ['جهانشهر', 'کرج، جهانشهر'], ['عظیمیه', 'کرج، عظیمیه، منطقه ۱'],
    ['رجایی شهر', 'کرج، رجایی‌شهر'], ['رجایی‌شهر', 'کرج، رجایی‌شهر'],
    ['گوهردشت', 'کرج، گوهردشت'], ['دهقان ویلا', 'کرج، دهقان‌ویلا'],
    ['دهقان‌ویلا', 'کرج، دهقان‌ویلا'], ['شاهین ویلا', 'کرج، شاهین‌ویلا'],
    ['مهرشهر', 'کرج، مهرشهر'], ['کیان مهر', 'کرج، کیانمهر'], ['کیانمهر', 'کرج، کیانمهر'],
    ['کمالشهر', 'کمالشهر'], ['گلشهر', 'کرج، گلشهر'], ['حصارک', 'کرج، حصارک'], ['گلسار', 'گلسار'],
    ['اشتهارد', 'اشتهارد'], ['چهارباغ', 'چهارباغ'], ['مشکین دشت', 'مشکین‌دشت'],
    ['کرج', 'کرج'],
  ]
  return places.find(([key]) => normalizedText.includes(normalize(key)))?.[1] ?? 'استان البرز'
}

function usageFor(text) {
  return /(?:تجاری|فروشگاه|مغازه|پاساژ|مرکز\s*خرید)/u.test(normalize(text)) ? 'تجاری' : 'مسکونی'
}

function serviceFor(text) {
  const normalizedText = normalize(text)
  const explicitExecution = /(?:نظارت\s+و\s+اجرا|اجرا\s+و\s+نظارت|(?:شرکت|مجموعه|گروه|تیم|خدمات|قرارداد|مسئولیت|پیمانکار)\s+(?:اجرایی|اجرا|مجری))/u.test(normalizedText)
  return explicitExecution ? 'نظارت و اجرا' : 'نظارت'
}

const privateField = /(?:کارفرما|مالک|صاحب\s*کار|نام\s*(?:کارفرما|مالک|پروژه|مهندس|ناظر|مسئول)|پلاک\s*(?:ثبتی)?|شناسه\s*پروژه|کد\s*پروژه|شماره\s*پروژه|کد\s*قرارداد|شماره\s*قرارداد|نشانی|آدرس|خیابان|کوچه|نبش|کد\s*پستی|شماره\s*(?:تماس|تلفن|ثبت|ثبت\s*شرکت)|تلفن|موبایل|همراه|تماس\s*با|کارکنان|پرسنل|مسئول\s*(?:اجرا|پروژه|فنی)|ناظر\s*[:：]|شرکت\s*[:：])/u
const addressDetails = /(?:بلوار|خیابان|خیاب|کوچه|کوچ|نبش|میدان|فلکه|چهارراه|سه\s*راه|اتوبان|بزرگراه|جاده|کانال|شهرک|بن\s*بست|\d+\s*متری|[۰-۹٠-٩]+\s*متری|(?:^|\s)خ\s|پلاک|نشانی|آدرس)/u
const adverseLanguage = /(?:عدم|نشد|نشده|نشدند|نشود|نشوند|نکرد|نمی\s|ایراد|اشکال|مشکل|نقص|خراب|خرابی|کرمو|ترک|ریزش|شکست|خطا|اشتباه|نادرست|نامناسب|ناایمن|خطر|تخریب|تذکر|هشدار|دستور|تخلف|ممنوع|نباید|بهتر\s+بود|توصیه|کافی\s+نیست|مناسب\s+نیست|غیر\s*مجاز|غیرمجاز|مغایر|خلاف|اغماض|توقف|متوقف|تأخیر|تاخیر|شکایت|اخطار|جریمه|مسئولیت|مقصر|حقوقی|قانونی|دادگاه|بدون\s+(?:اطلاع|اجازه|مجوز)|اصلاح|رفع|برطرف|نریزه|نریزد|تعیین\s+تکلیف|تکمیل\s+نشده|نیاز\s+به\s+(?:تأیید|تایید|مجوز|پیگیری|اصلاح|رفع|بازبینی)|(?:تأیید|تایید)\s+(?:محاسب|ناظر|کارفرما)|طراحی\s+مجدد|بریده|قطع\s+(?:شد|شده)|حذف\s+(?:تیر|ستون|دیوار|عضو)|تغییر\s+(?:در|نقشه|طرح|سازه))/u
const directionalStreetName = /(^|[\s،,])([\p{L}‌-]{2,}\s+(?:اول|دوم|سوم|چهارم|پنجم|ششم|هفتم|هشتم|نهم|دهم|[0-9۰-۹٠-٩]+)\s+(?:شرقی|غربی|شمالی|جنوبی)(?=$|[\s،,;.!؟]))/gu

function anonymizeHonorifics(value) {
  const roleWords = /^(?:ناظر|مشاور|طراح|محاسب|عمران|سازه|کارگاه|اجرا|پیمانکار|معمار|برق|مکانیک|تأسیسات|تاسیسات|فنی|مسئول|کارشناس|سرپرست|مدیر)$/u
  let text = value.replace(/(?:جناب\s+آقای|سرکار\s+خانم|آقای|خانم|دکتر)\s+[\p{L}‌]+(?:\s+[\p{L}‌]+){0,2}/gu, 'مسئول مربوط')
  return text.replace(/مهندس\s+([\p{L}‌]+)(?:\s+([\p{L}‌]+))?/gu, (match, first, second) => {
    if (roleWords.test(first)) return `مهندس ${first}`
    if (second && roleWords.test(second)) return `مهندس ${second}`
    return 'مسئول فنی'
  })
}

function sanitizeReportText(raw) {
  const lines = raw.split(/\n+/u).flatMap((line) => line.split(/(?<=[.!؟])\s+/u))
  const safe = []
  for (let line of lines) {
    line = line.trim()
    if (!line || /(?:^|\s)پروژه\s+/u.test(line)) continue
    line = line.replace(directionalStreetName, '$1').replace(/[\t ]{2,}/gu, ' ').trim()
    if (!line) continue
    line = line.replace(/\s*[([{（]\s*[\p{L}‌]+(?:\s+[\p{L}‌]+){1,3}\s*[)\]}）]\s*/gu, ' ').trim()
    if (!line) continue
    if (/^[([{（]\s*[\p{L}‌]+(?:\s+[\p{L}‌]+){1,3}\s*[)\]}）]\s*$/u.test(line)) continue
    if (privateField.test(line)) continue
    if (/^[0-9۰-۹٠-٩]+(?:\s*[/\-]\s*[0-9۰-۹٠-٩]+)+$/u.test(line)) continue
    if (addressDetails.test(line)) {
      const remainingParts = line.split(/\s*\/\s*/u).filter((part) => !addressDetails.test(part) && !privateField.test(part))
      line = remainingParts.join(' / ').trim()
      if (!line || addressDetails.test(line) || privateField.test(line)) continue
    }
    if (/(?:واحد\s*[0-9۰-۹]|طبقه\s*[0-9۰-۹]|ساختمان\s*[0-9۰-۹])/u.test(line)) continue
    line = anonymizeHonorifics(line)
      .replace(/(?:\+?98|0098|0)\s*9[0-9۰-۹٠-٩](?:[\s\-()]*[0-9۰-۹٠-٩]){8,10}/gu, ' ')
      .replace(/(?:\+?98|0098|0)\s*2[0-9۰-۹٠-٩]{2,3}(?:[\s\-()]*[0-9۰-۹٠-٩]){6,8}/gu, ' ')
      .replace(/[\t ]{2,}/gu, ' ')
      .trim()
    if (line && !/^[:：،؛,\-–—]+$/u.test(line)) safe.push(line)
  }
  return safe.join('\n').slice(0, 1800)
}

function explicitStage(text) {
  const match = text.match(/(?:در\s+)?مرحله\s*[:：]?\s*([^\n،؛.!؟]{2,70})/u)
  return match?.[1]?.trim() || 'گزارش کارگاهی'
}

function neutralTopic(text) {
  const stage = text.match(/(?:در\s+)?مرحله\s*[:：]?\s*([^\n،؛.!؟]{2,70})/u)?.[1]
  const focus = text.match(/(?:موضوع|حوزه(?:ی)?\s+(?:کنترل|فنی))\s*[:：]\s*([^\n،؛.!؟]{2,70})/u)?.[1]
  const candidate = String(stage || focus || '').trim()
  if (!candidate) return ''
  const topic = sanitizeReportText(candidate).replace(/^اجرایی\s*[:：]?\s*/u, '').trim()
  if (!topic || adverseLanguage.test(normalize(topic)) || privateField.test(topic) || addressDetails.test(topic)) return ''
  return topic
}

function eventFrom(message, text) {
  const normalized = normalize(text)
  const adverse = adverseLanguage.test(normalized)
  const topic = neutralTopic(text)
  const title = adverse
    ? topic ? `بازدید اجرایی: ${topic}` : 'گزارش فنی کارگاهی'
    : sanitizeReportText(explicitStage(text)) || 'گزارش کارگاهی'
  const summary = adverse
    ? topic ? 'نکات فنی مرتبط با این بخش در گزارش بازدید ثبت شد.' : 'موضوع فنی در گزارش بازدید ثبت شد.'
    : sanitizeReportText(text)
  const resolved = /(?:برطرف|رفع|اصلاح)\s+(?:شد|گردید|شده\s+است|گردیده\s+است)|(?:مورد\s+)?(?:تأیید|تاييد)\s+(?:شد|گردید)/u.test(normalized)
  const followUp = !resolved && /(?:نیاز\s+به\s+پیگیری|پیگیری\s+(?:شود|گردد|لازم)|تذکر\s+(?:داده\s+شد|شد)|اصلاح\s+(?:شود|گردد|لازم)|رفع\s+(?:شود|گردد|لازم)|برطرف\s+(?:شود|گردد|لازم))/u.test(normalized)
  const projectCompleted = /(?:پروژه\s+(?:به\s+)?(?:اتمام|پایان)\s+رسید|پروژه\s+(?:تکمیل|تحویل)\s+(?:شد|گردید)|عملیات\s+(?:به\s+)?(?:اتمام|پایان)\s+رسید|تحویل\s+نهایی\s+(?:شد|گردید))/u.test(normalized)
  const focus = text.match(/(?:موضوع|حوزه(?:ی)?\s+(?:کنترل|فنی))\s*[:：]\s*([^\n،؛.!؟]{2,70})/u)?.[1]?.trim()
  return {
    date: message.date,
    title,
    summary,
    ...(focus && !privateField.test(focus) ? { focus: sanitizeReportText(focus) } : {}),
    status: resolved ? 'resolved' : followUp ? 'follow-up' : 'logged',
    photoSources: [...message.photos],
    projectCompleted,
  }
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return [0, 0]
  let index = 2
  while (index + 9 < buffer.length) {
    if (buffer[index] !== 0xff) { index += 1; continue }
    const marker = buffer[index + 1]
    const length = buffer.readUInt16BE(index + 2)
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return [buffer.readUInt16BE(index + 7), buffer.readUInt16BE(index + 5)]
    }
    if (length < 2) break
    index += length + 2
  }
  return [0, 0]
}

function imageDimensions(buffer) {
  const jpeg = jpegDimensions(buffer)
  if (jpeg[0] && jpeg[1]) return jpeg
  if (buffer.length >= 24 && buffer.toString('hex', 0, 8) === '89504e470d0a1a0a') {
    return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)]
  }
  if (buffer.length >= 30 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
    const kind = buffer.toString('ascii', 12, 16)
    if (kind === 'VP8X') return [1 + buffer.readUIntLE(24, 3), 1 + buffer.readUIntLE(27, 3)]
    if (kind === 'VP8L' && buffer[20] === 0x2f) {
      return [1 + (((buffer[22] & 0x3f) << 8) | buffer[21]), 1 + (((buffer[24] & 0x0f) << 10) | (buffer[23] << 2) | ((buffer[22] & 0xc0) >> 6))]
    }
    if (kind === 'VP8 ' && buffer.length >= 30) return [buffer.readUInt16LE(26) & 0x3fff, buffer.readUInt16LE(28) & 0x3fff]
  }
  return [0, 0]
}

async function bestPhoto(photoPaths) {
  const candidates = []
  for (const relative of photoPaths) {
    const sourcePath = path.join(exportDirectory, relative)
    try {
      const stat = await fs.stat(sourcePath)
      if (!stat.isFile()) continue
      const handle = await fs.open(sourcePath, 'r')
      const header = Buffer.alloc(Math.min(256 * 1024, stat.size))
      await handle.read(header, 0, header.length, 0)
      await handle.close()
      const [width, height] = imageDimensions(header)
      candidates.push({ relative, sourcePath, size: stat.size, pixels: width * height })
    } catch {
      // A photo can arrive a moment after its message while Telegram is still exporting.
    }
  }
  candidates.sort((left, right) => right.pixels - left.pixels || right.size - left.size)
  return candidates[0] ?? null
}

async function persistPhotos(projects) {
  await fs.mkdir(publicDirectory, { recursive: true })
  const keep = new Set()
  for (const project of projects) {
    for (const event of project.timeline) {
      const selected = await bestPhoto(event.photoSources)
      delete event.photoSources
      if (!selected) { event.image = null; continue }
      const filename = path.basename(selected.relative)
      const destination = path.join(publicDirectory, filename)
      try {
        await fs.copyFile(selected.sourcePath, destination)
        keep.add(filename)
        event.image = `/telegram/${filename}`
      } catch {
        event.image = null
      }
    }
    const ordered = [...project.timeline].reverse()
    project.images = ordered.map((event) => event.image).filter(Boolean)
    project.finalImage = project.timeline.findLast((event) => event.projectCompleted && event.image)?.image ?? null
  }
  for (const name of await fs.readdir(publicDirectory)) {
    if (/^photo_\d+@[^/\\]+\.(?:jpe?g|png|webp)$/i.test(name) && !keep.has(name)) {
      await fs.unlink(path.join(publicDirectory, name)).catch(() => {})
    }
  }
}

async function main() {
  const messages = await readExports()
  if (!messages.length) {
    if (!process.argv.includes('--quiet')) console.log('Telegram export is empty or unavailable; prior synchronized data and images were retained.')
    return
  }

  const projectsByStableId = new Map()
  const independentReports = []
  let activeEvent = null

  for (const message of messages) {
    const info = projectFromMessage(message)
    if (info) {
      let record
      if (info.stableKey) {
        record = projectsByStableId.get(info.stableKey)
        if (!record) {
          record = { publicOrder: message.id, location: locationFor(message.text), sourceText: [], timeline: [] }
          projectsByStableId.set(info.stableKey, record)
        }
      } else {
        record = { publicOrder: message.id, location: locationFor(message.text), sourceText: [], timeline: [], independent: true }
        independentReports.push(record)
      }
      const event = eventFrom(message, message.text)
      event.sourceOrder = message.id
      record.timeline.push(event)
      record.sourceText.push(message.text)
      activeEvent = event
      continue
    }

    if (!message.text && message.photos.length && activeEvent && message.date === activeEvent.date) {
      activeEvent.photoSources.push(...message.photos)
    } else {
      activeEvent = null
    }
  }

  const linked = [...projectsByStableId.values()]
    .filter((project) => project.timeline.length)
    .sort((left, right) => left.publicOrder - right.publicOrder)
  independentReports.sort((left, right) => left.publicOrder - right.publicOrder)
  const eventCount = linked.reduce((count, item) => count + item.timeline.length, 0)
    + independentReports.reduce((count, item) => count + item.timeline.length, 0)

  let previousEventCount = 0
  try {
    const syncState = JSON.parse(await fs.readFile(syncStateFile, 'utf8'))
    previousEventCount = Number(syncState.sourceEventCount) || 0
  } catch { /* First filtered import falls back to the unfiltered previous output. */ }
  if (!previousEventCount) {
    for (const file of [outputFile, reportsFile]) {
      try {
        const existing = JSON.parse(await fs.readFile(file, 'utf8'))
        previousEventCount += existing.reduce((count, item) => count + (item.timeline?.length ?? 0), 0)
      } catch { /* Missing or invalid prior output is handled as a first import. */ }
    }
  }
  if (previousEventCount && eventCount < previousEventCount) {
    if (!process.argv.includes('--quiet')) console.log(`Telegram export contains ${eventCount} report events, fewer than the ${previousEventCount} already synchronized; prior data and images were retained.`)
    return
  }

  const makeRecord = (project, index, independent = false) => {
      const latest = project.timeline.at(-1)
      const completed = project.timeline.some((event) => event.projectCompleted)
      const tags = [...new Set(project.timeline.map((event) => event.focus).filter(Boolean))]
      const sourceText = project.sourceText.join('\n')
      const service = serviceFor(sourceText)
      return {
        id: independent ? 71 + linked.length + index : 71 + index,
        code: `${independent ? 'R' : 'G'}-${String(independent ? index + 1 : index + 71).padStart(3, '0')}`,
        status: completed ? 'completed' : 'history',
        type: independent ? 'گزارش مستقل' : service,
        address: locationFor(sourceText),
        usage: usageFor(sourceText),
        description: independent
          ? 'گزارش تصویری مستقل کارگاهی.'
          : 'گزارش تصویری پروژه‌های شرکت.',
        tags,
        services: [service],
        updatedAt: latest.date,
        timeline: project.timeline,
        images: [],
        finalImage: null,
        source: independent ? 'telegram-report' : 'field-reports',
      }
  }

  const linkedProjects = linked.map((project, index) => makeRecord(project, index, false))
  const standalone = independentReports.map((report, index) => makeRecord(report, index, true))
  const allRecords = [...linkedProjects, ...standalone]

  await persistPhotos(allRecords)
  const publicRecord = (project) => {
    const timeline = project.timeline
      .filter((event) => event.image)
      .sort((left, right) => (Date.parse(right.date) || 0) - (Date.parse(left.date) || 0))
    if (!timeline.length) return null
    const images = timeline.map((event) => event.image)
    const finalImage = project.finalImage && images.includes(project.finalImage) ? project.finalImage : null
    const visibleTimeline = timeline.map(({ projectCompleted, sourceOrder, ...event }) => event)
    return {
      ...project,
      status: finalImage ? 'completed' : 'history',
      updatedAt: timeline[0].date || project.updatedAt,
      description: project.source === 'field-reports'
        ? 'گزارش تصویری پروژه‌های شرکت.'
        : project.source === 'telegram-report'
          ? 'گزارش تصویری مستقل کارگاهی.'
        : project.description,
      timeline: visibleTimeline,
      images,
      finalImage,
    }
  }
  const publicLinkedProjects = linkedProjects.map(publicRecord).filter(Boolean)
  const publicStandalone = standalone.map(publicRecord).filter(Boolean)
  const publicRecords = [...publicLinkedProjects, ...publicStandalone]
  const publicEventCount = publicRecords.reduce((count, project) => count + project.timeline.length, 0)
  const photoCount = new Set(publicRecords.flatMap((record) => record.images)).size
  const linkedOutput = `${JSON.stringify(publicLinkedProjects, null, 2)}\n`
  const standaloneOutput = `${JSON.stringify(publicStandalone, null, 2)}\n`
  const syncStateOutput = `${JSON.stringify({
    sourceEventCount: eventCount,
    sourceLinkedRecords: linkedProjects.length,
    sourceIndependentRecords: standalone.length,
    publishedLinkedRecords: publicLinkedProjects.length,
    publishedIndependentReports: publicStandalone.length,
    publishedEventCount: publicEventCount,
    publishedPhotoCount: photoCount,
  }, null, 2)}\n`
  const writeIfChanged = async (file, value) => {
    let prior = ''
    try { prior = await fs.readFile(file, 'utf8') } catch { /* First import. */ }
    if (prior !== value) {
      const temporary = `${file}.${process.pid}.tmp`
      try {
        await fs.writeFile(temporary, value, 'utf8')
        await fs.rename(temporary, file)
      } catch (error) {
        await fs.unlink(temporary).catch(() => {})
        throw error
      }
    }
  }
  await Promise.all([
    writeIfChanged(outputFile, linkedOutput),
    writeIfChanged(reportsFile, standaloneOutput),
    writeIfChanged(syncStateFile, syncStateOutput),
  ])
  if (!process.argv.includes('--quiet')) {
    console.log(`Synchronized ${messages.length} complete Telegram messages: ${publicLinkedProjects.length} illustrated identifier-linked projects, ${publicStandalone.length} illustrated independent reports, ${publicEventCount} illustrated report events and ${photoCount} selected photos. Source totals: ${linkedProjects.length} linked groups, ${standalone.length} independent reports and ${eventCount} events.`)
  }
}

const releaseSyncLock = await acquireSyncLock()
try {
  await main()
} finally {
  await releaseSyncLock()
}
