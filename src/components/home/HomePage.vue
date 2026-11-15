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
  statsNote: { type: String, default: '' },
  disciplines: { type: Array, required: true },
  serviceGroups: { type: Array, required: true },
  featuredProjects: { type: Array, required: true },
  projectStatus: { type: Function, required: true },
  statusClass: { type: Function, required: true },
  projectCover: { type: Function, required: true },
  locale: { type: String, default: 'fa' },
})

const emit = defineEmits(['open-project'])

function forwardOpenProject(project, event) {
  emit('open-project', project, event)
}
</script>

<template>
  <div class="home-page">
    <HomeHero :company="company" :image="heroImage" :image-alt="heroImageAlt" :image-caption="heroImageCaption" :locale="locale" />
    <HomeCallbackRequest :locale="locale" />
    <StatsBand :stats="stats" :locale="locale" :note="statsNote" />
    <HomeServiceJourney :groups="serviceGroups" :locale="locale" />

    <section class="section page-container discipline-section" aria-labelledby="home-disciplines-title">
      <SectionHeading title-id="home-disciplines-title">
        <template #label>{{ locale === 'en' ? 'CORE BUILDING DESIGN DISCIPLINES' : 'چهار رشتهٔ اصلی طراحی ساختمان / CORE DISCIPLINES' }}</template>
        <template #title><template v-if="locale === 'en'">Architecture, structure, mechanical and electrical;<br><em>working together.</em></template><template v-else>معماری، سازه، مکانیک و برق؛<br><em>در یک هماهنگی.</em></template></template>
        <template #description>{{ locale === 'en' ? 'These four disciplines are part of a wider scope of design, testing, supervision and construction.' : 'این چهار رشته در کنار دامنهٔ گسترده‌تر خدمات طراحی، آزمایش، نظارت و اجرا ارائه می‌شوند.' }}</template>
      </SectionHeading>
      <DisciplineGrid :items="disciplines" :service-groups="serviceGroups" :locale="locale" />
    </section>

    <section class="section projects-featured-section" aria-labelledby="home-projects-title">
      <div class="page-container">
        <SectionHeading inline title-id="home-projects-title">
          <template #label>{{ locale === 'en' ? 'SELECTED PROJECTS' : 'پروژه‌های منتخب / SELECTED PROJECTS' }}</template>
          <template #title><template v-if="locale === 'en'">Company projects,<br><em>in images and details.</em></template><template v-else>پروژه‌های شرکت،<br><em>با تصویر و مشخصات.</em></template></template>
          <template #action><a class="text-link" href="/projects">{{ locale === 'en' ? 'View all projects' : 'مشاهده همه پروژه‌ها' }} <span aria-hidden="true">{{ locale === 'en' ? '→' : '←' }}</span></a></template>
        </SectionHeading>
        <FeaturedProjects :projects="featuredProjects" :project-status="projectStatus" :status-class="statusClass" :project-cover="projectCover" :locale="locale" @open-project="forwardOpenProject" />
        <p class="source-note"><span class="note-icon" aria-hidden="true">i</span> {{ locale === 'en' ? 'Company projects and independent site reports are shown separately. Public details are limited to the general area and verified information.' : 'پروژه‌های شرکت از گزارش‌های تصویری مستقل جدا نمایش داده می‌شوند؛ مشخصات عمومی به محدودهٔ شهری و اطلاعات تأییدشده محدود است.' }}</p>
      </div>
    </section>

    <HomeApproach :locale="locale" />
    <ContactCta :locale="locale" />
  </div>
</template>
