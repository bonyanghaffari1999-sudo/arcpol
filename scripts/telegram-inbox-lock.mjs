import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lockPath = path.join(root, '.local-data', 'telegram-live-inbox.lock')
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function removeAbandonedLock() {
  try {
    const [pidText, stat] = await Promise.all([
      fs.readFile(lockPath, 'utf8'),
      fs.stat(lockPath),
    ])
    const pid = Number(pidText.trim())
    let alive = false
    if (pid > 0) {
      try {
        process.kill(pid, 0)
        alive = true
      } catch (error) {
        alive = error.code === 'EPERM'
      }
    }
    if (!alive && Date.now() - stat.mtimeMs > 2_000) await fs.unlink(lockPath).catch(() => {})
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

export async function withTelegramInboxLock(operation) {
  await fs.mkdir(path.dirname(lockPath), { recursive: true })
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    let handle
    try {
      handle = await fs.open(lockPath, 'wx')
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      await removeAbandonedLock()
      await pause(150)
      continue
    }

    try {
      await handle.writeFile(`${process.pid}\n`)
      return await operation()
    } finally {
      await handle.close().catch(() => {})
      await fs.unlink(lockPath).catch(() => {})
    }
  }
  throw new Error('Timed out waiting for the Telegram inbox lock.')
}
