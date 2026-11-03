<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import PageIntro from '../patterns/PageIntro.vue'
import { findServiceEvidence } from '../../service-details.js'
import { buildingSystems, serviceAssignments, wholeProjectChapter } from './building-content.js'
import { BUILDING_VIEWBOX, buildingScene } from './building-model.js'

const props = defineProps({
  serviceGroups: { type: Array, required: true },
  additionalServices: { type: Array, required: true },
  projects: { type: Array, default: () => [] },
})

const stageElement = ref(null)
const chapterElements = ref([])
const activeStep = ref(0)
const layerProgress = ref({})
const hoveredId = ref(null)
const reducedMotion = ref(false)
let scrollFrame = 0
let motionQuery = null

const delivery = { ...wholeProjectChapter }
const allChapters = computed(() => [...buildingSystems, delivery])
const serviceCatalog = computed(() => {
  const unique = new Map()
  for (const group of props.serviceGroups) {
    for (const name of group.items || []) {
      if (!unique.has(name)) unique.set(name, { name, categoryId: group.id, categoryTitle: group.title })
    }
  }
  for (const name of props.additionalServices) {
    if (!unique.has(name)) unique.set(name, { name, categoryId: 'complementary', categoryTitle: 'خدمات تکمیلی' })
  }
  if (!unique.has('طراحی پی')) {
    const category = props.serviceGroups.find((group) => group.id === 'geotechnical')
    unique.set('طراحی پی', { name: 'طراحی پی', categoryId: category?.id || 'geotechnical', categoryTitle: category?.title || 'ژئوتکنیک و آزمایشگاه', supplemental: true })
  }
  return [...unique.values()]
})

function fallbackBranches(service) {
  const text = service.name.toLocaleLowerCase('fa-IR')
  const category = service.categoryId
  if (category === 'design') {
    if (text.includes('مکانیک') || text.includes('گاز') || text.includes('آتش') || text.includes('آسانسور')) return ['mechanical']
    if (text.includes('برق') || text.includes('الکتریک')) return ['electrical']
    if (text.includes('سازه') || text.includes('اسکلت') || text.includes('بتن') || text.includes('جوش') || text.includes('میلگرد')) return ['structure']
    if (text.includes('معماری') || text.includes('داخلی') || text.includes('نما')) return ['architecture']
    return ['delivery']
  }
  if (category === 'geotechnical') {
    if (text.includes('بتن') || text.includes('جوش') || text.includes('مصالح')) return ['structure']
    return ['foundation']
  }
  if (category === 'construction') {
    if (text.includes('مکانیکی') || text.includes('برقی') || text.includes('گاز') || text.includes('آتش') || text.includes('آسانسور')) return ['mechanical', 'electrical']
    if (text.includes('سازه') || text.includes('اسکلت') || text.includes('فورجینگ') || text.includes('میلگرد')) return ['structure']
    if (text.includes('خاک') || text.includes('کارگاه')) return ['foundation']
    return ['delivery']
  }
  if (category === 'complementary') {
    if (text.includes('خورشیدی')) return ['roof']
    if (text.includes('بازسازی') || text.includes('مقاوم')) return ['architecture', 'structure']
    if (text.includes('آتش') || text.includes('گاز') || text.includes('آسانسور')) return ['mechanical']
  }
  return ['delivery']
}

function branchIds(service) {
  return serviceAssignments[service.name] || fallbackBranches(service)
}

const serviceEntriesByChapter = computed(() => {
  const result = Object.fromEntries(allChapters.value.map((chapter) => [chapter.id, []]))
  for (const service of serviceCatalog.value) {
    for (const chapterId of branchIds(service)) {
      if (result[chapterId]) result[chapterId].push(service)
    }
  }
  return result
})

const branchesByChapter = computed(() => Object.fromEntries(allChapters.value.map((chapter) => {
  const branches = new Map()
  for (const service of serviceEntriesByChapter.value[chapter.id] || []) {
    const key = service.categoryId || 'other'
    if (!branches.has(key)) branches.set(key, { id: key, title: service.categoryTitle || 'سایر خدمات', items: [] })
    branches.get(key).items.push(service)
  }
  return [chapter.id, [...branches.values()]]
})))

const samplesByChapter = computed(() => {
  const companyReports = props.projects.filter((project) => project.source === 'field-reports')
  return Object.fromEntries(allChapters.value.map((chapter) => {
    const found = (chapter.evidenceServices || []).flatMap((service) =>
      findServiceEvidence(service, companyReports).map((item) => ({ ...item, service })),
    )
    const images = new Set()
    const samples = found.filter((item) => {
      if (!item.image || images.has(item.image)) return false
      images.add(item.image)
      return true
    }).slice(0, 2)
    return [chapter.id, samples]
  }))
})

const currentChapter = computed(() => activeStep.value === 0 ? null : allChapters.value[activeStep.value - 1] || delivery)
const currentModelId = computed(() => currentChapter.value?.id && currentChapter.value.id !== 'delivery' ? currentChapter.value.id : null)
const highlightedId = computed(() => hoveredId.value || currentModelId.value)
const uniqueCatalogCount = computed(() => serviceCatalog.value.filter((service) => !service.supplemental).length)
const progressPercent = computed(() => Math.round((activeStep.value / (allChapters.value.length)) * 100))
const activeStepLabel = computed(() => activeStep.value === 0 ? 'شروع مسیر' : currentChapter.value?.label || 'هماهنگی کل پروژه')

function layerStyle(system) {
  const amount = layerProgress.value[system.id] || 0
  const width = stageElement.value?.clientWidth || 700
  const scale = Math.max(0.25, Math.min(1, width / 700))
  return {
    '--explode-x': `${Math.round(system.explode[0] * amount * scale)}px`,
    '--explode-y': `${Math.round(system.explode[1] * amount * scale)}px`,
  }
}

function setChapterElement(element, index) {
  if (element) chapterElements.value[index] = element
}

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)) }

function updateScrollState() {
  if (scrollFrame) return
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = 0
    const viewportHeight = window.innerHeight
    const mobileLayout = window.innerWidth <= 720
    const focusLine = viewportHeight * 0.48
    let closestIndex = 0
    let closestDistance = Number.POSITIVE_INFINITY
    const progress = {}

    chapterElements.value.forEach((element, index) => {
      if (!element) return
      const rect = element.getBoundingClientRect()
      const anchor = mobileLayout ? rect.top : rect.top + Math.min(rect.height, viewportHeight) * 0.5
      const distance = Math.abs(anchor - focusLine)
      if (distance < closestDistance) {
        closestDistance = distance
        closestIndex = index
      }

    })

    chapterElements.value.forEach((element, index) => {
      if (!element || index === 0) return
      const rect = element.getBoundingClientRect()
      const startLine = viewportHeight * 0.78
      const endLine = viewportHeight * 0.3
      const amount = reducedMotion.value
        ? (index <= closestIndex ? 1 : 0)
        : clamp((startLine - rect.top) / (startLine - endLine), 0, 1)
      const system = buildingSystems[index - 1]
      if (system) progress[system.id] = amount
    })

    activeStep.value = closestIndex
    layerProgress.value = progress
  })
}

function goToSystem(id) {
  const index = buildingSystems.findIndex((system) => system.id === id)
  if (index < 0) return
  const element = chapterElements.value[index + 1]
  if (!element) return
  element.scrollIntoView({ behavior: reducedMotion.value ? 'instant' : 'smooth', block: 'center' })
}

function formatDate(value) {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return ''
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeZone: 'Asia/Tehran' }).format(new Date(parsed))
}

function serviceHref(service) {
  if (!service.supplemental) return `#/services?service=${encodeURIComponent(service.name)}`
  return `#/services?category=${encodeURIComponent(service.categoryId || 'geotechnical')}`
}

function chapterBranches(chapter) {
  return branchesByChapter.value[chapter.id] || []
}

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.value = motionQuery.matches
  motionQuery.addEventListener?.('change', handleMotionChange)
  window.addEventListener('scroll', updateScrollState, { passive: true })
  window.addEventListener('resize', updateScrollState, { passive: true })
  updateScrollState()
})

function handleMotionChange(event) {
  reducedMotion.value = event.matches
  updateScrollState()
}

onUnmounted(() => {
  window.removeEventListener('scroll', updateScrollState)
  window.removeEventListener('resize', updateScrollState)
  motionQuery?.removeEventListener?.('change', handleMotionChange)
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
})
</script>

<template>
  <div class="building-explorer-page">
    <PageIntro title-id="building-explorer-title">
      <template #eyebrow>مدل تعاملی ساختمان <span class="en-label" dir="ltr">/ BUILDING ANATOMY</span></template>
      <template #title>ساختمان را ورق بزنید؛<br><em>خدمات را در جای خود ببینید.</em></template>
      <template #description>از زمین تا بام پایین بروید. با رسیدن هر بخش به مرکز دید، لایهٔ متناظر ساختمان آرام از بدنه جدا می‌شود و شاخه‌های خدمات همان بخش نمایش داده می‌شوند.</template>
      <template #meta>مدل مفهومی · ۷ بخش ساختمان · هماهنگی خدمات کل پروژه</template>
    </PageIntro>

    <section class="building-story page-container" aria-label="مسیر خدمات بر اساس اجزای ساختمان">
      <div class="building-story-layout">
        <aside class="building-visual-column" :class="{ 'is-compact': activeStep > 0 }" aria-label="مدل متحرک ساختمان">
          <div class="building-model-card">
            <div class="building-model-heading">
              <div>
                <span class="building-model-index" dir="ltr">ARCPOL / INTERACTIVE</span>
                <h3>آناتومی ساختمان</h3>
              </div>
              <span class="building-model-status"><i aria-hidden="true"></i>{{ activeStep === 0 ? 'یکپارچه' : currentChapter?.label }}</span>
            </div>

            <div ref="stageElement" class="building-stage anatomy-figure">
              <svg
                class="building-svg"
                :viewBox="BUILDING_VIEWBOX"
                role="group"
                aria-label="مدل مفهومی ساختمان پنج‌طبقه. با انتخاب هر لایه به توضیح خدمات همان بخش بروید."
                xmlns="http://www.w3.org/2000/svg"
              >
                <title>آناتومی مفهومی ساختمان ارک پل</title>
                <desc>زمین و فونداسیون، اسکلت، سقف‌ها، معماری، تأسیسات مکانیکی، برق و بام به‌صورت لایه‌های جداشونده نمایش داده می‌شوند.</desc>
                <g
                  v-for="system in buildingSystems"
                  :key="system.id"
                  class="building-layer"
                  :class="{
                    [`building-layer--${system.id}`]: true,
                    'is-active': highlightedId === system.id,
                    'is-dimmed': highlightedId && highlightedId !== system.id,
                  }"
                  :style="layerStyle(system)"
                  :aria-label="`${system.title}. برای دیدن شاخهٔ خدمات انتخاب کنید.`"
                  aria-roledescription="لایهٔ قابل انتخاب ساختمان"
                  role="button"
                  tabindex="0"
                  @pointerenter="hoveredId = system.id"
                  @pointerleave="hoveredId = null"
                  @focus="hoveredId = system.id"
                  @blur="hoveredId = null"
                  @click="goToSystem(system.id)"
                  @keydown.enter.prevent="goToSystem(system.id)"
                  @keydown.space.prevent="goToSystem(system.id)"
                >
                  <g v-html="buildingScene[system.id]"></g>
                </g>
              </svg>
              <span class="building-diagram-caption">مدل شماتیک است؛ نقشهٔ اجرایی یا مدل یک پروژهٔ واقعی نیست.</span>
            </div>

            <div class="building-story-progress" role="status" aria-live="polite">
              <div class="building-progress-copy">
                <span>مسیر خدمات</span>
                <strong>{{ activeStep.toLocaleString('fa-IR') }} از {{ allChapters.length.toLocaleString('fa-IR') }} · {{ activeStepLabel }}</strong>
              </div>
              <div class="building-progress-track" role="progressbar" :aria-valuenow="progressPercent" aria-valuemin="0" aria-valuemax="100" :aria-label="`پیشرفت مسیر خدمات: ${progressPercent} درصد`">
                <span :style="{ width: `${progressPercent}%` }"></span>
              </div>
            </div>
          </div>
          <p class="building-accessibility-note">با اسکرول، لایه‌ها مرحله‌به‌مرحله باز می‌شوند. برای رفتن مستقیم به یک بخش، همان لایه را روی مدل انتخاب کنید.</p>
        </aside>

        <div class="building-chapters">
          <section :ref="(el) => setChapterElement(el, 0)" class="building-chapter building-chapter--start" aria-labelledby="building-start-title">
            <div class="building-chapter-topline">
              <span class="building-chapter-index" dir="ltr">00</span>
              <span class="building-chapter-kind">شروع مسیر</span>
            </div>
            <h3 id="building-start-title">یک ساختمان، چندین رشتهٔ هماهنگ</h3>
            <p>از شناخت زمین و آماده‌سازی بستر شروع کنید؛ بعد لایه‌های سازه، معماری و تأسیسات را ببینید. در هر توقف، خدمات مرتبط به‌صورت شاخه‌ای آمده‌اند.</p>
            <div class="building-scroll-cue"><span aria-hidden="true">↓</span> برای شروع، کمی پایین‌تر بروید</div>
          </section>

          <article
            v-for="(chapter, index) in allChapters"
            :key="chapter.id"
            :ref="(el) => setChapterElement(el, index + 1)"
            class="building-chapter"
            :class="{ 'is-current': activeStep === index + 1, 'building-chapter--delivery': chapter.id === 'delivery' }"
            :aria-labelledby="`building-chapter-title-${chapter.id}`"
          >
            <div class="building-chapter-topline">
              <span class="building-chapter-index" dir="ltr">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="building-chapter-kind">{{ chapter.label }}</span>
              <span class="building-chapter-count">{{ (serviceEntriesByChapter[chapter.id] || []).length.toLocaleString('fa-IR') }} ارتباط خدماتی</span>
            </div>
            <span class="building-chapter-english" dir="ltr">{{ chapter.english }}</span>
            <h3 :id="`building-chapter-title-${chapter.id}`">{{ chapter.title }}</h3>
            <p class="building-chapter-description">{{ chapter.description }}</p>

            <div v-if="chapterBranches(chapter).length" class="building-service-tree" aria-label="شاخه‌های خدمات مرتبط">
              <div v-for="branch in chapterBranches(chapter)" :key="branch.id" class="building-service-branch">
                <h4><span aria-hidden="true"></span>{{ branch.title }}</h4>
                <ul>
                  <li v-for="service in branch.items" :key="service.name">
                    <a :href="serviceHref(service)"><span>{{ service.name }}</span><span class="building-service-arrow" aria-hidden="true">↗</span></a>
                  </li>
                </ul>
              </div>
            </div>
            <p v-else class="building-no-services">خدمتی در این بخش ثبت نشده است.</p>

            <p class="building-chapter-note">{{ chapter.note }}</p>

            <div v-if="samplesByChapter[chapter.id]?.length" class="building-chapter-samples" aria-label="تصاویر مرتبط از گزارش‌های پروژه">
              <figure v-for="sample in samplesByChapter[chapter.id]" :key="`${chapter.id}-${sample.image}`">
                <img :src="sample.image" :alt="`نمونهٔ تصویری مرتبط با ${sample.service}`" loading="lazy" decoding="async">
                <figcaption>{{ sample.service }}<time v-if="formatDate(sample.date)" :datetime="sample.date">{{ formatDate(sample.date) }}</time></figcaption>
              </figure>
            </div>
          </article>

          <div class="building-story-end">
            <span class="building-story-kicker" dir="ltr">NEXT STEP</span>
            <h3>برای پروژهٔ خودتان مسیر مناسب را پیدا کنید.</h3>
            <p>نیاز پروژه را مطرح کنید تا دامنهٔ خدمات موردنیاز بررسی شود.</p>
            <div>
              <a class="building-end-action building-end-action--primary" href="#/contact">درخواست مشاوره <span aria-hidden="true">↗</span></a>
              <a class="building-end-action" href="#/services">مرور همهٔ خدمات</a>
            </div>
          </div>
        </div>
      </div>
      <p class="building-live-status" aria-live="polite" aria-atomic="true">{{ currentChapter ? `بخش فعال: ${currentChapter.title}` : 'ابتدای مسیر خدمات' }}</p>
      <span class="sr-only">در این صفحه {{ uniqueCatalogCount.toLocaleString('fa-IR') }} عنوان خدمت از فهرست سایت و یک مورد تکمیلی نمایش داده می‌شود.</span>
    </section>
  </div>
</template>

<style scoped>
.building-explorer-page { padding-bottom: var(--space-16); }
.building-explorer-page > :deep(.page-intro) { padding-top: var(--space-8); padding-bottom: var(--space-6); }
.building-explorer-page > :deep(.page-intro-row) { align-items: center; gap: clamp(var(--space-6), 4vw, var(--space-12)); }
.building-explorer-page > :deep(.page-intro h1) { margin-top: var(--space-2); font-size: clamp(2.25rem, 4.1vw, 3.5rem); line-height: 1.28; }
.building-story { display: grid; gap: var(--space-6); padding-bottom: var(--space-16); }
.building-story-kicker, .building-model-index, .building-chapter-english { color: var(--text-subtle); font: 500 var(--text-caption)/1.5 var(--font-mono); letter-spacing: .08em; }
.building-story-layout { display: grid; grid-template-columns: minmax(0, 1.04fr) minmax(330px, .86fr); align-items: start; gap: clamp(var(--space-6), 4vw, var(--space-12)); direction: rtl; }
.building-visual-column { position: sticky; top: 128px; align-self: start; min-width: 0; }
.building-model-card { overflow: hidden; border: 1px solid var(--border-subtle); background: var(--surface-paper); box-shadow: 0 14px 40px rgba(23, 57, 43, .045); }
.building-model-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); padding: var(--space-5) var(--space-5) 0; }
.building-model-heading h3 { margin: var(--space-1) 0 0; color: var(--brand-forest); font-size: var(--text-card-title); font-weight: 600; }
.building-model-status { display: inline-flex; align-items: center; gap: var(--space-2); max-width: 48%; padding-top: var(--space-1); color: var(--text-secondary); font-size: var(--text-caption); line-height: 1.5; text-align: left; }
.building-model-status i { flex: 0 0 auto; width: 7px; height: 7px; border-radius: 50%; background: var(--brand-green); box-shadow: 0 0 0 3px var(--surface-mint); }
.building-stage { position: relative; display: grid; place-items: center; overflow: hidden; padding: var(--space-2) var(--space-3) 0; background: var(--surface-ivory); }
.building-svg { display: block; width: min(100%, 540px); height: min(62vh, 520px); overflow: visible; touch-action: pan-y; }
.building-svg :deep(path), .building-svg :deep(circle) { vector-effect: non-scaling-stroke; }
.building-layer { cursor: pointer; transform: translate(var(--explode-x, 0px), var(--explode-y, 0px)); transform-box: fill-box; transform-origin: center; transition: opacity var(--duration-standard) var(--ease-standard), filter var(--duration-standard) var(--ease-standard); outline: none; }
.building-layer.is-dimmed { opacity: .52; }
.building-layer.is-active { opacity: 1; filter: drop-shadow(var(--shadow-building-active)); }
.building-layer:focus-visible { filter: drop-shadow(0 0 3px var(--focus-ring)); }
.building-diagram-caption { position: absolute; right: var(--space-4); bottom: var(--space-3); max-width: calc(100% - var(--space-8)); margin: 0; padding: var(--space-1) var(--space-2); background: var(--surface-building-caption); color: var(--text-secondary); font-size: var(--text-caption); line-height: 1.6; }

/* Anatomy SVG shades are mapped onto Arcpol's existing palette. */
.anatomy-figure { --anatomy-page: var(--surface-ivory); --anatomy-card: var(--surface-paper); --anatomy-text: var(--text-secondary); --anatomy-strong: var(--text-primary); --anatomy-muted: var(--text-subtle); --anatomy-paper: var(--surface-soft); --anatomy-face: var(--surface-paper); --anatomy-top: var(--surface-paper); --anatomy-shade-0: var(--border-strong); --anatomy-shade-1: var(--brand-sage); --anatomy-shade-2: var(--surface-soft); --anatomy-shade-3: var(--surface-paper); --anatomy-hi: var(--brand-forest); --anatomy-mid: var(--brand-green); --anatomy-lo: var(--text-secondary); --anatomy-faint: var(--border-subtle); --anatomy-lit: var(--brand-forest); --anatomy-dot: var(--brand-green); --anatomy-red: var(--status-danger); --anatomy-green: var(--brand-green); --anatomy-blue: var(--brand-green); --anatomy-weight: var(--building-line-fine); --anatomy-ease: var(--ease-standard); }
.building-svg :deep(.iso-fill) { fill: var(--anatomy-paper); stroke: none; }
.building-svg :deep(.iso-shade), .building-svg :deep(.iso-top) { stroke: none; }
.building-svg :deep(.iso-shade[data-shade="0"]) { fill: var(--anatomy-shade-0); }
.building-svg :deep(.iso-shade[data-shade="1"]) { fill: var(--anatomy-shade-1); }
.building-svg :deep(.iso-shade[data-shade="2"]) { fill: var(--anatomy-shade-2); }
.building-svg :deep(.iso-shade[data-shade="3"]) { fill: var(--anatomy-shade-3); }
.building-svg :deep(.iso-top) { fill: var(--anatomy-top); }
.building-svg :deep(.iso-line) { fill: none; stroke: var(--anatomy-mid); stroke-width: var(--anatomy-weight); stroke-linecap: round; stroke-linejoin: round; }
.building-svg :deep(.iso-line[data-tone="hi"]) { stroke: var(--anatomy-hi); }
.building-svg :deep(.iso-line[data-tone="lo"]) { stroke: var(--anatomy-lo); }
.building-svg :deep(.iso-line[data-tone="faint"]) { stroke: var(--anatomy-faint); }
.building-svg :deep(.iso-line[data-tone="blue"]) { stroke: var(--brand-green); }
.building-svg :deep(.iso-line[data-tone="green"]) { stroke: var(--brand-clay); }
.building-svg :deep(.iso-line[data-dotted]) { stroke-dasharray: 1 3; }
.building-svg :deep(.iso-dots circle) { fill: var(--anatomy-dot); stroke: none; opacity: .45; }
.building-svg :deep(.material-soil .iso-fill) { fill: var(--surface-soft); }
.building-svg :deep(.material-soil .iso-shade[data-shade="0"]) { fill: var(--border-strong); }
.building-svg :deep(.material-soil .iso-shade[data-shade="1"]) { fill: var(--brand-sage); }
.building-svg :deep(.material-excavation .iso-fill) { fill: var(--surface-mint); }
.building-svg :deep(.material-concrete .iso-fill), .building-svg :deep(.material-slab .iso-fill) { fill: var(--surface-soft); }
.building-svg :deep(.material-frame .iso-fill) { fill: var(--brand-sage); }
.building-svg :deep(.material-frame .iso-top) { fill: var(--surface-paper); }
.building-svg :deep(.material-frame .iso-shade[data-shade="0"]) { fill: var(--brand-green); }
.building-svg :deep(.material-facade .iso-fill), .building-svg :deep(.material-partition .iso-fill) { fill: var(--surface-ivory); }
.building-svg :deep(.material-glass .iso-fill) { fill: var(--surface-mint); fill-opacity: .64; }
.building-svg :deep(.material-glass .iso-top) { fill: var(--surface-paper); fill-opacity: .74; }
.building-svg :deep(.material-duct .iso-fill), .building-svg :deep(.material-equipment .iso-fill) { fill: var(--surface-mint); }
.building-svg :deep(.material-panel .iso-fill), .building-svg :deep(.material-light .iso-fill) { fill: var(--brand-sage); }
.building-svg :deep(.material-solar .iso-fill) { fill: var(--brand-forest); }
.building-svg :deep(.material-solar .iso-top) { fill: var(--brand-green); }
.building-svg :deep(.material-fitting .iso-fill) { fill: var(--brand-green); }
.building-svg :deep(.soil-strata) { stroke-width: var(--building-line-small); }
.building-svg :deep(.mechanical-pipe) { stroke-width: var(--building-line-strong); }
.building-svg :deep(.mechanical-pipe--return) { stroke-dasharray: 4 2; }
.building-svg :deep(.mechanical-drop), .building-svg :deep(.electrical-conduit) { stroke-width: var(--building-line-medium); }
.building-svg :deep(.electrical-conduit--branch) { stroke-dasharray: 2.2 1.6; }
.building-svg :deep(.solar-grid), .building-svg :deep(.equipment-seam) { stroke-width: var(--building-line-fine); }
.building-svg :deep(.slab-joint) { stroke-width: var(--building-line-fine); stroke-dasharray: 2 3; }

.building-story-progress { display: grid; gap: var(--space-2); padding: var(--space-4) var(--space-5) var(--space-5); }
.building-progress-copy { display: flex; justify-content: space-between; align-items: baseline; gap: var(--space-3); color: var(--text-subtle); font-size: var(--text-caption); }
.building-progress-copy strong { overflow: hidden; color: var(--text-secondary); font-size: var(--text-caption); font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }
.building-progress-track { height: 3px; overflow: hidden; background: var(--surface-soft); direction: rtl; }
.building-progress-track span { display: block; height: 100%; background: var(--brand-green); transition: width var(--duration-standard) var(--ease-standard); }
.building-accessibility-note { margin: var(--space-3) 0 0; color: var(--text-subtle); font-size: var(--text-small); line-height: var(--line-body); }

.building-chapters { display: grid; gap: clamp(var(--space-6), 8vh, var(--space-12)); min-width: 0; }
.building-chapter { position: relative; min-width: 0; min-height: 68svh; padding: clamp(var(--space-4), 3vw, var(--space-6)); border: 1px solid var(--border-subtle); background: var(--surface-paper); scroll-margin-top: 132px; transition: border-color var(--duration-standard) ease, box-shadow var(--duration-standard) ease, background var(--duration-standard) ease; }
.building-chapter.is-current { border-color: var(--brand-sage); box-shadow: 0 12px 32px rgba(23, 57, 43, .07); }
.building-chapter--start { display: flex; flex-direction: column; justify-content: center; min-height: 68svh; background: linear-gradient(155deg, var(--surface-paper) 8%, var(--surface-soft) 100%); }
.building-chapter-topline { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2); min-height: 30px; padding-bottom: var(--space-3); border-bottom: 1px solid var(--border-subtle); }
.building-chapter-index { color: var(--brand-green); font: 500 var(--text-small)/1.2 var(--font-mono); letter-spacing: .06em; }
.building-chapter-kind { padding-inline-start: var(--space-2); border-inline-start: 1px solid var(--border-strong); color: var(--text-secondary); font-size: var(--text-small); }
.building-chapter-count { margin-inline-start: auto; color: var(--text-subtle); font-size: var(--text-caption); }
.building-chapter-english { display: block; margin-top: var(--space-4); }
.building-chapter h3 { margin: var(--space-2) 0 var(--space-2); color: var(--brand-forest); font-size: clamp(1.2rem, 2vw, 1.65rem); font-weight: 600; line-height: 1.55; }
.building-chapter > p:not(.building-chapter-note):not(.building-no-services) { margin: 0; color: var(--text-secondary); font-size: var(--text-small); line-height: var(--line-reading); }
.building-scroll-cue { display: flex; align-items: center; gap: var(--space-2); margin-top: var(--space-8); color: var(--brand-forest); font-size: var(--text-small); }
.building-scroll-cue span { display: grid; width: 28px; height: 28px; place-items: center; border: 1px solid var(--border-strong); border-radius: 50%; color: var(--brand-green); font-size: var(--text-icon); }

.building-service-tree { display: grid; gap: var(--space-4); margin-top: var(--space-5); }
.building-service-branch { position: relative; padding-inline-start: var(--space-4); border-inline-start: 1px solid var(--border-strong); }
.building-service-branch::before { position: absolute; top: 9px; inset-inline-start: -4px; width: 7px; height: 7px; border-radius: 50%; background: var(--brand-green); content: ''; }
.building-service-branch h4 { margin: 0 0 var(--space-1); color: var(--brand-forest); font-size: var(--text-small); font-weight: 600; }
.building-service-branch ul { display: grid; margin: 0; padding: 0; list-style: none; }
.building-service-branch li { position: relative; border-bottom: 1px solid color-mix(in srgb, var(--border-subtle) 78%, transparent); }
.building-service-branch li::before { position: absolute; top: 50%; inset-inline-start: calc(-1 * var(--space-4)); width: var(--space-3); border-top: 1px solid var(--border-subtle); content: ''; }
.building-service-branch a { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); min-height: 38px; color: var(--text-secondary); font-size: var(--text-small); line-height: 1.6; text-decoration: none; }
.building-service-branch a:hover { color: var(--brand-forest); }
.building-service-arrow { flex: 0 0 auto; color: var(--brand-green); }
.building-service-branch a:focus-visible, .building-end-action:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 3px; }
.building-chapter-note { margin: var(--space-5) 0 0; padding: var(--space-3) var(--space-4); border-inline-start: 2px solid var(--brand-sage); background: var(--surface-soft); color: var(--text-secondary); font-size: var(--text-caption); line-height: var(--line-reading); }
.building-no-services { margin: var(--space-5) 0 0; color: var(--text-subtle); font-size: var(--text-small); }
.building-chapter-samples { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-2); margin-top: var(--space-4); }
.building-chapter-samples figure { display: grid; grid-template-columns: 96px minmax(0, 1fr); min-width: 0; margin: 0; border: 1px solid var(--border-subtle); background: var(--surface-paper); }
.building-chapter-samples img { width: 100%; height: 100%; min-height: 66px; object-fit: cover; background: var(--surface-soft); }
.building-chapter-samples figcaption { display: grid; align-content: center; gap: var(--space-1); padding: var(--space-2); color: var(--text-secondary); font-size: var(--text-caption); line-height: 1.5; }
.building-chapter-samples time { color: var(--text-subtle); }
.building-story-end { padding: clamp(var(--space-5), 4vw, var(--space-8)); background: var(--brand-forest); color: var(--text-inverse); }
.building-story-end .building-story-kicker { color: var(--brand-sage); }
.building-story-end h3 { margin: var(--space-2) 0; color: var(--text-inverse); font-size: var(--text-section-title); font-weight: 600; }
.building-story-end p { margin: 0; color: color-mix(in srgb, var(--text-inverse) 78%, transparent); font-size: var(--text-small); line-height: var(--line-reading); }
.building-story-end > div { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-5); }
.building-end-action { display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2); min-height: 44px; padding: 0 var(--space-4); border: 1px solid rgba(255,255,255,.38); color: var(--text-inverse); font-size: var(--text-small); }
.building-end-action--primary { border-color: var(--surface-paper); background: var(--surface-paper); color: var(--brand-forest); }
.building-end-action:hover { border-color: var(--surface-paper); background: var(--surface-mint); color: var(--brand-forest); }
.building-live-status, .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

@media (max-width: 900px) {
  .building-story-layout { grid-template-columns: minmax(0, 1fr) minmax(290px, .92fr); gap: var(--space-4); }
  .building-visual-column { top: 122px; }
  .building-svg { height: min(56vh, 470px); }
}
@media (max-width: 720px) {
  .building-explorer-page > :deep(.page-intro) { padding-top: var(--space-4); padding-bottom: var(--space-4); }
  .building-explorer-page > :deep(.page-intro-row) { gap: var(--space-2); }
  .building-explorer-page > :deep(.page-intro h1) { margin-top: var(--space-2); font-size: clamp(2rem, 8.5vw, 2.7rem); line-height: 1.35; }
  .building-story { gap: var(--space-4); }
  .building-story-layout { grid-template-columns: minmax(0, 1fr); gap: var(--space-4); }
  .building-visual-column { top: 120px; z-index: 5; }
  .building-visual-column.is-compact { min-height: 350px; pointer-events: none; }
  .building-visual-column.is-compact .building-model-card { pointer-events: auto; }
  .building-model-card { background: color-mix(in srgb, var(--surface-paper) 97%, transparent); box-shadow: 0 8px 24px rgba(23,57,43,.08); }
  .building-model-heading { padding: var(--space-3) var(--space-4) 0; }
  .building-stage { padding-inline: var(--space-2); }
  .building-svg { width: auto; height: min(24vh, 190px); }
  .building-diagram-caption { right: var(--space-3); bottom: var(--space-2); max-width: calc(100% - var(--space-6)); font-size: 9px; }
  .building-story-progress { padding: var(--space-2) var(--space-4) var(--space-3); }
  .building-accessibility-note { display: none; }
  .building-visual-column.is-compact .building-model-card { display: grid; grid-template-columns: 104px minmax(0, 1fr); grid-template-rows: 1fr 1fr; align-items: center; }
  .building-visual-column.is-compact .building-model-heading { grid-column: 2; grid-row: 1; align-items: center; padding: var(--space-2) var(--space-3) 0; }
  .building-visual-column.is-compact .building-model-heading h3 { font-size: var(--text-small); }
  .building-visual-column.is-compact .building-stage { grid-column: 1; grid-row: 1 / 3; height: 132px; padding: 0; }
  .building-visual-column.is-compact .building-svg { height: 132px; }
  .building-visual-column.is-compact .building-diagram-caption { display: none; }
  .building-visual-column.is-compact .building-story-progress { grid-column: 2; grid-row: 2; padding: 0 var(--space-3) var(--space-2); }
  .building-chapters { gap: var(--space-4); }
  .building-chapter, .building-chapter--start { min-height: 58svh; padding: var(--space-4); scroll-margin-top: 400px; }
  .building-chapter-samples { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 420px) {
  .building-chapter-count { width: 100%; margin-inline-start: 0; }
  .building-chapter-samples figure { grid-template-columns: 84px minmax(0, 1fr); }
  .building-end-action { flex: 1 1 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .building-layer, .building-chapter, .building-progress-track span { transition-duration: var(--motion-reduced-duration); }
}
</style>
