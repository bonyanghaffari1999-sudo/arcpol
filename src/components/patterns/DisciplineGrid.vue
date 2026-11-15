<script setup>
import { localizeDigits } from '../../i18n/numbers.js'
import { serviceSlug } from '../../service-routes.js'

const props = defineProps({ items: { type: Array, required: true }, serviceGroups: { type: Array, default: () => [] }, locale: { type: String, default: 'fa' } })

const disciplineServices = {
  architecture: 'طراحی معماری',
  structure: 'محاسبات و طراحی سازه',
  mechanical: 'طراحی تأسیسات مکانیکی',
  electrical: 'طراحی تأسیسات برقی',
}
const englishDiscipline = {
  architecture: ['Architecture', 'Architectural design and documentation coordinated with the other disciplines.'],
  structure: ['Structure', 'Structural design, calculations and construction documentation.'],
  mechanical: ['Mechanical', 'Mechanical services design coordinated with architecture and structure.'],
  electrical: ['Electrical', 'Electrical services design coordinated with the other disciplines.'],
}
function disciplineHref(item) {
  const service = disciplineServices[item.id]
  return service && props.serviceGroups.some((group) => group.items.includes(service))
    ? `/services/${serviceSlug(service)}${props.locale === 'en' ? '?lang=en' : ''}`
    : '/services?category=design'
}
</script>

<template>
  <div class="discipline-grid">
    <a v-for="item in items" :key="item.id" :href="disciplineHref(item)" class="discipline-card" :aria-label="locale === 'en' ? `Explore ${englishDiscipline[item.id]?.[0] || item.english} services` : `شناخت خدمات ${item.title}`">
      <span class="discipline-number" dir="ltr">{{ localizeDigits(item.number, locale) }}</span><span class="discipline-rule"></span>
      <h3 :lang="locale === 'en' && !englishDiscipline[item.id] ? 'fa' : undefined" dir="auto">{{ localizeDigits(locale === 'en' ? englishDiscipline[item.id]?.[0] || item.title : item.title, locale) }}</h3><small dir="ltr">{{ item.english }}</small><p :lang="locale === 'en' && !englishDiscipline[item.id] ? 'fa' : undefined" dir="auto">{{ localizeDigits(locale === 'en' ? englishDiscipline[item.id]?.[1] || item.description : item.description, locale) }}</p>
      <span class="card-arrow" aria-hidden="true">↗</span>
    </a>
  </div>
</template>
