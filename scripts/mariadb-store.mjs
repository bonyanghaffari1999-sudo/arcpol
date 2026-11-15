import fs from 'node:fs/promises'
import path from 'node:path'
import mariadb from 'mariadb'

const DOCUMENTS_TABLE = 'arcpol_documents'
const MIGRATIONS_TABLE = 'arcpol_migrations'

function parseEnvFile(contents) {
  const values = {}
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (!match) continue
    let value = match[2]
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    } else {
      value = value.replace(/\s+#.*$/, '')
    }
    values[match[1]] = value
  }
  return values
}

async function readConfiguration(projectRoot) {
  const file = path.join(projectRoot, '.env.mariadb')
  const fileValues = await fs.readFile(file, 'utf8').then(parseEnvFile, () => ({}))
  const values = { ...fileValues, ...process.env }
  let connectionUrl = values.MARIADB_URL || values.MYSQL_URL || values.DATABASE_URL || ''
  if (values.MARIADB_URL_FILE) {
    connectionUrl = (await fs.readFile(values.MARIADB_URL_FILE, 'utf8')).trim()
  }
  if (!connectionUrl && values.MARIADB_HOST && values.MARIADB_DATABASE && values.MARIADB_USER) {
    const user = encodeURIComponent(values.MARIADB_USER)
    const password = encodeURIComponent(values.MARIADB_PASSWORD || '')
    const host = values.MARIADB_HOST.includes(':') && !values.MARIADB_HOST.startsWith('[')
      ? `[${values.MARIADB_HOST}]`
      : values.MARIADB_HOST
    const port = Number(values.MARIADB_PORT || 3306)
    connectionUrl = `mariadb://${user}:${password}@${host}:${port}/${encodeURIComponent(values.MARIADB_DATABASE)}`
  }
  if (!connectionUrl) return null

  let parsed
  try { parsed = new URL(connectionUrl) } catch {
    throw new Error('MARIADB_URL is not a valid MariaDB connection URL.')
  }
  if (!['mariadb:', 'mysql:'].includes(parsed.protocol) || !parsed.hostname || !parsed.pathname.slice(1)) {
    throw new Error('MARIADB_URL must include a MariaDB host and an existing database name.')
  }
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.slice(1)),
    connectionLimit: 6,
    acquireTimeout: 10000,
    connectTimeout: 10000,
    charset: 'utf8mb4',
    timezone: 'Z',
    ...(values.MARIADB_SSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {}),
  }
}

function asJson(value) {
  return JSON.stringify(value)
}

function parseJson(value) {
  if (typeof value === 'string') return JSON.parse(value)
  if (Buffer.isBuffer(value)) return JSON.parse(value.toString('utf8'))
  return value
}

function sqlDate(value) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 23).replace('T', ' ')
  return date.toISOString().slice(0, 23).replace('T', ' ')
}

export function createMariaDbStore(projectRoot) {
  let poolPromise

  async function getPool() {
    if (!poolPromise) {
      poolPromise = readConfiguration(projectRoot).then((config) => config ? mariadb.createPool(config) : null)
    }
    const pool = await poolPromise
    if (!pool) poolPromise = null
    return pool
  }

  async function requirePool() {
    const pool = await getPool()
    if (!pool) throw Object.assign(new Error('MariaDB is not configured.'), { code: 'MARIADB_NOT_CONFIGURED' })
    return pool
  }

  async function getDocument(key) {
    const pool = await requirePool()
    const rows = await pool.query(`SELECT document_json FROM ${DOCUMENTS_TABLE} WHERE document_key = ? LIMIT 1`, [key])
    return rows.length ? parseJson(rows[0].document_json) : null
  }

  async function putDocument(key, value, { backup = false } = {}) {
    const pool = await requirePool()
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      if (backup) {
        const rows = await connection.query(`SELECT document_json FROM ${DOCUMENTS_TABLE} WHERE document_key = ? FOR UPDATE`, [key])
        if (rows.length) {
          await connection.query(
            `INSERT INTO arcpol_document_versions (document_key, document_json) VALUES (?, ?)`,
            [key, rows[0].document_json],
          )
        }
      }
      await connection.query(
        `INSERT INTO ${DOCUMENTS_TABLE} (document_key, document_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE document_json = VALUES(document_json), updated_at = CURRENT_TIMESTAMP(3)`,
        [key, asJson(value)],
      )
      await connection.commit()
      return value
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  async function restoreDocument(key) {
    const pool = await requirePool()
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const versions = await connection.query(
        `SELECT version_id, document_json FROM arcpol_document_versions WHERE document_key = ? ORDER BY version_id DESC LIMIT 1 FOR UPDATE`,
        [key],
      )
      if (!versions.length) {
        await connection.rollback()
        return null
      }
      const current = await connection.query(`SELECT document_json FROM ${DOCUMENTS_TABLE} WHERE document_key = ? FOR UPDATE`, [key])
      if (current.length) {
        await connection.query(`INSERT INTO arcpol_document_versions (document_key, document_json) VALUES (?, ?)`, [key, current[0].document_json])
      }
      await connection.query(
        `INSERT INTO ${DOCUMENTS_TABLE} (document_key, document_json) VALUES (?, ?) ON DUPLICATE KEY UPDATE document_json = VALUES(document_json), updated_at = CURRENT_TIMESTAMP(3)`,
        [key, versions[0].document_json],
      )
      await connection.query(`DELETE FROM arcpol_document_versions WHERE version_id = ?`, [versions[0].version_id])
      await connection.commit()
      return parseJson(versions[0].document_json)
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  async function hasDocumentBackup(key) {
    const pool = await requirePool()
    const rows = await pool.query(`SELECT 1 FROM arcpol_document_versions WHERE document_key = ? LIMIT 1`, [key])
    return rows.length > 0
  }

  async function hasMigration(migrationId) {
    const pool = await requirePool()
    try {
      const rows = await pool.query(`SELECT 1 FROM ${MIGRATIONS_TABLE} WHERE migration_id = ? LIMIT 1`, [migrationId])
      return rows.length > 0
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE') return false
      throw error
    }
  }

  async function listDocuments(keys) {
    const pool = await requirePool()
    if (!keys.length) return {}
    const placeholders = keys.map(() => '?').join(',')
    const rows = await pool.query(`SELECT document_key, document_json FROM ${DOCUMENTS_TABLE} WHERE document_key IN (${placeholders})`, keys)
    return Object.fromEntries(rows.map((row) => [row.document_key, parseJson(row.document_json)]))
  }

  async function listFeedback() {
    const pool = await requirePool()
    const rows = await pool.query('SELECT feedback_json FROM arcpol_feedback ORDER BY sort_order ASC, record_id ASC')
    return rows.map((row) => parseJson(row.feedback_json))
  }

  async function replaceFeedback(records) {
    const pool = await requirePool()
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      await connection.query('DELETE FROM arcpol_feedback')
      for (let index = 0; index < records.length; index += 1) {
        const record = records[index]
        await connection.query(
          'INSERT INTO arcpol_feedback (record_id, sort_order, feedback_json, created_at) VALUES (?, ?, ?, ?)',
          [`feedback-${Date.now()}-${index}`, index, asJson(record), sqlDate(record.savedAt)],
        )
      }
      await connection.commit()
      return records
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  async function addFeedback(record) {
    const pool = await requirePool()
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const rows = await connection.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM arcpol_feedback')
      const index = Number(rows[0].next_order || 0)
      await connection.query(
        'INSERT INTO arcpol_feedback (record_id, sort_order, feedback_json, created_at) VALUES (?, ?, ?, ?)',
        [`feedback-${Date.now()}-${index}`, index, asJson(record), sqlDate(record.savedAt)],
      )
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  async function listContactRequests() {
    const pool = await requirePool()
    const rows = await pool.query('SELECT request_json FROM arcpol_contact_requests ORDER BY sort_order ASC, created_at DESC')
    return rows.map((row) => parseJson(row.request_json))
  }

  async function replaceContactRequests(records) {
    const pool = await requirePool()
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      await connection.query('DELETE FROM arcpol_contact_requests')
      for (let index = 0; index < records.length; index += 1) {
        const record = records[index]
        await connection.query(
          'INSERT INTO arcpol_contact_requests (request_id, sort_order, name, phone, service, details, status, request_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [record.id, index, record.name || '', record.phone, record.service || '', record.details || '', record.status, asJson(record), sqlDate(record.createdAt)],
        )
      }
      await connection.commit()
      return records
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  async function addContactRequest(record) {
    const pool = await requirePool()
    const rows = await pool.query('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM arcpol_contact_requests')
    const index = Number(rows[0].next_order || 0)
    await pool.query(
      'INSERT INTO arcpol_contact_requests (request_id, sort_order, name, phone, service, details, status, request_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [record.id, index, record.name || '', record.phone, record.service || '', record.details || '', record.status, asJson(record), sqlDate(record.createdAt)],
    )
  }

  async function upsertMediaAssets(assets) {
    const pool = await requirePool()
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      for (const asset of assets) {
        await connection.query(
          `INSERT INTO arcpol_media_assets (asset_path, file_name, media_type, bytes, category, is_private, storage_path) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE file_name = VALUES(file_name), media_type = VALUES(media_type), bytes = VALUES(bytes), category = VALUES(category), is_private = VALUES(is_private), storage_path = VALUES(storage_path), updated_at = CURRENT_TIMESTAMP(3)`,
          [asset.path, asset.name, asset.type, asset.bytes, asset.category || 'other', Boolean(asset.private), asset.storagePath || asset.path],
        )
      }
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  async function listMediaAssets() {
    const pool = await requirePool()
    const rows = await pool.query('SELECT asset_path, file_name, media_type, bytes, category, is_private FROM arcpol_media_assets ORDER BY asset_path ASC')
    return rows.map((row) => ({ path: row.asset_path, name: row.file_name, type: row.media_type, bytes: Number(row.bytes), category: row.category, private: Boolean(row.is_private) }))
  }

  async function deleteMediaAsset(assetPath) {
    const pool = await requirePool()
    await pool.query('DELETE FROM arcpol_media_assets WHERE asset_path = ?', [assetPath])
  }

  async function initializeSchema() {
    const pool = await requirePool()
    await pool.query(`CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (migration_id VARCHAR(100) PRIMARY KEY, applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), summary_json LONGTEXT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
    await pool.query(`CREATE TABLE IF NOT EXISTS ${DOCUMENTS_TABLE} (document_key VARCHAR(100) PRIMARY KEY, document_json LONGTEXT NOT NULL, updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), CONSTRAINT chk_arcpol_documents_json CHECK (JSON_VALID(document_json))) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
    await pool.query('CREATE TABLE IF NOT EXISTS arcpol_document_versions (version_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, document_key VARCHAR(100) NOT NULL, document_json LONGTEXT NOT NULL, created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX idx_arcpol_versions_key (document_key, version_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci')
    await pool.query('CREATE TABLE IF NOT EXISTS arcpol_feedback (record_id VARCHAR(191) PRIMARY KEY, sort_order BIGINT NOT NULL, feedback_json LONGTEXT NOT NULL, created_at DATETIME(3) NOT NULL, INDEX idx_arcpol_feedback_order (sort_order)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci')
    await pool.query('CREATE TABLE IF NOT EXISTS arcpol_contact_requests (request_id VARCHAR(64) PRIMARY KEY, sort_order BIGINT NOT NULL, name VARCHAR(120) NOT NULL DEFAULT \'\', phone VARCHAR(24) NOT NULL, service VARCHAR(160) NOT NULL DEFAULT \'\', details VARCHAR(600) NOT NULL DEFAULT \'\', status VARCHAR(24) NOT NULL, request_json LONGTEXT NOT NULL, created_at DATETIME(3) NOT NULL, INDEX idx_arcpol_contacts_order (sort_order), INDEX idx_arcpol_contacts_status (status)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci')
    await pool.query('CREATE TABLE IF NOT EXISTS arcpol_media_assets (asset_path VARCHAR(1024) PRIMARY KEY, file_name VARCHAR(255) NOT NULL, media_type VARCHAR(100) NOT NULL, bytes BIGINT UNSIGNED NOT NULL, category VARCHAR(40) NOT NULL, is_private TINYINT(1) NOT NULL DEFAULT 0, storage_path VARCHAR(1024) NOT NULL, updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3), INDEX idx_arcpol_media_category (category, is_private)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci')
  }

  async function importInitialData({ migrationId, documents, feedback, contactRequests, mediaAssets }) {
    const pool = await requirePool()
    const connection = await pool.getConnection()
    try {
      await connection.beginTransaction()
      const applied = await connection.query(`SELECT migration_id FROM ${MIGRATIONS_TABLE} WHERE migration_id = ? FOR UPDATE`, [migrationId])
      if (applied.length) {
        await connection.rollback()
        return { applied: false }
      }
      const existing = await connection.query(`SELECT
        (SELECT COUNT(*) FROM ${DOCUMENTS_TABLE}) AS documents,
        (SELECT COUNT(*) FROM arcpol_feedback) AS feedback,
        (SELECT COUNT(*) FROM arcpol_contact_requests) AS contacts,
        (SELECT COUNT(*) FROM arcpol_media_assets) AS media`)
      const counts = existing[0]
      if (Object.values(counts).some((count) => Number(count) > 0)) {
        throw new Error('Arcpol database tables already contain data; the initial import was stopped without changing them.')
      }

      for (const [key, value] of Object.entries(documents)) {
        await connection.query(`INSERT INTO ${DOCUMENTS_TABLE} (document_key, document_json) VALUES (?, ?)`, [key, asJson(value)])
      }
      for (let index = 0; index < feedback.length; index += 1) {
        const record = feedback[index]
        await connection.query(
          'INSERT INTO arcpol_feedback (record_id, sort_order, feedback_json, created_at) VALUES (?, ?, ?, ?)',
          [`initial-${index}`, index, asJson(record), sqlDate(record.savedAt)],
        )
      }
      for (let index = 0; index < contactRequests.length; index += 1) {
        const record = contactRequests[index]
        await connection.query(
          'INSERT INTO arcpol_contact_requests (request_id, sort_order, name, phone, service, details, status, request_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [String(record.id || `initial-${index}`), index, record.name || '', record.phone || '', record.service || '', record.details || '', record.status || 'new', asJson(record), sqlDate(record.createdAt)],
        )
      }
      const batchSize = 80
      for (let offset = 0; offset < mediaAssets.length; offset += batchSize) {
        const batch = mediaAssets.slice(offset, offset + batchSize)
        const values = batch.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(',')
        const parameters = batch.flatMap((asset) => [asset.path, asset.name, asset.type, asset.bytes, asset.category || 'other', Boolean(asset.private), asset.storagePath || asset.path])
        await connection.query(
          `INSERT INTO arcpol_media_assets (asset_path, file_name, media_type, bytes, category, is_private, storage_path) VALUES ${values}`,
          parameters,
        )
      }
      const summary = { documents: Object.keys(documents).length, feedback: feedback.length, contacts: contactRequests.length, media: mediaAssets.length }
      await connection.query(`INSERT INTO ${MIGRATIONS_TABLE} (migration_id, summary_json) VALUES (?, ?)`, [migrationId, asJson(summary)])
      await connection.commit()
      return { applied: true, summary }
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  async function ping() {
    const pool = await requirePool()
    await pool.query('SELECT 1 AS ok')
    return true
  }

  async function close() {
    if (!poolPromise) return
    const pool = await poolPromise
    if (pool) await pool.end()
  }

  return {
    isConfigured: async () => Boolean(await getPool()),
    initializeSchema,
    importInitialData,
    ping,
    getDocument,
    putDocument,
    restoreDocument,
    hasDocumentBackup,
    hasMigration,
    listDocuments,
    listFeedback,
    replaceFeedback,
    addFeedback,
    listContactRequests,
    replaceContactRequests,
    addContactRequest,
    upsertMediaAssets,
    listMediaAssets,
    deleteMediaAsset,
    close,
  }
}

export function parseDatabaseJson(value) {
  return parseJson(value)
}
