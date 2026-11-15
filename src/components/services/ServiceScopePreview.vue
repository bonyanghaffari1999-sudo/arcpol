<script setup>
import { computed } from 'vue'
import { serviceDescriptionsEn, serviceGroupsEn, serviceNamesEn } from '../../i18n/services-en.js'
import { localizeDigits } from '../../i18n/numbers.js'

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
  group: { type: Object, required: true },
  locale: { type: String, default: 'fa' },
})

const isEnglish = computed(() => props.locale === 'en')
const serviceTitle = computed(() => localizeDigits(isEnglish.value ? serviceNamesEn[props.title] || props.title : props.title, props.locale))
const serviceDescription = computed(() => localizeDigits(isEnglish.value ? serviceDescriptionsEn[props.title] || props.description : props.description, props.locale))
const groupTitle = computed(() => localizeDigits(isEnglish.value ? serviceGroupsEn[props.group.id]?.title || props.group.title : props.group.title, props.locale))
const serviceIllustrations = {
  'طراحی معماری': 'floorplan',
  'محاسبات و طراحی سازه': 'structure',
  'طراحی تأسیسات مکانیکی': 'mechanical',
  'طراحی تأسیسات برقی': 'electrical',
  'طراحی مفهومی و فاز صفر': 'drawings',
  'طراحی فاز یک و دو': 'drawings',
  'تهیهٔ نقشه‌های مصوب': 'drawings',
  'تهیهٔ نقشه‌های اجرایی چهار رشته': 'drawings',
  'تهیهٔ نقشه‌های چون‌ساخت (As-built)': 'structure',
  'جزئیات اجرایی و نقشه‌های ساخت': 'drawings',
  'نقشه‌برداری': 'survey',
  'خدمات شهرسازی': 'survey',
  'طراحی داخلی': 'interior',
  'مشاورهٔ فنی به سازندگان': 'coordination',
  'مطالعات و آزمایش مکانیک خاک': 'soil',
  'آزمایش مصالح ساختمانی': 'testing',
  'نمونه‌گیری و کنترل بتن': 'testing',
  'کنترل و بازرسی جوش': 'welding',
  'گودبرداری': 'excavation',
  'پایدارسازی گودهای عمیق': 'excavation',
  'نیلینگ و انکراژ': 'excavation',
  'سازه‌های نگهبان': 'excavation',
  'بهسازی خاک': 'soil',
  'آزمایش‌های کارگاهی': 'testing',
  'اجرای کامل یا بخشی از ساختمان': 'site-frame',
  'مجری ذی‌صلاح': 'site-frame',
  'اجرای سازه‌های هوایی و اسکلت بتنی و فلزی': 'site-frame',
  'فورجینگ سر‌به‌سر میلگرد': 'forging',
  'اجرای تأسیسات مکانیکی و برقی': 'mechanical',
  'خاک‌برداری و آماده‌سازی کارگاه': 'excavation',
  'تأمین مصالح ساختمانی': 'site-frame',
  'پشتیبانی فنی سازندگان': 'coordination',
  'نظارت عالیه': 'project-control',
  'نظارت مقیم و کارگاهی': 'project-control',
  'مدیریت پروژه و ساخت': 'project-control',
  'کنترل پروژه و برنامهٔ اجرا': 'project-control',
  'مدیریت کیفیت': 'project-control',
  'بازدید و گزارش کارگاهی': 'project-control',
  'هماهنگی رشته‌ها و پیمانکاران': 'coordination',
  'خدمات مهندسی برای کارفرمایان حقیقی و حقوقی': 'coordination',
  'مشارکت در ساخت پروژه‌های ساختمانی': 'coordination',
  'مشاوره و خدمات املاک': 'property',
  'بازسازی و مقاوم‌سازی': 'retrofit',
  'خدمات آتش‌نشانی': 'fire',
  'خدمات مجریان گاز': 'gas',
  'خدمات آسانسور': 'lift',
  'پنل خورشیدی': 'solar',
}
const illustrationKind = computed(() => serviceIllustrations[props.title] || (props.group.id === 'geotechnical' ? 'soil' : props.group.id === 'construction' ? 'site-frame' : props.group.id === 'management' ? 'project-control' : 'floorplan'))
</script>

<template>
  <article class="service-scope-preview" :aria-label="isEnglish ? 'Illustrative service overview' : 'نمای کلی مفهومی خدمت'">
    <div class="service-scope-art">
      <div class="service-scope-art-head"><span>ARCPOL / SERVICE BRIEF</span><span dir="ltr">{{ isEnglish ? 'ILLUSTRATIVE' : 'مفهومی' }}</span></div>
      <svg viewBox="0 0 360 210" fill="none" aria-hidden="true">
        <path class="scope-grid" d="M28 45H332M28 85H332M28 125H332M28 165H332M70 25V185M120 25V185M170 25V185M220 25V185M270 25V185M320 25V185" />
        <g v-if="illustrationKind === 'floorplan'">
          <path class="scope-line" d="M65 52H190V151H65zM190 83H290V151H190M112 52V105H65M112 105H157V151M236 83V120H290M85 151V126H101V151M212 151V131H229V151" />
          <path class="scope-accent" d="M65 52H112V105H65M190 83H236V120H190" />
          <circle class="scope-center" cx="145" cy="75" r="5" /><circle class="scope-node" cx="262" cy="101" r="8" />
        </g>
        <g v-else-if="illustrationKind === 'structure'">
          <path class="scope-line" d="M86 168V55H274V168M126 55V168M168 55V168M210 55V168M252 55V168M86 91H274M86 130H274M71 168H290" />
          <path class="scope-accent" d="M86 55H274M86 91H274M126 91L168 130L210 91L252 130M126 168L168 130L210 168L252 130" />
          <path class="scope-line" d="M78 176H282M92 176V184M268 176V184" />
        </g>
        <g v-else-if="illustrationKind === 'mechanical'">
          <path class="scope-line" d="M76 54H136V84H76zM136 69H248V96H198V125H111V152H281M111 125V84M198 96V151M248 96V68H291" />
          <path class="scope-accent" d="M76 69H136M111 84H136M198 125H281M248 68H291" />
          <circle class="scope-node" cx="111" cy="84" r="6" /><circle class="scope-center" cx="198" cy="96" r="6" /><circle class="scope-node" cx="248" cy="68" r="6" />
        </g>
        <g v-else-if="illustrationKind === 'electrical'">
          <path class="scope-line" d="M77 66H168V112H253V151M168 66V151M77 112H119M253 73V112M253 151H292" />
          <path class="scope-accent" d="M77 66H168V112H253V151H292" />
          <circle class="scope-node" cx="77" cy="66" r="7" /><circle class="scope-node" cx="168" cy="66" r="7" /><circle class="scope-center" cx="168" cy="112" r="7" /><circle class="scope-node" cx="253" cy="112" r="7" />
          <path class="scope-line" d="M105 103V121M97 112H113M284 142V160M275 151H293" />
        </g>
        <g v-else-if="illustrationKind === 'drawings'">
          <path class="scope-line" d="M78 55H211L235 78V160H78zM211 55V78H235M102 91H200M102 111H211M102 131H174" />
          <path class="scope-accent" d="M251 75H294V150H251zM260 95H284M260 108H284M260 121H276" />
          <circle class="scope-node" cx="278" cy="138" r="5" />
        </g>
        <g v-else-if="illustrationKind === 'survey'">
          <path class="scope-line" d="M56 67C93 43 115 91 150 67S211 43 247 67S296 91 320 65M51 105C90 82 119 128 151 105S211 81 247 105S294 128 324 102M56 145C92 121 120 169 153 144S212 121 249 145S295 169 321 143" />
          <path class="scope-accent" d="M184 48V158M169 63H199M173 95H195M173 127H195M70 177H290" />
          <circle class="scope-center" cx="184" cy="48" r="7" />
        </g>
        <g v-else-if="illustrationKind === 'interior'">
          <path class="scope-line" d="M69 53H291V162H69zM69 112H178V162M178 53V112H291M96 80H143V101H96zM204 74H267V91H204z" />
          <path class="scope-accent" d="M90 136H153V152H90zM220 125H271V153H220z" />
          <circle class="scope-node" cx="192" cy="137" r="7" />
        </g>
        <g v-else-if="illustrationKind === 'soil'">
          <path class="scope-line" d="M42 91C82 78 112 103 151 91S218 79 258 92S303 101 324 91M42 126C82 112 112 139 151 126S218 114 258 127S303 137 324 126M42 162C82 148 112 174 151 162S218 149 258 163S303 173 324 162" />
          <path class="scope-accent" d="M179 42V177M165 42H193M170 75H188M170 108H188M170 142H188M170 176H188" />
          <circle class="scope-node" cx="179" cy="60" r="7" />
        </g>
        <g v-else-if="illustrationKind === 'testing'">
          <path class="scope-line" d="M92 48H268M107 48V160M253 48V160M89 160H271M146 64H214M146 64V85M214 64V85M151 85H209V140H151zM136 151H224" />
          <path class="scope-accent" d="M151 85H209M151 140H209M166 98H194M166 111H194M166 124H194" />
          <circle class="scope-center" cx="180" cy="73" r="6" />
        </g>
        <g v-else-if="illustrationKind === 'welding'">
          <path class="scope-line" d="M67 104H149M211 104H293M148 88H212V120H148zM180 48V79M165 64H195M180 130V164M165 148H195" />
          <path class="scope-accent" d="M149 104H211M157 94L167 104L157 114M203 94L193 104L203 114" />
          <circle class="scope-node" cx="180" cy="104" r="18" />
          <circle class="scope-center" cx="180" cy="104" r="5" />
        </g>
        <g v-else-if="illustrationKind === 'excavation'">
          <path class="scope-line" d="M42 75H318M42 75L102 146H253V75M102 146V171H253V146M253 75V171M80 94L236 119M91 111L236 138M268 94L238 119M281 111L238 138" />
          <path class="scope-accent" d="M253 75V171M72 75L102 146M253 75H318M102 146H253" />
          <circle class="scope-node" cx="236" cy="119" r="6" /><circle class="scope-node" cx="238" cy="138" r="6" />
        </g>
        <g v-else-if="illustrationKind === 'site-frame'">
          <path class="scope-line" d="M91 169V86H204V169M108 105H129M163 105H185M108 128H129M163 128H185M108 151H129M163 151H185M74 169H221M242 169V51M242 51H314M277 51V74M242 74H275" />
          <path class="scope-accent" d="M230 43H314M242 35V51M309 51V70M221 169H295" />
          <path class="scope-line" d="M278 74V99M270 99H286M278 99V109" />
        </g>
        <g v-else-if="illustrationKind === 'forging'">
          <path class="scope-line" d="M55 107H151M209 107H305M151 83H209V131H151zM180 52V79M166 62L173 78M194 62L187 78M180 135V163M164 151H196" />
          <path class="scope-accent" d="M151 107H209M162 96L172 107L162 118M198 96L188 107L198 118" />
          <circle class="scope-node" cx="180" cy="107" r="8" />
        </g>
        <g v-else-if="illustrationKind === 'project-control'">
          <rect class="scope-line" x="77" y="42" width="206" height="134" />
          <path class="scope-line" d="M103 76L112 85L128 66M145 76H253M103 111L112 120L128 101M145 111H253M103 146L112 155L128 136M145 146H231" />
          <path class="scope-accent" d="M99 54H164M96 54V49M96 54V59M263 54V49M263 54V59" />
        </g>
        <g v-else-if="illustrationKind === 'coordination'">
          <path class="scope-line" d="M102 69L180 105L260 66M102 69L114 147L180 105L249 146M260 66L249 146M114 147H249" />
          <circle class="scope-node" cx="102" cy="69" r="13" /><circle class="scope-node" cx="260" cy="66" r="13" /><circle class="scope-node" cx="114" cy="147" r="13" /><circle class="scope-node" cx="249" cy="146" r="13" />
          <circle class="scope-node" cx="180" cy="105" r="19" /><circle class="scope-center" cx="180" cy="105" r="6" />
        </g>
        <g v-else-if="illustrationKind === 'property'">
          <path class="scope-line" d="M63 60L166 41L291 61V157L189 176L63 154zM166 41V139L63 154M166 139L291 120M111 51V145M221 50V131M63 106L166 96L291 82" />
          <path class="scope-accent" d="M166 96L221 91V132L166 140zM111 51L166 41M189 176V139" />
          <circle class="scope-node" cx="166" cy="96" r="6" />
        </g>
        <g v-else-if="illustrationKind === 'retrofit'">
          <path class="scope-line" d="M105 169V73H255V169M131 73V169M180 73V169M229 73V169M88 169H272M105 108H255" />
          <path class="scope-accent" d="M131 169L180 108L229 169M131 73L180 108L229 73M180 73V169" />
          <circle class="scope-node" cx="180" cy="108" r="8" />
        </g>
        <g v-else-if="illustrationKind === 'fire'">
          <path class="scope-line" d="M78 163V65H278V163M78 100H278M111 65V100M244 65V100M111 100V136H170M244 100V136H192" />
          <path class="scope-accent" d="M170 136H192M180 136V163" />
          <circle class="scope-node" cx="111" cy="82" r="8" /><circle class="scope-node" cx="244" cy="82" r="8" /><circle class="scope-center" cx="180" cy="136" r="7" />
        </g>
        <g v-else-if="illustrationKind === 'gas'">
          <path class="scope-line" d="M63 124H112V77H164V148H216V92H297M112 77V55M216 92V60M164 148V171" />
          <path class="scope-accent" d="M63 124H112V77H164V148H216V92H297" />
          <circle class="scope-node" cx="164" cy="148" r="9" /><path class="scope-line" d="M155 148H173M164 139V157" />
        </g>
        <g v-else-if="illustrationKind === 'lift'">
          <path class="scope-line" d="M112 43V175H248V43M112 83H248M112 124H248M131 87H221V120H131zM156 92V115M196 92V115" />
          <path class="scope-accent" d="M131 87H221V120H131zM176 54V76M168 67L176 76L184 67" />
          <circle class="scope-node" cx="235" cy="61" r="5" />
        </g>
        <g v-else-if="illustrationKind === 'solar'">
          <path class="scope-line" d="M67 145H293M88 145L108 79H254L276 145M116 91H246M107 116H263M149 79L139 145M187 79V145M225 79L236 145" />
          <path class="scope-accent" d="M180 44V55M146 51L153 61M214 51L207 61M154 39L159 47M206 39L201 47" />
          <circle class="scope-node" cx="180" cy="42" r="12" />
        </g>
        <g v-else>
          <path class="scope-line" d="M72 176V89H179V176M89 109H111M140 109H162M89 130H111M140 130H162M89 151H111M140 151H162M54 176H197M229 176V52M229 52H318M274 52V71M229 73H271M229 91H258M229 109H258M229 127H258M229 145H258M212 176H295" />
          <path class="scope-accent" d="M216 44H318M229 37V52M312 52V68M208 176H302" />
        </g>
      </svg>
      <div class="service-scope-art-foot"><span>{{ isEnglish ? 'SERVICE OVERVIEW' : 'نمای کلی خدمت' }}</span><span dir="ltr">{{ localizeDigits('01 — 04', locale) }}</span></div>
    </div>

    <div class="service-scope-copy">
      <span class="eyebrow">{{ isEnglish ? 'ILLUSTRATIVE SERVICE PROFILE' : 'نمای مفهومی خدمت / SERVICE PROFILE' }}</span>
      <h3 :lang="isEnglish ? 'en' : 'fa'" :dir="isEnglish ? 'ltr' : 'rtl'">{{ serviceTitle }}</h3>
      <p>{{ serviceDescription }}</p>
      <div class="service-scope-meta">
        <span>{{ isEnglish ? 'SERVICE GROUP' : 'دستهٔ خدمت' }}</span>
        <strong>{{ groupTitle }}</strong>
      </div>
      <p class="service-scope-disclaimer">{{ isEnglish ? 'This schematic explains the service only. It is not a photograph, drawing or record from a completed company project.' : 'این نمای شماتیک فقط برای معرفی خدمت است؛ عکس، نقشه یا سابقهٔ یک پروژهٔ انجام‌شدهٔ شرکت نیست.' }}</p>
    </div>
  </article>
</template>

<style scoped>
.service-scope-preview { display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(16rem, 0.92fr); min-width: 0; border: 1px solid var(--border-subtle); background: var(--surface-paper); }
.service-scope-art { display: flex; min-height: 20rem; flex-direction: column; justify-content: space-between; padding: var(--space-4) var(--space-6); overflow: hidden; background: var(--surface-mint); color: var(--brand-forest); }
.service-scope-art-head, .service-scope-art-foot { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); color: var(--text-subtle); font-family: var(--font-mono); font-size: var(--text-caption); letter-spacing: 0.04em; }
.service-scope-art-head span:last-child { padding: var(--space-1) var(--space-2); border: 1px solid var(--border-strong); color: var(--brand-forest); font-family: var(--font-body); letter-spacing: 0; }
.service-scope-art svg { display: block; width: min(100%, 34rem); height: auto; max-height: 14rem; margin-inline: auto; overflow: visible; }
.scope-grid { stroke: var(--border-strong); stroke-width: 0.65; opacity: 0.55; }
.scope-line { stroke: var(--brand-forest); stroke-width: 2; stroke-linecap: square; stroke-linejoin: round; }
.scope-accent { stroke: var(--brand-green); stroke-width: 3; stroke-linecap: square; stroke-linejoin: round; }
.scope-node { fill: var(--surface-mint); stroke: var(--brand-forest); stroke-width: 2; }
.scope-center { fill: var(--brand-green); }
.service-scope-copy { display: flex; min-width: 0; flex-direction: column; justify-content: center; padding: var(--space-6); }
.service-scope-copy h3 { margin: var(--space-3) 0 var(--space-2); color: var(--brand-forest); font-size: var(--text-card-title); font-weight: 600; line-height: var(--line-body); }
.service-scope-copy > p { margin: 0; color: var(--text-secondary); font-size: var(--text-small); line-height: var(--line-reading); }
.service-scope-meta { display: grid; gap: var(--space-1); margin-top: var(--space-4); padding-top: var(--space-3); border-top: 1px solid var(--border-subtle); }
.service-scope-meta span { color: var(--text-subtle); font-size: var(--text-caption); }
.service-scope-meta strong { color: var(--brand-forest); font-size: var(--text-small); font-weight: 500; }
.service-scope-copy .service-scope-disclaimer { margin-top: var(--space-4); padding-top: var(--space-3); border-top: 1px solid var(--border-subtle); color: var(--text-subtle); font-size: var(--text-caption); }
@media (max-width: 720px) {
  .service-scope-preview { grid-template-columns: 1fr; }
  .service-scope-art { min-height: 16rem; padding: var(--space-3) var(--space-4); }
  .service-scope-art svg { max-height: 11rem; }
  .service-scope-copy { padding: var(--space-4); }
}
</style>
