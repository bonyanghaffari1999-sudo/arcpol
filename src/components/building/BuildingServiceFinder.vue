<script setup>
import { computed, nextTick, onUnmounted, ref } from 'vue'
import { normalizeServiceText } from './building-service-map.js'
import { serviceGroupsEn, serviceNamesEn } from '../../i18n/services-en.js'
import { formatNumber, localizeDigits } from '../../i18n/numbers.js'

const props = defineProps({ services: { type: Array, required: true }, chapters: { type: Array, required: true }, locale: { type: String, default: 'fa' } })
const emit = defineEmits(['select'])
const dialog = ref(null)
const searchInput = ref(null)
const query = ref('')
const category = ref('all')
let opener
let previousOverflow = ''
let locked = false
let selectionPending = false
const catalog = computed(() => props.services.filter((service) => !service.supplemental))
const isEnglish = computed(() => props.locale === 'en')
const categories = computed(() => [...new Map(catalog.value.map((service) => [service.categoryId, { id: service.categoryId, title: service.categoryTitle, label: localizeDigits(isEnglish.value ? serviceGroupsEn[service.categoryId]?.title || service.categoryTitle : service.categoryTitle, props.locale) }])).values()])
const groups = computed(() => categories.value.map((group) => ({
  ...group,
  services: catalog.value.filter((service) => {
    if (service.categoryId !== group.id || (category.value !== 'all' && category.value !== group.id)) return false
    const labels = props.chapters.filter((chapter) => service.chapterIds.includes(chapter.id)).map((chapter) => chapter.label).join(' ')
    return normalizeServiceText(`${service.name} ${serviceNamesEn[service.name] || ''} ${service.categoryTitle} ${group.label} ${labels}`).includes(normalizeServiceText(query.value))
  }),
})).filter((group) => group.services.length))
const resultCount = computed(() => groups.value.reduce((sum, group) => sum + group.services.length, 0))
function locations(service) {
  if (service.projectWide) return localizeDigits(isEnglish.value ? 'Whole project' : 'کل پروژه', props.locale)
  return localizeDigits(props.chapters.filter((chapter) => service.chapterIds.includes(chapter.id)).map((chapter) => chapter.shortLabel).join(isEnglish.value ? ', ' : '، '), props.locale)
}
function serviceLabel(service) { return localizeDigits(isEnglish.value ? serviceNamesEn[service.name] || service.name : service.name, props.locale) }
function serviceLanguage(service) { return isEnglish.value && serviceNamesEn[service.name] ? 'en' : 'fa' }
async function open() {
  selectionPending = false
  opener = document.activeElement
  previousOverflow = document.body.style.overflow
  locked = true
  document.body.style.overflow = 'hidden'
  dialog.value.showModal()
  await nextTick()
  searchInput.value?.focus()
}
function unlock() {
  if (!locked) return
  document.body.style.overflow = previousOverflow
  locked = false
}
function closed() { unlock(); if (!selectionPending) opener?.focus({ preventScroll: true }) }
function select(service) {
  selectionPending = true
  dialog.value.close()
  unlock()
  emit('select', service)
}
onUnmounted(unlock)
defineExpose({ open })
</script>

<template>
  <dialog ref="dialog" class="building-service-dialog" :lang="isEnglish ? 'en' : 'fa'" :dir="isEnglish ? 'ltr' : 'rtl'" aria-labelledby="building-finder-title" @close="closed" @keydown.esc.stop.prevent="dialog.close()" @click="($event) => { if ($event.target === dialog) dialog.close() }">
    <header class="building-finder-heading">
      <div><h2 id="building-finder-title">{{ isEnglish ? 'Where does your service fit in the building?' : 'خدمت شما، کجای ساختمان است؟' }}</h2><p>{{ formatNumber(catalog.length, locale) }} {{ isEnglish ? 'services, from design through construction and project support.' : 'خدمت؛ یک مسیر از طراحی تا ساخت و همراهی پروژه.' }}</p></div>
      <button type="button" class="building-finder-close" :aria-label="isEnglish ? 'Close the service list' : 'بستن فهرست خدمات'" @click="dialog.close()">×</button>
    </header>
    <div class="building-finder-filters">
      <label><span>{{ isEnglish ? 'Search services' : 'جست‌وجوی خدمت' }}</span><input ref="searchInput" v-model="query" type="search" :placeholder="isEnglish ? 'For example: soil testing, supervision, lifts…' : 'مثلاً آزمایش خاک، نظارت، آسانسور…'" autocomplete="off"></label>
      <label><span>{{ isEnglish ? 'Service group' : 'گروه خدمات' }}</span><select v-model="category"><option value="all">{{ isEnglish ? 'All groups' : 'همهٔ گروه‌ها' }}</option><option v-for="group in categories" :key="group.id" :value="group.id">{{ group.label }}</option></select></label>
    </div>
    <p class="building-finder-count" role="status">{{ formatNumber(resultCount, locale) }} {{ isEnglish ? 'services found. Select one to see it on the model.' : 'خدمت پیدا شد. برای دیدن ارتباط با مدل، خدمت را انتخاب کنید.' }}</p>
    <div class="building-finder-results">
      <section v-for="group in groups" :key="group.id" :aria-labelledby="`building-finder-${group.id}`">
        <h3 :id="`building-finder-${group.id}`">{{ group.label }}</h3>
        <ul><li v-for="service in group.services" :key="service.name"><button type="button" :aria-label="isEnglish ? `Show ${serviceLabel(service)} on the building` : `نمایش ${serviceLabel(service)} روی ساختمان`" @click="select(service)"><span :lang="serviceLanguage(service)" dir="auto">{{ serviceLabel(service) }}<small>{{ locations(service) }}</small></span><span aria-hidden="true">↗</span></button></li></ul>
      </section>
      <div v-if="!resultCount" class="building-finder-empty"><p>{{ isEnglish ? 'No services match this search and group.' : 'خدمتی با این عبارت و گروه پیدا نشد.' }}</p><button type="button" @click="query = ''; category = 'all'">{{ isEnglish ? 'Show all services' : 'نمایش همهٔ خدمات' }}</button></div>
    </div>
    <footer>{{ isEnglish ? 'Supervision, management and whole-project services can span multiple stages. The scope is defined for each project.' : 'خدمات نظارت، مدیریت و همکاری کلان به کل پروژه مربوط‌اند؛ دامنهٔ همکاری برای هر پروژه تعیین می‌شود.' }}</footer>
  </dialog>
</template>

<style scoped>
.building-service-dialog { position: fixed; inset: 0; width: min(850px, calc(100vw - var(--space-8))); max-height: min(85svh, 900px); margin: auto; padding: 0; border: 1px solid var(--border-strong); color: var(--text-primary); background: var(--surface-paper); box-shadow: var(--shadow-overlay); overflow: auto; }
.building-service-dialog::backdrop { background: color-mix(in srgb, var(--brand-forest-deep) 60%, transparent); }
.building-finder-heading { display: flex; justify-content: space-between; align-items: start; gap: var(--space-4); padding: var(--space-6); }
.building-finder-heading h2 { margin: 0; color: var(--brand-forest); font-size: var(--text-section-title); font-weight: 500; }
.building-finder-heading p, .building-finder-count { margin: var(--space-2) 0 0; color: var(--text-secondary); font-size: var(--text-small); line-height: var(--line-body); }
.building-service-dialog button { min-height: 44px; color: var(--brand-forest); background: transparent; font: inherit; cursor: pointer; }
.building-finder-close { flex-shrink: 0; width: 44px; border: 1px solid var(--border-subtle); font-size: var(--text-record-title) !important; }
.building-finder-filters { display: grid; grid-template-columns: 1.5fr 1fr; gap: var(--space-4); padding: 0 var(--space-6); }
.building-finder-filters label { display: grid; gap: var(--space-2); min-width: 0; color: var(--text-secondary); font-size: var(--text-small); }
.building-finder-filters input, .building-finder-filters select { width: 100%; min-width: 0; min-height: 48px; padding: var(--space-2) var(--space-3); border: 1px solid var(--border-strong); border-radius: 0; background: var(--surface-paper); color: var(--text-primary); font: inherit; }
.building-finder-count { padding: var(--space-3) var(--space-6); }
.building-finder-results { padding: 0 var(--space-6) var(--space-6); }
.building-finder-results h3 { margin: var(--space-6) 0 var(--space-2); color: var(--brand-green); font-size: var(--text-body); font-weight: 500; }
.building-finder-results ul { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); list-style: none; margin: 0; padding: 0; gap: 0 var(--space-6); }
.building-finder-results li { min-width: 0; border-bottom: 1px solid var(--border-subtle); }
.building-finder-results li button { display: flex; width: 100%; justify-content: space-between; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-2); border: 0; text-align: start; font-size: var(--text-small); line-height: var(--line-body); }
.building-finder-results small { display: block; color: var(--text-secondary); font-size: var(--text-caption); }
.building-finder-results button:hover { background: var(--surface-mint); }
.building-service-dialog :is(button, input, select):focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.building-finder-empty { padding-block: var(--space-8); text-align: center; }
.building-finder-empty button { border: 1px solid var(--border-strong); padding-inline: var(--space-4); font-size: var(--text-small); }
.building-service-dialog footer { padding: var(--space-4) var(--space-6); border-top: 1px solid var(--border-subtle); background: var(--surface-soft); color: var(--text-secondary); font-size: var(--text-caption); line-height: var(--line-body); }
@media (max-width: 600px) {
  .building-service-dialog { width: calc(100vw - var(--space-4)); max-height: 92svh; }
  .building-finder-heading, .building-finder-count, .building-finder-results, .building-service-dialog footer { padding-inline: var(--space-4); }
  .building-finder-filters { grid-template-columns: minmax(0, 1fr); padding-inline: var(--space-4); gap: var(--space-2); }
  .building-finder-results ul { grid-template-columns: minmax(0, 1fr); }
}
</style>
