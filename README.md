<div align="center">

# Happit

### Build consistency. One habit at a time.

A habit-building and consistency-tracking web app that helps you record the effort you put in, understand your progress, and build routines that last.

[**Visit Happit →**](https://happit.online) · [Report a bug](https://github.com/Saurabhkumargit/happit/issues)

</div>

---

## Table of contents

- [About Happit](#about-happit)
- [Product philosophy](#product-philosophy)
- [Features](#features)
- [Install Happit on Android](#install-happit-on-android)
- [Screens and experience](#screens-and-experience)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database and migrations](#database-and-migrations)
- [Available scripts](#available-scripts)
- [Testing and quality checks](#testing-and-quality-checks)
- [Production deployment](#production-deployment)
- [Security notes](#security-notes)
- [Product roadmap](#product-roadmap)
- [Contributing](#contributing)
- [License](#license)

## About Happit

Happit is a habit-building and consistency-tracking application built around a simple idea: **progress comes from repeatedly showing up, not from being perfect every day.**

Many habit trackers reduce behavior to a binary checkbox: *done* or *not done*. Happit takes a more activity-focused approach. Users adopt habits from a curated catalog and record what they actually did through a timer or manual activity logging. Their activity history and progress views help make consistency visible over time.

The goal is to make it easier to answer four questions:

- **What am I working on?**
- **What did I actually do?**
- **How consistently have I been showing up?**
- **How is my progress changing over time?**

**Live application:** [https://happit.online](https://happit.online)  
**Source code:** [https://github.com/Saurabhkumargit/happit](https://github.com/Saurabhkumargit/happit)

> Happit is actively being developed. This README describes the current implementation and distinguishes it from ideas planned for later phases.

## Product philosophy

Happit's product decisions are guided by a few principles:

- **Consistency over perfection.** Sustainable repetition matters more than flawless execution.
- **Progress over punishment.** Missing a day should not erase the value of past effort.
- **Real activity over empty checkboxes.** Record effort and activity rather than relying only on a completion toggle.
- **Sustainable habits over aggressive streak chasing.** The product should support routines that fit real life.
- **Simplicity over feature bloat.** Keep the core experience focused and low-friction.
- **Clear feedback.** Make activity and progress understandable.
- **Gamification with a purpose.** Future progression and social features should support healthy behavior, not replace it.

### Why a curated habit catalog?

Happit uses predefined catalog habits rather than allowing users to create arbitrary habit definitions. A catalog entry owns its canonical name, target, unit, and schedule. Users choose which habits to adopt and can manage their adopted habits without changing the shared definition.

This keeps habit definitions consistent and gives the application a reliable foundation for activity tracking and future progression features.

## Features

The current application includes the following core capabilities:

### Account and sessions
- User registration and login.
- Authenticated application routes.
- Session-based authentication.
- Logout.

### Habit management
- Browse the curated habit catalog.
- Adopt catalog habits into your personal routine.
- View active habits.
- Reorder habits.
- Archive, restore, and remove adopted habits where supported by the application flow.

### Activity tracking
- Record activities using the integrated timer.
- Log activities manually.
- Validate activity data against the relevant habit's target type and unit.
- Preserve activity history for review.
- Edit or delete activities through the supported history workflows.
- Use idempotency protection on activity creation to reduce duplicate submissions.

### Progress and history
- Review historical activity.
- View progress and activity visualizations, including heatmap-style history where available in the interface.
- Review habit consistency over time.
- Use the dashboard to see the current routine and recorded activity.

### User experience and PWA
- Responsive dark interface with a restrained purple accent.
- Installable Progressive Web App (PWA) support, so Happit can be added to a supported device's home screen and launched in an app-like window.
- Application-shell offline support for the parts of the experience cached by the service worker.
- Timer behavior designed to preserve elapsed time through interruptions.
- Loading, empty, and error states throughout the core experience.

## Install Happit on Android

Happit is a **Progressive Web App (PWA)**. On a supported Android device and browser, you can install it from the website and use it from your home screen like an app—without needing to install it through the Google Play Store.

1. Open [https://happit.online](https://happit.online) in Chrome on your Android device.
2. Open the browser menu (the three-dot menu).
3. Choose **Install app** or **Add to Home screen**. The exact wording can vary by browser and device.
4. Follow the prompt to finish installing.
5. Launch Happit from the new home-screen icon.

Once installed, Happit can open in an app-like experience rather than a regular browser tab. The installation option and available PWA behavior depend on browser support and the site's current PWA configuration.

**PWA is not the same as a native Android app.** Happit does not currently require a Play Store listing or a separate APK for this install flow.

### Offline behavior

Some application resources may be available from the service worker cache, which can help the app shell load in limited connectivity. However, **Happit is not a fully offline-first app**: signing in, loading fresh server data, and saving activities require a network connection. Offline activity queues and conflict resolution are not currently promised.

## Screens and experience

Happit is designed around a minimal, dark visual system:

- Near-black page backgrounds and slightly lighter surfaces.
- Subtle borders and restrained rounded corners.
- Purple as the primary accent.
- Instrument Serif for brand and major headings, Inter for interface text, and JetBrains Mono for timer or numeric data where applicable.
- Simple line icons and a consistent spacing system.

The dashboard is intended to answer three practical questions quickly: **What should I do today? What have I completed? How am I doing overall?**

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Routing and UI | React Router, Tailwind CSS, Lucide React, Motion |
| Backend | Node.js, Express, TypeScript |
| API validation | Zod |
| Database | PostgreSQL |
| Database toolkit and migrations | Drizzle ORM, Drizzle Kit |
| Authentication | Server-side sessions, password hashing |
| Testing | Vitest, Testing Library, Supertest |
| Local database | Docker Compose, PostgreSQL |
| Frontend hosting | Vercel |
| Backend hosting | Render |
| Production database | Neon PostgreSQL |
| Domain | [happit.online](https://happit.online) |

## Architecture

Happit is a TypeScript monorepo organized as an npm-workspaces project.

```text
Browser / Installable PWA
          |
          v
 React + Vite frontend
          |
          | HTTPS / REST API
          v
  Express + TypeScript API
          |
          v
 PostgreSQL database
```

The frontend and API are deployed independently. The API uses PostgreSQL through Drizzle ORM, with schema changes managed through migrations.

### Production services

- **Frontend:** Vercel
- **API:** Render
- **Database:** Neon PostgreSQL
- **Domain:** `https://happit.online`

The production API base URL is configured through the frontend's `VITE_API_URL` environment variable. Do not hard-code deployment URLs into application code when an environment variable is appropriate.

## Repository structure

```text
happit/
├── apps/
│   ├── api/                 # Express API, database access, migrations and tests
│   │   ├── src/
│   │   └── package.json
│   └── web/                 # React + Vite frontend and UI tests
│       ├── src/
│       ├── public/
│       └── package.json
├── docker-compose.yml        # Local PostgreSQL service
├── package.json              # npm workspaces and root scripts
├── package-lock.json
└── README.md
```

The exact contents inside `src/` may evolve as the project progresses.

## Getting started

### Prerequisites

Install the following before starting:

- [Node.js](https://nodejs.org/) with a version compatible with the repository's Vite and TypeScript toolchain.
- npm.
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) if you want to run the local PostgreSQL container.

### 1. Clone the repository

```bash
git clone https://github.com/Saurabhkumargit/happit.git
cd happit
```

### 2. Install dependencies

Run this from the repository root:

```bash
npm ci
```

### 3. Start the local database

The included Docker Compose file starts PostgreSQL and exposes it on port `5433` on your machine.

```bash
docker compose up -d postgres
```

The local Compose defaults are intended for development only:

- Database: `happit`
- User: `postgres`
- Password: `postgres`
- Host port: `5433`

**Do not reuse these development credentials in production.**

### 4. Configure environment variables

Create the environment files required by the API and web app. Use the examples below as a guide, but check the current application configuration and validation before running the app: required variables may change as development continues.

For local development, the API database connection should point to the local database, for example:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/happit
```

Set a unique local session secret and the frontend origin used by the development server. Never commit `.env` files or real credentials.

### 5. Apply database migrations

From the repository root:

```bash
npm run db:migrate -w @happit/api
```

Seed the curated habit catalog:

```bash
npm run db:seed -w @happit/api
```

Run the seed command only when appropriate for the target database. Never point local development commands at production unintentionally.

### 6. Start the application

```bash
npm run dev
```

The root script starts each workspace that defines a development script. The web and API development servers will print their local URLs in the terminal.

If a service fails to start, verify its environment variables, that PostgreSQL is running, and that the configured ports are available.

## Environment variables

Environment variable names and requirements should be checked against the current code before deployment. The main variables used by the deployed architecture are:

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | API | PostgreSQL connection string |
| `SESSION_SECRET` | API | Secret used by session configuration |
| `CORS_ORIGIN` | API | Allowed frontend origin(s) |
| `NODE_ENV` | API | Runtime environment |
| `VITE_API_URL` | Web | Base URL for the API |

For local development, set `VITE_API_URL` to the local API URL printed by the API server. In production, it points to the deployed API.

If `CORS_ORIGIN` accepts multiple origins, use the format expected by the current API configuration. Do not assume delimiters without checking the implementation.

**Security rules:**
- Never commit real database URLs, session secrets, passwords, or API credentials.
- Do not expose server-only secrets through variables prefixed with `VITE_`; Vite exposes those values to client-side code.
- Use separate credentials for local development and production.
- Configure production environment variables in the relevant hosting provider's dashboard.

## Database and migrations

Happit uses PostgreSQL with Drizzle ORM. The schema includes core entities for users, sessions, catalog habits, each user's adopted habits, and activity records.

The data model supports:
- Canonical catalog habit definitions.
- Per-user habit adoption and management.
- Activity records associated with a user's adopted habits.
- Activity values, duration, units, and source information where applicable.
- Idempotency keys to help protect activity creation from duplicate requests.

Generate a migration after a schema change:

```bash
npm run db:generate -w @happit/api
```

Apply migrations to the configured database:

```bash
npm run db:migrate -w @happit/api
```

Seed the catalog when needed:

```bash
npm run db:seed -w @happit/api
```

Review generated SQL before applying migrations to any shared or production database. Keep migrations committed alongside the schema changes that require them.

## Available scripts

Run commands from the repository root unless noted otherwise.

| Command | Purpose |
|---|---|
| `npm run dev` | Start workspace development servers |
| `npm run build` | Build workspaces that define a build script |
| `npm test` | Run tests in workspaces that define a test script |
| `npm run lint` | Run linting across workspaces |
| `npm run typecheck` | Run TypeScript checks across workspaces |
| `npm run format` | Format files using workspace scripts |
| `npm run db:generate -w @happit/api` | Generate Drizzle migrations |
| `npm run db:migrate -w @happit/api` | Apply database migrations |
| `npm run db:seed -w @happit/api` | Seed catalog data |

The API and web workspace also expose their own scripts. For example:

```bash
npm run test -w @happit/api
npm run test -w @happit/web

npm run lint -w @happit/api
npm run lint -w @happit/web

npm run typecheck -w @happit/api
npm run typecheck -w @happit/web

npm run build -w @happit/api
npm run build -w @happit/web
```

## Testing and quality checks

Happit uses Vitest for automated tests, with Testing Library for frontend behavior and Supertest for API-level tests.

Before submitting changes, run the relevant checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Tests that interact with PostgreSQL require the expected test database to be available and configured. If database-backed tests fail with connection errors, check the test database setup before interpreting the failure as an application regression.

Important behavior to test when changing the product includes:
- Registration, login, session retrieval, and logout.
- Habit catalog listing and adoption.
- Habit ownership and status transitions.
- Activity validation, creation, editing, and deletion.
- Duplicate activity submission protection.
- History and progress calculations.
- Timer persistence and user-visible error states.
- Responsive layout and direct-route refresh behavior.

## Production deployment

The live application is available at [https://happit.online](https://happit.online).

Current deployment topology:

| Component | Provider |
|---|---|
| Web application | Vercel |
| REST API | Render |
| PostgreSQL | Neon |
| Custom domain and DNS | `happit.online` |

### Deployment checklist

1. Push the intended code to the configured Git branch.
2. Confirm the frontend and API builds pass.
3. Configure the production environment variables in the hosting dashboards.
4. Ensure the API allows requests from the production frontend origin.
5. Apply database migrations intentionally and verify the production schema.
6. Confirm the production catalog is seeded.
7. Verify the API health endpoint.
8. Test registration, login, habit adoption, activity logging, history, logout, and login again on the production domain.
9. Check direct navigation and refresh on nested frontend routes.
10. Review hosting logs if an endpoint or session flow fails.

Production credentials must remain in provider-managed environment variables, not in this README or source control.

## Security notes

Happit handles accounts, sessions, and personal activity data. Changes to authentication, authorization, and database access should be reviewed carefully.

- Enforce authentication on private API routes.
- Verify that users can access only their own adopted habits and activity records.
- Validate incoming request data on the server.
- Keep session secrets and database credentials out of source control.
- Configure CORS for trusted frontend origins only.
- Use HTTPS for production traffic.
- Avoid exposing internal errors, stack traces, or database details in API responses.
- Treat production database migrations and seed operations with care.

This section is project guidance, not a claim of a formal security audit.

## Product roadmap

Happit is being built in deliberate phases. The live MVP focuses on the personal habit-tracking loop before introducing social competition or more complex progression systems.

### Current foundation
- Authentication and sessions.
- Curated habit catalog and adoption.
- Habit management.
- Timer-based and manual activity tracking.
- Activity history and progress views.
- Responsive UI and PWA improvements.
- Production deployment on a custom domain.

### Future possibilities

These are **not represented as currently implemented features**:

- More advanced scoring and progression systems.
- Points and XP history.
- Reminders and notifications.
- Clans, leaderboards, seasons, and cooperative challenges.
- Expanded offline activity support and synchronization.
- Additional analytics and product insights.

The roadmap is intentionally conservative: new features should reinforce sustainable consistency without making the core product harder to use.

## Contributing

Happit is an evolving project. If you find a bug or have a suggestion:

1. Check whether an issue already exists.
2. Open an issue with clear reproduction steps or a specific proposal.
3. Keep changes focused and aligned with the product philosophy.
4. Run lint, typecheck, tests, and builds relevant to your changes.
5. Avoid adding features that conflict with the curated catalog model or introduce unnecessary complexity.

For significant changes, discuss the proposed behavior and its impact on the data model before implementing it.

## License

No license has been specified in this repository documentation yet. Unless and until a license is added to the repository, do not assume that the code is available for unrestricted reuse, modification, or redistribution.
