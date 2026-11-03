<script setup>
import ProjectDetail from './ProjectDetail.vue'
import ProjectList from './ProjectList.vue'

defineProps({
  project: { type: Object, default: null },
  projects: { type: Array, required: true },
  inProgressCount: { type: Number, required: true },
  completedCount: { type: Number, required: true },
  historyCount: { type: Number, required: true },
  projectCategories: { type: Array, required: true },
  projectSourceFilter: { type: String, required: true },
  projectSourceCounts: { type: Object, required: true },
  statusFilter: { type: String, required: true },
  categoryFilter: { type: String, required: true },
  usageFilter: { type: String, required: true },
  search: { type: String, required: true },
  visibleProjects: { type: Array, required: true },
  filteredProjectCount: { type: Number, required: true },
  visibleProjectCount: { type: Number, required: true },
  projectImages: { type: Array, required: true },
  galleryIndex: { type: Number, required: true },
  projectStatus: { type: Function, required: true },
  statusClass: { type: Function, required: true },
  projectCategory: { type: Function, required: true },
  projectTitle: { type: Function, required: true },
  projectDate: { type: Function, required: true },
  projectCover: { type: Function, required: true },
  displayNumber: { type: Function, required: true },
  fallbackImage: { type: Function, required: true },
})

const emit = defineEmits([
  'update:statusFilter', 'update:sourceFilter', 'update:categoryFilter', 'update:usageFilter', 'update:search',
  'load-more', 'open-project', 'move-gallery',
])

function forwardOpenProject(project, event) {
  emit('open-project', project, event)
}
</script>

<template>
  <ProjectDetail
    v-if="project"
    :project="project"
    :images="projectImages"
    :gallery-index="galleryIndex"
    :project-status="projectStatus"
    :status-class="statusClass"
    :project-category="projectCategory"
    :project-title="projectTitle"
    :project-date="projectDate"
    :display-number="displayNumber"
    :fallback-image="fallbackImage"
    @move-gallery="emit('move-gallery', $event)"
  />
  <ProjectList
    v-else
    :projects="projects"
    :in-progress-count="inProgressCount"
    :completed-count="completedCount"
    :history-count="historyCount"
    :project-categories="projectCategories"
    :project-source-filter="projectSourceFilter"
    :project-source-counts="projectSourceCounts"
    :status-filter="statusFilter"
    :category-filter="categoryFilter"
    :usage-filter="usageFilter"
    :search="search"
    :visible-projects="visibleProjects"
    :filtered-project-count="filteredProjectCount"
    :visible-project-count="visibleProjectCount"
    :project-status="projectStatus"
    :status-class="statusClass"
    :project-category="projectCategory"
    :project-title="projectTitle"
    :project-cover="projectCover"
    :display-number="displayNumber"
    @update:status-filter="emit('update:statusFilter', $event)"
    @update:source-filter="emit('update:sourceFilter', $event)"
    @update:category-filter="emit('update:categoryFilter', $event)"
    @update:usage-filter="emit('update:usageFilter', $event)"
    @update:search="emit('update:search', $event)"
    @load-more="emit('load-more')"
    @open-project="forwardOpenProject"
  />
</template>
