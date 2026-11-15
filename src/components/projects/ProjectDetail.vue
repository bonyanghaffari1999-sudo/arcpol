<script setup>
import { projectTerm, projectTextLanguage, projectNumber, projectDateLabel, projectTitleLabel, projectStatusLabel } from '../../i18n/projects-en.js'
import { localizeDigits } from '../../i18n/numbers.js'
defineProps({
  project: { type: Object, required: true },
  images: { type: Array, required: true },
  galleryIndex: { type: Number, required: true },
  projectStatus: { type: Function, required: true },
  statusClass: { type: Function, required: true },
  projectCategory: { type: Function, required: true },
  projectTitle: { type: Function, required: true },
  projectDate: { type: Function, required: true },
  displayNumber: { type: Function, required: true },
  fallbackImage: { type: Function, required: true },
  locale: { type: String, default: 'fa' },
})

const emit = defineEmits(['move-gallery'])
</script>

<template>
  <article class="project-detail page-container">
    <div class="project-detail-topline">
      <a class="project-back" href="/projects"><span aria-hidden="true">{{ locale === 'en' ? '←' : '→' }}</span> {{ locale === 'en' ? 'Back to projects' : 'بازگشت به پروژه‌های شرکت' }}</a>
      <span v-if="project.code" dir="ltr">{{ localizeDigits(project.code, locale) }}</span>
      <span v-else>{{ locale === 'en' ? 'Company archive' : 'آرشیو شرکت' }}</span>
    </div>

    <header class="project-detail-hero">
      <div class="project-detail-copy">
        <div class="eyebrow">
          {{ locale === 'en' ? (project.source === 'telegram-report' ? 'INDEPENDENT REPORT' : project.source === 'field-reports' && !/^G-\d+$/iu.test(project.code || '') ? 'STANDALONE PHOTO REPORT' : project.source === 'field-reports' ? 'TELEGRAM PROJECT GROUP' : 'COMPANY PROJECT') : (project.source === 'telegram-report' ? 'گزارش مستقل' : project.source === 'field-reports' && !/^G-\d+$/iu.test(project.code || '') ? 'گزارش تصویری بدون کد پروژه' : project.source === 'field-reports' ? 'گروه پروژه در تلگرام' : 'پروژهٔ شرکت') }}
          <span v-if="project.code" class="en-label" dir="ltr">/ {{ localizeDigits(project.code, locale) }}</span>
        </div>
        <div class="detail-status"><i :class="['status-dot', statusClass(project.status)]"></i>{{ projectStatusLabel(project.status, locale, projectStatus) }}<span :lang="projectTextLanguage(projectCategory(project), locale)" dir="auto">{{ projectTerm(projectCategory(project), locale) }}</span></div>
        <h1>{{ projectTitleLabel(project, locale, projectTitle) }}</h1>
        <p v-if="project.description" :lang="projectTextLanguage(project.description, locale)" dir="auto">{{ projectTerm(project.description, locale) }}</p><p v-else>{{ locale === 'en' ? 'A project from the company archive with photographs and general details.' : 'پروژه‌ای از سوابق شرکت با تصاویر و مشخصات کلی.' }}</p>
        <div class="project-tag-list"><span v-for="tag in [...(project.services || []), ...(project.tags || [])]" :key="tag" :lang="projectTextLanguage(tag, locale)" dir="auto">{{ projectTerm(tag, locale) }}</span></div>
      </div>

      <figure class="project-detail-cover">
        <img v-if="images.length" :src="images[galleryIndex]" :alt="locale === 'en' ? `Photograph recorded for ${projectTitleLabel(project, locale, projectTitle)}` : `تصویر ثبت‌شده برای ${projectTitle(project)}`" @error="fallbackImage">
        <div v-else class="project-detail-no-image">{{ locale === 'en' ? 'Project image gallery' : 'گالری تصاویر پروژه' }}</div>
        <figcaption>
          <span>{{ locale === 'en' ? (!images.length ? 'Project gallery' : project.finalImage && images[galleryIndex] === project.finalImage ? 'Recorded final image' : 'Project image') : (!images.length ? 'گالری پروژه' : project.finalImage && images[galleryIndex] === project.finalImage ? 'تصویر نهایی ثبت‌شده' : 'تصویر پروژه') }}</span>
          <strong v-if="project.updatedAt">{{ projectDateLabel(project.updatedAt, locale) }}</strong>
        </figcaption>
        <div v-if="images.length > 1" class="detail-gallery-controls">
          <button type="button" :aria-label="locale === 'en' ? 'Previous image' : 'تصویر قبلی'" @click="emit('move-gallery', -1)">{{ locale === 'en' ? '←' : '→' }}</button>
          <span>{{ projectNumber(galleryIndex + 1, locale) }} / {{ projectNumber(images.length, locale) }}</span>
          <button type="button" :aria-label="locale === 'en' ? 'Next image' : 'تصویر بعدی'" @click="emit('move-gallery', 1)">{{ locale === 'en' ? '→' : '←' }}</button>
        </div>
      </figure>
    </header>

    <div class="project-detail-layout">
      <section class="project-timeline" aria-labelledby="project-timeline-title">
        <div class="detail-section-heading">
          <div class="eyebrow">{{ locale === 'en' ? 'RECORDED TIMELINE' : 'روند ثبت‌شده / TIMELINE' }}</div>
          <h2 id="project-timeline-title"><template v-if="locale === 'en'">Photo reports<br><em>newest first.</em></template><template v-else>گزارش‌های تصویری<br><em>از تازه به قدیم.</em></template></h2>
          <p v-if="locale === 'en'">Report text without a verified English translation is shown in its original Persian.</p>
        </div>
        <div v-if="project.timeline?.length" class="timeline-list">
          <article v-for="(entry, index) in project.timeline" :key="`${entry.date}-${index}`" class="timeline-entry">
            <div class="timeline-marker" aria-hidden="true"><span>{{ projectNumber(index + 1, locale).padStart(2, locale === 'en' ? '0' : '۰') }}</span></div>
            <div class="timeline-card">
              <div class="timeline-date">
                <time :datetime="entry.date || undefined">{{ projectDateLabel(entry.date, locale) }}</time>
                <span :class="`timeline-state state-${entry.status || 'logged'}`">{{ locale === 'en' ? (entry.status === 'follow-up' ? 'Technical reminder recorded' : entry.status === 'resolved' ? 'Follow-up recorded' : 'Site visit recorded') : (entry.status === 'follow-up' ? 'یادآوری فنی ثبت شد' : entry.status === 'resolved' ? 'پیگیری ثبت شد' : 'ثبت بازدید') }}</span>
              </div>
              <h3 :lang="projectTextLanguage(entry.title, locale)" dir="auto">{{ projectTerm(entry.title, locale) }}</h3><p v-if="entry.summary" :lang="projectTextLanguage(entry.summary, locale)" dir="auto">{{ projectTerm(entry.summary, locale) }}</p>
              <div v-if="entry.focus" class="timeline-focus"><span>{{ locale === 'en' ? 'Recorded technical area' : 'حوزه فنی ثبت‌شده' }}</span><strong :lang="projectTextLanguage(entry.focus, locale)" dir="auto">{{ projectTerm(entry.focus, locale) }}</strong></div>
              <img v-if="entry.image" class="timeline-image" :src="entry.image" :alt="locale === 'en' ? `Site report photograph, ${projectDateLabel(entry.date, locale)}` : `تصویر گزارش ${projectDate(entry.date)}، ${entry.title}`" loading="lazy" @error="fallbackImage">
            </div>
          </article>
        </div>
        <div v-else class="timeline-empty"><span class="note-icon" aria-hidden="true">i</span><div><h3>{{ locale === 'en' ? 'Selected project images' : 'تصاویر منتخب پروژه' }}</h3><p>{{ locale === 'en' ? 'Project images and details are shown alongside the company’s service areas.' : 'گالری تصویری و مشخصات پروژه در کنار حوزه‌های خدمت شرکت نمایش داده می‌شوند.' }}</p></div></div>
      </section>

      <aside class="project-facts" :aria-label="locale === 'en' ? 'Project details' : 'مشخصات پروژه'">
        <div class="eyebrow">{{ locale === 'en' ? 'PROJECT DETAILS' : 'مشخصات پروژه / PROJECT DETAILS' }}</div>
        <dl>
          <div><dt>{{ locale === 'en' ? 'General location' : 'موقعیت کلی' }}</dt><dd :lang="projectTextLanguage(project.address, locale)" dir="auto">{{ projectTerm(project.address, locale) }}</dd></div>
          <div><dt>{{ locale === 'en' ? 'Use' : 'کاربری' }}</dt><dd :lang="projectTextLanguage(project.usage, locale)" dir="auto">{{ projectTerm(project.usage, locale) }}</dd></div>
          <div><dt>{{ locale === 'en' ? 'Recorded service' : 'نوع خدمت ثبت‌شده' }}</dt><dd :lang="projectTextLanguage(projectCategory(project), locale)" dir="auto">{{ projectTerm(projectCategory(project), locale) }}</dd></div>
          <div v-if="project.updatedAt"><dt>{{ locale === 'en' ? 'Latest photo report' : 'آخرین گزارش تصویری' }}</dt><dd>{{ projectDateLabel(project.updatedAt, locale) }}</dd></div>
          <div><dt>{{ locale === 'en' ? 'Project images' : 'تصاویر پروژه' }}</dt><dd>{{ projectNumber(images.length, locale) }} {{ locale === 'en' ? 'images' : 'تصویر' }}</dd></div>
        </dl>
        <a class="button button-dark project-contact" href="/contact">{{ locale === 'en' ? 'Discuss your project' : 'گفت‌وگو درباره همکاری' }} <span aria-hidden="true">↗</span></a>
      </aside>
    </div>
  </article>
</template>
