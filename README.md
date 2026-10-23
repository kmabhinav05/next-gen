# Academic Department Assistance System (Next Gen Grading)

A modern, enterprise-grade academic management, automated grading, attendance monitoring, and digital progress card platform designed for higher education institutions.

---

## 1. Project Overview & Architecture

### Purpose
The Academic Department Assistance System automates academic progress monitoring and report card generation:
1. **Eliminates error-prone manual marks compilation** from disparate spreadsheets into a unified PostgreSQL database.
2. **Automates attendance percentage calculations** directly from recorded session logs.
3. **Enforces granular Role-Based Access Control (RBAC)** across four user roles: **Admin**, **Staff / Faculty**, **Student**, and **Parent**.
4. **Excel Marks Ingestion Workflow**: Download pre-formatted `.xlsx` templates, drag-and-drop upload, row-by-row validation with error alerts, preview verification, and ACID transaction commits with audit logging.
5. **Generates high-fidelity PDF Progress Cards** using `PDFKit` with institutional branding, subject-wise assessment marks, attendance breakdown, and authorized signature blocks.
6. **Academic Assistant Chatbot**: Pre-seeded knowledge base covering attendance regulations, internal assessment calculations, condonation criteria, and study tips.

---

### Architectural Overview

```mermaid
graph TD
    subgraph ClientLayer ["Client Layer (Modern SaaS UI)"]
        A1["Admin Portal"]
        A2["Faculty / Staff Portal"]
        A3["Student Portal"]
        A4["Parent Portal"]
        UI_LIB["Bootstrap 5 + Custom CSS + Chart.js + Fetch API"]
    end

    subgraph SecurityLayer ["Security & Gateway Layer"]
        GW1["Helmet Security Headers"]
        GW2["CORS & Rate Limiter"]
        GW3["JWT Authentication Middleware"]
        GW4["Role-Based Access Control (RBAC)"]
        GW5["express-validator Request Sanitation"]
    end

    subgraph ServiceLayer ["Service Layer (Node.js & Express.js)"]
        S_AUTH["Auth Controller & Service"]
        S_ADMIN["Admin Controller & Service"]
        S_STAFF["Staff Controller & Service"]
        S_EXCEL["Excel Parser & Validator (ExcelJS)"]
        S_ATTEND["Attendance Engine"]
        S_PDF["Progress Card PDF Generator (PDFKit)"]
        S_BOT["Academic FAQ Chatbot Engine"]
    end

    subgraph DataLayer ["Data & Storage Layer"]
        PG[("PostgreSQL Database (next_gen_grading)")]
        AL[("Activity & Audit Logs")]
    end

    ClientLayer --> SecurityLayer
    SecurityLayer --> ServiceLayer
    ServiceLayer --> DataLayer
```

---

## 2. Technology Stack

- **Frontend**: HTML5, CSS3 (Navy Blue `#0f172a`, White, Teal `#0d9488`), Bootstrap 5, FontAwesome 6, Chart.js, Fetch API.
- **Backend**: Node.js, Express.js (RESTful architecture).
- **Authentication**: JWT (JSON Web Tokens), bcryptjs (12 salt rounds), Role-Based Access Control (RBAC).
- **Database**: PostgreSQL 18 with connection pooling (`pg.Pool`), parameterized queries, check constraints, foreign keys, and indexes.
- **File & Document Processing**:
  - `ExcelJS`: Template generation, workbook parsing, row-level validation.
  - `Multer`: In-memory multipart file upload with MIME type and size checks.
  - `PDFKit`: Vector-drawn student academic progress cards.
- **Security**: Helmet, express-rate-limit, express-validator, dotenv.
- **Testing**: Node.js built-in test runner (`node --test`).

---

## 3. Database Schema & ER Diagram

```mermaid
erDiagram
    users ||--o| students : "has profile"
    users ||--o| staff : "has profile"
    users ||--o| parents : "has profile"
    users ||--o{ announcements : "creates"
    users ||--o{ activity_logs : "triggers"

    departments ||--o{ courses : "offers"
    departments ||--o{ subjects : "manages"
    departments ||--o{ students : "enrolls"
    departments ||--o{ staff : "employs"

    courses ||--o{ classes : "has"
    semesters ||--o{ classes : "schedules"
    academic_years ||--o{ classes : "belongs to"

    classes ||--o{ student_enrollments : "contains"
    students ||--o{ student_enrollments : "enrolled in"

    parents ||--o{ parent_student : "linked to"
    students ||--o{ parent_student : "child of"

    staff ||--o{ staff_subject_assignments : "teaches"
    subjects ||--o{ staff_subject_assignments : "allocated to"
    classes ||--o{ staff_subject_assignments : "assigned to"

    classes ||--o{ assessments : "scheduled for"
    subjects ||--o{ assessments : "evaluates"
    assessments ||--o{ assessment_marks : "records"
    students ||--o{ assessment_marks : "earns"

    classes ||--o{ attendance_sessions : "conducted for"
    subjects ||--o{ attendance_sessions : "topic for"
    attendance_sessions ||--o{ attendance_records : "tracks"
    students ||--o{ attendance_records : "attends"
```

---

## 4. User Roles & Capabilities

| Feature | Administrator | Faculty / Staff | Student | Parent |
|---|:---:|:---:|:---:|:---:|
| System KPI Dashboard | ✅ | ❌ | ❌ | ❌ |
| Manage Students & Staff | ✅ | ❌ | ❌ | ❌ |
| Manage Departments & Subjects | ✅ | ❌ | ❌ | ❌ |
| Allocate Subjects to Faculty | ✅ | ❌ | ❌ | ❌ |
| Record Daily Attendance | ✅ | ✅ | ❌ | ❌ |
| Download Excel Marks Template | ✅ | ✅ | ❌ | ❌ |
| Upload & Validate Marks (Excel) | ✅ | ✅ | ❌ | ❌ |
| View Class Roster & Progress Cards | ✅ | ✅ | ❌ | ❌ |
| View Personal Academic Marks | ❌ | ❌ | ✅ (Read-only) | ❌ |
| View Personal Attendance % | ❌ | ❌ | ✅ (Read-only) | ❌ |
| Download Personal Progress Card PDF | ❌ | ✅ | ✅ | ❌ |
| Switch Linked Children & View Wards | ❌ | ❌ | ❌ | ✅ |
| Download Ward Progress Card PDF | ❌ | ❌ | ❌ | ✅ |
| Academic Assistance Chatbot | ✅ | ✅ | ✅ | ✅ |

---

## 5. Pre-Seeded Demo User Credentials

The database comes pre-populated with active demonstration accounts. You can use the **1-Click Quick-Fill** buttons on `/login.html` or enter the credentials below:

| Role | Username | Password | Linked Profile / Details |
|---|---|---|---|
| **Administrator** | `admin` | `Admin@123` | Institutional Administrator |
| **Faculty / Staff** | `staff1` | `Staff@123` | Dr. Sarah Jenkins (HOD - CSE) |
| **Faculty / Staff** | `staff2` | `Staff@123` | Prof. Alan Turing (Assistant Professor) |
| **Student** | `student1` | `Student@123` | Alex Turner (`REG2023CSE001`, CSE-A Sem 5) |
| **Student** | `student2` | `Student@123` | Bella Chen (`REG2023CSE002`, CSE-A Sem 5) |
| **Parent** | `parent1` | `Parent@123` | Robert Turner (Father of Alex Turner) |
| **Parent** | `parent2` | `Parent@123` | Meiling Chen (Mother of Bella Chen) |

---

## 6. Installation & Setup Guide

### Prerequisites
- **Node.js** (v18.0.0 or higher recommended)
- **PostgreSQL** (v14 or higher)

### Step 1: Clone or Navigate to the Workspace
```powershell
cd "G:\next gen"
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` (or update existing `.env`):
```env
PORT=5000
NODE_ENV=development
APP_NAME=Next Gen Grading - Academic Department Assistance System
APP_URL=http://localhost:5000

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=next_gen_grading
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Authentication
JWT_SECRET=super_secret_academic_jwt_token_key_change_in_production_2026
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=12
```

### Step 3: Install Dependencies
```powershell
cd "G:\next gen\backend"
npm.cmd install
```

### Step 4: Initialize & Seed Database
Run the database migration runner to create tables and load seed data:
```powershell
node src/utils/initDb.js
```

### Step 5: Start the Backend Server
```powershell
node src/server.js
```
The server will start listening on `http://localhost:5000`.

### Step 6: Access the Application
Open your browser and navigate to:
- **Public Portal**: [http://localhost:5000/](http://localhost:5000/)
- **Unified Login**: [http://localhost:5000/login.html](http://localhost:5000/login.html)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 7. Automated Test Suite

The project includes unit and integration tests covering security, password hashing, RBAC, Excel import/validation, PDF generation, and chatbot responses:

To run all 39 test suites:
```powershell
cd "G:\next gen\backend"
npm.cmd test
```

### Test Coverage Highlights:
- **Authentication**: JWT generation, expiry handling, tamper detection, login rate limiting, password comparisons.
- **RBAC**: Enforces strict boundaries between Admin, Staff, Student, and Parent.
- **Excel Ingestion**: Pre-formatted template generation, multi-point row validation (max marks, attendance check, duplicate detection, un-enrolled students), ACID transaction commit with audit logging.
- **Progress Card**: Calculation of accurate aggregate marks, subject attendance percentage, and `PDFKit` document stream generation.
- **Chatbot**: Accurate FAQ response matching and domain-specific academic heuristic fallback.

---

## 8. License & Institutional Attribution
Developed for Higher Education Institutions and Autonomous Colleges. © 2026 Next Gen Grading. All rights reserved.
