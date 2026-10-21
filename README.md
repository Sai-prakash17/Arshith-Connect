# Arshith Connect

> **Enterprise Workforce Management, Real-Time Attendance Tracking & Administration Platform**

Arshith Connect is an integrated enterprise platform consisting of a **Native Android Application**, a **React Web Portal**, a **FastAPI REST Service**, and **Firebase Cloud Functions** sharing a unified Firebase & PostgreSQL backend.

---

## 📁 Repository Structure

```
Arshith-Connect/
├── android/              # Native Android App (Java, Gradle, ViewBinding, Firebase SDK)
├── frontend/             # React 19 + Vite Web Application (Pure CSS, Lucide Icons)
├── backend/              # FastAPI + SQLAlchemy + Alembic REST API Service
├── functions/            # Firebase Cloud Functions (v2) for Event Triggers & Notifications
├── firebase.json         # Firebase Configuration (Firestore, Storage, Functions, Hosting)
├── firestore.rules       # Cloud Firestore Security Rules
├── firestore.indexes.json# Firestore Composite Indexes
├── storage.rules         # Firebase Cloud Storage Security Rules
├── .firebaserc           # Firebase Project Configuration
└── README.md             # Project Documentation
```

---

## 🚀 Key Modules & Capabilities

### 📱 Android Application (`android/`)
- **Employee Portal**:
  - GPS-verified Check In (WFO requires 100m office geofence & selfie camera capture; WFH bypasses photo/GPS).
  - Daily Punch Out with duration logging.
  - Leave Applications (Casual, Sick, Earned) with real-time status.
  - Scheduled daily work updates across 4 distinct shift timeframes.
  - Organization announcements and Jitsi Meet video conference integration.
- **Admin Portal**:
  - Real-time workforce dashboard (Present, Late, WFH, WFO, Leaves).
  - Employee approval workflow (authorizes `pending` accounts).
  - Leave request approvals and rejections with automated notifications.
  - Office timings configuration (thresholds, grace periods, office GPS coordinates).
  - Monthly attendance summaries and CSV report exports.

### 💻 Web Application (`frontend/`)
- Built with **React 19**, **Vite**, **React Router v7**, and **Lucide React**.
- Modular Vanilla CSS with responsive design system and glassmorphism styling.
- Admin management dashboards, employee lists, holiday management, and work assignment boards.
- Web-based attendance check-in modal with webcam selfie capture and browser geolocation.

### ⚡ REST API Backend (`backend/`)
- High-performance **FastAPI** service with **SQLAlchemy 2.0** ORM and **Alembic** migrations.
- Role-based JWT authentication, Pydantic v2 schemas, and PostgreSQL storage.
- Comprehensive test suite covering attendance, leaves, announcements, and assignments.

### 🔔 Cloud Functions (`functions/`)
- Firebase Cloud Functions v2 (Node.js) triggered on Firestore document events.
- Automated email dispatch via **Nodemailer** (SMTP).
- Instant SMS notifications via **Twilio** upon employee registration approval or rejection.

---

## 🛠️ Quick Start

### 1. Android Application
1. Open [`android/`](android/) in **Android Studio**.
2. Ensure Android SDK 37 is installed and JDK (Java 17/21/25) is selected.
3. Add your `local.properties` with:
   ```properties
   sdk.dir=C\:\\Users\\<YourUsername>\\AppData\\Local\\Android\\Sdk
   ```
4. Build and install:
   ```bash
   ./gradlew assembleDebug
   ```

### 2. Web Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. FastAPI Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 4. Firebase Cloud Functions
```bash
cd functions
npm install
npm run serve  # Local emulator
# Deploy to cloud:
firebase deploy --only functions
```

---

## 🔒 Security & Rules
- **Firestore Rules**: Strict RBAC ensuring employees can only read/write their own records while admins have authorized supervisory privileges.
- **Storage Rules**: Guard profile photos and check-in camera images.
