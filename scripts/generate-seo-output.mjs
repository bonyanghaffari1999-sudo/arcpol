import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import siteData from '../src/site-data.json' with { type: 'json' }
import telegramProjects from '../src/telegram-projects.json' with { type: 'json' }
import telegramReports from '../src/telegram-reports.json' with { type: 'json' }
import articleDetails from '../src/article-details.json' with { type: 'json' }
import adminOverrides from '../src/admin-overrides.json' with { type: 'json' }
import { additionalServices, company, disciplines, engagementModels, mission, principles, serviceGroups, sourceAboutProfile, teamDirectory, teamResponsibilities, vision } from '../src/content.js'
import { applyAdminPatch, idAdminKey, mergeAdminCollection, normalizeAdminOverrides, projectAdminKey } from '../src/admin-data.js'
import { describeService } from '../src/service-details.js'
import { articleTitle } from '../src/i18n/other-pages-en.js'
import { canonicalOrigin, serviceSlug } from '../src/service-routes.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputDirectory = path.resolve(projectRoot, process.env.SEO_OUTPUT_DIR || 'dist')
const publicOverrides = normalizeAdminOverrides(adminOverrides)
const siteContent = applyAdminPatch({
  company, disciplines, engagementModels, mission, principles, serviceGroups,
  additionalServices, sourceAboutProfile, teamDirectory, teamResponsibilities, vision,
}, publicOverrides.siteContent)
const publicServiceGroups = siteContent.serviceGroups || serviceGroups
const publicAdditionalServices = siteContent.additionalServices || additionalServices
const publicServices = [...new Set([...publicServiceGroups.flatMap((group) => group.items || []), ...publicAdditionalServices])]

function keepPhotographedReports(record) {
  const timeline = (record.timeline || []).filter((entry) => Boolean(entry.image))
  return timeline.length ? { ...record, timeline } : null
}

const baseProjects = [
  ...siteData.projects,
  ...[...telegramProjects, ...telegramReports].map(keepPhotographedReports).filter(Boolean),
]
const publicProjects = mergeAdminCollection(baseProjects, publicOverrides.projects, projectAdminKey)
  .filter((item) => item.adminStatus !== 'draft')
const publicArticles = mergeAdminCollection(siteData.articles, publicOverrides.articles, idAdminKey)
  .filter((item) => item.adminStatus !== 'draft')
const publicArticleDetails = mergeAdminCollection(articleDetails, publicOverrides.articleDetails, idAdminKey)
const articleDetailById = new Map(publicArticleDetails.map((item) => [String(item.id), item]))

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]))
const escapeAttribute = escapeHtml
const canonicalUrl = (route) => {
  const normalized = route === '/' ? '/' : `/${route.split('/').filter(Boolean).join('/')}/`
  return new URL(normalized, canonicalOrigin).href
}
const absoluteAssetUrl = (asset) => new URL(asset, canonicalOrigin).href
const safeImagePath = (image) => typeof image === 'string' && image.startsWith('/') && !image.startsWith('//') ? image : ''
const sourceImage = '/Uploads/PrjData/bdff6df7-b413-4f86-8b8b-c89fe695d30d.jpg'
const coreRoutes = [
  '/', '/services', '/building', '/projects', '/about', '/articles', '/contact', '/feedback', '/portal',
]
const serviceRouteSlugs = publicServices.map(serviceSlug)
if (new Set(serviceRouteSlugs).size !== serviceRouteSlugs.length) throw new Error('Two public services resolve to the same route slug.')
if (new Set(publicProjects.map((item) => String(item.id))).size !== publicProjects.length) throw new Error('Two public project records resolve to the same route id.')
if (new Set(publicArticles.map((item) => String(item.id))).size !== publicArticles.length) throw new Error('Two public articles resolve to the same route id.')

function fallbackMarkup({ title, description, route, image = '', links = [], kind = 'page' }) {
  const safeImage = safeImagePath(image)
  const imageMarkup = safeImage
    ? `<img src="${escapeAttribute(safeImage)}" alt="نمایی از محتوای ثبت‌شده در آرشیو عمومی Arcpol" width="960" height="600" loading="eager">`
    : ''
  const linkMarkup = links.length
    ? `<nav aria-label="صفحه‌های مرتبط"><ul>${links.map((link) => `<li><a href="${escapeAttribute(link.href)}">${escapeHtml(link.label)}</a></li>`).join('')}</ul></nav>`
    : ''
  return `<main id="seo-fallback" class="seo-fallback" lang="fa" dir="rtl" data-page="${escapeAttribute(kind)}"><article><p class="seo-eyebrow">ARCPOL / ${escapeHtml(kind.toUpperCase())}</p><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>${imageMarkup}${linkMarkup}<nav aria-label="مسیرهای اصلی"><a href="/">خانه</a> · <a href="/services">خدمات</a> · <a href="/projects">پروژه‌ها</a> · <a href="/building">ساختمان تعاملی</a> · <a href="/contact">تماس</a></nav></article></main>`
}

function pageTemplate({ route, title, description, fallback, image = sourceImage, lang = 'fa', dir = 'rtl' }) {
  const resolvedImage = safeImagePath(image) || sourceImage
  const absoluteImage = absoluteAssetUrl(resolvedImage)
  return baseHtml
    .replace(/<html lang="[^"]+" dir="[^"]+">/, `<html lang="${lang}" dir="${dir}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeAttribute(description)}" />`)
    .replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeAttribute(title)}" />`)
    .replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapeAttribute(description)}" />`)
    .replace(/<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/>/, `<meta property="og:image:alt" content="${escapeAttribute(title)}" />`)
    .replace(/<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/, `<meta property="og:url" content="${escapeAttribute(canonicalUrl(route))}" />`)
    .replace(/<meta\s+property="og:locale"\s+content="[^"]*"\s*\/>/, '<meta property="og:locale" content="fa_IR" />')
    .replace(/<meta\s+property="og:image"\s+content="[^"]*"\s*\/>/, `<meta property="og:image" content="${escapeAttribute(absoluteImage)}" />`)
    .replace(/<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/, `<meta name="twitter:description" content="${escapeAttribute(description)}" />`)
    .replace(/<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/, `<meta name="twitter:title" content="${escapeAttribute(title)}" />`)
    .replace(/<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/>/, `<meta name="twitter:image" content="${escapeAttribute(absoluteImage)}" />`)
    .replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/, `<link rel="canonical" href="${escapeAttribute(canonicalUrl(route))}" />`)
    .replace('<div id="app"></div>', `<div id="app">${fallback}</div>`)
}

async function writeRoute(route, metadata) {
  const segments = route.split('/').filter(Boolean)
  const directory = segments.length ? path.join(outputDirectory, ...segments) : outputDirectory
  await mkdir(directory, { recursive: true })
  const html = pageTemplate({ route, ...metadata })
  await writeFile(path.join(directory, 'index.html'), html, 'utf8')
}

function servicePage(name) {
  const route = `/services/${serviceSlug(name)}`
  const group = publicServiceGroups.find((item) => item.items?.includes(name))
  const title = `${name} | خدمات Arcpol`
  const description = describeService(name)
  const links = [
    { href: '/services', label: 'مرور همهٔ خدمات' },
    { href: `/building?service=${encodeURIComponent(name)}`, label: 'جای این خدمت روی ساختمان' },
    { href: `/contact?service=${encodeURIComponent(name)}`, label: 'گفت‌وگو دربارهٔ این خدمت' },
    ...(group ? [{ href: `/services?category=${encodeURIComponent(group.id)}`, label: `دستهٔ ${group.title}` }] : []),
  ]
  return { route, title, description, fallback: fallbackMarkup({ title, description, route, links, kind: 'service' }) }
}

function projectDisplayTitle(project) {
  if (project.source === 'telegram-report') return `گزارش مستقل ${project.code || ''}`.trim()
  if (project.source === 'field-reports' && !/^G-\d+$/iu.test(project.code || '')) return 'گزارش تصویریِ بدون کد پروژه'
  if (project.source === 'field-reports') return `پروژه ${project.code}`
  if (project.code) return `پروژه ${project.code}`
  return project.usage ? `پروژهٔ ${project.usage}` : 'رکورد پروژهٔ شرکت'
}

function projectPage(project) {
  const route = `/projects/${project.id}`
  const title = `${projectDisplayTitle(project)} | Arcpol`
  const description = project.description || 'رکورد تصویری از آرشیو عمومی پروژه‌های Arcpol.'
  const images = [...(project.images || []), ...(project.timeline || []).map((entry) => entry.image)].filter(Boolean)
  const image = safeImagePath(images[0])
  const dates = [...(project.timeline || [])].map((entry) => entry.date).filter(Boolean).sort()
  const updated = dates.at(-1) || project.updatedAt || ''
  const dateText = updated ? `<p><strong>آخرین ثبت:</strong> <time>${escapeHtml(updated.slice(0, 10))}</time></p>` : ''
  const links = [
    { href: '/projects', label: 'بازگشت به آرشیو پروژه‌ها' },
    { href: '/services', label: 'مرور خدمات مهندسی' },
    { href: '/contact', label: 'راه‌های تماس' },
  ]
  const fallback = fallbackMarkup({ title, description, route, image, links, kind: 'project' })
    .replace('</article>', `${dateText}</article>`)
  return { route, title, description, fallback, image: image || sourceImage }
}

function articlePage(article) {
  const route = `/articles/${article.id}`
  const title = `${article.title} | Arcpol`
  const description = article.excerpt || `مقالهٔ ثبت‌شده در آرشیو فنی Arcpol: ${article.title}`
  const image = safeImagePath(article.image) || sourceImage
  const links = [
    { href: '/articles', label: 'بازگشت به مقاله‌ها' },
    { href: '/services', label: 'خدمات مهندسی' },
    { href: '/contact', label: 'راه‌های تماس' },
  ]
  const content = articleDetailById.get(String(article.id))
  const detailText = Array.isArray(content?.paragraphs) ? content.paragraphs.filter((part) => typeof part === 'string').join(' ').slice(0, 1600) : ''
  const fallback = fallbackMarkup({ title, description, route, image, links, kind: 'article' })
    .replace('</article>', `${detailText ? `<p>${escapeHtml(detailText)}</p>` : ''}<p>${escapeHtml(article.type || 'مقاله')} · ${escapeHtml(article.date || '')}</p></article>`)
  return { route, title, description, fallback, image }
}

const pageMetadata = {
  '/': ['Arcpol | مهندسی و ساخت ساختمان', 'خدمات یکپارچهٔ مهندسی و ساخت ساختمان، از مطالعات خاک و طراحی تا نظارت، اجرا و نقشه‌های چون‌ساخت.', 'معرفی خدمات مهندسی و ساخت ساختمان Arcpol؛ از طراحی و آزمایش تا نظارت و اجرا.'],
  '/services': ['خدمات مهندسی ساختمان | Arcpol', 'خدمات مهندسی و ساخت ساختمان را از طراحی و آزمایش تا نظارت و اجرا مرور کنید.', 'خدمات مهندسی و ساخت ساختمان؛ مسیرهای طراحی، ژئوتکنیک، آزمایش، اجرا و مدیریت پروژه.'],
  '/building': ['ساختمان تعاملی | Arcpol', 'مدل مفهومی ساختمان را مرحله‌به‌مرحله ببینید و خدمات مرتبط را روی اجزای آن پیدا کنید.', 'مدل مفهومی سه‌بعدی ساختمان و خدماتی که در مراحل مختلف ساخت به آن مرتبط‌اند.'],
  '/projects': ['آرشیو پروژه‌ها | Arcpol', 'سوابق مستند پروژه‌ها، گروه‌های کددار و گزارش‌های تصویری کارگاهی شرکت را مرور کنید.', 'مرور سوابق تصویری و رکوردهای مستند آرشیو عمومی Arcpol.'],
  '/about': ['دربارهٔ Arcpol | مهندسی و ساخت', 'با حوزه‌های مهندسی، ساختار خدمات و روش همکاری Arcpol آشنا شوید.', 'آشنایی با گروه مهندسین مشاور غفاری و دامنهٔ خدمات مهندسی و ساخت ساختمان.'],
  '/articles': ['مقالات و دانش فنی | Arcpol', 'مقاله‌ها، مستندات فنی و منابع ثبت‌شده در آرشیو Arcpol را مرور کنید.', 'مقاله‌ها و منابع فنی ثبت‌شده در آرشیو Arcpol.'],
  '/contact': ['تماس با Arcpol | دفتر و خدمات مهندسی', 'برای گفت‌وگو دربارهٔ خدمات مهندسی و ساخت ساختمان از راه‌های رسمی با Arcpol تماس بگیرید.', 'راه‌های رسمی تماس با Arcpol برای گفت‌وگو دربارهٔ خدمات مهندسی و ساخت.'],
  '/feedback': ['ثبت بازخورد | Arcpol', 'پیشنهاد یا تجربهٔ همکاری خود را در فرم بازخورد ثبت کنید.', 'فرم ثبت بازخورد برای تجربه‌ها و پیشنهادهای مربوط به همکاری با Arcpol.'],
  '/portal': ['نمونهٔ پنل مشتریان | Arcpol', 'پیش‌نمایش نمایشیِ پنل مشتریان؛ اطلاعات این صفحه ساختگی است و به پروژهٔ واقعی متصل نیست.', 'پیش‌نمایش ساختگی پنل مشتریان؛ این صفحه به پروژه یا مشتری واقعی متصل نیست.'],
}

const baseHtml = await readFile(path.join(outputDirectory, 'index.html'), 'utf8')
const sitemapRoutes = new Set(coreRoutes)
for (const name of publicServices) sitemapRoutes.add(servicePage(name).route)
for (const project of publicProjects) sitemapRoutes.add(`/projects/${project.id}`)
for (const article of publicArticles) sitemapRoutes.add(`/articles/${article.id}`)

for (const [route, [title, description, bodyText]] of Object.entries(pageMetadata)) {
  const pageLinks = route === '/services'
    ? publicServices.map((name) => ({ href: `/services/${serviceSlug(name)}`, label: name }))
    : route === '/projects'
      ? publicProjects.slice(0, 36).map((project) => ({ href: `/projects/${project.id}`, label: projectDisplayTitle(project) }))
      : route === '/articles'
        ? publicArticles.slice(0, 36).map((article) => ({ href: `/articles/${article.id}`, label: article.title }))
        : [{ href: '/services', label: 'مرور همهٔ خدمات' }, { href: '/projects', label: 'آرشیو پروژه‌ها' }]
  const fallback = fallbackMarkup({ title, description: bodyText, route, links: pageLinks, kind: route === '/' ? 'home' : route.slice(1) || 'home' })
  await writeRoute(route, { title, description, fallback })
}

for (const name of publicServices) {
  const page = servicePage(name)
  await writeRoute(page.route, page)
}
for (const project of publicProjects) {
  const page = projectPage(project)
  await writeRoute(page.route, page)
}
for (const article of publicArticles) {
  const page = articlePage(article)
  await writeRoute(page.route, page)
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...sitemapRoutes].sort().map((route) => `  <url><loc>${escapeHtml(canonicalUrl(route))}</loc></url>`).join('\n')}\n</urlset>\n`
await writeFile(path.join(outputDirectory, 'sitemap.xml'), sitemap, 'utf8')

console.log(`Generated ${sitemapRoutes.size} canonical routes and static SEO snapshots in ${outputDirectory}.`)
