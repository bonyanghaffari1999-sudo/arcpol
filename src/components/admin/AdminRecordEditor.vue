<script setup>
import { computed, ref, watch } from 'vue'
import AdminImagePicker from './AdminImagePicker.vue'

const props = defineProps({
  kind: { type: String, required: true },
  record: { type: Object, required: true },
  articleDetails: { type: Object, default: null },
  uploadImage: { type: Function, required: true },
})

const emit = defineEmits(['save', 'delete', 'save-article-details', 'dirty-change'])
const copy = (value) => JSON.parse(JSON.stringify(value))
const draft = ref(copy(props.record))
const detailDraft = ref(copy(props.articleDetails || { id: props.record.id, sourcePage: props.record.path, paragraphs: [], files: [], contentStatus: 'empty' }))
const initialDetailDraft = ref(copy(detailDraft.value))
const imageLines = ref((draft.value.images || []).join('\n'))
const tagLines = ref((draft.value.tags || []).join('\n'))
const serviceLines = ref((draft.value.services || []).join('\n'))
const rawMode = ref(false)
const rawText = ref('')
const detailRawText = ref(JSON.stringify(detailDraft.value, null, 2))
const uploadError = ref('')
const uploading = ref(false)
const savingDetails = ref(false)

const isProject = computed(() => props.kind === 'projects')
const publicVisibility = computed({
  get: () => draft.value.adminStatus === 'draft' ? 'draft' : 'published',
  set: (value) => {
    const updated = { ...draft.value }
    if (value === 'draft') updated.adminStatus = 'draft'
    else delete updated.adminStatus
    draft.value = updated
  },
})
const recordTitle = computed(() => isProject.value ? (draft.value.code || `G-${draft.value.id}`) : (draft.value.title || `مقاله ${draft.value.id}`))
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(props.record)
  || (rawMode.value && rawText.value !== JSON.stringify(props.record, null, 2))
  || (props.kind === 'projects' && (lines(imageLines.value).join('\n') !== (props.record.images || []).join('\n')
    || lines(tagLines.value).join('\n') !== (props.record.tags || []).join('\n')
    || lines(serviceLines.value).join('\n') !== (props.record.services || []).join('\n')))
  || (props.kind === 'articles' && (JSON.stringify(detailDraft.value) !== JSON.stringify(initialDetailDraft.value)
    || detailRawText.value !== JSON.stringify(initialDetailDraft.value, null, 2))))

watch(() => props.record, (value) => {
  draft.value = copy(value)
  imageLines.value = (draft.value.images || []).join('\n')
  tagLines.value = (draft.value.tags || []).join('\n')
  serviceLines.value = (draft.value.services || []).join('\n')
  rawText.value = ''
  rawMode.value = false
}, { deep: true })
watch(() => props.articleDetails, (value) => {
  detailDraft.value = copy(value || { id: props.record.id, sourcePage: props.record.path, paragraphs: [], files: [], contentStatus: 'empty' })
  initialDetailDraft.value = copy(detailDraft.value)
  detailRawText.value = JSON.stringify(detailDraft.value, null, 2)
}, { deep: true })
watch(dirty, (value) => emit('dirty-change', value))
watch([imageLines, tagLines, serviceLines], () => {
  if (isProject.value && !rawMode.value) syncProjectArrays()
})

function lines(value) {
  return String(value || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean)
}

function syncProjectArrays() {
  draft.value = {
    ...draft.value,
    images: lines(imageLines.value),
    tags: lines(tagLines.value),
    services: lines(serviceLines.value),
  }
}

function toggleRaw() {
  uploadError.value = ''
  if (!rawMode.value) {
    syncProjectArrays()
    rawText.value = JSON.stringify(draft.value, null, 2)
    rawMode.value = true
    return
  }
  try {
    const parsed = JSON.parse(rawText.value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('object')
    if (parsed.id !== props.record.id || parsed.source !== props.record.source) throw new Error('identity')
    draft.value = parsed
    imageLines.value = (draft.value.images || []).join('\n')
    tagLines.value = (draft.value.tags || []).join('\n')
    serviceLines.value = (draft.value.services || []).join('\n')
    rawMode.value = false
  } catch (error) {
    uploadError.value = error.message === 'identity' ? 'شناسه و منبع رکورد ثابت می‌مانند.' : 'JSON را بررسی کنید؛ باید یک شیء معتبر باشد.'
  }
}

function saveRecord() {
  try {
    let value = draft.value
    if (rawMode.value) {
      value = JSON.parse(rawText.value)
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('object')
      if (value.id !== props.record.id || value.source !== props.record.source) throw new Error('identity')
    } else if (isProject.value) {
      value = { ...draft.value, images: lines(imageLines.value), tags: lines(tagLines.value), services: lines(serviceLines.value) }
    }
    if (isProject.value && value.source && Array.isArray(value.timeline)) {
      value.timeline = sortTimeline(value.timeline)
      value.images = value.timeline.map((entry) => entry.image).filter(Boolean)
      value.updatedAt = value.timeline[0]?.date || value.updatedAt
    }
    emit('save', copy(value))
  } catch (error) {
    uploadError.value = error.message === 'identity' ? 'شناسه و منبع رکورد ثابت می‌مانند.' : 'JSON را بررسی کنید؛ ساختار ذخیره‌شده معتبر نیست.'
  }
}

function addTimelineEvent() {
  const timeline = [...(draft.value.timeline || [])]
  timeline.unshift({ date: new Date().toISOString(), title: 'ثبت تصویر', summary: '', focus: '', image: '', status: 'logged' })
  const ordered = draft.value.source ? sortTimeline(timeline) : timeline
  draft.value = {
    ...draft.value,
    timeline: ordered,
    ...(draft.value.source ? { images: ordered.map((entry) => entry.image).filter(Boolean), updatedAt: ordered[0]?.date || draft.value.updatedAt } : {}),
  }
  if (draft.value.source) imageLines.value = draft.value.images.join('\n')
}

function updateTimeline(index, key, value) {
  const timeline = [...(draft.value.timeline || [])]
  timeline[index] = { ...timeline[index], [key]: value }
  draft.value = {
    ...draft.value,
    timeline,
    ...(draft.value.source ? { images: timeline.map((entry) => entry.image).filter(Boolean) } : {}),
  }
  if (draft.value.source) imageLines.value = draft.value.images.join('\n')
}

function removeTimelineEvent(index) {
  const removedImage = draft.value.timeline?.[index]?.image
  const timeline = (draft.value.timeline || []).filter((_, itemIndex) => itemIndex !== index)
  const images = draft.value.source
    ? timeline.map((entry) => entry.image).filter(Boolean)
    : (draft.value.images || []).filter((image) => image !== removedImage)
  draft.value = { ...draft.value, timeline, images }
  imageLines.value = images.join('\n')
}

function sortTimeline(timeline) {
  return [...timeline].sort((left, right) => (Date.parse(right.date) || 0) - (Date.parse(left.date) || 0))
}

function removeImage(path) {
  const images = (draft.value.images || []).filter((image) => image !== path)
  const timeline = (draft.value.timeline || []).filter((entry) => entry.image !== path)
  draft.value = { ...draft.value, images, ...(draft.value.timeline ? { timeline } : {}) }
  imageLines.value = images.join('\n')
  if (draft.value.finalImage === path) draft.value.finalImage = null
}

function addProjectImage(imagePath) {
  const images = [imagePath, ...lines(imageLines.value).filter((image) => image !== imagePath)]
  imageLines.value = images.join('\n')
  draft.value = { ...draft.value, images }
}

function selectTimelineImage(index, imagePath) {
  updateTimeline(index, 'image', imagePath)
}

function selectArticleImage(imagePath) {
  draft.value = { ...draft.value, image: imagePath }
}

async function uploadSelected(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  uploadError.value = ''
  uploading.value = true
  try {
    const imagePath = await props.uploadImage(file)
    if (isProject.value) {
      if (draft.value.source && Array.isArray(draft.value.timeline)) {
        const timeline = [{ date: new Date().toISOString(), title: 'ثبت تصویر', summary: '', focus: '', image: imagePath, status: 'logged' }, ...(draft.value.timeline || [])]
        draft.value = { ...draft.value, timeline, images: timeline.map((entry) => entry.image).filter(Boolean), updatedAt: timeline[0].date }
        imageLines.value = draft.value.images.join('\n')
      } else {
        imageLines.value = [imagePath, ...lines(imageLines.value)].join('\n')
        draft.value = { ...draft.value, images: lines(imageLines.value) }
      }
    } else {
      draft.value = { ...draft.value, image: imagePath }
    }
  } catch (error) {
    uploadError.value = error.message || 'بارگذاری تصویر انجام نشد.'
  } finally {
    uploading.value = false
  }
}

function saveArticleDetails() {
  try {
    const value = JSON.parse(detailRawText.value)
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.id !== props.record.id) throw new Error('invalid')
    detailDraft.value = value
    savingDetails.value = true
    emit('save-article-details', copy(value))
    window.setTimeout(() => { savingDetails.value = false }, 700)
  } catch {
    uploadError.value = 'اطلاعات متن و پیوست‌ها JSON معتبر با شناسهٔ همین مقاله باشد.'
  }
}
</script>

<template>
  <section class="record-editor" :aria-label="`ویرایش ${recordTitle}`">
    <header class="record-editor-head">
      <div>
        <span class="admin-eyebrow">{{ isProject ? 'پروژهٔ شرکت یا گزارش کارگاهی' : 'مقاله' }} <span dir="ltr">/ {{ record.id }}</span></span>
        <h2>{{ recordTitle }}</h2>
        <p>شناسه و منبع رکورد ثابت‌اند؛ تغییرهای دیگر با ذخیرهٔ صریح در نسخهٔ محلی ثبت می‌شوند.</p>
      </div>
      <div class="record-actions">
        <button class="admin-button admin-button-secondary" type="button" @click="toggleRaw">{{ rawMode ? 'بازگشت به فرم' : 'ویرایش کامل داده' }}</button>
        <button class="admin-button admin-button-danger" type="button" @click="emit('delete')">حذف از سایت</button>
      </div>
    </header>

    <div v-if="rawMode" class="admin-field raw-field">
      <label :for="`raw-${kind}-${record.id}`">همهٔ فیلدهای رکورد <span dir="ltr">JSON</span></label>
      <textarea :id="`raw-${kind}-${record.id}`" v-model="rawText" dir="ltr" spellcheck="false" rows="26"></textarea>
      <p>برای حفظ اتصال رکورد، فیلدهای <code>id</code> و <code>source</code> را تغییر ندهید.</p>
    </div>

    <template v-else-if="isProject">
      <div class="admin-form-grid">
        <label class="admin-field">وضعیت نمایش
          <select v-model="publicVisibility"><option value="published">نمایش در سایت</option><option value="draft">پیش‌نویس؛ فقط در پنل</option></select>
        </label>
        <label class="admin-field">کد نمایشی<input v-model="draft.code" dir="ltr"></label>
        <label class="admin-field">نوع خدمت<input v-model="draft.type"></label>
        <label class="admin-field">وضعیت
          <select v-model="draft.status">
            <option value="in-progress">در حال اجرا</option><option value="completed">تکمیل‌شده</option><option value="history">سوابق تصویری</option>
          </select>
        </label>
        <label class="admin-field">کاربری
          <select v-model="draft.usage"><option>مسکونی</option><option>تجاری</option></select>
        </label>
        <label class="admin-field">موقعیت کلی<input v-model="draft.address"></label>
        <label class="admin-field">تاریخ آخرین ثبت<input v-model="draft.updatedAt" dir="ltr"></label>
        <label class="admin-field field-wide">توضیح پروژه<textarea v-model="draft.description" rows="3"></textarea></label>
        <label class="admin-field">خدمات، هر مورد در یک خط<textarea v-model="serviceLines" rows="3"></textarea></label>
        <label class="admin-field">برچسب‌ها، هر مورد در یک خط<textarea v-model="tagLines" rows="3"></textarea></label>
        <label class="admin-field field-wide">تصاویر، هر مسیر در یک خط<textarea v-model="imageLines" dir="ltr" rows="4" :disabled="Boolean(draft.source)"></textarea><small v-if="draft.source">برای گزارش‌های گروه‌بندی‌شده، تصویر از رویداد تایملاین می‌آید؛ رویداد را ویرایش یا حذف کنید.</small></label>
        <label class="admin-field field-wide">تصویر نهاییِ مستند<input v-model="draft.finalImage" dir="ltr" placeholder="خالی بماند مگر شواهد صریح وجود داشته باشد"></label>
      </div>
      <AdminImagePicker v-if="!draft.source" label="افزودن تصویر از کتابخانه" @select="addProjectImage" />

      <div class="admin-image-tools">
        <div><strong>بارگذاری تصویر</strong><small>JPG، PNG، WebP یا AVIF؛ حداکثر ۱۲ مگابایت. در رکورد تایملاین‌دار، تصویر به‌عنوان رویداد تازه اضافه می‌شود.</small></div>
        <label class="admin-button admin-button-secondary upload-control">{{ uploading ? 'در حال بارگذاری…' : 'انتخاب تصویر' }}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" :disabled="uploading" @change="uploadSelected"></label>
      </div>
      <div v-if="draft.images?.length" class="admin-image-grid">
        <figure v-for="image in draft.images" :key="image">
          <img :src="image" :alt="`تصویر ${recordTitle}`" loading="lazy">
          <figcaption><code dir="ltr">{{ image }}</code><button type="button" class="text-button" @click="removeImage(image)">برداشتن تصویر</button></figcaption>
        </figure>
      </div>

      <section class="timeline-editor" aria-labelledby="admin-timeline-title">
        <div class="admin-section-head"><div><span class="admin-eyebrow">رویدادهای مستند</span><h3 id="admin-timeline-title">تایملاین پروژه</h3></div><button type="button" class="admin-button admin-button-secondary" @click="addTimelineEvent">افزودن رویداد</button></div>
        <article v-for="(entry, index) in draft.timeline || []" :key="`${entry.date}-${index}`" class="timeline-edit-card">
          <div class="timeline-edit-head"><strong>رویداد {{ index + 1 }}</strong><button type="button" class="text-button" @click="removeTimelineEvent(index)">حذف رویداد</button></div>
          <div class="admin-form-grid compact-grid">
            <label class="admin-field">تاریخ<input :value="entry.date" dir="ltr" @input="updateTimeline(index, 'date', $event.target.value)"></label>
            <label class="admin-field">وضعیت ثبت<input :value="entry.status" @input="updateTimeline(index, 'status', $event.target.value)"></label>
            <label class="admin-field field-wide">عنوان<input :value="entry.title" @input="updateTimeline(index, 'title', $event.target.value)"></label>
            <label class="admin-field">حوزه فنی<input :value="entry.focus" @input="updateTimeline(index, 'focus', $event.target.value)"></label>
            <label class="admin-field">مسیر تصویر<input :value="entry.image" dir="ltr" @input="updateTimeline(index, 'image', $event.target.value)"></label>
            <label class="admin-field field-wide">شرح ثبت‌شده<textarea :value="entry.summary" rows="2" @input="updateTimeline(index, 'summary', $event.target.value)"></textarea></label>
          </div>
          <AdminImagePicker label="انتخاب تصویر این رویداد از کتابخانه" :current-path="entry.image" @select="selectTimelineImage(index, $event)" />
        </article>
        <p v-if="!draft.timeline?.length" class="admin-empty-note">برای این پروژه رویدادی ثبت نشده است.</p>
      </section>
    </template>

    <template v-else>
      <div class="admin-form-grid">
        <label class="admin-field">وضعیت نمایش
          <select v-model="publicVisibility"><option value="published">نمایش در سایت</option><option value="draft">پیش‌نویس؛ فقط در پنل</option></select>
        </label>
        <label class="admin-field">عنوان مقاله<input v-model="draft.title"></label>
        <label class="admin-field">نوع محتوا<input v-model="draft.type"></label>
        <label class="admin-field">تاریخ انتشار<input v-model="draft.date" dir="ltr"></label>
        <label class="admin-field">نویسندهٔ ثبت‌شده<input v-model="draft.author"></label>
        <label class="admin-field field-wide">خلاصه<textarea v-model="draft.excerpt" rows="3"></textarea></label>
        <label class="admin-field field-wide">مسیر مقاله<input v-model="draft.path" dir="ltr"></label>
        <label class="admin-field field-wide">مسیر تصویر<input v-model="draft.image" dir="ltr"></label>
      </div>
      <AdminImagePicker label="انتخاب تصویر مقاله از کتابخانه" :current-path="draft.image" @select="selectArticleImage" />
      <div class="admin-image-tools">
        <div><strong>تصویر مقاله</strong><small>تصویر از دستگاه خود بارگذاری می‌شود و نسخهٔ اصلی روی همین رایانه می‌ماند.</small></div>
        <label class="admin-button admin-button-secondary upload-control">{{ uploading ? 'در حال بارگذاری…' : 'انتخاب تصویر' }}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" :disabled="uploading" @change="uploadSelected"></label>
      </div>
      <section class="article-detail-editor" aria-labelledby="article-content-title">
        <div class="admin-section-head"><div><span class="admin-eyebrow">متن کامل و پیوست‌ها</span><h3 id="article-content-title">محتوای مقاله</h3></div><button type="button" class="admin-button admin-button-secondary" :disabled="savingDetails" @click="saveArticleDetails">ذخیرهٔ متن و پیوست‌ها</button></div>
        <label class="admin-field"><span class="sr-only">محتوای کامل مقاله در قالب JSON</span><textarea v-model="detailRawText" dir="ltr" spellcheck="false" rows="14" aria-label="متن کامل و پیوست‌های مقاله به شکل JSON"></textarea></label>
        <p>بخش متن، وضعیت بایگانی و فهرست پیوست‌ها کامل در دسترس است. پیوندهای دانلود منبع که در بایگانی موجود نیستند، از سایت عمومی فعال نمی‌شوند.</p>
      </section>
    </template>

    <p v-if="uploadError" class="admin-error" role="alert">{{ uploadError }}</p>
    <footer class="record-editor-footer">
      <span class="admin-help">ذخیره‌سازی در همین رایانه انجام می‌شود؛ بازسازی و همگام‌سازی تلگرام ویرایش دستی را حفظ می‌کند.</span>
      <button class="admin-button admin-button-primary" type="button" @click="saveRecord">ذخیرهٔ اطلاعات</button>
    </footer>
  </section>
</template>

<style scoped>
.record-editor { display: grid; gap: var(--space-6); min-width: 0; }
.record-editor-head, .admin-section-head, .record-editor-footer, .timeline-edit-head, .admin-image-tools { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); }
.record-editor-head { padding-bottom: var(--space-4); border-bottom: 1px solid var(--border-subtle); }
.record-editor-head h2, .admin-section-head h3 { margin: var(--space-1) 0; color: var(--text-primary); font-size: var(--text-record-title); }
.record-editor-head p, .admin-section-head p, .admin-image-tools small, .admin-help, .admin-empty-note, .admin-field p, .article-detail-editor > p { margin: 0; color: var(--text-secondary); font-size: var(--text-small); line-height: var(--line-body); }
.admin-eyebrow { color: var(--brand-green); font-size: var(--text-caption); letter-spacing: .06em; }
.record-actions { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.admin-button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; padding: var(--space-2) var(--space-4); border: 1px solid var(--border-strong); border-radius: var(--radius-control); background: var(--surface-paper); color: var(--text-primary); font: inherit; font-size: var(--text-small); cursor: pointer; transition: background var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard); }
.admin-button:hover { background: var(--surface-mint); }
.admin-button:focus-visible, .text-button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.admin-button-primary { border-color: var(--brand-forest); background: var(--brand-forest); color: var(--text-inverse); }
.admin-button-primary:hover { background: var(--brand-forest-deep); color: var(--text-inverse); }
.admin-button-danger { border-color: var(--status-danger); color: var(--status-danger); }
.admin-button-danger:hover { background: var(--surface-danger); }
.admin-form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
.compact-grid { gap: var(--space-3); }
.field-wide { grid-column: 1 / -1; }
.admin-field { display: grid; gap: var(--space-2); min-width: 0; color: var(--text-primary); font-size: var(--text-small); }
.admin-field input, .admin-field textarea, .admin-field select { width: 100%; min-width: 0; min-height: 44px; padding: var(--space-2) var(--space-3); border: 1px solid var(--border-subtle); border-radius: var(--radius-control); background: var(--surface-paper); color: var(--text-primary); font: inherit; font-size: var(--text-body); line-height: var(--line-body); }
.admin-field textarea { resize: vertical; }
.admin-field textarea[dir="ltr"], .admin-field input[dir="ltr"] { text-align: left; font-family: var(--font-mono); font-size: var(--text-small); }
.raw-field { margin-top: var(--space-4); }
.raw-field code, .timeline-edit-card code { direction: ltr; }
.raw-field p { margin-top: var(--space-2); }
.admin-image-tools { padding: var(--space-4); border: 1px solid var(--border-subtle); background: var(--surface-soft); }
.admin-image-tools > div { display: grid; gap: var(--space-1); }
.upload-control { position: relative; overflow: hidden; white-space: nowrap; }
.upload-control input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.upload-control input:disabled { cursor: wait; }
.admin-image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--space-3); }
.admin-image-grid figure { min-width: 0; margin: 0; border: 1px solid var(--border-subtle); background: var(--surface-paper); }
.admin-image-grid img { display: block; width: 100%; height: 110px; object-fit: cover; background: var(--surface-soft); }
.admin-image-grid figcaption { display: grid; gap: var(--space-2); padding: var(--space-2); }
.admin-image-grid code { overflow-wrap: anywhere; color: var(--text-secondary); font-size: var(--text-caption); }
.text-button { min-height: 40px; padding: var(--space-1) var(--space-2); border: 0; background: none; color: var(--status-danger); font: inherit; font-size: var(--text-small); cursor: pointer; }
.timeline-editor, .article-detail-editor { display: grid; gap: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--border-subtle); }
.timeline-edit-card { display: grid; gap: var(--space-3); padding: var(--space-4); border: 1px solid var(--border-subtle); background: var(--surface-ivory); }
.timeline-edit-head strong { color: var(--text-primary); }
.article-detail-editor .admin-field textarea { font-family: var(--font-mono); font-size: var(--text-small); }
.admin-error { margin: 0; padding: var(--space-3) var(--space-4); border-inline-start: 3px solid var(--status-danger); background: var(--surface-danger); color: var(--status-danger); }
.record-editor-footer { align-items: flex-end; padding-top: var(--space-4); border-top: 1px solid var(--border-subtle); }
.admin-help { max-width: 34rem; }
@media (max-width: 700px) {
  .record-editor-head, .record-editor-footer, .admin-image-tools { align-items: stretch; flex-direction: column; }
  .record-actions { justify-content: flex-start; }
}
@media (max-width: 560px) {
  .admin-form-grid { grid-template-columns: minmax(0, 1fr); }
  .field-wide { grid-column: auto; }
  .record-actions { display: grid; grid-template-columns: 1fr 1fr; }
}
</style>
