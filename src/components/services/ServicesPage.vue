<script setup>
import { computed, ref, watch } from 'vue'
import PageIntro from '../patterns/PageIntro.vue'
import SectionHeading from '../patterns/SectionHeading.vue'
import DisciplineList from '../patterns/DisciplineList.vue'
import ContactCta from '../patterns/ContactCta.vue'
import ServiceDetailPage from './ServiceDetailPage.vue'
import { serviceNamesEn, serviceGroupsEn } from '../../i18n/services-en.js'
import { formatNumber, localizeDigits } from '../../i18n/numbers.js'
import { serviceSlug } from '../../service-routes.js'

const props = defineProps({
  company: { type: Object, required: true },
  serviceGroups: { type: Array, required: true },
  engagementModels: { type: Array, required: true },
  disciplines: { type: Array, required: true },
  additionalServices: { type: Array, required: true },
  initialGroup: { type: String, default: 'all' },
  selectedServiceName: { type: String, default: '' },
  projects: { type: Array, default: () => [] },
  serviceEvidence: { type: Array, default: () => [] },
  serviceEvidenceLoading: { type: Boolean, default: false },
  serviceEvidenceError: { type: Boolean, default: false },
  locale: { type: String, default: 'fa' },
})

const isEnglish = computed(() => props.locale === 'en')
const displayNumber = (number) => localizeDigits(number, props.locale)
const serviceLabel = (name) => localizeDigits(isEnglish.value ? serviceNamesEn[name] || name : name, props.locale)
const groupLabel = (group) => localizeDigits(isEnglish.value ? serviceGroupsEn[group.id]?.title || group.title : group.title, props.locale)
const groupDescription = (group) => localizeDigits(isEnglish.value ? serviceGroupsEn[group.id]?.description || '' : group.description, props.locale)
const englishModels = {
  'پروژه کامل از طراحی تا تحویل': ['Full project', 'Coordinated services from studies and design through construction, supervision and as-built documentation, with scope agreed for each project.'],
  'طراحی': ['Design', 'Architectural and engineering design, independently or across coordinated disciplines.'],
  'اجرا': ['Construction', 'Construction of a whole building or an agreed part of the works.'],
  'نظارت': ['Supervision', 'Supervision and reporting tailored to the agreed scope of the project.'],
}
const englishDisciplines = {
  architecture: 'Architectural design and project documentation coordinated with the other disciplines.',
  structure: 'Structural design, calculations and construction documentation.',
  mechanical: 'Mechanical services design coordinated with architecture and structure.',
  electrical: 'Electrical services design coordinated with the other disciplines.',
}
const displayedDisciplines = computed(() => isEnglish.value ? props.disciplines.map((item) => ({ ...item, title: item.english, description: englishDisciplines[item.id] || '' })) : props.disciplines)
const engagementText = (model, index, part) => localizeDigits(isEnglish.value
  ? englishModels[model.title]?.[index] || (part === 'title' ? model.title : model.description)
  : (part === 'title' ? model.title : model.description), props.locale)
const searchQuery = ref('')
const selectedGroup = ref('all')
const categoryOptions = computed(() => [
  { id: 'all', label: isEnglish.value ? 'All services' : 'همهٔ خدمات', count: props.serviceGroups.reduce((sum, group) => sum + group.items.length, 0) + props.additionalServices.length },
  ...props.serviceGroups.map((group) => ({ id: group.id, label: groupLabel(group), count: group.items.length })),
  { id: 'complementary', label: isEnglish.value ? 'Additional services' : 'خدمات تکمیلی', count: props.additionalServices.length },
])

function normalize(value) {
  return String(value ?? '').toLocaleLowerCase('fa-IR').replaceAll('ي', 'ی').replaceAll('ك', 'ک').trim()
}

const filteredGroups = computed(() => {
  const query = normalize(searchQuery.value)
  return props.serviceGroups
    .filter((group) => selectedGroup.value === 'all' || selectedGroup.value === group.id)
    .map((group) => {
      const groupMatches = query && normalize(`${group.title} ${group.english} ${group.description} ${groupLabel(group)} ${groupDescription(group)}`).includes(query)
      const items = !query || groupMatches
        ? group.items
        : group.items.filter((item) => normalize(`${item} ${serviceNamesEn[item] || ''}`).includes(query))
      return { ...group, visibleItems: items }
    })
    .filter((group) => group.visibleItems.length)
})

const filteredAdditionalServices = computed(() => {
  if (!['all', 'complementary'].includes(selectedGroup.value)) return []
  const query = normalize(searchQuery.value)
  return props.additionalServices.filter((item) => !query || normalize(`${item} ${serviceNamesEn[item] || ''}`).includes(query))
})

const resultCount = computed(() => filteredGroups.value.reduce((sum, group) => sum + group.visibleItems.length, 0) + filteredAdditionalServices.value.length)
const selectedService = computed(() => {
  const group = props.serviceGroups.find((entry) => entry.items.includes(props.selectedServiceName))
  if (group) return { title: props.selectedServiceName, group }
  if (props.additionalServices.includes(props.selectedServiceName)) return {
    title: props.selectedServiceName,
    group: { id: 'complementary', number: '۰۵', title: 'خدمات تکمیلی', english: 'COMPLEMENTARY SERVICES' },
  }
  return null
})

watch(() => props.initialGroup, (value) => {
  selectedGroup.value = categoryOptions.value.some((option) => option.id === value) ? value : 'all'
}, { immediate: true })

function clearSearch() {
  searchQuery.value = ''
  selectedGroup.value = 'all'
}

function serviceHref(item) {
  return `/services/${serviceSlug(item)}${isEnglish.value ? '?lang=en' : ''}`
}
</script>

<template>
  <div class="services-page" :lang="isEnglish ? 'en' : 'fa'" :dir="isEnglish ? 'ltr' : 'rtl'">
    <ServiceDetailPage v-if="selectedService" :title="selectedService.title" :group="selectedService.group" :evidence="serviceEvidence" :evidence-loading="serviceEvidenceLoading" :evidence-error="serviceEvidenceError" :locale="locale" />
    <template v-else>
    <PageIntro title-id="services-page-title">
      <template #eyebrow>{{ isEnglish ? 'ENGINEERING & CONSTRUCTION' : 'خدمات مهندسی و ساخت / OUR SERVICES' }}</template>
      <template #title><template v-if="isEnglish">From a single service,<br><em>to coordinated delivery.</em></template><template v-else>از یک خدمت مشخص،<br><em>تا همراهی چندمرحله‌ای.</em></template></template>
      <template #description>{{ isEnglish ? 'The scope is shaped around each project, from individual services to coordinated stages.' : 'دامنهٔ همکاری با توجه به نیاز پروژه تعریف می‌شود؛ خدمات مستقل یا در چند مرحلهٔ هماهنگ.' }}</template>
      <template #meta>{{ isEnglish ? 'DESIGN · GEOTECHNICS · TESTING · SUPERVISION · CONSTRUCTION' : 'طراحی · ژئوتکنیک · آزمایش · نظارت · اجرا' }}</template>
    </PageIntro>

    <section class="page-container services-page-section" :aria-label="isEnglish ? 'Company services' : 'فهرست خدمات شرکت'">
      <div class="service-finder">
        <div class="service-finder-heading">
          <div>
            <span class="eyebrow">{{ isEnglish ? 'FIND A SERVICE' : 'راهنمای خدمات / FIND A SERVICE' }}</span>
            <h2>{{ isEnglish ? 'Find the service you need.' : 'خدمت موردنیازت را سریع پیدا کن.' }}</h2>
          </div>
          <p>{{ isEnglish ? 'Search by service or filter by project stage.' : 'نام خدمت را جست‌وجو کن یا فهرست را بر اساس مرحلهٔ پروژه محدود کن.' }}</p>
        </div>

        <label class="service-search-box">
          <span class="sr-only">{{ isEnglish ? 'Search services' : 'جست‌وجو میان خدمات' }}</span>
          <span class="service-search-icon" aria-hidden="true"></span>
          <input v-model="searchQuery" type="search" autocomplete="off" :placeholder="isEnglish ? 'For example: soil testing, drawings, nailing…' : 'مثلاً: آزمایش خاک، نقشهٔ اجرایی، نیلینگ…'">
          <button v-if="searchQuery || selectedGroup !== 'all'" type="button" @click="clearSearch">{{ isEnglish ? 'Clear filters' : 'پاک‌کردن فیلترها' }}</button>
        </label>

        <div class="service-category-filters" role="group" :aria-label="isEnglish ? 'Filter service categories' : 'فیلتر دسته‌های خدمات'">
          <button v-for="option in categoryOptions" :key="option.id" type="button" :aria-pressed="selectedGroup === option.id" @click="selectedGroup = option.id">
            <span>{{ option.label }}</span><small>{{ formatNumber(option.count, locale) }}</small>
          </button>
        </div>
        <p class="service-result-count" role="status" aria-live="polite">{{ formatNumber(resultCount, locale) }} {{ isEnglish ? 'services in this list' : 'خدمت در این فهرست' }}</p>
      </div>

      <div v-if="filteredGroups.length" class="service-group-grid">
        <article v-for="group in filteredGroups" :key="group.id" class="service-group-card" :class="`service-group-${group.id}`">
          <div class="service-group-top"><span>{{ displayNumber(group.number) }}</span><small dir="ltr">{{ group.english }}</small></div>
          <h2>{{ groupLabel(group) }}</h2>
          <p>{{ groupDescription(group) }}</p>
          <ul class="service-item-list">
            <li v-for="item in group.visibleItems" :key="item"><a :href="serviceHref(item)"><span :lang="isEnglish && !serviceNamesEn[item] ? 'fa' : undefined" dir="auto">{{ serviceLabel(item) }}</span><span class="service-item-mark" aria-hidden="true"></span></a></li>
          </ul>
        </article>
      </div>

      <section v-if="filteredAdditionalServices.length" class="additional-services" aria-labelledby="additional-services-title">
        <div class="additional-services-heading">
          <div class="eyebrow" id="additional-services-title">{{ isEnglish ? 'ADDITIONAL SERVICES' : 'خدمات تکمیلی / COMPLEMENTARY SERVICES' }}</div>
          <p>{{ isEnglish ? 'Other building project services' : 'خدمات دیگر مرتبط با پروژهٔ ساختمانی' }}</p>
        </div>
        <div class="service-chips service-chips-large"><a v-for="item in filteredAdditionalServices" :key="item" :href="serviceHref(item)"><span :lang="isEnglish && !serviceNamesEn[item] ? 'fa' : undefined" dir="auto">{{ serviceLabel(item) }}</span> <b aria-hidden="true">↗</b></a></div>
      </section>

      <div v-if="!resultCount" class="service-empty-state">
        <span aria-hidden="true">⌕</span>
        <h2>{{ isEnglish ? 'No services found.' : 'خدمتی با این عبارت پیدا نشد.' }}</h2>
        <p>{{ isEnglish ? 'Try another search or clear the filters.' : 'عبارت کوتاه‌تری را امتحان کن یا فهرست را پاک کن تا همهٔ دسته‌ها دیده شوند.' }}</p>
        <button class="button button-outline" type="button" @click="clearSearch">{{ isEnglish ? 'Show all services' : 'نمایش همهٔ خدمات' }}</button>
      </div>

      <section class="engagement-models" aria-labelledby="engagement-models-title">
        <div class="eyebrow">{{ isEnglish ? 'PROJECT SCOPES' : 'دامنهٔ همکاری / PROJECT SCOPES' }}</div>
        <div class="engagement-heading">
          <h2 id="engagement-models-title"><template v-if="isEnglish">Support for<br><em>wherever you begin.</em></template><template v-else>همراهی متناسب<br><em>با نقطهٔ شروع شما.</em></template></h2>
          <p>{{ isEnglish ? 'Choose one service or coordinate several stages. Each project has its own agreed scope.' : 'می‌توان یک خدمت را انتخاب کرد یا چند مرحله را به‌صورت هماهنگ پیش برد. محدودهٔ همکاری برای هر پروژه جداگانه تعریف می‌شود.' }}</p>
        </div>
        <div class="engagement-grid">
          <article v-for="model in engagementModels" :key="model.number">
            <span>{{ displayNumber(model.number) }}</span><small dir="ltr">{{ model.english }}</small><h3 :lang="isEnglish && !englishModels[model.title] ? 'fa' : undefined" dir="auto">{{ engagementText(model, 0, 'title') }}</h3><p :lang="isEnglish && !englishModels[model.title] ? 'fa' : undefined" dir="auto">{{ engagementText(model, 1, 'description') }}</p>
          </article>
        </div>
      </section>

      <section class="disciplines-detail" aria-labelledby="services-disciplines-title">
        <SectionHeading title-id="services-disciplines-title">
          <template #label>{{ isEnglish ? 'CORE BUILDING DESIGN DISCIPLINES' : 'چهار رشتهٔ اصلی طراحی ساختمان / CORE DISCIPLINES' }}</template>
          <template #title><template v-if="isEnglish">Disciplines together,<br><em>coordinated documentation.</em></template><template v-else>تخصص‌ها کنار هم،<br><em>مدارک هماهنگ‌تر.</em></template></template>
          <template #description>{{ isEnglish ? 'Architecture, structure, mechanical and electrical services are the four core design disciplines within our wider range of services.' : 'معماری، سازه، تأسیسات مکانیکی و تأسیسات برقی، چهار رشتهٔ اصلی طراحی و هماهنگی فنی ساختمان هستند؛ سبد خدمات شرکت گسترده‌تر است.' }}</template>
        </SectionHeading>
        <DisciplineList :items="displayedDisciplines" :locale="locale" />
      </section>

      <ContactCta :locale="locale" />
    </section>
    </template>
  </div>
</template>
