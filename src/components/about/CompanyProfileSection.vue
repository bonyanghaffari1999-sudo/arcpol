<script setup>
import Eyebrow from '../common/Eyebrow.vue'

defineProps({ profile: { type: Object, required: true } })
</script>

<template>
  <section class="source-profile-section" aria-labelledby="company-source-title">
    <div class="page-container source-profile">
      <div>
        <Eyebrow>معرفی ثبت‌شده در نسخهٔ ذخیره‌شدهٔ سایت <span class="en-label" dir="ltr">/ COMPANY PROFILE</span></Eyebrow>
        <h2 id="company-source-title">{{ profile.listedName }}</h2>
        <p v-for="(paragraph, index) in profile.paragraphs" :key="index">{{ paragraph }}</p>
      </div>
        <aside aria-label="خدمات ثبت‌شده در نسخهٔ آرشیوی">
        <span>خدمات ثبت‌شده در معرفی شرکت</span>
        <div class="service-chips">
          <span v-for="service in profile.services" :key="service">{{ service }}</span>
        </div>
      </aside>
    </div>
  </section>
</template>
