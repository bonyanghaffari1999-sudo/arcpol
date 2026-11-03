<script setup>
defineProps({ groups: { type: Array, required: true } })

const stepLabels = ['طراحی و مدارک', 'خاک و آزمایش', 'اجرا و ساخت', 'نظارت و مدیریت']
</script>

<template>
  <section class="home-service-journey page-container" aria-labelledby="service-journey-title">
    <div class="journey-heading">
      <div>
        <span class="eyebrow">مسیر همکاری <span class="en-label" dir="ltr">/ HOW WE WORK</span></span>
        <h2 id="service-journey-title">از کدام بخش شروع کنیم؟</h2>
      </div>
      <a class="text-link" href="#/services">دیدن و جست‌وجوی همهٔ خدمات <span aria-hidden="true">←</span></a>
    </div>

    <div class="journey-steps">
      <a v-for="(group, index) in groups.slice(0, 4)" :key="group.id" class="journey-step" :href="`#/services?category=${group.id}`">
        <span class="journey-index" dir="ltr">0{{ index + 1 }}</span>
        <span class="journey-step-copy">
          <strong>{{ stepLabels[index] || group.title }}</strong>
          <small>{{ group.items.slice(0, 2).join(' · ') }}</small>
        </span>
        <span class="journey-arrow" aria-hidden="true">↗</span>
      </a>
    </div>
  </section>
</template>
