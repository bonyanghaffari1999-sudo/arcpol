<script setup>
import Eyebrow from '../common/Eyebrow.vue'
import ButtonLink from '../common/ButtonLink.vue'
defineProps({ locale: { type: String, default: 'fa' } })
</script>

<template>
  <section class="contact-cta">
    <div class="page-container contact-cta-inner">
      <div>
        <Eyebrow light>{{ locale === 'en' ? 'CONTACT' : 'همکاری و ارتباط / CONTACT' }}</Eyebrow>
        <h2 v-if="locale === 'en'">Let's discuss<br><em>your next project.</em></h2>
        <h2 v-else>برای پروژه بعدی<br><em>گفت‌وگو کنیم.</em></h2>
      </div>
      <ButtonLink :href="locale === 'en' ? '/contact?lang=en' : '/contact'" variant="light" icon="↗">{{ locale === 'en' ? 'Contact us' : 'راه‌های تماس' }}</ButtonLink>
      <div class="cta-coordinate" aria-hidden="true">ALBORZ<br>IRAN</div>
    </div>
  </section>
</template>
