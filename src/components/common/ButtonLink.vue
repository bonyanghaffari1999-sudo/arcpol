<script setup>
defineProps({
  href: { type: String, required: true },
  variant: { type: String, default: 'dark' },
  icon: { type: String, default: '' },
})
</script>

<template>
  <a :href="href" class="button" :class="`button-${variant}`">
    <slot />
    <span v-if="icon" aria-hidden="true">{{ icon }}</span>
  </a>
</template>
