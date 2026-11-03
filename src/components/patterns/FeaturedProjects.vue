<script setup>
defineProps({
  projects: { type: Array, required: true },
  projectStatus: { type: Function, required: true },
  statusClass: { type: Function, required: true },
  projectCover: { type: Function, required: true },
})

defineEmits(['open-project'])
</script>

<template>
  <div class="featured-grid">
    <button v-for="(project, index) in projects" :key="project.id" class="featured-card" :class="`featured-card-${index + 1}`" type="button" :aria-label="`مشاهده پروژهٔ ${project.usage || 'ساختمانی'}${project.address ? ` در ${project.address}` : ''}`" @click="$emit('open-project', project, $event)">
      <span class="featured-image">
        <img :src="projectCover(project)" :alt="`تصویر پروژه G-${project.id}`" :loading="index === 0 ? 'eager' : 'lazy'" @error="$event.currentTarget.hidden = true">
        <span class="image-open" aria-hidden="true">↗</span>
      </span>
      <span class="featured-meta"><span dir="ltr">G-{{ project.id }} <i :class="['status-dot', statusClass(project.status)]"></i></span><small>{{ projectStatus(project.status) }}</small></span>
      <strong>{{ project.usage || 'پروژهٔ ساختمانی' }}<template v-if="project.address"> · {{ project.address }}</template></strong>
      <small>{{ project.type || 'خدمات مهندسی' }} <span aria-hidden="true">·</span> کد <span dir="ltr">G-{{ project.id }}</span></small>
    </button>
  </div>
</template>
