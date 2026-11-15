<script setup>
import Eyebrow from '../common/Eyebrow.vue'
defineProps({ locale: { type: String, default: 'fa' } })
</script>

<template>
  <section class="home-approach page-container" aria-labelledby="home-approach-title">
    <div class="approach-visual">
      <div class="approach-visual-head"><span>{{ locale === 'en' ? 'Conceptual illustration, not to scale' : 'نمای مفهومی و بدون مقیاس' }}</span><b dir="ltr">01—04</b></div>
      <svg class="approach-diagram" viewBox="0 0 600 360" role="img" aria-labelledby="approach-diagram-title approach-diagram-desc">
        <title id="approach-diagram-title">{{ locale === 'en' ? 'Conceptual coordination of four building disciplines' : 'نمای مفهومی هماهنگی چهار رشتهٔ ساختمان' }}</title>
        <desc id="approach-diagram-desc">{{ locale === 'en' ? 'A schematic diagram of walls, structure and building services, not a construction drawing.' : 'نمودار شماتیک و بدون مقیاس از دیوارها، سازه و مسیرهای تأسیسات؛ این تصویر نقشهٔ اجرایی پروژه نیست.' }}</desc>
        <defs>
          <pattern id="approach-grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M30 0H0V30" fill="none" stroke="#d9e2da" stroke-width=".7" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="600" height="360" fill="url(#approach-grid)" />
        <g class="diagram-dimensions" fill="none" stroke="#82958a" stroke-width="1">
          <path d="M82 48h410M82 43v10M492 43v10M56 72v222M51 72h10M51 294h10" />
        </g>
        <g class="diagram-lines">
          <path class="diagram-wall" d="M96 79h176v78h87V79h112v198H96z" />
          <path class="diagram-wall-light" d="M272 79v78h87m-87 0v92H96m263-92v92h112" />
          <path class="diagram-structure" d="M96 79h375M96 157h176m87 0h112M96 229h375M96 277h375M96 79v198m176-198v78m87-78v198m112-198v198" />
          <path class="diagram-mechanical" d="M121 105h125v27h-72v75h70v-56h111v-29h77" />
          <path class="diagram-electrical" d="M147 93v46h50v38h-33v42h132v-71h61v86h75v-40h24" />
          <circle class="diagram-node" cx="246" cy="132" r="4" />
          <circle class="diagram-node diagram-node-blue" cx="297" cy="219" r="4" />
          <path class="diagram-desk" d="M126 174h52m-52 0v25m52-25v25m-52 0h52m132-122v26m0 54v20m0 52v26m88-26h25m-25 0v24m25-24v24m-25 0h25" />
        </g>
        <g class="diagram-callouts" font-family="var(--font-mono)" font-size="10" letter-spacing=".7">
          <text x="99" y="316">ARCHITECTURE</text><text x="226" y="316">STRUCTURE</text>
          <text x="339" y="316">MECHANICAL</text><text x="458" y="316">ELECTRICAL</text>
        </g>
      </svg>
      <div class="approach-visual-key"><span><i></i>{{ locale === 'en' ? 'Architecture & structure' : 'معماری و سازه' }}</span><span><i></i>{{ locale === 'en' ? 'Mechanical' : 'مکانیک' }}</span><span><i></i>{{ locale === 'en' ? 'Electrical' : 'برق' }}</span></div>
      <div class="approach-visual-foot"><span>SCHEMATIC STUDY</span><span>ARCPOL / DESIGN</span></div>
    </div>
    <div class="approach-copy">
      <Eyebrow>{{ locale === 'en' ? 'OUR APPROACH' : 'رویکرد ما / APPROACH' }}</Eyebrow>
      <h2 id="home-approach-title"><template v-if="locale === 'en'">From drawings<br><em>to the site.</em></template><template v-else>از نقشه،<br><em>تا کارگاه.</em></template></h2>
      <p>{{ locale === 'en' ? 'Technical documents and real site images are presented together to make the engineering scope clear.' : 'مدارک فنی و تصویرهای واقعی کارگاهی کنار هم قرار می‌گیرند تا دامنهٔ خدمات مهندسی روشن باشد.' }}</p>
      <a class="text-link" href="/services">{{ locale === 'en' ? 'Explore engineering services' : 'مرور خدمات مهندسی' }} <span aria-hidden="true">{{ locale === 'en' ? '→' : '←' }}</span></a>
    </div>
  </section>
</template>
