<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { BUILDING_VIEWBOX, buildingScene } from './building-model.js'

const props = defineProps({
  progress: { type: Number, default: 0 },
  reducedMotion: Boolean,
  label: { type: String, default: 'آماده‌سازی زمین' },
  highlightedStages: { type: Array, default: () => [] },
})
const emit = defineEmits(['select-stage'])
const host = ref(null)
const loading = ref(true)
const failed = ref(false)
const cutaway = ref(null)
const stage = computed(() => Math.ceil(props.progress - 0.015))
const isCutaway = computed(() => cutaway.value ?? [4, 5].includes(stage.value))
watch(stage, () => { cutaway.value = null })
let scene = null
let alive = true
let generation = 0

function sync() { scene?.setState({ progress: props.progress, reducedMotion: props.reducedMotion, cutaway: isCutaway.value, highlightedStages: props.highlightedStages }) }
watch(() => [props.progress, props.reducedMotion, isCutaway.value, props.highlightedStages], sync)

async function initialize() {
  const token = ++generation
  scene?.dispose()
  scene = null
  loading.value = true
  failed.value = false
  try {
    const { createBuildingScene } = await import('./building-scene.js')
    if (!alive || token !== generation) return
    const css = getComputedStyle(host.value)
    const names = ['background', 'soil', 'earth', 'concrete', 'stone', 'frame', 'metal', 'glass', 'glassLight', 'wood', 'supply', 'cable', 'light', 'leaf', 'leafLight', 'solar', 'line']
    const palette = Object.fromEntries(names.map((name) => [name, css.getPropertyValue(`--model-${name}`).trim()]))
    scene = createBuildingScene(host.value, {
      palette,
      onReady: () => { loading.value = false },
      onError: () => { failed.value = true; loading.value = false },
      onSelectStage: (index) => emit('select-stage', index),
    })
    sync()
  } catch {
    failed.value = true
    loading.value = false
    host.value?.querySelector('canvas')?.remove()
  }
}
function onKeydown(event) {
  if (event.target !== event.currentTarget) return
  const actions = {
    ArrowLeft: () => scene?.rotate(-0.2), ArrowRight: () => scene?.rotate(0.2),
    ArrowUp: () => scene?.elevate(0.12), ArrowDown: () => scene?.elevate(-0.12),
    '+': () => scene?.zoom(-0.1), '=': () => scene?.zoom(-0.1), '-': () => scene?.zoom(0.1),
    Home: () => scene?.reset(),
    Enter: () => emit('select-stage', Math.max(1, Math.min(8, stage.value))),
  }
  if (actions[event.key]) { event.preventDefault(); actions[event.key]() }
}
onMounted(initialize)
onUnmounted(() => { alive = false; generation += 1; scene?.dispose() })
</script>

<template>
  <div class="building-viewer">
    <div class="building-viewer-top">
      <span class="building-viewer-state"><i aria-hidden="true"></i>{{ label }}{{ isCutaway ? ' · نمای داخلی' : '' }}</span>
      <span class="building-viewer-type">{{ failed ? 'نمای جایگزین' : 'مدل سه‌بعدی' }}</span>
    </div>
    <div class="building-canvas-frame" :class="{ 'is-unavailable': failed }">
      <div
        ref="host" class="building-canvas" tabindex="0" role="group"
        aria-label="مدل سه‌بعدی مفهومی ساختمان پنج‌طبقه؛ کلیک روی اجزا یا کلید Enter برای خدمات مرحلهٔ فعال؛ کلیدهای جهت برای چرخش و مثبت و منفی برای بزرگ‌نمایی."
        aria-describedby="building-model-help" @keydown="onKeydown"
      ></div>
      <div v-if="loading" class="building-loading" role="status">در حال آماده‌سازی ساختمان سه‌بعدی…</div>
      <div v-if="failed" class="building-fallback">
        <svg :viewBox="BUILDING_VIEWBOX" role="img" aria-label="نمای شماتیک جایگزین ساختمان کامل؛ توضیح تمام مراحل در ادامه در دسترس است.">
          <g v-for="(markup, id) in buildingScene" :key="id" v-html="markup"></g>
        </svg>
        <p>نمایش سه‌بعدی در این مرورگر در دسترس نیست. مراحل و خدمات را در ادامه ببینید.</p>
        <button type="button" @click="initialize">تلاش دوباره</button>
      </div>
      <span v-if="!loading && !failed" class="building-drag-hint">کلیک: خدمات این بخش · کشیدن: چرخش مدل</span>
      <div class="building-north" aria-hidden="true"><svg viewBox="0 0 32 32"><path d="M16 4 24 25 16 21 8 25Z"/><path d="M16 4V21"/></svg><span>N</span></div>
    </div>
    <div class="building-viewer-toolbar" aria-label="کنترل نمای ساختمان">
      <div class="building-view-controls">
        <button type="button" :disabled="failed || loading" aria-label="چرخش به راست" title="چرخش به راست" @click="scene?.rotate(0.35)"><svg viewBox="0 0 24 24"><path d="M20 10a8 8 0 1 0-1 8M20 4v6h-6"/></svg></button>
        <button type="button" :disabled="failed || loading" aria-label="چرخش به چپ" title="چرخش به چپ" @click="scene?.rotate(-0.35)"><svg viewBox="0 0 24 24"><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/></svg></button>
        <button type="button" :disabled="failed || loading" aria-label="بزرگ‌نمایی" title="بزرگ‌نمایی" @click="scene?.zoom(-0.1)"><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5v14"/></svg></button>
        <button type="button" :disabled="failed || loading" aria-label="کوچک‌نمایی" title="کوچک‌نمایی" @click="scene?.zoom(0.1)"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>
        <button type="button" :disabled="failed || loading" aria-label="بازنشانی زاویهٔ دید" title="بازنشانی زاویهٔ دید" @click="scene?.reset()"><svg viewBox="0 0 24 24"><path d="m12 3 9 5v9l-9 5-9-5V8l9-5Zm0 10 9-5M12 13 3 8m9 5v9"/></svg></button>
      </div>
      <button type="button" class="building-cutaway" :disabled="failed || loading" :aria-pressed="isCutaway" @click="cutaway = !isCutaway">{{ isCutaway ? 'نمای کامل' : 'دیدن داخل' }}<svg viewBox="0 0 24 24"><path d="m12 3 9 5v9l-9 5-9-5V8l9-5Zm0 0v19M3 8l9 5 9-5"/></svg></button>
    </div>
    <p id="building-model-help" class="building-model-disclaimer">مدل مفهومی است؛ نقشهٔ اجرایی یا پروژهٔ واقعی شرکت نیست.</p>
  </div>
</template>

<style scoped>
.building-viewer { background: var(--model-background); border: 1px solid var(--border-subtle); }
.building-viewer-top { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-4) var(--space-6); }
.building-viewer-state { display: flex; align-items: center; gap: var(--space-2); color: var(--brand-forest); font-size: var(--text-small); }
.building-viewer-state i { width: var(--space-2); height: var(--space-2); border-radius: 50%; background: var(--brand-green); }
.building-viewer-type { color: var(--text-secondary); font-size: var(--text-small); }
.building-canvas-frame { position: relative; height: clamp(260px, calc(100svh - 408px), 750px); overflow: hidden; }
.building-canvas { width: 100%; height: 100%; cursor: grab; touch-action: pan-y; }
.building-canvas:active { cursor: grabbing; }
.building-canvas :deep(canvas) { display: block; width: 100%; height: 100%; touch-action: pan-y; }
.building-canvas:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: -3px; }
.building-drag-hint { position: absolute; bottom: var(--space-3); inset-inline-start: var(--space-6); color: var(--text-secondary); font-size: var(--text-small); pointer-events: none; }
.building-north { position: absolute; bottom: var(--space-4); inset-inline-end: var(--space-6); display: grid; justify-items: center; color: var(--brand-green); font: var(--text-caption) var(--font-mono); pointer-events: none; }
.building-north svg { width: var(--space-8); height: var(--space-8); fill: none; stroke: currentColor; stroke-width: 1; }
.building-north svg path:first-child { fill: var(--surface-mint); }
.building-viewer-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: var(--space-2); padding: var(--space-2) var(--space-4); border-top: 1px solid var(--border-subtle); }
.building-view-controls { display: flex; }
.building-viewer button { display: inline-flex; justify-content: center; align-items: center; gap: var(--space-2); min-width: 44px; min-height: 44px; padding: var(--space-2); border: 1px solid transparent; color: var(--brand-forest); background: transparent; font: inherit; font-size: var(--text-small); cursor: pointer; }
.building-viewer button:hover:not(:disabled), .building-viewer button[aria-pressed=true] { background: var(--surface-mint); border-color: var(--border-strong); }
.building-viewer button:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.building-viewer button:disabled { opacity: .4; cursor: default; }
.building-viewer button svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linecap: round; stroke-linejoin: round; }
.building-model-disclaimer { margin: 0; padding: 0 var(--space-6) var(--space-3); color: var(--text-secondary); font-size: var(--text-caption); line-height: var(--line-body); }
.building-loading { position: absolute; inset: 0; display: grid; place-items: center; background: var(--model-background); color: var(--brand-forest); font-size: var(--text-small); }
.building-fallback { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: var(--space-4); background: var(--model-background); }
.building-fallback svg { min-height: 0; width: 100%; flex: 1; }
.building-fallback :deep(.iso-fill), .building-fallback :deep(.iso-shade) { fill: var(--brand-sage); }
.building-fallback :deep(.iso-top) { fill: var(--surface-paper); }
.building-fallback :deep(.iso-line) { fill: none; stroke: var(--brand-green); stroke-width: 1; }
.building-fallback p { font-size: var(--text-small); text-align: center; }
.building-fallback button { border-color: var(--border-strong); }
.is-unavailable .building-canvas { visibility: hidden; }
@media (max-width: 760px) {
  .building-viewer-top { padding: var(--space-2) var(--space-3); }
  .building-canvas-frame { height: clamp(170px, 26svh, 280px); }
  .building-viewer-toolbar { padding: 0 var(--space-1); gap: 0; }
  .building-viewer button { padding: var(--space-1); }
  .building-model-disclaimer { padding: var(--space-1) var(--space-3); font-size: var(--text-caption); }
  .building-drag-hint { bottom: var(--space-1); inset-inline-start: var(--space-3); font-size: var(--text-caption); }
  .building-north { bottom: var(--space-1); inset-inline-end: var(--space-3); }
  .building-north svg { width: var(--space-6); height: var(--space-6); }
}
</style>
