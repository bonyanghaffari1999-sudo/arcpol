<script setup>
defineProps({ items: { type: Array, required: true } })
</script>

<template>
  <div class="about-team-grid">
    <article v-for="item in items" :key="item.id" class="about-team-card">
      <header>
        <span class="about-team-number" dir="ltr">{{ item.number }}</span>
        <small dir="ltr">{{ item.english }}</small>
      </header>
      <h3>{{ item.title }}</h3>
      <p>{{ item.description }}</p>
      <ul v-if="item.responsibilities?.length">
        <li v-for="(responsibility, index) in item.responsibilities" :key="`${item.id}-${index}`">{{ responsibility }}</li>
      </ul>
    </article>
  </div>
</template>
