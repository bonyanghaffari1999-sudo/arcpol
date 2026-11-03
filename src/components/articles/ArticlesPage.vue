<script setup>
import ArticleContent from './ArticleContent.vue'
import PageIntro from '../patterns/PageIntro.vue'

defineProps({
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

function imageFailed(event) {
  event.currentTarget.hidden = true
}
</script>

<template>
  <div class="articles-page">
    <template v-if="selectedArticle">
      <section class="page-intro page-container article-detail-intro" aria-labelledby="article-detail-title">
        <a href="#/articles" class="back-link">← بازگشت به مقالات</a>
        <div class="eyebrow">دانش فنی <span class="en-label" dir="ltr">/ INSIGHTS</span></div>
        <h1 id="article-detail-title">{{ selectedArticle.title }}</h1>
        <div class="article-meta"><span>{{ selectedArticle.type }}</span><i aria-hidden="true"></i><span>{{ selectedArticle.date }}</span></div>
      </section>
      <ArticleContent :article="selectedArticle" :content="selectedContent" />
    </template>

    <template v-else>
      <PageIntro title-id="articles-page-title">
        <template #eyebrow>دانش و دیدگاه <span class="en-label" dir="ltr">/ ARTICLES</span></template>
        <template #title>مقاله‌ها و<br><em>دانش فنی.</em></template>
        <template #description>محتوای فنی منتشرشده در سایت شرکت، در موضوعات مقررات، مصالح، اجرا و مهندسی.</template>
        <template #meta>{{ displayNumber(articles.length) }} عنوان مقاله</template>
      </PageIntro>

      <section class="page-container articles-page-section" aria-label="جست‌وجو و فهرست مقاله‌ها">
        <label class="search-box article-search">
          <span class="sr-only">جست‌وجو میان مقاله‌ها</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
          <input :value="search" type="search" placeholder="جست‌وجو در عنوان مقاله‌ها" @input="emit('update:search', $event.target.value)">
        </label>
        <div v-if="visibleArticles.length" class="article-grid">
          <button v-for="article in visibleArticles" :key="article.id" type="button" class="article-card" @click="emit('open-article', article)">
            <span class="article-card-image">
              <img :src="article.image || fallbackImage" :alt="article.title" loading="lazy" @error="imageFailed">
              <span>مقاله {{ article.date || '' }}</span>
            </span>
            <span class="article-card-meta">{{ article.type }} <i aria-hidden="true"></i> {{ article.date }}</span>
            <strong>{{ article.title }}</strong>
            <span class="article-read">خواندن مقاله <b aria-hidden="true">←</b></span>
          </button>
        </div>
        <div v-else class="empty-state"><span aria-hidden="true">⌕</span><h2>مقاله‌ای پیدا نشد</h2><p>عبارت جست‌وجو را تغییر دهید.</p></div>
        <div v-if="visibleArticleCount < filteredArticleCount" class="load-more-wrap">
          <button class="button button-outline" type="button" @click="emit('load-more')">نمایش مقاله‌های بیشتر</button>
        </div>
      </section>
    </template>
  </div>
</template>
