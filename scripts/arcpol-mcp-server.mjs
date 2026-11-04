import { readdir, readFile, realpath, stat } from 'node:fs/promises'
import { createInterface } from 'node:readline'
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MAX_INDEXED_FILES = 10000
const MAX_TEXT_FILE_BYTES = 2_000_000
const MAX_RETURNED_TEXT_CHARS = 400_000
const MAX_BINARY_RESOURCE_BYTES = 8_000_000
const TEXT_EXTENSIONS = new Set([
  '.cjs', '.css', '.csv', '.html', '.htm', '.js', '.json', '.md', '.mjs',
  '.ps1', '.sql', '.svg', '.toml', '.ts', '.tsx', '.txt', '.vue', '.yaml', '.yml',
])
const MIME_TYPES = new Map([
  ['.pdf', 'application/pdf'],
  ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.svg', 'image/svg+xml'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
])
const OMITTED_DIRECTORIES = new Set([
  '.git', '.tools', '.codex', 'node_modules', 'dist', 'tmp', 'output', 'coverage', '.cache',
])
const INCLUDED_LOCAL_STATE = new Set([
  '.local-data/telegram-bot-state.json',
  '.local-data/telegram-health.json',
])
const TOOL_ANNOTATIONS = { readOnlyHint: true, destructiveHint: false, openWorldHint: false }

function normalizeRelativePath(input = '') {
  const value = String(input).replaceAll('\\', '/').trim().replace(/^\.\//, '')
  if (value.includes('\0') || isAbsolute(value) || /^[a-z]:/i.test(value)) {
    throw new Error('مسیر باید نسبی و داخل پروژهٔ Arcpol باشد.')
  }
  const segments = value.split('/').filter(Boolean)
  if (segments.some((segment) => segment === '..' || segment === '.')) {
    throw new Error('مسیرهای خارج از پوشهٔ پروژه پذیرفته نمی‌شوند.')
  }
  return segments.join('/')
}

function isAllowedPath(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\.\//, '')
  if (!normalized) return true
  const segments = normalized.split('/').filter(Boolean)
  if (segments.some((part) => OMITTED_DIRECTORIES.has(part.toLowerCase()))) return false
  if (segments.some((part) => part.toLowerCase().startsWith('.env'))) return false
  if (segments.some((part) => /^(?:\.local-server|.*(?:secret|credential|password|private[-_.]?key).*)/i.test(part))) return false
  if (segments[0]?.toLowerCase() === '.local-data' && !INCLUDED_LOCAL_STATE.has(normalized)) return false
  return true
}

function resolveProjectPath(input = '') {
  const rel = normalizeRelativePath(input)
  if (!isAllowedPath(rel)) throw new Error('این مسیر شامل تنظیمات خصوصی، لاگ یا فایل‌های ساخته‌شده است و در دسترس سرور نیست.')
  const absolutePath = resolve(ROOT, ...rel.split('/').filter(Boolean))
  const fromRoot = relative(ROOT, absolutePath)
  if (fromRoot === '..' || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) {
    throw new Error('مسیر باید داخل پوشهٔ پروژهٔ Arcpol باشد.')
  }
  return { absolutePath, rel }
}

async function collectFiles(directory = '') {
  const { absolutePath, rel } = resolveProjectPath(directory)
  const realRoot = await realpath(ROOT)
  const realDirectory = await realpath(absolutePath)
  const directoryRelative = relative(realRoot, realDirectory)
  if (directoryRelative === '..' || directoryRelative.startsWith(`..${sep}`) || isAbsolute(directoryRelative)) {
    throw new Error('مسیر باید داخل پوشهٔ پروژهٔ Arcpol باشد.')
  }
  const rootStat = await stat(realDirectory)
  if (!rootStat.isDirectory()) throw new Error('مسیر انتخاب‌شده پوشه نیست.')

  const files = []
  async function visit(currentPath, currentRelative) {
    if (files.length >= MAX_INDEXED_FILES) return
    const entries = await readdir(currentPath, { withFileTypes: true })
    entries.sort((a, b) => a.name.localeCompare(b.name, 'fa'))
    for (const entry of entries) {
      if (files.length >= MAX_INDEXED_FILES) break
      const childRelative = [currentRelative, entry.name].filter(Boolean).join('/')
      if (!isAllowedPath(childRelative) || entry.isSymbolicLink()) continue
      const childPath = resolve(currentPath, entry.name)
      if (entry.isDirectory()) {
        await visit(childPath, childRelative)
      } else if (entry.isFile()) {
        const info = await stat(childPath)
        files.push({ path: childRelative, bytes: info.size, extension: extname(entry.name).toLowerCase() })
      }
    }
  }
  await visit(realDirectory, rel)
  return files
}

function textResult(value) {
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] }
}

function errorResult(error) {
  return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }] }
}

const tools = [
  {
    name: 'arcpol_overview',
    description: 'نمای کلی پروژهٔ آرک‌پول، مسیر صفحات سایت، فایل‌های اصلی، تعداد فایل‌های قابل‌خواندن و وضعیت سایت محلی را می‌دهد.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: TOOL_ANNOTATIONS,
  },
  {
    name: 'list_arcpol_files',
    description: 'فهرست فایل‌های یک بخش از پروژهٔ آرک‌پول را می‌دهد؛ فایل‌های متنی، داده‌ها، اسناد و دارایی‌های عمومی را پیدا می‌کند.',
    inputSchema: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'پوشهٔ نسبی مانند src یا public؛ برای کل پروژه خالی بگذارید.' },
        contains: { type: 'string', description: 'اختیاری: بخشی از نام یا مسیر فایل.' },
        limit: { type: 'integer', minimum: 1, maximum: 500, description: 'حداکثر تعداد نتیجه؛ پیش‌فرض 100.' },
      },
      additionalProperties: false,
    },
    annotations: TOOL_ANNOTATIONS,
  },
  {
    name: 'search_arcpol',
    description: 'جست‌وجوی متن در کد، محتوای فارسی سایت، داده‌های JSON، مستندات و تنظیمات غیرمحرمانهٔ پروژه.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', minLength: 1, description: 'عبارت جست‌وجو.' },
        directory: { type: 'string', description: 'اختیاری: محدودکردن جست‌وجو به پوشه‌ای مانند src یا public.' },
        max_results: { type: 'integer', minimum: 1, maximum: 50, description: 'حداکثر نتیجه؛ پیش‌فرض 20.' },
      },
      required: ['query'],
      additionalProperties: false,
    },
    annotations: TOOL_ANNOTATIONS,
  },
  {
    name: 'read_arcpol_file',
    description: 'فایل انتخاب‌شده از پروژهٔ آرک‌پول را می‌خواند. فایل‌های متنی کامل برگردانده می‌شوند؛ فایل‌های سند و رسانه به‌صورت منبع پیوست می‌شوند.',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string', description: 'مسیر نسبی پروژه، مانند src/site-data.json یا public/documents/articles/article-10-1.pdf.' } },
      required: ['path'],
      additionalProperties: false,
    },
    annotations: TOOL_ANNOTATIONS,
  },
  {
    name: 'arcpol_site_status',
    description: 'وضعیت پاسخ‌دهی سایت محلی آرک‌پول روی نشانی 127.0.0.1:5174 را بررسی می‌کند.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: TOOL_ANNOTATIONS,
  },
]

async function getSiteStatus() {
  try {
    const response = await fetch('http://127.0.0.1:5174/', { signal: AbortSignal.timeout(2500) })
    const html = await response.text()
    const title = html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.trim() || null
    return { running: response.ok, status: response.status, url: 'http://127.0.0.1:5174/#/', title }
  } catch {
    return { running: false, url: 'http://127.0.0.1:5174/#/', note: 'سرور سایت فعلاً پاسخ نمی‌دهد.' }
  }
}

async function getOverview() {
  const files = await collectFiles()
  const byArea = {}
  for (const file of files) {
    const area = file.path.split('/')[0] || 'root'
    byArea[area] = (byArea[area] || 0) + 1
  }
  const textFiles = files.filter((file) => TEXT_EXTENSIONS.has(file.extension)).length
  const projectFiles = [
    'README.md', 'src/site-data.json', 'src/content.js', 'src/service-details.js',
    'src/article-details.json', 'src/admin-data.js', 'src/admin-overrides.json',
    'src/telegram-projects.json', 'src/telegram-reports.json', 'src/telegram-sync-meta.json',
    'src/components/building/BuildingExplorer.vue', 'design-system/arcpol/MASTER.md',
  ].filter((path) => files.some((file) => file.path === path))
  return {
    project: 'Arcpol — وب‌سایت و محتوای گروه مهندسین مشاور غفاری',
    access: 'فقط خواندن؛ محدود به پوشهٔ همین پروژه',
    sitePages: ['خانه', 'خدمات', 'پروژه‌ها', 'ساختمان تعاملی', 'درباره ما', 'مقالات', 'تماس', 'بازخورد', 'پنل مشتریان'],
    files: { total: files.length, searchableText: textFiles, byArea, cappedAt: MAX_INDEXED_FILES },
    primaryFiles: projectFiles,
    site: await getSiteStatus(),
    excluded: ['فایل‌های .env و کلیدها', 'لاگ‌های اجرایی', 'node_modules و .git', 'خروجی‌ها و فایل‌های موقت'],
  }
}

async function listProjectFiles(args) {
  const directory = args.directory || ''
  const filter = String(args.contains || '').toLocaleLowerCase('fa-IR')
  const limit = Math.min(500, Math.max(1, Number.isInteger(args.limit) ? args.limit : 100))
  const files = await collectFiles(directory)
  const results = files.filter((file) => !filter || file.path.toLocaleLowerCase('fa-IR').includes(filter))
  return { directory: directory || '.', totalMatches: results.length, truncated: results.length > limit, files: results.slice(0, limit) }
}

async function searchProject(args) {
  const query = String(args.query || '').trim()
  if (!query) throw new Error('عبارت جست‌وجو خالی است.')
  if (query.length > 200) throw new Error('عبارت جست‌وجو باید کوتاه‌تر از 200 نویسه باشد.')
  const limit = Math.min(50, Math.max(1, Number.isInteger(args.max_results) ? args.max_results : 20))
  const queryFolded = query.toLocaleLowerCase('fa-IR')
  const files = await collectFiles(args.directory || '')
  const results = []
  let searchedFiles = 0
  for (const file of files) {
    if (!TEXT_EXTENSIONS.has(file.extension) || file.bytes > MAX_TEXT_FILE_BYTES) continue
    const { absolutePath } = resolveProjectPath(file.path)
    const content = await readFile(absolutePath, 'utf8')
    if (content.includes('\0')) continue
    searchedFiles += 1
    const lines = content.split(/\r?\n/)
    for (let i = 0; i < lines.length; i += 1) {
      if (!lines[i].toLocaleLowerCase('fa-IR').includes(queryFolded)) continue
      results.push({ path: file.path, line: i + 1, excerpt: lines[i].trim().slice(0, 300) })
      if (results.length >= limit) {
        return { query, searchedFiles, results, truncated: true }
      }
    }
  }
  return { query, searchedFiles, results, truncated: false }
}

async function readProjectFile(args) {
  const { absolutePath, rel } = resolveProjectPath(args.path)
  const realFile = await realpath(absolutePath)
  const realRoot = await realpath(ROOT)
  const realRelative = relative(realRoot, realFile)
  if (realRelative === '..' || realRelative.startsWith(`..${sep}`) || isAbsolute(realRelative) || !isAllowedPath(realRelative)) {
    throw new Error('فایل باید یک مسیر مجاز درون پروژهٔ آرک‌پول باشد.')
  }
  const info = await stat(realFile)
  if (!info.isFile()) throw new Error('مسیر انتخاب‌شده فایل نیست.')
  const extension = extname(rel).toLowerCase()
  if (TEXT_EXTENSIONS.has(extension)) {
    if (info.size > MAX_TEXT_FILE_BYTES) throw new Error('این فایل متنی از حد مجاز خواندن بزرگ‌تر است؛ از جست‌وجوی پروژه برای یافتن بخش موردنظر استفاده کنید.')
    const text = await readFile(realFile, 'utf8')
    if (text.includes('\0')) throw new Error('فایل انتخاب‌شده متنی نیست.')
    const truncated = text.length > MAX_RETURNED_TEXT_CHARS
    return textResult({ path: rel, content: truncated ? `${text.slice(0, MAX_RETURNED_TEXT_CHARS)}\n… ادامهٔ فایل حذف شد.` : text, truncated })
  }
  if (info.size > MAX_BINARY_RESOURCE_BYTES) {
    return textResult({ path: rel, bytes: info.size, note: 'فایل بزرگ است؛ مسیر و مشخصات آن در دسترس است، اما پیوست مستقیم برایش ساخته نشد.' })
  }
  const data = await readFile(realFile)
  return {
    content: [
      { type: 'text', text: `فایل ${rel} به‌صورت منبع باینری پیوست شده است (${info.size} بایت).` },
      { type: 'resource', resource: { uri: `arcpol://${encodeURI(rel)}`, mimeType: MIME_TYPES.get(extension) || 'application/octet-stream', blob: data.toString('base64') } },
    ],
  }
}

async function callTool(name, args = {}) {
  if (name === 'arcpol_overview') return textResult(await getOverview())
  if (name === 'list_arcpol_files') return textResult(await listProjectFiles(args))
  if (name === 'search_arcpol') return textResult(await searchProject(args))
  if (name === 'read_arcpol_file') return readProjectFile(args)
  if (name === 'arcpol_site_status') return textResult(await getSiteStatus())
  return errorResult(new Error(`ابزار ناشناخته است: ${name}`))
}

function respond(id, result) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`)
}

function respondError(id, code, message) {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } })}\n`)
}

async function handleMessage(message) {
  const id = message.id
  const method = message.method
  if (typeof method !== 'string') {
    if (id !== undefined) respondError(id, -32600, 'درخواست JSON-RPC نامعتبر است.')
    return
  }
  if (method.startsWith('notifications/')) return
  try {
    if (method === 'initialize') {
      respond(id, {
        protocolVersion: message.params?.protocolVersion || '2024-11-05',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'arcpol-project', version: '1.0.0' },
        instructions: 'دسترسی خواندنی و محدود به پروژهٔ Arcpol است. برای شروع arcpol_overview را فراخوانی کنید. ابزارها اطلاعات سایت، کد و داده‌های پروژه را جست‌وجو و می‌خوانند. فایل‌های ورود، کلیدها، لاگ‌ها و خروجی‌های موقت حذف شده‌اند.',
      })
      return
    }
    if (method === 'ping') {
      respond(id, {})
      return
    }
    if (method === 'tools/list') {
      respond(id, { tools })
      return
    }
    if (method === 'tools/call') {
      respond(id, await callTool(message.params?.name, message.params?.arguments || {}))
      return
    }
    respondError(id, -32601, `روش پشتیبانی نمی‌شود: ${method}`)
  } catch (error) {
    respond(id, errorResult(error))
  }
}

const input = createInterface({ input: process.stdin, crlfDelay: Infinity })
input.on('line', (line) => {
  if (!line.trim()) return
  let message
  try {
    message = JSON.parse(line)
  } catch {
    respondError(null, -32700, 'JSON نامعتبر است.')
    return
  }
  void handleMessage(message)
})
