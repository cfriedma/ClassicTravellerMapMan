# Classic Traveller Map Manager

## 1. Purpose

This application files, recalls, and inspects subsector maps. A record holds the hex plate, world statistics, trade lanes, equipment prices, and animal encounter tables.

## 2. Contents

1. Generate a subsector. Set the grid, paint cell types, and choose campaign rules, then roll worlds, starports, and lanes.
2. Recall a record by its 8-character code, or from the recent list.
3. Inspect a world. The plate shows the hex, the UWP, and base letters. The world entry is a specification table.
4. Open the equipment and market sheet, and the encounter tables, from that entry.
5. Edit a world, its bases, and its lanes when the record is in edit.


Settings and subsectors use the key `traveller_settings` and the key `traveller_subsectors`.

## 3. Requirements

- Node.js 18 or newer
- npm

## 4. Installation

```bash
npm install
```

## 5. Builds

The same Angular application is built three ways. Each build selects a storage backend. The keys do not change.

### 5.1 Local web application

Data stays in the browser `localStorage`.

```bash
npm start
npm run build
```

`npm start` serves the application at `http://localhost:4200/`. `npm run build` writes the static site to `dist/classic-traveller-map-man`.

### 5.2 Server image

`npm run build:server` builds the application so it loads and saves through `/api/kv/:key`. The container serves that build and a small API. The API is the only process that connects to the database. There are no user accounts. One database holds the shared campaign.

```bash
docker compose up --build
```

Compose starts Postgres and the application at `http://localhost:8080/`. On a host, run the same image and set `DATABASE_URL` to the database. Add `sslmode=require` when the database requires TLS:

```text
postgres://USER:PASSWORD@your-db.region.rds.amazonaws.com:5432/ctmm?sslmode=require
```

The database stays outside the container. The API creates a `kv` table (`key`, `value` jsonb, `updated_at`) on startup. `sslmode=require` turns on TLS without verifying the server certificate. Use `sslmode=verify-full` only when the container trusts that certificate.

### 5.3 Electron application

Data is stored in a SQLite file named `ctmm.sqlite` in Electron's user-data directory. The table is the same `kv` table, with the JSON kept as text. The window does not use `localStorage` for campaign data.

```bash
npm run electron:start
npm run electron:dist
```

`electron:start` builds the Electron configuration, rebuilds `better-sqlite3` for Electron, and opens the application. `electron:dist` packages it into `release/`.

## 6. Tests

```bash
npm test
```

## 7. Layout

```text
src/app/pages          Home and the subsector record
src/app/features       Generation, markets, encounters
src/app/models         Worlds, settings, goods
src/app/services       Catalogs and storage-facing services
src/app/storage        localStorage, HTTP, and Electron stores
src/assets             Fonts and game data
server                 API used by the server image
electron               Desktop shell
```

## 8. License

This project is open source under the [MIT License](LICENSE).

IBM Plex Sans and IBM Plex Mono are included under the SIL Open Font License. See `src/assets/fonts/OFL.txt`.
