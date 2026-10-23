const { query, getClient } = require('../config/db');
const { hashPassword } = require('../utils/passwordHelper');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * Controller: Admin Dashboard Statistics
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const [studentsCount, staffCount, subjectsCount, classesCount, departmentsCount, announcementsCount, logsRes] = await Promise.all([
      query('SELECT COUNT(*) AS count FROM students'),
      query('SELECT COUNT(*) AS count FROM staff'),
      query('SELECT COUNT(*) AS count FROM subjects WHERE is_active = TRUE'),
      query('SELECT COUNT(*) AS count FROM classes WHERE is_active = TRUE'),
      query('SELECT COUNT(*) AS count FROM departments WHERE is_active = TRUE'),
      query('SELECT COUNT(*) AS count FROM announcements WHERE is_active = TRUE'),
      query(`
        SELECT al.id, al.action_type, al.entity_name, al.created_at, u.username, u.role
        FROM activity_logs al
        LEFT JOIN users u ON u.id = al.user_id
        ORDER BY al.created_at DESC
        LIMIT 8
      `),
    ]);

    return successResponse(res, 'Admin statistics retrieved', {
      totalStudents: parseInt(studentsCount.rows[0].count, 10),
      totalStaff: parseInt(staffCount.rows[0].count, 10),
      totalSubjects: parseInt(subjectsCount.rows[0].count, 10),
      totalClasses: parseInt(classesCount.rows[0].count, 10),
      totalDepartments: parseInt(departmentsCount.rows[0].count, 10),
      totalAnnouncements: parseInt(announcementsCount.rows[0].count, 10),
      recentActivity: logsRes.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get Departments
 */
const getDepartments = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM departments ORDER BY code ASC');
    return successResponse(res, 'Departments retrieved', result.rows);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Create Department
 */
const createDepartment = async (req, res, next) => {
  try {
    const { code, name, description } = req.body;
    if (!code || !name) {
      return errorResponse(res, 'Department code and name are required', 400);
    }
    const result = await query(
      `INSERT INTO departments (code, name, description)
       VALUES ($1, $2, $3) RETURNING *`,
      [code.toUpperCase(), name, description || null]
    );
    return successResponse(res, 'Department created successfully', result.rows[0], 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get Classes & Academic info
 */
const getClasses = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT c.id, c.section, c.batch_name, c.room_number, c.is_active,
             co.course_name, co.course_code,
             s.semester_number, s.semester_type,
             ay.year_name,
             (SELECT COUNT(*) FROM student_enrollments se WHERE se.class_id = c.id AND se.enrollment_status = 'active') AS student_count
      FROM classes c
      JOIN courses co ON co.id = c.course_id
      JOIN semesters s ON s.id = c.semester_id
      JOIN academic_years ay ON ay.id = c.academic_year_id
      ORDER BY c.id DESC
    `);
    return successResponse(res, 'Classes retrieved', result.rows);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get Subjects
 */
const getSubjects = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT s.id, s.subject_code, s.subject_name, s.credit, s.max_internal_marks, s.is_elective, s.is_active,
             d.code AS department_code, d.name AS department_name
      FROM subjects s
      JOIN departments d ON d.id = s.department_id
      ORDER BY s.subject_code ASC
    `);
    return successResponse(res, 'Subjects retrieved', result.rows);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Create Subject
 */
const createSubject = async (req, res, next) => {
  try {
    const { departmentId, subjectCode, subjectName, credit, maxInternalMarks, isElective } = req.body;
    if (!departmentId || !subjectCode || !subjectName) {
      return errorResponse(res, 'Department, subject code, and subject name are required', 400);
    }
    const result = await query(
      `INSERT INTO subjects (department_id, subject_code, subject_name, credit, max_internal_marks, is_elective)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [departmentId, subjectCode.toUpperCase(), subjectName, credit || 3.0, maxInternalMarks || 50.0, isElective || false]
    );
    return successResponse(res, 'Subject created successfully', result.rows[0], 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get Staff List
 */
const getStaffList = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT st.id, st.user_id, st.employee_id, st.first_name, st.last_name, st.designation, st.qualification,
             st.phone, st.joining_date, d.name AS department_name, d.code AS department_code,
             u.email, u.username, u.is_active
      FROM staff st
      JOIN users u ON u.id = st.user_id
      JOIN departments d ON d.id = st.department_id
      ORDER BY st.first_name ASC
    `);
    return successResponse(res, 'Staff members retrieved', result.rows);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Create Staff Member
 */
const createStaff = async (req, res, next) => {
  const client = await getClient();
  try {
    const { username, email, password, employeeId, firstName, lastName, designation, qualification, phone, departmentId } = req.body;

    if (!username || !email || !password || !employeeId || !firstName || !lastName || !departmentId) {
      return errorResponse(res, 'All required staff fields must be provided', 400);
    }

    await client.query('BEGIN');
    const pwdHash = await hashPassword(password);

    const userRes = await client.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, 'staff') RETURNING id`,
      [username.trim(), email.trim().toLowerCase(), pwdHash]
    );

    const staffRes = await client.query(
      `INSERT INTO staff (user_id, employee_id, first_name, last_name, designation, qualification, phone, department_id, joining_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE) RETURNING *`,
      [userRes.rows[0].id, employeeId.trim().toUpperCase(), firstName.trim(), lastName.trim(), designation || 'Assistant Professor', qualification || 'M.Tech', phone || null, departmentId]
    );

    await client.query('COMMIT');
    return successResponse(res, 'Staff member created successfully', staffRes.rows[0], 201);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * Controller: Get Student List
 */
const getStudentsList = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT s.id, s.user_id, s.register_number, s.roll_no, s.first_name, s.last_name, s.gender, s.phone,
             s.admission_year, d.name AS department_name, d.code AS department_code,
             u.email, u.username, u.is_active,
             c.batch_name, c.section, co.course_name, sem.semester_number
      FROM students s
      JOIN users u ON u.id = s.user_id
      JOIN departments d ON d.id = s.department_id
      LEFT JOIN student_enrollments se ON se.student_id = s.id AND se.enrollment_status = 'active'
      LEFT JOIN classes c ON c.id = se.class_id
      LEFT JOIN courses co ON co.id = c.course_id
      LEFT JOIN semesters sem ON sem.id = se.semester_id
      ORDER BY s.register_number ASC
    `);
    return successResponse(res, 'Students retrieved', result.rows);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Create Student
 */
const createStudent = async (req, res, next) => {
  const client = await getClient();
  try {
    const { username, email, password, registerNumber, rollNo, firstName, lastName, gender, phone, departmentId, admissionYear, classId } = req.body;

    if (!username || !email || !password || !registerNumber || !firstName || !lastName || !departmentId) {
      return errorResponse(res, 'All required student fields must be provided', 400);
    }

    await client.query('BEGIN');
    const pwdHash = await hashPassword(password);

    const userRes = await client.query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, 'student') RETURNING id`,
      [username.trim(), email.trim().toLowerCase(), pwdHash]
    );

    const studentRes = await client.query(
      `INSERT INTO students (user_id, register_number, roll_no, first_name, last_name, gender, phone, department_id, admission_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [userRes.rows[0].id, registerNumber.trim().toUpperCase(), rollNo || null, firstName.trim(), lastName.trim(), gender || 'Other', phone || null, departmentId, admissionYear || new Date().getFullYear()]
    );

    // Optional immediate class enrollment
    if (classId) {
      const classInfo = await client.query('SELECT academic_year_id, semester_id FROM classes WHERE id = $1', [classId]);
      if (classInfo.rowCount > 0) {
        await client.query(
          `INSERT INTO student_enrollments (student_id, class_id, academic_year_id, semester_id, roll_number)
           VALUES ($1, $2, $3, $4, $5)`,
          [studentRes.rows[0].id, classId, classInfo.rows[0].academic_year_id, classInfo.rows[0].semester_id, rollNo || null]
        );
      }
    }

    await client.query('COMMIT');
    return successResponse(res, 'Student created successfully', studentRes.rows[0], 201);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * Controller: Toggle User Active Status (Deactivate / Reactivate)
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const userRes = await query('SELECT id, is_active, role, username FROM users WHERE id = $1', [userId]);
    if (userRes.rowCount === 0) {
      return errorResponse(res, 'User not found', 404);
    }

    const currentStatus = userRes.rows[0].is_active;
    const newStatus = !currentStatus;

    await query('UPDATE users SET is_active = $1 WHERE id = $2', [newStatus, userId]);

    // Audit log
    await query(
      `INSERT INTO activity_logs (user_id, action_type, details)
       VALUES ($1, $2, $3)`,
      [req.user.userId, newStatus ? 'USER_REACTIVATED' : 'USER_DEACTIVATED', JSON.stringify({ targetUserId: userId, targetUsername: userRes.rows[0].username })]
    );

    return successResponse(res, `User ${newStatus ? 'activated' : 'deactivated'} successfully`, { is_active: newStatus });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get Staff-Subject Allocations
 */
const getSubjectAssignments = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT ssa.id, ssa.assigned_date, ssa.is_active,
             st.first_name, st.last_name, st.employee_id,
             sub.subject_code, sub.subject_name,
             c.section, c.batch_name,
             ay.year_name, sem.semester_number
      FROM staff_subject_assignments ssa
      JOIN staff st ON st.id = ssa.staff_id
      JOIN subjects sub ON sub.id = ssa.subject_id
      JOIN classes c ON c.id = ssa.class_id
      JOIN academic_years ay ON ay.id = ssa.academic_year_id
      JOIN semesters sem ON sem.id = ssa.semester_id
      ORDER BY ssa.id DESC
    `);
    return successResponse(res, 'Assignments retrieved', result.rows);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Create Staff-Subject Allocation
 */
const createSubjectAssignment = async (req, res, next) => {
  try {
    const { staffId, subjectId, classId } = req.body;
    if (!staffId || !subjectId || !classId) {
      return errorResponse(res, 'Staff, Subject, and Class must be selected', 400);
    }

    const classRes = await query('SELECT academic_year_id, semester_id FROM classes WHERE id = $1', [classId]);
    if (classRes.rowCount === 0) {
      return errorResponse(res, 'Specified class not found', 404);
    }

    const { academic_year_id, semester_id } = classRes.rows[0];

    const result = await query(
      `INSERT INTO staff_subject_assignments (staff_id, subject_id, class_id, academic_year_id, semester_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (staff_id, subject_id, class_id, semester_id)
       DO UPDATE SET is_active = TRUE
       RETURNING *`,
      [staffId, subjectId, classId, academic_year_id, semester_id]
    );

    return successResponse(res, 'Subject assigned to faculty successfully', result.rows[0], 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get Activity Logs
 */
const getActivityLogs = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT al.id, al.action_type, al.entity_name, al.entity_id, al.ip_address, al.details, al.created_at,
             u.username, u.role
      FROM activity_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT 100
    `);
    return successResponse(res, 'Activity logs retrieved', result.rows);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardStats,
  getDepartments,
  createDepartment,
  getClasses,
  getSubjects,
  createSubject,
  getStaffList,
  createStaff,
  getStudentsList,
  createStudent,
  toggleUserStatus,
  getSubjectAssignments,
  createSubjectAssignment,
  getActivityLogs,
};
