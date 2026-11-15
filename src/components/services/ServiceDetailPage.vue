<script setup>
import { computed } from 'vue'
import { describeService } from '../../service-details.js'
import { serviceDescriptionsEn, serviceGroupsEn, serviceNamesEn } from '../../i18n/services-en.js'
import { localizeDigits, numberLocale } from '../../i18n/numbers.js'
import ServiceScopePreview from './ServiceScopePreview.vue'

const props = defineProps({
  title: { type: String, required: true },
  group: { type: Object, required: true },
  evidence: { type: Array, default: () => [] },
  evidenceLoading: { type: Boolean, default: false },
  evidenceError: { type: Boolean, default: false },
  locale: { type: String, default: 'fa' },
})

const isEnglish = computed(() => props.locale === 'en')
const displayTitle = computed(() => localizeDigits(isEnglish.value ? serviceNamesEn[props.title] || props.title : props.title, props.locale))
const displayGroup = computed(() => localizeDigits(isEnglish.value ? serviceGroupsEn[props.group.id]?.title || props.group.title : props.group.title, props.locale))
const description = computed(() => localizeDigits(isEnglish.value ? serviceDescriptionsEn[props.title] || '' : describeService(props.title), props.locale))
const backHref = computed(() => `/services?category=${encodeURIComponent(props.group.id)}${isEnglish.value ? '&lang=en' : ''}`)
const buildingHref = computed(() => `/building?service=${encodeURIComponent(props.title)}${isEnglish.value ? '&lang=en' : ''}`)
const projectsHref = computed(() => isEnglish.value ? '/projects?lang=en' : '/projects')
const contactHref = computed(() => {
  const query = new URLSearchParams({ service: props.title })
  if (isEnglish.value) query.set('lang', 'en')
  return `/contact?${query.toString()}`
})
const displayGroupNumber = computed(() => localizeDigits(props.group.number, props.locale))
const displayCode = (code) => localizeDigits(code, props.locale)
const projectHref = (id) => `/projects/${id}${isEnglish.value ? '?lang=en' : ''}`
function evidenceSourceLabel(item) {
  if (item.sourceKind === 'company-curated') return isEnglish.value
    ? `Company-selected archive image · ${displayCode(item.code)}`
    : `نمونهٔ آرشیوی انتخاب‌شده توسط شرکت · ${displayCode(item.code)}`
  if (item.sourceKind === 'previous-site') return isEnglish.value ? 'Company project record · previous website' : 'رکورد پروژهٔ شرکت · سایت پیشین'
  return isEnglish.value ? 'Related site report' : `گزارش تصویری مرتبط با «${item.keyword}»`
}
function evidenceImageAlt(item) {
  if (item.sourceKind === 'company-curated') return isEnglish.value
    ? `Company-selected archival image from project ${displayCode(item.code)}, associated with ${displayTitle.value}`
    : `تصویر آرشیوی انتخاب‌شده توسط شرکت از پروژهٔ ${displayCode(item.code)} برای معرفی ${displayTitle.value}`
  if (item.sourceKind === 'previous-site') {
    if (item.supervisionSpecificityUnspecified) {
      return isEnglish.value
        ? 'Archive image from a company project recorded as supervision; the supervision model is unspecified'
        : 'تصویر آرشیوی پروژهٔ شرکت با نوع خدمت ثبت‌شدهٔ نظارت؛ نوع نظارت مشخص نشده است'
    }
    return isEnglish.value
      ? 'Archive image from a company project recorded as supervision and construction'
      : 'تصویر آرشیوی پروژهٔ شرکت با نوع خدمت ثبت‌شدهٔ نظارت و اجرا'
  }
  return isEnglish.value
    ? `Archive image from a site report related to ${displayTitle.value}`
    : `تصویر آرشیوی مرتبط با ${item.keyword} در یک گزارش کارگاهی`
}
function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(isEnglish.value ? 'en-GB-u-nu-latn' : numberLocale(props.locale), { dateStyle: 'medium', timeZone: 'Asia/Tehran' }).format(date)
}
function briefReportSummary(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  const sentence = text.split(/(?<=[.!؟])\s+/u)[0]
  return localizeDigits(sentence.length > 220 ? `${sentence.slice(0, 219).trimEnd()}…` : sentence, props.locale)
}
</script>

<template>
  <div class="service-detail-page" :lang="isEnglish ? 'en' : 'fa'" :dir="isEnglish ? 'ltr' : 'rtl'">
    <div class="page-container service-detail-shell">
      <a class="service-detail-back" :href="backHref"><span aria-hidden="true">{{ isEnglish ? '←' : '→' }}</span> {{ isEnglish ? 'Back to' : 'بازگشت به' }} {{ displayGroup }}</a>
      <header class="service-detail-heading">
        <div>
          <div class="eyebrow">{{ displayGroup }} <span class="en-label" dir="ltr">/ SERVICE {{ displayGroupNumber }}</span></div>
          <h1 :lang="isEnglish && !serviceNamesEn[title] ? 'fa' : undefined" dir="auto">{{ displayTitle }}</h1>
          <p v-if="description">{{ description }}</p><p v-else lang="en">An English description for this service is not available yet.</p>
        </div>
        <div class="service-detail-actions"><a class="button button-outline" :href="buildingHref">{{ isEnglish ? 'Explore this service on the building' : 'جای این خدمت روی ساختمان' }} <span aria-hidden="true">↗</span></a><a class="button button-dark" :href="contactHref">{{ isEnglish ? 'Discuss this service' : 'گفت‌وگو دربارهٔ این خدمت' }} <span aria-hidden="true">↗</span></a></div>
      </header>

      <section class="service-detail-note" :aria-label="isEnglish ? 'Scope of work' : 'دامنهٔ همکاری'">
        <span class="detail-note-index" dir="ltr">{{ displayGroupNumber }}</span>
        <div><strong>{{ isEnglish ? 'Scope of work' : 'دامنهٔ همکاری' }}</strong><p>{{ isEnglish ? 'This service can be provided independently or alongside other stages. The scope is defined for each project.' : 'این خدمت می‌تواند به‌صورت مستقل یا در کنار سایر مراحل ارائه شود؛ محدودهٔ هر همکاری با توجه به نیاز پروژه تعریف می‌شود.' }}</p></div>
        <span class="service-detail-code" dir="ltr">ARCPOL / ENGINEERING</span>
      </section>

      <section class="service-evidence" aria-labelledby="service-evidence-title">
        <div class="service-evidence-heading">
          <div><span class="eyebrow">{{ isEnglish ? 'PROJECT & FIELD RECORDS' : 'آرشیو پروژه و گزارش کارگاهی / PROJECT & FIELD RECORDS' }}</span><h2 id="service-evidence-title">{{ isEnglish ? (evidence.length ? 'Related project examples' : 'Explore this service') : (evidence.length ? 'نمونه‌های مستند مرتبط' : 'آشنایی با این خدمت') }}</h2></div>
          <p>{{ isEnglish ? (evidence.length ? 'Examples are linked to explicit archive records or images selected by the company from a documented project.' : 'A visual guide to the service appears below. Verified project records are shown only when the archive supports the link.') : (evidence.length ? 'نمونه‌ها به گزارش‌های صریح یا تصویرهای انتخاب‌شده از یک پروژهٔ ثبت‌شده پیوند دارند.' : 'راهنمای تصویری این خدمت را ببین؛ سابقهٔ پروژه فقط زمانی نمایش داده می‌شود که در آرشیو قابل‌اتصال باشد.') }}</p>
        </div>
        <p v-if="evidenceLoading" class="service-evidence-status" role="status">{{ isEnglish ? 'Loading project and field-report records…' : 'در حال بارگذاری سوابق پروژه و گزارش‌های کارگاهی…' }}</p>
        <p v-else-if="evidenceError" class="service-evidence-status" role="alert">{{ isEnglish ? 'The archive could not be loaded. Reload this page to try again.' : 'بارگذاری آرشیو انجام نشد. صفحه را دوباره بارگذاری کنید و دوباره تلاش کنید.' }}</p>
        <div v-else-if="evidence.length" class="service-evidence-grid">
          <a v-for="(item, index) in evidence" :key="`${item.projectId}:${item.date}:${item.image}`" class="service-evidence-card" :href="projectHref(item.projectId)">
            <img :src="item.image" :alt="evidenceImageAlt(item)" width="640" height="480" loading="lazy">
            <div class="service-evidence-meta">
              <span>{{ evidenceSourceLabel(item) }}</span>
              <p v-if="item.sourceKind === 'previous-site' && item.supervisionSpecificityUnspecified" class="service-evidence-summary" :lang="isEnglish ? 'en' : 'fa'" :dir="isEnglish ? 'ltr' : 'rtl'">{{ isEnglish ? 'The source records supervision only; it does not specify the supervision model.' : 'در منبع فقط «نظارت» ثبت شده؛ نوع نظارت مشخص نشده است.' }}</p>
              <p v-else-if="item.sourceKind === 'previous-site'" class="service-evidence-summary" :lang="isEnglish ? 'en' : 'fa'" :dir="isEnglish ? 'ltr' : 'rtl'">{{ localizeDigits(isEnglish ? 'Recorded service: supervision and construction' : `نوع خدمت ثبت‌شده: ${item.recordedService}`, locale) }}</p>
              <p v-else-if="briefReportSummary(item.summary)" class="service-evidence-summary" lang="fa" dir="rtl">{{ briefReportSummary(item.summary) }}</p>
              <small v-if="item.date">{{ formatDate(item.date) }}</small>
              <strong class="service-evidence-link">{{ isEnglish ? 'View project' : 'مشاهدهٔ پروژه' }} <span aria-hidden="true">↗</span></strong>
            </div>
          </a>
        </div>
        <div v-else class="service-evidence-fallback">
          <ServiceScopePreview :title="title" :description="description || describeService(title)" :group="group" :locale="locale" />
          <aside class="service-evidence-empty" role="note">
            <div>
              <span class="eyebrow">{{ isEnglish ? 'ARCHIVE NOTE' : 'یادداشت آرشیو / ARCHIVE NOTE' }}</span>
              <h3>{{ isEnglish ? 'No project image is explicitly linked to this service yet.' : 'هنوز تصویر پروژه‌ای با مدرک صریح برای این خدمت ثبت نشده است.' }}</h3>
              <p>{{ isEnglish ? 'The public archive does not identify this service on a project record or report. The schematic above is illustrative, not evidence of completed work; unrelated images are not attributed here.' : 'در آرشیو عمومی، این خدمت به‌طور مشخص در رکورد پروژه یا گزارش ثبت نشده است. تصویر شماتیک بالا صرفاً مفهومی است و مستند اجرای کار نیست؛ به همین دلیل تصویر نامرتبطی به این خدمت نسبت داده نمی‌شود.' }}</p>
            </div>
            <a class="button button-outline" :href="projectsHref">{{ isEnglish ? 'Browse company projects' : 'مرور پروژه‌های شرکت' }} <span aria-hidden="true">↗</span></a>
          </aside>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.service-detail-page { min-height: 70vh; padding-block: var(--space-8) var(--space-16); }
.service-detail-back { min-height: 44px; display: inline-flex; align-items: center; gap: var(--space-2); color: var(--brand-green); font-size: var(--text-small); }
.service-detail-back span { font-size: 18px; }
.service-detail-heading { display: flex; align-items: end; justify-content: space-between; gap: var(--space-8); padding-block: var(--space-8) var(--space-12); border-bottom: 1px solid var(--border-subtle); }
.service-detail-heading h1 { margin: var(--space-3) 0; color: var(--brand-forest); font-size: clamp(2rem, 4vw, 3.4rem); font-weight: 500; line-height: 1.5; }
.service-detail-heading p { max-width: 660px; margin: 0; color: var(--text-secondary); font-size: var(--text-lead); line-height: var(--line-reading); }
.service-detail-heading .button { flex: 0 0 auto; }
.service-detail-actions { display: flex; flex-direction: column; align-items: stretch; gap: var(--space-3); flex-shrink: 0; }
.service-detail-note { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--space-4); margin-top: var(--space-8); padding: var(--space-4) var(--space-6); background: var(--surface-mint); }
.detail-note-index { color: var(--brand-green); font-family: var(--font-mono); font-size: 1.4rem; }
.service-detail-note strong { color: var(--brand-forest); font-size: var(--text-body); font-weight: 600; }
.service-detail-note p { margin: 3px 0 0; color: var(--text-secondary); font-size: var(--text-small); }
.service-detail-code { color: var(--text-subtle); font-family: var(--font-mono); font-size: var(--text-caption); letter-spacing: .08em; }
.service-evidence { padding-top: var(--space-12); }
.service-evidence-status { margin: 0; padding: var(--space-4); border-inline-start: 2px solid var(--brand-green); background: var(--surface-soft); color: var(--text-secondary); font-size: var(--text-small); }
.service-evidence-heading { display: flex; align-items: end; justify-content: space-between; gap: var(--space-6); margin-bottom: var(--space-4); }
.service-evidence-heading h2 { margin: var(--space-2) 0 0; color: var(--brand-forest); font-size: var(--text-section-title); font-weight: 500; }
.service-evidence-heading > p { max-width: 430px; margin: 0; color: var(--text-subtle); font-size: var(--text-small); }
.service-evidence-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-3); }
.service-evidence-card { min-width: 0; border: 1px solid var(--border-subtle); background: var(--surface-paper); color: inherit; text-decoration: none; transition: border-color var(--duration-fast), transform var(--duration-fast); }
.service-evidence-card:hover { border-color: var(--brand-green); transform: translateY(-2px); }
.service-evidence-card:focus-visible { outline: 2px solid var(--brand-green); outline-offset: 3px; }
.service-evidence-card img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: var(--surface-soft); }
.service-evidence-meta { display: grid; gap: var(--space-1); padding: var(--space-3); }
.service-evidence-meta span { color: var(--text-primary); font-size: var(--text-small); }
.service-evidence-summary { display: -webkit-box; overflow: hidden; margin: 0; color: var(--text-secondary); font-size: var(--text-caption); line-height: var(--line-body); -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.service-evidence-meta small { color: var(--text-subtle); font-size: var(--text-caption); }
.service-evidence-link { display: flex; align-items: center; justify-content: space-between; margin-top: var(--space-2); color: var(--brand-green); font-size: var(--text-caption); font-weight: 600; }
.service-evidence-fallback { display: grid; gap: var(--space-4); }
.service-evidence-empty { display: flex; align-items: center; justify-content: space-between; gap: var(--space-6); margin: 0; padding: var(--space-6); border: 1px solid var(--border-subtle); background: var(--surface-ivory); color: var(--text-secondary); }
.service-evidence-empty h3 { margin: var(--space-2) 0; color: var(--brand-forest); font-size: var(--text-card-title); font-weight: 500; }
.service-evidence-empty p { max-width: 52rem; margin: 0; font-size: var(--text-small); line-height: var(--line-reading); }
.service-evidence-empty .button { flex: 0 0 auto; }
@media (max-width: 850px) {
  .service-detail-heading { align-items: flex-start; flex-direction: column; }
  .service-evidence-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .service-detail-heading { gap: var(--space-4); padding-block: var(--space-6); }
  .service-detail-note { grid-template-columns: auto 1fr; padding: var(--space-3); }
  .service-detail-code { grid-column: 2; }
  .service-evidence-heading { align-items: flex-start; flex-direction: column; }
  .service-evidence-empty { align-items: stretch; flex-direction: column; padding: var(--space-4); }
  .service-evidence-empty .button { align-self: flex-start; }
}
@media (prefers-reduced-motion: reduce) {
  .service-evidence-card { transition: none; }
  .service-evidence-card:hover { transform: none; }
}
</style>
