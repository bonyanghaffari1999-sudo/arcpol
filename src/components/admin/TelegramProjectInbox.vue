<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({
  projects: { type: Array, required: true },
  createDraft: { type: Function, required: true },
  openDraft: { type: Function, required: true },
})

const items = ref([])
const loading = ref(false)
const error = ref('')
const success = ref('')
const creatingKey = ref('')
const pendingOnly = ref(true)
const visibleLimit = ref(30)

const visibleItems = computed(() => {
  const list = pendingOnly.value ? items.value.filter((item) => item.reviewState === 'pending') : items.value
  return list.slice(0, visibleLimit.value)
})
const pendingCount = computed(() => items.value.filter((item) => item.reviewState === 'pending').length)

function reviewLabel(item) {
  if (item.draftProjectId) return `پیش‌نویس پروژهٔ ${item.draftProjectId.toLocaleString('fa-IR')}`
  return ({ published: 'منتشرشده', approved: 'تأییدشده', held: 'فعلاً نگه‌داشته‌شده', pending: 'نیازمند بررسی' })[item.reviewState] || 'نیازمند بررسی'
}

async function loadInbox() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const response = await fetch('/api/admin/telegram-inbox', { cache: 'no-store' })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'خواندن صندوق تلگرام انجام نشد.')
    items.value = Array.isArray(result.items) ? result.items : []
  } catch (cause) {
    error.value = cause.message || 'صندوق تلگرام در دسترس نیست.'
  } finally {
    loading.value = false
  }
}

function formatDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'زمان ثبت نشده' : new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

async function makeDraft(item) {
  if (creatingKey.value) return
  creatingKey.value = item.recordKey
  error.value = ''
  success.value = ''
  try {
    const projectId = await props.createDraft(item)
    if (!projectId) return
    item.draftProjectId = projectId
    item.reviewState = 'draft'
    success.value = 'پیش‌نویس پروژه ساخته شد؛ عکس‌ها همچنان در صندوق خصوصی تلگرام نگه‌داری می‌شوند.'
  } catch (cause) {
    error.value = cause.message || 'ساخت پیش‌نویس پروژه انجام نشد.'
  } finally {
    creatingKey.value = ''
  }
}

let refreshTimer
onMounted(() => {
  loadInbox()
  refreshTimer = window.setInterval(loadInbox, 30000)
})
onUnmounted(() => window.clearInterval(refreshTimer))
</script>

<template>
  <section class="telegram-inbox" aria-labelledby="telegram-inbox-title">
    <header class="telegram-inbox-head">
      <div>
        <span class="admin-eyebrow">گزارش‌های ورودی</span>
        <h2 id="telegram-inbox-title">صندوق پروژه‌های تلگرام</h2>
        <p>پیام‌ها و عکس‌های گروه اینجا خصوصی می‌مانند. هر مورد را به‌دلخواه به پیش‌نویس پروژه‌ها اضافه کنید؛ صندوق هر ۳۰ ثانیه تازه می‌شود.</p>
      </div>
      <div class="telegram-inbox-actions">
        <span class="telegram-pending-count">{{ pendingCount.toLocaleString('fa-IR') }} موردِ بررسی‌نشده</span>
        <button class="admin-button admin-button-secondary" type="button" :disabled="loading" @click="loadInbox">{{ loading ? 'در حال تازه‌سازی…' : 'تازه‌سازی صندوق' }}</button>
      </div>
    </header>

    <div class="telegram-inbox-filter" role="group" aria-label="فیلتر صندوق تلگرام">
      <button type="button" :aria-pressed="pendingOnly" @click="pendingOnly = true">در انتظار بررسی</button>
      <button type="button" :aria-pressed="!pendingOnly" @click="pendingOnly = false">همهٔ پیام‌ها</button>
    </div>

    <p v-if="error" class="admin-error" role="alert">{{ error }}</p>
    <p v-if="success" class="admin-notice" role="status">{{ success }}</p>
    <p v-if="loading && !items.length" class="admin-empty-note" role="status">در حال خواندن گزارش‌های گروه…</p>
    <p v-else-if="!visibleItems.length" class="telegram-empty" role="status">{{ pendingOnly ? 'گزارش بررسی‌نشده‌ای در صندوق نیست.' : 'هنوز گزارشی در صندوق ثبت نشده است.' }}</p>

    <div v-else class="telegram-inbox-list">
      <article v-for="item in visibleItems" :key="item.recordKey" class="telegram-inbox-card">
        <div class="telegram-card-head">
          <div>
            <span class="telegram-source-label">گروه پروژه · {{ item.category || 'دسته‌بندی‌نشده' }}</span>
            <time :datetime="item.date || undefined">{{ formatDate(item.editedAt || item.date) }}</time>
          </div>
          <span class="telegram-review-label" :class="{ 'telegram-linked-label': item.draftProjectId || item.reviewState === 'published' }">{{ reviewLabel(item) }}</span>
        </div>

        <p class="telegram-message-text" dir="auto">{{ item.text || (item.photoUrls.length ? 'پیام تصویری بدون متن' : 'پیام بدون متن') }}</p>
        <div v-if="item.photoUrls.length" class="telegram-photo-grid">
          <a v-for="(photo, index) in item.photoUrls" :key="photo" :href="photo" target="_blank" rel="noreferrer" :aria-label="`بازکردن عکس ${index + 1}`">
            <img :src="photo" :alt="`عکس گزارش تلگرام ${index + 1}`" loading="lazy">
          </a>
        </div>
        <p v-if="item.hasDocument || item.hasVideo" class="telegram-media-note">
          {{ [item.hasDocument ? 'فایل' : '', item.hasVideo ? 'ویدیو' : ''].filter(Boolean).join(' و ') }} در پیام هست؛ این نسخه فعلاً پیش‌نمایش عکس‌ها را نشان می‌دهد.
        </p>

        <footer class="telegram-card-footer">
          <small>عکس‌ها فقط در همین پنل محلی دیده می‌شوند.</small>
          <button v-if="item.draftProjectId" class="admin-button admin-button-secondary" type="button" @click="openDraft(item.draftProjectId)">بازکردن پیش‌نویس</button>
          <button v-else class="admin-button admin-button-primary" type="button" :disabled="Boolean(creatingKey)" @click="makeDraft(item)">
            {{ creatingKey === item.recordKey ? 'در حال ساخت…' : 'افزودن به پیش‌نویس پروژه‌ها' }}
          </button>
        </footer>
      </article>
      <button v-if="visibleItems.length < (pendingOnly ? pendingCount : items.length)" class="admin-button admin-button-secondary telegram-show-more" type="button" @click="visibleLimit += 30">نمایش موارد بیشتر</button>
    </div>
  </section>
</template>

<style scoped>
.telegram-inbox { grid-column: 2 / -1; min-width: 0; padding: var(--space-6); display: grid; gap: var(--space-4); align-content: start; }
.telegram-inbox-head, .telegram-card-head, .telegram-card-footer, .telegram-inbox-actions { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
.telegram-inbox-head { align-items: end; padding-bottom: var(--space-4); border-bottom: 1px solid var(--border-subtle); }
.telegram-inbox-head h2 { margin: var(--space-1) 0; color: var(--text-primary); font-size: var(--text-section-title); font-weight: 500; }
.telegram-inbox-head p { max-width: 42rem; margin: 0; color: var(--text-secondary); font-size: var(--text-small); line-height: var(--line-body); }
.telegram-inbox-actions { flex-wrap: wrap; justify-content: end; }
.telegram-pending-count, .telegram-source-label, .telegram-review-label, .telegram-linked-label { color: var(--text-secondary); font-size: var(--text-caption); }
.telegram-review-label, .telegram-linked-label { padding: var(--space-1) var(--space-2); border: 1px solid var(--border-subtle); border-radius: var(--radius-control); white-space: nowrap; }
.telegram-linked-label { color: var(--brand-green); border-color: var(--brand-green); }
.telegram-inbox-filter { display: flex; gap: var(--space-2); flex-wrap: wrap; }
.telegram-inbox-filter button { min-height: 40px; padding: var(--space-2) var(--space-3); border: 1px solid var(--border-subtle); border-radius: var(--radius-control); background: var(--surface-paper); color: var(--text-secondary); font: inherit; font-size: var(--text-caption); cursor: pointer; }
.telegram-inbox-filter button[aria-pressed="true"] { color: var(--text-primary); border-color: var(--brand-green); background: var(--surface-mint); }
.telegram-inbox-list { display: grid; gap: var(--space-3); }
.telegram-inbox-card { display: grid; gap: var(--space-3); padding: var(--space-4); border: 1px solid var(--border-subtle); background: var(--surface-paper); }
.telegram-card-head { align-items: start; }
.telegram-card-head > div { display: grid; gap: var(--space-1); }
.telegram-card-head time, .telegram-card-footer small, .telegram-media-note { color: var(--text-secondary); font-size: var(--text-caption); }
.telegram-message-text { margin: 0; color: var(--text-primary); line-height: var(--line-body); white-space: pre-wrap; overflow-wrap: anywhere; }
.telegram-photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: var(--space-2); }
.telegram-photo-grid a { display: block; overflow: hidden; border: 1px solid var(--border-subtle); background: var(--surface-soft); }
.telegram-photo-grid img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }
.telegram-media-note { margin: 0; }
.telegram-card-footer { align-items: end; flex-wrap: wrap; padding-top: var(--space-2); border-top: 1px solid var(--border-subtle); }
.telegram-card-footer small { max-width: 35rem; }
.telegram-empty { margin: 0; padding: var(--space-5); border: 1px dashed var(--border-subtle); color: var(--text-secondary); text-align: center; }
.telegram-show-more { justify-self: center; }
@media (max-width: 720px) {
  .telegram-inbox { grid-column: auto; padding: var(--space-4); }
  .telegram-inbox-head { align-items: stretch; flex-direction: column; }
  .telegram-inbox-actions { justify-content: start; }
  .telegram-card-head { flex-wrap: wrap; }
  .telegram-photo-grid { grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); }
}
</style>
