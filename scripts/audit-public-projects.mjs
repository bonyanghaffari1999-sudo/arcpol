import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { applyAdminPatch, idAdminKey, mergeAdminCollection, normalizeAdminOverrides, projectAdminKey } from '../src/admin-data.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const siteData = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src/site-data.json'), 'utf8'))
const siteRecords = siteData.projects
const linkedRecords = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src/telegram-projects.json'), 'utf8'))
const independentRecords = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src/telegram-reports.json'), 'utf8'))
const articleDetails = JSON.parse(fs.readFileSync(path.join(projectRoot, 'src/article-details.json'), 'utf8'))
const adminOverrides = normalizeAdminOverrides(JSON.parse(fs.readFileSync(process.env.ARCPOL_ADMIN_OVERRIDES_FILE || path.join(projectRoot, 'src/admin-overrides.json'), 'utf8')))
const baseContent = await import(pathToFileURL(path.join(projectRoot, 'src/content.js')).href)
const serviceDetails = await import(pathToFileURL(path.join(projectRoot, 'src/service-details.js')).href)
const baseSiteContent = {
  company: baseContent.company,
  disciplines: baseContent.disciplines,
  engagementModels: baseContent.engagementModels,
  mission: baseContent.mission,
  principles: baseContent.principles,
  serviceGroups: baseContent.serviceGroups,
  teamResponsibilities: baseContent.teamResponsibilities,
  additionalServices: baseContent.additionalServices,
  sourceAboutProfile: baseContent.sourceAboutProfile,
  vision: baseContent.vision,
}
const siteContent = applyAdminPatch(baseSiteContent, adminOverrides.siteContent)
const records = mergeAdminCollection([...siteRecords, ...linkedRecords, ...independentRecords], adminOverrides.projects, projectAdminKey)
  .filter((record) => record.adminStatus !== 'draft')
const articles = mergeAdminCollection(siteData.articles, adminOverrides.articles, idAdminKey)
  .filter((article) => article.adminStatus !== 'draft')
const effectiveArticleDetails = mergeAdminCollection(articleDetails, adminOverrides.articleDetails, idAdminKey)
const { disciplines, engagementModels } = siteContent
const allowedUsage = new Set(['مسکونی', 'تجاری'])
const allowedServices = new Set(['نظارت', 'نظارت و اجرا'])
const riskyText = /(?:عدم|نشد|نشده|نشدند|نشود|نشوند|نکرد|نمی\s|ایراد|اشکال|مشکل|نقص|خراب|خرابی|کرمو|ترک|ریزش|شکست|خطا|اشتباه|نادرست|نامناسب|ناایمن|خطر|تخریب|تذکر|هشدار|دستور|تخلف|ممنوع|نباید|بهتر\s+بود|توصیه|کافی\s+نیست|مناسب\s+نیست|غیر\s*مجاز|غیرمجاز|مغایر|خلاف|توقف|متوقف|تأخیر|تاخیر|شکایت|اخطار|جریمه|مسئولیت|مقصر|حقوقی|قانونی|دادگاه|بدون\s+(?:اطلاع|اجازه|مجوز)|اصلاح|رفع|برطرف|تعیین\s+تکلیف|تکمیل\s+نشده|نیاز\s+به\s+(?:تأیید|تایید|مجوز|پیگیری|اصلاح|رفع|بازبینی)|(?:تأیید|تایید)\s+(?:محاسب|ناظر|کارفرما)|طراحی\s+مجدد|بریده|قطع\s+(?:شد|شده)|حذف\s+(?:تیر|ستون|دیوار|عضو)|تغییر\s+(?:در|نقشه|طرح|سازه))/u
const privateText = /(?:کارفرما|مالک|صاحب\s*کار|نام\s*(?:کارفرما|مالک|مهندس|ناظر|مسئول)|پلاک\s*(?:ثبتی)?|شناسه\s*پروژه|کد\s*پروژه|شماره\s*پروژه|کد\s*قرارداد|شماره\s*قرارداد|نشانی|آدرس|بلوار|خیابان|خیاب\s|کوچه|کوچ|نبش|میدان|فلکه|چهارراه|سه\s*راه|اتوبان|بزرگراه|جاده|کانال|شهرک|\d+\s*متری|[۰-۹٠-٩]+\s*متری|پلاک|کد\s*پستی|شماره\s*(?:تماس|تلفن|ثبت)|تلفن|موبایل|همراه|کارکنان|پرسنل|شرکت\s*[:：])/u
const directionalStreetAddress = /(?:^|[\s،,])[\p{L}‌-]{2,}\s+(?:اول|دوم|سوم|چهارم|پنجم|ششم|هفتم|هشتم|نهم|دهم|[0-9۰-۹٠-٩]+)\s+(?:شرقی|غربی|شمالی|جنوبی)/u
const personalName = /(?:آقای|خانم|دکتر)\s+[\p{L}‌]{2,}|مهندس\s+(?!سازه|عمران|معماری|برق|مکانیک|تأسیسات|تاسیسات|فنی|محاسب|طراح|کارگاه|اجرا|پیمانکار|معمار|مسئول|کارشناس|سرپرست|مدیر)[\p{L}‌]{2,}|\([\p{L}‌]+\s+[\p{L}‌]+\)/u
const explicitPersonalName = /(?:آقای|خانم|دکتر)\s+[\p{L}‌]{2,}|مهندس\s+(?!سازه|عمران|معماری|برق|مکانیک|تأسیسات|تاسیسات|فنی|محاسب|طراح|کارگاه|اجرا|پیمانکار|معمار|مسئول|کارشناس|سرپرست|مدیر)[\p{L}‌]{2,}/u
const exposedContact = /(?:\b0?9\d{9}\b|\b0\d{2,3}[\s-]?\d{7,8}\b|\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b|نشانی\s*[:：]|آدرس\s*[:：]|شماره\s*(?:تماس|تلفن)\s*[:：]|تلفن\s*[:：]|موبایل\s*[:：]|کد\s*پستی\s*[:：]|(?:خیابان|بلوار|کوچه|پلاک)\s+[\p{L}‌\d۰-۹-]+)/iu

const issues = []
const imagePaths = new Set()
const eventList = []
const ids = new Set()

const requiredCollaborationTypes = ['پروژه کامل از طراحی تا تحویل', 'طراحی', 'اجرا', 'نظارت']
const collaborationTypes = new Set((engagementModels || []).map((model) => model.title))
for (const type of requiredCollaborationTypes) {
  if (!collaborationTypes.has(type)) issues.push({ code: 'collaboration-models', issue: `missing-${type}` })
}
const requiredDisciplines = ['معماری', 'سازه', 'مکانیک', 'برق']
const disciplinesInSite = new Set((disciplines || []).map((discipline) => discipline.title))
for (const discipline of requiredDisciplines) {
  if (!disciplinesInSite.has(discipline)) issues.push({ code: 'engineering-disciplines', issue: `missing-${discipline}` })
}
const publicServices = [
  ...(siteContent.serviceGroups || []).flatMap((group) => group.items || []),
  ...(siteContent.additionalServices || []),
]
for (const service of publicServices) {
  if (!serviceDetails.serviceDescriptions[service]) issues.push({ code: 'service-catalogue', issue: `missing-description-${service}` })
}

for (const record of records) {
  const label = record.code || `ID-${record.id}`
  if (ids.has(record.id)) issues.push({ code: label, issue: 'duplicate-id' })
  ids.add(record.id)

  if (!allowedUsage.has(record.usage)) issues.push({ code: label, issue: 'usage' })
  const services = record.source ? record.services : [record.type]
  if (!services?.length || services.some((service) => !allowedServices.has(service))) {
    if (record.source !== 'telegram-report' || services?.some((service) => !allowedServices.has(service))) {
      issues.push({ code: label, issue: 'service' })
    }
  }

  if (!record.images?.length) issues.push({ code: label, issue: 'no-project-image' })
  for (const image of record.images || []) imagePaths.add(image)

  const timeline = record.timeline || []
  if (record.source && timeline.some((entry) => !entry.image)) issues.push({ code: label, issue: 'event-without-image' })
  if (timeline.some((entry, index) => index > 0 && Date.parse(timeline[index - 1].date) < Date.parse(entry.date))) {
    issues.push({ code: label, issue: 'timeline-order' })
  }
  if (record.source && timeline.length && JSON.stringify(record.images || []) !== JSON.stringify(timeline.map((entry) => entry.image).filter(Boolean))) {
    issues.push({ code: label, issue: 'image-order' })
  }
  if (record.finalImage && !(record.images || []).includes(record.finalImage)) issues.push({ code: label, issue: 'final-image-not-in-gallery' })

  const publicText = [record.code, record.type, record.address, record.usage, record.description, ...(record.services || []), ...(record.tags || []),
    ...timeline.flatMap((entry) => [entry.title, entry.summary, entry.focus])]
    .filter(Boolean).join('\n')
  if (privateText.test(publicText)) issues.push({ code: label, issue: 'private-or-exact-address-text' })
  if (directionalStreetAddress.test(publicText)) issues.push({ code: label, issue: 'precise-directional-street-text' })
  if (riskyText.test(publicText)) issues.push({ code: label, issue: 'risky-project-copy' })
  if (personalName.test(publicText)) issues.push({ code: label, issue: 'personal-name-marker' })
  eventList.push(...timeline)
}

for (const service of Object.keys(serviceDetails.serviceEvidenceKeywords)) {
  for (const evidence of serviceDetails.findServiceEvidence(service, records)) {
    const title = evidence.summary || ''
    if (!title) continue
    if (privateText.test(title) || exposedContact.test(title) || personalName.test(title)
      || riskyText.test(title) || directionalStreetAddress.test(title)) {
      issues.push({ code: `SERVICE-${service}-${evidence.code}`, issue: 'unsafe-service-evidence-title' })
    }
  }
}

const missingAssets = [...imagePaths].filter((image) => !fs.existsSync(path.join(projectRoot, 'public', image.replace(/^\//, ''))))
for (const image of missingAssets) issues.push({ code: image, issue: 'missing-image-file' })

function collectStrings(value) {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(collectStrings)
  if (value && typeof value === 'object') return Object.values(value).flatMap(collectStrings)
  return []
}

const auditSiteContent = {
  ...siteContent,
  company: { ...(siteContent.company || {}) },
}
// The owner approved the verified company office contacts for public display.
// Keep these fields exempt here while all project, article, staff, and other copy stays audited.
for (const field of ['officePhone', 'directPhone', 'officeAddress']) delete auditSiteContent.company[field]
const siteCopy = collectStrings(auditSiteContent).join('\n')
if (exposedContact.test(siteCopy)) issues.push({ code: 'site-content', issue: 'private-contact-or-address-text' })
if (personalName.test(siteCopy)) issues.push({ code: 'site-content', issue: 'personal-name-marker' })

for (const article of articles) {
  const articleText = [article.title, article.type, article.date, article.excerpt].filter(Boolean).join('\n')
  if (exposedContact.test(articleText) || explicitPersonalName.test(articleText)) issues.push({ code: `ARTICLE-${article.id}`, issue: 'private-article-copy' })
  if (article.image && !fs.existsSync(path.join(projectRoot, 'public', article.image.replace(/^\//, '')))) {
    issues.push({ code: `ARTICLE-${article.id}`, issue: 'missing-image-file' })
  }
}

const publicArticleIds = new Set(articles.map((article) => String(article.id)))
for (const detail of effectiveArticleDetails) {
  if (!publicArticleIds.has(String(detail.id))) continue
  const detailText = [detail.paragraphs || [], (detail.files || []).map((file) => [file.name, file.sourceLabel])].flat(3).filter(Boolean).join('\n')
  if (exposedContact.test(detailText) || explicitPersonalName.test(detailText)) issues.push({ code: `ARTICLE-${detail.id}`, issue: 'private-article-detail' })
}

const siteMedia = siteContent.siteMedia || {}
for (const key of ['logoImage', 'heroImage', 'aboutImage', 'defaultArticleImage']) {
  const image = siteMedia[key]
  if (!image) continue
  const relative = typeof image === 'string' ? image.replace(/^\//, '') : ''
  const absolute = path.resolve(projectRoot, 'public', relative)
  const publicRoot = path.resolve(projectRoot, 'public')
  const insidePublic = absolute.startsWith(`${publicRoot}${path.sep}`) || absolute === publicRoot
  if (typeof image !== 'string' || !image.startsWith('/') || !insidePublic || !fs.existsSync(absolute)) {
    issues.push({ code: 'site-media', issue: `invalid-or-missing-${key}` })
  }
}
const companyProjectIds = new Set(records.filter((record) => !record.source || record.source === 'manual').map((record) => Number(record.id)))
if (siteMedia.homeHeroProjectId && !companyProjectIds.has(Number(siteMedia.homeHeroProjectId))) {
  issues.push({ code: 'site-media', issue: 'invalid-home-hero-project' })
}
for (const id of siteMedia.featuredProjectIds || []) {
  if (id !== null && !companyProjectIds.has(Number(id))) issues.push({ code: 'site-media', issue: `invalid-featured-project-${id}` })
}

const isCodedTelegramProject = (record) => record.source === 'field-reports' && /^G-\d+$/iu.test(record.code || '')
const documentedProjectRecordKeys = records.flatMap((record) => {
  if (isCodedTelegramProject(record)) {
    const code = record.code.match(/^G-0*(\d+)$/iu)
    return code ? [`telegram-project:${Number(code[1])}`] : []
  }
  if (!record.source) return [`previous-site-record:${record.id}`]
  if (record.source === 'manual') return [`company-record:${record.id}`]
  return []
})
const summary = {
  previousSiteProjects: records.filter((record) => !record.source).length,
  companyProjectRecordsAndGroups: records.filter((record) => !record.source || record.source === 'manual' || isCodedTelegramProject(record)).length,
  linkedTelegramProjects: records.filter(isCodedTelegramProject).length,
  uncodedTelegramPhotoEntries: records.filter((record) => record.source === 'field-reports' && !/^G-\d+$/iu.test(record.code || '')).length,
  documentedProjectRecords: new Set(documentedProjectRecordKeys).size,
  independentTelegramReports: records.filter((record) => record.source === 'telegram-report').length,
  publicArticles: articles.length,
  totalPublicItems: records.length,
  timelineEvents: eventList.length,
  uniqueImages: imagePaths.size,
  itemsWithProvinceOnlyLocation: records.filter((record) => record.address === 'استان البرز').length,
  issues: issues.length,
}
console.log(JSON.stringify(summary))
if (issues.length) {
  for (const issue of issues.slice(0, 60)) console.error(`${issue.code}: ${issue.issue}`)
  process.exitCode = 1
}
