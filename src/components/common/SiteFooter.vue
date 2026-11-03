<script setup>
import { formatIranianPhone, telephoneHref, whatsappHref } from '../../contact-utils.js'

defineProps({
  company: { type: Object, required: true },
  logoImage: { type: String, default: '' },
  watermarkImage: { type: String, default: '' },
})
const year = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer">
    <div class="page-container footer-main">
      <img v-if="watermarkImage" class="footer-watermark" :src="watermarkImage" alt="" aria-hidden="true" loading="lazy" decoding="async">
      <a class="brand brand-footer" href="#/">
        <span class="brand-mark" :class="{ 'brand-mark-image': logoImage }" aria-hidden="true"><img v-if="logoImage" :src="logoImage" alt=""><svg v-else viewBox="0 0 48 48" fill="none"><path d="M7 40V14l17-7 17 7v26M7 22l17 6 17-6M7 31l17 6 17-6M15 17v26m18-26v26M24 8v33"/></svg></span>
        <span class="brand-copy"><strong>{{ company.name }}</strong><small>{{ company.descriptor }}</small></span>
      </a>
      <p>{{ company.tagline }}<br>{{ company.positioning }}</p>
      <nav class="footer-links" aria-label="پیوندهای پایین صفحه">
        <a href="#/services">خدمات</a><a href="#/projects">پروژه‌ها</a><a href="#/about">درباره ما</a>
        <a href="#/articles">مقالات</a><a href="#/portal">پنل مشتریان · نمونه</a><a href="#/contact">تماس</a><a href="#/feedback">بازخورد</a>
      </nav>
    </div>
    <div class="page-container footer-bottom">
      <span>تمامی حقوق محفوظ است · {{ company.name }}</span>
      <div class="footer-contact-links" aria-label="راه‌های تماس سریع">
        <a v-if="company.officePhone" :href="telephoneHref(company.officePhone)">تلفن دفتر <span dir="ltr">{{ formatIranianPhone(company.officePhone) }}</span></a>
        <a v-if="company.directPhone" :href="whatsappHref(company.directPhone)" target="_blank" rel="noopener noreferrer">واتساپ شرکت <span aria-hidden="true">↗</span></a>
      </div>
      <a href="#top">بازگشت به بالا ↑</a>
      <span class="footer-tag">ARCPOL / {{ year }}</span>
    </div>
  </footer>
</template>
