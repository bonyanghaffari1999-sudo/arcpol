<script setup>
import { serviceNamesEn } from '../../i18n/services-en.js'
import { localizeDigits } from '../../i18n/numbers.js'
defineProps({ groups: { type: Array, required: true }, locale: { type: String, default: 'fa' } })

const stepLabels = ['طراحی و مدارک', 'خاک و آزمایش', 'اجرا و ساخت', 'نظارت و مدیریت']
const englishSteps = { design: 'Design and documentation', geotechnical: 'Ground and testing', construction: 'Construction', management: 'Supervision and management' }
</script>

<template>
  <section class="home-service-journey page-container" aria-labelledby="service-journey-title">
    <div class="journey-heading">
      <div>
        <span class="eyebrow">{{ locale === 'en' ? 'HOW WE WORK' : 'مسیر همکاری / HOW WE WORK' }}</span>
        <h2 id="service-journey-title">{{ locale === 'en' ? 'Where would you like to start?' : 'از کدام بخش شروع کنیم؟' }}</h2>
      </div>
      <a class="text-link" href="/services">{{ locale === 'en' ? 'Find all services' : 'دیدن و جست‌وجوی همهٔ خدمات' }} <span aria-hidden="true">{{ locale === 'en' ? '→' : '←' }}</span></a>
    </div>

    <div class="journey-steps">
      <a v-for="(group, index) in groups.slice(0, 4)" :key="group.id" class="journey-step" :href="`/services?category=${group.id}`">
        <span class="journey-index" dir="ltr">{{ localizeDigits(`0${index + 1}`, locale) }}</span>
        <span class="journey-step-copy">
          <strong>{{ localizeDigits(locale === 'en' ? englishSteps[group.id] || group.title : stepLabels[index] || group.title, locale) }}</strong>
          <small><template v-for="(item, itemIndex) in group.items.slice(0, 2)" :key="item"><span v-if="itemIndex"> · </span><span :lang="locale === 'en' && !serviceNamesEn[item] ? 'fa' : undefined" dir="auto">{{ localizeDigits(locale === 'en' ? serviceNamesEn[item] || item : item, locale) }}</span></template></small>
        </span>
        <span class="journey-arrow" aria-hidden="true">↗</span>
      </a>
    </div>
  </section>
</template>
