<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import BuildingScene from './BuildingScene.vue'
import BuildingServiceFinder from './BuildingServiceFinder.vue'
import { buildingSystems, wholeProjectChapter, constructionCopy } from './building-content.js'
import { constructionOrder, progressAtLine } from './building-timeline.js'
import { useBuildingServices } from './use-building-services.js'
import { normalizeServiceText, serviceDetailHref } from './building-service-map.js'
import { describeService } from '../../service-details.js'
import { serviceDescriptionsEn, serviceGroupsEn, serviceNamesEn } from '../../i18n/services-en.js'
import { buildingChapterEn, buildingUiEn } from '../../i18n/building-en.js'
import { formatNumber, localizeDigits, numberLocale } from '../../i18n/numbers.js'

const props = defineProps({ serviceGroups: { type: Array, required: true }, additionalServices: { type: Array, required: true }, projects: { type: Array, default: () => [] }, initialService: { type: String, default: '' }, locale: { type: String, default: 'fa' } })
const isEnglish = computed(() => props.locale === 'en')
const localize = (value) => localizeDigits(value, props.locale)
const chapters = computed(() => constructionOrder.map((id) => {
  const chapter = { ...[...buildingSystems, wholeProjectChapter].find((item) => item.id === id), ...constructionCopy[id] }
  const localizedChapter = isEnglish.value ? { ...chapter, ...(buildingChapterEn[id] || {}) } : chapter
  return {
    ...localizedChapter,
    label: localize(localizedChapter.label),
    shortLabel: localize(localizedChapter.shortLabel),
    title: localize(localizedChapter.title),
    description: localize(localizedChapter.description),
    note: localize(localizedChapter.note),
    elements: (localizedChapter.elements || []).map(localize),
  }
}))
const { serviceCatalog, serviceEntriesByChapter, branchesByChapter, samplesByChapter } = useBuildingServices(props, chapters)
const serviceFinder = ref(null)
const serviceCount = computed(() => serviceCatalog.value.filter((service) => !service.supplemental).length)
const selectedServiceName = ref('')
const selectedService = computed(() => serviceCatalog.value.find((service) => service.name === selectedServiceName.value))
const selectedChapterId = ref('')
const highlightedStages = computed(() => selectedService.value
  ? (selectedService.value.projectWide ? constructionOrder : selectedService.value.chapterIds).map((id) => constructionOrder.indexOf(id) + 1)
  : selectedChapterId.value ? [constructionOrder.indexOf(selectedChapterId.value) + 1] : [])
const selectedChapters = computed(() => chapters.value.filter((chapter) => selectedService.value?.chapterIds.includes(chapter.id)))
let mounted = false
const chapterElements = ref([])
const visualElement = ref(null)
const storyElement = ref(null)
const progress = ref(0)
const reducedMotion = ref(false)
const stickyTop = ref(96)
const activeStep = computed(() => Math.min(8, Math.ceil(progress.value - 0.015)))
const currentChapter = computed(() => chapters.value[activeStep.value - 1])
const percentage = computed(() => Math.round(progress.value / 8 * 100))
let frame = 0
let motionQuery
let resizeObserver
function focusLine() {
  if (window.innerWidth > 760) return stickyTop.value + Math.min(140, (window.innerHeight - stickyTop.value) * 0.25)
  if (window.innerHeight <= 600) return window.innerHeight * 0.35
  const bottom = stickyTop.value + (visualElement.value?.offsetHeight || 320)
  return Math.min(window.innerHeight - 40, bottom + Math.max(30, (window.innerHeight - bottom) * 0.32))
}
function anchor(element) {
  const rect = element.getBoundingClientRect()
  return rect.top + Math.min(rect.height * 0.22, 100)
}
function updateScroll() {
  if (frame) return
  frame = requestAnimationFrame(() => { frame = 0; progress.value = progressAtLine(chapterElements.value.filter(Boolean).map(anchor), focusLine()) })
}
function updateLayout() {
  stickyTop.value = (document.querySelector('.site-header')?.getBoundingClientRect().height || 82) + (window.innerWidth <= 760 ? 0 : 12)
  updateScroll()
}
function goToStage(index) {
  const element = chapterElements.value[index]
  if (element) window.scrollTo({ top: window.scrollY + anchor(element) - focusLine() + 2, behavior: reducedMotion.value ? 'instant' : 'smooth' })
}
function handleMotionChange(event) { reducedMotion.value = event.matches; updateScroll() }
const serviceHref = (service) => {
  const href = serviceDetailHref(service)
  return isEnglish.value ? `${href}${href.includes('?') ? '&' : '?'}lang=en` : href
}
const serviceLabel = (service) => localize(isEnglish.value ? serviceNamesEn[service.name] || service.name : service.name)
const serviceLanguage = (service) => isEnglish.value && serviceNamesEn[service.name] ? 'en' : 'fa'
const serviceCategoryLabel = (service) => localize(isEnglish.value ? serviceGroupsEn[service.categoryId]?.title || service.categoryTitle : service.categoryTitle)
const serviceDescription = (service) => localize(isEnglish.value ? serviceDescriptionsEn[service.name] || 'See the service catalogue for its scope and project-specific details.' : describeService(service.name))
async function showStageServices(index, keepService = false) {
  if (!keepService) selectedServiceName.value = ''
  selectedChapterId.value = constructionOrder[index - 1]
  await nextTick()
  const chapter = chapterElements.value[index]
  const details = chapter?.querySelector('details')
  if (details) details.open = true
  await nextTick()
  goToStage(index)
  chapter?.querySelector('h2')?.focus({ preventScroll: true })
}
function selectService(service, chapterId) {
  selectedServiceName.value = service.name
  const destination = chapterId && service.chapterIds.includes(chapterId) ? chapterId : service.chapterIds[0]
  showStageServices(constructionOrder.indexOf(destination) + 1, true)
}
function selectServiceFromRoute() {
  if (!mounted || !props.initialService) return
  const service = serviceCatalog.value.find((entry) => normalizeServiceText(entry.name) === normalizeServiceText(props.initialService))
  if (service) selectService(service)
}
watch(() => props.initialService, selectServiceFromRoute)
function formatDate(value) {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? new Intl.DateTimeFormat(isEnglish.value ? 'en-GB-u-nu-latn' : numberLocale(props.locale), { dateStyle: 'medium', timeZone: 'Asia/Tehran' }).format(new Date(parsed)) : ''
}
onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.value = motionQuery.matches
  motionQuery.addEventListener('change', handleMotionChange)
  window.addEventListener('scroll', updateScroll, { passive: true })
  window.addEventListener('resize', updateLayout, { passive: true })
  resizeObserver = new ResizeObserver(updateLayout)
  for (const element of [storyElement.value, visualElement.value, ...chapterElements.value, document.querySelector('.site-header')]) if (element) resizeObserver.observe(element)
  updateLayout()
  mounted = true
  selectServiceFromRoute()
})
onUnmounted(() => {
  mounted = false
  cancelAnimationFrame(frame)
  window.removeEventListener('scroll', updateScroll)
  window.removeEventListener('resize', updateLayout)
  motionQuery?.removeEventListener('change', handleMotionChange)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="building-explorer-page" :lang="isEnglish ? 'en' : 'fa'" :dir="isEnglish ? 'ltr' : 'rtl'" :style="{ '--building-sticky-top': `${stickyTop}px` }">
    <header class="building-intro page-container">
      <div><span class="building-eyebrow">{{ isEnglish ? buildingUiEn.eyebrow : 'ساختمان تعاملی' }}</span><h1>{{ isEnglish ? buildingUiEn.title : 'از زمین، تا یک ساختمان کامل.' }}</h1></div>
      <div class="building-intro-description"><p>{{ isEnglish ? buildingUiEn.intro.replace('{count}', formatNumber(serviceCount, locale)) : `پایین بروید تا ساختمان ساخته شود، یا از میان ${formatNumber(serviceCount, locale)} خدمت انتخاب کنید و جای آن را روی ساختمان ببینید.` }}</p><button type="button" class="building-text-button" @click="goToStage(8)">{{ isEnglish ? buildingUiEn.complete : 'دیدن ساختمان کامل' }} <span aria-hidden="true">↙</span></button></div>
    </header>
    <section ref="storyElement" class="building-story page-container" :aria-label="isEnglish ? 'Construction stages shown as you scroll' : 'ساخت مرحله‌به‌مرحلهٔ ساختمان با اسکرول'">
      <aside ref="visualElement" class="building-visual-column" :aria-label="isEnglish ? '3D building model and construction stages' : 'نمای سه‌بعدی و مراحل ساخت'">
        <button type="button" class="building-service-launcher" aria-haspopup="dialog" @click="serviceFinder.open()"><span>{{ isEnglish ? buildingUiEn.serviceLauncher : 'خدمات روی ساختمان' }}</span><span>{{ formatNumber(serviceCount, locale) }} {{ isEnglish ? 'services' : 'خدمت' }} <span aria-hidden="true">⌕</span></span></button>
        <BuildingScene :progress="progress" :reduced-motion="reducedMotion" :locale="locale" :label="currentChapter?.label || (isEnglish ? 'Starting site' : 'زمین؛ نقطهٔ شروع')" :highlighted-stages="highlightedStages" @select-stage="showStageServices" />
        <div class="building-timeline">
          <div class="building-progress-copy"><span>{{ percentage === 100 ? (isEnglish ? buildingUiEn.modelComplete : 'ساختمان کامل شد') : (isEnglish ? buildingUiEn.modelProgress : 'پیشرفت ساخت مدل') }}</span><strong>{{ formatNumber(percentage, locale) }}<span>{{ isEnglish ? '%' : '٪' }}</span></strong></div>
          <div class="building-progress-track" role="progressbar" :aria-valuenow="percentage" aria-valuemin="0" aria-valuemax="100" :aria-label="isEnglish ? buildingUiEn.progressLabel : 'پیشرفت ساخت مدل مفهومی'"><span :style="{ transform: `scaleX(${percentage / 100})`, transformOrigin: isEnglish ? 'left' : 'right' }"></span></div>
          <nav class="building-stage-navigation" :aria-label="isEnglish ? buildingUiEn.directStage : 'انتخاب مستقیم مرحلهٔ ساخت'">
            <button v-for="(chapter, index) in chapters" :key="chapter.id" type="button" :class="{ 'is-complete': progress >= index + 1, 'is-service-related': selectedService?.chapterIds.includes(chapter.id) || selectedService?.projectWide }" :aria-current="activeStep === index + 1 ? 'step' : undefined" :aria-label="`${isEnglish ? 'Stage' : 'مرحلهٔ'} ${formatNumber(index + 1, locale)}: ${chapter.label}`" :title="chapter.label" @click="goToStage(index + 1)"><span class="building-stage-number">{{ formatNumber(index + 1, locale) }}</span><span class="building-stage-short">{{ chapter.shortLabel }}</span></button>
          </nav>
        </div>
      </aside>
      <div class="building-chapters">
        <section :ref="(el) => chapterElements[0] = el" class="building-chapter building-chapter--start" aria-labelledby="building-start-title">
          <span class="building-chapter-number" aria-hidden="true">{{ localize('00') }}</span><h2 id="building-start-title" style="white-space: pre-line">{{ localize(isEnglish ? buildingUiEn.startTitle : 'همه‌چیز از زمین\nشروع می‌شود.') }}</h2>
          <p>{{ localize(isEnglish ? buildingUiEn.startDescription : 'فعلاً فقط زمین را می‌بینید. کمی پایین‌تر بروید؛ پی در جای خود شکل می‌گیرد و ساختمان، مرحله‌به‌مرحله قد می‌کشد.') }}</p>
          <div class="building-start-facts"><span v-for="fact in (isEnglish ? buildingUiEn.facts : ['۵ طبقه', '۸ مرحله', 'دید ۳۶۰ درجه'])" :key="fact">{{ localize(fact) }}</span></div>
          <button type="button" class="building-start-action" @click="goToStage(1)"><span>{{ isEnglish ? buildingUiEn.start : 'شروع ساخت' }}</span><span aria-hidden="true">↓</span></button>
          <p class="building-order-note">{{ isEnglish ? buildingUiEn.simplified : 'روایت ساده‌شدهٔ ساخت برای آشنایی با اجزای ساختمان' }}</p>
        </section>
        <article v-for="(chapter, index) in chapters" :key="chapter.id" :ref="(el) => chapterElements[index + 1] = el" class="building-chapter" :class="{ 'is-current': activeStep === index + 1, 'building-chapter--delivery': chapter.id === 'delivery' }" :aria-labelledby="`building-chapter-title-${chapter.id}`" :data-stage="index + 1">
          <div class="building-chapter-topline"><span class="building-chapter-number">{{ localize(String(index + 1).padStart(2, '0')) }}</span><span>{{ chapter.label }}</span></div>
          <h2 :id="`building-chapter-title-${chapter.id}`" tabindex="-1">{{ chapter.title }}</h2><p>{{ chapter.description }}</p>
          <section v-if="selectedService && selectedChapterId === chapter.id" class="building-selected-service" :aria-label="isEnglish ? buildingUiEn.selectedRelation : 'ارتباط خدمت انتخاب‌شده با ساختمان'">
            <div class="building-selected-heading"><span>{{ serviceCategoryLabel(selectedService) }}</span><button type="button" :aria-label="isEnglish ? buildingUiEn.clearSelection : 'پاک‌کردن خدمت انتخاب‌شده'" @click="selectedServiceName = ''; selectedChapterId = ''">×</button></div>
            <h3 :lang="serviceLanguage(selectedService)" dir="auto">{{ serviceLabel(selectedService) }}</h3><p>{{ serviceDescription(selectedService) }}</p>
            <p v-if="selectedService.projectWide" class="building-service-scope">{{ isEnglish ? buildingUiEn.projectWide : 'این خدمت به کل پروژه مربوط است و می‌تواند در چند مرحله همراه پروژه باشد؛ به محوطه یا پایان ساخت محدود نیست.' }}</p>
            <p v-else class="building-service-scope">{{ isEnglish ? buildingUiEn.selectedPart : 'بخش‌های مرتبط در مدل مشخص شده‌اند. برای دیدن هر بخش، آن را انتخاب کنید.' }}</p>
            <div v-if="!selectedService.projectWide" class="building-related-stages"><button v-for="related in selectedChapters" :key="related.id" type="button" :aria-pressed="selectedChapterId === related.id" @click="selectService(selectedService, related.id)">{{ localize(related.id === 'delivery' ? (isEnglish ? buildingUiEn.wholeProjectDocs : 'کل پروژه و مدارک') : related.label) }}</button></div>
            <a :href="serviceHref(selectedService)">{{ isEnglish ? buildingUiEn.details : 'جزئیات' }} {{ serviceLabel(selectedService) }} <span aria-hidden="true">↗</span></a>
          </section>
          <ul class="building-assembly-list" :aria-label="isEnglish ? buildingUiEn.components : 'اجزایی که در این مرحله ساخته می‌شوند'"><li v-for="item in chapter.elements" :key="item"><span aria-hidden="true"></span>{{ item }}</li></ul>
          <details v-if="branchesByChapter[chapter.id]?.length" class="building-services" open @toggle="updateScroll">
            <summary><span>{{ localize(chapter.id === 'delivery' ? (isEnglish ? buildingUiEn.wholeProjectDocs : 'خدمات کل پروژه و همراهی کارفرما') : (isEnglish ? buildingUiEn.serviceSection : 'خدمات این بخش ساختمان')) }}</span><span>{{ formatNumber((serviceEntriesByChapter[chapter.id] || []).length, locale) }} <span aria-hidden="true">＋</span></span></summary>
            <p v-if="chapter.id === 'delivery'" class="building-project-services-note">{{ isEnglish ? buildingUiEn.projectNote : 'نظارت، مدیریت، مشاوره و همکاری کلان می‌توانند در سراسر مسیر پروژه جریان داشته باشند.' }}</p>
            <div class="building-service-tree"><div v-for="branch in branchesByChapter[chapter.id]" :key="branch.id" class="building-service-branch"><h3>{{ localize(isEnglish ? serviceGroupsEn[branch.id]?.title || branch.title : branch.title) }}</h3><ul><li v-for="service in branch.items" :key="service.name" :class="{ 'is-selected-service': selectedService?.name === service.name }"><button type="button" class="building-service-select" :aria-label="isEnglish ? `Show ${serviceLabel(service)} on the building` : `نمایش ${serviceLabel(service)} روی ساختمان`" :aria-pressed="selectedService?.name === service.name" @click="selectService(service, chapter.id)" :lang="serviceLanguage(service)" dir="auto">{{ serviceLabel(service) }}</button><a :href="serviceHref(service)" :aria-label="isEnglish ? `${buildingUiEn.details}: ${serviceLabel(service)}` : `جزئیات ${serviceLabel(service)}`" :title="isEnglish ? buildingUiEn.details : 'جزئیات خدمت'"><span aria-hidden="true">↗</span></a></li></ul></div></div>
          </details>
          <div v-if="samplesByChapter[chapter.id]?.length" class="building-chapter-samples" :aria-label="isEnglish ? buildingUiEn.fieldEvidence : 'شاهد تصویری مرتبط از گزارش‌های کارگاهی'">
            <figure v-for="sample in samplesByChapter[chapter.id].slice(0, 1)" :key="sample.image"><img :src="sample.image" :alt="isEnglish ? `Verified field-report photo related to ${serviceLabel({ name: sample.service })}` : `نمونهٔ واقعی مرتبط با ${sample.service}`" loading="lazy" decoding="async" width="104" height="80"><figcaption><span>{{ isEnglish ? buildingUiEn.fromReports : 'از گزارش‌های کارگاهی' }}</span><span :lang="serviceNamesEn[sample.service] && isEnglish ? 'en' : 'fa'" dir="auto">{{ serviceLabel({ name: sample.service }) }}</span><time v-if="formatDate(sample.date)" :datetime="sample.date">{{ formatDate(sample.date) }}</time></figcaption></figure>
          </div>
          <p class="building-chapter-note">{{ chapter.note }}</p>
          <button v-if="index < chapters.length - 1" type="button" class="building-text-button building-next-stage" @click="goToStage(index + 2)">{{ isEnglish ? buildingUiEn.next : 'مرحلهٔ بعد: ' }}{{ chapters[index + 1].label }} <span aria-hidden="true">↓</span></button>
          <div v-else class="building-complete-actions"><a :href="isEnglish ? '/contact?lang=en' : '/contact'" class="button button-dark">{{ isEnglish ? buildingUiEn.contact : 'دربارهٔ پروژهٔ شما صحبت کنیم' }}</a><button type="button" class="building-text-button" @click="goToStage(0)">{{ isEnglish ? buildingUiEn.restart : 'ساختن از ابتدا' }} <span aria-hidden="true">↻</span></button></div>
        </article>
      </div>
    </section>
    <p class="sr-only" :lang="isEnglish ? 'en' : 'fa'" role="status" aria-live="polite" aria-atomic="true">{{ currentChapter ? (isEnglish ? buildingUiEn.liveStatus.replace('{number}', formatNumber(activeStep, locale)).replace('{label}', currentChapter.label) : `مرحلهٔ ${formatNumber(activeStep, locale)}: ${currentChapter.label}`) : (isEnglish ? buildingUiEn.startStatus : 'ابتدای مسیر؛ زمین آمادهٔ ساخت') }}</p>
    <BuildingServiceFinder ref="serviceFinder" :services="serviceCatalog" :chapters="chapters" :locale="locale" @select="selectService" />
    <footer class="building-outro page-container"><p>{{ isEnglish ? buildingUiEn.outro : 'یک ساختمان؛ حاصل هماهنگی همهٔ رشته‌ها.' }}</p><a :href="isEnglish ? '/services?lang=en' : '/services'">{{ isEnglish ? buildingUiEn.allServices : 'مرور تمام خدمات ارک پل' }} <span aria-hidden="true">↗</span></a></footer>
  </div>
</template>

<style scoped>
.building-explorer-page { padding-bottom: var(--space-12); }
.building-intro { display: flex; align-items: end; justify-content: space-between; gap: var(--space-12); padding-block: var(--space-8); }
.building-eyebrow { color: var(--brand-green); font-size: var(--text-small); }
.building-intro h1 { margin: var(--space-2) 0 0; color: var(--brand-forest); font-size: var(--building-title-size); font-weight: 500; line-height: 1.5; letter-spacing: -.045em; }
.building-intro-description { max-width: 24rem; }
.building-intro-description p { margin: 0; color: var(--text-secondary); font-size: var(--text-small); line-height: var(--line-reading); }
.building-text-button { display: inline-flex; align-items: center; gap: var(--space-3); min-height: 44px; padding: var(--space-2) 0; border: 0; background: transparent; color: var(--brand-forest); font: inherit; font-size: var(--text-small); cursor: pointer; }
.building-text-button:hover { color: var(--brand-green); text-decoration: underline; text-underline-offset: var(--space-1); }
.building-story { display: grid; grid-template-columns: minmax(270px, .72fr) minmax(0, 1.5fr); column-gap: clamp(var(--space-6), 4vw, var(--space-16)); align-items: start; }
.building-visual-column { grid-column: 2; grid-row: 1; position: sticky; top: var(--building-sticky-top); min-width: 0; }
.building-chapters { grid-column: 1; grid-row: 1; min-width: 0; }
.building-service-launcher { display: flex; width: 100%; align-items: center; justify-content: space-between; gap: var(--space-3); min-height: 48px; padding: var(--space-2) var(--space-4); border: 1px solid var(--brand-forest); background: var(--brand-forest); color: var(--text-inverse); font: inherit; font-size: var(--text-small); cursor: pointer; }
.building-service-launcher:hover { background: var(--brand-forest-deep); }
.building-service-launcher > span:last-child { display: flex; align-items: center; gap: var(--space-3); }
.building-stage-navigation button.is-service-related { box-shadow: inset 0 -2px var(--brand-green); }
.building-selected-service { margin-block: var(--space-6); padding: var(--space-4); border: 1px solid var(--border-strong); background: var(--surface-mint); }
.building-selected-heading { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); color: var(--brand-green); font-size: var(--text-small); }
.building-selected-heading button { flex: 0 0 44px; width: 44px; min-height: 44px; border: 0; background: transparent; color: var(--brand-forest); font: inherit; font-size: var(--text-record-title); cursor: pointer; }
.building-selected-service h3 { margin: var(--space-2) 0; font-size: var(--text-card-title); font-weight: 500; color: var(--brand-forest); }
.building-chapter .building-selected-service p { font-size: var(--text-small); }
.building-chapter .building-selected-service .building-service-scope { margin-top: var(--space-3); }
.building-related-stages { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-3); }
.building-related-stages button { min-height: 44px; padding: var(--space-2) var(--space-3); border: 1px solid var(--border-strong); background: var(--surface-paper); color: var(--brand-forest); font: inherit; font-size: var(--text-small); cursor: pointer; }
.building-related-stages button[aria-pressed=true] { background: var(--brand-forest); color: var(--text-inverse); }
.building-selected-service > a { display: inline-flex; align-items: center; gap: var(--space-3); min-height: 44px; margin-top: var(--space-3); color: var(--brand-forest); font-size: var(--text-small); text-decoration: underline; text-underline-offset: var(--space-1); }
.building-chapter .building-project-services-note { margin-bottom: var(--space-3); font-size: var(--text-small); }
.building-timeline { padding: var(--space-3) var(--space-4) 0; background: var(--surface-ivory); }
.building-progress-copy { display: flex; align-items: baseline; justify-content: space-between; color: var(--text-secondary); font-size: var(--text-small); }
.building-progress-copy strong { color: var(--brand-forest); font-size: var(--text-card-title); font-weight: 500; }
.building-progress-copy strong span { font-size: var(--text-small); margin-inline-start: var(--space-1); }
.building-progress-track { height: 2px; margin-top: var(--space-2); background: var(--border-subtle); overflow: hidden; }
.building-progress-track > span { display: block; height: 100%; background: var(--brand-green); transform-origin: right; }
.building-stage-navigation { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); margin-top: var(--space-2); }
.building-stage-navigation button { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--space-1); min-width: 0; min-height: 50px; padding: var(--space-1) 0; border: 0; background: transparent; color: var(--text-secondary); font: inherit; cursor: pointer; }
.building-stage-number { display: grid; place-items: center; width: var(--space-6); height: var(--space-6); font-size: var(--text-small); border-radius: 50%; }
.building-stage-short { font-size: var(--text-caption); }
.building-stage-navigation button[aria-current=step] { color: var(--brand-forest); }
.building-stage-navigation button[aria-current=step] .building-stage-number { background: var(--brand-forest); color: var(--text-inverse); }
.building-stage-navigation button.is-complete:not([aria-current=step]) .building-stage-number { background: var(--surface-mint); color: var(--brand-forest); }
.building-stage-navigation button:hover { background: var(--surface-mint); }
.building-explorer-page :is(button, a, summary):focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 4px; }
.building-chapter { min-height: 88svh; padding: var(--space-12) 0 var(--space-16); border-top: 1px solid var(--border-subtle); }
.building-chapter--start { display: flex; flex-direction: column; justify-content: center; min-height: 75svh; padding-top: var(--space-6); border-top: 0; }
.building-chapter-number { color: var(--brand-sage); font-size: var(--building-step-size); font-weight: 400; line-height: 1.2; }
.building-chapter-topline { display: flex; align-items: center; gap: var(--space-4); margin-bottom: var(--space-6); color: var(--text-secondary); font-size: var(--text-small); }
.building-chapter h2 { margin: var(--space-4) 0; color: var(--brand-forest); font-size: var(--building-chapter-title); font-weight: 500; line-height: 1.6; letter-spacing: -.03em; }
.building-chapter p { margin: 0; color: var(--text-secondary); font-size: var(--text-body); line-height: var(--line-reading); }
.building-chapter--start h2 { margin-top: var(--space-6); }
.building-start-facts { display: flex; flex-wrap: wrap; gap: var(--space-4); margin-block: var(--space-6); color: var(--brand-green); font-size: var(--text-small); }
.building-start-facts span + span { border-inline-start: 1px solid var(--border-strong); padding-inline-start: var(--space-4); }
.building-start-action { display: flex; align-items: center; justify-content: space-between; min-height: 56px; padding: var(--space-4); border: 1px solid var(--border-strong); color: var(--brand-forest); background: transparent; font: inherit; cursor: pointer; }
.building-start-action:hover { background: var(--surface-mint); }
.building-chapter .building-order-note { margin-top: var(--space-3); font-size: var(--text-caption); }
.building-assembly-list { list-style: none; padding: 0; margin: var(--space-6) 0; display: grid; gap: var(--space-3); }
.building-assembly-list li { display: flex; align-items: center; gap: var(--space-3); color: var(--text-primary); font-size: var(--text-small); }
.building-assembly-list li > span { width: var(--space-2); height: var(--space-2); border: 1px solid var(--brand-green); background: var(--surface-mint); }
.building-services { margin-top: var(--space-6); border-block: 1px solid var(--border-subtle); }
.building-services summary { display: flex; justify-content: space-between; align-items: center; gap: var(--space-2); min-height: 52px; color: var(--brand-forest); font-size: var(--text-small); cursor: pointer; list-style: none; }
.building-services summary::-webkit-details-marker { display: none; }
.building-services summary > span:last-child { display: flex; gap: var(--space-4); color: var(--text-secondary); }
.building-services[open] summary > span:last-child > span { transform: rotate(45deg); }
.building-service-tree { padding-bottom: var(--space-4); }
.building-service-branch h3 { margin: var(--space-4) 0 var(--space-2); color: var(--brand-green); font-size: var(--text-small); font-weight: 500; }
.building-service-branch ul { list-style: none; margin: 0; padding: 0 var(--space-3) 0 0; border-inline-start: 1px solid var(--border-strong); }
.building-service-branch a { display: flex; justify-content: space-between; align-items: center; gap: var(--space-2); min-height: 44px; padding: var(--space-2) 0; color: var(--text-primary); font-size: var(--text-small); line-height: var(--line-body); }
.building-service-branch a:hover { color: var(--brand-green); text-decoration: underline; }
.building-service-branch li { display: flex; align-items: stretch; justify-content: space-between; gap: var(--space-1); border-bottom: 1px solid var(--border-subtle); }
.building-service-branch li > a { flex: 0 0 44px; justify-content: center; }
.building-service-select { flex: 1; min-width: 0; min-height: 44px; padding: var(--space-2); border: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: var(--text-small); line-height: var(--line-body); text-align: start; cursor: pointer; }
.building-service-select:hover, .is-selected-service { background: var(--surface-mint); }
.building-chapter-samples { margin-top: var(--space-6); }
.building-chapter-samples figure { display: flex; gap: var(--space-3); margin: 0; }
.building-chapter-samples img { width: 104px; height: 80px; object-fit: cover; }
.building-chapter-samples figcaption { display: flex; flex-direction: column; justify-content: center; gap: var(--space-1); color: var(--text-primary); font-size: var(--text-small); }
.building-chapter-samples figcaption > span, .building-chapter-samples time { color: var(--text-secondary); font-size: var(--text-caption); }
.building-chapter .building-chapter-note { margin-top: var(--space-4); font-size: var(--text-caption); }
.building-next-stage { margin-top: var(--space-6); }
.building-complete-actions { display: grid; justify-items: start; gap: var(--space-2); margin-top: var(--space-6); }
.building-chapter--delivery { min-height: 100svh; }
.building-outro { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-4); padding-block: var(--space-8); border-top: 1px solid var(--border-subtle); color: var(--brand-forest); }
.building-outro p { margin: 0; font-size: var(--text-section-title); }
.building-outro a { display: inline-flex; align-items: center; gap: var(--space-6); min-height: 44px; font-size: var(--text-small); }
@media (max-width: 1050px) { .building-story { grid-template-columns: minmax(245px, .8fr) minmax(0, 1.3fr); column-gap: var(--space-6); } }
@media (max-width: 760px) {
  .building-intro { display: block; padding-block: var(--space-6); }
  .building-intro-description { margin-top: var(--space-3); max-width: none; }
  .building-intro h1 { font-size: clamp(1.65rem, 6.5vw, 2.4rem); }
  .building-story { display: flex; flex-direction: column; gap: 0; }
  .building-visual-column { align-self: stretch; z-index: 5; background: var(--surface-ivory); padding-bottom: var(--space-2); }
  .building-timeline { padding: var(--space-1) var(--space-1) 0; }
  .building-progress-copy strong { font-size: var(--text-small); }
  .building-progress-track { margin-top: var(--space-1); }
  .building-stage-navigation { margin-top: var(--space-1); }
  .building-stage-navigation button { min-height: 44px; gap: 0; }
  .building-stage-short { display: none; }
  .building-chapters { width: 100%; }
  .building-chapter, .building-chapter--start { min-height: 68svh; padding-block: var(--space-8) var(--space-12); }
  .building-chapter--start { justify-content: start; }
  .building-chapter-number { font-size: var(--building-step-mobile-size); }
  .building-chapter h2 { font-size: var(--text-record-title); }
  .building-chapter--start h2 br { display: none; }
  .building-chapter--delivery { min-height: 90svh; }
}
@media (max-height: 600px) and (max-width: 760px) { .building-visual-column { position: relative; top: auto; } }
</style>
