<script setup>
import Eyebrow from '../common/Eyebrow.vue'
import PageIntro from '../patterns/PageIntro.vue'
import SectionHeading from '../patterns/SectionHeading.vue'
import TeamResponsibilitiesGrid from './TeamResponsibilitiesGrid.vue'
import AboutTeamDirectory from './AboutTeamDirectory.vue'

defineProps({
  company: { type: Object, required: true },
  vision: { type: String, required: true },
  mission: { type: String, required: true },
  principles: { type: Array, required: true },
  teamRoles: { type: Array, required: true },
  monogramImage: { type: String, default: '/images/logo-footer.svg' },
  image: { type: String, default: '/images/about-side.jpg' },
  imageAlt: { type: String, default: 'تصویر معرفی گروه مهندسین مشاور غفاری' },
  teamDirectory: { type: Array, default: () => [] },
  fallbackImage: { type: Function, required: true },
})
</script>

<template>
  <div class="about-page">
    <PageIntro title-id="about-page-title">
      <template #eyebrow>درباره مجموعه <span class="en-label" dir="ltr">/ ABOUT US</span></template>
      <template #title>راهکارهای مهندسی،<br><em>همراه مسیر ساخت.</em></template>
      <template #description>{{ company.intro }}</template>
      <template #meta>تعهد به کیفیت · تخصص · مشتری‌مداری</template>
    </PageIntro>

    <section class="page-container about-story" aria-labelledby="about-story-title">
      <div class="about-story-image">
        <img :src="image" :alt="imageAlt" loading="lazy" @error="fallbackImage">
        <span>ENGINEERING<br>&amp; CONSTRUCTION</span>
      </div>
      <div class="about-story-copy">
        <div class="about-story-kicker">
          <Eyebrow>شناخت مجموعه <span class="en-label" dir="ltr">/ PROFILE</span></Eyebrow>
          <span v-if="monogramImage" class="about-company-monogram" aria-hidden="true">
            <img :src="monogramImage" alt="" loading="lazy" decoding="async">
          </span>
        </div>
        <h2 id="about-story-title">یک نگاه فنی،<br><em>چند تخصص مهندسی.</em></h2>
        <p>{{ company.positioning }}</p>
        <div class="values-grid">
          <div><span>چشم‌انداز</span><p>{{ vision }}</p></div>
          <div><span>ماموریت</span><p>{{ mission }}</p></div>
        </div>
      </div>
    </section>

    <section class="values-section" aria-labelledby="principles-title">
      <div class="page-container">
        <SectionHeading title-id="principles-title">
          <template #label>اصول کاری <span class="en-label" dir="ltr">/ PRINCIPLES</span></template>
          <template #title>پایه‌های همکاری<br><em>حرفه‌ای.</em></template>
          <template #description>اصول کاری که در معرفی خدمات و هماهنگی پروژه‌ها دنبال می‌شوند.</template>
        </SectionHeading>
        <div class="principles-grid">
          <article v-for="(item, index) in principles" :key="item.title">
            <span>۰{{ index + 1 }}</span><h3>{{ item.title }}</h3><p>{{ item.text }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="page-container team-section" aria-labelledby="about-team-title">
      <SectionHeading title-id="about-team-title">
        <template #label>تیم و مسئولیت‌ها <span class="en-label" dir="ltr">/ TEAM &amp; RESPONSIBILITIES</span></template>
        <template #title>مسئولیت‌های روشن،<br><em>همکاری هماهنگ.</em></template>
        <template #description>چهار رشتهٔ اصلی طراحی ساختمان شامل معماری، سازه، تأسیسات مکانیکی و تأسیسات برقی است؛ خدمات آزمایش، نظارت، اجرا و مدیریت ساخت نیز دامنهٔ گسترده‌تر فعالیت مجموعه را تشکیل می‌دهند.</template>
      </SectionHeading>
      <TeamResponsibilitiesGrid :items="teamRoles" />
      <div class="about-team-actions">
        <a href="#/services" class="about-team-primary">مشاهدهٔ خدمات مهندسی <span aria-hidden="true">←</span></a>
        <a href="#/contact" class="about-team-secondary">درخواست مشاوره</a>
      </div>
    </section>

    <section v-if="teamDirectory.length" class="page-container team-directory-section" aria-labelledby="about-team-directory-title">
      <SectionHeading title-id="about-team-directory-title">
        <template #label>همکاران مجموعه <span class="en-label" dir="ltr">/ OUR TEAM</span></template>
        <template #title>اعضای تیم</template>
        <template #description>نام و سمت هر همکار در کنار تصویر او آمده است.</template>
      </SectionHeading>
      <AboutTeamDirectory :groups="teamDirectory" />
    </section>
  </div>
</template>
