<script setup>
import { computed, ref, watch } from 'vue'
import PageIntro from '../patterns/PageIntro.vue'
import SectionHeading from '../patterns/SectionHeading.vue'
import DisciplineList from '../patterns/DisciplineList.vue'
import ContactCta from '../patterns/ContactCta.vue'
import ServiceDetailPage from './ServiceDetailPage.vue'

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
})

const searchQuery = ref('')
const selectedGroup = ref('all')
const categoryOptions = computed(() => [
  { id: 'all', label: 'همهٔ خدمات', count: props.serviceGroups.reduce((sum, group) => sum + group.items.length, 0) + props.additionalServices.length },
  ...props.serviceGroups.map((group) => ({ id: group.id, label: group.title, count: group.items.length })),
  { id: 'complementary', label: 'خدمات تکمیلی', count: props.additionalServices.length },
])

function normalize(value) {
  return String(value ?? '').toLocaleLowerCase('fa-IR').replaceAll('ي', 'ی').replaceAll('ك', 'ک').trim()
}

const filteredGroups = computed(() => {
  const query = normalize(searchQuery.value)
  return props.serviceGroups
    .filter((group) => selectedGroup.value === 'all' || selectedGroup.value === group.id)
    .map((group) => {
      const groupMatches = query && normalize(`${group.title} ${group.english} ${group.description}`).includes(query)
      const items = !query || groupMatches
        ? group.items
        : group.items.filter((item) => normalize(item).includes(query))
      return { ...group, visibleItems: items }
    })
    .filter((group) => group.visibleItems.length)
})

const filteredAdditionalServices = computed(() => {
  if (!['all', 'complementary'].includes(selectedGroup.value)) return []
  const query = normalize(searchQuery.value)
  return props.additionalServices.filter((item) => !query || normalize(item).includes(query))
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
  return `#/services?service=${encodeURIComponent(item)}`
}
</script>

<template>
  <div class="services-page">
    <ServiceDetailPage v-if="selectedService" :title="selectedService.title" :group="selectedService.group" :evidence="serviceEvidence" />
    <template v-else>
    <PageIntro title-id="services-page-title">
      <template #eyebrow>خدمات مهندسی و ساخت <span class="en-label" dir="ltr">/ OUR SERVICES</span></template>
      <template #title>از یک خدمت مشخص،<br><em>تا همراهی چندمرحله‌ای.</em></template>
      <template #description>دامنهٔ همکاری با توجه به نیاز پروژه تعریف می‌شود؛ خدمات مستقل یا در چند مرحلهٔ هماهنگ.</template>
      <template #meta>طراحی · ژئوتکنیک · آزمایش · نظارت · اجرا</template>
    </PageIntro>

    <section class="page-container services-page-section" aria-label="فهرست خدمات شرکت">
      <div class="service-finder">
        <div class="service-finder-heading">
          <div>
            <span class="eyebrow">راهنمای خدمات <span class="en-label" dir="ltr">/ FIND A SERVICE</span></span>
            <h2>خدمت موردنیازت را سریع پیدا کن.</h2>
          </div>
          <p>نام خدمت را جست‌وجو کن یا فهرست را بر اساس مرحلهٔ پروژه محدود کن.</p>
        </div>

        <label class="service-search-box">
          <span class="sr-only">جست‌وجو میان خدمات</span>
          <span class="service-search-icon" aria-hidden="true"></span>
          <input v-model="searchQuery" type="search" autocomplete="off" placeholder="مثلاً: آزمایش خاک، نقشهٔ اجرایی، نیلینگ…">
          <button v-if="searchQuery || selectedGroup !== 'all'" type="button" @click="clearSearch">پاک‌کردن فیلترها</button>
        </label>

        <div class="service-category-filters" role="group" aria-label="فیلتر دسته‌های خدمات">
          <button v-for="option in categoryOptions" :key="option.id" type="button" :aria-pressed="selectedGroup === option.id" @click="selectedGroup = option.id">
            <span>{{ option.label }}</span><small>{{ option.count.toLocaleString('fa-IR') }}</small>
          </button>
        </div>
        <p class="service-result-count" role="status" aria-live="polite">{{ resultCount.toLocaleString('fa-IR') }} خدمت در این فهرست</p>
      </div>

      <div v-if="filteredGroups.length" class="service-group-grid">
        <article v-for="group in filteredGroups" :key="group.id" class="service-group-card" :class="`service-group-${group.id}`">
          <div class="service-group-top"><span>{{ group.number }}</span><small dir="ltr">{{ group.english }}</small></div>
          <h2>{{ group.title }}</h2>
          <p>{{ group.description }}</p>
          <ul class="service-item-list">
            <li v-for="item in group.visibleItems" :key="item"><a :href="serviceHref(item)"><span>{{ item }}</span><span class="service-item-mark" aria-hidden="true"></span></a></li>
          </ul>
        </article>
      </div>

      <section v-if="filteredAdditionalServices.length" class="additional-services" aria-labelledby="additional-services-title">
        <div class="additional-services-heading">
          <div class="eyebrow" id="additional-services-title">خدمات تکمیلی <span class="en-label" dir="ltr">/ COMPLEMENTARY SERVICES</span></div>
          <p>خدمات دیگر مرتبط با پروژهٔ ساختمانی</p>
        </div>
        <div class="service-chips service-chips-large"><a v-for="item in filteredAdditionalServices" :key="item" :href="serviceHref(item)">{{ item }} <b aria-hidden="true">↗</b></a></div>
      </section>

      <div v-if="!resultCount" class="service-empty-state">
        <span aria-hidden="true">⌕</span>
        <h2>خدمتی با این عبارت پیدا نشد.</h2>
        <p>عبارت کوتاه‌تری را امتحان کن یا فهرست را پاک کن تا همهٔ دسته‌ها دیده شوند.</p>
        <button class="button button-outline" type="button" @click="clearSearch">نمایش همهٔ خدمات</button>
      </div>

      <section class="engagement-models" aria-labelledby="engagement-models-title">
        <div class="eyebrow">دامنهٔ همکاری <span class="en-label" dir="ltr">/ PROJECT SCOPES</span></div>
        <div class="engagement-heading">
          <h2 id="engagement-models-title">همراهی متناسب<br><em>با نقطهٔ شروع شما.</em></h2>
          <p>می‌توان یک خدمت را انتخاب کرد یا چند مرحله را به‌صورت هماهنگ پیش برد. محدودهٔ همکاری برای هر پروژه جداگانه تعریف می‌شود.</p>
        </div>
        <div class="engagement-grid">
          <article v-for="model in engagementModels" :key="model.number">
            <span>{{ model.number }}</span><small dir="ltr">{{ model.english }}</small><h3>{{ model.title }}</h3><p>{{ model.description }}</p>
          </article>
        </div>
      </section>

      <section class="disciplines-detail" aria-labelledby="services-disciplines-title">
        <SectionHeading title-id="services-disciplines-title">
          <template #label>چهار رشتهٔ اصلی طراحی ساختمان <span class="en-label" dir="ltr">/ CORE DISCIPLINES</span></template>
          <template #title>تخصص‌ها کنار هم،<br><em>مدارک هماهنگ‌تر.</em></template>
          <template #description>معماری، سازه، تأسیسات مکانیکی و تأسیسات برقی، چهار رشتهٔ اصلی طراحی و هماهنگی فنی ساختمان هستند؛ سبد خدمات شرکت گسترده‌تر است.</template>
        </SectionHeading>
        <DisciplineList :items="disciplines" />
      </section>

      <ContactCta />
    </section>
    </template>
  </div>
</template>
