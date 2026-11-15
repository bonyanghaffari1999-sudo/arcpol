<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'

const props = defineProps({
  media: { type: Object, required: true },
  teamDirectory: { type: Array, default: () => [] },
  companyProjects: { type: Array, required: true },
  uploadPublicImage: { type: Function, required: true },
})

const emit = defineEmits(['update:media', 'save'])
const state = ref({ publicAssets: [], privateAssets: [], privateBackups: [], privateTrash: [] })
const loading = ref(true)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const query = ref('')
const category = ref('all')
const page = ref(1)
const pageSize = 36
const selectedSlot = ref('aboutImage')
const teamPhotoSlots = computed(() => props.teamDirectory.flatMap((group) => (group.members || [])
  .filter((member) => member.photoKey)
  .map((member) => ({
    key: member.photoKey,
    label: `عکس ${member.name ? `${member.name} · ` : ''}${member.role || 'همکار'}`,
    description: `تصویر ${member.name || 'همکار'} در سمت «${member.role || 'بدون سمت'}» در صفحهٔ دربارهٔ ما`,
  }))))
const slots = computed(() => [
  { key: 'logoImage', label: 'نشان سایت', description: 'لوگوی سربرگ و پایین صفحه' },
  { key: 'faviconImage', label: 'نشان تب مرورگر', description: 'نشان G در تب سایت؛ با پس‌زمینهٔ سبز تیره برای دیده‌شدن در اندازهٔ کوچک' },
  { key: 'companyMonogramImage', label: 'نشان G در معرفی مجموعه', description: 'لوگوی فرعی کنار معرفی مجموعه در صفحهٔ درباره ما' },
  { key: 'footerWatermarkImage', label: 'نشان G در پابرگ', description: 'نشان بزرگ گروه در پس‌زمینهٔ پابرگ؛ لوگوی اصلی ARCPOL جداگانه می‌ماند' },
  { key: 'heroImage', label: 'تصویر اصلی صفحهٔ اول', description: 'عکس پروژه برای بخش آغازین صفحهٔ اول' },
  { key: 'aboutImage', label: 'تصویر صفحهٔ دربارهٔ ما', description: 'تصویر اصلی معرفی مجموعه' },
  ...teamPhotoSlots.value,
  { key: 'defaultArticleImage', label: 'تصویر جایگزین مقاله‌ها', description: 'برای مقاله‌هایی که عکس اختصاصی ندارند' },
])
const categories = [
  { key: 'all', label: 'همهٔ تصاویر' }, { key: 'site', label: 'تصاویر سایت' },
  { key: 'company', label: 'پروژه‌های شرکت' }, { key: 'reports', label: 'گزارش‌ها' },
  { key: 'articles', label: 'مقاله‌ها' }, { key: 'uploaded', label: 'بارگذاری‌شده‌ها' },
  { key: 'source', label: 'آرشیو تصاویر' }, { key: 'other', label: 'سایر' },
]

const filteredAssets = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase('fa-IR')
  return state.value.publicAssets.filter((asset) => {
    const matchesCategory = category.value === 'all' || asset.category === category.value
    const matchesQuery = !needle || `${asset.name} ${asset.path} ${asset.category}`.toLocaleLowerCase('fa-IR').includes(needle)
    return matchesCategory && matchesQuery
  })
})
const pageCount = computed(() => Math.max(1, Math.ceil(filteredAssets.value.length / pageSize)))
const visibleAssets = computed(() => filteredAssets.value.slice((page.value - 1) * pageSize, page.value * pageSize))
const projectOptions = computed(() => props.companyProjects.filter((item) => item.adminStatus !== 'draft'))

async function loadMedia() {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch('/api/admin/media', { cache: 'no-store' })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'کتابخانهٔ تصویر بارگذاری نشد.')
    state.value = result
  } catch (cause) {
    error.value = cause.message || 'کتابخانهٔ تصویر بارگذاری نشد.'
  } finally {
    loading.value = false
  }
}

function updateMedia(key, value) {
  emit('update:media', { ...props.media, [key]: value })
}

async function focusLibrary(slot) {
  selectedSlot.value = slot
  await nextTick()
  document.getElementById('media-library-search')?.focus()
}

function updateFeatured(index, value) {
  const next = [...(props.media.featuredProjectIds || [68, 70, 50])]
  next[index] = value === '' ? null : Number(value)
  updateMedia('featuredProjectIds', next)
}

function selectAsset(asset) {
  updateMedia(selectedSlot.value, asset.path)
  notice.value = `«${asset.name}» برای ${slots.value.find((slot) => slot.key === selectedSlot.value)?.label || 'جایگاه انتخاب‌شده'} انتخاب شد. برای اعمال در سایت، ذخیرهٔ تنظیمات را بزنید.`
  error.value = ''
}

async function readImage(file) {
  if (!file || !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
    throw new Error('فقط تصویر JPG، PNG، WebP یا AVIF پذیرفته می‌شود.')
  }
  if (file.size > 12 * 1024 * 1024) throw new Error('حجم تصویر باید حداکثر ۱۲ مگابایت باشد.')
  const data = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('خواندن تصویر انجام نشد.'))
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.readAsDataURL(file)
  })
  return { type: file.type, data }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options)
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'عملیات تصویر انجام نشد.')
  return result
}

async function uploadPublic(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  busy.value = true
  error.value = ''
  try {
    const path = await props.uploadPublicImage(file)
    await loadMedia()
    updateMedia(selectedSlot.value, path)
    notice.value = 'تصویر جدید به کتابخانهٔ عمومی اضافه و برای جایگاه انتخاب‌شده تنظیم شد؛ برای انتشار تغییر، تنظیمات را ذخیره کنید.'
  } catch (cause) {
    error.value = cause.message || 'بارگذاری تصویر انجام نشد.'
  } finally {
    busy.value = false
  }
}

async function uploadPrivate(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  busy.value = true
  error.value = ''
  try {
    const image = await readImage(file)
    await requestJson('/api/admin/private-media/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(image) })
    await loadMedia()
    notice.value = 'تصویر پرسنلی فقط در پوشهٔ خصوصی همین رایانه ذخیره شد.'
  } catch (cause) {
    error.value = cause.message || 'بارگذاری تصویر خصوصی انجام نشد.'
  } finally {
    busy.value = false
  }
}

async function replacePrivate(asset, event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  busy.value = true
  error.value = ''
  try {
    const image = await readImage(file)
    const oldExtension = asset.name.split('.').at(-1)?.toLowerCase()
    const newExtension = file.name.split('.').at(-1)?.toLowerCase()
    if (oldExtension !== newExtension) throw new Error('برای حفظ مسیر امن، فرمت عکس جایگزین باید با فرمت فعلی یکسان باشد.')
    await requestJson('/api/admin/private-media/replace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: asset.name, ...image }) })
    await loadMedia()
    notice.value = 'تصویر جایگزین شد و نسخهٔ قبلی برای بازگردانی نگهداری شد.'
  } catch (cause) {
    error.value = cause.message || 'جایگزینی تصویر انجام نشد.'
  } finally {
    busy.value = false
  }
}

async function restorePrivate(asset) {
  busy.value = true
  error.value = ''
  try {
    await requestJson('/api/admin/private-media/restore-last', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: asset.name }) })
    await loadMedia()
    notice.value = 'نسخهٔ قبلی تصویر بازگردانده شد.'
  } catch (cause) {
    error.value = cause.message || 'بازگردانی تصویر انجام نشد.'
  } finally {
    busy.value = false
  }
}

async function movePrivateToTrash(asset) {
  if (!window.confirm('این تصویر از پوشهٔ خصوصی به بخش قابل‌بازگردانی منتقل شود؟')) return
  busy.value = true
  error.value = ''
  try {
    await requestJson(`/api/admin/private-media/${encodeURIComponent(asset.name)}`, { method: 'DELETE' })
    await loadMedia()
    notice.value = 'تصویر به حذف‌شده‌های خصوصی منتقل شد و قابل بازگردانی است.'
  } catch (cause) {
    error.value = cause.message || 'انتقال تصویر انجام نشد.'
  } finally {
    busy.value = false
  }
}

async function restoreTrashed(asset) {
  busy.value = true
  error.value = ''
  try {
    await requestJson('/api/admin/private-media/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashId: asset.trashId }) })
    await loadMedia()
    notice.value = 'تصویر به پوشهٔ خصوصی بازگردانده شد.'
  } catch (cause) {
    error.value = cause.message || 'بازگردانی تصویر انجام نشد.'
  } finally {
    busy.value = false
  }
}

function formatBytes(value) {
  return value > 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} مگابایت` : `${Math.max(1, Math.round(value / 1024))} کیلوبایت`
}

onMounted(loadMedia)
</script>

<template>
  <section class="media-library">
    <div class="media-head">
      <div><span class="admin-eyebrow">کتابخانهٔ رسانه</span><h2>تصاویر سایت و مجموعه</h2><p>عکس‌های پروژه و مقاله را در ویرایشگر همان مورد تغییر دهید. اینجا تصاویر سراسری و عکس‌های خصوصی پرسنل را مدیریت کنید.</p></div>
      <div class="media-actions"><button class="media-button media-button-secondary" type="button" :disabled="loading || busy" @click="loadMedia">تازه‌سازی فهرست</button><button class="media-button media-button-primary" type="button" :disabled="busy" @click="emit('save')">ذخیرهٔ تنظیمات سایت</button></div>
    </div>

    <p v-if="error" class="media-message media-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="media-message media-notice" role="status">{{ notice }}</p>

    <section class="media-settings" aria-labelledby="media-settings-title">
      <div class="media-section-title"><div><h3 id="media-settings-title">تصاویر سراسری</h3><p>برای هر جایگاه، از کتابخانه تصویر انتخاب کنید یا تصویر تازه بارگذاری کنید.</p></div></div>
      <div class="media-slot-grid">
        <article v-for="slot in slots" :key="slot.key" class="media-slot">
          <div class="media-slot-preview">
            <img v-if="media[slot.key]" :src="media[slot.key]" :alt="slot.label">
            <span v-else>نشان پیش‌فرض</span>
          </div>
          <div class="media-slot-copy"><strong>{{ slot.label }}</strong><small>{{ slot.description }}</small><code dir="ltr">{{ media[slot.key] || 'بدون تصویر' }}</code></div>
          <button class="media-button media-button-secondary" type="button" @click="focusLibrary(slot.key)">انتخاب عکس برای این بخش</button>
          <button v-if="media[slot.key] && slot.key !== 'heroImage'" class="media-text-button" type="button" @click="updateMedia(slot.key, '')">حذف تصویر از این بخش</button>
        </article>
      </div>
      <label class="media-field media-alt-field">متن جایگزین تصویر «دربارهٔ ما»
        <input :value="media.aboutImageAlt || ''" @input="updateMedia('aboutImageAlt', $event.target.value)">
      </label>
      <label class="media-field media-alt-field">متن جایگزین تصویر اصلی صفحهٔ اول
        <input :value="media.heroImageAlt || ''" @input="updateMedia('heroImageAlt', $event.target.value)">
      </label>
      <label class="media-field media-alt-field">زیرنویس تصویر اصلی صفحهٔ اول
        <input :value="media.heroImageCaption || ''" maxlength="100" @input="updateMedia('heroImageCaption', $event.target.value)">
      </label>

      <div class="media-section-title project-selection-title"><div><h3>پروژه‌های منتخب صفحهٔ اصلی</h3><p>پروژه‌هایی را برای بخش منتخب صفحهٔ اول برگزینید.</p></div></div>
      <div class="media-project-selectors">
        <label v-for="index in 3" :key="index" class="media-field">پروژهٔ منتخب {{ index }}
          <select :value="(media.featuredProjectIds || [68, 70, 50])[index - 1] || ''" @change="updateFeatured(index - 1, $event.target.value)">
            <option value="">بدون انتخاب</option>
            <option v-for="project in projectOptions" :key="project.id" :value="project.id">{{ project.code || `رکورد داخلی ${project.id}` }} · {{ project.usage || 'پروژه' }}</option>
          </select>
        </label>
      </div>
    </section>

    <section class="media-library-section" aria-labelledby="public-library-title">
      <div class="media-section-title"><div><h3 id="public-library-title">کتابخانهٔ تصاویر قابل‌نمایش</h3><p>{{ state.publicAssets.length.toLocaleString('fa-IR') }} تصویر در پوشه‌های سایت؛ انتخاب، تصویر همان جایگاه سراسری را تغییر می‌دهد.</p></div>
        <label class="media-button media-button-secondary media-upload">{{ busy ? 'در حال انجام…' : 'بارگذاری تصویر عمومی' }}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" :disabled="busy" @change="uploadPublic"></label>
      </div>
      <div class="media-library-toolbar">
        <label class="media-field media-search-field">جست‌وجو<input id="media-library-search" v-model="query" type="search" placeholder="نام فایل یا مسیر" @input="page = 1"></label>
        <label class="media-field">دسته‌بندی<select v-model="category" @change="page = 1"><option v-for="item in categories" :key="item.key" :value="item.key">{{ item.label }}</option></select></label>
        <label class="media-field">جایگاه انتخاب<select v-model="selectedSlot"><option v-for="slot in slots" :key="slot.key" :value="slot.key">{{ slot.label }}</option></select></label>
      </div>
      <p v-if="loading" class="media-empty">در حال خواندن کتابخانهٔ تصاویر…</p>
      <div v-else-if="visibleAssets.length" class="media-asset-grid">
        <article v-for="asset in visibleAssets" :key="asset.path" class="media-asset" :class="{ selected: media[selectedSlot] === asset.path }">
          <button class="media-asset-preview" type="button" :aria-label="`انتخاب ${asset.name}`" @click="selectAsset(asset)"><img :src="asset.path" :alt="asset.name" loading="lazy"></button>
          <div class="media-asset-details"><strong :title="asset.name">{{ asset.name }}</strong><small>{{ categories.find((item) => item.key === asset.category)?.label || 'سایر' }} · {{ formatBytes(asset.bytes) }}</small><code dir="ltr" :title="asset.path">{{ asset.path }}</code>
            <button class="media-button media-button-secondary" type="button" @click="selectAsset(asset)">انتخاب برای {{ slots.find((slot) => slot.key === selectedSlot)?.label }}</button>
          </div>
        </article>
      </div>
      <p v-else-if="!loading" class="media-empty">برای این جست‌وجو تصویری پیدا نشد.</p>
      <nav v-if="pageCount > 1" class="media-pagination" aria-label="صفحه‌های کتابخانهٔ تصاویر"><button class="media-button media-button-secondary" type="button" :disabled="page <= 1" @click="page--">قبلی</button><span>صفحهٔ {{ page.toLocaleString('fa-IR') }} از {{ pageCount.toLocaleString('fa-IR') }}</span><button class="media-button media-button-secondary" type="button" :disabled="page >= pageCount" @click="page++">بعدی</button></nav>
    </section>

    <section class="media-private-section" aria-labelledby="private-media-title">
      <div class="media-section-title"><div><span class="admin-eyebrow">فقط روی همین رایانه</span><h3 id="private-media-title">تصاویر پرسنلی خصوصی</h3><p>این تصاویر خارج از پوشهٔ عمومی سایت می‌مانند. جایگزینی نسخهٔ قبلی را نگه می‌دارد و انتقال به حذف‌شده‌ها قابل‌بازگشت است.</p></div>
        <label class="media-button media-button-secondary media-upload">افزودن تصویر خصوصی<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" :disabled="busy" @change="uploadPrivate"></label>
      </div>
      <div v-if="state.privateAssets.length" class="media-private-grid">
        <article v-for="asset in state.privateAssets" :key="asset.name" class="media-private-card">
          <img :src="asset.path" :alt="`تصویر خصوصی ${asset.name}`" loading="lazy">
          <div><strong>{{ asset.name }}</strong><small>{{ formatBytes(asset.bytes) }} · خصوصی</small></div>
          <div class="media-private-actions">
            <label class="media-button media-button-secondary media-upload">جایگزینی<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" :disabled="busy" @change="replacePrivate(asset, $event)"></label>
            <button v-if="state.privateBackups.includes(asset.name)" class="media-button media-button-secondary" type="button" :disabled="busy" @click="restorePrivate(asset)">بازگردانی قبلی</button>
            <button class="media-button media-button-danger" type="button" :disabled="busy" @click="movePrivateToTrash(asset)">انتقال به حذف‌شده‌ها</button>
          </div>
        </article>
      </div>
      <p v-else class="media-empty">تصویر خصوصی‌ای ثبت نشده است.</p>
      <div v-if="state.privateTrash.length" class="media-private-trash"><h4>حذف‌شده‌های قابل‌بازگردانی</h4>
        <article v-for="asset in state.privateTrash" :key="asset.trashId"><span>{{ asset.name }} · {{ formatBytes(asset.bytes) }}</span><button class="media-button media-button-secondary" type="button" :disabled="busy" @click="restoreTrashed(asset)">بازگردانی تصویر</button></article>
      </div>
    </section>
  </section>
</template>

<style scoped>
.media-library { grid-column: 2 / -1; min-width: 0; display: grid; align-content: start; gap: var(--space-6); padding: var(--space-6); }
.media-head, .media-section-title, .media-actions { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
.media-head h2, .media-section-title h3 { margin: var(--space-1) 0; color: var(--text-primary); font-size: var(--text-section-title); font-weight: 500; }
.media-head p, .media-section-title p { max-width: 52rem; margin: var(--space-2) 0 0; color: var(--text-secondary); font-size: var(--text-small); line-height: var(--line-body); }
.media-actions { flex-shrink: 0; }
.media-button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; padding: var(--space-2) var(--space-3); border: 1px solid var(--border-strong); border-radius: var(--radius-control); background: var(--surface-paper); color: var(--text-primary); font: inherit; font-size: var(--text-caption); text-align: center; cursor: pointer; }
.media-button:disabled { opacity: .55; cursor: wait; }
.media-button-primary { border-color: var(--brand-forest); background: var(--brand-forest); color: var(--text-inverse); }
.media-button-secondary:hover { background: var(--surface-mint); }
.media-button-danger { border-color: var(--status-danger); color: var(--status-danger); }
.media-message { margin: 0; padding: var(--space-3) var(--space-4); border-inline-start: 3px solid var(--brand-green); background: var(--surface-mint); color: var(--text-primary); font-size: var(--text-small); }
.media-error { border-color: var(--status-danger); background: var(--surface-danger); color: var(--status-danger); }
.media-settings, .media-library-section, .media-private-section { display: grid; gap: var(--space-4); min-width: 0; padding: var(--space-5); border: 1px solid var(--border-subtle); background: var(--surface-paper); }
.media-section-title h3 { font-size: var(--text-card-title); }
.media-slot-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-3); }
.media-slot { display: grid; align-content: start; gap: var(--space-3); min-width: 0; padding: var(--space-3); border: 1px solid var(--border-subtle); background: var(--surface-ivory); }
.media-slot-preview { display: grid; min-height: 126px; place-items: center; background: var(--surface-soft); }
.media-slot-preview img { width: 100%; height: 126px; object-fit: contain; }
.media-slot-copy { display: grid; gap: var(--space-1); min-width: 0; }
.media-slot-copy strong { color: var(--text-primary); font-size: var(--text-small); }
.media-slot-copy small, .media-slot-copy code { overflow-wrap: anywhere; color: var(--text-secondary); font-size: var(--text-caption); }
.media-field { display: grid; gap: var(--space-1); min-width: 0; color: var(--text-primary); font-size: var(--text-caption); }
.media-field input, .media-field select { width: 100%; min-width: 0; min-height: 40px; padding: var(--space-2); border: 1px solid var(--border-subtle); border-radius: var(--radius-control); background: var(--surface-paper); color: var(--text-primary); font: inherit; }
.media-alt-field { max-width: 38rem; }
.project-selection-title { padding-top: var(--space-4); border-top: 1px solid var(--border-subtle); }
.media-project-selectors { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-3); }
.media-library-toolbar { display: grid; grid-template-columns: minmax(12rem, 2fr) repeat(2, minmax(10rem, 1fr)); gap: var(--space-3); }
.media-upload { position: relative; overflow: hidden; white-space: nowrap; }
.media-upload input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.media-asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(176px, 1fr)); gap: var(--space-3); }
.media-asset { min-width: 0; border: 1px solid var(--border-subtle); background: var(--surface-paper); }
.media-asset.selected { border-color: var(--brand-green); box-shadow: inset 0 0 0 1px var(--brand-green); }
.media-asset-preview { display: grid; width: 100%; height: 138px; place-items: center; overflow: hidden; padding: 0; border: 0; background: var(--surface-soft); cursor: pointer; }
.media-asset-preview img { display: block; width: 100%; height: 100%; object-fit: cover; }
.media-asset-details { display: grid; gap: var(--space-1); padding: var(--space-2); }
.media-asset-details strong, .media-asset-details small, .media-asset-details code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.media-asset-details strong { font-size: var(--text-caption); font-weight: 500; }
.media-asset-details small, .media-asset-details code { color: var(--text-secondary); font-size: 10px; }
.media-asset-details .media-button { margin-top: var(--space-1); }
.media-pagination { display: flex; align-items: center; justify-content: center; gap: var(--space-3); color: var(--text-secondary); font-size: var(--text-small); }
.media-empty { margin: 0; padding: var(--space-6); border: 1px dashed var(--border-subtle); color: var(--text-secondary); text-align: center; }
.media-private-section { border-color: var(--border-strong); background: var(--surface-ivory); }
.media-private-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: var(--space-3); }
.media-private-card { display: grid; gap: var(--space-2); padding: var(--space-3); border: 1px solid var(--border-subtle); background: var(--surface-paper); }
.media-private-card > img { width: 100%; height: 190px; object-fit: contain; background: var(--surface-soft); }
.media-private-card > div:not(.media-private-actions) { display: grid; gap: var(--space-1); }
.media-private-card strong { overflow-wrap: anywhere; font-size: var(--text-caption); font-weight: 500; }
.media-private-card small { color: var(--text-secondary); font-size: var(--text-caption); }
.media-private-actions { display: grid; gap: var(--space-2); }
.media-private-trash { display: grid; gap: var(--space-2); padding-top: var(--space-4); border-top: 1px solid var(--border-subtle); }
.media-private-trash h4 { margin: 0; font-size: var(--text-small); font-weight: 500; }
.media-private-trash article { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-2); border: 1px solid var(--border-subtle); background: var(--surface-paper); font-size: var(--text-caption); }
.media-text-button { justify-self: start; padding: var(--space-1); border: 0; background: none; color: var(--text-secondary); font: inherit; font-size: var(--text-caption); cursor: pointer; }
.media-text-button:hover { color: var(--status-danger); }
@media (max-width: 1080px) { .media-library { padding: var(--space-4); } .media-slot-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .media-project-selectors { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 820px) { .media-library { grid-column: auto; } }
@media (max-width: 560px) { .media-head, .media-section-title, .media-private-trash article { align-items: stretch; flex-direction: column; } .media-actions { display: grid; grid-template-columns: 1fr 1fr; } .media-slot-grid, .media-project-selectors, .media-library-toolbar { grid-template-columns: minmax(0, 1fr); } .media-settings, .media-library-section, .media-private-section { padding: var(--space-3); } }
</style>
