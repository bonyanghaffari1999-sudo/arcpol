<script setup>
import { localizeDigits } from '../../i18n/numbers.js'

defineProps({
  company: { type: Object, required: true },
  logoImage: { type: String, default: '' },
  navigation: { type: Array, required: true },
  currentPage: { type: String, required: true },
  menuOpen: { type: Boolean, default: false },
  locale: { type: String, default: 'fa' },
})

defineEmits(['toggle-menu', 'close-menu', 'change-locale'])
const englishNavigation = { home: 'Home', services: 'Services', building: 'Building explorer', projects: 'Projects', about: 'About', articles: 'Knowledge', portal: 'Client portal · Demo', contact: 'Contact' }
</script>

<template>
  <div class="topline">
      <div class="page-container topline-inner">
        <span>{{ locale === 'en' ? 'DESIGN · GEOTECHNICS · SUPERVISION · CONSTRUCTION' : 'طراحی · ژئوتکنیک · نظارت · اجرا' }}</span>
        <div class="language-switch" role="group" :aria-label="locale === 'en' ? 'Select language' : 'انتخاب زبان'" dir="ltr">
          <button type="button" lang="fa" :aria-pressed="locale === 'fa'" @click="$emit('change-locale', 'fa')">فارسی</button>
          <button type="button" lang="en" :aria-pressed="locale === 'en'" @click="$emit('change-locale', 'en')">EN</button>
        </div>
      </div>
    </div>
    <header class="site-header">
      <div class="page-container header-inner">
        <a class="brand" href="/" :aria-label="locale === 'en' ? 'Arcpol home' : `${company.name}، صفحهٔ خانه`" @click="$emit('close-menu')">
          <span class="brand-mark" :class="{ 'brand-mark-image': logoImage }" aria-hidden="true">
            <img v-if="logoImage" :src="logoImage" alt="">
            <svg v-else viewBox="0 0 48 48" fill="none"><path d="M7 40V14l17-7 17 7v26M7 22l17 6 17-6M7 31l17 6 17-6M15 17v26m18-26v26M24 8v33"/><path d="M18 14h12"/></svg>
          </span>
          <span class="brand-copy"><strong :lang="locale === 'en' ? 'en' : 'fa'">{{ locale === 'en' ? 'ARCPOL' : company.name }}</strong><small>{{ localizeDigits(company.descriptor, locale) }}</small></span>
        </a>
        <button class="menu-toggle" type="button" :aria-expanded="menuOpen" aria-controls="site-main-navigation" :aria-label="locale === 'en' ? 'Toggle navigation' : 'باز و بسته کردن فهرست'" @click="$emit('toggle-menu')">
          <span></span><span></span>
        </button>
        <nav id="site-main-navigation" class="main-nav" :class="{ 'is-open': menuOpen }" :aria-label="locale === 'en' ? 'Main navigation' : 'فهرست اصلی'">
          <a v-for="item in navigation" :key="item.key" :href="`#${item.path}`" :class="{ active: currentPage === item.key }" @click="$emit('close-menu')">{{ locale === 'en' ? englishNavigation[item.key] || item.label : item.label }}</a>
          <a class="nav-contact" href="/contact" @click="$emit('close-menu')">{{ locale === 'en' ? 'Contact us' : 'درخواست همکاری' }} <span aria-hidden="true">↗</span></a>
        </nav>
      </div>
    </header>
</template>
