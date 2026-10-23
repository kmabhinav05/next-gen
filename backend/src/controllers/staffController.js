const { query, getClient } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const excelService = require('../services/excelService');
const progressCardService = require('../services/progressCardService');
const pdfService = require('../services/pdfService');

/**
 * Controller: Staff Dashboard Summary
 */
const getDashboard = async (req, res, next) => {
  try {
    const staffId = req.user.staffId;
    if (!staffId) {
      return errorResponse(res, 'Staff profile not associated with this account', 400);
    }

    // Get assigned subjects and classes
    const assignmentsRes = await query(`
      SELECT ssa.id AS assignment_id, ssa.class_id, ssa.subject_id,
             sub.subject_code, sub.subject_name, sub.credit, sub.max_internal_marks,
             c.section, c.batch_name, c.room_number,
             sem.semester_number, ay.year_name,
             (SELECT COUNT(*) FROM student_enrollments se WHERE se.class_id = c.id AND se.enrollment_status = 'active') AS total_students
      FROM staff_subject_assignments ssa
      JOIN subjects sub ON sub.id = ssa.subject_id
      JOIN classes c ON c.id = ssa.class_id
      JOIN semesters sem ON sem.id = ssa.semester_id
      JOIN academic_years ay ON ay.id = ssa.academic_year_id
      WHERE ssa.staff_id = $1 AND ssa.is_active = TRUE
      ORDER BY sub.subject_code ASC
    `, [staffId]);

    // Get recent attendance sessions recorded by this staff
    const sessionsRes = await query(`
      SELECT att.id, att.session_date, att.session_period, att.topic_covered,
             sub.subject_code, c.section, c.batch_name,
             COUNT(ar.id) AS total_records,
             SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) AS present_count
      FROM attendance_sessions att
      JOIN subjects sub ON sub.id = att.subject_id
      JOIN classes c ON c.id = att.class_id
      LEFT JOIN attendance_records ar ON ar.session_id = att.id
      WHERE att.staff_id = $1
      GROUP BY att.id, sub.subject_code, c.section, c.batch_name
      ORDER BY att.session_date DESC, att.session_period DESC
      LIMIT 5
    `, [staffId]);

    return successResponse(res, 'Staff dashboard data retrieved', {
      assignedCourses: assignmentsRes.rows,
      recentSessions: sessionsRes.rows,
      stats: {
        totalClasses: assignmentsRes.rowCount,
        totalSubjects: new Set(assignmentsRes.rows.map(r => r.subject_id)).size,
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get Enrolled Students for a specific class & subject
 */
const getClassStudents = async (req, res, next) => {
  try {
    const { classId, subjectId } = req.params;
    const staffId = req.user.staffId;

    // Verify staff is assigned to this subject/class
    const checkAssignment = await query(
      `SELECT id FROM staff_subject_assignments 
       WHERE staff_id = $1 AND class_id = $2 AND subject_id = $3 AND is_active = TRUE`,
      [staffId, classId, subjectId]
    );

    if (checkAssignment.rowCount === 0 && req.user.role !== 'admin') {
      return errorResponse(res, 'Unauthorized. You are not assigned to this subject and class', 403);
    }

    // Get students with their current attendance summary and internal marks
    const studentsRes = await query(`
      SELECT s.id AS student_id, s.register_number, s.roll_no, s.first_name, s.last_name,
             -- Total sessions for this subject & class
             COALESCE((
               SELECT COUNT(att.id)
               FROM attendance_sessions att
               JOIN attendance_records ar ON ar.session_id = att.id
               WHERE att.class_id = $1 AND att.subject_id = $2 AND ar.student_id = s.id
             ), 0) AS total_sessions,
             -- Attended sessions
             COALESCE((
               SELECT COUNT(att.id)
               FROM attendance_sessions att
               JOIN attendance_records ar ON ar.session_id = att.id
               WHERE att.class_id = $1 AND att.subject_id = $2 AND ar.student_id = s.id AND ar.status = 'present'
             ), 0) AS attended_sessions
      FROM student_enrollments se
      JOIN students s ON s.id = se.student_id
      WHERE se.class_id = $1 AND se.enrollment_status = 'active'
      ORDER BY s.register_number ASC
    `, [classId, subjectId]);

    // Calculate percentage
    const formatted = studentsRes.rows.map(s => {
      const total = parseInt(s.total_sessions, 10);
      const attended = parseInt(s.attended_sessions, 10);
      const percentage = total > 0 ? ((attended / total) * 100).toFixed(1) : '100.0';
      return {
        ...s,
        attendance_percentage: parseFloat(percentage),
      };
    });

    return successResponse(res, 'Students retrieved', formatted);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Record Attendance Session
 */
const recordAttendance = async (req, res, next) => {
  const client = await getClient();
  try {
    const { classId, subjectId, sessionDate, sessionPeriod, topicCovered, records } = req.body;
    const staffId = req.user.staffId;

    if (!classId || !subjectId || !sessionDate || !sessionPeriod || !Array.isArray(records)) {
      return errorResponse(res, 'Invalid attendance payload. Class, Subject, Date, Period and student records are required', 400);
    }

    // Verify assignment authorization
    const assignCheck = await client.query(
      `SELECT academic_year_id, semester_id FROM staff_subject_assignments
       WHERE staff_id = $1 AND class_id = $2 AND subject_id = $3 AND is_active = TRUE`,
      [staffId, classId, subjectId]
    );

    if (assignCheck.rowCount === 0 && req.user.role !== 'admin') {
      return errorResponse(res, 'Unauthorized: you are not allocated to teach this subject in this class', 403);
    }

    const { academic_year_id, semester_id } = assignCheck.rows[0];

    await client.query('BEGIN');

    // Create or retrieve session
    const sessionRes = await client.query(`
      INSERT INTO attendance_sessions (subject_id, class_id, staff_id, session_date, session_period, academic_year_id, semester_id, topic_covered)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (subject_id, class_id, session_date, session_period)
      DO UPDATE SET topic_covered = EXCLUDED.topic_covered, staff_id = EXCLUDED.staff_id
      RETURNING id
    `, [subjectId, classId, staffId, sessionDate, sessionPeriod, academic_year_id, semester_id, topicCovered || 'Class Lecture']);

    const sessionId = sessionRes.rows[0].id;

    // Insert student records
    for (const rec of records) {
      await client.query(`
        INSERT INTO attendance_records (session_id, student_id, status, remarks)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (session_id, student_id)
        DO UPDATE SET status = EXCLUDED.status, remarks = EXCLUDED.remarks
      `, [sessionId, rec.studentId, rec.status || 'present', rec.remarks || null]);
    }

    await client.query('COMMIT');
    return successResponse(res, 'Attendance recorded successfully', { sessionId, totalStudents: records.length }, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * Controller: Download Excel Marks Template
 */
const downloadExcelTemplate = async (req, res, next) => {
  try {
    const { classId, subjectId } = req.query;
    if (!classId || !subjectId) {
      return errorResponse(res, 'Both classId and subjectId query parameters are required', 400);
    }

    const buffer = await excelService.generateTemplate(parseInt(classId, 10), parseInt(subjectId, 10));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="marks_template_c${classId}_s${subjectId}.xlsx"`);
    return res.send(buffer);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Preview and Validate Uploaded Excel File
 */
const previewExcelMarks = async (req, res, next) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No Excel file uploaded. Please upload a .xlsx or .xls file', 400);
    }

    const { classId, subjectId } = req.body;
    if (!classId || !subjectId) {
      return errorResponse(res, 'classId and subjectId are required form fields', 400);
    }

    const staffId = req.user.staffId;
    const userRole = req.user.role;

    const validationResult = await excelService.parseAndValidateMarks(
      req.file.buffer,
      parseInt(classId, 10),
      parseInt(subjectId, 10),
      staffId,
      userRole
    );

    return successResponse(res, 'Excel parsed and validated successfully', validationResult);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Commit Validated Excel Marks
 */
const commitExcelMarks = async (req, res, next) => {
  try {
    const { classId, subjectId, validRows } = req.body;
    if (!classId || !subjectId || !Array.isArray(validRows) || validRows.length === 0) {
      return errorResponse(res, 'Valid rows array, classId and subjectId are required to commit marks', 400);
    }

    const staffId = req.user.staffId;
    const userRole = req.user.role;

    const result = await excelService.commitMarksTransaction({
      classId: parseInt(classId, 10),
      subjectId: parseInt(subjectId, 10),
      staffId,
      userRole,
      validRows
    });

    return successResponse(res, `Successfully imported and saved ${result.importedCount} assessment marks records`, result);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get Progress Card JSON Data for a Student
 */
const getStudentProgressCard = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const data = await progressCardService.getStudentProgressCardData(parseInt(studentId, 10));
    return successResponse(res, 'Progress card data retrieved', data);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Download Student Progress Card PDF
 */
const downloadProgressCardPDF = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const data = await progressCardService.getStudentProgressCardData(parseInt(studentId, 10));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="ProgressCard_${data.student.registerNumber}.pdf"`);

    await pdfService.generateProgressCardPDF(data, res);
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Get Students in Class for Progress Cards View
 */
const getClassProgressCardsList = async (req, res, next) => {
  try {
    const { classId } = req.query;
    if (!classId) {
      return errorResponse(res, 'classId query parameter is required', 400);
    }

    const studentsRes = await query(`
      SELECT s.id AS student_id, s.register_number, s.roll_no, s.first_name, s.last_name,
             c.section, c.batch_name, co.course_name, sem.semester_number, ay.year_name
      FROM student_enrollments se
      JOIN students s ON s.id = se.student_id
      JOIN classes c ON c.id = se.class_id
      JOIN courses co ON co.id = c.course_id
      JOIN semesters sem ON sem.id = se.semester_id
      JOIN academic_years ay ON ay.id = se.academic_year_id
      WHERE se.class_id = $1 AND se.enrollment_status = 'active'
      ORDER BY s.register_number ASC
    `, [classId]);

    return successResponse(res, 'Class students list for progress cards retrieved', studentsRes.rows);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboard,
  getClassStudents,
  recordAttendance,
  downloadExcelTemplate,
  previewExcelMarks,
  commitExcelMarks,
  getStudentProgressCard,
  downloadProgressCardPDF,
  getClassProgressCardsList,
};
