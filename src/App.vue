<script setup>
import { computed, defineAsyncComponent, inject, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import siteDataFallback from './site-data.json'
import telegramProjectFallback from './telegram-projects.json'
import telegramReportFallback from './telegram-reports.json'
import articleDetailsFallback from './article-details.json'
import adminOverridesFallback from './admin-overrides.json'
import { additionalServices as defaultAdditionalServices, company as defaultCompany, disciplines as defaultDisciplines, engagementModels as defaultEngagementModels, mission as defaultMission, principles as defaultPrinciples, serviceGroups as defaultServiceGroups, sourceAboutProfile as defaultSourceAboutProfile, teamDirectory as defaultTeamDirectory, teamResponsibilities as defaultTeamResponsibilities, vision as defaultVision } from './content.js'
import { applyAdminPatch, idAdminKey, mergeAdminCollection, normalizeAdminOverrides, projectAdminKey } from './admin-data.js'
import { formatNumber, numberLocale } from './i18n/numbers.js'
import SiteHeader from './components/common/SiteHeader.vue'
import SiteFooter from './components/common/SiteFooter.vue'
import { findServiceEvidence } from './service-details.js'
import { countDocumentedProjectRecords, isCodedTelegramProject, isDocumentedCompanyProject } from './project-archive.js'
import { projectTerm } from './i18n/projects-en.js'
import { articleTitle } from './i18n/other-pages-en.js'
import { serviceNamesEn } from './i18n/services-en.js'
import { canonicalOrigin, normalizeServiceName, serviceBySlug, serviceSlug } from './service-routes.js'
import telegramSyncMetaFallback from './telegram-sync-meta.json'

const siteDocuments = inject('siteContentDocuments', {})
const siteData = siteDocuments.siteData || siteDataFallback
const telegramProjectRecords = siteDocuments.telegramProjects || telegramProjectFallback
const telegramReportRecords = siteDocuments.telegramReports || telegramReportFallback
const articleDetailsData = siteDocuments.articleDetails || articleDetailsFallback
const adminOverridesFile = siteDocuments.adminOverrides || adminOverridesFallback
const telegramSyncMeta = siteDocuments.telegramSyncMeta || telegramSyncMetaFallback

const HomePage = defineAsyncComponent(() => import('./components/home/HomePage.vue'))
const AboutPage = defineAsyncComponent(() => import('./components/about/AboutPage.vue'))
const ArticlesPage = defineAsyncComponent(() => import('./components/articles/ArticlesPage.vue'))
const ContactPage = defineAsyncComponent(() => import('./components/contact/ContactPage.vue'))
const FeedbackPage = defineAsyncComponent(() => import('./components/feedback/FeedbackPage.vue'))
const ProjectsPage = defineAsyncComponent(() => import('./components/projects/ProjectsPage.vue'))
const ServicesPage = defineAsyncComponent(() => import('./components/services/ServicesPage.vue'))
const AdminPage = defineAsyncComponent(() => import('./components/admin/AdminPage.vue'))
const PortalPage = defineAsyncComponent(() => import('./components/portal/PortalPage.vue'))
const BuildingExplorer = defineAsyncComponent(() => import('./components/building/BuildingExplorer.vue'))

function keepPhotographedReports(record) {
  const timeline = (record.timeline || [])
    .filter((entry) => Boolean(entry.image))
    .sort((left, right) => (Date.parse(right.date) || 0) - (Date.parse(left.date) || 0))
  if (!timeline.length) return null

  const images = timeline.map((entry) => entry.image)
  const finalImage = record.finalImage && images.includes(record.finalImage) ? record.finalImage : null
  const latest = timeline[0]
  return {
    ...record,
    timeline,
    images,
    finalImage,
    updatedAt: latest?.date || record.updatedAt,
    status: finalImage ? 'completed' : 'history',
    ...(record.source === 'field-reports'
      ? { description: 'گزارش تصویری پروژه‌های شرکت.' }
      : record.source === 'telegram-report'
        ? { description: 'گزارش تصویری مستقل کارگاهی.' }
        : {}),
  }
}

const picturedTelegramRecords = ref([])
const projectArchiveLoaded = ref(false)
const projectArchiveLoading = ref(false)
const projectArchiveError = ref(false)
let projectArchivePromise = null
function loadProjectArchive() {
  if (projectArchiveLoaded.value) return Promise.resolve()
  if (projectArchivePromise) return projectArchivePromise

  projectArchiveLoading.value = true
  projectArchiveError.value = false
  projectArchivePromise = Promise.resolve().then(() => {
    picturedTelegramRecords.value = [...telegramProjectRecords, ...telegramReportRecords]
      .map(keepPhotographedReports)
      .filter(Boolean)
    projectArchiveLoaded.value = true
  }).catch(() => {
    projectArchiveError.value = true
    projectArchivePromise = null
  }).finally(() => {
    projectArchiveLoading.value = false
  })

  return projectArchivePromise
}
const baseProjects = computed(() => [...siteData.projects, ...picturedTelegramRecords.value])
const baseArticles = siteData.articles
const baseArticleDetails = articleDetailsData
const baseSiteContent = {
  company: defaultCompany,
  disciplines: defaultDisciplines,
  engagementModels: defaultEngagementModels,
  mission: defaultMission,
  principles: defaultPrinciples,
  serviceGroups: defaultServiceGroups,
  serviceExamples: [],
  additionalServices: defaultAdditionalServices,
  sourceAboutProfile: defaultSourceAboutProfile,
  teamDirectory: defaultTeamDirectory,
  teamResponsibilities: defaultTeamResponsibilities,
  vision: defaultVision,
  siteMedia: {
    logoImage: '/images/about-logo.png',
    faviconImage: '/favicon.svg',
    companyMonogramImage: '/images/logo-footer.svg',
    footerWatermarkImage: '/images/logo-footer.svg',
    heroImage: '/Uploads/PrjData/bdff6df7-b413-4f86-8b8b-c89fe695d30d.jpg',
    heroImageAlt: 'عکس واقعی از نمای بیرونی یکی از پروژه‌های ثبت‌شدهٔ شرکت.',
    heroImageCaption: 'یک نمونه از پروژه‌های شرکت',
    aboutImage: '/Uploads/PrjData/f3917f63-bd7d-45f9-9016-cf40a752ad95.jpg',
    aboutImageAlt: 'نمای کارگاهی یکی از پروژه‌های ثبت‌شدهٔ شرکت',
    teamPhoto01: '/Uploads/team/team-01.jpg',
    teamPhoto02: '/Uploads/team/team-02.jpg',
    teamPhoto03: '/Uploads/team/team-03.jpg',
    teamPhoto04: '/Uploads/team/team-05.jpg',
    teamPhoto05: '/Uploads/team/team-06.jpg',
    teamPhoto06: '/Uploads/team/team-04.jpg',
    teamPhoto07: '/Uploads/team/team-08.jpg',
    teamPhoto08: '/Uploads/team/team-12.jpg',
    teamPhoto10: '/Uploads/team/team-11.jpg',
    defaultArticleImage: '/images/590856/2.jpg',
    featuredProjectIds: [68, 70, 50],
  },
}
const adminOverrides = ref(normalizeAdminOverrides(adminOverridesFile))
const adminEnabled = ref(false)
const adminReady = ref(false)
const adminHasBackup = ref(false)
const adminStorage = ref('json')
const adminFeedback = ref([])
const adminContactRequests = ref([])
const siteContent = computed(() => applyAdminPatch(baseSiteContent, adminOverrides.value.siteContent))
const company = computed(() => siteContent.value.company)
const disciplines = computed(() => siteContent.value.disciplines)
const engagementModels = computed(() => siteContent.value.engagementModels)
const mission = computed(() => siteContent.value.mission)
const principles = computed(() => siteContent.value.principles)
const serviceGroups = computed(() => siteContent.value.serviceGroups)
const additionalServices = computed(() => siteContent.value.additionalServices)
const sourceAboutProfile = computed(() => siteContent.value.sourceAboutProfile)
const teamResponsibilities = computed(() => siteContent.value.teamResponsibilities || [])
const teamRoles = computed(() => [...disciplines.value, ...teamResponsibilities.value])
const vision = computed(() => siteContent.value.vision)
const siteMedia = computed(() => ({ ...baseSiteContent.siteMedia, ...(siteContent.value.siteMedia || {}) }))
watch(() => siteMedia.value.faviconImage || '/favicon.svg', (href) => {
  if (typeof document !== 'undefined') document.querySelector('link[rel="icon"]')?.setAttribute('href', href)
}, { immediate: true })
const teamDirectory = computed(() => (siteContent.value.teamDirectory || []).map((group) => ({
  ...group,
  members: (group.members || []).map((member) => ({
    ...member,
    photo: member.photoKey ? siteMedia.value[member.photoKey] || '' : '',
  })),
})))
const allProjects = computed(() => mergeAdminCollection(baseProjects.value, adminOverrides.value.projects, projectAdminKey))
const projects = computed(() => allProjects.value.filter((item) => item.adminStatus !== 'draft'))
const allArticles = computed(() => mergeAdminCollection(baseArticles, adminOverrides.value.articles, idAdminKey))
const articles = computed(() => allArticles.value.filter((item) => item.adminStatus !== 'draft'))
const articleDetails = computed(() => mergeAdminCollection(baseArticleDetails, adminOverrides.value.articleDetails, idAdminKey))
const articleDetailsById = computed(() => Object.fromEntries(articleDetails.value.map((item) => [item.id, item])))
const menuOpen = ref(false)
function catalogServiceNames() {
  return [...new Set([...serviceGroups.value.flatMap((group) => group.items), ...additionalServices.value])]
}
function normalizeRoute(rawRoute) {
  const target = new URL(rawRoute || '/', window.location.origin)
  let pathname = target.pathname.replace(/\/+$/, '') || '/'
  const params = new URLSearchParams(target.search)
  if (pathname === '/services') {
    const requested = params.get('service')
    const names = catalogServiceNames()
    const selected = names.find((name) => normalizeServiceName(name) === normalizeServiceName(requested))
      || serviceBySlug(requested, names)
    if (selected) {
      pathname = `/services/${serviceSlug(selected)}`
      params.delete('service')
      params.delete('category')
    }
  } else if (pathname.startsWith('/services/')) {
    let routeKey = pathname.slice('/services/'.length)
    try { routeKey = decodeURIComponent(routeKey) } catch { /* Keep malformed routes available for the not-found view. */ }
    const names = catalogServiceNames()
    const selected = serviceBySlug(routeKey, names)
      || names.find((name) => normalizeServiceName(name) === normalizeServiceName(routeKey))
    if (selected) pathname = `/services/${serviceSlug(selected)}`
  }
  const query = params.toString()
  const canonicalPathname = pathname === '/' ? '/' : `${pathname}/`
  return `${canonicalPathname}${query ? `?${query}` : ''}`
}
function routeFromLocation() {
  const legacyHash = window.location.hash.startsWith('#/')
  const requested = legacyHash
    ? window.location.hash.slice(1)
    : `${window.location.pathname}${window.location.search}`
  return normalizeRoute(requested)
}
const routePath = ref(routeFromLocation())
function writeRoute(nextRoute, { replace = false } = {}) {
  const normalized = normalizeRoute(nextRoute)
  if (replace) window.history.replaceState(window.history.state, '', normalized)
  else window.history.pushState(window.history.state, '', normalized)
  syncRoute()
}
function handleRouteClick(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  const anchor = event.target.closest?.('a[href]')
  if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return
  const rawHref = anchor.getAttribute('href') || ''
  if (!rawHref || rawHref.startsWith('#')) return
  const target = new URL(rawHref, window.location.href)
  if (target.origin !== window.location.origin) return
  const route = normalizeRoute(`${target.pathname}${target.search}`)
  if (!/^\/(?:$|services(?:\/|$)|projects(?:\/|$)|articles(?:\/|$)|building(?:\/|$)|about(?:\/|$)|contact(?:\/|$)|feedback(?:\/|$)|portal(?:\/|$)|admin(?:\/|$))/.test(route)) return
  event.preventDefault()
  writeRoute(route)
}
function savedLocale() {
  const requested = new URLSearchParams(routePath.value.split('?')[1] || '').get('lang')
  if (requested === 'en' || requested === 'fa') return requested
  try { return localStorage.getItem('arcpol-language') === 'en' ? 'en' : 'fa' } catch { return 'fa' }
}
const locale = ref(savedLocale())
function changeLocale(value) {
  if (!['fa', 'en'].includes(value)) return
  locale.value = value
  try { localStorage.setItem('arcpol-language', value) } catch { /* Storage is optional. */ }
  const [path, query = ''] = routePath.value.split('?')
  const params = new URLSearchParams(query)
  params.set('lang', value)
  writeRoute(`${path || '/'}?${params}`)
}
const projectFilter = ref('all')
const projectSourceFilter = ref('all')
const projectCategoryFilter = ref('all')
const projectUsageFilter = ref('all')
const projectSearch = ref('')
const articleSearch = ref('')
const visibleProjectCount = ref(12)
const visibleArticleCount = ref(12)
const galleryIndex = ref(0)
const feedbackSaved = ref(false)
const feedbackRating = ref('5')
const lastProjectTrigger = ref(null)

function syncRoute() {
  const legacyHash = window.location.hash.startsWith('#/')
  routePath.value = routeFromLocation()
  const currentAddress = `${window.location.pathname}${window.location.search}`
  if (legacyHash || currentAddress !== routePath.value) {
    window.history.replaceState(window.history.state, '', routePath.value)
  }
  const requested = new URLSearchParams(routePath.value.split('?')[1] || '').get('lang')
  if (requested === 'en' || requested === 'fa') {
    locale.value = requested
    try { localStorage.setItem('arcpol-language', requested) } catch { /* Storage is optional. */ }
  } else if (locale.value === 'en' && routePath.value.startsWith('/')) {
    const [path, query = ''] = routePath.value.split('?')
    const params = new URLSearchParams(query)
    params.set('lang', 'en')
    routePath.value = `${path}?${params}`
    window.history.replaceState(window.history.state, '', routePath.value)
  }
  menuOpen.value = false
}

const segments = computed(() => routePath.value.split('?')[0].split('/').filter(Boolean))
const routeQuery = computed(() => new URLSearchParams(routePath.value.split('?')[1] || ''))
const page = computed(() => segments.value[0] || 'home')
const adminRoute = computed(() => page.value === 'admin')
const detailId = computed(() => Number(segments.value[1]) || null)
const serviceNameFromRoute = computed(() => {
  const names = catalogServiceNames()
  const routeSegment = segments.value[1]
  if (page.value === 'services' && routeSegment) {
    let routeKey = routeSegment
    try { routeKey = decodeURIComponent(routeKey) } catch { /* An invalid route is handled as not found. */ }
    return serviceBySlug(routeKey, names)
      || names.find((name) => normalizeServiceName(name) === normalizeServiceName(routeKey))
      || ''
  }
  if (page.value === 'services' || page.value === 'building' || page.value === 'contact') {
    const requested = routeQuery.value.get('service') || ''
    return names.find((name) => normalizeServiceName(name) === normalizeServiceName(requested)) || ''
  }
  return ''
})
const routeNotFound = computed(() => {
  if (!['home', 'services', 'projects', 'about', 'articles', 'contact', 'feedback', 'portal', 'building', 'admin'].includes(page.value)) return true
  if (page.value === 'services') return segments.value.length > 2 || (segments.value.length === 2 && !serviceNameFromRoute.value)
  if (page.value === 'projects') {
    if (segments.value.length > 2 || (segments.value.length === 2 && !detailId.value)) return true
    return Boolean(detailId.value && projectArchiveLoaded.value && !projects.value.some((item) => item.id === detailId.value))
  }
  if (page.value === 'articles') return segments.value.length > 2 || (segments.value.length === 2 && (!detailId.value || !articles.value.some((item) => item.id === detailId.value)))
  return page.value !== 'home' && segments.value.length > 1
})
const currentPage = computed(() => adminRoute.value ? '' : routeNotFound.value ? 'not-found' : page.value)
const englishPageReady = computed(() => ['home', 'services', 'contact', 'projects', 'about', 'articles', 'building', 'portal', 'feedback', 'not-found'].includes(currentPage.value))
const pageHead = computed(() => {
  const pages = {
    fa: {
      home: ['Arcpol | مهندسی و ساخت ساختمان', 'خدمات یکپارچهٔ مهندسی و ساخت ساختمان، از مطالعات خاک و طراحی تا نظارت، اجرا و نقشه‌های چون‌ساخت.'],
      services: ['خدمات مهندسی ساختمان | Arcpol', 'خدمات مهندسی و ساخت ساختمان را از طراحی و آزمایش تا نظارت و اجرا مرور کنید.'],
      building: ['ساختمان تعاملی | Arcpol', 'مدل مفهومی ساختمان را مرحله‌به‌مرحله ببینید و خدمات مرتبط را روی اجزای آن پیدا کنید.'],
      projects: ['آرشیو پروژه‌ها | Arcpol', 'سوابق مستند پروژه‌ها، گروه‌های کددار و گزارش‌های تصویری کارگاهی شرکت را مرور کنید.'],
      about: ['دربارهٔ Arcpol | مهندسی و ساخت', 'با حوزه‌های مهندسی، ساختار خدمات و روش همکاری Arcpol آشنا شوید.'],
      articles: ['مقالات و دانش فنی | Arcpol', 'مقاله‌ها، مستندات فنی و منابع ثبت‌شده در آرشیو Arcpol را مرور کنید.'],
      contact: ['تماس با Arcpol | دفتر و خدمات مهندسی', 'برای گفت‌وگو دربارهٔ خدمات مهندسی و ساخت ساختمان از راه‌های رسمی با Arcpol تماس بگیرید.'],
      feedback: ['ثبت بازخورد | Arcpol', 'پیشنهاد یا تجربهٔ همکاری خود را در فرم بازخورد ثبت کنید.'],
      portal: ['نمونهٔ پنل مشتریان | Arcpol', 'پیش‌نمایش نمایشیِ پنل مشتریان؛ اطلاعات این صفحه ساختگی است و به پروژهٔ واقعی متصل نیست.'],
      'not-found': ['صفحه پیدا نشد | Arcpol', 'صفحهٔ درخواستی در وب‌سایت Arcpol پیدا نشد.'],
    },
    en: {
      home: ['ARCPOL | Engineering & Construction', 'Integrated building engineering and construction services, from ground studies and design to supervision, construction and as-built drawings.'],
      services: ['Building Engineering Services | ARCPOL', 'Explore building engineering and construction services, from design and testing through supervision and construction.'],
      building: ['Interactive Building | ARCPOL', 'Explore a conceptual building model stage by stage and find related services on its components.'],
      projects: ['Project Archive | ARCPOL', 'Browse documented project records, coded groups and photographic site reports.'],
      about: ['About ARCPOL | Engineering & Construction', 'Learn about ARCPOL’s engineering disciplines, service scope and ways of working.'],
      articles: ['Articles & Technical Resources | ARCPOL', 'Browse articles, technical documents and resources recorded in the ARCPOL archive.'],
      contact: ['Contact ARCPOL | Engineering Services', 'Contact ARCPOL through the company’s official channels to discuss building engineering and construction services.'],
      feedback: ['Share Feedback | ARCPOL', 'Share a suggestion or an experience from working with ARCPOL.'],
      portal: ['Client Portal Demo | ARCPOL', 'A sample preview of the client portal. All information on this page is fictional and is not connected to a real project.'],
      'not-found': ['Page not found | ARCPOL', 'The requested page could not be found on the ARCPOL website.'],
    },
  }
  const language = locale.value === 'en' ? 'en' : 'fa'
  const fallback = language === 'en'
    ? ['ARCPOL | Local content management', 'Local content management for the ARCPOL site.']
    : ['پنل مدیریت محلی | Arcpol', 'مدیریت محلی محتوای سایت Arcpol.']
  if (currentPage.value === 'services' && serviceNameFromRoute.value) {
    const service = serviceNameFromRoute.value
    const displayName = language === 'en' ? serviceNamesEn[service] || service : service
    const title = language === 'en' ? `${displayName} | ARCPOL` : `${displayName} | خدمات Arcpol`
    const description = language === 'en'
      ? `Learn about ${displayName} within ARCPOL’s building engineering and construction services.`
      : `دامنهٔ خدمت ${service} در سبد مهندسی و ساخت ساختمان Arcpol را ببینید.`
    return [title, description]
  }
  if (currentPage.value === 'projects' && detailId.value) {
    const project = projects.value.find((item) => item.id === detailId.value)
    if (project) {
      const title = projectTitle(project)
      const displayTitle = language === 'en' ? projectTerm(title, 'en') : title
      const description = project.description || (language === 'en' ? 'A documented project record from the ARCPOL archive.' : 'یک رکورد مستند از آرشیو پروژه‌های Arcpol.')
      return [language === 'en' ? `${displayTitle} | ARCPOL` : `${displayTitle} | Arcpol`, description]
    }
  }
  if (currentPage.value === 'articles' && detailId.value) {
    const article = articles.value.find((item) => item.id === detailId.value)
    if (article) {
      const title = language === 'en' ? articleTitle(article) : article.title
      const description = article.excerpt || (language === 'en' ? 'An article from the ARCPOL technical archive.' : 'مقاله‌ای از آرشیو فنی Arcpol.')
      return [language === 'en' ? `${title} | ARCPOL` : `${title} | Arcpol`, description]
    }
  }
  return pages[language][currentPage.value] || fallback
})
const canonicalPath = computed(() => {
  const [path] = routePath.value.split('?')
  return path === '/admin/' || currentPage.value === 'not-found' ? '/' : path
})
const pageShareImage = computed(() => {
  if (currentPage.value === 'projects' && detailId.value) {
    const project = projects.value.find((item) => item.id === detailId.value)
    return projectImagesFor(project)[0] || '/Uploads/PrjData/bdff6df7-b413-4f86-8b8b-c89fe695d30d.jpg'
  }
  if (currentPage.value === 'articles' && detailId.value) {
    return articles.value.find((item) => item.id === detailId.value)?.image || '/images/590856/2.jpg'
  }
  return '/Uploads/PrjData/bdff6df7-b413-4f86-8b8b-c89fe695d30d.jpg'
})
watch([locale, pageHead, canonicalPath, pageShareImage], ([value, [title, description], path, image]) => {
  document.documentElement.lang = value
  document.documentElement.dir = value === 'en' ? 'ltr' : 'rtl'
  document.title = title
  document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title)
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
  document.querySelector('meta[property="og:url"]')?.setAttribute('content', `${canonicalOrigin}${path}`)
  document.querySelector('meta[property="og:locale"]')?.setAttribute('content', value === 'en' ? 'en_US' : 'fa_IR')
  document.querySelector('meta[property="og:image"]')?.setAttribute('content', `${canonicalOrigin}${image}`)
  document.querySelector('meta[name="twitter:image"]')?.setAttribute('content', `${canonicalOrigin}${image}`)
  document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description)
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', `${canonicalOrigin}${path}`)
  try { localStorage.setItem('arcpol-language', value) } catch { /* Storage is optional. */ }
}, { immediate: true })
watch(adminRoute, (isAdmin) => {
  adminReady.value = false
  if (isAdmin) loadLocalAdmin()
}, { immediate: true })
const serviceCategoryFromRoute = computed(() => routeQuery.value.get('category') || 'all')
watch([currentPage, serviceNameFromRoute], ([activePage, service]) => {
  if (['projects', 'building'].includes(activePage) || (activePage === 'services' && service)) loadProjectArchive()
  if (adminRoute.value) loadProjectArchive()
}, { immediate: true })
const selectedServiceEvidence = computed(() => {
  const service = serviceNameFromRoute.value
  if (!service) return []
  const curated = (siteContent.value.serviceExamples || []).flatMap((entry) => {
    if (entry.service !== service) return []
    const project = projects.value.find((record) => projectAdminKey(record) === String(entry.projectKey))
    const images = [...(project?.images || []), ...(project?.timeline || []).map((event) => event.image)].filter(Boolean)
    if (!project || !images.includes(entry.image)) return []
    const event = (project.timeline || []).find((item) => item.image === entry.image)
    return [{
      image: entry.image,
      projectId: project.id,
      code: project.code || `${project.source || 'company'}:${project.id}`,
      usage: project.usage || 'ساختمانی',
      date: event?.date || project.updatedAt || null,
      keyword: service,
      summary: '',
      sourceKind: 'company-curated',
    }]
  })
  const archive = findServiceEvidence(service, projects.value)
  const seen = new Set()
  return [...curated, ...archive].filter((item) => {
    if (seen.has(item.image)) return false
    seen.add(item.image)
    return true
  }).slice(0, 4)
})
const navigation = [
  { label: 'خانه', path: '/', key: 'home' },
  { label: 'خدمات', path: '/services', key: 'services' },
  { label: 'ساختمان تعاملی', path: '/building', key: 'building' },
  { label: 'پروژه‌ها', path: '/projects', key: 'projects' },
  { label: 'درباره ما', path: '/about', key: 'about' },
  { label: 'مقالات', path: '/articles', key: 'articles' },
  { label: 'پنل مشتریان · نمونه', path: '/portal', key: 'portal' },
  { label: 'تماس', path: '/contact', key: 'contact' },
]
const sourceFilteredProjects = computed(() => projects.value.filter((item) => projectSourceFilter.value === 'all'
  || (projectSourceFilter.value === 'company' && isDocumentedCompanyProject(item))
  || (projectSourceFilter.value === 'previousSite' && !item.source)
  || (projectSourceFilter.value === 'linked' && isCodedTelegramProject(item))
  || (projectSourceFilter.value === 'unassigned' && item.source === 'field-reports' && !isCodedTelegramProject(item))
  || (projectSourceFilter.value === 'independent' && item.source === 'telegram-report')))
const inProgressCount = computed(() => sourceFilteredProjects.value.filter((item) => item.status === 'in-progress').length)
const completedCount = computed(() => sourceFilteredProjects.value.filter((item) => item.status === 'completed').length)
const historyCount = computed(() => sourceFilteredProjects.value.filter((item) => item.status === 'history').length)
const projectCategories = computed(() => [...new Set(projects.value.map(projectCategory))])
const projectSourceCounts = computed(() => ({
  all: projects.value.length,
  company: countDocumentedProjectRecords(projects.value),
  previousSite: projects.value.filter((item) => !item.source).length,
  manual: projects.value.filter((item) => item.source === 'manual').length,
  linked: projects.value.filter(isCodedTelegramProject).length,
  unassigned: projects.value.filter((item) => item.source === 'field-reports' && !isCodedTelegramProject(item)).length,
  independent: projects.value.filter((item) => item.source === 'telegram-report').length,
  documentedProjectRecords: countDocumentedProjectRecords(projects.value),
}))
const summaryProjects = computed(() => mergeAdminCollection(siteData.projects, adminOverrides.value.projects, projectAdminKey)
  .filter((item) => item.adminStatus !== 'draft'))
const homeProjectCounts = computed(() => {
  if (projectArchiveLoaded.value) return projectSourceCounts.value
  const records = summaryProjects.value
  const previousSite = records.filter((item) => !item.source).length
  const manual = records.filter((item) => item.source === 'manual').length
  const linkedAdded = records.filter(isCodedTelegramProject).length
  return {
    previousSite,
    manual,
    linked: Number(telegramSyncMeta.publishedLinkedRecords || 0) + linkedAdded,
    unassigned: records.filter((item) => item.source === 'field-reports' && !isCodedTelegramProject(item)).length,
    independent: Number(telegramSyncMeta.publishedIndependentReports || 0),
    documentedProjectRecords: previousSite + manual + Number(telegramSyncMeta.publishedLinkedRecords || 0) + linkedAdded,
  }
})
const projectUsages = ['مسکونی', 'تجاری']
const highlightedProjects = computed(() => (siteMedia.value.featuredProjectIds || []).map((id) => projects.value.find((item) => item.id === Number(id))).filter(Boolean))
const homeStats = computed(() => {
  const number = (value) => formatNumber(value, locale.value)
  const serviceCount = new Set([...serviceGroups.value.flatMap((group) => group.items), ...additionalServices.value]).size
  return [
    { value: number(homeProjectCounts.value.documentedProjectRecords), label: locale.value === 'en' ? 'Company project portfolio' : 'پروژه‌ها و سوابق شرکت' },
    { value: number(serviceCount), label: locale.value === 'en' ? 'Listed engineering services' : 'خدمات فهرست‌شدهٔ شرکت' },
    { value: number(disciplines.value.length), label: locale.value === 'en' ? 'Core building design disciplines' : 'رشته‌های اصلی طراحی ساختمان' },
  ]
})
const homeStatsNote = computed(() => {
  const counts = homeProjectCounts.value
  const number = (value) => formatNumber(value, locale.value)
  const archiveSources = [
    locale.value === 'en' ? `${number(counts.previousSite)} former-site records` : `${number(counts.previousSite)} سابقهٔ سایت پیشین`,
    locale.value === 'en' ? `${number(counts.linked)} coded Telegram groups` : `${number(counts.linked)} گروه تلگرام کددار`,
    ...(counts.manual ? [locale.value === 'en' ? `${number(counts.manual)} company-added records` : `${number(counts.manual)} رکورد افزوده‌شدهٔ شرکت`] : []),
  ].join(locale.value === 'en' ? ' + ' : ' + ')
  return locale.value === 'en'
    ? `This count combines ${archiveSources}; it represents documented archive records and groups, not a deduplicated total of unique real-world projects. ${number(counts.unassigned)} uncoded photo entries and ${number(counts.independent)} independent site reports remain separate because they have no reliable shared project identifier.`
    : `این عدد از ${archiveSources} به‌دست آمده و شمار سوابق و گروه‌های آرشیوی را نشان می‌دهد، نه تعداد قطعی پروژه‌های یکتای واقعی. ${number(counts.unassigned)} ورودی تصویریِ بدون کد و ${number(counts.independent)} گزارش مستقل کارگاهی جدا مانده‌اند، چون شناسهٔ مشترکِ قابل‌اتکایی برای اتصال به سوابق پروژه ندارند.`
})
const selectedProject = computed(() => page.value === 'projects' && detailId.value ? projects.value.find((item) => item.id === detailId.value) : null)
const selectedArticle = computed(() => page.value === 'articles' && detailId.value ? articles.value.find((item) => item.id === detailId.value) : null)
const selectedArticleContent = computed(() => selectedArticle.value ? articleDetailsById.value[selectedArticle.value.id] : null)
function projectImagesFor(project) {
  if (project?.images?.length) return project.images
  return [...(project?.timeline || [])].reverse().map((entry) => entry.image).filter(Boolean)
}
const projectImages = computed(() => projectImagesFor(selectedProject.value))
function projectCover(project) { return projectImagesFor(project)[0] || null }

function normalize(value) {
  return String(value ?? '').toLocaleLowerCase('fa-IR').replaceAll('ي', 'ی').replaceAll('ك', 'ک').trim()
}

const filteredProjects = computed(() => sourceFilteredProjects.value.filter((project) => {
  const matchesStatus = projectFilter.value === 'all' || project.status === projectFilter.value
  const category = projectCategory(project)
  const matchesCategory = projectCategoryFilter.value === 'all' || category === projectCategoryFilter.value
  const matchesUsage = projectUsageFilter.value === 'all' || project.usage === projectUsageFilter.value
  const needle = normalize(projectSearch.value)
  const reportText = (project.timeline || []).flatMap((entry) => [entry.title, entry.summary, entry.focus]).join(' ')
  const searchable = [project.code, project.id, project.type, project.address, project.usage, project.description, ...(project.tags || []), ...(project.services || []), reportText]
  const matchesSearch = !needle || normalize([...searchable, ...searchable.map((value) => projectTerm(value, 'en'))].join(' ')).includes(needle)
  return matchesStatus && matchesCategory && matchesUsage && matchesSearch
}))
const visibleProjects = computed(() => filteredProjects.value.slice(0, visibleProjectCount.value))
const filteredArticles = computed(() => articles.value.filter((article) => !articleSearch.value || normalize(`${article.title} ${article.type} ${articleTitle(article)}`).includes(normalize(articleSearch.value))))
const visibleArticles = computed(() => filteredArticles.value.slice(0, visibleArticleCount.value))
function openProject(project, event) {
  lastProjectTrigger.value = event?.currentTarget || document.activeElement
  galleryIndex.value = 0
  writeRoute(`/projects/${project.id}`)
}
function closeProject() { writeRoute('/projects') }
function openArticle(article) { writeRoute(`/articles/${article.id}`) }
function closeArticle() { writeRoute('/articles') }
function moveGallery(step) {
  const count = projectImages.value.length
  if (!count) return
  galleryIndex.value = (galleryIndex.value + step + count) % count
}
function fallbackImage(event) {
  if (event?.currentTarget) event.currentTarget.hidden = true
}
function displayNumber(value) { return formatNumber(value, locale.value) }
function projectStatus(status) {
  if (status === 'in-progress') return 'در حال اجرا'
  if (status === 'history') return 'سوابق تصویری'
  return 'تکمیل‌شده'
}
function statusClass(status) { return status === 'in-progress' ? 'status-live' : status === 'history' ? 'status-history' : 'status-done' }
function projectCategory(project) {
  if (['telegram-report', 'field-reports'].includes(project.source)) {
    return project.services?.includes('نظارت و اجرا') ? 'نظارت و اجرا' : 'نظارت'
  }
  return project.type
}
function projectTitle(project) {
  if (project.source === 'telegram-report') return `گزارش مستقل ${project.code}`
  if (project.source === 'field-reports' && !/^G-\d+$/iu.test(project.code || '')) return 'گزارش تصویریِ بدون کد پروژه'
  if (project.source === 'field-reports') return `پروژه ${project.code}`
  if (project.code) return `پروژه ${project.code}`
  const use = project.usage ? `ٔ ${project.usage}` : ''
  const area = project.address && project.address !== 'استان البرز' ? ` در ${project.address}` : ''
  return `پروژه${use}${area}`
}
function projectDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(numberLocale('fa'), { dateStyle: 'long', timeZone: 'Asia/Tehran' }).format(new Date(value))
}
function initials(name) { return name.split(' ').slice(0, 2).map((part) => part[0]).join('‌') }
function handleKeydown(event) {
  if (event.key === 'Escape') {
    if (selectedProject.value) closeProject()
    else if (selectedArticle.value) closeArticle()
    else menuOpen.value = false
  }
  if (selectedProject.value && event.key === 'ArrowLeft') moveGallery(1)
  if (selectedProject.value && event.key === 'ArrowRight') moveGallery(-1)
}
function saveFeedback(event) {
  const form = new FormData(event.currentTarget)
  const entry = {
    name: form.get('name'),
    subject: form.get('subject'),
    details: form.get('details'),
    rating: feedbackRating.value,
    savedAt: new Date().toISOString(),
  }
  const formElement = event.currentTarget
  fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).then((response) => {
    if (!response.ok) throw new Error('local-api-unavailable')
  }).catch(() => {
    const saved = JSON.parse(localStorage.getItem('arcpol-local-feedback') || '[]')
    saved.push(entry)
    localStorage.setItem('arcpol-local-feedback', JSON.stringify(saved))
    adminFeedback.value = saved
  }).finally(() => {
    formElement.reset()
    feedbackRating.value = '5'
    feedbackSaved.value = true
  })
}

async function loadLocalAdmin() {
  adminReady.value = false
  try {
    const statusResponse = await fetch('/api/admin/status', { cache: 'no-store' })
    if (!statusResponse.ok) return
    const status = await statusResponse.json()
    adminStorage.value = status.storage === 'mariadb' ? 'mariadb' : 'json'
    const [overridesResponse, feedbackResponse, contactRequestsResponse] = await Promise.all([
      fetch('/api/admin/content', { cache: 'no-store' }),
      fetch('/api/admin/feedback', { cache: 'no-store' }),
      fetch('/api/admin/contact-requests', { cache: 'no-store' }),
    ])
    if (!overridesResponse.ok) return
    adminOverrides.value = normalizeAdminOverrides(await overridesResponse.json())
    const localEntries = feedbackResponse.ok ? await feedbackResponse.json() : []
    let previousBrowserEntries = []
    try {
      const parsed = JSON.parse(localStorage.getItem('arcpol-local-feedback') || '[]')
      if (Array.isArray(parsed)) previousBrowserEntries = parsed
    } catch {
      previousBrowserEntries = []
    }
    if (localEntries.length) adminFeedback.value = localEntries
    else if (previousBrowserEntries.length) {
      await persistAdminFeedback(previousBrowserEntries)
    } else adminFeedback.value = []
    adminContactRequests.value = contactRequestsResponse.ok ? await contactRequestsResponse.json() : []
    adminHasBackup.value = Boolean(status.hasBackup)
    adminEnabled.value = true
  } catch {
    adminEnabled.value = false
    adminHasBackup.value = false
    adminStorage.value = 'json'
  } finally {
    adminReady.value = true
  }
}

async function persistAdminOverrides(value) {
  const response = await fetch('/api/admin/content', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'ذخیرهٔ اطلاعات انجام نشد.')
  adminOverrides.value = normalizeAdminOverrides(result)
  adminHasBackup.value = true
}

async function restoreLastAdminSave() {
  const response = await fetch('/api/admin/restore-last', { method: 'POST' })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'بازگردانی انجام نشد.')
  adminOverrides.value = normalizeAdminOverrides(result)
  adminHasBackup.value = true
}

async function persistAdminFeedback(value) {
  const response = await fetch('/api/admin/feedback', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'ذخیرهٔ بازخوردها انجام نشد.')
  adminFeedback.value = result
}

async function persistAdminContactRequests(value) {
  const response = await fetch('/api/admin/contact-requests', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'ذخیرهٔ درخواست‌های تماس انجام نشد.')
  adminContactRequests.value = result
}

async function uploadAdminImage(file) {
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('خواندن تصویر انجام نشد.'))
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.readAsDataURL(file)
  })
  const response = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: file.type, data }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'بارگذاری تصویر انجام نشد.')
  return result.path
}

watch([projectFilter, projectSourceFilter, projectCategoryFilter, projectUsageFilter, projectSearch], () => { visibleProjectCount.value = 12 })
watch(articleSearch, () => { visibleArticleCount.value = 12 })
watch(routePath, () => {
  galleryIndex.value = 0
  window.scrollTo({ top: 0, behavior: 'smooth' })
})
watch(selectedProject, async (project, previousProject) => {
  await nextTick()
  if (project) document.querySelector('.project-back')?.focus()
  else if (previousProject) lastProjectTrigger.value?.focus?.()
})
onMounted(() => {
  syncRoute()
  window.addEventListener('hashchange', syncRoute)
  window.addEventListener('popstate', syncRoute)
  window.addEventListener('click', handleRouteClick)
  window.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  window.removeEventListener('hashchange', syncRoute)
  window.removeEventListener('popstate', syncRoute)
  window.removeEventListener('click', handleRouteClick)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="site-shell" id="top">
    <a class="skip-link" href="#main">{{ locale === 'en' ? 'Skip to main content' : 'رفتن به محتوای اصلی' }}</a>
    <SiteHeader
      :company="company"
      :logo-image="siteMedia.logoImage"
      :navigation="navigation"
      :current-page="currentPage"
      :menu-open="menuOpen"
      :locale="locale"
      @change-locale="changeLocale"
      @toggle-menu="menuOpen = !menuOpen"
      @close-menu="menuOpen = false"
    />

    <main id="main" :lang="locale === 'en' && englishPageReady ? 'en' : 'fa'" :dir="locale === 'en' && englishPageReady ? 'ltr' : 'rtl'">
      <p v-if="locale === 'en' && !englishPageReady" class="language-fallback page-container" lang="en" dir="ltr" role="status">This page is currently available in Persian. English translation is in progress.</p>
      <div v-if="adminRoute && projectArchiveError" class="archive-status page-container" role="alert">
        <p>{{ locale === 'en' ? 'The project archive could not be loaded.' : 'بارگذاری آرشیو پروژه‌ها انجام نشد.' }}</p>
        <button type="button" class="button button-outline" @click="loadProjectArchive">{{ locale === 'en' ? 'Try again' : 'تلاش دوباره' }}</button>
      </div>
      <p v-else-if="adminRoute && (!projectArchiveLoaded || !adminReady)" class="archive-status page-container" role="status">{{ locale === 'en' ? 'Loading the local content manager…' : 'در حال بارگذاری پنل مدیریت محلی…' }}</p>
      <AdminPage
        v-else-if="adminRoute"
        :enabled="adminEnabled"
        :has-backup="adminHasBackup"
        :storage="adminStorage"
        :overrides="adminOverrides"
        :base-projects="baseProjects"
        :projects="allProjects"
        :base-articles="baseArticles"
        :articles="allArticles"
        :base-article-details="baseArticleDetails"
        :article-details="articleDetails"
        :base-site-content="baseSiteContent"
        :site-content="siteContent"
        :company-projects="projects.filter((item) => !item.source || item.source === 'manual')"
        :site-media="siteMedia"
        :feedback="adminFeedback"
        :contact-requests="adminContactRequests"
        :project-admin-key="projectAdminKey"
        :upload-image="uploadAdminImage"
        :save-overrides="persistAdminOverrides"
        :restore-last="restoreLastAdminSave"
        :save-feedback="persistAdminFeedback"
        :save-contact-requests="persistAdminContactRequests"
      />
      <HomePage
        v-else-if="currentPage === 'home'"
        :locale="locale"
        :company="company"
        :hero-image="siteMedia.heroImage"
        :hero-image-alt="siteMedia.heroImageAlt"
        :hero-image-caption="siteMedia.heroImageCaption"
        :stats="homeStats"
        :stats-note="homeStatsNote"
        :disciplines="disciplines"
        :service-groups="serviceGroups"
        :featured-projects="highlightedProjects"
        :project-status="projectStatus"
        :status-class="statusClass"
        :project-cover="projectCover"
        @open-project="openProject"
      />
      <div v-else-if="currentPage === 'projects' && projectArchiveError" class="archive-status page-container" role="alert">
        <p>{{ locale === 'en' ? 'The project archive could not be loaded.' : 'بارگذاری آرشیو پروژه‌ها انجام نشد.' }}</p>
        <button type="button" class="button button-outline" @click="loadProjectArchive">{{ locale === 'en' ? 'Try again' : 'تلاش دوباره' }}</button>
      </div>
      <p v-else-if="currentPage === 'projects' && !projectArchiveLoaded" class="archive-status page-container" role="status">{{ locale === 'en' ? 'Loading project archive…' : 'در حال بارگذاری آرشیو پروژه‌ها…' }}</p>
      <ProjectsPage
        v-else-if="currentPage === 'projects'"
        :locale="locale"
        :project="selectedProject"
        :projects="projects"
        :in-progress-count="inProgressCount"
        :completed-count="completedCount"
        :history-count="historyCount"
        :project-categories="projectCategories"
        :project-source-filter="projectSourceFilter"
        :project-source-counts="projectSourceCounts"
        :status-filter="projectFilter"
        :category-filter="projectCategoryFilter"
        :usage-filter="projectUsageFilter"
        :search="projectSearch"
        :visible-projects="visibleProjects"
        :filtered-project-count="filteredProjects.length"
        :visible-project-count="visibleProjectCount"
        :project-images="projectImages"
        :gallery-index="galleryIndex"
        :project-status="projectStatus"
        :status-class="statusClass"
        :project-category="projectCategory"
        :project-title="projectTitle"
        :project-date="projectDate"
        :project-cover="projectCover"
        :display-number="displayNumber"
        :fallback-image="fallbackImage"
        @update:status-filter="projectFilter = $event"
        @update:source-filter="projectSourceFilter = $event"
        @update:category-filter="projectCategoryFilter = $event"
        @update:usage-filter="projectUsageFilter = $event"
        @update:search="projectSearch = $event"
        @load-more="visibleProjectCount += 12"
        @open-project="openProject"
        @move-gallery="moveGallery"
      />
      <ServicesPage
        v-else-if="currentPage === 'services'"
        :locale="locale"
        :company="company"
        :service-groups="serviceGroups"
        :engagement-models="engagementModels"
        :disciplines="disciplines"
        :additional-services="additionalServices"
        :initial-group="serviceCategoryFromRoute"
        :selected-service-name="serviceNameFromRoute"
        :projects="projects"
        :service-evidence="selectedServiceEvidence"
        :service-evidence-loading="projectArchiveLoading"
        :service-evidence-error="projectArchiveError"
      />
      <BuildingExplorer
        v-else-if="currentPage === 'building'"
        :locale="locale"
        :initial-service="serviceNameFromRoute"
        :service-groups="serviceGroups"
        :additional-services="additionalServices"
        :projects="projects"
      />
      <AboutPage
        v-else-if="currentPage === 'about'"
        :locale="locale"
        :company="company"
        :vision="vision"
        :mission="mission"
        :image="siteMedia.aboutImage"
        :image-alt="siteMedia.aboutImageAlt"
        :monogram-image="siteMedia.companyMonogramImage"
        :team-directory="teamDirectory"
        :principles="principles"
        :disciplines="disciplines"
        :team-roles="teamRoles"
        :fallback-image="fallbackImage"
      />
      <ArticlesPage
        v-else-if="currentPage === 'articles'"
        :locale="locale"
        :articles="articles"
        :fallback-image="siteMedia.defaultArticleImage"
        :selected-article="selectedArticle"
        :selected-content="selectedArticleContent"
        :search="articleSearch"
        :visible-articles="visibleArticles"
        :filtered-article-count="filteredArticles.length"
        :visible-article-count="visibleArticleCount"
        :display-number="displayNumber"
        @update:search="articleSearch = $event"
        @open-article="openArticle"
        @load-more="visibleArticleCount += 12"
      />
      <ContactPage v-else-if="currentPage === 'contact'" :company="company" :locale="locale" :selected-service-name="serviceNameFromRoute" />
      <PortalPage v-else-if="currentPage === 'portal'" :locale="locale" />
      <FeedbackPage
        v-else-if="currentPage === 'feedback'"
        :locale="locale"
        v-model:rating="feedbackRating"
        :saved="feedbackSaved"
        @save-feedback="saveFeedback"
      />
      <section v-else-if="currentPage === 'not-found'" class="page-container not-found-page" aria-labelledby="not-found-title">
        <p class="eyebrow">{{ locale === 'en' ? '404 / NOT FOUND' : '۴۰۴ / صفحه پیدا نشد' }}</p>
        <h1 id="not-found-title">{{ locale === 'en' ? 'This page is not here.' : 'این صفحه پیدا نشد.' }}</h1>
        <p>{{ locale === 'en' ? 'The link may be out of date, or the page may have moved.' : 'ممکن است پیوند قدیمی باشد یا صفحه جابه‌جا شده باشد.' }}</p>
        <a class="button button-dark" href="/">{{ locale === 'en' ? 'Return to home' : 'بازگشت به صفحهٔ اصلی' }}</a>
      </section>
    </main>

    <SiteFooter :company="company" :logo-image="siteMedia.logoImage" :watermark-image="siteMedia.footerWatermarkImage" :locale="locale" />
  </div>
</template>
