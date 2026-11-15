<script setup>
import { roleTextEn } from '../../i18n/other-pages-en.js'
import { localizeDigits } from '../../i18n/numbers.js'

const props = defineProps({ items: { type: Array, required: true }, locale: { type: String, default: 'fa' } })
function display(value) { return localizeDigits(props.locale === 'en' ? roleTextEn[value] || value : value, props.locale) }
function language(value) { return props.locale === 'en' && roleTextEn[value] ? 'en' : 'fa' }
</script>

<template>
  <div class="about-team-grid">
    <article v-for="item in items" :key="item.id" class="about-team-card">
      <header>
        <span class="about-team-number" dir="ltr">{{ localizeDigits(item.number, locale) }}</span>
        <small dir="ltr">{{ item.english }}</small>
      </header>
      <h3 :lang="language(item.title)" dir="auto">{{ display(item.title) }}</h3>
      <p :lang="language(item.description)" dir="auto">{{ display(item.description) }}</p>
      <ul v-if="item.responsibilities?.length">
        <li v-for="(responsibility, index) in item.responsibilities" :key="`${item.id}-${index}`" :lang="language(responsibility)" dir="auto">{{ display(responsibility) }}</li>
      </ul>
    </article>
  </div>
</template>
