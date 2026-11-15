<script setup>
import Eyebrow from '../common/Eyebrow.vue'
import PageIntro from '../patterns/PageIntro.vue'
import SectionHeading from '../patterns/SectionHeading.vue'
import TeamResponsibilitiesGrid from './TeamResponsibilitiesGrid.vue'
import AboutTeamDirectory from './AboutTeamDirectory.vue'
import { aboutTextEn, companyTextEn, roleTextEn } from '../../i18n/other-pages-en.js'
import { localizeDigits } from '../../i18n/numbers.js'

const props = defineProps({
  locale: { type: String, default: 'fa' },
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
const isEnglish = () => props.locale === 'en'
function text(value, dictionary) { return localizeDigits(isEnglish() ? dictionary[value] || value : value, props.locale) }
function textLanguage(value, dictionary) { return isEnglish() && dictionary[value] ? 'en' : 'fa' }
</script>

<template>
  <div class="about-page">
    <PageIntro title-id="about-page-title">
      <template #eyebrow>{{ isEnglish() ? 'About the company' : 'درباره مجموعه' }} <span class="en-label" dir="ltr">/ ABOUT US</span></template>
      <template #title><template v-if="isEnglish()">Engineering solutions,<br><em>along the construction journey.</em></template><template v-else>راهکارهای مهندسی،<br><em>همراه مسیر ساخت.</em></template></template>
      <template #description><span :lang="textLanguage(company.intro, companyTextEn)" dir="auto">{{ text(company.intro, companyTextEn) }}</span></template>
      <template #meta>{{ text('تعهد به کیفیت · تخصص · مشتری‌مداری', aboutTextEn) }}</template>
    </PageIntro>

    <section class="page-container about-story" aria-labelledby="about-story-title">
      <div class="about-story-image">
        <img :src="image" :alt="isEnglish() ? 'Project photograph from the company archive' : imageAlt" loading="lazy" @error="fallbackImage">
        <span>ENGINEERING<br>&amp; CONSTRUCTION</span>
      </div>
      <div class="about-story-copy">
        <div class="about-story-kicker">
          <Eyebrow>{{ text('شناخت مجموعه', aboutTextEn) }} <span class="en-label" dir="ltr">/ PROFILE</span></Eyebrow>
          <span v-if="monogramImage" class="about-company-monogram" aria-hidden="true">
            <img :src="monogramImage" alt="" loading="lazy" decoding="async">
          </span>
        </div>
        <h2 id="about-story-title"><template v-if="isEnglish()">One technical perspective,<br><em>multiple engineering disciplines.</em></template><template v-else>یک نگاه فنی،<br><em>چند تخصص مهندسی.</em></template></h2>
        <p :lang="textLanguage(company.positioning, companyTextEn)" dir="auto">{{ text(company.positioning, companyTextEn) }}</p>
        <div class="values-grid">
          <div><span>{{ text('چشم‌انداز', aboutTextEn) }}</span><p :lang="textLanguage(vision, aboutTextEn)" dir="auto">{{ text(vision, aboutTextEn) }}</p></div>
          <div><span>{{ text('ماموریت', aboutTextEn) }}</span><p :lang="textLanguage(mission, aboutTextEn)" dir="auto">{{ text(mission, aboutTextEn) }}</p></div>
        </div>
      </div>
    </section>

    <section class="values-section" aria-labelledby="principles-title">
      <div class="page-container">
        <SectionHeading title-id="principles-title">
          <template #label>{{ text('اصول کاری', aboutTextEn) }} <span class="en-label" dir="ltr">/ PRINCIPLES</span></template>
          <template #title><template v-if="isEnglish()">Foundations for<br><em>professional collaboration.</em></template><template v-else>پایه‌های همکاری<br><em>حرفه‌ای.</em></template></template>
          <template #description>{{ text('اصول کاری که در معرفی خدمات و هماهنگی پروژه‌ها دنبال می‌شوند.', aboutTextEn) }}</template>
        </SectionHeading>
        <div class="principles-grid">
          <article v-for="(item, index) in principles" :key="item.title">
            <span dir="ltr">{{ localizeDigits(String(index + 1).padStart(2, '0'), locale) }}</span><h3 :lang="textLanguage(item.title, aboutTextEn)" dir="auto">{{ text(item.title, aboutTextEn) }}</h3><p :lang="textLanguage(item.text, aboutTextEn)" dir="auto">{{ text(item.text, aboutTextEn) }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="page-container team-section" aria-labelledby="about-team-title">
      <SectionHeading title-id="about-team-title">
        <template #label>{{ text('تیم و مسئولیت‌ها', aboutTextEn) }} <span class="en-label" dir="ltr">/ TEAM &amp; RESPONSIBILITIES</span></template>
        <template #title><template v-if="isEnglish()">Clear responsibilities,<br><em>coordinated collaboration.</em></template><template v-else>مسئولیت‌های روشن،<br><em>همکاری هماهنگ.</em></template></template>
        <template #description>{{ text('چهار رشتهٔ اصلی طراحی ساختمان شامل معماری، سازه، تأسیسات مکانیکی و تأسیسات برقی است؛ خدمات آزمایش، نظارت، اجرا و مدیریت ساخت نیز دامنهٔ گسترده‌تر فعالیت مجموعه را تشکیل می‌دهند.', aboutTextEn) }}</template>
      </SectionHeading>
      <TeamResponsibilitiesGrid :items="teamRoles" :locale="locale" />
      <div class="about-team-actions">
        <a :href="locale === 'en' ? '/services?lang=en' : '/services'" class="about-team-primary">{{ text('مشاهدهٔ خدمات مهندسی', aboutTextEn) }} <span aria-hidden="true">←</span></a>
        <a :href="locale === 'en' ? '/contact?lang=en' : '/contact'" class="about-team-secondary">{{ text('درخواست مشاوره', aboutTextEn) }}</a>
      </div>
    </section>

    <section v-if="teamDirectory.length" class="page-container team-directory-section" aria-labelledby="about-team-directory-title">
      <SectionHeading title-id="about-team-directory-title">
        <template #label>{{ text('همکاران مجموعه', aboutTextEn) }} <span class="en-label" dir="ltr">/ OUR TEAM</span></template>
        <template #title>{{ text('اعضای تیم', aboutTextEn) }}</template>
        <template #description>{{ text('نام و سمت هر همکار در کنار تصویر او آمده است.', aboutTextEn) }}</template>
      </SectionHeading>
      <AboutTeamDirectory :groups="teamDirectory" :locale="locale" />
    </section>
  </div>
</template>
