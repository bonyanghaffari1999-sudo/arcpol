<script setup>
import { computed, defineAsyncComponent, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import siteData from './site-data.json'
import telegramProjectRecords from './telegram-projects.json'
import telegramReportRecords from './telegram-reports.json'
import articleDetailsData from './article-details.json'
import adminOverridesFile from './admin-overrides.json'
import { additionalServices as defaultAdditionalServices, company as defaultCompany, disciplines as defaultDisciplines, engagementModels as defaultEngagementModels, mission as defaultMission, principles as defaultPrinciples, serviceGroups as defaultServiceGroups, sourceAboutProfile as defaultSourceAboutProfile, teamDirectory as defaultTeamDirectory, teamResponsibilities as defaultTeamResponsibilities, vision as defaultVision } from './content.js'
import { applyAdminPatch, idAdminKey, mergeAdminCollection, normalizeAdminOverrides, projectAdminKey } from './admin-data.js'
import SiteHeader from './components/common/SiteHeader.vue'
import SiteFooter from './components/common/SiteFooter.vue'
import HomePage from './components/home/HomePage.vue'
import AboutPage from './components/about/AboutPage.vue'
import ArticlesPage from './components/articles/ArticlesPage.vue'
import ContactPage from './components/contact/ContactPage.vue'
import FeedbackPage from './components/feedback/FeedbackPage.vue'
import ProjectsPage from './components/projects/ProjectsPage.vue'
import ServicesPage from './components/services/ServicesPage.vue'
import AdminPage from './components/admin/AdminPage.vue'
import PortalPage from './components/portal/PortalPage.vue'
import { findServiceEvidence } from './service-details.js'

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

const picturedTelegramRecords = [...telegramProjectRecords, ...telegramReportRecords]
  .map(keepPhotographedReports)
  .filter(Boolean)
const baseProjects = [...siteData.projects, ...picturedTelegramRecords]
const baseArticles = siteData.articles
const baseArticleDetails = articleDetailsData
const baseSiteContent = {
  company: defaultCompany,
  disciplines: defaultDisciplines,
  engagementModels: defaultEngagementModels,
  mission: defaultMission,
  principles: defaultPrinciples,
  serviceGroups: defaultServiceGroups,
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
const adminHasBackup = ref(false)
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
const allProjects = computed(() => mergeAdminCollection(baseProjects, adminOverrides.value.projects, projectAdminKey))
const projects = computed(() => allProjects.value.filter((item) => item.adminStatus !== 'draft'))
const allArticles = computed(() => mergeAdminCollection(baseArticles, adminOverrides.value.articles, idAdminKey))
const articles = computed(() => allArticles.value.filter((item) => item.adminStatus !== 'draft'))
const articleDetails = computed(() => mergeAdminCollection(baseArticleDetails, adminOverrides.value.articleDetails, idAdminKey))
const articleDetailsById = computed(() => Object.fromEntries(articleDetails.value.map((item) => [item.id, item])))
const menuOpen = ref(false)
const routePath = ref(window.location.hash.replace(/^#/, '') || '/')
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
  routePath.value = window.location.hash.replace(/^#/, '') || '/'
  menuOpen.value = false
}

const segments = computed(() => routePath.value.split('?')[0].split('/').filter(Boolean))
const routeQuery = computed(() => new URLSearchParams(routePath.value.split('?')[1] || ''))
const page = computed(() => segments.value[0] || 'home')
const adminRoute = computed(() => page.value === 'admin')
const detailId = computed(() => Number(segments.value[1]) || null)
const currentPage = computed(() => adminRoute.value ? '' : (['services', 'projects', 'about', 'articles', 'contact', 'feedback', 'portal', 'building'].includes(page.value) ? page.value : 'home'))
const serviceCategoryFromRoute = computed(() => routeQuery.value.get('category') || 'all')
const serviceNameFromRoute = computed(() => routeQuery.value.get('service') || '')
const selectedServiceEvidence = computed(() => findServiceEvidence(serviceNameFromRoute.value, projects.value))
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
  || (projectSourceFilter.value === 'company' && (!item.source || item.source === 'manual'))
  || (projectSourceFilter.value === 'linked' && item.source === 'field-reports')
  || (projectSourceFilter.value === 'independent' && item.source === 'telegram-report')))
const inProgressCount = computed(() => sourceFilteredProjects.value.filter((item) => item.status === 'in-progress').length)
const completedCount = computed(() => sourceFilteredProjects.value.filter((item) => item.status === 'completed').length)
const historyCount = computed(() => sourceFilteredProjects.value.filter((item) => item.status === 'history').length)
const projectCategories = computed(() => [...new Set(projects.value.map(projectCategory))])
const projectSourceCounts = computed(() => ({
  all: projects.value.length,
  company: projects.value.filter((item) => !item.source || item.source === 'manual').length,
  linked: projects.value.filter((item) => item.source === 'field-reports').length,
  independent: projects.value.filter((item) => item.source === 'telegram-report').length,
}))
const projectUsages = ['مسکونی', 'تجاری']
const highlightedProjects = computed(() => (siteMedia.value.featuredProjectIds || []).map((id) => projects.value.find((item) => item.id === Number(id))).filter(Boolean))
const uniquePhotoCount = computed(() => new Set(projects.value.flatMap(projectImagesFor)).size)
const homeStats = computed(() => [
  { value: displayNumber(projects.value.filter((item) => !item.source || item.source === 'manual').length), label: 'پروژه‌های شرکت' },
  { value: displayNumber(uniquePhotoCount.value), label: 'تصویر یکتا در آرشیو' },
  { value: displayNumber(disciplines.value.length), label: 'رشته‌های اصلی ساختمان' },
])
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
  const matchesSearch = !needle || normalize([project.code || `G-${project.id}`, project.type, project.address, project.usage, project.description, ...(project.tags || []), ...(project.services || []), reportText].join(' ')).includes(needle)
  return matchesStatus && matchesCategory && matchesUsage && matchesSearch
}))
const visibleProjects = computed(() => filteredProjects.value.slice(0, visibleProjectCount.value))
const filteredArticles = computed(() => articles.value.filter((article) => !articleSearch.value || normalize(`${article.title} ${article.type}`).includes(normalize(articleSearch.value))))
const visibleArticles = computed(() => filteredArticles.value.slice(0, visibleArticleCount.value))
function openProject(project, event) {
  lastProjectTrigger.value = event?.currentTarget || document.activeElement
  galleryIndex.value = 0
  window.location.hash = `/projects/${project.id}`
}
function closeProject() { window.location.hash = '/projects' }
function openArticle(article) { window.location.hash = `/articles/${article.id}` }
function closeArticle() { window.location.hash = '/articles' }
function moveGallery(step) {
  const count = projectImages.value.length
  if (!count) return
  galleryIndex.value = (galleryIndex.value + step + count) % count
}
function fallbackImage(event) {
  if (event?.currentTarget) event.currentTarget.hidden = true
}
function displayNumber(value) { return Number(value).toLocaleString('fa-IR') }
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
  if (project.source === 'field-reports') return `پروژه کارگاهی ${project.code}`
  return `پروژه ${project.code || `G-${project.id}`}`
}
function projectDate(value) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long', timeZone: 'Asia/Tehran' }).format(new Date(value))
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
  }).then(async (response) => {
    if (!response.ok) throw new Error('local-api-unavailable')
    const result = await fetch('/api/admin/feedback')
    adminFeedback.value = result.ok ? await result.json() : adminFeedback.value
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
  try {
    const statusResponse = await fetch('/api/admin/status', { cache: 'no-store' })
    if (!statusResponse.ok) return
    const status = await statusResponse.json()
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
  window.addEventListener('hashchange', syncRoute)
  window.addEventListener('keydown', handleKeydown)
  loadLocalAdmin()
})
onUnmounted(() => {
  window.removeEventListener('hashchange', syncRoute)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="site-shell" id="top">
    <a class="skip-link" href="#main">رفتن به محتوای اصلی</a>
    <SiteHeader
      :company="company"
      :logo-image="siteMedia.logoImage"
      :navigation="navigation"
      :current-page="currentPage"
      :menu-open="menuOpen"
      @toggle-menu="menuOpen = !menuOpen"
      @close-menu="menuOpen = false"
    />

    <main id="main">
      <AdminPage
        v-if="adminRoute"
        :enabled="adminEnabled"
        :has-backup="adminHasBackup"
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
        :company="company"
        :hero-image="siteMedia.heroImage"
        :hero-image-alt="siteMedia.heroImageAlt"
        :hero-image-caption="siteMedia.heroImageCaption"
        :stats="homeStats"
        :disciplines="disciplines"
        :service-groups="serviceGroups"
        :featured-projects="highlightedProjects"
        :project-status="projectStatus"
        :status-class="statusClass"
        :project-cover="projectCover"
        @open-project="openProject"
      />
      <ProjectsPage
        v-else-if="currentPage === 'projects'"
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
        :company="company"
        :service-groups="serviceGroups"
        :engagement-models="engagementModels"
        :disciplines="disciplines"
        :additional-services="additionalServices"
        :initial-group="serviceCategoryFromRoute"
        :selected-service-name="serviceNameFromRoute"
        :projects="projects"
        :service-evidence="selectedServiceEvidence"
      />
      <BuildingExplorer
        v-else-if="currentPage === 'building'"
        :initial-service="serviceNameFromRoute"
        :service-groups="serviceGroups"
        :additional-services="additionalServices"
        :projects="projects"
      />
      <AboutPage
        v-else-if="currentPage === 'about'"
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
      <ContactPage v-else-if="currentPage === 'contact'" :company="company" />
      <PortalPage v-else-if="currentPage === 'portal'" />
      <FeedbackPage
        v-else
        v-model:rating="feedbackRating"
        :saved="feedbackSaved"
        @save-feedback="saveFeedback"
      />
    </main>

    <SiteFooter :company="company" :logo-image="siteMedia.logoImage" :watermark-image="siteMedia.footerWatermarkImage" />
  </div>
</template>
