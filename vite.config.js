import { spawn } from 'node:child_process'
import { watch as watchDirectory } from 'node:fs'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { localAdminApi } from './scripts/local-admin-api.mjs'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const telegramExportDirectory = process.env.TELEGRAM_EXPORT_DIR || path.resolve(projectRoot, '..', 'Telegram Desktop', 'ChatExport_2026-10-24')
const syncScript = path.join(projectRoot, 'scripts', 'sync-telegram-export.mjs')

function watchTelegramExport() {
  return {
    name: 'watch-telegram-export',
    configureServer(server) {
      if (!fs.existsSync(telegramExportDirectory)) return

      let timer = null
      let child = null
      let queued = false
      const sync = () => {
        if (child) { queued = true; return }
        child = spawn(process.execPath, [syncScript, '--quiet'], {
          cwd: projectRoot,
          env: process.env,
          stdio: 'ignore',
          windowsHide: true,
        })
        child.on('exit', () => {
          child = null
          if (queued) { queued = false; sync() }
        })
      }
      const schedule = () => {
        clearTimeout(timer)
        timer = setTimeout(sync, 1200)
      }
      const shouldSync = (filename) => {
        if (!filename) return false
        const name = filename.toString()
        return /^messages\d*\.html$/i.test(name) || /^photo_\d+@.*\.(?:jpe?g|png|webp)$/i.test(name)
      }

      const watchers = []
      for (const directory of [telegramExportDirectory, path.join(telegramExportDirectory, 'photos')]) {
        if (!fs.existsSync(directory)) continue
        try {
          watchers.push(watchDirectory(directory, { persistent: true }, (_event, filename) => {
            if (shouldSync(filename)) schedule()
          }))
        } catch {
          // The one-time sync still runs before Vite starts; watching is a local convenience.
        }
      }

      server.httpServer?.once('close', () => {
        clearTimeout(timer)
        for (const watcher of watchers) watcher.close()
        child?.kill()
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), localAdminApi(projectRoot), watchTelegramExport()],
  server: { host: '127.0.0.1' },
  preview: {
    host: '127.0.0.1',
    allowedHosts: ['notify-slideshow-confident-colleagues.trycloudflare.com'],
  },
})
