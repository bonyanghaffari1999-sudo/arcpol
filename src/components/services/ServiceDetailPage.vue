<script setup>
import { computed } from 'vue'
import { describeService } from '../../service-details.js'

const props = defineProps({
  title: { type: String, required: true },
  group: { type: Object, required: true },
  evidence: { type: Array, default: () => [] },
})

const description = computed(() => describeService(props.title))
const backHref = computed(() => `#/services?category=${encodeURIComponent(props.group.id)}`)
const buildingHref = computed(() => `#/building?service=${encodeURIComponent(props.title)}`)
function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeZone: 'Asia/Tehran' }).format(date)
}
function briefReportSummary(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  const sentence = text.split(/(?<=[.!؟])\s+/u)[0]
  return sentence.length > 220 ? `${sentence.slice(0, 219).trimEnd()}…` : sentence
}
</script>

<template>
  <div class="service-detail-page">
    <div class="page-container service-detail-shell">
      <a class="service-detail-back" :href="backHref"><span aria-hidden="true">→</span> بازگشت به {{ group.title }}</a>
      <header class="service-detail-heading">
        <div>
          <div class="eyebrow">{{ group.title }} <span class="en-label" dir="ltr">/ SERVICE {{ group.number }}</span></div>
          <h1>{{ title }}</h1>
          <p>{{ description }}</p>
        </div>
        <div class="service-detail-actions"><a class="button button-outline" :href="buildingHref">جای این خدمت روی ساختمان <span aria-hidden="true">↗</span></a><a class="button button-dark" href="#/contact">گفت‌وگو دربارهٔ این خدمت <span aria-hidden="true">↗</span></a></div>
      </header>

      <section class="service-detail-note" aria-label="دامنهٔ همکاری">
        <span class="detail-note-index" dir="ltr">{{ group.number }}</span>
        <div><strong>دامنهٔ همکاری</strong><p>این خدمت می‌تواند به‌صورت مستقل یا در کنار سایر مراحل ارائه شود؛ محدودهٔ هر همکاری با توجه به نیاز پروژه تعریف می‌شود.</p></div>
        <span class="service-detail-code" dir="ltr">ARCPOL / ENGINEERING</span>
      </section>

      <section class="service-evidence" aria-labelledby="service-evidence-title">
        <div class="service-evidence-heading">
          <div><span class="eyebrow">آرشیو تصویری <span class="en-label" dir="ltr">/ FIELD RECORDS</span></span><h2 id="service-evidence-title">نمونه‌های مرتبط</h2></div>
          <p>تصویر و عنوان رویداد از گزارش‌هایی انتخاب شده‌اند که صریحاً به این خدمت اشاره دارند.</p>
        </div>
        <div v-if="evidence.length" class="service-evidence-grid">
          <article v-for="(item, index) in evidence" :key="`${item.code}:${item.date}:${item.image}`" class="service-evidence-card">
            <img :src="item.image" :alt="`تصویر آرشیوی مرتبط با ${item.keyword} در یک گزارش کارگاهی`" loading="lazy">
            <div class="service-evidence-meta">
              <span>گزارش تصویری مرتبط با «{{ item.keyword }}»</span>
              <p v-if="briefReportSummary(item.summary)" class="service-evidence-summary">{{ briefReportSummary(item.summary) }}</p>
              <small>{{ formatDate(item.date) }}</small>
            </div>
          </article>
        </div>
        <p v-else class="service-evidence-empty">در آرشیو گزارش‌ها، تصویرِ مشخصی که متن آن به این خدمت اشاره کند ثبت نشده است.</p>
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
.service-evidence-heading { display: flex; align-items: end; justify-content: space-between; gap: var(--space-6); margin-bottom: var(--space-4); }
.service-evidence-heading h2 { margin: var(--space-2) 0 0; color: var(--brand-forest); font-size: var(--text-section-title); font-weight: 500; }
.service-evidence-heading > p { max-width: 430px; margin: 0; color: var(--text-subtle); font-size: var(--text-small); }
.service-evidence-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-3); }
.service-evidence-card { min-width: 0; border: 1px solid var(--border-subtle); background: var(--surface-paper); }
.service-evidence-card img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: var(--surface-soft); }
.service-evidence-meta { display: grid; gap: var(--space-1); padding: var(--space-3); }
.service-evidence-meta span { color: var(--text-primary); font-size: var(--text-small); }
.service-evidence-summary { display: -webkit-box; overflow: hidden; margin: 0; color: var(--text-secondary); font-size: var(--text-caption); line-height: var(--line-body); -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
.service-evidence-meta small { color: var(--text-subtle); font-size: var(--text-caption); }
.service-evidence-empty { margin: 0; padding: var(--space-6); border: 1px dashed var(--border-strong); color: var(--text-secondary); font-size: var(--text-small); }
@media (max-width: 850px) {
  .service-detail-heading { align-items: flex-start; flex-direction: column; }
  .service-evidence-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .service-detail-heading { gap: var(--space-4); padding-block: var(--space-6); }
  .service-detail-note { grid-template-columns: auto 1fr; padding: var(--space-3); }
  .service-detail-code { grid-column: 2; }
  .service-evidence-heading { align-items: flex-start; flex-direction: column; }
}
</style>
