# Arshith Connect — FastAPI + PostgreSQL Backend

High-performance REST API backend for the Arshith Connect Workforce Portal.

## 1. Stack
- **Framework**: FastAPI (Python 3.13)
- **Database**: PostgreSQL (`arshith_connect_db`)
- **ORM**: SQLAlchemy 2.0
- **Migrations**: Alembic
- **Validation**: Pydantic v2
- **Driver**: Psycopg 3 (`postgresql+psycopg://`)
- **Authentication**: JWT (`pyjwt`) + `bcrypt`

## 2. Setup & Virtual Environment (Windows)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 3. Database Configuration
Ensure PostgreSQL is running and update `.env`:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=arshith_connect_db
DATABASE_URL=postgresql+psycopg://postgres:your_password@localhost:5432/arshith_connect_db
JWT_SECRET=super_secret_jwt_key_arshith_connect_secure_2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

## 4. Run Migrations & Startup
```powershell
alembic upgrade head
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## 5. API Documentation
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
- Health Check: `http://127.0.0.1:8000/health`

## 6. Seed Credentials
- **Admin**: `admin@arshith.com` / `AdminPassword@123`
- **Employee**: `employee@arshith.com` / `Employee@123`

## 7. Run Test Suite
```powershell
pytest -v
```
