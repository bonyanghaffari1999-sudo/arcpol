<script setup>
import { localizeDigits } from '../../i18n/numbers.js'

const props = defineProps({ items: { type: Array, required: true }, locale: { type: String, default: 'fa' } })
</script>

<template>
  <div class="discipline-list">
    <div v-for="item in items" :key="item.id">
      <span>{{ localizeDigits(item.number, props.locale) }}</span>
      <strong>{{ item.title }}</strong>
      <small>{{ item.english }}</small>
      <p>{{ item.description }}</p>
    </div>
  </div>
</template>
