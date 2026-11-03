<script setup>
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
})

const emit = defineEmits(['move-gallery'])
</script>

<template>
  <article class="project-detail page-container">
    <div class="project-detail-topline">
      <a class="project-back" href="#/projects"><span aria-hidden="true">→</span> بازگشت به پروژه‌های شرکت</a>
      <span dir="ltr">{{ project.code || `G-${project.id}` }}</span>
    </div>

    <header class="project-detail-hero">
      <div class="project-detail-copy">
        <div class="eyebrow">
          {{ project.source === 'telegram-report' ? 'گزارش مستقل' : project.source === 'field-reports' ? 'پروژه کارگاهی' : 'پروژهٔ شرکت' }}
          <span class="en-label" dir="ltr">/ {{ project.code || `G-${project.id}` }}</span>
        </div>
        <div class="detail-status"><i :class="['status-dot', statusClass(project.status)]"></i>{{ projectStatus(project.status) }}<span>{{ projectCategory(project) }}</span></div>
        <h1>{{ projectTitle(project) }}</h1>
        <p>{{ project.description || 'پروژه‌ای از سوابق شرکت با تصاویر و مشخصات کلی.' }}</p>
        <div class="project-tag-list"><span v-for="tag in [...(project.services || []), ...(project.tags || [])]" :key="tag">{{ tag }}</span></div>
      </div>

      <figure class="project-detail-cover">
        <img v-if="images.length" :src="images[galleryIndex]" :alt="`تصویر ثبت‌شده برای ${project.code || `G-${project.id}`}`" @error="fallbackImage">
        <div v-else class="project-detail-no-image">گالری تصاویر پروژه</div>
        <figcaption>
          <span>{{ !images.length ? 'گالری پروژه' : project.finalImage && images[galleryIndex] === project.finalImage ? 'تصویر نهایی ثبت‌شده' : 'تصویر پروژه' }}</span>
          <strong v-if="project.updatedAt">{{ projectDate(project.updatedAt) }}</strong>
        </figcaption>
        <div v-if="images.length > 1" class="detail-gallery-controls">
          <button type="button" aria-label="تصویر قبلی" @click="emit('move-gallery', -1)">→</button>
          <span>{{ displayNumber(galleryIndex + 1) }} / {{ displayNumber(images.length) }}</span>
          <button type="button" aria-label="تصویر بعدی" @click="emit('move-gallery', 1)">←</button>
        </div>
      </figure>
    </header>

    <div class="project-detail-layout">
      <section class="project-timeline" aria-labelledby="project-timeline-title">
        <div class="detail-section-heading">
          <div class="eyebrow">روند ثبت‌شده <span class="en-label" dir="ltr">/ TIMELINE</span></div>
          <h2 id="project-timeline-title">گزارش‌های تصویری<br><em>از تازه به قدیم.</em></h2>
        </div>
        <div v-if="project.timeline?.length" class="timeline-list">
          <article v-for="(entry, index) in project.timeline" :key="`${entry.date}-${index}`" class="timeline-entry">
            <div class="timeline-marker" aria-hidden="true"><span>{{ displayNumber(index + 1).padStart(2, '۰') }}</span></div>
            <div class="timeline-card">
              <div class="timeline-date">
                <time :datetime="entry.date || undefined">{{ projectDate(entry.date) }}</time>
                <span :class="`timeline-state state-${entry.status || 'logged'}`">{{ entry.status === 'follow-up' ? 'یادآوری فنی ثبت شد' : entry.status === 'resolved' ? 'پیگیری ثبت شد' : 'ثبت بازدید' }}</span>
              </div>
              <h3>{{ entry.title }}</h3><p v-if="entry.summary">{{ entry.summary }}</p>
              <div v-if="entry.focus" class="timeline-focus"><span>حوزه فنی ثبت‌شده</span><strong>{{ entry.focus }}</strong></div>
              <img v-if="entry.image" class="timeline-image" :src="entry.image" :alt="`تصویر گزارش ${projectDate(entry.date)}، ${entry.title}`" loading="lazy" @error="fallbackImage">
            </div>
          </article>
        </div>
        <div v-else class="timeline-empty"><span class="note-icon" aria-hidden="true">i</span><div><h3>تصاویر منتخب پروژه</h3><p>گالری تصویری و مشخصات پروژه در کنار حوزه‌های خدمت شرکت نمایش داده می‌شوند.</p></div></div>
      </section>

      <aside class="project-facts" aria-label="مشخصات پروژه">
        <div class="eyebrow">مشخصات پروژه <span class="en-label" dir="ltr">/ PROJECT DETAILS</span></div>
        <dl>
          <div><dt>موقعیت کلی</dt><dd>{{ project.address }}</dd></div>
          <div><dt>کاربری</dt><dd>{{ project.usage }}</dd></div>
          <div><dt>نوع خدمت ثبت‌شده</dt><dd>{{ projectCategory(project) }}</dd></div>
          <div v-if="project.updatedAt"><dt>آخرین گزارش تصویری</dt><dd>{{ projectDate(project.updatedAt) }}</dd></div>
          <div><dt>تصاویر پروژه</dt><dd>{{ displayNumber(images.length) }} تصویر</dd></div>
        </dl>
        <a class="button button-dark project-contact" href="#/contact">گفت‌وگو درباره همکاری <span aria-hidden="true">↗</span></a>
      </aside>
    </div>
  </article>
</template>
