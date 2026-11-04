import { computed } from 'vue'
import { findServiceEvidence } from '../../service-details.js'
import { buildServiceCatalog } from './building-service-map.js'

export function useBuildingServices(props, allChapters) {
  const serviceCatalog = computed(() => buildServiceCatalog(props.serviceGroups, props.additionalServices))

  const serviceEntriesByChapter = computed(() => {
    const result = Object.fromEntries(allChapters.value.map((chapter) => [chapter.id, []]))
    for (const service of serviceCatalog.value) {
      for (const chapterId of service.chapterIds) {
        if (result[chapterId]) result[chapterId].push(service)
      }
    }
    return result
  })

  const branchesByChapter = computed(() => Object.fromEntries(allChapters.value.map((chapter) => {
    const branches = new Map()
    for (const service of serviceEntriesByChapter.value[chapter.id] || []) {
      const key = service.categoryId || 'other'
      if (!branches.has(key)) branches.set(key, { id: key, title: service.categoryTitle || 'سایر خدمات', items: [] })
      branches.get(key).items.push(service)
    }
    return [chapter.id, [...branches.values()]]
  })))

  const samplesByChapter = computed(() => {
    const companyReports = props.projects.filter((project) => project.source === 'field-reports')
    return Object.fromEntries(allChapters.value.map((chapter) => {
      const found = (chapter.evidenceServices || []).flatMap((service) =>
        findServiceEvidence(service, companyReports).map((item) => ({ ...item, service })),
      )
      const images = new Set()
      const samples = found.filter((item) => {
        if (!item.image || images.has(item.image)) return false
        images.add(item.image)
        return true
      }).slice(0, 2)
      return [chapter.id, samples]
    }))
  })


  return { serviceCatalog, serviceEntriesByChapter, branchesByChapter, samplesByChapter }
}