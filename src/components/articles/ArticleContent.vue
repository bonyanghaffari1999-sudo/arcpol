<script setup>
import Eyebrow from '../common/Eyebrow.vue'
import { articleTitle, articleTitlesEn, articleUiEn } from '../../i18n/other-pages-en.js'
import { localizeDigits } from '../../i18n/numbers.js'

const props = defineProps({
  locale: { type: String, default: 'fa' },
  article: { type: Object, required: true },
  content: { type: Object, default: () => ({ paragraphs: [], files: [] }) },
})

const isEnglish = () => props.locale === 'en'
const title = () => localizeDigits(isEnglish() ? articleTitle(props.article) : props.article.title, props.locale)
const paragraphs = () => (isEnglish() && props.article.id === 1 ? [articleUiEn.forgingParagraph] : (props.content?.paragraphs || [])).map((paragraph) => localizeDigits(paragraph, props.locale))
const paragraphLanguage = () => isEnglish() && props.article.id === 1 ? 'en' : 'fa'
function sourceLabel(file) { return localizeDigits(isEnglish() ? articleUiEn.fileSourceLabels[file.sourceLabel] || file.sourceLabel || articleUiEn.openSource : file.sourceLabel || 'بازکردن منبع', props.locale) }
function sourcePageLabel(file) { return localizeDigits(isEnglish() ? articleUiEn.filePageLabels[file.sourcePageLabel] || file.sourcePageLabel || articleUiEn.sourcePage : file.sourcePageLabel || 'صفحهٔ معرفی و نسخه‌ها', props.locale) }
function accessNote(file) { return localizeDigits(isEnglish() ? articleUiEn.fileAccessNotes[file.accessNote] || file.accessNote : file.accessNote, props.locale) }
function accessNoteLanguage(file) { return isEnglish() && articleUiEn.fileAccessNotes[file.accessNote] ? 'en' : 'fa' }

function fileType(file) {
  if (['read-online', 'catalog'].includes(file?.accessMode)) return 'WEB'
  if (file?.localAvailable || file?.accessMode === 'local-pdf') return 'PDF'
  const extension = String(file?.name || '').split('.').pop()
  return extension && extension !== file?.name ? extension.slice(0, 4).toUpperCase() : 'LINK'
}
</script>

<template>
  <article class="page-container article-detail-content" :lang="isEnglish() ? 'en' : 'fa'" :dir="isEnglish() ? 'ltr' : 'rtl'">
    <img v-if="article.image" class="article-detail-image" :src="article.image" :alt="isEnglish() ? `Illustration for ${title()}` : `تصویر مقالهٔ ${title()}`" loading="lazy" @error="$event.currentTarget.hidden = true">
    <p v-if="!paragraphs().length && article.excerpt" class="article-detail-excerpt" lang="fa" dir="auto">{{ localizeDigits(article.excerpt, locale) }}</p>
    <p v-for="(paragraph, index) in paragraphs()" :key="`${article.id}-${index}`" :lang="paragraphLanguage()" dir="auto">{{ paragraph }}</p>

    <aside v-if="isEnglish() && content?.files?.length" class="article-archive-note" role="note"><span class="note-icon" aria-hidden="true">i</span><p>{{ articleUiEn.originalPersian }}</p></aside>
    <section v-if="content?.files?.length" class="article-attachments" aria-labelledby="article-attachments-title">
      <Eyebrow>{{ isEnglish() ? articleUiEn.sources : 'منابع و پیوست‌ها' }} <span class="en-label" dir="ltr">/ SOURCES &amp; FILES</span></Eyebrow>
      <h2 id="article-attachments-title">{{ isEnglish() ? articleUiEn.attachmentsTitle : 'دسترسی به مستندات این عنوان' }}</h2>
      <p class="article-attachment-intro">{{ isEnglish() ? articleUiEn.attachmentIntro : 'فایل‌های PDF محلی مستقیم دریافت می‌شوند؛ نسخه‌ها و منابع ناشر یا مرجع هر پیوست نیز جداگانه مشخص شده‌اند.' }}</p>
      <ul>
        <li v-for="(file, index) in content.files" :key="`${article.id}-${index}`">
          <span class="attachment-type" aria-hidden="true" dir="ltr">{{ fileType(file) }}</span>
          <div class="article-resource-copy">
            <strong :lang="isEnglish() ? 'fa' : undefined" dir="auto">{{ localizeDigits(file.name, locale) }}</strong>
            <div class="article-resource-meta">
              <span v-if="file.edition">{{ isEnglish() ? 'Edition' : 'ویرایش' }}: {{ localizeDigits(file.edition, locale) }}</span>
              <span v-if="file.publisher">{{ isEnglish() ? 'Publisher' : 'ناشر سند' }}: <span :lang="isEnglish() ? 'fa' : undefined" dir="auto">{{ localizeDigits(file.publisher, locale) }}</span></span>
              <span v-if="file.sourceName">{{ isEnglish() ? 'Reference / host' : 'مرجع/میزبان' }}: <span :lang="isEnglish() ? 'fa' : undefined" dir="auto">{{ localizeDigits(file.sourceName, locale) }}</span></span>
            </div>
            <p v-if="file.accessNote" class="article-resource-note" :lang="accessNoteLanguage(file)" dir="auto">{{ accessNote(file) }}</p>
            <div class="article-resource-actions">
              <a v-if="file.sourceUrl" class="article-resource-link" :href="file.sourceUrl" :target="file.localAvailable ? undefined : '_blank'" :download="file.localAvailable ? file.localFilename || true : undefined" rel="noopener noreferrer">
                <span :lang="isEnglish() && articleUiEn.fileSourceLabels[file.sourceLabel] ? 'en' : 'fa'">{{ sourceLabel(file) }}</span> <span aria-hidden="true">{{ file.localAvailable ? '↓' : '↗' }}</span>
              </a>
              <a v-if="file.sourcePage && file.sourcePage !== file.sourceUrl" class="article-resource-source" :href="file.sourcePage" target="_blank" rel="noopener noreferrer">
                <span :lang="isEnglish() && articleUiEn.filePageLabels[file.sourcePageLabel] ? 'en' : 'fa'">{{ sourcePageLabel(file) }}</span>
              </a>
            </div>
          </div>
        </li>
      </ul>
    </section>

    <aside v-if="content?.resourceMessage" class="article-archive-note" role="note">
      <span class="note-icon" aria-hidden="true">i</span>
      <p :lang="isEnglish() ? 'fa' : undefined" dir="auto">{{ localizeDigits(content.resourceMessage, locale) }}</p>
    </aside>

    <aside v-else-if="!content?.paragraphs?.length && !content?.files?.length" class="article-archive-note" role="note">
      <span class="note-icon" aria-hidden="true">i</span>
      <p>{{ isEnglish() ? articleUiEn.localInfo : 'برای این عنوان، اطلاعات ثبت‌شده شامل مشخصات مقاله و تصویر معرفی آن است.' }}</p>
    </aside>
  </article>
</template>
