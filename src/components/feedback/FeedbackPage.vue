<script setup>
import PageIntro from '../patterns/PageIntro.vue'

defineProps({
  rating: { type: String, required: true },
  saved: { type: Boolean, required: true },
})

const emit = defineEmits(['update:rating', 'save-feedback'])
const ratings = ['1', '2', '3', '4', '5']
</script>

<template>
  <div class="feedback-page">
    <PageIntro title-id="feedback-page-title">
      <template #eyebrow>بازخورد <span class="en-label" dir="ltr">/ FEEDBACK</span></template>
      <template #title>بازخوردتان را،<br><em>با ما در میان بگذارید.</em></template>
      <template #description>پیشنهاد یا تجربهٔ همکاری‌تان را ثبت کنید.</template>
      <template #meta>ذخیرهٔ محلی · بدون ارسال اینترنتی</template>
    </PageIntro>

    <section class="page-container feedback-section" aria-label="فرم بازخورد محلی">
      <form class="feedback-form" @submit.prevent="emit('save-feedback', $event)">
        <div class="feedback-form-grid">
          <label>نام و نام خانوادگی<input name="name" required autocomplete="name"></label>
          <label>موضوع بازخورد<input name="subject" required></label>
          <label class="field-wide">توضیحات<textarea name="details" rows="5" required></textarea></label>
          <fieldset class="field-wide rating-field">
            <legend>ارزیابی شما</legend>
            <label v-for="value in ratings" :key="value">
              <input :checked="rating === value" type="radio" name="rating" :value="value" @change="emit('update:rating', value)">
              <span>{{ value }}<small aria-hidden="true">★</small></span>
            </label>
          </fieldset>
        </div>
        <button class="button button-dark" type="submit">ثبت بازخورد <span aria-hidden="true">↗</span></button>
        <p v-if="saved" class="feedback-success" role="status">بازخورد محلی ذخیره شد؛ در اینترنت منتشر یا برای شرکت ارسال نشد.</p>
      </form>
      <aside class="feedback-info"><span class="note-icon" aria-hidden="true">i</span><p>در نسخهٔ محلی، اطلاعات فرم فقط روی همین رایانه ذخیره می‌شود و به سایت عمومی فرستاده نمی‌شود.</p></aside>
    </section>
  </div>
</template>
