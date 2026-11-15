<script setup>
import { computed, ref, watch } from 'vue'
import AdminRecordEditor from './AdminRecordEditor.vue'
import AdminMediaLibrary from './AdminMediaLibrary.vue'
import TelegramProjectInbox from './TelegramProjectInbox.vue'
import { createAdminPatch, deleteCollectionRecord, setCollectionRecord } from '../../admin-data.js'
import { findServiceEvidence } from '../../service-details.js'
import { countDocumentedProjectRecords, isCodedTelegramProject, isDocumentedCompanyProject, isIndependentProjectReport } from '../../project-archive.js'

const props = defineProps({
  enabled: { type: Boolean, required: true },
  hasBackup: { type: Boolean, required: true },
  storage: { type: String, required: true },
  overrides: { type: Object, required: true },
  baseProjects: { type: Array, required: true },
  projects: { type: Array, required: true },
  baseArticles: { type: Array, required: true },
  articles: { type: Array, required: true },
  baseArticleDetails: { type: Array, required: true },
  articleDetails: { type: Array, required: true },
  baseSiteContent: { type: Object, required: true },
  siteContent: { type: Object, required: true },
  companyProjects: { type: Array, required: true },
  siteMedia: { type: Object, required: true },
  feedback: { type: Array, required: true },
  contactRequests: { type: Array, required: true },
  projectAdminKey: { type: Function, required: true },
  uploadImage: { type: Function, required: true },
  saveOverrides: { type: Function, required: true },
  restoreLast: { type: Function, required: true },
  saveFeedback: { type: Function, required: true },
  saveContactRequests: { type: Function, required: true },
})

const sections = [
  { id: 'overview', label: 'نمای کلی' },
  { id: 'projects', label: 'پروژه‌ها و گزارش‌ها' },
  { id: 'telegram-inbox', label: 'صندوق تلگرام' },
  { id: 'articles', label: 'مقاله‌ها' },
  { id: 'site', label: 'اطلاعات و خدمات سایت' },
  { id: 'media', label: 'رسانه‌ها و تصویرها' },
  { id: 'contact-requests', label: 'درخواست‌های تماس' },
  { id: 'feedback', label: 'بازخوردهای محلی' },
  { id: 'trash', label: 'حذف‌شده‌ها' },
]
const section = ref('overview')
const quickLinks = [
  { id: 'projects', title: 'پروژه‌ها و گزارش‌ها', detail: 'گروه‌های پروژهٔ کددار را از گزارش‌های مستقل یا بدون کد جدا ببینید.', number: '01' },
  { id: 'articles', title: 'مقاله‌ها و دانش فنی', detail: 'عنوان، متن و پیوست‌های مقاله را پیدا و ویرایش کنید.', number: '02' },
  { id: 'site', title: 'صفحه‌ها و خدمات', detail: 'معرفی شرکت، دسته‌های خدمات و دامنه‌های همکاری را تغییر دهید.', number: '03' },
  { id: 'media', title: 'کتابخانهٔ تصویرها', detail: 'تصویرها، نشان سایت و عکس‌های انتخاب‌شدهٔ صفحهٔ اصلی را مدیریت کنید.', number: '04' },
  { id: 'feedback', title: 'بازخوردهای محلی', detail: 'بازخوردهای ذخیره‌شده روی همین رایانه را مرور کنید.', number: '05' },
  { id: 'contact-requests', title: 'درخواست‌های تماس', detail: 'درخواست‌های ثبت‌شده در این نسخهٔ محلی را پیگیری کنید.', number: '06' },
  { id: 'trash', title: 'حذف‌شده‌ها', detail: 'محتوای پنهان‌شده را در صورت نیاز بازگردانید.', number: '07' },
]
const projectSource = ref('all')
const search = ref('')
const selectedKey = ref('')
const visibleLimit = ref(50)
const dirty = ref(false)
const busy = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const contentDraft = ref(copy(props.siteContent))
const contentRawMode = ref(false)
const contentRaw = ref('')
const feedbackQuery = ref('')
const contactRequestsQuery = ref('')
const teamDirectoryPhotoOptions = computed(() => {
  const options = new Map()
  for (const group of contentDraft.value.teamDirectory || []) {
    for (const member of group.members || []) {
      if (!member.photoKey || options.has(member.photoKey)) continue
      options.set(member.photoKey, [member.name, member.role].filter(Boolean).join(' · ') || 'عکس همکار')
    }
  }
  return Array.from(options, ([key, label]) => ({ key, label }))
})
const serviceOptions = computed(() => [...new Set([
  ...(contentDraft.value.serviceGroups || []).flatMap((group) => group.items || []),
  ...(contentDraft.value.additionalServices || []),
].filter(Boolean))])
function projectImages(record) {
  return [...new Set([...(record?.images || []), ...(record?.timeline || []).map((event) => event.image)].filter(Boolean))]
}
const exampleProjectOptions = computed(() => props.projects
  .filter((record) => record.adminStatus !== 'draft')
  .map((record) => ({
    key: projectKey(record),
    record,
    images: projectImages(record),
    label: [record.code || `پروژه ${record.id}`, record.type, record.usage].filter(Boolean).join(' · '),
    searchText: normalizeServicePickerSearch([record.code, record.id, record.type, record.usage].filter(Boolean).join(' ')),
  }))
  .filter((item) => item.images.length))
const serviceExampleProjectSearch = ref('')
const serviceExampleProjectLimit = ref(36)
const filteredExampleProjectOptions = computed(() => {
  const query = normalizeServicePickerSearch(serviceExampleProjectSearch.value)
  return query ? exampleProjectOptions.value.filter((item) => item.searchText.includes(query)) : exampleProjectOptions.value
})
const visibleExampleProjectOptions = computed(() => {
  const visible = filteredExampleProjectOptions.value.slice(0, serviceExampleProjectLimit.value)
  const selected = exampleProjectOptions.value.find((item) => item.key === serviceExampleProjectKey.value)
  return selected && !visible.some((item) => item.key === selected.key) ? [selected, ...visible] : visible
})
const serviceExampleProjectKey = ref('')
const serviceExampleImage = ref('')
const serviceExampleService = ref('')
const serviceExampleSearch = ref('')
const serviceExampleImageLimit = ref(18)
const selectedExampleProject = computed(() => exampleProjectOptions.value.find((item) => item.key === serviceExampleProjectKey.value) || null)
const selectedExampleImageOptions = computed(() => {
  const project = selectedExampleProject.value
  if (!project) return []
  const latestEventByImage = new Map()
  for (const event of project.record.timeline || []) {
    if (!event.image) continue
    const current = latestEventByImage.get(event.image)
    if (!current || (Date.parse(event.date) || 0) > (Date.parse(current.date) || 0)) latestEventByImage.set(event.image, event)
  }
  return project.images.map((image, index) => {
    const event = latestEventByImage.get(image)
    return {
      image,
      number: index + 1,
      date: event?.date || project.record.updatedAt || '',
      title: event?.title || '',
    }
  }).sort((left, right) => (Date.parse(right.date) || 0) - (Date.parse(left.date) || 0) || right.number - left.number)
})
const filteredExampleImageOptions = computed(() => {
  const query = serviceExampleSearch.value.trim().toLocaleLowerCase('fa-IR').replaceAll('ي', 'ی').replaceAll('ك', 'ک')
  if (!query) return selectedExampleImageOptions.value
  return selectedExampleImageOptions.value.filter((item) => `${item.title} ${item.date} ${item.number}`.toLocaleLowerCase('fa-IR').replaceAll('ي', 'ی').replaceAll('ك', 'ک').includes(query))
})
const visibleExampleImageOptions = computed(() => filteredExampleImageOptions.value.slice(0, serviceExampleImageLimit.value))
const savedServiceExamples = computed(() => (contentDraft.value.serviceExamples || []).map((item, index) => ({
  ...item,
  index,
  project: exampleProjectOptions.value.find((project) => project.key === item.projectKey) || null,
})))
const serviceEvidenceEntries = computed(() => {
  const publicProjects = props.projects.filter((record) => record.adminStatus !== 'draft')
  return serviceOptions.value.map((service) => {
    const hasArchiveEvidence = findServiceEvidence(service, publicProjects).length > 0
    const hasCompanySelection = (contentDraft.value.serviceExamples || []).some((item) => {
      if (item.service !== service) return false
      const project = exampleProjectOptions.value.find((option) => option.key === item.projectKey)
      return Boolean(project?.images.includes(item.image))
    })
    return { service, hasArchiveEvidence, hasCompanySelection, hasExample: hasArchiveEvidence || hasCompanySelection }
  })
})
const servicesAwaitingSelection = computed(() => serviceEvidenceEntries.value.filter((item) => !item.hasExample).map((item) => item.service))
const serviceEvidenceCoverage = computed(() => ({
  total: serviceEvidenceEntries.value.length,
  withExamples: serviceEvidenceEntries.value.filter((item) => item.hasExample).length,
  awaitingSelection: servicesAwaitingSelection.value.length,
}))
function chooseServiceExample(service) {
  if (!serviceOptions.value.includes(service)) return
  serviceExampleService.value = service
  serviceExampleProjectKey.value = ''
  serviceExampleImage.value = ''
  serviceExampleProjectSearch.value = ''
}
watch(serviceExampleProjectKey, () => {
  serviceExampleImage.value = ''
  serviceExampleSearch.value = ''
  serviceExampleImageLimit.value = 18
  serviceExampleProjectSearch.value = ''
})
watch(serviceExampleSearch, () => { serviceExampleImageLimit.value = 18 })
watch(serviceExampleProjectSearch, () => { serviceExampleProjectLimit.value = 36 })

function normalizeServicePickerSearch(value) {
  return String(value ?? '').toLocaleLowerCase('fa-IR').replaceAll('ي', 'ی').replaceAll('ك', 'ک').replace(/\s+/g, ' ').trim()
}

function copy(value) {
  return JSON.parse(JSON.stringify(value))
}

const projectKey = (record) => props.projectAdminKey(record)
const rows = computed(() => section.value === 'projects' ? props.projects : props.articles)
const sourceCounts = computed(() => ({
  all: props.projects.length,
  company: countDocumentedProjectRecords(props.projects),
  linked: props.projects.filter(isCodedTelegramProject).length,
  independent: props.projects.filter(isIndependentProjectReport).length,
}))
const publicProjectRecords = computed(() => props.projects.filter((record) => record.adminStatus !== 'draft'))
const publicArchiveCounts = computed(() => ({
  documented: countDocumentedProjectRecords(publicProjectRecords.value),
  previousSite: publicProjectRecords.value.filter((record) => !record.source).length,
  manual: publicProjectRecords.value.filter((record) => record.source === 'manual').length,
  codedTelegram: publicProjectRecords.value.filter(isCodedTelegramProject).length,
  independentReports: publicProjectRecords.value.filter((record) => record.source === 'telegram-report').length,
  uncodedPhotoEntries: publicProjectRecords.value.filter((record) => record.source === 'field-reports' && !isCodedTelegramProject(record)).length,
}))
const filteredRecords = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('fa-IR')
  return rows.value.filter((record) => {
    if (section.value === 'projects') {
      if (projectSource.value === 'company' && !isDocumentedCompanyProject(record)) return false
      if (projectSource.value === 'linked' && !isCodedTelegramProject(record)) return false
      if (projectSource.value === 'independent' && !isIndependentProjectReport(record)) return false
    }
    if (!query) return true
    const text = section.value === 'projects'
      ? [record.code, record.id, record.type, record.address, record.usage, record.description, ...(record.services || []), ...(record.tags || [])].join(' ')
      : [record.id, record.title, record.type, record.date, record.excerpt].join(' ')
    return text.toLocaleLowerCase('fa-IR').includes(query)
  })
})
const visibleRecords = computed(() => filteredRecords.value.slice(0, visibleLimit.value))
const selectedRecord = computed(() => rows.value.find((record) => keyFor(record) === selectedKey.value) || null)
const selectedBaseRecord = computed(() => {
  if (!selectedRecord.value) return null
  const source = section.value === 'projects' ? props.baseProjects : props.baseArticles
  return source.find((record) => keyFor(record) === selectedKey.value) || null
})
const selectedArticleDetail = computed(() => {
  if (section.value !== 'articles' || !selectedRecord.value) return null
  return props.articleDetails.find((record) => String(record.id) === String(selectedRecord.value.id))
    || { id: selectedRecord.value.id, sourcePage: selectedRecord.value.path, paragraphs: [], files: [], contentStatus: 'empty' }
})
const draftCount = computed(() => [...props.projects, ...props.articles].filter((record) => record.adminStatus === 'draft').length)
const pageMetrics = computed(() => [
  { label: 'سوابق و گروه‌های پروژه', value: publicArchiveCounts.value.documented, note: `${publicArchiveCounts.value.previousSite.toLocaleString('fa-IR')} رکورد سایت پیشین + ${publicArchiveCounts.value.codedTelegram.toLocaleString('fa-IR')} گروه کددار${publicArchiveCounts.value.manual ? ` + ${publicArchiveCounts.value.manual.toLocaleString('fa-IR')} رکورد دستی` : ''}` },
  { label: 'گزارش‌های مستقل و بدون کد', value: publicArchiveCounts.value.independentReports + publicArchiveCounts.value.uncodedPhotoEntries, note: `${publicArchiveCounts.value.independentReports.toLocaleString('fa-IR')} گزارش مستقل + ${publicArchiveCounts.value.uncodedPhotoEntries.toLocaleString('fa-IR')} ورودی بدون کد` },
  { label: 'مقاله', value: props.articles.length },
  { label: 'پیش‌نویس', value: draftCount.value },
])
const trashItems = computed(() => {
  const list = []
  for (const key of props.overrides.projects.deleted || []) {
    const base = props.baseProjects.find((record) => projectKey(record) === String(key))
    if (base) list.push({ collection: 'projects', key: String(key), label: base.code || `G-${base.id}`, detail: base.address })
  }
  for (const key of props.overrides.articles.deleted || []) {
    const base = props.baseArticles.find((record) => String(record.id) === String(key))
    if (base) list.push({ collection: 'articles', key: String(key), label: base.title || `مقاله ${base.id}`, detail: 'مقاله' })
  }
  for (const key of props.overrides.articleDetails.deleted || []) {
    const base = props.baseArticleDetails.find((record) => String(record.id) === String(key))
    if (base) list.push({ collection: 'articleDetails', key: String(key), label: `محتوای مقاله ${base.id}`, detail: 'متن و پیوست‌ها' })
  }
  return list
})
const filteredFeedback = computed(() => {
  const query = feedbackQuery.value.trim().toLocaleLowerCase('fa-IR')
  return [...props.feedback].reverse().filter((entry) => !query || [entry.name, entry.subject, entry.details].join(' ').toLocaleLowerCase('fa-IR').includes(query))
})
const filteredContactRequests = computed(() => {
  const query = contactRequestsQuery.value.trim().toLocaleLowerCase('fa-IR')
  return props.contactRequests.filter((entry) => !query || [entry.name, entry.phone, entry.service, entry.details].join(' ').toLocaleLowerCase('fa-IR').includes(query))
})
const contentTextFields = computed(() => [
  { path: ['company', 'name'], label: 'نام نمایشی مجموعه', multiline: false },
  { path: ['company', 'shortName'], label: 'نام کوتاه', multiline: false },
  { path: ['company', 'descriptor'], label: 'عنوان انگلیسی', multiline: false },
  { path: ['company', 'tagline'], label: 'شعار', multiline: false },
  { path: ['company', 'positioning'], label: 'معرفی کوتاه خدمات', multiline: false },
  { path: ['company', 'intro'], label: 'معرفی مجموعه', multiline: true },
  { path: ['company', 'instagram'], label: 'پیوند اینستاگرام', multiline: false },
  { path: ['company', 'officePhone'], label: 'شمارهٔ تلفن دفتر', multiline: false },
  { path: ['company', 'directPhone'], label: 'شمارهٔ مستقیم شرکت (تماس و واتساپ)', multiline: false },
  { path: ['company', 'officeAddress'], label: 'نشانی دفتر مرکزی', multiline: true },
  { path: ['mission'], label: 'ماموریت', multiline: true },
  { path: ['vision'], label: 'چشم‌انداز', multiline: true },
])

function keyFor(record) {
  return section.value === 'projects' ? projectKey(record) : String(record.id)
}

function titleFor(record) {
  if (section.value === 'projects') return record.code || `G-${record.id}`
  return record.title || `مقاله ${record.id}`
}

function sourceLabel(record) {
  if (record.adminStatus === 'draft') return 'پیش‌نویس'
  if (record.source === 'telegram-report') return 'گزارش مستقل'
  if (record.source === 'field-reports') return 'پروژهٔ کارگاهی'
  return section.value === 'projects' ? 'پروژهٔ شرکت' : record.type || 'مقاله'
}

function setStatus(message) {
  successMessage.value = message
  errorMessage.value = ''
  window.setTimeout(() => { if (successMessage.value === message) successMessage.value = '' }, 4500)
}

function setError(error) {
  errorMessage.value = error?.message || 'عملیات انجام نشد. دوباره تلاش کنید.'
  successMessage.value = ''
}

function selectSection(next) {
  if (next === section.value) return
  if (dirty.value && !window.confirm('تغییرهای ذخیره‌نشده دور ریخته شوند؟')) return
  if (['site', 'media'].includes(section.value) && dirty.value) {
    contentDraft.value = copy(props.siteContent)
    contentRaw.value = JSON.stringify(props.siteContent, null, 2)
    contentRawMode.value = false
  }
  section.value = next
  selectedKey.value = ''
  search.value = ''
  feedbackQuery.value = ''
  contactRequestsQuery.value = ''
  visibleLimit.value = 50
  dirty.value = false
  contentRawMode.value = false
  errorMessage.value = ''
  successMessage.value = ''
}

function selectRecord(key) {
  if (key === selectedKey.value) return
  if (dirty.value && !window.confirm('تغییرهای ذخیره‌نشده دور ریخته شوند؟')) return
  selectedKey.value = key
  dirty.value = false
  errorMessage.value = ''
}

function selectProjectSource(next) {
  if (next === projectSource.value) return
  if (dirty.value && !window.confirm('تغییرهای ذخیره‌نشده دور ریخته شوند؟')) return
  projectSource.value = next
  selectedKey.value = ''
  dirty.value = false
}

watch([section, filteredRecords], () => {
  if (!['projects', 'articles'].includes(section.value)) return
  if (!filteredRecords.value.some((record) => keyFor(record) === selectedKey.value)) {
    selectedKey.value = filteredRecords.value[0] ? keyFor(filteredRecords.value[0]) : ''
    dirty.value = false
  }
  visibleLimit.value = 50
}, { immediate: true })

watch(() => props.siteContent, (value) => {
  if (!dirty.value) contentDraft.value = copy(value)
}, { deep: true })

function maxId(records) {
  return Math.max(0, ...records.map((record) => Number(record.id) || 0))
}

async function addRecord() {
  if (dirty.value && !window.confirm('تغییرهای ذخیره‌نشده دور ریخته شوند؟')) return
  if (section.value === 'projects') projectSource.value = 'company'
  const id = maxId(section.value === 'projects' ? props.projects : props.articles) + 1
  if (section.value === 'projects') {
    const record = {
      id,
      code: `P-${String(id).padStart(3, '0')}`,
      source: 'manual',
      adminStatus: 'draft',
      status: 'history',
      type: 'نظارت',
      address: '',
      usage: 'مسکونی',
      description: '',
      tags: [],
      services: ['نظارت'],
      updatedAt: '',
      timeline: [],
      images: [],
      finalImage: null,
    }
    const collection = { ...(props.overrides.projects || {}) }
    collection.added = [...(collection.added || []), record]
    const next = copy(props.overrides)
    next.projects = collection
    await commit(next, 'پیش‌نویس پروژه ساخته شد؛ آن را تکمیل کنید.')
    selectedKey.value = projectKey(record)
  } else if (section.value === 'articles') {
    const record = { id, adminStatus: 'draft', type: 'خبر', title: 'مقالهٔ جدید', author: '', date: '', excerpt: '', path: '', image: '' }
    const collection = { ...(props.overrides.articles || {}) }
    collection.added = [...(collection.added || []), record]
    const next = copy(props.overrides)
    next.articles = collection
    await commit(next, 'پیش‌نویس مقاله ساخته شد؛ آن را تکمیل کنید.')
    selectedKey.value = String(record.id)
  }
}

async function commit(next, message) {
  busy.value = true
  errorMessage.value = ''
  try {
    await props.saveOverrides(next)
    dirty.value = false
    setStatus(message)
    return true
  } catch (error) {
    setError(error)
    return false
  } finally {
    busy.value = false
  }
}

async function createTelegramDraft(item) {
  if (!item?.recordKey || (!item.text && !item.photoUrls?.length)) throw new Error('این پیام متن یا عکسی برای پیش‌نویس ندارد.')
  const id = maxId(props.projects) + 1
  const record = {
    id,
    code: '',
    source: 'telegram-report',
    adminStatus: 'draft',
    status: 'history',
    type: 'گزارش تصویری',
    address: '',
    usage: 'ثبت‌نشده',
    description: 'پیش‌نویس خصوصی از گزارش تلگرام؛ متن و جزئیات منبع در صندوق خصوصی تلگرام بررسی شود.',
    tags: [],
    services: [],
    updatedAt: item.editedAt || item.date || new Date().toISOString(),
    timeline: (item.photoUrls || []).map((image) => ({
      date: item.editedAt || item.date || new Date().toISOString(),
      title: 'گزارش از تلگرام',
      summary: '',
      focus: '',
      image,
      status: 'logged',
    })),
    images: item.photoUrls || [],
    finalImage: null,
  }
  const next = copy(props.overrides)
  const collection = { ...(next.projects || {}) }
  collection.added = [...(collection.added || []), record]
  next.projects = collection
  const saved = await commit(next, 'پیش‌نویس گزارش تلگرام به پروژه‌ها افزوده شد؛ انتشار آن همچنان جداگانه است.')
  if (!saved) return null
  const response = await fetch('/api/admin/telegram-inbox/link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recordKey: item.recordKey, projectId: id }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'پیوند پیش‌نویس به گزارش تلگرام ذخیره نشد.')
  return id
}

function openTelegramDraft(id) {
  section.value = 'projects'
  projectSource.value = 'all'
  search.value = ''
  selectedKey.value = `telegram-report:${id}`
  dirty.value = false
  errorMessage.value = ''
  successMessage.value = ''
}

async function saveRecord(editedRecord) {
  if (!selectedRecord.value) return
  const isProject = section.value === 'projects'
  const recordKey = keyFor(selectedRecord.value)
  const base = selectedBaseRecord.value
  if (editedRecord.id !== selectedRecord.value.id) return setError(new Error('شناسهٔ رکورد قابل‌تغییر نیست.'))
  if (isProject && editedRecord.source !== selectedRecord.value.source) return setError(new Error('منبع رکورد قابل‌تغییر نیست.'))
  const next = copy(props.overrides)
  next[section.value] = setCollectionRecord(next[section.value], recordKey, base || selectedRecord.value, editedRecord, !base)
  await commit(next, 'اطلاعات رکورد ذخیره شد.')
}

async function saveArticleDetails(edited) {
  if (!selectedRecord.value || edited.id !== selectedRecord.value.id) return setError(new Error('شناسهٔ مقاله قابل‌تغییر نیست.'))
  const key = String(edited.id)
  const base = props.baseArticleDetails.find((item) => String(item.id) === key) || null
  const next = copy(props.overrides)
  next.articleDetails = setCollectionRecord(next.articleDetails, key, base || edited, edited, !base)
  await commit(next, 'متن و پیوست‌های مقاله ذخیره شد.')
}

function setContentValue(path, value) {
  const next = copy(contentDraft.value)
  let target = next
  for (const key of path.slice(0, -1)) target = target[key]
  target[path[path.length - 1]] = value
  contentDraft.value = next
  dirty.value = true
}

function addServiceGroup() {
  const groups = [...(contentDraft.value.serviceGroups || [])]
  const index = groups.length + 1
  groups.push({
    id: `service-${Date.now()}`,
    number: String(index).padStart(2, '0').replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[digit]),
    title: 'دستهٔ جدید',
    english: 'NEW SERVICE',
    description: '',
    items: [],
  })
  setContentValue(['serviceGroups'], groups)
}

function removeServiceGroup(index) {
  const group = contentDraft.value.serviceGroups?.[index]
  if (!group || !window.confirm(`دستهٔ «${group.title || 'بدون عنوان'}» از فهرست خدمات برداشته شود؟`)) return
  setContentValue(['serviceGroups'], contentDraft.value.serviceGroups.filter((_, itemIndex) => itemIndex !== index))
}

function addServiceItem(groupIndex) {
  const groups = copy(contentDraft.value.serviceGroups || [])
  groups[groupIndex].items.push('خدمت تازه')
  setContentValue(['serviceGroups'], groups)
}

function updateServiceItem(groupIndex, itemIndex, value) {
  setContentValue(['serviceGroups', groupIndex, 'items', itemIndex], value)
}

function removeServiceItem(groupIndex, itemIndex) {
  const groups = copy(contentDraft.value.serviceGroups || [])
  groups[groupIndex].items.splice(itemIndex, 1)
  setContentValue(['serviceGroups'], groups)
}

function addAdditionalService() {
  setContentValue(['additionalServices'], [...(contentDraft.value.additionalServices || []), 'خدمت تکمیلی تازه'])
}

function updateAdditionalService(index, value) {
  setContentValue(['additionalServices', index], value)
}

function removeAdditionalService(index) {
  setContentValue(['additionalServices'], (contentDraft.value.additionalServices || []).filter((_, itemIndex) => itemIndex !== index))
}

function addServiceExample() {
  if (!serviceExampleService.value || !selectedExampleProject.value || !serviceExampleImage.value) {
    setError(new Error('خدمت، پروژه و تصویر را انتخاب کنید.'))
    return
  }
  const examples = copy(contentDraft.value.serviceExamples || [])
  if (examples.some((item) => item.service === serviceExampleService.value && item.projectKey === serviceExampleProjectKey.value && item.image === serviceExampleImage.value)) {
    setError(new Error('این تصویر قبلاً برای همین خدمت انتخاب شده است.'))
    return
  }
  examples.push({
    id: `service-example-${Date.now()}`,
    service: serviceExampleService.value,
    projectKey: serviceExampleProjectKey.value,
    image: serviceExampleImage.value,
  })
  setContentValue(['serviceExamples'], examples)
  errorMessage.value = ''
  successMessage.value = 'نمونه به فهرست تغییرهای ذخیره‌نشده افزوده شد.'
}

function exampleImageDate(value) {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeZone: 'Asia/Tehran' }).format(date)
}

function updateServiceExample(index, field, value) {
  const examples = copy(contentDraft.value.serviceExamples || [])
  const item = examples[index]
  if (!item) return
  if (field === 'projectKey') {
    const project = exampleProjectOptions.value.find((option) => option.key === value)
    item.projectKey = value
    item.image = project?.images[0] || ''
  } else if (field === 'image') {
    const project = exampleProjectOptions.value.find((option) => option.key === item.projectKey)
    if (!project?.images.includes(value)) return
    item.image = value
  } else if (field === 'service' && serviceOptions.value.includes(value)) {
    item.service = value
  } else return
  setContentValue(['serviceExamples'], examples)
}

function removeServiceExample(index) {
  setContentValue(['serviceExamples'], (contentDraft.value.serviceExamples || []).filter((_, itemIndex) => itemIndex !== index))
}

function addTeamResponsibility() {
  const roles = copy(contentDraft.value.teamResponsibilities || [])
  const number = roles.length + 5
  roles.push({
    id: `team-role-${Date.now()}`,
    number: String(number).padStart(2, '0').replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[digit]),
    title: 'حوزهٔ کاری تازه',
    english: 'NEW RESPONSIBILITY',
    description: '',
    responsibilities: [],
  })
  setContentValue(['teamResponsibilities'], roles)
}

function removeTeamResponsibility(index) {
  const role = contentDraft.value.teamResponsibilities?.[index]
  if (!role || !window.confirm(`حوزهٔ «${role.title || 'بدون عنوان'}» از صفحهٔ درباره برداشته شود؟`)) return
  setContentValue(['teamResponsibilities'], contentDraft.value.teamResponsibilities.filter((_, itemIndex) => itemIndex !== index))
}

function addTeamDuty(index) {
  const roles = copy(contentDraft.value.teamResponsibilities || [])
  roles[index].responsibilities = [...(roles[index].responsibilities || []), 'مسئولیت تازه']
  setContentValue(['teamResponsibilities'], roles)
}

function removeTeamDuty(roleIndex, dutyIndex) {
  const roles = copy(contentDraft.value.teamResponsibilities || [])
  roles[roleIndex].responsibilities.splice(dutyIndex, 1)
  setContentValue(['teamResponsibilities'], roles)
}

function updateDirectoryMember(groupIndex, memberIndex, field, value) {
  setContentValue(['teamDirectory', groupIndex, 'members', memberIndex, field], value)
}

function addDirectoryMember(groupIndex) {
  const groups = copy(contentDraft.value.teamDirectory || [])
  groups[groupIndex].members = [...(groups[groupIndex].members || []), {
    id: `directory-role-${Date.now()}`,
    name: '',
    role: 'سمت تازه',
    photoKey: '',
  }]
  setContentValue(['teamDirectory'], groups)
}

function removeDirectoryMember(groupIndex, memberIndex) {
  const member = contentDraft.value.teamDirectory?.[groupIndex]?.members?.[memberIndex]
  const label = member?.name ? `${member.name} · ${member.role || 'بدون عنوان'}` : member?.role || 'همکار بدون نام'
  if (!member || !window.confirm(`«${label}» از معرفی عمومی تیم برداشته شود؟`)) return
  const groups = copy(contentDraft.value.teamDirectory || [])
  groups[groupIndex].members.splice(memberIndex, 1)
  setContentValue(['teamDirectory'], groups)
}

function moveDirectoryMember(groupIndex, memberIndex, offset) {
  const groups = copy(contentDraft.value.teamDirectory || [])
  const members = groups[groupIndex]?.members || []
  const targetIndex = memberIndex + offset
  if (targetIndex < 0 || targetIndex >= members.length) return
  ;[members[memberIndex], members[targetIndex]] = [members[targetIndex], members[memberIndex]]
  setContentValue(['teamDirectory'], groups)
}

function moveDirectoryGroup(groupIndex, offset) {
  const groups = copy(contentDraft.value.teamDirectory || [])
  const targetIndex = groupIndex + offset
  if (targetIndex < 0 || targetIndex >= groups.length) return
  ;[groups[groupIndex], groups[targetIndex]] = [groups[targetIndex], groups[groupIndex]]
  setContentValue(['teamDirectory'], groups)
}

function quickCount(id) {
  if (id === 'projects') return props.projects.length.toLocaleString('fa-IR')
  if (id === 'articles') return props.articles.length.toLocaleString('fa-IR')
  if (id === 'feedback') return props.feedback.length.toLocaleString('fa-IR')
  if (id === 'contact-requests') return props.contactRequests.length.toLocaleString('fa-IR')
  if (id === 'trash') return trashItems.value.length.toLocaleString('fa-IR')
  if (id === 'site') return `${contentDraft.value.serviceGroups?.length || 0} دستهٔ خدمت`
  return ''
}

function toggleContentRaw() {
  errorMessage.value = ''
  if (!contentRawMode.value) {
    contentRaw.value = JSON.stringify(contentDraft.value, null, 2)
    contentRawMode.value = true
    return
  }
  try {
    const value = JSON.parse(contentRaw.value)
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('object')
    contentDraft.value = value
    contentRawMode.value = false
    dirty.value = true
  } catch {
    setError(new Error('JSON اطلاعات سایت معتبر نیست.'))
  }
}

async function saveSiteContent() {
  try {
    const edited = contentRawMode.value ? JSON.parse(contentRaw.value) : contentDraft.value
    if (!edited || typeof edited !== 'object' || Array.isArray(edited)) throw new Error('اطلاعات سایت باید یک شیء معتبر باشد.')
    const next = copy(props.overrides)
    next.siteContent = createAdminPatch(props.baseSiteContent, edited)
    await commit(next, 'اطلاعات و خدمات سایت ذخیره شد.')
  } catch (error) {
    setError(error)
  }
}

async function deleteSelected() {
  if (!selectedRecord.value) return
  const label = titleFor(selectedRecord.value)
  if (!window.confirm(`«${label}» از نمایش عمومی سایت حذف شود؟ امکان بازگردانی از بخش حذف‌شده‌ها یا آخرین نسخهٔ ذخیره‌شده وجود دارد.`)) return
  const key = keyFor(selectedRecord.value)
  const next = copy(props.overrides)
  next[section.value] = deleteCollectionRecord(next[section.value], selectedRecord.value, key)
  await commit(next, 'رکورد از نمایش عمومی حذف شد.')
  selectedKey.value = ''
}

async function restoreTrashItem(item) {
  const next = copy(props.overrides)
  next[item.collection].deleted = (next[item.collection].deleted || []).filter((key) => String(key) !== item.key)
  await commit(next, 'رکورد به سایت بازگردانده شد.')
}

async function undoLastSave() {
  if (!window.confirm('آخرین ذخیره با نسخهٔ قبل از آن جایگزین شود؟')) return
  busy.value = true
  errorMessage.value = ''
  try {
    await props.restoreLast()
    dirty.value = false
    setStatus('آخرین ذخیره بازگردانده شد.')
  } catch (error) {
    setError(error)
  } finally {
    busy.value = false
  }
}

async function removeFeedback(index) {
  if (!window.confirm('این بازخورد محلی حذف شود؟')) return
  const next = [...props.feedback]
  next.splice(index, 1)
  busy.value = true
  try {
    await props.saveFeedback(next)
    setStatus('بازخورد حذف شد.')
  } catch (error) {
    setError(error)
  } finally {
    busy.value = false
  }
}

async function markContactRequestContacted(entry) {
  const next = props.contactRequests.map((item) => item.id === entry.id ? { ...item, status: 'contacted' } : item)
  busy.value = true
  try {
    await props.saveContactRequests(next)
    setStatus('وضعیت درخواست به‌روز شد.')
  } catch (error) {
    setError(error)
  } finally {
    busy.value = false
  }
}

async function removeContactRequest(entry) {
  if (!window.confirm('این درخواست تماس از رایانه حذف شود؟')) return
  const next = props.contactRequests.filter((item) => item.id !== entry.id)
  busy.value = true
  try {
    await props.saveContactRequests(next)
    setStatus('درخواست تماس حذف شد.')
  } catch (error) {
    setError(error)
  } finally {
    busy.value = false
  }
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(date)
}
</script>

<template>
  <div class="admin-page page-container">
    <header class="admin-page-head">
      <div>
        <div class="admin-eyebrow">مدیریت محلی <span dir="ltr">/ ARCPOL CONTENT</span></div>
        <h1>پنل مدیریت سایت</h1>
        <p>ویرایش پروژه‌ها، گزارش‌ها، مقاله‌ها و محتوای سایت؛ تغییرها فقط با ذخیرهٔ شما ثبت می‌شوند.</p>
      </div>
      <div class="admin-head-actions">
        <span class="local-badge" :class="enabled ? 'is-enabled' : 'is-disabled'">{{ enabled ? 'فقط روی همین رایانه' : 'پنل محلی در دسترس نیست' }}</span>
        <span v-if="enabled" class="local-badge is-enabled">{{ storage === 'mariadb' ? 'ذخیره‌سازی MariaDB' : 'ذخیره‌سازی JSON محلی' }}</span>
        <a class="admin-button admin-button-secondary" href="/">بازگشت به سایت</a>
        <button class="admin-button admin-button-secondary" type="button" :disabled="!enabled || !hasBackup || busy" @click="undoLastSave">بازگردانی آخرین ذخیره</button>
      </div>
    </header>

    <div v-if="!enabled" class="admin-offline" role="status">
      <h2>پنل فقط روی نسخهٔ محلی فعال است</h2>
      <p>این صفحه در نسخهٔ عمومی امکان ویرایش ندارد. سایت را با پیش‌نمایش توسعهٔ محلی باز کنید تا ذخیره‌سازی و پشتیبان‌گیری فعال شود.</p>
      <a class="admin-button admin-button-primary" href="/">رفتن به صفحهٔ اصلی</a>
    </div>

    <template v-else>
      <section class="admin-metrics" aria-label="نمای کلی اطلاعات سایت">
        <div v-for="metric in pageMetrics" :key="metric.label"><span>{{ metric.label }}</span><strong>{{ metric.value.toLocaleString('fa-IR') }}</strong><small v-if="metric.note">{{ metric.note }}</small></div>
      </section>

      <div v-if="successMessage" class="admin-notice" role="status">{{ successMessage }}</div>
      <div v-if="errorMessage" class="admin-error" role="alert">{{ errorMessage }}</div>

      <div class="admin-workspace">
        <nav class="admin-sidebar" aria-label="بخش‌های مدیریت">
          <button v-for="item in sections" :key="item.id" type="button" :class="{ active: section === item.id }" :aria-pressed="section === item.id" @click="selectSection(item.id)">
            <span>{{ item.label }}</span>
            <small v-if="item.id === 'overview'">شروع</small>
            <small v-if="item.id === 'projects'">{{ projects.length.toLocaleString('fa-IR') }}</small>
            <small v-else-if="item.id === 'telegram-inbox'">LIVE</small>
            <small v-else-if="item.id === 'articles'">{{ articles.length.toLocaleString('fa-IR') }}</small>
            <small v-else-if="item.id === 'contact-requests'">{{ contactRequests.length.toLocaleString('fa-IR') }}</small>
            <small v-else-if="item.id === 'feedback'">{{ feedback.length.toLocaleString('fa-IR') }}</small>
            <small v-else-if="item.id === 'trash'">{{ trashItems.length.toLocaleString('fa-IR') }}</small>
          </button>
          <p class="admin-sidebar-note">پروژه‌های حذف‌شده به‌صورت پنهان نگهداری می‌شوند تا بتوانید آن‌ها را بازگردانید.</p>
        </nav>

        <section v-if="section === 'overview'" class="admin-overview">
          <div class="record-list-head">
            <div><span class="admin-eyebrow">دسترسی سریع</span><h2>از کجا شروع کنیم؟</h2><p>سوابق پروژه و گروه‌های کددار را از گزارش‌های مستقل یا بدون کد جدا فیلتر کن.</p></div>
          </div>
          <div class="admin-quick-links">
            <button v-for="item in quickLinks" :key="item.id" class="admin-quick-card" type="button" @click="selectSection(item.id)">
              <span class="quick-card-number" dir="ltr">{{ item.number }}</span>
              <strong>{{ item.title }}</strong>
              <small>{{ item.detail }}</small>
              <span class="quick-card-meta">{{ quickCount(item.id) }} <span aria-hidden="true">↗</span></span>
            </button>
          </div>
          <div class="admin-overview-note"><span class="note-icon" aria-hidden="true">i</span><p>پیش از جابه‌جایی، تغییرهای ذخیره‌نشده تأیید می‌شوند. هر ذخیره پشتیبان می‌سازد و آخرین ذخیره از بالای پنل قابل‌بازگردانی است.</p></div>
        </section>

        <section v-else-if="['projects', 'articles'].includes(section)" class="admin-records">
          <div class="record-list-head">
            <div><span class="admin-eyebrow">{{ section === 'projects' ? 'آرشیو تصویری' : 'دانش فنی' }}</span><h2>{{ section === 'projects' ? 'پروژه‌ها و گزارش‌ها' : 'مقاله‌ها' }}</h2></div>
            <button class="admin-button admin-button-primary" type="button" :disabled="busy" @click="addRecord">{{ section === 'projects' ? 'پروژهٔ جدید' : 'مقالهٔ جدید' }}</button>
          </div>

          <div v-if="section === 'projects'" class="source-filter" aria-label="فیلتر نوع رکورد">
            <button v-for="filter in [{id:'all',label:'همهٔ رکوردها'}, {id:'company',label:'سوابق و گروه‌های پروژه'}, {id:'linked',label:'گروه‌های کددار تلگرام'}, {id:'independent',label:'گزارش‌های مستقل/بدون کد'}]" :key="filter.id" type="button" :aria-pressed="projectSource === filter.id" @click="selectProjectSource(filter.id)">{{ filter.label }} <small>{{ sourceCounts[filter.id].toLocaleString('fa-IR') }}</small></button>
          </div>

          <label class="admin-search"><span class="sr-only">جست‌وجو میان رکوردها</span><input v-model="search" type="search" placeholder="جست‌وجو با کد، عنوان، منطقه یا خدمت"><span aria-hidden="true">⌕</span></label>

          <div class="record-list" aria-label="فهرست رکوردها">
            <button v-for="record in visibleRecords" :key="keyFor(record)" type="button" class="record-row" :class="{ selected: selectedKey === keyFor(record) }" :aria-pressed="selectedKey === keyFor(record)" @click="selectRecord(keyFor(record))">
              <span class="record-row-main"><strong>{{ titleFor(record) }}</strong><small>{{ section === 'projects' ? `${record.address || 'موقعیت ثبت نشده'} · ${record.usage || 'کاربری ثبت نشده'}` : `${record.date || 'بدون تاریخ'} · ${record.type || 'مقاله'}` }}</small></span>
              <span class="record-row-tag" :class="{ draft: record.adminStatus === 'draft' }">{{ sourceLabel(record) }}</span>
            </button>
            <p v-if="!visibleRecords.length" class="admin-empty-note">موردی پیدا نشد.</p>
          </div>
          <button v-if="visibleRecords.length < filteredRecords.length" class="admin-button admin-button-secondary show-more" type="button" @click="visibleLimit += 50">نمایش موارد بیشتر</button>
        </section>

        <section v-if="['projects', 'articles'].includes(section)" class="admin-editor-pane">
          <AdminRecordEditor
            v-if="selectedRecord"
            :key="`${section}:${selectedKey}`"
            :kind="section"
            :record="selectedRecord"
            :article-details="selectedArticleDetail"
            :upload-image="uploadImage"
            @save="saveRecord"
            @delete="deleteSelected"
            @save-article-details="saveArticleDetails"
            @dirty-change="dirty = $event"
          />
          <div v-else class="admin-empty-editor"><span>انتخاب رکورد</span><p>از فهرست کناری یک مورد را انتخاب کنید یا یک مورد تازه بسازید.</p></div>
        </section>

        <TelegramProjectInbox
          v-else-if="section === 'telegram-inbox'"
          :projects="projects"
          :create-draft="createTelegramDraft"
          :open-draft="openTelegramDraft"
        />

        <section v-else-if="section === 'site'" class="admin-site-content">
          <div class="record-list-head">
            <div><span class="admin-eyebrow">محتوای قابل‌ویرایش</span><h2>اطلاعات و خدمات سایت</h2><p>متن‌های معرفی و اطلاعات شرکت را مستقیم ویرایش کنید؛ برای رشته‌ها، اصول و فهرست‌های چندبخشی، ویرایش کامل در دسترس است.</p></div>
            <div class="record-actions"><button class="admin-button admin-button-secondary" type="button" @click="toggleContentRaw">{{ contentRawMode ? 'بازگشت به فرم' : 'ویرایش پیشرفتهٔ داده‌ها' }}</button><button class="admin-button admin-button-primary" type="button" :disabled="busy || !dirty" @click="saveSiteContent">{{ dirty ? 'ذخیرهٔ تغییرها' : 'تغییری برای ذخیره نیست' }}</button></div>
          </div>
          <div v-if="contentRawMode" class="admin-field">
            <label for="admin-site-content-json">همهٔ اطلاعات صفحه‌ها و خدمات <span dir="ltr">JSON</span></label>
            <textarea id="admin-site-content-json" v-model="contentRaw" dir="ltr" rows="32" spellcheck="false"></textarea>
            <p>این ویرایشگر شامل معرفی شرکت، رشته‌ها، مسئولیت‌های تیم، خدمات، مدل‌های همکاری، چشم‌انداز، ماموریت، اصول و معرفی آرشیوی است.</p>
          </div>
          <div v-else>
            <div class="admin-form-grid">
              <label v-for="field in contentTextFields" :key="field.path.join('.')" class="admin-field" :class="{ 'field-wide': field.multiline }">
                {{ field.label }}
                <textarea v-if="field.multiline" :value="field.path.length === 1 ? contentDraft[field.path[0]] : contentDraft[field.path[0]][field.path[1]]" rows="3" @input="setContentValue(field.path, $event.target.value)"></textarea>
                <input v-else :value="contentDraft[field.path[0]][field.path[1]]" :dir="field.path.at(-1) === 'instagram' || field.path.at(-1) === 'shortName' ? 'ltr' : undefined" @input="setContentValue(field.path, $event.target.value)">
              </label>
            </div>
            <div class="content-summary-grid">
              <article><span>رشته‌های اصلی طراحی ساختمان</span><strong>{{ contentDraft.disciplines?.length || 0 }} رشته</strong><small>معماری، سازه، تأسیسات مکانیکی و تأسیسات برقی؛ بخشی از دامنهٔ خدمات شرکت</small></article>
              <article><span>دسته‌های خدمات</span><strong>{{ contentDraft.serviceGroups?.length || 0 }} دسته</strong><small>طراحی، نظارت، اجرا و دامنهٔ کامل خدمات</small></article>
              <article><span>دامنه‌های همکاری</span><strong>{{ contentDraft.engagementModels?.length || 0 }} روش</strong><small>از طراحی مستقل تا پروژهٔ کامل</small></article>
              <article><span>مسئولیت‌های تیم</span><strong>{{ (contentDraft.disciplines?.length || 0) + (contentDraft.teamResponsibilities?.length || 0) }} حوزه</strong><small>قابل‌ویرایش در همین صفحه</small></article>
              <article><span>همکاران معرفی‌شده</span><strong>{{ (contentDraft.teamDirectory || []).reduce((total, group) => total + (group.members || []).length, 0) }} نفر</strong><small>نام، سمت، عکس و ترتیب قابل‌ویرایش</small></article>
            </div>
            <section class="admin-service-editor" aria-labelledby="admin-service-editor-title">
              <div class="admin-subsection-head">
                <div><span class="admin-eyebrow">قابل‌ویرایش و دسته‌بندی‌شده</span><h3 id="admin-service-editor-title">دسته‌های خدمات</h3><p>نام، توضیح و موارد هر دسته را همین‌جا تغییر بده؛ برای تغییرهای معمول نیازی به ویرایش دادهٔ فنی نیست.</p></div>
                <button class="admin-button admin-button-secondary" type="button" @click="addServiceGroup">افزودن دسته</button>
              </div>
              <details v-for="(group, groupIndex) in contentDraft.serviceGroups || []" :key="group.id || groupIndex" class="admin-service-group" :open="groupIndex === 0">
                <summary><span><strong>{{ group.title || 'دستهٔ بدون عنوان' }}</strong><small>{{ (group.items || []).length.toLocaleString('fa-IR') }} خدمت</small></span><span class="admin-details-chevron" aria-hidden="true">⌄</span></summary>
                <div class="admin-service-fields">
                  <div class="admin-form-grid">
                    <label class="admin-field">عنوان دسته<input :value="group.title" @input="setContentValue(['serviceGroups', groupIndex, 'title'], $event.target.value)"></label>
                    <label class="admin-field">عنوان انگلیسی<input :value="group.english" dir="ltr" @input="setContentValue(['serviceGroups', groupIndex, 'english'], $event.target.value)"></label>
                    <label class="admin-field field-wide">توضیح کوتاه<textarea :value="group.description" rows="2" @input="setContentValue(['serviceGroups', groupIndex, 'description'], $event.target.value)"></textarea></label>
                  </div>
                  <div class="admin-service-list-head"><strong>موارد این دسته</strong><button class="admin-button admin-button-secondary" type="button" @click="addServiceItem(groupIndex)">افزودن خدمت</button></div>
                  <div v-for="(item, itemIndex) in group.items || []" :key="`${group.id || groupIndex}:${itemIndex}`" class="admin-service-item-row">
                    <label class="admin-field"><span class="sr-only">عنوان خدمت {{ itemIndex + 1 }}</span><input :value="item" @input="updateServiceItem(groupIndex, itemIndex, $event.target.value)"></label>
                    <button class="admin-icon-button" type="button" :aria-label="`حذف ${item || 'خدمت'}`" @click="removeServiceItem(groupIndex, itemIndex)">×</button>
                  </div>
                  <button class="admin-remove-group" type="button" @click="removeServiceGroup(groupIndex)">برداشتن این دسته از سایت</button>
                </div>
              </details>
            </section>

            <section class="admin-service-editor" aria-labelledby="admin-service-examples-title">
              <div class="admin-subsection-head">
                <div><span class="admin-eyebrow">نمونه‌های تصویری خدمات</span><h3 id="admin-service-examples-title">انتخاب تصویر مستند برای هر خدمت</h3><p>برای {{ serviceEvidenceCoverage.withExamples.toLocaleString('fa-IR') }} از {{ serviceEvidenceCoverage.total.toLocaleString('fa-IR') }} خدمت نمونهٔ آرشیوی یا انتخاب‌شده ثبت شده است؛ {{ serviceEvidenceCoverage.awaitingSelection.toLocaleString('fa-IR') }} خدمت دیگر برای نمایش تصویر مرتبط به انتخاب شرکت نیاز دارد. نمونهٔ دستی با برچسب «انتخاب‌شده توسط شرکت» دیده می‌شود و متن آرشیو را تغییر نمی‌دهد یا مرحله و نتیجه‌ای به پروژه نسبت نمی‌دهد.</p></div>
              </div>
              <details v-if="servicesAwaitingSelection.length" class="admin-pending-services">
                <summary>
                  <span>خدمات نیازمند بررسی تصویر</span>
                  <span class="admin-pending-count">{{ servicesAwaitingSelection.length.toLocaleString('fa-IR') }}</span>
                </summary>
                <p>با انتخاب هر مورد، فقط نام خدمت در فرم پایین انتخاب می‌شود. تصویر به‌صورت خودکار وصل نمی‌شود؛ نمونه را فقط اگر واقعاً مربوط به همان خدمت است انتخاب و ذخیره کنید.</p>
                <div class="admin-pending-service-list">
                  <button v-for="service in servicesAwaitingSelection" :key="service" type="button" class="admin-pending-service" @click="chooseServiceExample(service)">{{ service }} <span aria-hidden="true">↓</span></button>
                </div>
              </details>
              <div class="admin-service-example-form admin-form-grid">
                <label class="admin-field">خدمت
                  <select v-model="serviceExampleService">
                    <option value="">انتخاب خدمت</option>
                    <option v-for="service in serviceOptions" :key="service" :value="service">{{ service }}</option>
                  </select>
                </label>
                <label class="admin-field admin-project-search">جست‌وجوی پروژه با کد، شناسه یا نوع خدمت
                  <input v-model="serviceExampleProjectSearch" type="search" placeholder="مثلاً G-072 یا نظارت و اجرا">
                </label>
                <label class="admin-field">پروژهٔ ثبت‌شده
                  <select v-model="serviceExampleProjectKey">
                    <option value="">انتخاب پروژه</option>
                    <option v-for="option in visibleExampleProjectOptions" :key="option.key" :value="option.key">{{ option.label }}</option>
                  </select>
                </label>
                <button class="admin-button admin-button-secondary" type="button" :disabled="!serviceExampleService || !selectedExampleProject || !serviceExampleImage" @click="addServiceExample">افزودن نمونه</button>
              </div>
              <p class="admin-service-example-note" aria-live="polite">
                {{ visibleExampleProjectOptions.length.toLocaleString('fa-IR') }} گزینه از {{ filteredExampleProjectOptions.length.toLocaleString('fa-IR') }} پروژهٔ منطبق نمایش داده می‌شود. فقط پروژه‌ای را انتخاب کنید که تصویرش واقعاً به خدمت مربوط است.
              </p>
              <button v-if="filteredExampleProjectOptions.length > serviceExampleProjectLimit" class="admin-button admin-button-secondary" type="button" @click="serviceExampleProjectLimit += 36">نمایش پروژه‌های بیشتر ({{ serviceExampleProjectLimit.toLocaleString('fa-IR') }} از {{ filteredExampleProjectOptions.length.toLocaleString('fa-IR') }})</button>
              <p v-else-if="serviceExampleProjectSearch && !filteredExampleProjectOptions.length" class="admin-service-example-note">پروژه‌ای با این عبارت پیدا نشد؛ کد یا عبارت کوتاه‌تری را امتحان کنید.</p>
              <div v-if="selectedExampleProject" class="admin-service-image-picker">
                <label class="admin-field">جست‌وجوی تصویر بر اساس عنوان یا تاریخ گزارش
                  <input v-model="serviceExampleSearch" type="search" placeholder="مثلاً تیغه‌چینی یا تاریخ بازدید">
                </label>
                <div class="admin-service-image-grid" role="group" aria-label="انتخاب تصویر از پروژهٔ ثبت‌شده">
                  <button v-for="image in visibleExampleImageOptions" :key="image.image" type="button" class="admin-service-image-choice" :class="{ 'is-selected': serviceExampleImage === image.image }" :aria-pressed="serviceExampleImage === image.image" :aria-label="`انتخاب تصویر ${image.number.toLocaleString('fa-IR')}${image.title ? `، ${image.title}` : ''}`" @click="serviceExampleImage = image.image">
                    <img :src="image.image" alt="" width="180" height="135" loading="lazy">
                    <span>{{ image.title || `تصویر ${image.number.toLocaleString('fa-IR')}` }}</span>
                    <small v-if="image.date">{{ exampleImageDate(image.date) }}</small>
                  </button>
                </div>
                <p v-if="!visibleExampleImageOptions.length" class="admin-service-example-note">تصویری با این عبارت پیدا نشد؛ عبارت کوتاه‌تری جست‌وجو کنید.</p>
                <button v-else-if="visibleExampleImageOptions.length < filteredExampleImageOptions.length" class="admin-button admin-button-secondary" type="button" @click="serviceExampleImageLimit += 18">نمایش تصویرهای بیشتر ({{ visibleExampleImageOptions.length.toLocaleString('fa-IR') }} از {{ filteredExampleImageOptions.length.toLocaleString('fa-IR') }})</button>
                <p v-if="serviceExampleImage" class="admin-service-example-note">تصویر انتخاب‌شده: {{ selectedExampleImageOptions.find((item) => item.image === serviceExampleImage)?.title || 'تصویر پروژه' }}</p>
              </div>
              <p v-else class="admin-service-example-note">ابتدا یک پروژه انتخاب کنید تا تصویرهای ثبت‌شدهٔ آن برای بررسی نمایش داده شوند.</p>
              <p class="admin-service-example-note">انتخاب شرکت برای صفحهٔ خدمت است؛ منبع اصلی همچنان صفحهٔ همان پروژه می‌ماند. پیش از ذخیره، موارد را مرور کنید.</p>
              <div v-if="savedServiceExamples.length" class="admin-service-example-list">
                <div v-for="entry in savedServiceExamples" :key="entry.id || entry.index" class="admin-service-example-row">
                  <img v-if="entry.project && entry.image" :src="entry.image" alt="پیش‌نمایش تصویر انتخاب‌شده" loading="lazy">
                  <div class="admin-service-example-fields">
                    <label class="admin-field">خدمت
                      <select :value="entry.service" @change="updateServiceExample(entry.index, 'service', $event.target.value)">
                        <option v-if="!serviceOptions.includes(entry.service)" :value="entry.service">{{ entry.service }} · خارج از فهرست فعلی</option>
                        <option v-for="service in serviceOptions" :key="service" :value="service">{{ service }}</option>
                      </select>
                    </label>
                    <label class="admin-field">پروژه
                      <select :value="entry.projectKey" @change="updateServiceExample(entry.index, 'projectKey', $event.target.value)">
                        <option v-if="!entry.project" :value="entry.projectKey" disabled>رکورد این پروژه در فهرست فعلی نیست</option>
                        <option v-for="option in exampleProjectOptions" :key="option.key" :value="option.key">{{ option.label }}</option>
                      </select>
                    </label>
                    <label class="admin-field field-wide">تصویر
                      <select :value="entry.image" :disabled="!entry.project" @change="updateServiceExample(entry.index, 'image', $event.target.value)">
                        <option v-if="entry.project && !entry.project.images.includes(entry.image)" :value="entry.image" disabled>این تصویر در رکورد فعلی پروژه نیست</option>
                        <option v-for="(image, imageIndex) in entry.project?.images || []" :key="image" :value="image">تصویر {{ (imageIndex + 1).toLocaleString('fa-IR') }}</option>
                      </select>
                    </label>
                  </div>
                  <button class="admin-icon-button" type="button" :aria-label="`حذف نمونهٔ ${entry.service || 'خدمت'}`" @click="removeServiceExample(entry.index)">×</button>
                </div>
              </div>
              <p v-else class="service-evidence-empty">هنوز نمونه‌ای انتخاب نشده است. تصویرها فقط پس از انتخاب و ذخیره در صفحهٔ عمومی نمایش داده می‌شوند.</p>
            </section>

            <section class="admin-service-editor" aria-labelledby="admin-team-editor-title">
              <div class="admin-subsection-head">
                <div><span class="admin-eyebrow">صفحهٔ درباره</span><h3 id="admin-team-editor-title">تیم و مسئولیت‌ها</h3><p>عنوان و مسئولیت هر حوزه را ویرایش کنید. این بخش حوزه‌های کاری را نشان می‌دهد؛ اطلاعات فردی کارکنان در آن قرار نمی‌گیرد.</p></div>
                <button class="admin-button admin-button-secondary" type="button" @click="addTeamResponsibility">افزودن حوزه</button>
              </div>
              <details v-for="(role, roleIndex) in contentDraft.teamResponsibilities || []" :key="role.id || roleIndex" class="admin-service-group" :open="roleIndex === 0">
                <summary><span><strong>{{ role.title || 'حوزهٔ بدون عنوان' }}</strong><small>{{ (role.responsibilities || []).length.toLocaleString('fa-IR') }} مسئولیت</small></span><span class="admin-details-chevron" aria-hidden="true">⌄</span></summary>
                <div class="admin-service-fields">
                  <div class="admin-form-grid">
                    <label class="admin-field">عنوان حوزه<input :value="role.title" @input="setContentValue(['teamResponsibilities', roleIndex, 'title'], $event.target.value)"></label>
                    <label class="admin-field">عنوان انگلیسی<input :value="role.english" dir="ltr" @input="setContentValue(['teamResponsibilities', roleIndex, 'english'], $event.target.value)"></label>
                    <label class="admin-field field-wide">توضیح کوتاه<textarea :value="role.description" rows="2" @input="setContentValue(['teamResponsibilities', roleIndex, 'description'], $event.target.value)"></textarea></label>
                  </div>
                  <div class="admin-service-list-head"><strong>مسئولیت‌ها</strong><button class="admin-button admin-button-secondary" type="button" @click="addTeamDuty(roleIndex)">افزودن مسئولیت</button></div>
                  <div v-for="(duty, dutyIndex) in role.responsibilities || []" :key="`${role.id || roleIndex}:${dutyIndex}`" class="admin-service-item-row">
                    <label class="admin-field"><span class="sr-only">مسئولیت {{ dutyIndex + 1 }} برای {{ role.title }}</span><input :value="duty" @input="setContentValue(['teamResponsibilities', roleIndex, 'responsibilities', dutyIndex], $event.target.value)"></label>
                    <button class="admin-icon-button" type="button" :aria-label="`حذف مسئولیت ${duty}`" @click="removeTeamDuty(roleIndex, dutyIndex)">×</button>
                  </div>
                  <button class="admin-remove-group" type="button" @click="removeTeamResponsibility(roleIndex)">برداشتن این حوزه از صفحهٔ درباره</button>
                </div>
              </details>
            </section>

            <section class="admin-service-editor" aria-labelledby="admin-additional-services-title">
              <div class="admin-subsection-head">
                <div><span class="admin-eyebrow">خدمات مکمل</span><h3 id="admin-additional-services-title">خدمات تکمیلی</h3><p>موارد این فهرست در بخش جداگانهٔ خدمات سایت دیده می‌شوند.</p></div>
                <button class="admin-button admin-button-secondary" type="button" @click="addAdditionalService">افزودن خدمت</button>
              </div>
              <div v-for="(item, index) in contentDraft.additionalServices || []" :key="`additional:${index}`" class="admin-service-item-row">
                <label class="admin-field"><span class="sr-only">عنوان خدمت تکمیلی {{ index + 1 }}</span><input :value="item" @input="updateAdditionalService(index, $event.target.value)"></label>
                <button class="admin-icon-button" type="button" :aria-label="`حذف ${item || 'خدمت تکمیلی'}`" @click="removeAdditionalService(index)">×</button>
              </div>
            </section>

            <section class="admin-service-editor" aria-labelledby="admin-team-directory-editor-title">
              <div class="admin-subsection-head">
                <div><span class="admin-eyebrow">صفحهٔ درباره</span><h3 id="admin-team-directory-editor-title">نام، سمت و ترتیب اعضای تیم</h3><p>نام‌ها و سمت‌ها از معرفی قبلی شرکت برداشته شده‌اند. عکس هر همکار را از کتابخانهٔ رسانه ویرایش کنید.</p></div>
              </div>
              <details v-for="(group, groupIndex) in contentDraft.teamDirectory || []" :key="group.id || groupIndex" class="admin-service-group" :open="groupIndex === 0">
                <summary><span><strong>{{ group.title || 'گروه بدون عنوان' }}</strong><small>{{ (group.members || []).length.toLocaleString('fa-IR') }} نفر</small></span><span class="admin-details-chevron" aria-hidden="true">⌄</span></summary>
                <div class="admin-service-fields">
                  <div class="admin-form-grid">
                    <label class="admin-field field-wide">عنوان گروه<input :value="group.title" @input="setContentValue(['teamDirectory', groupIndex, 'title'], $event.target.value)"></label>
                  </div>
                  <div class="admin-service-list-head"><strong>نام‌ها، سمت‌ها، عکس‌ها و ترتیب</strong><button class="admin-button admin-button-secondary" type="button" @click="addDirectoryMember(groupIndex)">افزودن همکار</button></div>
                  <div v-for="(member, memberIndex) in group.members || []" :key="member.id || memberIndex" class="admin-team-directory-row">
                    <label class="admin-field">نام<input :value="member.name" @input="updateDirectoryMember(groupIndex, memberIndex, 'name', $event.target.value)"></label>
                    <label class="admin-field">سمت<input :value="member.role" @input="updateDirectoryMember(groupIndex, memberIndex, 'role', $event.target.value)"></label>
                    <label class="admin-field">جایگاه عکس
                      <select :value="member.photoKey || ''" @change="updateDirectoryMember(groupIndex, memberIndex, 'photoKey', $event.target.value)">
                        <option value="">بدون تصویر</option>
                        <option v-for="option in teamDirectoryPhotoOptions" :key="option.key" :value="option.key">{{ option.label }}</option>
                      </select>
                    </label>
                    <div class="admin-team-directory-actions">
                      <button class="admin-icon-button" type="button" :disabled="memberIndex === 0" :aria-label="`انتقال ${member.name || member.role} به بالا`" @click="moveDirectoryMember(groupIndex, memberIndex, -1)">↑</button>
                      <button class="admin-icon-button" type="button" :disabled="memberIndex === (group.members || []).length - 1" :aria-label="`انتقال ${member.name || member.role} به پایین`" @click="moveDirectoryMember(groupIndex, memberIndex, 1)">↓</button>
                      <button class="admin-icon-button" type="button" :aria-label="`حذف ${member.name || member.role}`" @click="removeDirectoryMember(groupIndex, memberIndex)">×</button>
                    </div>
                  </div>
                  <div class="admin-team-directory-actions admin-team-directory-group-actions">
                    <button class="admin-button admin-button-secondary" type="button" :disabled="groupIndex === 0" @click="moveDirectoryGroup(groupIndex, -1)">انتقال گروه به بالا</button>
                    <button class="admin-button admin-button-secondary" type="button" :disabled="groupIndex === (contentDraft.teamDirectory || []).length - 1" @click="moveDirectoryGroup(groupIndex, 1)">انتقال گروه به پایین</button>
                  </div>
                </div>
              </details>
            </section>

            <section class="admin-service-editor" aria-labelledby="admin-engagement-editor-title">
              <div class="admin-subsection-head"><div><span class="admin-eyebrow">روش‌های همکاری</span><h3 id="admin-engagement-editor-title">دامنهٔ همکاری</h3><p>توضیح مدل‌های همکاری در صفحهٔ خدمات از این بخش گرفته می‌شود.</p></div></div>
              <details v-for="(model, modelIndex) in contentDraft.engagementModels || []" :key="model.number || modelIndex" class="admin-service-group">
                <summary><span><strong>{{ model.title || 'روش همکاری' }}</strong><small>{{ model.english }}</small></span><span class="admin-details-chevron" aria-hidden="true">⌄</span></summary>
                <div class="admin-service-fields admin-form-grid">
                  <label class="admin-field">عنوان همکاری<input :value="model.title" @input="setContentValue(['engagementModels', modelIndex, 'title'], $event.target.value)"></label>
                  <label class="admin-field">عنوان انگلیسی<input :value="model.english" dir="ltr" @input="setContentValue(['engagementModels', modelIndex, 'english'], $event.target.value)"></label>
                  <label class="admin-field field-wide">توضیح<textarea :value="model.description" rows="3" @input="setContentValue(['engagementModels', modelIndex, 'description'], $event.target.value)"></textarea></label>
                </div>
              </details>
            </section>

            <p class="admin-help">برای تغییر ساختارهای پیشرفته یا فیلدهای کم‌استفاده، «ویرایش پیشرفتهٔ داده‌ها» را باز کن. عکس‌های پرسنلیِ منتشرشده از کتابخانهٔ رسانه قابل‌تعویض‌اند؛ عکس‌های شخصیِ بارگذاری‌شده در بخش خصوصی باقی می‌مانند.</p>
          </div>
        </section>

        <AdminMediaLibrary
          v-else-if="section === 'media'"
          :media="contentDraft.siteMedia || siteMedia"
          :team-directory="contentDraft.teamDirectory || []"
          :company-projects="companyProjects"
          :upload-public-image="uploadImage"
          @update:media="setContentValue(['siteMedia'], $event)"
          @save="saveSiteContent"
        />

        <section v-else-if="section === 'contact-requests'" class="admin-contact-requests-section">
          <div class="record-list-head"><div><span class="admin-eyebrow">اطلاعات محلی و خصوصی</span><h2>درخواست‌های تماس</h2><p>اطلاعات درخواست فقط روی همین رایانه ذخیره می‌شود و تماس یا ارسال خودکار انجام نمی‌شود.</p></div></div>
          <label class="admin-search"><span class="sr-only">جست‌وجوی درخواست تماس</span><input v-model="contactRequestsQuery" type="search" placeholder="جست‌وجو با نام، شماره یا موضوع"><span aria-hidden="true">⌕</span></label>
          <article v-for="entry in filteredContactRequests" :key="entry.id" class="contact-request-record">
            <header><div><strong>{{ entry.name || 'نام وارد نشده' }}</strong><span>{{ entry.service || 'موضوع مشخص نشده' }} · {{ formatDate(entry.createdAt) }}</span></div><span class="contact-request-status" :class="{ 'is-contacted': entry.status === 'contacted' }">{{ entry.status === 'contacted' ? 'پیگیری‌شده' : 'جدید' }}</span></header>
            <a class="contact-request-phone" :href="`tel:${entry.phone}`" dir="ltr">{{ entry.phone }}</a>
            <p v-if="entry.details">{{ entry.details }}</p>
            <div class="contact-request-actions"><button v-if="entry.status !== 'contacted'" class="admin-button admin-button-secondary" type="button" :disabled="busy" @click="markContactRequestContacted(entry)">ثبت پیگیری</button><button class="admin-button admin-button-danger" type="button" :disabled="busy" @click="removeContactRequest(entry)">حذف درخواست</button></div>
          </article>
          <p v-if="!filteredContactRequests.length" class="admin-empty-editor">درخواست تماسی در این نسخهٔ محلی ثبت نشده است.</p>
        </section>

        <section v-else-if="section === 'feedback'" class="admin-feedback-section">
          <div class="record-list-head"><div><span class="admin-eyebrow">ذخیره‌شده روی همین رایانه</span><h2>بازخوردهای محلی</h2><p>این فرم‌ها به سرور عمومی ارسال نمی‌شوند.</p></div></div>
          <label class="admin-search"><span class="sr-only">جست‌وجوی بازخورد</span><input v-model="feedbackQuery" type="search" placeholder="جست‌وجو بر اساس نام، موضوع یا متن"><span aria-hidden="true">⌕</span></label>
          <article v-for="entry in filteredFeedback" :key="`${entry.savedAt}-${entry.subject}`" class="feedback-record">
            <header><div><strong>{{ entry.subject }}</strong><span>{{ entry.name }} · {{ formatDate(entry.savedAt) }} · امتیاز {{ entry.rating || '—' }} از ۵</span></div><button class="admin-button admin-button-danger" type="button" :disabled="busy" @click="removeFeedback(props.feedback.indexOf(entry))">حذف بازخورد</button></header>
            <p>{{ entry.details }}</p>
          </article>
          <p v-if="!filteredFeedback.length" class="admin-empty-editor">بازخورد محلی ثبت نشده است.</p>
        </section>

        <section v-else-if="section === 'trash'" class="admin-trash-section">
          <div class="record-list-head"><div><span class="admin-eyebrow">قابل‌بازگردانی</span><h2>حذف‌شده‌ها</h2><p>این موارد از سایت عمومی پنهان شده‌اند؛ برای بازگرداندنشان دکمهٔ مقابل را بزنید.</p></div></div>
          <article v-for="item in trashItems" :key="`${item.collection}:${item.key}`" class="trash-row">
            <div><strong>{{ item.label }}</strong><span>{{ item.detail }}</span></div><button class="admin-button admin-button-secondary" type="button" :disabled="busy" @click="restoreTrashItem(item)">بازگردانی</button>
          </article>
          <p v-if="!trashItems.length" class="admin-empty-editor">مورد حذف‌شده‌ای وجود ندارد.</p>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.admin-page { display: grid; gap: var(--space-6); padding-block: var(--space-8) var(--space-16); }
.admin-page-head, .record-list-head, .admin-head-actions, .record-actions { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
.admin-page-head { align-items: flex-start; padding-bottom: var(--space-6); border-bottom: 1px solid var(--border-subtle); }
.admin-page-head h1, .record-list-head h2 { margin: var(--space-1) 0; color: var(--text-primary); font-size: var(--text-page-title); }
.admin-page-head p, .record-list-head p { margin: 0; color: var(--text-secondary); line-height: var(--line-body); }
.admin-eyebrow { color: var(--brand-green); font-size: var(--text-caption); letter-spacing: .06em; }
.admin-head-actions { flex-wrap: wrap; justify-content: flex-end; }
.local-badge, .record-row-tag { display: inline-flex; align-items: center; min-height: 30px; padding: var(--space-1) var(--space-2); border: 1px solid var(--border-subtle); color: var(--text-secondary); font-size: var(--text-caption); white-space: nowrap; }
.local-badge.is-enabled { border-color: var(--brand-sage); background: var(--surface-mint); color: var(--brand-forest); }
.local-badge.is-disabled { border-color: var(--status-danger); color: var(--status-danger); }
.admin-button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; padding: var(--space-2) var(--space-4); border: 1px solid var(--border-strong); border-radius: var(--radius-control); background: var(--surface-paper); color: var(--text-primary); font: inherit; font-size: var(--text-small); cursor: pointer; transition: background var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard); }
.admin-button:hover { background: var(--surface-mint); }
.admin-button:focus-visible, .admin-sidebar button:focus-visible, .record-row:focus-visible, .source-filter button:focus-visible, .admin-search input:focus-visible, .admin-field input:focus-visible, .admin-field textarea:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.admin-button:disabled { opacity: .55; cursor: wait; }
.admin-button-primary { border-color: var(--brand-forest); background: var(--brand-forest); color: var(--text-inverse); }
.admin-button-primary:hover { background: var(--brand-forest-deep); color: var(--text-inverse); }
.admin-button-secondary { background: transparent; }
.admin-button-danger { border-color: var(--status-danger); color: var(--status-danger); }
.admin-button-danger:hover { background: var(--surface-danger); }
.admin-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border: 1px solid var(--border-subtle); background: var(--surface-paper); }
.admin-metrics div { display: grid; gap: var(--space-2); padding: var(--space-4); border-inline-end: 1px solid var(--border-subtle); }
.admin-metrics div:last-child { border-inline-end: 0; }
.admin-metrics span { color: var(--text-secondary); font-size: var(--text-small); }
.admin-metrics strong { color: var(--brand-forest); font-size: var(--text-metric); font-weight: 500; }
.admin-metrics small { color: var(--text-subtle); font-size: var(--text-caption); line-height: var(--line-body); }
.admin-notice, .admin-error { padding: var(--space-3) var(--space-4); border-inline-start: 3px solid var(--brand-green); background: var(--surface-mint); color: var(--brand-forest); }
.admin-error { border-color: var(--status-danger); background: var(--surface-danger); color: var(--status-danger); }
.admin-workspace { display: grid; grid-template-columns: minmax(10rem, 14rem) minmax(19rem, 23rem) minmax(0, 1fr); min-height: 42rem; border: 1px solid var(--border-subtle); background: var(--surface-paper); }
.admin-sidebar { display: flex; flex-direction: column; gap: var(--space-1); padding: var(--space-3); border-inline-end: 1px solid var(--border-subtle); background: var(--surface-ivory); }
.admin-sidebar button { display: flex; min-height: 48px; align-items: center; justify-content: space-between; gap: var(--space-2); padding: var(--space-2) var(--space-3); border: 1px solid transparent; background: transparent; color: var(--text-primary); text-align: right; font: inherit; font-size: var(--text-small); cursor: pointer; }
.admin-sidebar button:hover { background: var(--surface-paper); }
.admin-sidebar button.active { border-color: var(--border-subtle); background: var(--surface-paper); color: var(--brand-forest); }
.admin-sidebar button small { color: var(--text-subtle); font-family: var(--font-mono); }
.admin-sidebar-note { margin: auto var(--space-2) var(--space-2); padding-top: var(--space-4); border-top: 1px solid var(--border-subtle); color: var(--text-secondary); font-size: var(--text-caption); line-height: var(--line-body); }
.admin-records { min-width: 0; display: flex; flex-direction: column; padding: var(--space-4); border-inline-end: 1px solid var(--border-subtle); }
.record-list-head { align-items: flex-start; margin-bottom: var(--space-4); }
.record-list-head h2 { font-size: var(--text-section-title); }
.record-list-head .admin-button { flex-shrink: 0; }
.source-filter { display: flex; flex-wrap: wrap; gap: var(--space-1); margin-bottom: var(--space-3); }
.source-filter button { display: inline-flex; min-height: 38px; align-items: center; gap: var(--space-1); padding: var(--space-1) var(--space-2); border: 1px solid var(--border-subtle); background: transparent; color: var(--text-secondary); font: inherit; font-size: var(--text-caption); cursor: pointer; }
.source-filter button[aria-pressed="true"] { border-color: var(--brand-green); background: var(--surface-mint); color: var(--brand-forest); }
.source-filter small { font-family: var(--font-mono); }
.admin-search { position: relative; display: flex; align-items: center; margin-bottom: var(--space-3); }
.admin-search input { width: 100%; min-height: 44px; padding: var(--space-2) var(--space-3) var(--space-2) var(--space-8); border: 1px solid var(--border-subtle); border-radius: var(--radius-control); background: var(--surface-paper); color: var(--text-primary); font: inherit; font-size: var(--text-small); }
.admin-search > span:last-child { position: absolute; left: var(--space-3); color: var(--text-secondary); font-size: var(--text-icon); pointer-events: none; }
.record-list { display: grid; align-content: start; gap: var(--space-1); max-height: 68vh; overflow: auto; }
.record-row { display: flex; width: 100%; min-height: 62px; align-items: center; justify-content: space-between; gap: var(--space-2); padding: var(--space-2); border: 1px solid transparent; border-bottom-color: var(--border-subtle); background: transparent; color: var(--text-primary); text-align: right; font: inherit; cursor: pointer; }
.record-row:hover { background: var(--surface-ivory); }
.record-row.selected { border-color: var(--border-strong); background: var(--surface-mint); }
.record-row-main { display: grid; min-width: 0; gap: var(--space-1); }
.record-row-main strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-small); font-weight: 500; }
.record-row-main small { overflow: hidden; color: var(--text-secondary); text-overflow: ellipsis; white-space: nowrap; font-size: var(--text-caption); }
.record-row-tag { min-height: 26px; padding: 0 var(--space-1); }
.record-row-tag.draft { border-color: var(--status-live); color: var(--status-live); }
.show-more { margin-top: var(--space-3); }
.admin-editor-pane, .admin-site-content, .admin-feedback-section, .admin-contact-requests-section, .admin-trash-section { min-width: 0; padding: var(--space-6); }
.admin-editor-pane { overflow: auto; }
.admin-empty-editor { display: grid; min-height: 20rem; place-content: center; color: var(--text-secondary); text-align: center; }
.admin-empty-editor span { color: var(--text-primary); font-size: var(--text-empty-state); }
.admin-empty-editor p { margin: var(--space-2) 0 0; line-height: var(--line-body); }
.admin-site-content { grid-column: 2 / -1; display: grid; align-content: start; gap: var(--space-5); }
.admin-site-content > .record-list-head p { max-width: 48rem; font-size: var(--text-small); }
.admin-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
.admin-field { display: grid; gap: var(--space-2); min-width: 0; color: var(--text-primary); font-size: var(--text-small); }
.admin-field input, .admin-field textarea { width: 100%; min-width: 0; min-height: 44px; padding: var(--space-2) var(--space-3); border: 1px solid var(--border-subtle); border-radius: var(--radius-control); background: var(--surface-paper); color: var(--text-primary); font: inherit; font-size: var(--text-body); line-height: var(--line-body); }
.admin-field textarea { resize: vertical; }
.admin-field textarea[dir="ltr"], .admin-field input[dir="ltr"] { text-align: left; font-family: var(--font-mono); font-size: var(--text-small); }
.admin-field p { margin: var(--space-2) 0 0; color: var(--text-secondary); }
.content-summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.content-summary-grid article { display: grid; gap: var(--space-1); padding: var(--space-4); border: 1px solid var(--border-subtle); background: var(--surface-ivory); }
.content-summary-grid span, .content-summary-grid small { color: var(--text-secondary); font-size: var(--text-small); }
.content-summary-grid strong { color: var(--brand-forest); font-weight: 500; }
.admin-help { color: var(--text-secondary); font-size: var(--text-small); line-height: var(--line-body); }
.admin-feedback-section, .admin-contact-requests-section, .admin-trash-section { grid-column: 2 / -1; display: grid; align-content: start; gap: var(--space-4); }
.feedback-record, .trash-row { padding: var(--space-4); border: 1px solid var(--border-subtle); background: var(--surface-paper); }
.feedback-record header, .trash-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
.feedback-record header div, .trash-row div { display: grid; gap: var(--space-1); }
.feedback-record header strong, .trash-row strong { color: var(--text-primary); font-weight: 500; }
.feedback-record header span, .trash-row span { color: var(--text-secondary); font-size: var(--text-small); }
.feedback-record p { margin: var(--space-3) 0 0; color: var(--text-primary); line-height: var(--line-reading); white-space: pre-wrap; }
.contact-request-record { padding: var(--space-4); border: 1px solid var(--border-subtle); background: var(--surface-paper); }
.contact-request-record > header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
.contact-request-record > header div { display: grid; gap: var(--space-1); }
.contact-request-record > header strong { color: var(--text-primary); font-weight: 500; }
.contact-request-record > header div > span { color: var(--text-secondary); font-size: var(--text-small); }
.contact-request-status { padding: 4px 8px; border: 1px solid var(--border-strong); color: var(--text-secondary); font-size: var(--text-caption); }
.contact-request-status.is-contacted { border-color: var(--brand-sage); background: var(--surface-mint); color: var(--brand-forest); }
.contact-request-phone { min-height: 44px; display: inline-flex; align-items: center; color: var(--brand-forest); font-family: var(--font-mono); font-size: var(--text-body); }
.contact-request-record p { margin: 0; color: var(--text-secondary); line-height: var(--line-reading); }
.contact-request-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-2); }
.trash-row { border-inline-start: 3px solid var(--border-strong); }
.admin-offline { display: grid; max-width: 44rem; gap: var(--space-3); margin: var(--space-16) auto; padding: var(--space-8); border: 1px solid var(--border-subtle); background: var(--surface-paper); }
.admin-offline h2, .admin-offline p { margin: 0; }
.admin-offline h2 { color: var(--text-primary); font-size: var(--text-section-title); }
.admin-offline p { color: var(--text-secondary); line-height: var(--line-body); }
.admin-overview { grid-column: 2 / -1; display: grid; align-content: start; gap: var(--space-5); min-width: 0; padding: var(--space-6); }
.admin-quick-links { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
.admin-quick-card { min-width: 0; min-height: 162px; display: grid; align-content: start; justify-items: start; gap: var(--space-2); padding: var(--space-4); border: 1px solid var(--border-subtle); background: var(--surface-paper); color: var(--text-primary); text-align: right; font: inherit; cursor: pointer; transition: background var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard); }
.admin-quick-card:hover { border-color: var(--brand-sage); background: var(--surface-mint); transform: translateY(-2px); }
.admin-quick-card:focus-visible { outline: 3px solid var(--focus-ring); outline-offset: 2px; }
.quick-card-number { color: var(--brand-green); font-family: var(--font-mono); font-size: var(--text-caption); }
.admin-quick-card strong { font-size: var(--text-card-title); font-weight: 500; }
.admin-quick-card > small { color: var(--text-secondary); font-size: var(--text-small); line-height: var(--line-body); }
.quick-card-meta { display: flex; width: 100%; justify-content: space-between; gap: var(--space-2); margin-top: auto; padding-top: var(--space-2); border-top: 1px solid var(--border-subtle); color: var(--brand-forest); font-size: var(--text-small); }
.admin-overview-note { display: flex; gap: var(--space-3); padding: var(--space-3) var(--space-4); border-inline-start: 3px solid var(--brand-sage); background: var(--surface-ivory); color: var(--text-secondary); }
.admin-overview-note p { margin: 0; font-size: var(--text-small); line-height: var(--line-body); }
.admin-subsection-head { display: flex; align-items: end; justify-content: space-between; gap: var(--space-4); margin-bottom: var(--space-3); }
.admin-subsection-head h3 { margin: var(--space-1) 0; color: var(--text-primary); font-size: var(--text-section-title); font-weight: 500; }
.admin-subsection-head p { max-width: 45rem; margin: 0; color: var(--text-secondary); font-size: var(--text-small); line-height: var(--line-body); }
.admin-service-editor { display: grid; gap: var(--space-3); margin-top: var(--space-6); }
.admin-pending-services { border: 1px solid var(--border-subtle); background: var(--surface-paper); }
.admin-pending-services > summary { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); min-height: 48px; padding: var(--space-2) var(--space-4); color: var(--brand-forest); font-size: var(--text-small); cursor: pointer; }
.admin-pending-services > summary:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.admin-pending-count { display: grid; min-width: 28px; min-height: 28px; place-items: center; border-radius: 999px; background: var(--surface-mint); color: var(--brand-forest); font-size: var(--text-caption); }
.admin-pending-services > p { margin: 0; padding: 0 var(--space-4) var(--space-3); color: var(--text-secondary); font-size: var(--text-caption); line-height: var(--line-body); }
.admin-pending-service-list { display: flex; flex-wrap: wrap; gap: var(--space-2); padding: 0 var(--space-4) var(--space-4); }
.admin-pending-service { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); min-height: 44px; padding: var(--space-2) var(--space-3); border: 1px solid var(--border-subtle); background: var(--surface-ivory); color: var(--text-primary); font: inherit; font-size: var(--text-small); cursor: pointer; }
.admin-pending-service:hover { border-color: var(--brand-sage); background: var(--surface-mint); }
.admin-pending-service:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.admin-service-group { border: 1px solid var(--border-subtle); background: var(--surface-paper); }
.admin-service-group > summary { min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-3) var(--space-4); cursor: pointer; list-style: none; }
.admin-service-group > summary::-webkit-details-marker { display: none; }
.admin-service-group > summary > span:first-child { display: flex; align-items: center; gap: var(--space-3); min-width: 0; }
.admin-service-group > summary strong { color: var(--text-primary); font-weight: 500; }
.admin-service-group > summary small { color: var(--text-secondary); font-size: var(--text-caption); }
.admin-service-group[open] > summary { border-bottom: 1px solid var(--border-subtle); background: var(--surface-ivory); }
.admin-details-chevron { color: var(--brand-green); font-size: var(--text-card-title); transition: transform var(--duration-fast) var(--ease-standard); }
.admin-service-group[open] .admin-details-chevron { transform: rotate(180deg); }
.admin-service-fields { display: grid; gap: var(--space-4); padding: var(--space-4); }
.admin-service-list-head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-top: var(--space-2); }
.admin-service-list-head > strong { color: var(--text-primary); font-size: var(--text-small); font-weight: 500; }
.admin-service-item-row { display: flex; align-items: center; gap: var(--space-2); }
.admin-service-item-row .admin-field { flex: 1 1 auto; }
.admin-service-item-row .admin-field input { min-height: 44px; }
.admin-service-example-form { align-items: end; padding: var(--space-4); border: 1px solid var(--border-subtle); background: var(--surface-ivory); }
.admin-service-example-form select, .admin-service-example-fields select { min-height: 44px; }
.admin-project-search { grid-column: 1 / -1; }
.admin-project-search input { min-height: 44px; }
.admin-service-image-picker { display: grid; gap: var(--space-3); min-width: 0; }
.admin-service-image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: var(--space-2); max-height: 380px; overflow: auto; padding: var(--space-1); border: 1px solid var(--border-subtle); background: var(--surface-paper); }
.admin-service-image-choice { display: grid; align-content: start; gap: var(--space-1); min-width: 0; padding: var(--space-1); border: 1px solid var(--border-subtle); background: var(--surface-paper); color: var(--text-secondary); text-align: right; cursor: pointer; }
.admin-service-image-choice:hover { border-color: var(--brand-sage); background: var(--surface-mint); }
.admin-service-image-choice:focus-visible { outline: 3px solid var(--focus-ring); outline-offset: 2px; }
.admin-service-image-choice.is-selected { border: 2px solid var(--brand-green); background: var(--surface-mint); color: var(--brand-forest); }
.admin-service-image-choice img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: var(--surface-soft); }
.admin-service-image-choice span { display: -webkit-box; overflow: hidden; font-size: var(--text-caption); line-height: var(--line-body); -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.admin-service-image-choice small { color: var(--text-subtle); font-size: 0.68rem; }
.admin-service-example-note { margin: 0; color: var(--text-secondary); font-size: var(--text-caption); line-height: var(--line-body); }
.admin-service-example-list { display: grid; gap: var(--space-2); }
.admin-service-example-row { display: grid; grid-template-columns: 96px minmax(0, 1fr) auto; align-items: center; gap: var(--space-3); padding: var(--space-3); border: 1px solid var(--border-subtle); background: var(--surface-paper); }
.admin-service-example-row > img { width: 96px; aspect-ratio: 4 / 3; object-fit: cover; background: var(--surface-soft); }
.admin-service-example-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-2) var(--space-3); min-width: 0; }
.admin-service-example-fields .field-wide { grid-column: 1 / -1; }
.admin-team-directory-row { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.15fr) minmax(0, 1fr) auto; align-items: end; gap: var(--space-3); padding-block: var(--space-3); border-top: 1px solid var(--border-subtle); }
.admin-team-directory-row .admin-field { min-width: 0; }
.admin-team-directory-row input, .admin-team-directory-row select { min-height: 44px; }
.admin-team-directory-actions { display: flex; align-items: center; gap: var(--space-1); }
.admin-team-directory-actions .admin-icon-button { color: var(--brand-forest); }
.admin-team-directory-actions .admin-icon-button:disabled { opacity: .42; cursor: not-allowed; }
.admin-team-directory-group-actions { justify-content: flex-start; flex-wrap: wrap; margin-top: var(--space-2); }
.admin-icon-button { flex: 0 0 44px; width: 44px; min-height: 44px; border: 1px solid var(--border-subtle); background: var(--surface-paper); color: var(--status-danger); font-size: var(--text-card-title); }
.admin-icon-button:hover { background: var(--surface-danger); }
.admin-remove-group { min-height: 44px; justify-self: start; padding-inline: var(--space-2); border: 0; background: transparent; color: var(--status-danger); font: inherit; font-size: var(--text-small); cursor: pointer; }
.admin-remove-group:hover { text-decoration: underline; }
@media (max-width: 1080px) {
  .admin-workspace { grid-template-columns: 12rem minmax(18rem, 22rem) minmax(0, 1fr); }
  .admin-editor-pane, .admin-site-content, .admin-feedback-section, .admin-contact-requests-section, .admin-trash-section { padding: var(--space-4); }
  .admin-team-directory-row { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .admin-service-example-row { grid-template-columns: 80px minmax(0, 1fr) auto; }
  .admin-service-example-row > img { width: 80px; }
  .admin-service-image-grid { grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); }
  .admin-team-directory-actions { grid-column: 1 / -1; }
}
@media (max-width: 820px) {
  .admin-page-head, .admin-head-actions { flex-direction: column; align-items: stretch; }
  .admin-head-actions { justify-content: flex-start; }
  .admin-workspace { grid-template-columns: 1fr; }
  .admin-sidebar { flex-direction: row; flex-wrap: wrap; border-inline-end: 0; border-bottom: 1px solid var(--border-subtle); }
  .admin-sidebar button { flex: 1 1 10rem; }
  .admin-sidebar-note { flex: 1 1 100%; margin-top: var(--space-2); }
  .admin-records { border-inline-end: 0; border-bottom: 1px solid var(--border-subtle); }
  .admin-site-content, .admin-feedback-section, .admin-contact-requests-section, .admin-trash-section { grid-column: auto; }
  .admin-overview { grid-column: auto; }
  .record-list { max-height: 36vh; }
}
@media (max-width: 560px) {
  .admin-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .admin-metrics div:nth-child(2) { border-inline-end: 0; }
  .admin-metrics div:nth-child(-n+2) { border-bottom: 1px solid var(--border-subtle); }
  .record-list-head, .feedback-record header, .contact-request-record > header, .trash-row { align-items: stretch; flex-direction: column; }
  .admin-form-grid, .content-summary-grid { grid-template-columns: minmax(0, 1fr); }
  .admin-site-content > .record-list-head, .admin-records > .record-list-head { align-items: stretch; }
  .admin-overview { padding: var(--space-4); }
  .admin-quick-links { grid-template-columns: minmax(0, 1fr); }
  .admin-subsection-head { align-items: stretch; flex-direction: column; }
  .admin-service-group > summary > span:first-child { align-items: flex-start; flex-direction: column; gap: var(--space-1); }
  .admin-team-directory-row { grid-template-columns: minmax(0, 1fr); }
  .admin-service-example-row { grid-template-columns: minmax(0, 1fr) auto; }
  .admin-service-example-row > img { grid-column: 1 / -1; width: min(100%, 260px); }
  .admin-service-image-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); max-height: 320px; }
  .admin-service-example-fields { grid-template-columns: minmax(0, 1fr); }
  .admin-service-example-fields .field-wide { grid-column: auto; }
  .admin-team-directory-actions { justify-content: flex-start; }
}
</style>
