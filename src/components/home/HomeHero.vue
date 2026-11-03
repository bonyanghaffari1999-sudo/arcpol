<script setup>
import Eyebrow from '../common/Eyebrow.vue'
import ButtonLink from '../common/ButtonLink.vue'

defineProps({
  company: { type: Object, required: true },
  image: { type: String, default: '/images/hero-building.jpg' },
  imageAlt: { type: String, default: 'تصویر مفهومی معماری و ساخت؛ نمونهٔ پروژهٔ شرکت نیست.' },
  imageCaption: { type: String, default: 'تصویر مفهومی' },
})
</script>

<template>
  <section class="hero page-container" aria-labelledby="home-hero-title">
    <div class="hero-copy">
      <Eyebrow line>مهندسی و ساخت ساختمان <span class="en-label" dir="ltr">/ ARCPOL</span></Eyebrow>
      <h1 id="home-hero-title">از زمین،<br><em>تا تحویل.</em></h1>
      <p class="hero-lede">{{ company.positioning }}</p>
      <div class="hero-actions">
        <ButtonLink href="#/contact" icon="↗">درخواست مشاوره</ButtonLink>
        <a class="text-link" href="#/services">پیدا کردن خدمت <span aria-hidden="true">←</span></a>
      </div>
      <div class="hero-proof"><span class="proof-dot"></span><span>یک خدمت مشخص یا چند مرحلهٔ هماهنگ.</span></div>
    </div>
    <div class="hero-visual">
      <div class="hero-grid-mark" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
      <figure class="hero-photo">
        <img :src="image || '/images/hero-building.jpg'" :alt="imageAlt" fetchpriority="high" @error="$event.currentTarget.hidden = true">
        <div class="hero-crane" aria-hidden="true">
          <svg viewBox="0 0 100 90" fill="none">
            <path class="hero-crane-mast" d="M44 21v49m-9 1h18m-14-1 5-49 5 49m-8-16h9m-8-16h7" />
            <g>
              <path d="M44 21H94M44 21 27 10H12M12 10H94M27 10l5 11m7-11 4 11m11-11-1 11m12-11-3 11m14-11-4 11m14-11-5 11m23-11v11M12 10v11h32" />
            </g>
            <g class="hero-crane-hoist">
              <path class="hero-crane-cable" d="M77 15v34" />
              <path class="hero-crane-hook" d="M73 49h8l-1 7c-1 4-6 4-7 0l-1-3" />
            </g>
          </svg>
        </div>
        <figcaption><span>{{ imageCaption }}</span><strong dir="ltr">ENGINEERING &amp; CONSTRUCTION</strong></figcaption>
      </figure>
      <div class="hero-stamp"><span>از زمین</span><b>تا</b><span>تحویل</span></div>
      <div class="hero-index"><span>ENGINEERING</span><b>ARCPOL</b></div>
    </div>
  </section>
</template>
