<div align="center">

# ⚡ UBIcode

### Online Coding-Test Platform — by UsefulBI

**A full-stack, single-compose platform for technical hiring and university evaluations.**
Built as a lean v1 — no Kubernetes, no microservice sprawl, no over-engineering.

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-async-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-lightgrey)

</div>

---

## Table of Contents

1. [Overview](#overview)
2. [Why UBIcode](#why-ubicode)
3. [Tech Stack](#tech-stack)
4. [System Architecture](#system-architecture)
5. [Database Schema (ERD)](#database-schema-erd)
6. [Core Product Logic](#core-product-logic)
   - [Randomized & Locked Question Assignment](#1-randomized--locked-question-assignment)
   - [Sandbox Code Execution](#2-sandbox-code-execution)
   - [Server-Driven Auto-Submit & Scoring](#3-server-driven-auto-submit--scoring)
7. [End-to-End Flow (Sequence Diagrams)](#end-to-end-flow-sequence-diagrams)
8. [Scoring Formula — Worked Example](#scoring-formula--worked-example)
9. [Default Login Credentials](#default-login-credentials)
10. [Project Structure](#project-structure)
11. [Environment Variables](#environment-variables)
12. [Getting Started — Docker Compose](#getting-started--docker-compose)
13. [Local Development (Without Docker Compose)](#local-development-without-docker-compose)
14. [API Endpoints Reference](#api-endpoints-reference)
15. [CSV Bulk Student Import Format](#csv-bulk-student-import-format)
16. [Verification & Unit Testing](#verification--unit-testing)
17. [Scalability Notes](#scalability-notes)
18. [Security Notes](#security-notes)
19. [Roadmap](#roadmap)
20. [Troubleshooting](#troubleshooting)

---

## Overview

**UBIcode** lets an admin create a timed coding assessment from a pool of questions, have each candidate randomly receive a **locked set of 3 questions (1 Easy + 2 Medium)**, write and run code in-browser against sandboxed test cases, and get an automatically computed, difficulty- and speed-weighted score — all without any code ever executing on the application servers themselves.

It is designed to comfortably support **~1,000 concurrent candidates** on a single docker-compose deployment (no Kubernetes required for v1).

## Why UBIcode

| Problem | How UBIcode solves it |
|---|---|
| Candidates copying each other's questions | Each candidate gets a randomized, permanently-locked draw of 3 questions from a shared pool |
| Client-side timers can be tampered with | The exam deadline (`deadline_at`) is computed and enforced **server-side**; the UI timer just displays it |
| Running untrusted code is dangerous | All execution is offloaded to a self-hosted **Judge0** sandbox — FastAPI never runs student code itself |
| Candidates losing progress on refresh | Assignment + submissions are persisted; resuming an exam restores exact state |
| Fair scoring across difficulty levels | Score = difficulty weight × correctness × (1 + speed bonus), fully configurable per exam |

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend framework | React 19 + TypeScript + Vite | Fast dev server, typed components |
| Styling | TailwindCSS | Utility-first, minimal custom CSS |
| Code editor | CodeMirror 6 (`@uiw/react-codemirror`, `@codemirror/lang-python`, `@codemirror/lang-cpp`, `@codemirror/lang-java`) | In-browser editor with per-language syntax highlighting |
| Data fetching | TanStack Query | Caching, retries, polling for submission status |
| Client state | Zustand | Lightweight global state (auth, exam session) |
| Icons | Lucide Icons | Consistent, minimal icon set |
| Backend framework | FastAPI (100% async) | High-throughput async API layer |
| ORM | SQLAlchemy 2.0 (async) + asyncpg | Non-blocking DB access |
| Migrations | Alembic | Versioned schema changes |
| Validation | Pydantic v2 | Request/response schemas |
| Auth | JWT (`python-jose`) + `bcrypt` (via `passlib`) | Stateless authentication, secure password storage |
| Database | PostgreSQL 15 | Source of truth: users, exams, submissions, scores |
| Cache / rate limiting | Redis 7 (`slowapi`) | Prevents "Run" button abuse, general caching |
| Background jobs | Celery + Celery Beat | Auto-submit on timeout, async score aggregation |
| Code execution | Judge0 CE (self-hosted, Dockerized) | Isolated compile + run for Python 3, C++ (GCC), Java (OpenJDK) |
| Reverse proxy | Nginx | Serves React static build, proxies `/api/` to FastAPI |
| Orchestration | Docker Compose | Single-command local & production deploy (no Kubernetes in v1) |
| Load testing | Locust | Validates ~1,000 concurrent user capacity before go-live |

---

## System Architecture

```mermaid
flowchart LR
    subgraph Client
        A[React + TypeScript SPA<br/>CodeMirror Editor]
    end

    subgraph Edge
        B[Nginx<br/>Reverse Proxy + Static Files]
    end

    subgraph App["FastAPI Backend (async, N replicas)"]
        C1[Auth & Exam Service]
        C2[Submission Service]
        C3[Admin Service]
    end

    subgraph Data
        D[(PostgreSQL 15<br/>Users · Exams · Submissions · Scores)]
        E[(Redis 7<br/>Cache · Rate Limit · Celery Broker)]
    end

    subgraph Judging["Judge0 Sandbox"]
        F[Judge0 API]
        G[Isolated Docker Workers<br/>Python · C++ · Java]
        H[(Judge0 internal DB/Redis)]
    end

    subgraph Jobs["Background Processing"]
        I[Celery Workers]
        J[Celery Beat<br/>10s auto-submit scan]
    end

    A -->|HTTPS + JWT| B
    B --> C1
    B --> C2
    B --> C3
    C1 --> D
    C2 --> D
    C3 --> D
    C1 --> E
    C2 --> E
    C2 -->|submit code via REST| F
    F --> G
    F --> H
    I --> D
    I --> E
    J --> I
```

**Key design principle:** FastAPI application servers **never execute student-submitted code**. They only make outbound HTTP calls to Judge0, which runs each submission in an isolated sandbox with CPU/memory/time limits. This keeps the API tier safe and lets execution capacity scale independently of request traffic.

---

## Database Schema (ERD)

```mermaid
erDiagram
    USERS ||--o{ EXAM_ASSIGNMENTS : "attempts"
    USERS ||--o{ QUESTIONS : "authors"
    USERS ||--o{ EXAMS : "creates"

    EXAMS ||--o{ EXAM_QUESTION_POOL : "contains"
    EXAMS ||--o{ EXAM_ASSIGNMENTS : "sat by"

    QUESTIONS ||--o{ TEST_CASES : "has"
    QUESTIONS ||--o{ EXAM_QUESTION_POOL : "belongs to"
    QUESTIONS ||--o{ ASSIGNED_QUESTIONS : "assigned as"
    QUESTIONS ||--o{ SUBMISSIONS : "solved via"

    EXAM_ASSIGNMENTS ||--o{ ASSIGNED_QUESTIONS : "locks in"
    EXAM_ASSIGNMENTS ||--o{ SUBMISSIONS : "receives"
    EXAM_ASSIGNMENTS ||--o{ QUESTION_SCORES : "scored as"
    EXAM_ASSIGNMENTS ||--|| EXAM_RESULTS : "aggregates to"

    USERS {
        uuid id PK
        text name
        text email UK
        text roll_no UK
        text password_hash
        text role "student|admin"
        timestamptz created_at
    }

    QUESTIONS {
        uuid id PK
        text title
        text description
        text difficulty "easy|medium|hard"
        int time_limit_ms
        int memory_limit_kb
        text sample_input
        text sample_output
        uuid created_by FK
    }

    TEST_CASES {
        uuid id PK
        uuid question_id FK
        text input
        text expected_output
        bool is_hidden
        int weight
    }

    EXAMS {
        uuid id PK
        text title
        int duration_minutes
        timestamptz start_time
        timestamptz end_time
        float easy_weight
        float medium_weight
        float hard_weight
        uuid created_by FK
    }

    EXAM_QUESTION_POOL {
        uuid id PK
        uuid exam_id FK
        uuid question_id FK
        text difficulty
    }

    EXAM_ASSIGNMENTS {
        uuid id PK
        uuid exam_id FK
        uuid user_id FK
        timestamptz started_at
        timestamptz deadline_at
        timestamptz submitted_at
        text status "not_started|in_progress|submitted|auto_submitted"
    }

    ASSIGNED_QUESTIONS {
        uuid id PK
        uuid assignment_id FK
        uuid question_id FK
        text difficulty
        int order_index
    }

    SUBMISSIONS {
        uuid id PK
        uuid assignment_id FK
        uuid question_id FK
        text code
        text language
        text judge0_token
        text status
        int test_cases_passed
        int total_test_cases
        float exec_time_ms
        bool is_final
        timestamptz submitted_at
    }

    QUESTION_SCORES {
        uuid id PK
        uuid assignment_id FK
        uuid question_id FK
        float correctness
        int time_taken_sec
        float difficulty_weight
        float time_bonus
        float final_score
    }

    EXAM_RESULTS {
        uuid id PK
        uuid assignment_id FK "one result per assignment"
        float total_score
        int rank
    }
```

---

## Core Product Logic

### 1. Randomized & Locked Question Assignment

- An exam has a pool of coding questions tagged **Easy**, **Medium**, or **Hard**.
- When a candidate clicks **Start Assessment**, the backend randomly assigns **3 questions** (1 Easy + 2 Medium):
  ```sql
  -- Easy
  SELECT question_id FROM exam_question_pool
  WHERE exam_id = :exam_id AND difficulty = 'easy'
  ORDER BY random() LIMIT 1;

  -- Medium
  SELECT question_id FROM exam_question_pool
  WHERE exam_id = :exam_id AND difficulty = 'medium'
  ORDER BY random() LIMIT 2;
  ```
- This assignment is **permanently locked** into `exam_assignments` / `assigned_questions`. Refreshing or resuming the browser **never reshuffles** the questions — the same three are re-fetched from the DB.
- `deadline_at = started_at + duration_minutes` is computed **once, server-side**, on first start. The client countdown is purely a display of this value, polled/recomputed from the server — it cannot be extended by tampering with the browser.

### 2. Sandbox Code Execution

| Action | Test cases used | Behavior |
|---|---|---|
| **Run Code** | Visible sample cases only | Synchronous call to Judge0, returns stdout/stderr/compile errors/exec time immediately for quick iteration |
| **Submit Solution** | All cases (visible + hidden) | Submitted to Judge0, result stored as a `submissions` row; the **latest submission per question** is marked `is_final = true` and used for grading |

Supported languages in v1: **Python 3**, **C++ (GCC)**, **Java (OpenJDK)** — mapped to their respective Judge0 `language_id` values.

### 3. Server-Driven Auto-Submit & Scoring

- **Celery Beat** runs a scan every **10 seconds** for any `exam_assignments` row past its `deadline_at` that is still `in_progress`.
- Expired assignments are automatically finalized as `auto_submitted`, scoring whatever was last submitted (or nothing, if the candidate never submitted a question).
- Scoring formula, computed per question then aggregated:

  ```
  correctness   = test_cases_passed / total_test_cases                        (range: 0–1)
  time_bonus    = clamp(1 - (time_taken_sec / allowed_time_sec), 0, 0.2)       (up to +20% for speed)
  question_score = difficulty_weight × correctness × (1 + time_bonus)
  total_score    = (Σ question_score / max_possible_score) × 100
  ```

- Difficulty weights are **configurable per exam** in the database (defaults: Easy = 10, Medium = 20, Hard = 30) — no code changes needed to retune scoring.

---

## End-to-End Flow (Sequence Diagrams)

### Starting an Exam & Getting Locked Questions

```mermaid
sequenceDiagram
    participant S as Student (React)
    participant API as FastAPI
    participant DB as PostgreSQL

    S->>API: POST /api/exams/{id}/start (JWT)
    API->>DB: Check exam window + existing assignment
    alt No assignment yet
        API->>DB: INSERT exam_assignments (started_at, deadline_at)
        API->>DB: Randomly SELECT 1 easy + 2 medium from pool
        API->>DB: INSERT assigned_questions (locked)
    else Assignment already exists
        API->>DB: Fetch existing assigned_questions
    end
    API-->>S: 3 locked questions + deadline_at
    S->>API: GET /api/exams/{id}/my-questions (on refresh)
    API->>DB: Fetch assignment + assigned_questions + draft code
    API-->>S: Restored exam state
```

### Run / Submit Code via Judge0

```mermaid
sequenceDiagram
    participant S as Student (React)
    participant API as FastAPI
    participant R as Redis (rate limit)
    participant J as Judge0
    participant DB as PostgreSQL

    S->>API: POST /api/submissions/run {code, language}
    API->>R: Check rate limit for user
    R-->>API: OK
    API->>J: Submit against visible test cases
    J-->>API: stdout / stderr / exec_time
    API-->>S: Inline result (not persisted as final)

    S->>API: POST /api/submissions/submit {code, language}
    API->>J: Submit against ALL test cases
    J-->>API: Verdict per test case
    API->>DB: INSERT submissions (is_final = true, supersedes prior)
    API->>DB: Compute + UPSERT question_scores
    API-->>S: Submission status + score
```

### Auto-Submit on Timeout

```mermaid
sequenceDiagram
    participant Beat as Celery Beat
    participant Worker as Celery Worker
    participant DB as PostgreSQL

    loop Every 10 seconds
        Beat->>Worker: Scan for expired assignments
        Worker->>DB: SELECT WHERE deadline_at < now() AND status = 'in_progress'
        loop For each expired assignment
            Worker->>DB: Mark status = 'auto_submitted'
            Worker->>DB: Score last submission per question
            Worker->>DB: UPSERT exam_results (total_score, rank)
        end
    end
```

---

## Scoring Formula — Worked Example

Assume default weights (Easy = 10, Medium = 20) and a candidate who:

| Question | Difficulty | Test cases passed | Time taken | Allowed time |
|---|---|---|---|---|
| Q1 | Easy | 4 / 5 | 6 min | 15 min |
| Q2 | Medium | 8 / 8 | 12 min | 20 min |
| Q3 | Medium | 3 / 8 | 19 min | 20 min |

```
Q1: correctness = 4/5 = 0.8
    time_bonus  = clamp(1 - 6/15, 0, 0.2) = clamp(0.6, 0, 0.2) = 0.2
    score       = 10 × 0.8 × 1.2 = 9.6

Q2: correctness = 8/8 = 1.0
    time_bonus  = clamp(1 - 12/20, 0, 0.2) = clamp(0.4, 0, 0.2) = 0.2
    score       = 20 × 1.0 × 1.2 = 24.0

Q3: correctness = 3/8 = 0.375
    time_bonus  = clamp(1 - 19/20, 0, 0.2) = clamp(0.05, 0, 0.2) = 0.05
    score       = 20 × 0.375 × 1.05 = 7.875

max_possible = 10 + 20 + 20 = 50
total_score  = (9.6 + 24.0 + 7.875) / 50 × 100 = 82.95 / 100
```

---

## Default Login Credentials

After running the seed script, the following accounts are available:

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@usefulbi.com` | `Admin@12345` | Full access to exam management, question bank, CSV imports, live monitoring |
| **Student 1** | `student1@usefulbi.com` | `Student@12345` | Candidate account (Roll: `UBI2026001`) |
| **Student 2** | `student2@usefulbi.com` | `Student@12345` | Candidate account (Roll: `UBI2026002`) |
| **Student 3** | `student3@usefulbi.com` | `Student@12345` | Candidate account (Roll: `UBI2026003`) |

> Quick-fill buttons are also available directly on the login page for local testing.

> ⚠️ **Change all default credentials before any real deployment.** These are for local dev and demo purposes only.

---

## Project Structure

```
ubicode/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app entrypoint
│   │   ├── api/                   # Route modules (auth, exams, submissions, admin)
│   │   ├── models/                # SQLAlchemy models
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── services/               # Business logic (assignment, scoring, judge0 client)
│   │   ├── tasks/                  # Celery app + auto-submit tasks
│   │   └── core/                   # Config, security, DB session
│   ├── alembic/                    # Migration scripts
│   ├── tests/                      # Pytest suite
│   ├── seed.py                     # Seed script (admin + sample data)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/                  # Login, ExamStart, Workspace, AdminDashboard, etc.
│   │   ├── components/             # Button, Card, Modal, Timer, CodeEditor
│   │   ├── hooks/                  # TanStack Query hooks
│   │   ├── store/                  # Zustand stores
│   │   └── api/                    # Typed API client
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── judge0/                         # Judge0 config overrides (if any)
├── nginx/
│   └── nginx.conf
├── docker-compose.yml
└── README.md
```

---

## Environment Variables

| Variable | Used by | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | backend | Async Postgres connection string | `postgresql+asyncpg://ubicode:ubicode@postgres:5432/ubicode` |
| `REDIS_URL` | backend, celery | Redis connection string | `redis://redis:6379/0` |
| `JWT_SECRET_KEY` | backend | Secret for signing JWTs | `change-me-in-production` |
| `JWT_EXPIRE_MINUTES` | backend | Token expiry | `120` |
| `JUDGE0_API_URL` | backend | Judge0 base URL | `http://judge0-server:2358` |
| `CORS_ORIGINS` | backend | Allowed frontend origins | `http://localhost` |
| `VITE_API_BASE_URL` | frontend (build-time) | API base path | `/api` |
| `CELERY_BROKER_URL` | celery | Same as `REDIS_URL` typically | `redis://redis:6379/0` |
| `AUTO_SUBMIT_SCAN_SECONDS` | celery beat | Auto-submit polling interval | `10` |

> Copy `.env.example` → `.env` at the repo root and in `backend/` before running docker-compose.

---

## Getting Started — Docker Compose

### Prerequisites
- Docker (v20+) & Docker Compose (v2+)

### One-Command Launch
From the repository root:
```bash
docker compose up --build
```

This starts:

1. **`postgres`** (port `5432`) — Application database
2. **`redis`** (port `6379`) — Cache & Celery broker
3. **`judge0-db`, `judge0-redis`, `judge0-server`, `judge0-workers`** — Isolated code execution sandbox
4. **`backend`** (port `8000`) — Runs Alembic migrations, executes `seed.py`, starts Uvicorn
5. **`celery-worker`** & **`celery-beat`** — Auto-submit background runner
6. **`frontend`** (port `80`) — Nginx serving the React build and routing `/api/`

Access the platform at:
```
http://localhost
```
API documentation (Swagger UI):
```
http://localhost:8000/api/docs
```

### Service Startup Order

```mermaid
flowchart TD
    A[postgres] --> D[backend: alembic upgrade head]
    B[redis] --> D
    D --> E[backend: seed.py]
    E --> F[backend: uvicorn starts]
    B --> G[celery-worker]
    B --> H[celery-beat]
    A --> G
    I[judge0-db] --> J[judge0-server]
    K[judge0-redis] --> J
    J --> L[judge0-workers]
    F --> M[frontend / nginx]
    L --> M
```

---

## Local Development (Without Docker Compose)

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Run seed script
python seed.py

# Start API server
uvicorn backend.app.main:app --reload --port 8000
```

### 2. Celery Worker & Beat (optional for local testing)
```bash
celery -A backend.app.tasks.celery_app.celery_app worker --loglevel=info
celery -A backend.app.tasks.celery_app.celery_app beat --loglevel=info
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`. Vite is configured with a proxy forwarding all `/api` requests to `http://localhost:8000`.

> Note: Judge0 must still be running (locally via its own docker-compose, or pointed at a hosted instance) for Run/Submit to work in local dev mode.

---

## API Endpoints Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Sign in, receive JWT token |
| `GET` | `/api/auth/me` | Current authenticated user's profile |

### Assessments & Student Actions
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/exams` | List published exams |
| `GET` | `/api/exams/{id}` | Get exam details |
| `POST` | `/api/exams/{id}/start` | Idempotently start exam & assign 3 questions |
| `GET` | `/api/exams/{id}/my-questions` | Get locked questions, draft code, server deadline |
| `POST` | `/api/exams/{id}/finish` | Manually finish exam and aggregate scores |
| `GET` | `/api/exams/{id}/result` | Candidate's score breakdown |
| `GET` | `/api/exams/{id}/leaderboard` | Real-time ranked leaderboard |

### Code Submissions & Judging
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/submissions/run` | Run code against visible test cases (rate-limited) |
| `POST` | `/api/submissions/submit` | Submit solution against all test cases |
| `GET` | `/api/submissions/{id}/status` | Poll submission status |

### Admin Management
| Method | Endpoint | Description |
|---|---|---|
| `GET` / `POST` | `/api/admin/exams` | List / create assessments |
| `PUT` / `DELETE` | `/api/admin/exams/{id}` | Update / delete an assessment |
| `GET` / `POST` | `/api/admin/questions` | Manage question bank |
| `POST` | `/api/admin/questions/{id}/test-cases` | Add visible/hidden test cases |
| `POST` | `/api/admin/students/import-csv` | Bulk student import via CSV |
| `GET` | `/api/admin/students` | Roster of enrolled candidates |
| `GET` | `/api/admin/exams/{id}/monitoring` | Real-time candidate monitoring dashboard |

---

## CSV Bulk Student Import Format

Upload a UTF-8 `.csv` file with the following headers via the Admin Panel:

```csv
name,email,roll_no,password
John Doe,john.doe@usefulbi.com,UBI2026101,CandidatePass123!
Jane Smith,jane.smith@usefulbi.com,UBI2026102,CandidatePass123!
```

---

## Verification & Unit Testing

Run backend test suites:
```bash
python -m pytest backend/tests/test_scoring.py
```

Run frontend type checking and production build:
```bash
cd frontend
npm run build
```

Recommended additions as the suite grows: `pytest` coverage for assignment-locking logic and auto-submit edge cases, and a Locust script (see below) for load testing before any real exam.

---

## Scalability Notes

- FastAPI runs fully async (`asyncpg`, async SQLAlchemy sessions) — no blocking calls in the request path.
- Student code is **never executed in-process**; Judge0 owns the queueing and isolation, so a backlog there doesn't take down the API tier.
- Redis-backed rate limiting on `/api/submissions/run` protects against a candidate spamming "Run."
- Connection pooling is configured on the async engine; add PgBouncer in front of Postgres if you scale beyond a few backend replicas.
- Designed to comfortably handle **~1,000 concurrent candidates** on a single well-sized VM via docker-compose — no Kubernetes needed for v1.
- Load test with **Locust** simulating login → start → run → submit before any real exam window.

---

## Security Notes

- Passwords hashed with `bcrypt` via `passlib`; JWTs signed with a server-side secret (`JWT_SECRET_KEY`) — rotate this before production use.
- Exam deadlines are enforced server-side; the client timer is a display only, not a source of truth.
- All code execution is sandboxed in Judge0's isolated Docker workers, with configurable CPU/memory/time limits per submission.
- CORS is restricted to configured frontend origins (`CORS_ORIGINS`).
- Change all default seed credentials before any non-local deployment.

---

## Roadmap

- [ ] Plagiarism / code-similarity detection across submissions
- [ ] Live exam monitoring with tab-switch / focus-loss detection
- [ ] Additional language support beyond Python / C++ / Java
- [ ] Per-question analytics (pass rate, average time, common failure patterns)
- [ ] Horizontal autoscaling story if usage grows well beyond ~1,000 concurrent users
- [ ] Optional webcam/browser lockdown proctoring integration

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `docker compose up` fails on `judge0-server` | Judge0's own Postgres/Redis not yet healthy | Re-run; ensure `depends_on` + healthchecks are set in `docker-compose.yml` |
| "Run" button hangs | Judge0 workers not running or queue backed up | Check `docker compose logs judge0-workers` |
| Timer resets after refresh | `deadline_at` not being persisted, or a client-only timer bug | Confirm `/api/exams/{id}/my-questions` returns the same `deadline_at` on every call |
| 429 on `/api/submissions/run` | Rate limit triggered | Expected behavior; backoff and retry |
| Alembic migration fails on fresh DB | Migration order issue | Run `alembic upgrade head` again after confirming Postgres is reachable |

---

<div align="center">

Built with ⚡ by **UsefulBI**

</div>
