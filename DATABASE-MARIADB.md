# Arcpol MariaDB storage

The local site can use MariaDB as the source of truth for its editable and archive data. Public and private image files stay in their current folders; MariaDB stores their paths, MIME types, sizes, and categories.

## Connection

Create `.env.mariadb` from `.env.mariadb.example` and set `MARIADB_URL` to a MariaDB database that already exists. Keep the real file private. The importer creates only tables prefixed with `arcpol_`; it does not create, drop, or rename the database.

The connection URL format is:

```text
mariadb://USER:PERCENT_ENCODED_PASSWORD@HOST:3306/DATABASE
```

Use a MariaDB user with permission to create and modify tables in that database. For a remote host, use a TLS-protected connection and set `MARIADB_SSL=true` in `.env.mariadb`.

## Initial import

Run:

```powershell
npm run db:migrate
```

The first import is one transaction. It copies the current site and article data, Telegram project and report archives, admin content overrides, Telegram inbox/review/publication metadata, feedback, contact requests, and an index of image files. The image bytes are not copied into MariaDB.

The migration is recorded in `arcpol_migrations`. A repeated run is a no-op. If the application tables already contain data without that migration marker, the importer stops instead of overwriting it. JSON source files are kept as a recoverable snapshot.

## Tables

- `arcpol_documents`: versioned JSON documents for site content and imported archives.
- `arcpol_document_versions`: prior admin content saves used by the restore action.
- `arcpol_feedback`: feedback form submissions.
- `arcpol_contact_requests`: contact requests and their status.
- `arcpol_media_assets`: filesystem paths and metadata for public and private images.
- `arcpol_migrations`: completed one-time data imports.

The local admin API uses MariaDB when `MARIADB_URL` is configured. Without a connection file, it retains the existing JSON-backed local mode. Once MariaDB is configured, a database failure is reported by the API; writes do not silently fall back to JSON.

Before using the database on a public deployment, put the API behind authenticated server-side access, configure backups and TLS, and use a database user limited to this application's tables. The current admin API is intentionally local-only and has no administrator sign-in.
