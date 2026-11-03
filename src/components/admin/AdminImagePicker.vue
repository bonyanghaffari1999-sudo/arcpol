<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  label: { type: String, default: 'انتخاب از کتابخانه' },
  currentPath: { type: String, default: '' },
})
const emit = defineEmits(['select'])
const open = ref(false)
const loading = ref(false)
const error = ref('')
const query = ref('')
const category = ref('all')
const assets = ref([])
const categories = [
  { key: 'all', label: 'همهٔ تصاویر' }, { key: 'company', label: 'پروژه‌های شرکت' },
  { key: 'reports', label: 'گزارش‌ها' }, { key: 'articles', label: 'مقاله‌ها' },
  { key: 'site', label: 'تصاویر سایت' }, { key: 'source', label: 'آرشیو تصاویر' },
  { key: 'uploaded', label: 'بارگذاری‌شده‌ها' }, { key: 'other', label: 'سایر' },
]
const results = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase('fa-IR')
  return assets.value.filter((asset) => (category.value === 'all' || asset.category === category.value)
    && (!needle || `${asset.name} ${asset.path}`.toLocaleLowerCase('fa-IR').includes(needle))).slice(0, 12)
})

async function togglePicker() {
  open.value = !open.value
  if (!open.value || assets.value.length) return
  loading.value = true
  error.value = ''
  try {
    const response = await fetch('/api/admin/media', { cache: 'no-store' })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'کتابخانهٔ تصاویر بارگذاری نشد.')
    assets.value = result.publicAssets || []
  } catch (cause) {
    error.value = cause.message || 'کتابخانهٔ تصاویر بارگذاری نشد.'
  } finally {
    loading.value = false
  }
}

function choose(asset) {
  emit('select', asset.path)
  open.value = false
}
</script>

<template>
  <div class="image-picker">
    <button class="image-picker-toggle" type="button" :aria-expanded="open" @click="togglePicker">{{ open ? 'بستن کتابخانه' : label }}</button>
    <div v-if="open" class="image-picker-panel">
      <div class="image-picker-toolbar">
        <label>جست‌وجوی تصویر<input v-model="query" type="search" placeholder="نام فایل یا مسیر"></label>
        <label>دسته‌بندی<select v-model="category"><option v-for="item in categories" :key="item.key" :value="item.key">{{ item.label }}</option></select></label>
      </div>
      <p v-if="currentPath" class="image-picker-current"><span>مسیر فعلی</span><code dir="ltr">{{ currentPath }}</code></p>
      <p v-if="loading" class="image-picker-empty">در حال خواندن تصاویر…</p>
      <p v-else-if="error" class="image-picker-error" role="alert">{{ error }}</p>
      <div v-else-if="results.length" class="image-picker-grid">
        <button v-for="asset in results" :key="asset.path" type="button" class="image-picker-item" :class="{ selected: currentPath === asset.path }" :title="asset.path" :aria-label="`انتخاب تصویر ${asset.name}`" @click="choose(asset)">
          <img :src="asset.path" :alt="asset.name" loading="lazy"><span>{{ asset.name }}</span>
        </button>
      </div>
      <p v-else class="image-picker-empty">تصویری با این مشخصات پیدا نشد.</p>
      <small v-if="results.length" class="image-picker-count">۱۲ تصویر اول نمایش داده شده؛ برای یافتن موردهای دیگر جست‌وجو یا دسته‌بندی را تغییر دهید.</small>
    </div>
  </div>
</template>

<style scoped>
.image-picker { display: grid; gap: var(--space-2); min-width: 0; }
.image-picker-toggle { justify-self: start; min-height: 44px; padding: var(--space-2) var(--space-3); border: 1px solid var(--border-strong); border-radius: var(--radius-control); background: var(--surface-paper); color: var(--text-primary); font: inherit; font-size: var(--text-caption); cursor: pointer; }
.image-picker-toggle:hover { background: var(--surface-mint); }
.image-picker-panel { display: grid; gap: var(--space-3); padding: var(--space-3); border: 1px solid var(--border-subtle); background: var(--surface-ivory); }
.image-picker-toolbar { display: grid; grid-template-columns: minmax(0, 2fr) minmax(8rem, 1fr); gap: var(--space-2); }
.image-picker-toolbar label { display: grid; gap: var(--space-1); color: var(--text-secondary); font-size: var(--text-caption); }
.image-picker-toolbar input, .image-picker-toolbar select { width: 100%; min-width: 0; min-height: 40px; padding: var(--space-2); border: 1px solid var(--border-subtle); border-radius: var(--radius-control); background: var(--surface-paper); color: var(--text-primary); font: inherit; font-size: var(--text-small); }
.image-picker-current { display: grid; gap: var(--space-1); margin: 0; color: var(--text-secondary); font-size: var(--text-caption); }
.image-picker-current code { overflow-wrap: anywhere; }
.image-picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: var(--space-2); max-height: 280px; overflow: auto; }
.image-picker-item { display: grid; gap: var(--space-1); min-width: 0; padding: var(--space-1); border: 1px solid var(--border-subtle); background: var(--surface-paper); color: var(--text-primary); text-align: right; font: inherit; font-size: 10px; cursor: pointer; }
.image-picker-item.selected { border-color: var(--brand-green); box-shadow: inset 0 0 0 1px var(--brand-green); }
.image-picker-item img { width: 100%; height: 72px; object-fit: cover; background: var(--surface-soft); }
.image-picker-item span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.image-picker-count, .image-picker-empty { margin: 0; color: var(--text-secondary); font-size: var(--text-caption); }
.image-picker-error { margin: 0; color: var(--status-danger); font-size: var(--text-caption); }
@media (max-width: 560px) { .image-picker-toolbar { grid-template-columns: 1fr; } }
</style>
