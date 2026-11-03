<script setup>
defineProps({
  stats: { type: Array, required: true },
  note: { type: String, default: '' },
})
</script>

<template>
  <section class="stats-band" aria-label="نمای کلی توانمندی‌ها و سوابق">
    <div class="page-container stats-grid">
      <div v-for="stat in stats" :key="stat.label">
        <strong>{{ stat.value }}</strong>
        <span>{{ stat.label }}</span>
      </div>
      <small v-if="note">{{ note }}</small>
    </div>
  </section>
</template>
