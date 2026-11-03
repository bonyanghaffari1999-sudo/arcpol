<script setup>
defineProps({
  line: { type: Boolean, default: false },
  light: { type: Boolean, default: false },
})
</script>

<template>
  <span class="eyebrow" :class="{ 'eyebrow-light': light }">
    <span v-if="line" class="eyebrow-line" aria-hidden="true"></span>
    <slot />
  </span>
</template>
