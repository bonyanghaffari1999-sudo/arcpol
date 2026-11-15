import { createApp } from 'vue'
import App from './App.vue'
import './styles/tokens.css'
import './style.css'
import siteDataFallback from './site-data.json'
import articleDetailsFallback from './article-details.json'
import telegramProjectFallback from './telegram-projects.json'
import telegramReportFallback from './telegram-reports.json'
import telegramSyncMetaFallback from './telegram-sync-meta.json'
import adminOverridesFallback from './admin-overrides.json'

const siteContentDocuments = {
  siteData: siteDataFallback,
  articleDetails: articleDetailsFallback,
  telegramProjects: telegramProjectFallback,
  telegramReports: telegramReportFallback,
  telegramSyncMeta: telegramSyncMetaFallback,
  adminOverrides: adminOverridesFallback,
}

try {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 1500)
  const response = await fetch('/api/site-content', { cache: 'no-store', signal: controller.signal })
  clearTimeout(timeout)
  if (response.ok) Object.assign(siteContentDocuments, await response.json())
} catch {
  // A static build can still render its checked-in content snapshot.
}

createApp(App).provide('siteContentDocuments', siteContentDocuments).mount('#app')
