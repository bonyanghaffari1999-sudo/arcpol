<script setup>
import PageIntro from '../patterns/PageIntro.vue'
import Eyebrow from '../common/Eyebrow.vue'
import { formatIranianPhone, telephoneHref, whatsappHref } from '../../contact-utils.js'

defineProps({ company: { type: Object, required: true } })
</script>

<template>
  <div class="contact-page-route">
    <PageIntro title-id="contact-page-title">
      <template #eyebrow>ارتباط با ما <span class="en-label" dir="ltr">/ CONTACT</span></template>
      <template #title>برای همکاری<br><em>در ارتباطیم.</em></template>
      <template #description>برای هماهنگی خدمات و فرصت‌های همکاری، از راه‌های رسمی تماس با مجموعه در ارتباط باشید.</template>
      <template #meta>دفتر مرکزی · کرج</template>
    </PageIntro>

    <section class="page-container contact-page" aria-labelledby="contact-details-title">
      <div class="contact-info">
        <Eyebrow>راه‌های ارتباطی <span class="en-label" dir="ltr">/ GET IN TOUCH</span></Eyebrow>
        <h2 id="contact-details-title">با ما<br><em>گفت‌وگو کنید.</em></h2>
        <div class="contact-address">
          <span>نشانی دفتر مرکزی</span>
          <p>{{ company.officeAddress }}</p>
        </div>
        <div class="contact-phone-list" aria-label="شماره‌های تماس شرکت">
          <a v-if="company.officePhone" :href="telephoneHref(company.officePhone)">
            <span>تلفن دفتر</span><b dir="ltr">{{ formatIranianPhone(company.officePhone) }}</b><i aria-hidden="true">↗</i>
          </a>
          <a v-if="company.directPhone" :href="telephoneHref(company.directPhone)">
            <span>شمارهٔ مستقیم شرکت</span><b dir="ltr">{{ formatIranianPhone(company.directPhone) }}</b><i aria-hidden="true">↗</i>
          </a>
        </div>
        <a class="social-link" :href="company.instagram" target="_blank" rel="noopener noreferrer">اینستاگرام رسمی <span dir="ltr">@enghafari ↗</span></a>
      </div>

      <div class="contact-aside">
        <div class="contact-coordinate-box" aria-label="چهار رشتهٔ اصلی طراحی ساختمان شرکت">
          <div class="coordinate-grid" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
          <div><small dir="ltr">ENGINEERING &amp; CONSTRUCTION</small><strong>یک گفت‌وگوی روشن،<br>شروع همکاری است.</strong><span>معماری · سازه · مکانیک · برق</span></div>
        </div>
        <p>برای دریافت اطلاعات یا هماهنگی خدمات، تماس بگیرید یا در واتساپ پیام بفرستید. برای مراجعهٔ حضوری، پیش از حرکت با دفتر هماهنگ کنید.</p>
        <div class="contact-actions">
          <a v-if="company.directPhone" class="button button-dark" :href="whatsappHref(company.directPhone)" target="_blank" rel="noopener noreferrer">پیام در واتساپ <span aria-hidden="true">↗</span></a>
          <a v-if="company.officePhone" class="button button-outline" :href="telephoneHref(company.officePhone)">تماس با دفتر <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
  </div>
</template>
