<script setup>
import { formatIranianPhone, telephoneHref, whatsappHref } from '../../contact-utils.js'
import { formatNumber, localizeDigits } from '../../i18n/numbers.js'

defineProps({
  company: { type: Object, required: true },
  logoImage: { type: String, default: '' },
  watermarkImage: { type: String, default: '' },
  locale: { type: String, default: 'fa' },
})
const year = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer">
    <div class="page-container footer-main">
      <img v-if="watermarkImage" class="footer-watermark" :src="watermarkImage" alt="" aria-hidden="true" loading="lazy" decoding="async">
      <a class="brand brand-footer" href="/">
        <span class="brand-mark" :class="{ 'brand-mark-image': logoImage }" aria-hidden="true"><img v-if="logoImage" :src="logoImage" alt=""><svg v-else viewBox="0 0 48 48" fill="none"><path d="M7 40V14l17-7 17 7v26M7 22l17 6 17-6M7 31l17 6 17-6M15 17v26m18-26v26M24 8v33"/></svg></span>
        <span class="brand-copy"><strong>{{ locale === 'en' ? 'ARCPOL' : company.name }}</strong><small>{{ localizeDigits(company.descriptor, locale) }}</small></span>
      </a>
      <p v-if="locale === 'en'">Engineering and construction services<br>From design and testing to supervision and construction.</p>
      <p v-else>{{ company.tagline }}<br>{{ company.positioning }}</p>
      <nav class="footer-links" :aria-label="locale === 'en' ? 'Footer navigation' : 'پیوندهای پایین صفحه'">
        <a href="/services">{{ locale === 'en' ? 'Services' : 'خدمات' }}</a><a href="/projects">{{ locale === 'en' ? 'Projects' : 'پروژه‌ها' }}</a><a href="/about">{{ locale === 'en' ? 'About' : 'درباره ما' }}</a>
        <a href="/articles">{{ locale === 'en' ? 'Knowledge' : 'مقالات' }}</a><a href="/portal">{{ locale === 'en' ? 'Client portal · Demo' : 'پنل مشتریان · نمونه' }}</a><a href="/contact">{{ locale === 'en' ? 'Contact' : 'تماس' }}</a><a href="/feedback">{{ locale === 'en' ? 'Feedback' : 'بازخورد' }}</a>
      </nav>
    </div>
    <div class="page-container footer-bottom">
      <span>{{ locale === 'en' ? 'All rights reserved · ARCPOL' : `تمامی حقوق محفوظ است · ${company.name}` }}</span>
      <div class="footer-contact-links" :aria-label="locale === 'en' ? 'Quick contact' : 'راه‌های تماس سریع'">
        <a v-if="company.officePhone" :href="telephoneHref(company.officePhone)">{{ locale === 'en' ? 'Office' : 'تلفن دفتر' }} <span dir="ltr">{{ formatIranianPhone(company.officePhone, locale) }}</span></a>
        <a v-if="company.directPhone" :href="whatsappHref(company.directPhone)" target="_blank" rel="noopener noreferrer">{{ locale === 'en' ? 'Company WhatsApp' : 'واتساپ شرکت' }} <span aria-hidden="true">↗</span></a>
      </div>
      <a href="#top">{{ locale === 'en' ? 'Back to top ↑' : 'بازگشت به بالا ↑' }}</a>
      <span class="footer-tag">ARCPOL / {{ formatNumber(year, locale) }}</span>
    </div>
  </footer>
</template>
