<script setup>
import ArticleContent from './ArticleContent.vue'
import PageIntro from '../patterns/PageIntro.vue'
import { articleTitle, articleTitlesEn, articleUiEn } from '../../i18n/other-pages-en.js'
import { localizeDigits, toLatinDigits } from '../../i18n/numbers.js'

const props = defineProps({
  locale: { type: String, default: 'fa' },
  articles: { type: Array, required: true },
  fallbackImage: { type: String, default: '/images/590856/2.jpg' },
  selectedArticle: { type: Object, default: null },
  selectedContent: { type: Object, default: null },
  search: { type: String, required: true },
  visibleArticles: { type: Array, required: true },
  filteredArticleCount: { type: Number, required: true },
  visibleArticleCount: { type: Number, required: true },
  displayNumber: { type: Function, required: true },
})

const emit = defineEmits(['update:search', 'open-article', 'load-more'])

const isEnglish = () => props.locale === 'en'
function title(article) { return localizeDigits(isEnglish() ? articleTitle(article) : article.title, props.locale) }
function titleLanguage(article) { return isEnglish() && articleTitlesEn[article.id] ? 'en' : 'fa' }
function typeLabel(value) {
  if (!isEnglish()) return localizeDigits(value, props.locale)
  if (value === 'مقاله') return localizeDigits(articleUiEn.article, props.locale)
  if (value === 'خبر') return localizeDigits(articleUiEn.news, props.locale)
  return localizeDigits(value, props.locale)
}
function typeLanguage(value) { return isEnglish() && ['مقاله', 'خبر'].includes(value) ? 'en' : 'fa' }
function englishDate(value) { return toLatinDigits(value || '') }

function imageFailed(event) {
  event.currentTarget.hidden = true
}
</script>

<template>
  <div class="articles-page">
    <template v-if="selectedArticle">
      <section class="page-intro page-container article-detail-intro" aria-labelledby="article-detail-title">
        <a :href="locale === 'en' ? '/articles?lang=en' : '/articles'" class="back-link">{{ isEnglish() ? '← Back to articles' : '← بازگشت به مقالات' }}</a>
        <div class="eyebrow">{{ isEnglish() ? articleUiEn.detailEyebrow : 'دانش فنی' }} <span class="en-label" dir="ltr">/ INSIGHTS</span></div>
        <h1 id="article-detail-title" :lang="titleLanguage(selectedArticle)" dir="auto">{{ title(selectedArticle) }}</h1>
                <div class="article-meta"><span :lang="typeLanguage(selectedArticle.type)" dir="auto">{{ typeLabel(selectedArticle.type) }}</span><i aria-hidden="true"></i><span dir="ltr">{{ isEnglish() ? englishDate(selectedArticle.date) : localizeDigits(selectedArticle.date, locale) }}{{ isEnglish() ? ' · Solar Hijri' : '' }}</span></div>
      </section>
      <ArticleContent :article="selectedArticle" :content="selectedContent" :locale="locale" />
    </template>

    <template v-else>
      <PageIntro title-id="articles-page-title">
        <template #eyebrow>{{ isEnglish() ? articleUiEn.eyebrow : 'دانش و دیدگاه' }} <span class="en-label" dir="ltr">/ ARTICLES</span></template>
        <template #title><template v-if="isEnglish()">Articles and<br><em>technical knowledge.</em></template><template v-else>مقاله‌ها و<br><em>دانش فنی.</em></template></template>
        <template #description>{{ isEnglish() ? articleUiEn.description : 'محتوای فنی منتشرشده در سایت شرکت، در موضوعات مقررات، مصالح، اجرا و مهندسی.' }}</template>
        <template #meta>{{ displayNumber(articles.length) }} {{ isEnglish() ? articleUiEn.count : 'عنوان مقاله' }}</template>
      </PageIntro>

      <section class="page-container articles-page-section" :aria-label="isEnglish() ? 'Search and browse articles' : 'جست‌وجو و فهرست مقاله‌ها'">
        <label class="search-box article-search">
          <span class="sr-only">{{ isEnglish() ? articleUiEn.searchLabel : 'جست‌وجو میان مقاله‌ها' }}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
          <input :value="search" type="search" :placeholder="isEnglish() ? articleUiEn.searchPlaceholder : 'جست‌وجو در عنوان مقاله‌ها'" @input="emit('update:search', $event.target.value)">
        </label>
        <div v-if="visibleArticles.length" class="article-grid">
          <button v-for="article in visibleArticles" :key="article.id" type="button" class="article-card" @click="emit('open-article', article)">
            <span class="article-card-image">
              <img :src="article.image || fallbackImage" :alt="title(article)" loading="lazy" @error="imageFailed">
              <span>{{ isEnglish() ? articleUiEn.article : 'مقاله' }} {{ isEnglish() ? englishDate(article.date) : localizeDigits(article.date || '', locale) }}</span>
            </span>
            <span class="article-card-meta"><span :lang="typeLanguage(article.type)" dir="auto">{{ typeLabel(article.type) }}</span> <i aria-hidden="true"></i> <span dir="ltr">{{ isEnglish() ? englishDate(article.date) : localizeDigits(article.date, locale) }}{{ isEnglish() ? ' · Solar Hijri' : '' }}</span></span>
            <strong :lang="titleLanguage(article)" dir="auto">{{ title(article) }}</strong>
            <span class="article-read">{{ isEnglish() ? articleUiEn.read : 'خواندن مقاله' }} <b aria-hidden="true">←</b></span>
          </button>
        </div>
        <div v-else class="empty-state"><span aria-hidden="true">⌕</span><h2>{{ isEnglish() ? articleUiEn.noResults : 'مقاله‌ای پیدا نشد' }}</h2><p>{{ isEnglish() ? articleUiEn.changeSearch : 'عبارت جست‌وجو را تغییر دهید.' }}</p></div>
        <div v-if="visibleArticleCount < filteredArticleCount" class="load-more-wrap">
          <button class="button button-outline" type="button" @click="emit('load-more')">{{ isEnglish() ? articleUiEn.more : 'نمایش مقاله‌های بیشتر' }}</button>
        </div>
      </section>
    </template>
  </div>
</template>
