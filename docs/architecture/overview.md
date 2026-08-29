# Happit — Architecture Overview

## 1. Overview

Happit is a habit-building web application built as a monorepo with a React frontend, a Node.js REST API, and PostgreSQL for persistent data.

The system is designed around clear separation between presentation, HTTP handling, business logic, and data persistence.

## 2. High-Level Architecture

```text
Browser
   |
   | HTTP / JSON
   v
React Web Application
   |
   | REST API
   v
Node.js API
   |
   v
Services / Business Logic
   |
   v
Repositories / Data Access
   |
   v
PostgreSQL
```

## 3. Frontend

The frontend is responsible for:

* Rendering the user interface
* Handling user interaction
* Managing client-side UI state
* Calling the backend API
* Displaying data returned by the API

The frontend must not be treated as the authoritative source for business rules.

## 4. Backend

The backend exposes a versioned REST/JSON API.

Backend responsibilities include:

* Request handling
* Input validation
* Authentication and authorization
* Business logic
* Data persistence
* Error handling
* Logging

Business logic should live in service modules rather than route handlers.

## 5. Backend Request Flow

```text
HTTP Request
     |
     v
Route
     |
     v
Controller
     |
     v
Service
     |
     v
Repository
     |
     v
PostgreSQL
```

## 6. Database

PostgreSQL is the primary persistent data store.

Database access is isolated behind repository/data-access modules so that application business logic does not depend directly on database implementation details.

## 7. API Convention

API endpoints will use REST-style resources and JSON payloads.

The API will be versioned under:

```text
/api/v1
```

## 8. Repository Structure

```text
happit/
├── apps/
│   ├── web/
│   └── api/
├── database/
├── docs/
└── .github/
```

## 9. Core Architectural Principle

The frontend communicates with the backend API. The backend owns business logic and coordinates persistence. PostgreSQL is responsible for durable data storage.

No frontend code should communicate directly with PostgreSQL.
