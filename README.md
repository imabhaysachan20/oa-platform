# UBIcode — Online Coding-Test Platform (by UsefulBI)

**UBIcode** is a full-stack, single-compose online coding-test platform engineered for technical hiring and university evaluations. It is built as a v1 with zero Kubernetes or microservice sprawl.

---

## Tech Stack Overview

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, CodeMirror 6 (`@uiw/react-codemirror`, `@codemirror/lang-python`, `@codemirror/lang-cpp`, `@codemirror/lang-java`), TanStack Query, Zustand, Lucide Icons.
- **Backend**: FastAPI (100% async), SQLAlchemy 2.0 async + asyncpg, Alembic migrations, Pydantic v2.
- **Security & Auth**: JWT (python-jose), secure password hashing via bcrypt.
- **Database & Cache**: PostgreSQL 15, Redis 7 (rate limiting via slowapi, Celery broker/result backend).
- **Background Jobs**: Celery + Celery Beat (10-second auto-submit scheduler and score aggregation).
- **Code Execution / Sandbox**: Self-hosted Judge0 CE via Docker (supports Python 3, C++ GCC, Java OpenJDK).
- **Reverse Proxy**: Nginx serving production React static bundle and proxying `/api/` to FastAPI.

---

## Core Product Logic

### 1. Randomized & Locked Question Assignment
- An exam has a pool of coding questions (Easy, Medium, Hard).
- When a candidate clicks **Start Assessment**, the backend randomly assigns **3 questions** (1 Easy + 2 Medium) using:
  ```sql
  ORDER BY random() LIMIT 1 -- Easy
  ORDER BY random() LIMIT 2 -- Medium
  ```
- This assignment is **permanently locked** to the student's `exam_assignment`. Refreshing or resuming the browser will **never reshuffle** the questions.
- `deadline_at` is calculated and enforced on the server (`started_at + duration_minutes`). The client countdown timer is driven by this server timestamp.

### 2. Sandbox Code Execution
- **Run Code**: Submits student code against visible sample test cases only. Returns stdout, stderr, compile errors, execution time, and pass/fail inline.
- **Submit Solution**: Submits student code against ALL test cases (visible + hidden). The latest submission is marked `is_final = True` for final grading.

### 3. Server-Driven Auto-Submit & Scoring
- Celery Beat checks every 10 seconds for exam assignments past `deadline_at`.
- Expired sessions are finalized automatically as `auto_submitted`.
- Scoring formulas:
  ```
  correctness = test_cases_passed / total_test_cases           (0 to 1)
  time_bonus = clamp(1 - (time_taken_sec / allowed_time_sec), 0, 0.2)
  question_score = difficulty_weight * correctness * (1 + time_bonus)
  total_score = (sum of question_scores / max_possible) * 100
  ```
- Difficulty weights are configurable per exam in DB (default: Easy=10, Medium=20, Hard=30).

---

## Default Login Credentials

After seeding, the following accounts are available:

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@usefulbi.com` | `Admin@12345` | Full access to Exam management, Question bank, CSV imports, Live monitoring |
| **Student 1** | `student1@usefulbi.com` | `Student@12345` | Candidate account (Roll: `UBI2026001`) |
| **Student 2** | `student2@usefulbi.com` | `Student@12345` | Candidate account (Roll: `UBI2026002`) |
| **Student 3** | `student3@usefulbi.com` | `Student@12345` | Candidate account (Roll: `UBI2026003`) |

> *Quick-fill buttons are also available directly on the login page.*

---

## Getting Started: Deployment with Docker Compose

### Prerequisites
- Docker (v20+) & Docker Compose (v2+)

### One-Command Launch
In the repository root directory, run:
```bash
docker compose up --build
```

This starts:
1. `postgres` (port `5432`): Application database
2. `redis` (port `6379`): Cache & Celery broker
3. `judge0-db`, `judge0-redis`, `judge0-server`, `judge0-workers`: Isolated code execution sandbox
4. `backend` (port `8000`): Runs Alembic migrations, executes `seed.py`, and starts Uvicorn
5. `celery-worker` & `celery-beat`: Auto-submit background runner
6. `frontend` (port `80`): Nginx serving the React frontend and routing `/api/`

Access the web platform at:
```
http://localhost
```
API documentation (Swagger UI) is available at:
```
http://localhost:8000/api/docs
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

### 2. Celery Worker & Beat (Optional for local testing)
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
Open `http://localhost:5173`. Vite is configured with a proxy to forward all `/api` requests to `http://localhost:8000`.

---

## API Endpoints Reference

### Authentication
- `POST /api/auth/login` — Sign in and receive JWT token
- `GET /api/auth/me` — Current user profile

### Assessments & Student Actions
- `GET /api/exams` — List published exams
- `GET /api/exams/{id}` — Get exam details
- `POST /api/exams/{id}/start` — Idempotently start exam & assign 3 questions
- `GET /api/exams/{id}/my-questions` — Get locked questions, draft code, and server deadline
- `POST /api/exams/{id}/finish` — Manually finish exam and aggregate scores
- `GET /api/exams/{id}/result` — Candidate score breakdown
- `GET /api/exams/{id}/leaderboard` — Real-time ranked leaderboard

### Code Submissions & Judging
- `POST /api/submissions/run` — Run code against visible test cases (Rate-limited)
- `POST /api/submissions/submit` — Submit solution against all test cases
- `GET /api/submissions/{id}/status` — Poll submission status

### Admin Management
- `GET /api/admin/exams` & `POST /api/admin/exams` — List/create assessments
- `PUT /api/admin/exams/{id}` & `DELETE /api/admin/exams/{id}` — Update/delete assessments
- `GET /api/admin/questions` & `POST /api/admin/questions` — Manage question bank
- `POST /api/admin/questions/{id}/test-cases` — Add visible/hidden test cases
- `POST /api/admin/students/import-csv` — Bulk student import via CSV
- `GET /api/admin/students` — Roster of enrolled candidates
- `GET /api/admin/exams/{id}/monitoring` — Real-time candidate monitoring dashboard

---

## CSV Bulk Student Import Format
When importing candidates via the Admin Panel, upload a UTF-8 `.csv` file with the following headers:
```csv
name,email,roll_no,password
John Doe,john.doe@usefulbi.com,UBI2026101,CandidatePass123!
Jane Smith,jane.smith@usefulbi.com,UBI2026102,CandidatePass123!
```

---

## Verification & Unit Testing

To run backend test suites:
```bash
python -m pytest backend/tests/test_scoring.py
```
To run frontend type checking and production build:
```bash
cd frontend
npm run build
```
