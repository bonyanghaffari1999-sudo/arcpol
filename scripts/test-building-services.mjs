import assert from 'node:assert/strict'
import fs from 'node:fs'
import { computed, reactive } from 'vue'
import { serviceGroups, additionalServices } from '../src/content.js'
import { applyAdminPatch } from '../src/admin-data.js'
import { buildServiceCatalog, normalizeServiceText, serviceBuildingConnection, serviceDetailHref } from '../src/components/building/building-service-map.js'
import { serviceAssignments } from '../src/components/building/building-content.js'
import { constructionOrder } from '../src/components/building/building-timeline.js'
import { useBuildingServices } from '../src/components/building/use-building-services.js'

const overrides = JSON.parse(fs.readFileSync(new URL('../src/admin-overrides.json', import.meta.url), 'utf8'))
const current = applyAdminPatch({ serviceGroups, additionalServices }, overrides.siteContent)
const catalog = buildServiceCatalog(current.serviceGroups, current.additionalServices)
const names = [...current.serviceGroups.flatMap(group => group.items), ...current.additionalServices]
const publicCatalog = catalog.filter(service => !service.supplemental)
assert.equal(publicCatalog.length, new Set(names.map(normalizeServiceText)).size, 'Public services must appear exactly once in the finder')
for (const name of names) {
  const service = publicCatalog.find(entry => normalizeServiceText(entry.name) === normalizeServiceText(name))
  assert.ok(service, `Missing public service: ${name}`)
  assert.ok(service.chapterIds.length && service.chapterIds.every(id => constructionOrder.includes(id)))
  const query = new URLSearchParams(serviceDetailHref(service).split('?')[1])
  assert.equal(query.get('service'), service.name, 'Detail links must preserve the public catalog title exactly')
}
for (const name of [...serviceGroups.flatMap(group => group.items), ...additionalServices]) assert.ok(serviceAssignments[name], `Confirmed catalog entry needs an explicit mapping: ${name}`)
assert.deepEqual(serviceBuildingConnection({ name: 'طراحي تأسيسات برقي' }).chapterIds, ['electrical'])
assert.ok(serviceBuildingConnection({ name: 'مدیریت پروژه و ساخت' }).projectWide)
assert.ok(serviceBuildingConnection({ name: 'خدمت تازه از پنل' }).projectWide, 'Unknown services stay discoverable without inventing a physical location')
assert.deepEqual(serviceBuildingConnection({ name: 'اجرای تأسیسات مکانیکی و برقی' }).chapterIds, ['mechanical', 'electrical'])
assert.deepEqual(serviceBuildingConnection({ name: 'پنل خورشیدی' }).chapterIds, ['roof'])

const props = reactive({ serviceGroups: structuredClone(serviceGroups), additionalServices: [...additionalServices], projects: [] })
const { serviceCatalog, serviceEntriesByChapter } = useBuildingServices(props, computed(() => constructionOrder.map(id => ({ id }))))
props.serviceGroups[0].items.push('خدمت تازه از پنل')
assert.ok(serviceCatalog.value.some(service => service.name === 'خدمت تازه از پنل'))
assert.ok(serviceEntriesByChapter.value.delivery.some(service => service.name === 'خدمت تازه از پنل'))
props.serviceGroups[0].items = props.serviceGroups[0].items.filter(name => name !== 'خدمت تازه از پنل')
assert.ok(!serviceCatalog.value.some(service => service.name === 'خدمت تازه از پنل'), 'Removed admin services must not remain as orphaned catalog entries')
props.additionalServices.push('پنل خورشیدی')
assert.equal(serviceCatalog.value.filter(service => service.name === 'پنل خورشیدی').length, 1)
console.log(`Building service checks passed: ${publicCatalog.length} public services, valid links, multiple disciplines, project-wide scope and reactive admin updates.`)
