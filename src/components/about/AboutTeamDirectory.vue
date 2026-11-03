<script setup>
import { computed } from 'vue'

const props = defineProps({ groups: { type: Array, default: () => [] } })
const members = computed(() => props.groups.flatMap((group) => group.members || []))
</script>

<template>
  <div class="about-team-directory" aria-label="نام و سمت همکاران مجموعه">
    <article v-for="member in members" :key="member.id" class="about-team-directory-card">
      <div class="about-team-directory-photo">
        <img v-if="member.photo" :src="member.photo" :alt="member.name ? `${member.name}، ${member.role}` : `تصویر همکار در سمت ${member.role}`" loading="lazy">
        <div v-else class="about-team-directory-photo-missing" role="img" :aria-label="`تصویر ${member.name || 'همکار'} در نسخهٔ در دسترس سایت قبلی موجود نبود`">
          <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="17" r="8"/><path d="M9 41c1.7-8.1 6.6-12 15-12s13.3 3.9 15 12"/></svg>
          <span>تصویر در نسخهٔ در دسترس سایت قبلی موجود نبود</span>
        </div>
      </div>
      <div class="about-team-directory-copy">
        <h3>{{ member.name || 'نام همکار' }}</h3>
        <p>{{ member.role || 'سمت ثبت نشده' }}</p>
      </div>
    </article>
  </div>
</template>
