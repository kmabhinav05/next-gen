-- ============================================================================
-- Academic Department Assistance System (Next Gen Grading)
-- Complete PostgreSQL Database Schema
-- Version: 1.0.0
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean existing tables if needed (in reverse dependency order)
DROP TABLE IF EXISTS audit_marks_logs CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS chatbot_faqs CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS attendance_sessions CASCADE;
DROP TABLE IF EXISTS assessment_marks CASCADE;
DROP TABLE IF EXISTS assessments CASCADE;
DROP TABLE IF EXISTS student_enrollments CASCADE;
DROP TABLE IF EXISTS staff_subject_assignments CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS parent_student CASCADE;
DROP TABLE IF EXISTS parents CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS semesters CASCADE;
DROP TABLE IF EXISTS academic_years CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Clean existing enum types
DROP TYPE IF EXISTS user_role_enum CASCADE;
DROP TYPE IF EXISTS semester_type_enum CASCADE;
DROP TYPE IF EXISTS attendance_status_enum CASCADE;
DROP TYPE IF EXISTS announcement_target_enum CASCADE;
DROP TYPE IF EXISTS enrollment_status_enum CASCADE;

-- Create Custom ENUM Types
CREATE TYPE user_role_enum AS ENUM ('admin', 'staff', 'student', 'parent');
CREATE TYPE semester_type_enum AS ENUM ('odd', 'even');
CREATE TYPE attendance_status_enum AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE announcement_target_enum AS ENUM ('all', 'staff', 'student', 'parent');
CREATE TYPE enrollment_status_enum AS ENUM ('active', 'completed', 'dropped');

-- ============================================================================
-- 1. USERS TABLE
-- Authentication and base identity for all four roles
-- ============================================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 2. DEPARTMENTS TABLE
-- Academic departments (e.g., Computer Science, Information Technology, AI & DS)
-- ============================================================================
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    code VARCHAR(16) UNIQUE NOT NULL,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 3. ACADEMIC YEARS TABLE
-- e.g., 2025-2026, 2026-2027
-- ============================================================================
CREATE TABLE academic_years (
    id SERIAL PRIMARY KEY,
    year_name VARCHAR(16) UNIQUE NOT NULL, -- e.g. "2025-2026"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_academic_year_dates CHECK (end_date > start_date)
);

-- ============================================================================
-- 4. SEMESTERS TABLE
-- Semesters linked to academic years (1 through 8)
-- ============================================================================
CREATE TABLE semesters (
    id SERIAL PRIMARY KEY,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    semester_number SMALLINT NOT NULL CHECK (semester_number BETWEEN 1 AND 12),
    semester_type semester_type_enum NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_academic_year_semester UNIQUE (academic_year_id, semester_number),
    CONSTRAINT chk_semester_dates CHECK (end_date > start_date)
);

-- ============================================================================
-- 5. COURSES TABLE
-- Degree programs (e.g., B.Tech Computer Science and Engineering, B.Sc Data Science)
-- ============================================================================
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    course_code VARCHAR(16) UNIQUE NOT NULL,
    course_name VARCHAR(128) NOT NULL,
    total_semesters SMALLINT DEFAULT 8 NOT NULL,
    degree_level VARCHAR(32) DEFAULT 'Undergraduate' NOT NULL, -- Undergraduate / Postgraduate
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 6. CLASSES TABLE
-- Class sections (e.g., CSE-A 3rd Year Sem 5)
-- ============================================================================
CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
    section VARCHAR(8) NOT NULL DEFAULT 'A', -- e.g. "A", "B", "C"
    batch_name VARCHAR(64) NOT NULL,        -- e.g. "Batch 2023-2027"
    room_number VARCHAR(32),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_class_section UNIQUE (course_id, semester_id, academic_year_id, section)
);

-- ============================================================================
-- 7. STUDENTS TABLE
-- Student profiles linked to User table
-- ============================================================================
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    register_number VARCHAR(32) UNIQUE NOT NULL,
    roll_no VARCHAR(32),
    first_name VARCHAR(64) NOT NULL,
    last_name VARCHAR(64) NOT NULL,
    gender VARCHAR(16) CHECK (gender IN ('Male', 'Female', 'Other')),
    dob DATE,
    phone VARCHAR(20),
    blood_group VARCHAR(8),
    address TEXT,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    admission_year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 8. STAFF TABLE
-- Faculty profiles linked to User table
-- ============================================================================
CREATE TABLE staff (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    employee_id VARCHAR(32) UNIQUE NOT NULL,
    first_name VARCHAR(64) NOT NULL,
    last_name VARCHAR(64) NOT NULL,
    designation VARCHAR(64) NOT NULL, -- e.g. "Assistant Professor", "HOD", "Associate Professor"
    qualification VARCHAR(128) NOT NULL, -- e.g. "M.Tech, Ph.D"
    phone VARCHAR(20),
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    joining_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 9. PARENTS TABLE
-- Parent / Guardian profiles linked to User table
-- ============================================================================
CREATE TABLE parents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(64) NOT NULL,
    last_name VARCHAR(64) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    alternate_phone VARCHAR(20),
    address TEXT,
    occupation VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 10. PARENT_STUDENT TABLE
-- Association between Parents and their children (supports multiple wards)
-- ============================================================================
CREATE TABLE parent_student (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    relationship VARCHAR(32) NOT NULL DEFAULT 'Parent', -- 'Father', 'Mother', 'Guardian'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_parent_student UNIQUE (parent_id, student_id)
);

-- ============================================================================
-- 11. SUBJECTS TABLE
-- Courses / subjects offered in departments
-- ============================================================================
CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    subject_code VARCHAR(32) UNIQUE NOT NULL,
    subject_name VARCHAR(128) NOT NULL,
    credit NUMERIC(3, 1) DEFAULT 3.0 NOT NULL,
    max_internal_marks NUMERIC(5, 2) DEFAULT 50.00 NOT NULL,
    is_elective BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 12. STAFF_SUBJECT_ASSIGNMENTS TABLE
-- Which faculty teaches which subject for which class in a semester
-- ============================================================================
CREATE TABLE staff_subject_assignments (
    id SERIAL PRIMARY KEY,
    staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    assigned_date DATE DEFAULT CURRENT_DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_staff_subject_class UNIQUE (staff_id, subject_id, class_id, semester_id)
);

-- ============================================================================
-- 13. STUDENT_ENROLLMENTS TABLE
-- Enrolled students in a class for an academic year and semester
-- ============================================================================
CREATE TABLE student_enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    roll_number VARCHAR(32),
    enrollment_status enrollment_status_enum DEFAULT 'active' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_student_class_semester UNIQUE (student_id, class_id, semester_id)
);

-- ============================================================================
-- 14. ASSESSMENTS TABLE
-- Internal assessments (e.g. IA-1, IA-2, IA-3, Model Examination)
-- ============================================================================
CREATE TABLE assessments (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    assessment_name VARCHAR(64) NOT NULL, -- 'Internal Assessment 1', 'Internal Assessment 2', 'Model Exam'
    max_marks NUMERIC(5, 2) NOT NULL CHECK (max_marks > 0),
    weightage NUMERIC(5, 2) DEFAULT 100.00,
    assessment_date DATE,
    created_by_staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_assessment_per_class UNIQUE (subject_id, class_id, semester_id, assessment_name)
);

-- ============================================================================
-- 15. ASSESSMENT_MARKS TABLE
-- Individual student scores in an assessment
-- ============================================================================
CREATE TABLE assessment_marks (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    marks_obtained NUMERIC(5, 2) CHECK (marks_obtained >= 0),
    is_absent BOOLEAN DEFAULT FALSE NOT NULL,
    remarks VARCHAR(255),
    entered_by_staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_student_assessment_mark UNIQUE (assessment_id, student_id)
);

-- ============================================================================
-- 16. ATTENDANCE_SESSIONS TABLE
-- Individual class attendance periods recorded by staff
-- ============================================================================
CREATE TABLE attendance_sessions (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    session_period SMALLINT NOT NULL CHECK (session_period BETWEEN 1 AND 10),
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    topic_covered VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_attendance_session UNIQUE (subject_id, class_id, session_date, session_period)
);

-- ============================================================================
-- 17. ATTENDANCE_RECORDS TABLE
-- Student attendance per session
-- ============================================================================
CREATE TABLE attendance_records (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status attendance_status_enum NOT NULL DEFAULT 'present',
    remarks VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT uq_student_session_attendance UNIQUE (session_id, student_id)
);

-- ============================================================================
-- 18. ANNOUNCEMENTS TABLE
-- Department and college announcements
-- ============================================================================
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    target_role announcement_target_enum DEFAULT 'all' NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_pinned BOOLEAN DEFAULT FALSE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 19. CHATBOT_FAQS TABLE
-- Knowledge base for the student assistance chatbot
-- ============================================================================
CREATE TABLE chatbot_faqs (
    id SERIAL PRIMARY KEY,
    category VARCHAR(64) NOT NULL, -- e.g. "Attendance", "Assessments", "Progress Cards", "Study Tips"
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords VARCHAR(255),
    display_order INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 20. ACTIVITY_LOGS TABLE
-- System activity and audit trail
-- ============================================================================
CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(64) NOT NULL, -- 'LOGIN', 'MARKS_UPLOAD', 'ATTENDANCE_RECORD', etc.
    entity_name VARCHAR(64),          -- 'assessment_marks', 'attendance_sessions', etc.
    entity_id INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- 21. AUDIT_MARKS_LOGS TABLE
-- Dedicated audit trail specifically tracking grade/marks changes
-- ============================================================================
CREATE TABLE audit_marks_logs (
    id SERIAL PRIMARY KEY,
    assessment_mark_id INTEGER REFERENCES assessment_marks(id) ON DELETE CASCADE,
    assessment_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    old_marks NUMERIC(5, 2),
    new_marks NUMERIC(5, 2),
    old_absent BOOLEAN,
    new_absent BOOLEAN,
    changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

CREATE INDEX idx_students_user_id ON students(user_id);
CREATE INDEX idx_students_reg_no ON students(register_number);
CREATE INDEX idx_students_dept ON students(department_id);

CREATE INDEX idx_staff_user_id ON staff(user_id);
CREATE INDEX idx_staff_emp_id ON staff(employee_id);
CREATE INDEX idx_staff_dept ON staff(department_id);

CREATE INDEX idx_parents_user_id ON parents(user_id);
CREATE INDEX idx_parent_student_ids ON parent_student(parent_id, student_id);

CREATE INDEX idx_subjects_code ON subjects(subject_code);
CREATE INDEX idx_subjects_dept ON subjects(department_id);

CREATE INDEX idx_classes_lookup ON classes(course_id, semester_id, academic_year_id);
CREATE INDEX idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX idx_enrollments_class ON student_enrollments(class_id, semester_id);

CREATE INDEX idx_assessments_lookup ON assessments(subject_id, class_id, semester_id);
CREATE INDEX idx_assessment_marks_lookup ON assessment_marks(assessment_id, student_id);
CREATE INDEX idx_assessment_marks_student ON assessment_marks(student_id);

CREATE INDEX idx_attendance_sessions_lookup ON attendance_sessions(class_id, subject_id, session_date);
CREATE INDEX idx_attendance_records_session ON attendance_records(session_id);
CREATE INDEX idx_attendance_records_student ON attendance_records(student_id);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX idx_announcements_target ON announcements(target_role, is_active);
CREATE INDEX idx_chatbot_category ON chatbot_faqs(category, is_active);

-- ============================================================================
-- AUTOMATED TIMESTAMP UPDATE TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to update updated_at automatically
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_parents_updated_at BEFORE UPDATE ON parents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_assessment_marks_updated_at BEFORE UPDATE ON assessment_marks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_chatbot_faqs_updated_at BEFORE UPDATE ON chatbot_faqs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
