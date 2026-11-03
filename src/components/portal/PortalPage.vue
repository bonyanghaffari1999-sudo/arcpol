<script setup>
import PageIntro from '../patterns/PageIntro.vue'

const stages = [
  { number: '01', title: 'اطلاعات پروژه', caption: 'نمونه', state: 'sample' },
  { number: '02', title: 'مدارک مهندسی', caption: 'نمونه', state: 'sample' },
  { number: '03', title: 'گزارش‌های کارگاهی', caption: 'نمونه', state: 'sample' },
  { number: '04', title: 'مدارک تحویل', caption: 'نمونه', state: 'sample' },
]
</script>

<template>
  <div class="portal-page">
    <PageIntro title-id="portal-page-title">
      <template #eyebrow>پنل مشتریان <span class="en-label" dir="ltr">/ CLIENT PORTAL</span></template>
      <template #title>پروژه،<br><em>در یک نگاه.</em></template>
      <template #description>پیش‌نمایشی از فضای پیگیری مدارک و گزارش‌های پروژه.</template>
      <template #meta>نمونهٔ نمایشی · بدون ورود و بدون اطلاعات واقعی</template>
    </PageIntro>

    <section class="page-container portal-sample-section" aria-labelledby="portal-sample-title">
      <div class="portal-demo-banner"><span aria-hidden="true">i</span><p><strong>نسخهٔ نمایشی</strong> اطلاعات، وضعیت‌ها و مدارک این صفحه ساختگی و فقط برای نمایش شکل پنل هستند.</p></div>
      <div class="portal-sample-card">
        <div class="portal-sample-overview">
          <div class="portal-card-kicker"><span>نمونهٔ پروژه</span><small dir="ltr">DEMO / 001</small></div>
          <h2 id="portal-sample-title">پروژهٔ نمونهٔ ساختمانی</h2>
          <p>نمایی آزمایشی از مسیر همکاری و دسترسی به اطلاعات پروژه.</p>
          <div class="portal-sample-tags"><span>مسکونی</span><span>معماری · سازه · مکانیک · برق</span><span>گزارش تصویری</span></div>
          <a class="button button-outline" href="#/services">مرور خدمات <span aria-hidden="true">↗</span></a>
        </div>
        <div class="portal-journey" aria-label="مراحل نمونهٔ پروژه">
          <div v-for="stage in stages" :key="stage.number" class="portal-stage" :class="`portal-stage-${stage.state}`">
            <span class="portal-stage-number" dir="ltr">{{ stage.number }}</span>
            <div><strong>{{ stage.title }}</strong><small>محتوای آزمایشی</small></div>
            <span class="portal-stage-badge">{{ stage.caption }}</span>
          </div>
        </div>
      </div>
      <div class="portal-demo-foot"><span>این نمونه به هیچ پروژه یا مشتری واقعی متصل نیست.</span><a href="#/contact">گفت‌وگو دربارهٔ همکاری <span aria-hidden="true">←</span></a></div>
    </section>
  </div>
</template>

<style scoped>
.portal-sample-section { padding-block: var(--space-8) var(--space-16); }
.portal-demo-banner { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border: 1px solid var(--border-strong); background: var(--surface-mint); color: var(--brand-forest); }
.portal-demo-banner > span { width: 24px; height: 24px; flex: 0 0 auto; display: grid; place-items: center; border: 1px solid var(--brand-sage); border-radius: 50%; font-family: var(--font-mono); font-size: var(--text-small); }
.portal-demo-banner p { margin: 0; font-size: var(--text-small); }
.portal-demo-banner strong { margin-left: var(--space-2); font-weight: 600; }
.portal-sample-card { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); margin-top: var(--space-6); border: 1px solid var(--border-subtle); background: var(--surface-paper); }
.portal-sample-overview { padding: clamp(var(--space-4), 4vw, var(--space-8)); background: var(--brand-forest); color: var(--text-inverse); }
.portal-card-kicker { display: flex; justify-content: space-between; gap: var(--space-3); color: #b7cbbc; font-size: var(--text-caption); }
.portal-card-kicker small { font-family: var(--font-mono); letter-spacing: .08em; }
.portal-sample-overview h2 { margin: var(--space-8) 0 var(--space-2); font-size: var(--text-record-title); font-weight: 500; }
.portal-sample-overview p { max-width: 330px; margin: 0; color: #cfdbd1; font-size: var(--text-small); }
.portal-sample-tags { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-block: var(--space-6); }
.portal-sample-tags span { padding: 5px 8px; border: 1px solid rgba(227,238,229,.3); color: #d6e1d8; font-size: var(--text-caption); }
.portal-sample-overview .button { border-color: rgba(221,236,225,.6); background: transparent; color: white; }
.portal-journey { display: grid; align-content: center; padding: clamp(var(--space-4), 4vw, var(--space-8)); }
.portal-stage { position: relative; min-height: 75px; display: grid; grid-template-columns: 38px 1fr auto; align-items: center; gap: var(--space-3); border-bottom: 1px solid var(--border-subtle); }
.portal-stage:last-child { border-bottom: 0; }
.portal-stage-number { color: var(--brand-green); font-family: var(--font-mono); font-size: var(--text-small); }
.portal-stage div { display: grid; gap: 2px; }
.portal-stage strong { color: var(--text-primary); font-size: var(--text-small); font-weight: 600; }
.portal-stage small { color: var(--text-subtle); font-size: var(--text-caption); }
.portal-stage-badge { padding: 3px 8px; background: var(--surface-soft); color: var(--text-secondary); font-size: var(--text-caption); }
.portal-demo-foot { display: flex; justify-content: space-between; gap: var(--space-4); margin-top: var(--space-4); color: var(--text-subtle); font-size: var(--text-caption); }
.portal-demo-foot a { color: var(--brand-forest); font-size: var(--text-small); }
@media (max-width: 760px) {
  .portal-sample-card { grid-template-columns: 1fr; }
  .portal-sample-overview h2 { margin-top: var(--space-6); }
  .portal-demo-foot { flex-direction: column; }
}
</style>
