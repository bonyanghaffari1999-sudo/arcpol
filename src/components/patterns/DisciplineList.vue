<script setup>
defineProps({ items: { type: Array, required: true } })
</script>

<template>
  <div class="discipline-list">
    <div v-for="item in items" :key="item.id">
      <span>{{ item.number }}</span>
      <strong>{{ item.title }}</strong>
      <small>{{ item.english }}</small>
      <p>{{ item.description }}</p>
    </div>
  </div>
</template>
