<script setup>
import PageIntro from '../patterns/PageIntro.vue'
import { localizeDigits } from '../../i18n/numbers.js'

const props = defineProps({
  locale: { type: String, default: 'fa' },
  rating: { type: String, required: true },
  saved: { type: Boolean, required: true },
})

const emit = defineEmits(['update:rating', 'save-feedback'])
const ratings = ['1', '2', '3', '4', '5']
const isEnglish = () => props.locale === 'en'
</script>

<template>
  <div class="feedback-page" :lang="isEnglish() ? 'en' : 'fa'" :dir="isEnglish() ? 'ltr' : 'rtl'">
    <PageIntro title-id="feedback-page-title">
      <template #eyebrow>{{ isEnglish() ? 'Feedback' : 'بازخورد' }} <span class="en-label" dir="ltr">/ FEEDBACK</span></template>
      <template #title><template v-if="isEnglish()">Share your feedback<br><em>with our team.</em></template><template v-else>بازخوردتان را،<br><em>با ما در میان بگذارید.</em></template></template>
      <template #description>{{ isEnglish() ? 'Share a suggestion or an experience from working with us.' : 'پیشنهاد یا تجربهٔ همکاری‌تان را ثبت کنید.' }}</template>
      <template #meta>{{ isEnglish() ? 'Saved locally · not submitted online' : 'ذخیرهٔ محلی · بدون ارسال اینترنتی' }}</template>
    </PageIntro>

    <section class="page-container feedback-section" :aria-label="isEnglish() ? 'Local feedback form' : 'فرم بازخورد محلی'">
      <form class="feedback-form" @submit.prevent="emit('save-feedback', $event)">
        <div class="feedback-form-grid">
          <label>{{ isEnglish() ? 'Full name' : 'نام و نام خانوادگی' }}<input name="name" required autocomplete="name"></label>
          <label>{{ isEnglish() ? 'Feedback topic' : 'موضوع بازخورد' }}<input name="subject" required></label>
          <label class="field-wide">{{ isEnglish() ? 'Details' : 'توضیحات' }}<textarea name="details" rows="5" required></textarea></label>
          <fieldset class="field-wide rating-field">
            <legend>{{ isEnglish() ? 'Your rating' : 'ارزیابی شما' }}</legend>
            <label v-for="value in ratings" :key="value">
              <input :checked="rating === value" type="radio" name="rating" :value="value" @change="emit('update:rating', value)">
              <span>{{ localizeDigits(value, locale) }}<small aria-hidden="true">★</small></span>
            </label>
          </fieldset>
        </div>
        <button class="button button-dark" type="submit">{{ isEnglish() ? 'Save feedback' : 'ثبت بازخورد' }} <span aria-hidden="true">↗</span></button>
        <p v-if="saved" class="feedback-success" role="status">{{ isEnglish() ? 'Feedback was saved locally. It was not published online or sent to the company.' : 'بازخورد محلی ذخیره شد؛ در اینترنت منتشر یا برای شرکت ارسال نشد.' }}</p>
      </form>
      <aside class="feedback-info"><span class="note-icon" aria-hidden="true">i</span><p>{{ isEnglish() ? 'In this local version, form data is saved only on this computer and is not sent to a public website.' : 'در نسخهٔ محلی، اطلاعات فرم فقط روی همین رایانه ذخیره می‌شود و به سایت عمومی فرستاده نمی‌شود.' }}</p></aside>
    </section>
  </div>
</template>
