<script setup>
import Eyebrow from '../common/Eyebrow.vue'

defineProps({ titleId: { type: String, required: true } })
</script>

<template>
  <section class="page-intro page-container" :aria-labelledby="titleId">
    <Eyebrow><slot name="eyebrow" /></Eyebrow>
    <div class="page-intro-row">
      <h1 :id="titleId"><slot name="title" /></h1>
      <div>
        <p><slot name="description" /></p>
        <span v-if="$slots.meta" class="intro-count"><slot name="meta" /></span>
      </div>
    </div>
  </section>
</template>
