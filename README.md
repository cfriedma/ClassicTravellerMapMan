# Classic Traveller Map Man

A Classic Traveller Map Management application built with Angular 17.

## Description

This application is designed to help manage and visualize maps for the Classic Traveller RPG system. It provides tools for sector management, world data tracking, trade route planning, and navigation assistance.

## Features

- 🚀 Modern Angular 17 with standalone components
- 🎨 Responsive design with beautiful UI
- 📊 Star map visualization (planned)
- 🗺️ Sector management (planned)
- 🌍 World data tracking (planned)
- 🚢 Trade route planning (planned)
- 🧭 Navigation tools (planned)

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm (comes with Node.js)

### Installation

1. Clone or navigate to the project directory:
   ```bash
   cd ClassicTravellerMapMan
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development Server

Run the development server:
```bash
npm start
```

Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Builds

The same Angular app is built three ways. Each build selects a different storage backend for settings and subsectors. The keys stay `traveller_settings` and `traveller_subsectors`.

#### Local web app

Data stays in the browser's `localStorage`.

```bash
npm start
npm run build
```

`npm start` serves the app at `http://localhost:4200/`. `npm run build` writes the static site to `dist/classic-traveller-map-man`.

#### EC2 image (RDS Postgres)

`npm run build:server` builds the app so it loads and saves through `/api/kv/:key`. The container serves that build and a small API. The API is the only process that connects to the database. There are no user accounts; one database holds the shared campaign.

```bash
docker compose up --build
```

Compose starts Postgres and the app at `http://localhost:8080/`. On EC2, run the same image and set `DATABASE_URL` to the RDS instance. Add `sslmode=require` for RDS:

```text
postgres://USER:PASSWORD@your-db.region.rds.amazonaws.com:5432/ctmm?sslmode=require
```

The database stays outside the container. The API creates a `kv` table (`key`, `value` jsonb, `updated_at`) on startup. `sslmode=require` turns on TLS without verifying the RDS certificate. Use `sslmode=verify-full` only when the container trusts the RDS CA.

#### Electron app

Data is stored in a SQLite file named `ctmm.sqlite` in Electron's user-data directory (the same `kv` table, with the JSON kept as text). The window does not use `localStorage` for campaign data.

```bash
npm run electron:start
npm run electron:dist
```

`electron:start` builds the Electron configuration, rebuilds `better-sqlite3` for Electron, and opens the app. `electron:dist` packages it into `release/`.

### Running Tests

Run the unit tests:
```bash
npm test
```

### Code Scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Project Structure

```
src/
├── app/
│   └── app.component.ts    # Main application component
├── assets/                 # Static assets
├── index.html             # Main HTML file
├── main.ts                # Application bootstrap
└── styles.css             # Global styles
```

## Technologies Used

- Angular 17
- TypeScript
- CSS3
- RxJS

## Contributing

This is a personal project for Classic Traveller RPG map management. Feel free to fork and adapt for your own use.

## License

This project is open source and available under the [MIT License](LICENSE).

---

*Ready for adventure across the galaxy!* 🌌
