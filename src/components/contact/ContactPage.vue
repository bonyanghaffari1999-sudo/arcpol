<script setup>
import { computed, toRefs } from 'vue'
import PageIntro from '../patterns/PageIntro.vue'
import Eyebrow from '../common/Eyebrow.vue'
import { formatIranianPhone, telephoneHref, whatsappHref as createWhatsappHref } from '../../contact-utils.js'
import { serviceNamesEn } from '../../i18n/services-en.js'
import { localizeDigits } from '../../i18n/numbers.js'

const props = defineProps({
  company: { type: Object, required: true },
  locale: { type: String, default: 'fa' },
  selectedServiceName: { type: String, default: '' },
})
const { company, locale, selectedServiceName } = toRefs(props)
const isEnglish = computed(() => props.locale === 'en')
const selectedServiceLabel = computed(() => isEnglish.value
  ? serviceNamesEn[props.selectedServiceName] || props.selectedServiceName
  : props.selectedServiceName)
const selectedServiceLanguage = computed(() => isEnglish.value && serviceNamesEn[props.selectedServiceName] ? 'en' : 'fa')
const whatsappMessage = computed(() => props.selectedServiceName
  ? isEnglish.value
    ? `Hello, I would like to discuss ${selectedServiceLabel.value} with ARCPOL.`
    : `سلام، مایل هستم دربارهٔ خدمت «${selectedServiceLabel.value}» با ارک‌پل گفت‌وگو کنم.`
  : '')
const whatsappLink = computed(() => createWhatsappHref(props.company.directPhone, whatsappMessage.value))
</script>

<template>
  <div class="contact-page-route" :lang="locale === 'en' ? 'en' : 'fa'" :dir="locale === 'en' ? 'ltr' : 'rtl'">
    <PageIntro title-id="contact-page-title">
      <template #eyebrow>{{ locale === 'en' ? 'CONTACT' : 'ارتباط با ما / CONTACT' }}</template>
      <template #title><template v-if="locale === 'en'">Let’s work<br><em>together.</em></template><template v-else>برای همکاری<br><em>در ارتباطیم.</em></template></template>
      <template #description>{{ locale === 'en' ? 'Contact our team through the company’s official channels to discuss services and opportunities.' : 'برای هماهنگی خدمات و فرصت‌های همکاری، از راه‌های رسمی تماس با مجموعه در ارتباط باشید.' }}</template>
      <template #meta>{{ locale === 'en' ? 'HEAD OFFICE · KARAJ' : 'دفتر مرکزی · کرج' }}</template>
    </PageIntro>

    <section class="page-container contact-page" aria-labelledby="contact-details-title">
      <div class="contact-info">
        <Eyebrow>{{ locale === 'en' ? 'GET IN TOUCH' : 'راه‌های ارتباطی / GET IN TOUCH' }}</Eyebrow>
        <h2 id="contact-details-title"><template v-if="locale === 'en'">Start a<br><em>conversation.</em></template><template v-else>با ما<br><em>گفت‌وگو کنید.</em></template></h2>
        <div v-if="selectedServiceName" class="contact-service-context" role="status">
          <span>{{ locale === 'en' ? 'SERVICE OF INTEREST' : 'خدمت موردنظر شما' }}</span>
          <strong :lang="selectedServiceLanguage" dir="auto">{{ selectedServiceLabel }}</strong>
          <small>{{ locale === 'en' ? 'The WhatsApp button will open a draft message about this service. Nothing is sent automatically.' : 'دکمهٔ واتساپ پیش‌نویس پیام دربارهٔ این خدمت را باز می‌کند؛ پیامی خودکار ارسال نمی‌شود.' }}</small>
        </div>
        <div class="contact-address">
          <span>{{ locale === 'en' ? 'Head office address (in Persian)' : 'نشانی دفتر مرکزی' }}</span>
          <p lang="fa" dir="rtl">{{ localizeDigits(company.officeAddress, locale) }}</p>
        </div>
        <div class="contact-phone-list" :aria-label="locale === 'en' ? 'Company phone numbers' : 'شماره‌های تماس شرکت'">
          <a v-if="company.officePhone" :href="telephoneHref(company.officePhone)">
            <span>{{ locale === 'en' ? 'Office phone' : 'تلفن دفتر' }}</span><b dir="ltr">{{ formatIranianPhone(company.officePhone, locale) }}</b><i aria-hidden="true">↗</i>
          </a>
          <a v-if="company.directPhone" :href="telephoneHref(company.directPhone)">
            <span>{{ locale === 'en' ? 'Company direct line' : 'شمارهٔ مستقیم شرکت' }}</span><b dir="ltr">{{ formatIranianPhone(company.directPhone, locale) }}</b><i aria-hidden="true">↗</i>
          </a>
        </div>
        <a class="social-link" :href="company.instagram" target="_blank" rel="noopener noreferrer">{{ locale === 'en' ? 'Official Instagram' : 'اینستاگرام رسمی' }} <span dir="ltr">@enghafari ↗</span></a>
      </div>

      <div class="contact-aside">
        <div class="contact-coordinate-box" :aria-label="locale === 'en' ? 'Four core building design disciplines' : 'چهار رشتهٔ اصلی طراحی ساختمان شرکت'">
          <div class="coordinate-grid" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
          <div><small dir="ltr">ENGINEERING &amp; CONSTRUCTION</small><strong v-if="locale === 'en'">A clear conversation<br>starts a collaboration.</strong><strong v-else>یک گفت‌وگوی روشن،<br>شروع همکاری است.</strong><span>{{ locale === 'en' ? 'Architecture · Structure · Mechanical · Electrical' : 'معماری · سازه · مکانیک · برق' }}</span></div>
        </div>
        <p>{{ locale === 'en' ? 'Call or message us on WhatsApp to discuss services. Please contact the office before visiting in person.' : 'برای دریافت اطلاعات یا هماهنگی خدمات، تماس بگیرید یا در واتساپ پیام بفرستید. برای مراجعهٔ حضوری، پیش از حرکت با دفتر هماهنگ کنید.' }}</p>
        <div class="contact-actions">
          <a v-if="company.directPhone" class="button button-dark" :href="whatsappLink" target="_blank" rel="noopener noreferrer">{{ locale === 'en' ? (selectedServiceName ? 'Discuss this service on WhatsApp' : 'Message on WhatsApp') : (selectedServiceName ? 'گفت‌وگو دربارهٔ این خدمت در واتساپ' : 'پیام در واتساپ') }} <span aria-hidden="true">↗</span></a>
          <a v-if="company.officePhone" class="button button-outline" :href="telephoneHref(company.officePhone)">{{ locale === 'en' ? 'Call the office' : 'تماس با دفتر' }} <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.contact-service-context { display: grid; gap: var(--space-1); margin-block: var(--space-4); padding: var(--space-3) var(--space-4); border-inline-start: 3px solid var(--brand-green); background: var(--surface-mint); }
.contact-service-context > span { color: var(--text-subtle); font-size: var(--text-caption); letter-spacing: .04em; }
.contact-service-context strong { color: var(--brand-forest); font-size: var(--text-body); font-weight: 600; }
.contact-service-context small { color: var(--text-secondary); font-size: var(--text-caption); line-height: var(--line-body); }
</style>
