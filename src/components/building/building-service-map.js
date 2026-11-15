import { serviceAssignments } from './building-content.js'
import { constructionOrder } from './building-timeline.js'
import { serviceSlug } from '../../service-routes.js'

export function normalizeServiceText(value) {
  return String(value ?? '').normalize('NFKC').toLocaleLowerCase('fa-IR')
    .replaceAll('ي', 'ی').replaceAll('ك', 'ک').replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\s\u200c\u200d]+/g, ' ').trim()
}

const assignments = new Map(Object.entries(serviceAssignments).map(([name, ids]) => [normalizeServiceText(name), ids]))

export function serviceBuildingConnection(service) {
  const name = normalizeServiceText(service.name)
  let ids = assignments.get(name)
  if (!ids) {
    // New/renamed admin entries remain discoverable. A generic service is shown
    // as project-wide rather than given a guessed physical location.
    const related = new Set()
    if (/مکانیک|گاز|آتش|آسانسور|تهویه/.test(name)) related.add('mechanical')
    if (/برق|الکتریک|روشنایی|آسانسور/.test(name)) related.add('electrical')
    if (/سازه|اسکلت|بتن|جوش|میلگرد|فورجینگ|مقاوم/.test(name)) related.add('structure')
    if (/سقف|دال|بتن/.test(name)) related.add('slabs')
    if (/معماری|داخلی|نما|بازسازی/.test(name)) related.add('architecture')
    if (/خاک|گود|نیلینگ|انکراژ|نقشه برداری|فونداسیون|طراحی پی/.test(name)) related.add('foundation')
    if (/خورشیدی|بام/.test(name)) related.add('roof')
    ids = related.size ? [...related] : ['delivery']
  }
  const chapterIds = constructionOrder.filter((id) => ids.includes(id))
  if (!chapterIds.length) chapterIds.push('delivery')
  return { chapterIds, projectWide: chapterIds.length === 1 && chapterIds[0] === 'delivery' }
}

export function buildServiceCatalog(groups, additionalServices) {
  const unique = new Map()
  function add(name, categoryId, categoryTitle, supplemental = false) {
    const key = normalizeServiceText(name)
    if (!key || unique.has(key)) return
    const service = { name, categoryId, categoryTitle, supplemental }
    unique.set(key, { ...service, ...serviceBuildingConnection(service) })
  }
  for (const group of groups) for (const name of group.items || []) add(name, group.id, group.title)
  for (const name of additionalServices) add(name, 'complementary', 'خدمات تکمیلی')
  if (!unique.has(normalizeServiceText('طراحی پی'))) {
    const group = groups.find((entry) => entry.id === 'geotechnical')
    add('طراحی پی', 'geotechnical', group?.title || 'ژئوتکنیک و آزمایشگاه', true)
  }
  return [...unique.values()]
}

export function serviceDetailHref(service) {
  return service.supplemental
    ? `/services?category=${encodeURIComponent(service.categoryId)}`
    : `/services/${serviceSlug(service.name)}`
}
