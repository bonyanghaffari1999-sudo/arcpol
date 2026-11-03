import { createWriteStream } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const dataPath = path.join(projectRoot, 'src', 'article-details.json')
const publicRoot = path.join(projectRoot, 'public')
const approvedHosts = new Set(['inbr.ir', 'inbr.s3.ir-thr-at1.arvanstorage.ir'])
const articles = JSON.parse(await fs.readFile(dataPath, 'utf8'))
let downloadedBytes = 0
let downloadedFiles = 0

for (const article of articles) {
  for (const [index, file] of (article.files || []).entries()) {
    if (!file.sourceUrl) continue

    const sourceUrl = file.sourceFileUrl || file.sourceUrl
    const source = new URL(sourceUrl)
    if (!approvedHosts.has(source.hostname.toLowerCase())) continue

    const localFilename = `article-${article.id}-${index + 1}.pdf`
    const relativePath = `/documents/articles/${localFilename}`
    const outputPath = path.join(publicRoot, 'documents', 'articles', localFilename)
    const temporaryPath = `${outputPath}.part`
    await fs.mkdir(path.dirname(outputPath), { recursive: true })

    try {
      let existing = false
      try {
        const handle = await fs.open(outputPath, 'r')
        const header = Buffer.alloc(5)
        const { bytesRead } = await handle.read(header, 0, 5, 0)
        await handle.close()
        existing = bytesRead === 5 && header.toString('ascii') === '%PDF-'
      } catch {}

      if (!existing) {
        const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(120000) })
        if (!response.ok || !response.body) throw new Error(`${response.status} from ${source.hostname}`)
        const contentType = response.headers.get('content-type') || ''
        if (!contentType.toLowerCase().includes('pdf')) throw new Error(`Not a PDF (${contentType || 'unknown content type'})`)
        await pipeline(Readable.fromWeb(response.body), createWriteStream(temporaryPath))
        const handle = await fs.open(temporaryPath, 'r')
        const header = Buffer.alloc(5)
        const { bytesRead } = await handle.read(header, 0, 5, 0)
        await handle.close()
        if (bytesRead !== 5 || header.toString('ascii') !== '%PDF-') throw new Error('Downloaded file has no PDF signature')
        const stat = await fs.stat(temporaryPath)
        await fs.rename(temporaryPath, outputPath)
        downloadedBytes += stat.size
      } else {
        downloadedBytes += (await fs.stat(outputPath)).size
      }

      file.sourceFileUrl = sourceUrl
      file.sourceUrl = relativePath
      file.sourcePage = file.sourcePage && file.sourcePage !== sourceUrl ? file.sourcePage : sourceUrl
      file.sourcePageLabel = file.sourcePage === sourceUrl ? 'نسخهٔ مرجع برخط' : 'صفحهٔ رسمی معرفی'
      file.sourceName = source.hostname === 'inbr.ir' ? 'inbr.ir · دفتر مقررات ملی و کنترل ساختمان' : 'مخزن پیوندشده از inbr.ir · Arvan'
      file.localFilename = localFilename
      file.localAvailable = true
      file.accessMode = 'local-pdf'
      file.sourceStatus = 'official-source-copy'
      file.sourceLabel = 'دانلود PDF'
      downloadedFiles += 1
      console.log(`${article.id}/${index + 1}: ${relativePath}`)
    } catch (error) {
      await fs.rm(temporaryPath, { force: true })
      throw new Error(`Article ${article.id}, attachment ${index + 1}: ${error.message}`)
    }
  }
}

await fs.writeFile(dataPath, `${JSON.stringify(articles, null, 2)}\n`, 'utf8')
console.log(`Saved ${downloadedFiles} official PDFs (${(downloadedBytes / 1024 / 1024).toFixed(1)} MiB).`)
