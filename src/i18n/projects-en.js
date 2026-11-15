// Translate only exact, verified labels. Unmatched user-entered data remains Persian.
import { formatNumber, localizeDigits, numberLocale, toLatinDigits } from './numbers.js'
const terms = {
  'مسکونی': 'Residential', 'تجاری': 'Commercial',
  'نظارت': 'Supervision', 'اجرا': 'Construction', 'نظارت و اجرا': 'Supervision and construction', 'طراحی': 'Design',
  'استان البرز': 'Alborz Province', 'کرج': 'Karaj', 'فردیس': 'Fardis', 'هشتگرد': 'Hashtgerd',
  'نظرآباد': 'Nazarabad', 'محمدشهر': 'Mohammadshahr', 'عظیمیه': 'Azimiyeh', 'جهانشهر': 'Jahanshahr',
  'گلشهر': 'Golshahr', 'کلاک': 'Kalak',
  'کرج، عظیمیه، منطقه ۱': 'Azimiyeh, Karaj, District 1', 'کرج، گلشهر': 'Golshahr, Karaj',
  'کرج، رجایی‌شهر': 'Rajaei Shahr, Karaj', 'کرج، کیانمهر': 'Kianmehr, Karaj',
  'کرج، کلاک': 'Kalak, Karaj', 'کرج، دهقان‌ویلا': 'Dehghan Villa, Karaj',
  'کرج، مهرشهر': 'Mehrshahr, Karaj', 'کرج، جهانشهر': 'Jahanshahr, Karaj',
  'کرج، گوهردشت': 'Gohardasht, Karaj', 'کرج، حصارک': 'Hesarak, Karaj',
  'کرج، شاهین‌ویلا': 'Shahin Villa, Karaj', 'فردیس، منطقه ۱': 'Fardis, District 1',
  'فردیس، منطقه ۲': 'Fardis, District 2', 'مشکین‌دشت': 'Meshkindasht',
  'مهستان': 'Mahestan', 'چهارباغ': 'Chaharbagh', 'اشتهارد': 'Eshtehard',
  'گزارش کارگاهی': 'Site report', 'گزارش فنی کارگاهی': 'Technical site report',
  'نکات فنی مرتبط با این بخش در گزارش بازدید ثبت شد.': 'Technical observations for this part were recorded in the site visit report.',
  'موضوع فنی در گزارش بازدید ثبت شد.': 'A technical observation was recorded in the site visit report.',
  'گزارش تصویری پروژه‌های شرکت.': 'Photographic report from company projects.',
  'گزارش تصویری مستقل کارگاهی.': 'Independent photographic site report.',
  'شروع بستن سقف سوم': 'Start of third-floor slab assembly',
  'بستن ستون های سقف سوم': 'Assembly of columns for the third-floor slab',
  'بتن ریزی سقف دوم': 'Concrete placement for the second-floor slab',
  'اجرای سقف دوم': 'Construction of the second-floor slab',
  'بازدید اجرایی: اجرای سقف دوم': 'Site visit: second-floor slab construction',
  'آرماتوربندی ستون های سقف دوم': 'Reinforcement of columns for the second-floor slab',
  'اتمام بستن سقف اول': 'Completion of first-floor slab assembly',
  'بازدید اجرایی: اجرای سقف اول': 'Site visit: first-floor slab construction',
  'اجرای سقف اول': 'Construction of the first-floor slab',
  'بتن ریزی ستون های سقف اول': 'Concrete placement for columns of the first-floor slab',
}
export function projectTerm(value, locale) {
  const text = String(value ?? '')
  if (locale !== 'en') return localizeDigits(text, locale)
  const visitDate = text.match(/^تاریخ بازدید\s*:\s*([۰-۹٠-٩0-9]{4}\/[۰-۹٠-٩0-9]{2}\/[۰-۹٠-٩0-9]{2})\s*$/u)
  if (visitDate) return `Visit date (Solar Hijri): ${toLatinDigits(visitDate[1])}`
  if (terms[text]) return localizeDigits(terms[text], locale)
  const floors = { 'اول': 'first', 'دوم': 'second', 'سوم': 'third', 'چهارم': 'fourth', 'پنجم': 'fifth', 'ششم': 'sixth', 'هفتم': 'seventh', 'هشتم': 'eighth', 'نهم': 'ninth', 'دهم': 'tenth' }
  const floorWork = text.match(/^(آرماتور\s*بندی|بتن\s*ریزی|اجرای)\s+(ستون\s*های\s+)?سقف\s+(اول|دوم|سوم|چهارم|پنجم|ششم|هفتم|هشتم|نهم|دهم)(?:\s+می\s*باشد)?$/u)
  if (floorWork) {
    const action = floorWork[1].startsWith('آرماتور') ? 'Reinforcement of' : floorWork[1].startsWith('بتن') ? 'Concrete placement for' : 'Construction of'
    return `${action} ${floorWork[2] ? 'columns for ' : ''}the ${floors[floorWork[3]]}-floor slab`
  }
  const foundation = text.match(/^(آرماتور\s*بندی|بتن\s*ریزی)\s+فونداسیون(?:\s+می\s*باشد)?$/u)
  if (foundation) return `${foundation[1].startsWith('آرماتور') ? 'Reinforcement of' : 'Concrete placement for'} the foundation`
  if (/^گود\s*برداری(?:\s+می\s*باشد)?$/u.test(text)) return 'Excavation'
  return localizeDigits(terms[text] || text, locale)
}
export function projectTextLanguage(value, locale) {
  return locale === 'en' && /[\u0621-\u064a\u066e-\u06d3\u06d5-\u06e5\u06fa-\u06fc]/u.test(projectTerm(value, locale)) ? 'fa' : locale
}
export function projectNumber(value, locale) { return formatNumber(value, locale) }
export function projectDateLabel(value, locale) {
  const date = new Date(value)
  const dateLocale = locale === 'en' ? 'en-GB-u-nu-latn' : numberLocale(locale)
  return value && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat(dateLocale, { dateStyle: 'long', timeZone: 'Asia/Tehran' }).format(date) : '—'
}
export function projectTitleLabel(project, locale, fallback) {
  if (locale !== 'en') return localizeDigits(fallback(project), locale)
  if (project.source === 'telegram-report') return project.code ? `Independent report ${localizeDigits(project.code, locale)}` : 'Independent site report'
  if (project.source === 'field-reports' && !/^G-\d+$/iu.test(project.code || '')) return 'Standalone photo report without a project code'
  if (project.source === 'field-reports' && project.code) return `Project ${localizeDigits(project.code, locale)}`
  if (project.code) return `Project ${localizeDigits(project.code, locale)}`
  const use = project.usage ? projectTerm(project.usage, 'en') : ''
  const area = project.address && project.address !== 'استان البرز' ? projectTerm(project.address, 'en') : ''
  return `${[use, 'project'].filter(Boolean).join(' ')}${area ? ` in ${area}` : ''}`
}
export function projectStatusLabel(status, locale, fallback) {
  if (locale !== 'en') return fallback(status)
  return { 'in-progress': 'In progress', completed: 'Completed', history: 'Photo archive' }[status] || fallback(status)
}
