<script setup>
import { localizeDigits } from '../../i18n/numbers.js'

defineProps({
  projects: { type: Array, required: true },
  projectStatus: { type: Function, required: true },
  statusClass: { type: Function, required: true },
  projectCover: { type: Function, required: true },
  locale: { type: String, default: 'fa' },
})

defineEmits(['open-project'])
const englishStatus = { 'in-progress': 'In progress', completed: 'Completed', history: 'Archive' }
const englishUsage = { 'مسکونی': 'Residential', 'تجاری': 'Commercial' }
const englishArea = { 'استان البرز': 'Alborz Province', 'کرج': 'Karaj', 'فردیس': 'Fardis', 'هشتگرد': 'Hashtgerd', 'نظرآباد': 'Nazarabad', 'محمدشهر': 'Mohammadshahr' }
const englishType = { 'نظارت': 'Supervision', 'اجرا': 'Construction', 'نظارت و اجرا': 'Supervision and construction', 'طراحی': 'Design' }
</script>

<template>
  <div class="featured-grid">
    <button v-for="(project, index) in projects" :key="project.id" class="featured-card" :class="`featured-card-${index + 1}`" type="button" :aria-label="locale === 'en' ? `View ${project.code ? `project ${localizeDigits(project.code, locale)}` : 'a company project'}${project.usage ? `, ${englishUsage[project.usage] || project.usage}` : ''}${project.address ? ` in ${englishArea[project.address] || project.address}` : ''}` : `مشاهدهٔ پروژهٔ ${project.usage || 'ساختمانی'}${project.address ? ` در ${project.address}` : ''}`" @click="$emit('open-project', project, $event)">
      <span class="featured-image">
        <img :src="projectCover(project)" :alt="locale === 'en' ? `${project.usage ? `${englishUsage[project.usage] || project.usage} ` : ''}project photograph${project.address ? ` in ${englishArea[project.address] || project.address}` : ''}` : `تصویر پروژهٔ ${project.usage || 'ساختمانی'}${project.address ? ` در ${project.address}` : ''}`" :loading="index === 0 ? 'eager' : 'lazy'" @error="$event.currentTarget.hidden = true">
        <span class="image-open" aria-hidden="true">↗</span>
      </span>
      <span class="featured-meta"><span :dir="project.code ? 'ltr' : 'auto'">{{ project.code ? localizeDigits(project.code, locale) : (locale === 'en' ? 'COMPANY PROJECT' : 'پروژهٔ شرکت') }} <i :class="['status-dot', statusClass(project.status)]"></i></span><small :lang="locale === 'en' && !englishStatus[project.status] ? 'fa' : undefined">{{ locale === 'en' ? englishStatus[project.status] || projectStatus(project.status) : projectStatus(project.status) }}</small></span>
      <strong><span :lang="locale === 'en' && project.usage && !englishUsage[project.usage] ? 'fa' : undefined" dir="auto">{{ locale === 'en' ? englishUsage[project.usage] || project.usage || 'Building project' : project.usage || 'پروژهٔ ساختمانی' }}</span><template v-if="project.address"> · <span :lang="locale === 'en' && englishArea[project.address] ? 'en' : 'fa'" dir="auto">{{ locale === 'en' ? englishArea[project.address] || project.address : project.address }}</span></template></strong>
      <small><span v-if="project.type" :lang="locale === 'en' && englishType[project.type] ? 'en' : 'fa'" dir="auto">{{ locale === 'en' ? englishType[project.type] || project.type : project.type }}</span><span v-else>{{ locale === 'en' ? 'Engineering services' : 'خدمات مهندسی' }}</span><template v-if="project.code"> <span aria-hidden="true">·</span> {{ locale === 'en' ? 'Code' : 'کد' }} <span dir="ltr">{{ localizeDigits(project.code, locale) }}</span></template></small>
    </button>
  </div>
</template>
