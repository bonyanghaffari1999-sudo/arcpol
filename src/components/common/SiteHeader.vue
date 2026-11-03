<script setup>
defineProps({
  company: { type: Object, required: true },
  logoImage: { type: String, default: '' },
  navigation: { type: Array, required: true },
  currentPage: { type: String, required: true },
  menuOpen: { type: Boolean, default: false },
})

defineEmits(['toggle-menu', 'close-menu'])
</script>

<template>
  <div class="topline">
      <div class="page-container topline-inner">
        <span>طراحی <i></i> ژئوتکنیک <i></i> نظارت <i></i> اجرا</span>
        <span>خدمات مهندسی و ساخت ساختمان</span>
      </div>
    </div>
    <header class="site-header">
      <div class="page-container header-inner">
        <a class="brand" href="#/" :aria-label="`${company.name}، صفحهٔ خانه`" @click="$emit('close-menu')">
          <span class="brand-mark" :class="{ 'brand-mark-image': logoImage }" aria-hidden="true">
            <img v-if="logoImage" :src="logoImage" alt="">
            <svg v-else viewBox="0 0 48 48" fill="none"><path d="M7 40V14l17-7 17 7v26M7 22l17 6 17-6M7 31l17 6 17-6M15 17v26m18-26v26M24 8v33"/><path d="M18 14h12"/></svg>
          </span>
          <span class="brand-copy"><strong>{{ company.name }}</strong><small>{{ company.descriptor }}</small></span>
        </a>
        <button class="menu-toggle" type="button" :aria-expanded="menuOpen" aria-controls="site-main-navigation" aria-label="باز و بسته کردن فهرست" @click="$emit('toggle-menu')">
          <span></span><span></span>
        </button>
        <nav id="site-main-navigation" class="main-nav" :class="{ 'is-open': menuOpen }" aria-label="فهرست اصلی">
          <a v-for="item in navigation" :key="item.key" :href="`#${item.path}`" :class="{ active: currentPage === item.key }" @click="$emit('close-menu')">{{ item.label }}</a>
          <a class="nav-contact" href="#/contact" @click="$emit('close-menu')">درخواست همکاری <span aria-hidden="true">↗</span></a>
        </nav>
      </div>
    </header>
</template>
