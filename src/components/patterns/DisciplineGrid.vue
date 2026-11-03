<script setup>
defineProps({ items: { type: Array, required: true } })
</script>

<template>
  <div class="discipline-grid">
    <a v-for="item in items" :key="item.id" href="#/services" class="discipline-card" :aria-label="`شناخت خدمات ${item.title}`">
      <span class="discipline-number" dir="ltr">{{ item.number }}</span><span class="discipline-rule"></span>
      <h3>{{ item.title }}</h3><small dir="ltr">{{ item.english }}</small><p>{{ item.description }}</p>
      <span class="card-arrow" aria-hidden="true">↗</span>
    </a>
  </div>
</template>
