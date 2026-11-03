<script setup>
import SectionHeading from '../patterns/SectionHeading.vue'
import StatsBand from '../patterns/StatsBand.vue'
import DisciplineGrid from '../patterns/DisciplineGrid.vue'
import FeaturedProjects from '../patterns/FeaturedProjects.vue'
import ContactCta from '../patterns/ContactCta.vue'
import HomeHero from './HomeHero.vue'
import HomeApproach from './HomeApproach.vue'
import HomeServiceJourney from './HomeServiceJourney.vue'
import HomeCallbackRequest from './HomeCallbackRequest.vue'

defineProps({
  company: { type: Object, required: true },
  heroImage: { type: String, default: '/images/hero-building.jpg' },
  heroImageAlt: { type: String, default: 'تصویر مفهومی معماری و ساخت؛ نمونهٔ پروژهٔ شرکت نیست.' },
  heroImageCaption: { type: String, default: 'تصویر مفهومی' },
  stats: { type: Array, required: true },
  disciplines: { type: Array, required: true },
  serviceGroups: { type: Array, required: true },
  featuredProjects: { type: Array, required: true },
  projectStatus: { type: Function, required: true },
  statusClass: { type: Function, required: true },
  projectCover: { type: Function, required: true },
})

const emit = defineEmits(['open-project'])

function forwardOpenProject(project, event) {
  emit('open-project', project, event)
}
</script>

<template>
  <div class="home-page">
    <HomeHero :company="company" :image="heroImage" :image-alt="heroImageAlt" :image-caption="heroImageCaption" />
    <HomeCallbackRequest />
    <StatsBand :stats="stats" note="آرشیو پروژه‌های شرکت و گزارش‌های تصویری کارگاهی به‌صورت جداگانه مرور می‌شود." />
    <HomeServiceJourney :groups="serviceGroups" />

    <section class="section page-container discipline-section" aria-labelledby="home-disciplines-title">
      <SectionHeading title-id="home-disciplines-title">
        <template #label>چهار رشتهٔ اصلی طراحی ساختمان <span class="en-label" dir="ltr">/ CORE DISCIPLINES</span></template>
        <template #title>معماری، سازه، مکانیک و برق؛<br><em>در یک هماهنگی.</em></template>
        <template #description>این چهار رشته در کنار دامنهٔ گسترده‌تر خدمات طراحی، آزمایش، نظارت و اجرا ارائه می‌شوند.</template>
      </SectionHeading>
      <DisciplineGrid :items="disciplines" />
    </section>

    <section class="section projects-featured-section" aria-labelledby="home-projects-title">
      <div class="page-container">
        <SectionHeading inline title-id="home-projects-title">
          <template #label>پروژه‌های منتخب <span class="en-label" dir="ltr">/ SELECTED PROJECTS</span></template>
          <template #title>پروژه‌های شرکت،<br><em>با تصویر و مشخصات.</em></template>
          <template #action><a class="text-link" href="#/projects">مشاهده همه پروژه‌ها <span aria-hidden="true">←</span></a></template>
        </SectionHeading>
        <FeaturedProjects :projects="featuredProjects" :project-status="projectStatus" :status-class="statusClass" :project-cover="projectCover" @open-project="forwardOpenProject" />
        <p class="source-note"><span class="note-icon" aria-hidden="true">i</span> پروژه‌های شرکت از گزارش‌های تصویری مستقل جدا نمایش داده می‌شوند؛ مشخصات عمومی به محدودهٔ شهری و اطلاعات تأییدشده محدود است.</p>
      </div>
    </section>

    <HomeApproach />
    <ContactCta />
  </div>
</template>
