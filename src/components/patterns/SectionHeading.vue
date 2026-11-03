<script setup>
import Eyebrow from '../common/Eyebrow.vue'

defineProps({
  inline: { type: Boolean, default: false },
  titleId: { type: String, default: '' },
})
</script>

<template>
  <header class="section-heading" :class="{ 'section-heading-inline': inline }">
    <div>
      <Eyebrow><slot name="label" /></Eyebrow>
      <h2 :id="titleId || null"><slot name="title" /></h2>
    </div>
    <div v-if="$slots.description || $slots.action" class="section-heading-aside">
      <p v-if="$slots.description"><slot name="description" /></p>
      <slot name="action" />
    </div>
  </header>
</template>
