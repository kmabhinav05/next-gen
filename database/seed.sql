-- ============================================================================
-- Academic Department Assistance System (Next Gen Grading)
-- Comprehensive Seed Data for Testing & Demonstration
-- NOTE: All data is completely fictional and provided for demo/testing purposes.
-- ============================================================================

-- Passwords:
-- Admin:   admin    / Admin@123
-- Staff:   staff1   / Staff@123
-- Staff:   staff2   / Staff@123
-- Student: student1 / Student@123
-- Student: student2 / Student@123
-- Student: student3 / Student@123
-- Parent:  parent1  / Parent@123
-- Parent:  parent2  / Parent@123

-- 1. USERS
INSERT INTO users (id, username, email, password_hash, role, is_active) VALUES
(1, 'admin', 'admin@nextgen.edu', '$2a$12$gDh3BY3ojMV7iJH8tgdp1OBuoTenQto/OQ89V6GPsaCrpjijCdS8S', 'admin', TRUE),
(2, 'staff1', 'dr.sarah@nextgen.edu', '$2a$12$.zziynzOPSORBh1XsqgD2uSSc8IbI.9UrLuXy0zApD.r4dmqCpINq', 'staff', TRUE),
(3, 'staff2', 'prof.alan@nextgen.edu', '$2a$12$.zziynzOPSORBh1XsqgD2uSSc8IbI.9UrLuXy0zApD.r4dmqCpINq', 'staff', TRUE),
(4, 'student1', 'alex.turner@nextgen.edu', '$2a$12$SZXVQXBRdUA9Pf.vurkuKuzQrhBsAgkhkzF1OmLrBzZlyH0zHtshK', 'student', TRUE),
(5, 'student2', 'bella.chen@nextgen.edu', '$2a$12$SZXVQXBRdUA9Pf.vurkuKuzQrhBsAgkhkzF1OmLrBzZlyH0zHtshK', 'student', TRUE),
(6, 'student3', 'carlos.m@nextgen.edu', '$2a$12$SZXVQXBRdUA9Pf.vurkuKuzQrhBsAgkhkzF1OmLrBzZlyH0zHtshK', 'student', TRUE),
(7, 'parent1', 'robert.turner@gmail.com', '$2a$12$o0oXTOu2t.j9CHVtMgUQN.NdFaa4BDFaJNrtnwtzh2cNpq01nJ/I2', 'parent', TRUE),
(8, 'parent2', 'meiling.chen@gmail.com', '$2a$12$o0oXTOu2t.j9CHVtMgUQN.NdFaa4BDFaJNrtnwtzh2cNpq01nJ/I2', 'parent', TRUE);

SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- 2. DEPARTMENTS
INSERT INTO departments (id, code, name, description, is_active) VALUES
(1, 'CSE', 'Computer Science and Engineering', 'Department of Computer Science and Engineering', TRUE),
(2, 'IT', 'Information Technology', 'Department of Information Technology', TRUE),
(3, 'AI_DS', 'Artificial Intelligence and Data Science', 'Department of AI and Data Science', TRUE);

SELECT setval('departments_id_seq', (SELECT MAX(id) FROM departments));

-- 3. ACADEMIC YEARS
INSERT INTO academic_years (id, year_name, start_date, end_date, is_current) VALUES
(1, '2025-2026', '2025-06-15', '2026-05-30', TRUE),
(2, '2024-2025', '2024-06-15', '2025-05-30', FALSE);

SELECT setval('academic_years_id_seq', (SELECT MAX(id) FROM academic_years));

-- 4. SEMESTERS
INSERT INTO semesters (id, academic_year_id, semester_number, semester_type, start_date, end_date, is_current) VALUES
(1, 1, 5, 'odd', '2025-06-15', '2025-11-30', TRUE),
(2, 1, 6, 'even', '2025-12-01', '2026-05-30', FALSE),
(3, 2, 4, 'even', '2024-12-01', '2025-05-30', FALSE);

SELECT setval('semesters_id_seq', (SELECT MAX(id) FROM semesters));

-- 5. COURSES
INSERT INTO courses (id, department_id, course_code, course_name, total_semesters, degree_level, is_active) VALUES
(1, 1, 'BTECH_CSE', 'B.Tech Computer Science and Engineering', 8, 'Undergraduate', TRUE),
(2, 2, 'BTECH_IT', 'B.Tech Information Technology', 8, 'Undergraduate', TRUE);

SELECT setval('courses_id_seq', (SELECT MAX(id) FROM courses));

-- 6. CLASSES
INSERT INTO classes (id, course_id, semester_id, academic_year_id, section, batch_name, room_number, is_active) VALUES
(1, 1, 1, 1, 'A', 'Batch 2023-2027 (CSE-A)', 'LH-301', TRUE),
(2, 1, 1, 1, 'B', 'Batch 2023-2027 (CSE-B)', 'LH-302', TRUE);

SELECT setval('classes_id_seq', (SELECT MAX(id) FROM classes));

-- 7. STAFF
INSERT INTO staff (id, user_id, employee_id, first_name, last_name, designation, qualification, phone, department_id, joining_date) VALUES
(1, 2, 'EMP-CSE-101', 'Dr. Sarah', 'Jenkins', 'Associate Professor & HOD', 'Ph.D. in Computer Science', '+1-555-0101', 1, '2018-07-01'),
(2, 3, 'EMP-CSE-102', 'Prof. Alan', 'Turing', 'Assistant Professor', 'M.Tech, Ph.D. (Pursuing)', '+1-555-0102', 1, '2020-08-15');

SELECT setval('staff_id_seq', (SELECT MAX(id) FROM staff));

-- 8. STUDENTS
INSERT INTO students (id, user_id, register_number, roll_no, first_name, last_name, gender, dob, phone, blood_group, address, department_id, admission_year) VALUES
(1, 4, 'REG2023CSE001', '23CS001', 'Alex', 'Turner', 'Male', '2005-04-12', '+1-555-0201', 'O+', '42 West Coast Highway, Silicon Valley', 1, 2023),
(2, 5, 'REG2023CSE002', '23CS002', 'Bella', 'Chen', 'Female', '2005-09-21', '+1-555-0202', 'A+', '88 Innovation Boulevard, Tech Park', 1, 2023),
(3, 6, 'REG2023CSE003', '23CS003', 'Carlos', 'Mendoza', 'Male', '2005-01-18', '+1-555-0203', 'B+', '15 Academic Row, University Town', 1, 2023);

SELECT setval('students_id_seq', (SELECT MAX(id) FROM students));

-- 9. PARENTS
INSERT INTO parents (id, user_id, first_name, last_name, phone, alternate_phone, address, occupation) VALUES
(1, 7, 'Robert', 'Turner', '+1-555-0301', '+1-555-0302', '42 West Coast Highway, Silicon Valley', 'Civil Engineer'),
(2, 8, 'Meiling', 'Chen', '+1-555-0303', '+1-555-0304', '88 Innovation Boulevard, Tech Park', 'Data Architect');

SELECT setval('parents_id_seq', (SELECT MAX(id) FROM parents));

-- 10. PARENT_STUDENT RELATIONSHIPS
INSERT INTO parent_student (id, parent_id, student_id, relationship) VALUES
(1, 1, 1, 'Father'),
(2, 2, 2, 'Mother');

SELECT setval('parent_student_id_seq', (SELECT MAX(id) FROM parent_student));

-- 11. SUBJECTS
INSERT INTO subjects (id, department_id, subject_code, subject_name, credit, max_internal_marks, is_elective, is_active) VALUES
(1, 1, 'CS501', 'Design and Analysis of Algorithms', 4.0, 50.00, FALSE, TRUE),
(2, 1, 'CS502', 'Database Management Systems', 4.0, 50.00, FALSE, TRUE),
(3, 1, 'CS503', 'Theory of Computation', 3.0, 50.00, FALSE, TRUE),
(4, 1, 'CS504', 'Computer Networks', 3.0, 50.00, FALSE, TRUE),
(5, 1, 'CS505', 'Web Application Development Lab', 2.0, 50.00, FALSE, TRUE);

SELECT setval('subjects_id_seq', (SELECT MAX(id) FROM subjects));

-- 12. STAFF SUBJECT ASSIGNMENTS
INSERT INTO staff_subject_assignments (id, staff_id, subject_id, class_id, academic_year_id, semester_id, assigned_date, is_active) VALUES
(1, 1, 1, 1, 1, 1, '2025-06-15', TRUE), -- Dr. Sarah teaches CS501 to CSE-A Sem 5
(2, 1, 2, 1, 1, 1, '2025-06-15', TRUE), -- Dr. Sarah teaches CS502 to CSE-A Sem 5
(3, 2, 3, 1, 1, 1, '2025-06-15', TRUE), -- Prof. Alan teaches CS503 to CSE-A Sem 5
(4, 2, 4, 1, 1, 1, '2025-06-15', TRUE); -- Prof. Alan teaches CS504 to CSE-A Sem 5

SELECT setval('staff_subject_assignments_id_seq', (SELECT MAX(id) FROM staff_subject_assignments));

-- 13. STUDENT ENROLLMENTS
INSERT INTO student_enrollments (id, student_id, class_id, academic_year_id, semester_id, roll_number, enrollment_status) VALUES
(1, 1, 1, 1, 1, '23CS001', 'active'),
(2, 2, 1, 1, 1, '23CS002', 'active'),
(3, 3, 1, 1, 1, '23CS003', 'active');

SELECT setval('student_enrollments_id_seq', (SELECT MAX(id) FROM student_enrollments));

-- 14. ASSESSMENTS
INSERT INTO assessments (id, subject_id, class_id, semester_id, academic_year_id, assessment_name, max_marks, weightage, assessment_date, created_by_staff_id) VALUES
(1, 1, 1, 1, 1, 'Internal Assessment 1', 50.00, 100.00, '2025-08-20', 1),
(2, 1, 1, 1, 1, 'Internal Assessment 2', 50.00, 100.00, '2025-10-15', 1),
(3, 2, 1, 1, 1, 'Internal Assessment 1', 50.00, 100.00, '2025-08-22', 1),
(4, 3, 1, 1, 1, 'Internal Assessment 1', 50.00, 100.00, '2025-08-25', 2),
(5, 4, 1, 1, 1, 'Internal Assessment 1', 50.00, 100.00, '2025-08-28', 2);

SELECT setval('assessments_id_seq', (SELECT MAX(id) FROM assessments));

-- 15. ASSESSMENT MARKS
INSERT INTO assessment_marks (id, assessment_id, student_id, marks_obtained, is_absent, remarks, entered_by_staff_id) VALUES
-- CS501 IA-1
(1, 1, 1, 46.50, FALSE, 'Excellent algorithmic thinking', 1),
(2, 1, 2, 48.00, FALSE, 'Outstanding performance', 1),
(3, 1, 3, 34.00, FALSE, 'Needs to practice dynamic programming', 1),
-- CS501 IA-2
(4, 2, 1, 44.00, FALSE, 'Consistent work', 1),
(5, 2, 2, 49.50, FALSE, 'Top score in class', 1),
(6, 2, 3, 38.00, FALSE, 'Noticeable improvement', 1),
-- CS502 IA-1 (DBMS)
(7, 3, 1, 42.00, FALSE, 'Good normalization solutions', 1),
(8, 3, 2, 47.00, FALSE, 'Clean schema designs', 1),
(9, 3, 3, 35.50, FALSE, 'Review SQL subqueries', 1),
-- CS503 IA-1 (TOC)
(10, 4, 1, 40.00, FALSE, 'Solid DFA/NFA designs', 2),
(11, 4, 2, 45.00, FALSE, 'Very well prepared', 2),
(12, 4, 3, 30.00, FALSE, 'Turing machines need review', 2),
-- CS504 IA-1 (Networks)
(13, 5, 1, 45.00, FALSE, 'Great grasp of TCP/IP layers', 2),
(14, 5, 2, 46.50, FALSE, 'Excellent socket concepts', 2),
(15, 5, 3, 32.00, FALSE, 'Subnetting requires revision', 2);

SELECT setval('assessment_marks_id_seq', (SELECT MAX(id) FROM assessment_marks));

-- 16. ATTENDANCE SESSIONS
INSERT INTO attendance_sessions (id, subject_id, class_id, staff_id, session_date, session_period, academic_year_id, semester_id, topic_covered) VALUES
(1, 1, 1, 1, '2025-07-01', 1, 1, 1, 'Asymptotic Analysis & Big O Notation'),
(2, 1, 1, 1, '2025-07-02', 1, 1, 1, 'Divide and Conquer: Merge Sort Analysis'),
(3, 1, 1, 1, '2025-07-03', 2, 1, 1, 'Recurrence Relations & Master Theorem'),
(4, 1, 1, 1, '2025-07-04', 3, 1, 1, 'Greedy Strategies: Huffman Coding'),
(5, 2, 1, 1, '2025-07-01', 2, 1, 1, 'Relational Model & Relational Algebra'),
(6, 2, 1, 1, '2025-07-02', 2, 1, 1, 'Entity-Relationship to Schema Mapping'),
(7, 2, 1, 1, '2025-07-03', 3, 1, 1, 'Functional Dependencies & 3NF / BCNF'),
(8, 3, 1, 2, '2025-07-01', 3, 1, 1, 'Deterministic Finite Automata (DFA)'),
(9, 3, 1, 2, '2025-07-02', 3, 1, 1, 'NFA to DFA Conversion Subset Construction'),
(10, 4, 1, 2, '2025-07-01', 4, 1, 1, 'OSI Reference Model vs TCP/IP'),
(11, 4, 1, 2, '2025-07-02', 4, 1, 1, 'IP Addressing & Subnet Mask Calculation');

SELECT setval('attendance_sessions_id_seq', (SELECT MAX(id) FROM attendance_sessions));

-- 17. ATTENDANCE RECORDS
-- Session 1
INSERT INTO attendance_records (session_id, student_id, status) VALUES
(1, 1, 'present'), (1, 2, 'present'), (1, 3, 'present'),
-- Session 2
(2, 1, 'present'), (2, 2, 'present'), (2, 3, 'absent'),
-- Session 3
(3, 1, 'present'), (3, 2, 'present'), (3, 3, 'present'),
-- Session 4
(4, 1, 'present'), (4, 2, 'present'), (4, 3, 'present'),
-- Session 5
(5, 1, 'present'), (5, 2, 'present'), (5, 3, 'present'),
-- Session 6
(6, 1, 'present'), (6, 2, 'present'), (6, 3, 'absent'),
-- Session 7
(7, 1, 'present'), (7, 2, 'present'), (7, 3, 'present'),
-- Session 8
(8, 1, 'present'), (8, 2, 'present'), (8, 3, 'present'),
-- Session 9
(9, 1, 'absent'),  (9, 2, 'present'), (9, 3, 'present'),
-- Session 10
(10, 1, 'present'), (10, 2, 'present'), (10, 3, 'present'),
-- Session 11
(11, 1, 'present'), (11, 2, 'present'), (11, 3, 'absent');

-- 18. ANNOUNCEMENTS
INSERT INTO announcements (id, title, content, target_role, department_id, created_by_user_id, is_pinned, is_active) VALUES
(1, 'Upcoming Parent-Teacher Meeting (PTM)', 'The Semester 5 Mid-Term Parent-Teacher Meeting is scheduled for Saturday, November 1st at 10:00 AM in the Department Seminar Hall. Progress cards will be presented.', 'all', 1, 1, TRUE, TRUE),
(2, 'Submission Deadline: Internal Assessment 2 Marks', 'All faculty members are requested to upload and verify the IA-2 marks via the Excel import portal by Wednesday 5:00 PM.', 'staff', 1, 1, TRUE, TRUE),
(3, 'Attendance Advisory for Students Below 75%', 'Students with overall subject attendance below 75% must contact their respective faculty mentors before the end of this week.', 'student', 1, 2, FALSE, TRUE);

SELECT setval('announcements_id_seq', (SELECT MAX(id) FROM announcements));

-- 19. CHATBOT FAQS
INSERT INTO chatbot_faqs (id, category, question, answer, keywords, display_order, is_active) VALUES
(1, 'Attendance', 'What is the minimum attendance required to appear for semester end examinations?', 'A minimum of 75% attendance is required in each subject. Students with attendance between 65% and 74% may apply for medical condonation with verified doctor certification. Below 65% is strictly not eligible.', 'attendance, minimum, percentage, condonation, exam', 1, TRUE),
(2, 'Assessments', 'How are Internal Assessment (IA) marks calculated?', 'Each subject has internal assessments totaling up to 50 marks. These consist of written internal tests, subject assignments, and seminar/project presentations as specified in the course syllabus.', 'internal marks, assessment, calculation, weightage, tests', 2, TRUE),
(3, 'Progress Cards', 'How do I download my digital Progress Card?', 'Navigate to the "Progress Card" section from your student dashboard sidebar. Select your current academic year and semester, and click "Generate / Download PDF".', 'progress card, download, pdf, ptm, report', 3, TRUE),
(4, 'Progress Cards', 'Can parents view attendance and marks online?', 'Yes! Parents have dedicated login credentials to access real-time attendance percentages, internal assessment scores, and downloadable progress cards for their wards.', 'parents, portal, ward, child, attendance, marks', 4, TRUE),
(5, 'Study Tips', 'How can I improve my academic performance if I scored low in IA-1?', '1. Meet with your subject faculty during tutorial hours for doubt clarification.\n2. Practice previous years question papers.\n3. Form peer study groups for challenging topics.\n4. Take proactive advantage of IA-2 to boost your overall internal aggregate.', 'study tips, improvement, advice, tutorial, grades', 5, TRUE);

SELECT setval('chatbot_faqs_id_seq', (SELECT MAX(id) FROM chatbot_faqs));
