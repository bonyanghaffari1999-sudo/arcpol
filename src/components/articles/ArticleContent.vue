<script setup>
import Eyebrow from '../common/Eyebrow.vue'

defineProps({
  article: { type: Object, required: true },
  content: { type: Object, default: () => ({ paragraphs: [], files: [] }) },
})

function fileType(file) {
  if (['read-online', 'catalog'].includes(file?.accessMode)) return 'WEB'
  if (file?.localAvailable || file?.accessMode === 'local-pdf') return 'PDF'
  const extension = String(file?.name || '').split('.').pop()
  return extension && extension !== file?.name ? extension.slice(0, 4).toUpperCase() : 'LINK'
}
</script>

<template>
  <article class="page-container article-detail-content">
    <img v-if="article.image" class="article-detail-image" :src="article.image" :alt="`تصویر مقالهٔ ${article.title}`" loading="lazy" @error="$event.currentTarget.hidden = true">
    <p v-if="!content?.paragraphs?.length && article.excerpt" class="article-detail-excerpt">{{ article.excerpt }}</p>
    <p v-for="(paragraph, index) in content?.paragraphs || []" :key="`${article.id}-${index}`">{{ paragraph }}</p>

    <section v-if="content?.files?.length" class="article-attachments" aria-labelledby="article-attachments-title">
      <Eyebrow>منابع و پیوست‌ها <span class="en-label" dir="ltr">/ SOURCES &amp; FILES</span></Eyebrow>
      <h2 id="article-attachments-title">دسترسی به مستندات این عنوان</h2>
      <p class="article-attachment-intro">فایل‌های PDF محلی مستقیم دریافت می‌شوند؛ نسخه‌ها و منابع ناشر یا مرجع هر پیوست نیز جداگانه مشخص شده‌اند.</p>
      <ul>
        <li v-for="(file, index) in content.files" :key="`${article.id}-${index}`">
          <span class="attachment-type" aria-hidden="true" dir="ltr">{{ fileType(file) }}</span>
          <div class="article-resource-copy">
            <strong dir="auto">{{ file.name }}</strong>
            <div class="article-resource-meta">
              <span v-if="file.edition">ویرایش: {{ file.edition }}</span>
              <span v-if="file.publisher">ناشر سند: {{ file.publisher }}</span>
              <span v-if="file.sourceName">مرجع/میزبان: {{ file.sourceName }}</span>
            </div>
            <p v-if="file.accessNote" class="article-resource-note">{{ file.accessNote }}</p>
            <div class="article-resource-actions">
              <a v-if="file.sourceUrl" class="article-resource-link" :href="file.sourceUrl" :target="file.localAvailable ? undefined : '_blank'" :download="file.localAvailable ? file.localFilename || true : undefined" rel="noopener noreferrer">
                {{ file.sourceLabel || 'بازکردن منبع' }} <span aria-hidden="true">{{ file.localAvailable ? '↓' : '↗' }}</span>
              </a>
              <a v-if="file.sourcePage && file.sourcePage !== file.sourceUrl" class="article-resource-source" :href="file.sourcePage" target="_blank" rel="noopener noreferrer">
                {{ file.sourcePageLabel || 'صفحهٔ معرفی و نسخه‌ها' }}
              </a>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <aside v-if="content?.resourceMessage" class="article-archive-note" role="note">
      <span class="note-icon" aria-hidden="true">i</span>
      <p>{{ content.resourceMessage }}</p>
    </aside>

    <aside v-else-if="!content?.paragraphs?.length && !content?.files?.length" class="article-archive-note" role="note">
      <span class="note-icon" aria-hidden="true">i</span>
      <p>برای این عنوان، اطلاعات ثبت‌شده شامل مشخصات مقاله و تصویر معرفی آن است.</p>
    </aside>
  </article>
</template>
