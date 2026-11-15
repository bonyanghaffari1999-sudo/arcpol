<script setup>
import PageIntro from '../patterns/PageIntro.vue'
import { projectTerm, projectTextLanguage, projectNumber, projectTitleLabel, projectStatusLabel } from '../../i18n/projects-en.js'
import { localizeDigits } from '../../i18n/numbers.js'

defineProps({
  projects: { type: Array, required: true },
  inProgressCount: { type: Number, required: true },
  completedCount: { type: Number, required: true },
  historyCount: { type: Number, required: true },
  projectCategories: { type: Array, required: true },
  projectSourceFilter: { type: String, required: true },
  projectSourceCounts: { type: Object, required: true },
  statusFilter: { type: String, required: true },
  categoryFilter: { type: String, required: true },
  usageFilter: { type: String, required: true },
  search: { type: String, required: true },
  visibleProjects: { type: Array, required: true },
  filteredProjectCount: { type: Number, required: true },
  visibleProjectCount: { type: Number, required: true },
  projectStatus: { type: Function, required: true },
  statusClass: { type: Function, required: true },
  projectCategory: { type: Function, required: true },
  projectTitle: { type: Function, required: true },
  projectCover: { type: Function, required: true },
  displayNumber: { type: Function, required: true },
  locale: { type: String, default: 'fa' },
})

const emit = defineEmits([
  'update:statusFilter', 'update:sourceFilter', 'update:categoryFilter', 'update:usageFilter', 'update:search', 'load-more', 'open-project',
])

const statuses = [
  { value: 'all', label: 'همه', en: 'All' },
  { value: 'in-progress', label: 'در حال اجرا', en: 'In progress' },
  { value: 'completed', label: 'تکمیل‌شده', en: 'Completed' },
  { value: 'history', label: 'سوابق تصویری', en: 'Photo archive' },
]
const usages = ['مسکونی', 'تجاری']

function imageFailed(event) {
  event.currentTarget.hidden = true
}
</script>

<template>
  <div class="projects-index-page">
    <PageIntro title-id="projects-page-title">
      <template #eyebrow>{{ locale === 'en' ? 'PROJECTS' : 'رزومه پروژه‌های شرکت / PROJECTS' }}</template>
      <template #title><template v-if="locale === 'en'">Projects and<br><em>field reports.</em></template><template v-else>پروژه‌ها و<br><em>گزارش‌های کارگاهی.</em></template></template>
      <template #description>{{ locale === 'en' ? 'Browse company projects and photo records by service, general location and recorded site activity.' : 'پروژه‌های شرکت و گزارش‌های تصویری را بر اساس خدمت، محدودهٔ کلی و فعالیت ثبت‌شده مرور کنید.' }}</template>
      <template #meta>{{ projectNumber(projectSourceCounts.company, locale) }} {{ locale === 'en' ? 'company project records and coded groups' : 'سابقه و گروه پروژهٔ شرکت' }} · {{ projectNumber(projectSourceCounts.previousSite, locale) }} {{ locale === 'en' ? 'records from the previous website' : 'سابقه از سایت پیشین' }} · {{ projectNumber(projectSourceCounts.linked, locale) }} {{ locale === 'en' ? 'coded Telegram groups' : 'گروه کددار تلگرام' }} · {{ projectNumber(projectSourceCounts.unassigned, locale) }} {{ locale === 'en' ? 'uncoded photo entries' : 'گزارش تصویری بدون کد' }} · {{ projectNumber(projectSourceCounts.independent, locale) }} {{ locale === 'en' ? 'independent site reports' : 'گزارش مستقل کارگاهی' }}</template>
    </PageIntro>

    <section class="page-container projects-page-section" :aria-label="locale === 'en' ? 'Search and filter projects' : 'جست‌وجو و فیلتر پروژه‌ها'">
      <div class="project-source-filter" role="group" :aria-label="locale === 'en' ? 'Content source' : 'انتخاب نوع محتوای پروژه‌ها'">
        <span>{{ locale === 'en' ? 'What would you like to see?' : 'چه چیزی را می‌خواهی ببینی؟' }}</span>
        <button v-for="filter in [{id:'all',label:'همهٔ موارد',en:'All records'}, {id:'company',label:'سوابق پروژه‌های شرکت',en:'Company project records'}, {id:'previousSite',label:'سایت پیشین',en:'Previous website'}, {id:'linked',label:'گروه‌های پروژه با کد G',en:'G-coded project groups'}, {id:'unassigned',label:'گزارش تصویری بدون کد',en:'Uncoded photo entries'}, {id:'independent',label:'گزارش‌های مستقل کارگاهی',en:'Independent site reports'}]" :key="filter.id" type="button" :aria-pressed="projectSourceFilter === filter.id" @click="emit('update:sourceFilter', filter.id)">
          {{ locale === 'en' ? filter.en : filter.label }} <small>{{ projectNumber(projectSourceCounts[filter.id], locale) }}</small>
        </button>
      </div>

      <div class="project-toolbar">
        <div class="filter-tabs" role="group" :aria-label="locale === 'en' ? 'Filter by status' : 'فیلتر وضعیت پروژه‌ها و گزارش‌های تصویری'">
          <button v-for="status in statuses" :key="status.value" :class="{ selected: statusFilter === status.value }" :aria-pressed="statusFilter === status.value" @click="emit('update:statusFilter', status.value)">
            {{ locale === 'en' ? status.en : status.label }} <span v-if="status.value === 'all'">{{ projectNumber(projectSourceCounts[projectSourceFilter], locale) }}</span>
            <span v-else-if="status.value === 'in-progress'">{{ projectNumber(inProgressCount, locale) }}</span>
            <span v-else-if="status.value === 'completed'">{{ projectNumber(completedCount, locale) }}</span>
            <span v-else>{{ projectNumber(historyCount, locale) }}</span>
          </button>
        </div>
        <label class="search-box">
          <span class="sr-only">{{ locale === 'en' ? 'Search projects' : 'جست‌وجوی پروژه‌ها' }}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
          <input :value="search" type="search" :placeholder="locale === 'en' ? 'Code, location, stage or subject' : 'کد، موقعیت، مرحله یا موضوع'" autocomplete="off" @input="emit('update:search', $event.target.value)">
        </label>
      </div>

      <div class="project-category-filter" role="group" :aria-label="locale === 'en' ? 'Filter by service' : 'دسته‌بندی خدمات پروژه'">
        <span>{{ locale === 'en' ? 'Service' : 'دسته‌بندی خدمت' }}</span>
        <button :class="{ selected: categoryFilter === 'all' }" :aria-pressed="categoryFilter === 'all'" @click="emit('update:categoryFilter', 'all')">{{ locale === 'en' ? 'All' : 'همه' }}</button>
        <button v-for="category in projectCategories" :key="category" :class="{ selected: categoryFilter === category }" :aria-pressed="categoryFilter === category" :lang="projectTextLanguage(category, locale)" dir="auto" @click="emit('update:categoryFilter', category)">{{ projectTerm(category, locale) }}</button>
      </div>

      <div class="project-category-filter" role="group" :aria-label="locale === 'en' ? 'Filter by use' : 'فیلتر کاربری پروژه'">
        <span>{{ locale === 'en' ? 'Use' : 'کاربری' }}</span>
        <button :class="{ selected: usageFilter === 'all' }" :aria-pressed="usageFilter === 'all'" @click="emit('update:usageFilter', 'all')">{{ locale === 'en' ? 'All' : 'همه' }}</button>
        <button v-for="usage in usages" :key="usage" :class="{ selected: usageFilter === usage }" :aria-pressed="usageFilter === usage" @click="emit('update:usageFilter', usage)">{{ projectTerm(usage, locale) }}</button>
      </div>

      <div v-if="visibleProjects.length" class="project-grid">
        <button v-for="project in visibleProjects" :key="project.id" class="project-card" type="button" @click="emit('open-project', project, $event)">
          <span class="project-card-image">
            <img :src="projectCover(project)" :alt="locale === 'en' ? `Photograph for ${projectTitleLabel(project, locale, projectTitle)}` : `تصویر ${project.source === 'telegram-report' || (project.source === 'field-reports' && !/^G-\d+$/iu.test(project.code || '')) ? 'گزارش کارگاهی' : 'پروژه'}${project.usage ? ` با کاربری ${project.usage}` : ''}`" loading="lazy" @error="imageFailed">
            <span class="project-card-code" :dir="project.code ? 'ltr' : 'auto'">{{ project.code ? localizeDigits(project.code, locale) : (locale === 'en' ? (project.source === 'field-reports' ? 'PHOTO RECORD' : 'COMPANY PROJECT') : (project.source === 'field-reports' ? 'گزارش تصویری' : 'پروژهٔ شرکت')) }}</span><span class="image-open" aria-hidden="true">↗</span>
          </span>
          <span class="project-card-body">
            <span class="project-card-status"><i :class="['status-dot', statusClass(project.status)]"></i>{{ projectStatusLabel(project.status, locale, projectStatus) }}<small :lang="projectTextLanguage(projectCategory(project), locale)" dir="auto">{{ projectTerm(projectCategory(project), locale) }}</small></span>
            <strong>{{ projectTitleLabel(project, locale, projectTitle) }}</strong>
            <span class="project-card-place"><span :lang="projectTextLanguage(project.address, locale)" dir="auto">{{ projectTerm(project.address, locale) }}</span> <i aria-hidden="true"></i> <span :lang="projectTextLanguage(project.usage, locale)" dir="auto">{{ projectTerm(project.usage, locale) }}</span></span>
            <span v-if="project.tags?.length" class="project-card-tags"><i v-for="tag in project.tags.slice(0, 2)" :key="tag" :lang="projectTextLanguage(tag, locale)" dir="auto">{{ projectTerm(tag, locale) }}</i></span>
          </span>
        </button>
      </div>
      <div v-else class="empty-state"><span aria-hidden="true">⌕</span><h2>{{ locale === 'en' ? 'No projects found' : 'پروژه‌ای پیدا نشد' }}</h2><p>{{ locale === 'en' ? 'Change the search, category or status.' : 'عبارت جست‌وجو، دسته‌بندی یا وضعیت را تغییر دهید.' }}</p></div>

      <div v-if="visibleProjectCount < filteredProjectCount" class="load-more-wrap">
        <button class="button button-outline" type="button" @click="emit('load-more')">{{ locale === 'en' ? 'Show more' : 'نمایش موارد بیشتر' }} <span>({{ projectNumber(filteredProjectCount - visibleProjectCount, locale) }} {{ locale === 'en' ? 'remaining' : 'باقی‌مانده' }})</span></button>
      </div>
      <div class="technical-note"><span class="note-icon" aria-hidden="true">i</span><p>{{ locale === 'en' ? 'Site reports include images, general location, building use and the recorded service. Some source text is available in Persian only.' : 'گزارش‌های کارگاهی همراه با تصویر و موقعیت کلی، کاربری و خدمت مرتبط نمایش داده می‌شوند.' }}</p></div>
    </section>
  </div>
</template>
