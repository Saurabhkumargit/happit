<div align="center">

# Happit

### Build consistency. One habit at a time.

A habit-building app focused on sustainable routines, real activity tracking, and visible progress.

[**Open Happit →**](https://happit.online) · [Report a bug](https://github.com/Saurabhkumargit/happit/issues)

</div>

---

## About

Happit helps you build routines by recording what you actually do—not just ticking a checkbox. Choose habits from a curated catalog, log activities, and review your consistency over time.

**Product principles:** consistency over perfection, progress over punishment, sustainable habits over aggressive streak chasing, and simplicity over feature bloat.

## Features

- **Accounts:** registration, login, session-based authentication, and logout.
- **Habit management:** browse the catalog, adopt habits, reorder them, and manage their status.
- **Activity tracking:** use the timer or log activities manually; review, edit, or delete records through supported workflows.
- **Progress:** view activity history and progress visualizations.
- **Installable PWA:** add Happit to a supported device's home screen for an app-like experience.
- **Responsive dark UI:** minimal surfaces with a restrained purple accent.

### Install on Android

1. Open [happit.online](https://happit.online) in Chrome.
2. Open the three-dot menu.
3. Select **Install app** or **Add to Home screen**.
4. Follow the prompt, then launch Happit from your home screen.

Happit is a Progressive Web App, not a native Android app. Some app-shell resources may be cached, but logging in, loading fresh data, and saving activities require a network connection. Full offline activity syncing is not currently supported.

## Technology stack

| Area | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| UI and routing | React Router, Tailwind CSS, Lucide React, Motion |
| Backend | Node.js, Express, TypeScript |
| Validation | Zod |
| Database | PostgreSQL, Drizzle ORM, Drizzle Kit |
| Authentication | Server-side sessions, password hashing |
| Testing | Vitest, Testing Library, Supertest |
| Local database | Docker Compose |
| Deployment | Vercel (web), Render (API), Neon (PostgreSQL) |

## Architecture

Happit is an npm-workspaces monorepo. The web app communicates with a versioned REST API; the API validates requests, runs feature-module service logic, and accesses PostgreSQL through Drizzle ORM.

```text
Browser / Installable PWA
          |
          | HTTPS / JSON
          v
React + Vite frontend
          |
          | REST API (/api/v1)
          v
Express + TypeScript API
          |
          v
Feature modules and services
          |
          v
Drizzle ORM
          |
          v
PostgreSQL
```

See [`docs/architecture/overview.md`](docs/architecture/overview.md) for the detailed architecture and request flow.

## Repository structure

```text
happit/
├── apps/
│   ├── api/       # Express API, database schema, migrations, and tests
│   └── web/       # React + Vite frontend
├── docs/          # Project documentation
├── docker-compose.yml
├── package.json   # npm workspaces and root scripts
└── README.md
```

## Getting started

### Prerequisites

- Node.js and npm
- Docker Desktop (for the local PostgreSQL database)

### 1. Clone and install

```bash
git clone https://github.com/Saurabhkumargit/happit.git
cd happit
npm ci
```

### 2. Start PostgreSQL

```bash
docker compose up -d postgres
```

The development database is exposed on port `5433`. The default Compose credentials are for local development only—never reuse them in production.

### 3. Configure environment variables

Create the environment files expected by the API and web workspaces. At minimum, configure the API database connection and session secret, allowed frontend origin(s), and the web app's API URL. For example, the local database URL may be:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/happit
```

Use a unique local session secret. Check the current environment validation and example files for all required variables. Never commit real `.env` files or credentials.

### 4. Migrate, seed, and run

```bash
npm run db:migrate -w @happit/api
npm run db:seed -w @happit/api
npm run dev
```

Run the seed command only against the intended database. The root development script starts the workspaces that define a development command; check the terminal for their local URLs.

## Useful commands

Run these from the repository root:

| Command | Purpose |
|---|---|
| `npm run dev` | Start development servers |
| `npm run build` | Build workspaces |
| `npm test` | Run workspace tests |
| `npm run lint` | Lint workspaces |
| `npm run typecheck` | Run TypeScript checks |
| `npm run format` | Format files |
| `npm run db:generate -w @happit/api` | Generate Drizzle migrations |
| `npm run db:migrate -w @happit/api` | Apply migrations |
| `npm run db:seed -w @happit/api` | Seed the habit catalog |

Database-backed tests need the configured test database to be available.

## Deployment

- **Web:** [Vercel](https://vercel.com/)
- **API:** [Render](https://render.com/)
- **Database:** [Neon](https://neon.tech/)
- **Live app:** [happit.online](https://happit.online)

Configure production environment variables in the hosting providers. Confirm CORS allows the production frontend origin, apply migrations deliberately, and test authentication and core habit/activity flows after deployment. Never store production secrets in source control.

## Roadmap

The current focus is the core personal habit-tracking experience. Potential future work includes richer progression systems, points and XP history, reminders, clans, leaderboards, seasons, challenges, expanded offline synchronization, and additional analytics. These are future possibilities, not claims about current functionality.

## Contributing

Bug reports and focused suggestions are welcome through [GitHub Issues](https://github.com/Saurabhkumargit/happit/issues). Before submitting a change, run the relevant lint, typecheck, test, and build commands.

## License

No license has been specified. Until one is added, do not assume the code is available for unrestricted reuse, modification, or redistribution.
