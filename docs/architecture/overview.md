# Happit — Architecture Overview

## 1. Purpose and scope

Happit is a habit-building and consistency-tracking web application. This document describes the architecture implemented in the current repository, rather than a hypothetical target architecture.

The project is organized as an npm-workspaces monorepo. Its main runtime components are a React web frontend, an Express REST API, and a PostgreSQL database.

## 2. Technology stack

| Area | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Client routing and UI | React Router, Tailwind-related utilities, Lucide React, Motion |
| Backend | Node.js, Express, TypeScript |
| Request validation | Zod |
| Database | PostgreSQL |
| Database access and migrations | Drizzle ORM, Drizzle Kit |
| Authentication | Server-side sessions and password hashing |
| Testing | Vitest, Testing Library, Supertest |
| Local database | Docker Compose |
| Frontend hosting | Vercel |
| API hosting | Render |
| Production database | Neon PostgreSQL |

## 3. High-level architecture

```text
                   Browser
                      |
                      | HTTPS
                      v
             React + Vite frontend
                      |
                      | JSON / REST (/api/v1)
                      v
                Express API
                      |
          +-----------+-----------+
          |           |           |
          v           v           v
      Feature      Shared      Validation,
      modules      middleware  auth and errors
          |
          | Drizzle ORM
          v
      PostgreSQL
```

The frontend and API are deployed independently. The browser communicates with the API over HTTP(S); frontend code does not connect directly to PostgreSQL. The API is responsible for server-side validation, authorization, business rules, and persistence.

## 4. Frontend responsibilities

The frontend lives in `apps/web` and is built with React, TypeScript, and Vite.

Its responsibilities include:

- Rendering the application interface and handling user interactions.
- Managing client-side interface state and navigation.
- Calling the versioned backend API and presenting returned data.
- Providing loading, empty, and error states.
- Supporting the installable Progressive Web App experience where the browser supports it.

The frontend is not an authority for security-sensitive decisions. The API must validate incoming data and enforce access rules even if the client also performs validation.

## 5. Backend structure

The backend lives in `apps/api`. Express application setup is in `src/app.ts`; the server entry point is `src/server.ts`.

The API is organized by feature modules rather than by a generic controller/repository architecture. Current feature areas include:

- **Authentication** — registration, login, and session-related routes.
- **Account** — account-related operations.
- **Habits** — curated catalog and the user's adopted habits.
- **Activities** — recording and managing activity entries.
- **Progress** — progress and consistency data.

Each feature module contains route and service files as appropriate. Shared concerns are separated into areas such as configuration, middleware, database setup, and common libraries.

### Request flow

```text
HTTP request
     |
     v
Express application and middleware
     |
     v
Feature route
     |
     v
Feature service / business logic
     |
     v
Drizzle ORM query
     |
     v
PostgreSQL
     |
     v
JSON response or centralized error handling
```

This diagram represents the current route-and-service pattern. It does not imply that every feature has a separate controller or repository layer.

## 6. API conventions

The API uses REST-style endpoints with JSON payloads under the `/api/v1` prefix.

Current route groups registered by the Express application include:

| Prefix | Responsibility |
|---|---|
| `/api/v1/health` | Health check |
| `/api/v1/auth` | Authentication |
| `/api/v1/account` | Account operations |
| `/api/v1/habits` | Habit catalog and user habits |
| `/api/v1/activities` | Activity records |
| `/api/v1/progress` | Progress information |

The application configures JSON request parsing, cookie parsing, credential-aware CORS, and centralized error handling. Allowed frontend origins are read from the API environment configuration.

Request validation belongs on the server. API changes should preserve consistent response behavior and avoid returning internal stack traces or database details to clients.

## 7. Authentication and sessions

Happit uses server-side session-based authentication rather than treating client-side UI state as proof of identity.

The frontend sends requests to the API, and the browser's cookie/session behavior is part of the authentication flow. Production configuration must use HTTPS and appropriate secure cookie settings for cross-origin frontend/API deployments.

Security-sensitive routes must enforce authentication and authorization on the server. User-owned habits and activity records must be scoped to the authenticated user. Session secrets and database credentials belong in environment configuration, not source control or frontend-exposed variables.

## 8. Data and persistence

PostgreSQL is the durable data store. Drizzle ORM provides typed database access, while Drizzle Kit and the API's migration scripts manage schema changes.

The current schema includes core entities for:

- Users and sessions.
- Canonical catalog habits.
- Habits adopted by individual users.
- Activity records associated with adopted habits.

The data model distinguishes shared catalog definitions from each user's adopted habits. Activity records can capture values, units, duration, and source information as applicable. Activity creation also uses idempotency protection to help reduce duplicate submissions.

Database schema changes should be made through the schema and migration workflow. Generated SQL should be reviewed before applying it to a shared or production database. Seed operations should only target the intended database.

## 9. Repository structure

```text
happit/
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── config/
│   │       ├── db/
│   │       ├── lib/
│   │       ├── middleware/
│   │       └── modules/
│   │           ├── account/
│   │           ├── activities/
│   │           ├── auth/
│   │           ├── habits/
│   │           └── progress/
│   └── web/
│       ├── public/
│       └── src/
├── docs/
│   └── architecture/
│       └── overview.md
├── docker-compose.yml
├── package.json
├── package-lock.json
└── README.md
```

This is a high-level view; individual files and subdirectories may change as the project evolves.

## 10. Deployment topology

| Component | Provider | Notes |
|---|---|---|
| Frontend | Vercel | React/Vite application and custom domain |
| API | Render | Express REST API |
| Database | Neon | Production PostgreSQL |
| Local database | Docker Compose | Development database exposed on host port `5433` |

The frontend's API base URL is configured through `VITE_API_URL`. The API's CORS configuration must allow the deployed frontend origin. Production secrets are configured in the hosting providers' environment settings.

The production database must be migrated intentionally, and the deployed application should be checked for authentication, habit adoption, activity logging, progress retrieval, and direct-route refresh behavior after a release.

## 11. Local development

At a high level, local development consists of:

1. Installing dependencies from the repository root with `npm ci`.
2. Starting the local PostgreSQL service with Docker Compose when using the local database.
3. Configuring API and frontend environment variables for local URLs.
4. Running the API migration and seed scripts against the intended local database.
5. Starting the workspace development servers with `npm run dev`.

Use `.env.example` and the current environment validation in the code to determine the required variable names. Never copy development credentials into production.

## 12. Architectural principles

- **Clear boundaries:** The frontend calls the API; it does not access PostgreSQL directly.
- **Server-side authority:** The API validates input and enforces authentication, authorization, and business rules.
- **Feature-oriented backend:** Related route and service logic is grouped by domain.
- **Typed persistence:** Drizzle ORM and committed migrations make schema changes explicit.
- **Data ownership:** Users should only be able to access their own private habit and activity data.
- **Incremental complexity:** Keep the architecture aligned with the product's focused MVP rather than adding layers without a concrete need.

## 13. Current limitations and future considerations

This document describes the current implementation, not a guarantee that every possible production-hardening measure has been completed. It is not a formal security audit.

Potential future work may include more detailed operational monitoring, expanded offline activity support and synchronization, and additional product modules. These should be introduced when there is a clear requirement and documented separately from existing behavior.

## 14. Keeping this document current

Update this file when changes materially affect:

- Runtime components or deployment providers.
- API route groups or request flow.
- Authentication and session behavior.
- Database entities or migration practices.
- Repository structure or development workflow.

Prefer documenting implemented behavior. If a proposed architecture is not yet implemented, label it as a future consideration.
