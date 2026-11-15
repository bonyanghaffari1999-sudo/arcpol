<script setup>
import { ref } from 'vue'
defineProps({ locale: { type: String, default: 'fa' } })

const state = ref('idle')

async function submitRequest(event) {
  const form = event.currentTarget
  const formData = new FormData(form)
  state.value = 'sending'
  try {
    const response = await fetch('/api/contact-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    })
    if (!response.ok) throw new Error('save-failed')
    form.reset()
    state.value = 'saved'
  } catch {
    state.value = 'unavailable'
  }
}
</script>

<template>
  <section class="home-callback page-container" :aria-label="locale === 'en' ? 'Optional callback request' : 'درخواست تماس اختیاری'">
    <details class="callback-details">
      <summary>
        <span class="callback-summary-icon" aria-hidden="true">↗</span>
        <span class="callback-summary-copy"><strong>{{ locale === 'en' ? 'Request a callback' : 'درخواست تماس' }}</strong><small>{{ locale === 'en' ? 'Leave your number if you would like to discuss your project.' : 'اگر مایلید، شماره‌تان را بگذارید تا برای گفت‌وگو دربارهٔ پروژه با شما تماس بگیریم.' }}</small></span>
        <span class="callback-summary-toggle" aria-hidden="true">＋</span>
      </summary>
      <form class="callback-form" @submit.prevent="submitRequest">
        <div class="callback-fields">
          <label>{{ locale === 'en' ? 'Phone number' : 'شمارهٔ تماس' }} <span aria-hidden="true">*</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="32" :placeholder="locale === 'en' ? 'Phone number' : 'مثلاً ۰۹۱۲…'" required></label>
          <label>{{ locale === 'en' ? 'Name' : 'نام' }} <small>{{ locale === 'en' ? 'Optional' : 'اختیاری' }}</small><input name="name" autocomplete="name" maxlength="80" :placeholder="locale === 'en' ? 'Your name' : 'نام شما'"></label>
          <label>{{ locale === 'en' ? 'Topic' : 'موضوع گفت‌وگو' }} <small>{{ locale === 'en' ? 'Optional' : 'اختیاری' }}</small>
            <select name="service">
              <option value="">{{ locale === 'en' ? 'Not selected' : 'انتخاب نشده' }}</option>
              <option value="طراحی و تهیهٔ نقشه">{{ locale === 'en' ? 'Design and drawings' : 'طراحی و تهیهٔ نقشه' }}</option><option value="نظارت">{{ locale === 'en' ? 'Supervision' : 'نظارت' }}</option><option value="اجرا و ساخت">{{ locale === 'en' ? 'Construction' : 'اجرا و ساخت' }}</option><option value="آزمایش و ژئوتکنیک">{{ locale === 'en' ? 'Testing and geotechnics' : 'آزمایش و ژئوتکنیک' }}</option><option value="سایر خدمات">{{ locale === 'en' ? 'Other services' : 'سایر خدمات' }}</option>
            </select>
          </label>
          <label class="callback-note">{{ locale === 'en' ? 'Short note' : 'توضیح کوتاه' }} <small>{{ locale === 'en' ? 'Optional' : 'اختیاری' }}</small><input name="details" maxlength="500" :placeholder="locale === 'en' ? 'Preferred time or a short note' : 'زمان مناسب یا شرح کوتاه درخواست'"></label>
        </div>
        <div class="callback-submit-row">
          <button class="button button-dark" type="submit" :disabled="state === 'sending'">{{ locale === 'en' ? (state === 'sending' ? 'Saving…' : 'Save request') : (state === 'sending' ? 'در حال ثبت…' : 'ثبت درخواست') }} <span aria-hidden="true">↗</span></button>
          <p>{{ locale === 'en' ? 'This local version saves the request only on this computer; it is not sent to the company or over the internet.' : 'برای حفظ حریم خصوصی، این نسخه فقط روی همین رایانه ذخیره می‌کند؛ درخواست به اینترنت یا شرکت ارسال نمی‌شود.' }}</p>
        </div>
        <p v-if="state === 'saved'" class="callback-message is-success" role="status">{{ locale === 'en' ? 'Saved on this computer. No automatic call or transmission has been made.' : 'درخواست روی همین رایانه ثبت شد. تماس یا ارسال خودکار انجام نشده است.' }}</p>
        <p v-else-if="state === 'unavailable'" class="callback-message" role="alert">{{ locale === 'en' ? 'Local storage is unavailable; this request was not saved.' : 'ثبت محلی در دسترس نیست؛ درخواست در این صفحه نگهداری نشد.' }}</p>
      </form>
    </details>
  </section>
</template>

<style scoped>
.home-callback { margin-block: 8px 34px; }
.callback-details { border: 1px solid var(--border-subtle); background: var(--surface-paper); }
.callback-details summary { min-height: 78px; display: flex; align-items: center; gap: var(--space-4); padding: 14px 20px; cursor: pointer; list-style: none; }
.callback-details summary::-webkit-details-marker { display: none; }
.callback-summary-icon { width: 38px; height: 38px; display: grid; flex: 0 0 auto; place-items: center; border: 1px solid var(--border-strong); color: var(--brand-forest); font-size: 18px; }
.callback-summary-copy { display: grid; gap: 3px; }
.callback-summary-copy strong { font-size: var(--text-body); font-weight: 600; }
.callback-summary-copy small { color: var(--text-secondary); font-size: var(--text-small); }
.callback-summary-toggle { margin-inline-start: auto; color: var(--brand-green); font-size: 22px; transition: transform var(--duration-fast) ease; }
.callback-details[open] .callback-summary-toggle { transform: rotate(45deg); }
.callback-form { padding: 0 20px 20px; border-top: 1px solid var(--border-subtle); }
.callback-fields { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-4); padding-block: var(--space-4); }
.callback-fields label { display: grid; gap: 6px; color: var(--text-secondary); font-size: var(--text-small); }
.callback-fields label > span { color: var(--status-danger); }
.callback-fields label > small { display: inline; color: var(--text-subtle); font-weight: 400; }
.callback-fields input, .callback-fields select { width: 100%; min-height: 44px; padding: 9px 11px; border: 1px solid var(--border-subtle); border-radius: var(--radius-control); background: var(--surface-ivory); color: var(--text-primary); font-size: var(--text-small); }
.callback-fields input:focus, .callback-fields select:focus { border-color: var(--focus-ring); outline: 2px solid var(--focus-ring); outline-offset: 1px; }
.callback-note { grid-column: 1 / -1; }
.callback-submit-row { display: flex; align-items: center; gap: var(--space-4); }
.callback-submit-row p { max-width: 520px; margin: 0; color: var(--text-subtle); font-size: var(--text-caption); line-height: 1.8; }
.callback-message { margin: var(--space-3) 0 0; color: var(--status-danger); font-size: var(--text-small); }
.callback-message.is-success { color: var(--brand-forest); }
.button:disabled { cursor: wait; opacity: .65; }
@media (max-width: 760px) {
  .home-callback { margin-bottom: var(--space-6); }
  .callback-details summary { padding-inline: 14px; }
  .callback-form { padding-inline: 14px; }
  .callback-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .callback-submit-row { align-items: flex-start; flex-direction: column; }
}
@media (max-width: 480px) {
  .callback-fields { grid-template-columns: 1fr; }
  .callback-note { grid-column: auto; }
  .callback-summary-copy small { line-height: 1.7; }
}
</style>
