# Arshith Connect — Complete React.js + FastAPI + PostgreSQL Platform

Full-Stack Enterprise Workforce Management, Daily Attendance Tracking, Leave Processing, and Administration Portal built with **React.js 19**, **FastAPI**, **SQLAlchemy 2.0**, **Alembic**, and **PostgreSQL**.

---

## 1. System Overview

**Arshith Connect** provides a fully integrated digital portal for employees and corporate administrators:
- **Employee Portal**:
  - Live punch in / punch out with real-time duration clock.
  - Work mode selection (WFO / WFH).
  - Formal leave applications with date range validation and balance tracking.
  - Upcoming company holiday calendar and countdown.
  - Video meeting directory with direct Join Call links.
  - Management circulars & announcements feed.
  - Personal profile & credentials mapping.
  - Sprint work assignments and daily standup submissions.
- **Admin Portal**:
  - Headline live workforce analytics (Present, Late, WFO, WFH, Pending Leaves, Monthly Holidays).
  - Full employee roster with search, filter, Add Employee modal, and deletion controls.
  - Complete attendance verification logs with CSV export.
  - Leave approval and rejection workflow.
  - Official company holiday manager.
  - Team creation, membership enrollment, and departmental structures.
  - Task delegation, assignment milestones, and completion tracking.
  - Daily standup review with categorical filtering (Operations, Deployment, Design, Dev, HR).
  - New employee registration authorization console.
  - Corporate office timings (regular working hours & custom special-day schedules) with grace period rules.
  - Attendance reports and departmental analytics with CSV export.

---

## 2. Technology Stack

- **Frontend**:
  - Framework: React.js 19 (ESModules, JSX)
  - Tooling: Vite 8
  - Routing: React Router DOM v7
  - Styling: Pure Vanilla Modular CSS (Design tokens with CSS custom properties)
  - Icons: Lucide React
  - HTTP Client: Axios with automatic JWT Bearer token request interceptor
- **Backend**:
  - Framework: Python 3.13 & FastAPI
  - ASGI Server: Uvicorn
  - ORM: SQLAlchemy 2.0
  - Database Driver: Psycopg 3 (`postgresql+psycopg://...`)
  - Database Migrations: Alembic
  - Data Validation: Pydantic v2
  - Authentication: JWT tokens (`pyjwt`) & Secure password hashing (`bcrypt`)
- **Database**:
  - PostgreSQL 18.4 (`arshith_connect_db`)
- **Testing**:
  - Pytest (`pytest`, `httpx`)

---

## 3. Project Directory Structure

```text
ArshithConnect/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   ├── common/
│   │   │   └── employee/
│   │   ├── layouts/
│   │   │   ├── AdminLayout.jsx
│   │   │   └── EmployeeLayout.jsx
│   │   ├── pages/
│   │   │   ├── admin/
│   │   │   ├── auth/
│   │   │   └── employee/
│   │   ├── routes/
│   │   │   └── AppRoutes.jsx
│   │   ├── services/
│   │   │   ├── announcementService.js
│   │   │   ├── api.js
│   │   │   ├── assignmentService.js
│   │   │   ├── attendanceService.js
│   │   │   ├── authService.js
│   │   │   ├── dashboardService.js
│   │   │   ├── employeeService.js
│   │   │   ├── holidayService.js
│   │   │   ├── leaveService.js
│   │   │   ├── meetingService.js
│   │   │   ├── officeTimingService.js
│   │   │   ├── registrationRequestService.js
│   │   │   ├── reportService.js
│   │   │   ├── teamService.js
│   │   │   └── workUpdateService.js
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── alembic/
│   │   ├── versions/
│   │   │   └── 2c3b9f4937cd_initial_schema.py
│   │   └── env.py
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── security.py
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   └── session.py
│   │   ├── dependencies/
│   │   │   └── auth.py
│   │   ├── models/
│   │   │   ├── announcement.py
│   │   │   ├── attendance.py
│   │   │   ├── employee.py
│   │   │   ├── holiday.py
│   │   │   ├── leave.py
│   │   │   ├── meeting.py
│   │   │   ├── office_timing.py
│   │   │   ├── registration_request.py
│   │   │   ├── team.py
│   │   │   ├── user.py
│   │   │   └── work.py
│   │   ├── routers/
│   │   │   ├── announcements.py
│   │   │   ├── assignments.py
│   │   │   ├── attendance.py
│   │   │   ├── auth.py
│   │   │   ├── dashboard.py
│   │   │   ├── employees.py
│   │   │   ├── holidays.py
│   │   │   ├── leaves.py
│   │   │   ├── meetings.py
│   │   │   ├── office_timings.py
│   │   │   ├── registration_requests.py
│   │   │   ├── reports.py
│   │   │   ├── teams.py
│   │   │   └── work_updates.py
│   │   ├── schemas/
│   │   ├── services/
│   │   │   └── init_db.py
│   │   └── main.py
│   ├── tests/
│   │   └── test_api.py
│   ├── .env
│   ├── .env.example
│   ├── alembic.ini
│   ├── pytest.ini
│   └── requirements.txt
│
└── README.md
```

---

## 4. PostgreSQL Database Setup

1. **Database Name**: `arshith_connect_db`
2. **Local PostgreSQL Connection URL**:
   ```text
   postgresql+psycopg://postgres:Ameen9080@localhost:5432/arshith_connect_db
   ```
3. **Database Tables**:
   - `users`: Core authentication identity, role (`admin` | `employee`), hashed passwords.
   - `employees`: Roster details, code, department, designation, joining date, status.
   - `attendance`: Attendance date, check-in, check-out, work mode (`WFO` | `WFH`), status (`Present` | `Late` | `Absent`).
   - `leaves`: Leave type, date boundaries, duration, reason, status (`Pending` | `Approved` | `Rejected`), reviewer.
   - `holidays`: Annual corporate observed calendar, holiday type, date, description.
   - `meetings`: Title, date, time, duration, organizer, platform, meeting link.
   - `announcements`: Broadcast circulars, author, priority (`High` | `Normal`), message body.
   - `teams`: Department teams, descriptions, team leaders.
   - `team_members`: Staff assignments to teams.
   - `work_assignments`: Task delegation, priority, deadlines, progress tracking (0-100%).
   - `work_updates`: Daily standup submissions, completed tasks, impediments/blockers.
   - `registration_requests`: Pending employee account applications.
   - `office_timings`: Regular hours and special occasion schedules with late grace periods.

---

## 5. Seed Credentials

The database is seeded on startup with default test accounts:

### Administrator Account
- **Email**: `admin@arshith.com`
- **Password**: `AdminPassword@123`
- **Portal URL**: `http://localhost:5173/admin/login`

### Employee Account
- **Email**: `employee@arshith.com`
- **Password**: `Employee@123`
- **Portal URL**: `http://localhost:5173/login`

---

## 6. Windows / VS Code Startup Instructions

Run the application using two separate PowerShell terminal tabs in VS Code.

### Terminal 1: FastAPI Backend

```powershell
# Navigate to backend directory
cd c:\Users\skame\OneDrive\Desktop\ArshithConnect\backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# (Optional) Run database migrations
alembic upgrade head

# Start FastAPI development server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Base URL: `http://127.0.0.1:8000`
- Interactive Swagger OpenAPI Documentation: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

### Terminal 2: React.js Frontend

```powershell
# Navigate to frontend directory
cd c:\Users\skame\OneDrive\Desktop\ArshithConnect\frontend

# Install dependencies if not already installed
npm install

# Start Vite development server
npm run dev
```
- Frontend application URL: `http://localhost:5173`

---

## 7. Running Backend Tests

In the backend virtual environment:

```powershell
cd c:\Users\skame\OneDrive\Desktop\ArshithConnect\backend
.\venv\Scripts\Activate.ps1
pytest -v
```

The test suite validates:
1. Health check & database readiness probe.
2. Administrator login & JWT generation.
3. Employee login & JWT generation.
4. Rejection of invalid credentials.
5. Admin-only route protection against standard employee tokens.
6. Employee lifecycle (creation, duplicate prevention, retrieval).
7. Attendance check-in & check-out lifecycle.
8. Leave request submission & administrator approval.
9. Admin dashboard metrics calculation.

---

## 8. Frontend Production Build Check

```powershell
cd c:\Users\skame\OneDrive\Desktop\ArshithConnect\frontend
npm run build
```
Creates verified, production-minified bundle in `frontend/dist/`.
