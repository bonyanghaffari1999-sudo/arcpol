<script setup>
import { computed } from 'vue'
import { aboutTextEn, staffRoleEn } from '../../i18n/other-pages-en.js'
import { localizeDigits } from '../../i18n/numbers.js'

const props = defineProps({ groups: { type: Array, default: () => [] }, locale: { type: String, default: 'fa' } })
const members = computed(() => props.groups.flatMap((group) => group.members || []))
function role(member) { return localizeDigits(props.locale === 'en' ? staffRoleEn[member.role] || member.role : member.role, props.locale) }
</script>

<template>
  <div class="about-team-directory" :aria-label="locale === 'en' ? 'Company team and roles' : 'نام و سمت همکاران مجموعه'">
    <article v-for="member in members" :key="member.id" class="about-team-directory-card">
      <div class="about-team-directory-photo">
        <img v-if="member.photo" :src="member.photo" :alt="localizeDigits(member.name ? `${member.name}، ${role(member)}` : `${locale === 'en' ? 'Portrait of colleague, role:' : 'تصویر همکار در سمت'} ${role(member)}`, locale)" loading="lazy">
        <div v-else class="about-team-directory-photo-missing" role="img" :aria-label="localizeDigits(`${member.name || (locale === 'en' ? 'Colleague' : 'همکار')} ${locale === 'en' ? aboutTextEn['تصویر در نسخهٔ در دسترس سایت قبلی موجود نبود'] : 'در نسخهٔ در دسترس سایت قبلی تصویر ندارد'}`, locale)">
          <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="17" r="8"/><path d="M9 41c1.7-8.1 6.6-12 15-12s13.3 3.9 15 12"/></svg>
          <span :lang="locale === 'en' ? 'en' : 'fa'">{{ locale === 'en' ? aboutTextEn['تصویر در نسخهٔ در دسترس سایت قبلی موجود نبود'] : 'تصویر در نسخهٔ در دسترس سایت قبلی موجود نبود' }}</span>
        </div>
      </div>
      <div class="about-team-directory-copy">
        <h3 :lang="member.name ? 'fa' : locale" dir="auto">{{ localizeDigits(member.name || (locale === 'en' ? 'Colleague' : 'نام همکار'), locale) }}</h3>
        <p :lang="locale === 'en' && staffRoleEn[member.role] ? 'en' : 'fa'" dir="auto">{{ role(member) || (locale === 'en' ? 'Role not listed' : 'سمت ثبت نشده') }}</p>
      </div>
    </article>
  </div>
</template>
