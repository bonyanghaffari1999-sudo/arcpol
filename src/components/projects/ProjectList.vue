<script setup>
import PageIntro from '../patterns/PageIntro.vue'

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
})

const emit = defineEmits([
  'update:statusFilter', 'update:sourceFilter', 'update:categoryFilter', 'update:usageFilter', 'update:search', 'load-more', 'open-project',
])

const statuses = [
  { value: 'all', label: 'همه' },
  { value: 'in-progress', label: 'در حال اجرا' },
  { value: 'completed', label: 'تکمیل‌شده' },
  { value: 'history', label: 'سوابق تصویری' },
]
const usages = ['مسکونی', 'تجاری']

function imageFailed(event) {
  event.currentTarget.hidden = true
}
</script>

<template>
  <div class="projects-index-page">
    <PageIntro title-id="projects-page-title">
      <template #eyebrow>رزومه پروژه‌های شرکت <span class="en-label" dir="ltr">/ PROJECTS</span></template>
      <template #title>پروژه‌های<br><em>شرکت.</em></template>
      <template #description>پروژه‌های شرکت و گزارش‌های تصویریِ کارگاه‌ها را بر اساس خدمت، موقعیت و روند ثبت‌شده مرور کنید.</template>
      <template #meta>{{ displayNumber(projectSourceCounts.company) }} پروژهٔ شرکت · {{ displayNumber(projectSourceCounts.linked + projectSourceCounts.independent) }} گزارش تصویریِ جداگانه</template>
    </PageIntro>

    <section class="page-container projects-page-section" aria-label="جست‌وجو و فیلتر پروژه‌ها">
      <div class="project-source-filter" role="group" aria-label="انتخاب نوع محتوای پروژه‌ها">
        <span>چه چیزی را می‌خواهی ببینی؟</span>
        <button v-for="filter in [{id:'all',label:'همه'}, {id:'company',label:'پروژه‌های شرکت'}, {id:'linked',label:'گزارش‌های مرتبط'}, {id:'independent',label:'گزارش‌های کارگاهی'}]" :key="filter.id" type="button" :aria-pressed="projectSourceFilter === filter.id" @click="emit('update:sourceFilter', filter.id)">
          {{ filter.label }} <small>{{ displayNumber(projectSourceCounts[filter.id]) }}</small>
        </button>
      </div>

      <div class="project-toolbar">
        <div class="filter-tabs" role="group" aria-label="فیلتر وضعیت پروژه‌ها و گزارش‌های تصویری">
          <button v-for="status in statuses" :key="status.value" :class="{ selected: statusFilter === status.value }" :aria-pressed="statusFilter === status.value" @click="emit('update:statusFilter', status.value)">
            {{ status.label }} <span v-if="status.value === 'all'">{{ displayNumber(projectSourceCounts[projectSourceFilter]) }}</span>
            <span v-else-if="status.value === 'in-progress'">{{ displayNumber(inProgressCount) }}</span>
            <span v-else-if="status.value === 'completed'">{{ displayNumber(completedCount) }}</span>
            <span v-else>{{ displayNumber(historyCount) }}</span>
          </button>
        </div>
        <label class="search-box">
          <span class="sr-only">جست‌وجوی پروژه‌ها</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
          <input :value="search" type="search" placeholder="کد، موقعیت، مرحله یا موضوع" autocomplete="off" @input="emit('update:search', $event.target.value)">
        </label>
      </div>

      <div class="project-category-filter" role="group" aria-label="دسته‌بندی خدمات پروژه">
        <span>دسته‌بندی خدمت</span>
        <button :class="{ selected: categoryFilter === 'all' }" :aria-pressed="categoryFilter === 'all'" @click="emit('update:categoryFilter', 'all')">همه</button>
        <button v-for="category in projectCategories" :key="category" :class="{ selected: categoryFilter === category }" :aria-pressed="categoryFilter === category" @click="emit('update:categoryFilter', category)">{{ category }}</button>
      </div>

      <div class="project-category-filter" role="group" aria-label="فیلتر کاربری پروژه">
        <span>کاربری</span>
        <button :class="{ selected: usageFilter === 'all' }" :aria-pressed="usageFilter === 'all'" @click="emit('update:usageFilter', 'all')">همه</button>
        <button v-for="usage in usages" :key="usage" :class="{ selected: usageFilter === usage }" :aria-pressed="usageFilter === usage" @click="emit('update:usageFilter', usage)">{{ usage }}</button>
      </div>

      <div v-if="visibleProjects.length" class="project-grid">
        <button v-for="project in visibleProjects" :key="project.id" class="project-card" type="button" @click="emit('open-project', project, $event)">
          <span class="project-card-image">
            <img :src="projectCover(project)" :alt="`تصویر ${project.source === 'telegram-report' ? 'گزارش کارگاهی مستقل' : 'پروژه'}${project.usage ? ` با کاربری ${project.usage}` : ''}`" loading="lazy" @error="imageFailed">
            <span class="project-card-code" dir="ltr">{{ project.code || `G-${project.id}` }}</span><span class="image-open" aria-hidden="true">↗</span>
          </span>
          <span class="project-card-body">
            <span class="project-card-status"><i :class="['status-dot', statusClass(project.status)]"></i>{{ projectStatus(project.status) }}<small>{{ projectCategory(project) }}</small></span>
            <strong>{{ projectTitle(project) }}</strong>
            <span class="project-card-place">{{ project.address }} <i aria-hidden="true"></i> {{ project.usage }}</span>
            <span v-if="project.tags?.length" class="project-card-tags"><i v-for="tag in project.tags.slice(0, 2)" :key="tag">{{ tag }}</i></span>
          </span>
        </button>
      </div>
      <div v-else class="empty-state"><span aria-hidden="true">⌕</span><h2>پروژه‌ای پیدا نشد</h2><p>عبارت جست‌وجو، دسته‌بندی یا وضعیت را تغییر دهید.</p></div>

      <div v-if="visibleProjectCount < filteredProjectCount" class="load-more-wrap">
        <button class="button button-outline" type="button" @click="emit('load-more')">نمایش موارد بیشتر <span>({{ displayNumber(filteredProjectCount - visibleProjectCount) }} باقی‌مانده)</span></button>
      </div>
      <div class="technical-note"><span class="note-icon" aria-hidden="true">i</span><p>گزارش‌های کارگاهی همراه با تصویر و موقعیت کلی، کاربری و خدمت مرتبط نمایش داده می‌شوند.</p></div>
    </section>
  </div>
</template>
