const { query } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const progressCardService = require('../services/progressCardService');
const pdfService = require('../services/pdfService');

/**
 * Controller: Student Academic Dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    const studentId = req.user.studentId;
    if (!studentId) {
      return errorResponse(res, 'Student profile not linked to this account', 400);
    }

    // 1. Fetch Student Details & Active Enrollment
    const studentInfo = await query(`
      SELECT s.id, s.register_number, s.roll_no, s.first_name, s.last_name, s.gender, s.dob, s.phone,
             d.code AS department_code, d.name AS department_name,
             c.id AS class_id, c.section, c.batch_name, c.room_number,
             co.course_name, co.course_code,
             sem.id AS semester_id, sem.semester_number, sem.semester_type,
             ay.id AS academic_year_id, ay.year_name
      FROM students s
      JOIN departments d ON d.id = s.department_id
      LEFT JOIN student_enrollments se ON se.student_id = s.id AND se.enrollment_status = 'active'
      LEFT JOIN classes c ON c.id = se.class_id
      LEFT JOIN courses co ON co.id = c.course_id
      LEFT JOIN semesters sem ON sem.id = se.semester_id
      LEFT JOIN academic_years ay ON ay.id = se.academic_year_id
      WHERE s.id = $1
    `, [studentId]);

    if (studentInfo.rowCount === 0) {
      return errorResponse(res, 'Student record not found', 404);
    }

    const student = studentInfo.rows[0];
    const classId = student.class_id;
    const semesterId = student.semester_id;

    // 2. Fetch Subject-wise Internal Marks & Assessments
    const marksRes = await query(`
      SELECT sub.id AS subject_id, sub.subject_code, sub.subject_name, sub.credit, sub.max_internal_marks,
             a.id AS assessment_id, a.assessment_name, a.max_marks AS assessment_max_marks,
             am.marks_obtained, am.is_absent, am.remarks
      FROM subjects sub
      JOIN assessments a ON a.subject_id = sub.id AND a.class_id = $1 AND a.semester_id = $2
      LEFT JOIN assessment_marks am ON am.assessment_id = a.id AND am.student_id = $3
      WHERE sub.is_active = TRUE
      ORDER BY sub.subject_code ASC, a.assessment_name ASC
    `, [classId, semesterId, studentId]);

    // 3. Fetch Subject-wise Attendance Statistics
    const attendanceRes = await query(`
      SELECT sub.id AS subject_id, sub.subject_code, sub.subject_name,
             COUNT(ar.id) AS total_sessions,
             SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) AS attended_sessions
      FROM subjects sub
      JOIN attendance_sessions att ON att.subject_id = sub.id AND att.class_id = $1 AND att.semester_id = $2
      JOIN attendance_records ar ON ar.session_id = att.id AND ar.student_id = $3
      GROUP BY sub.id, sub.subject_code, sub.subject_name
      ORDER BY sub.subject_code ASC
    `, [classId, semesterId, studentId]);

    // Structure subjects with their assessments and attendance
    const subjectsMap = {};

    marksRes.rows.forEach(row => {
      if (!subjectsMap[row.subject_id]) {
        subjectsMap[row.subject_id] = {
          subjectId: row.subject_id,
          subjectCode: row.subject_code,
          subjectName: row.subject_name,
          credit: parseFloat(row.credit),
          maxInternalMarks: parseFloat(row.max_internal_marks),
          assessments: [],
          totalMarksObtained: 0,
          totalMaxMarks: 0,
          attendance: {
            totalSessions: 0,
            attendedSessions: 0,
            percentage: 100.0,
            status: 'Normal',
          }
        };
      }

      if (row.assessment_id) {
        const marks = row.is_absent ? 0 : parseFloat(row.marks_obtained || 0);
        const maxM = parseFloat(row.assessment_max_marks || 0);
        subjectsMap[row.subject_id].assessments.push({
          assessmentId: row.assessment_id,
          name: row.assessment_name,
          marksObtained: row.is_absent ? 'Absent' : marks,
          maxMarks: maxM,
          remarks: row.remarks || '',
        });
        subjectsMap[row.subject_id].totalMarksObtained += marks;
        subjectsMap[row.subject_id].totalMaxMarks += maxM;
      }
    });

    // Populate attendance details into subjects
    attendanceRes.rows.forEach(attRow => {
      const sub = subjectsMap[attRow.subject_id];
      if (sub) {
        const total = parseInt(attRow.total_sessions, 10);
        const attended = parseInt(attRow.attended_sessions, 10);
        const pct = total > 0 ? parseFloat(((attended / total) * 100).toFixed(1)) : 100.0;
        sub.attendance = {
          totalSessions: total,
          attendedSessions: attended,
          percentage: pct,
          status: pct >= 75.0 ? 'Eligible' : pct >= 65.0 ? 'Low (Condonation)' : 'Critical Shortage',
        };
      }
    });

    const subjectsList = Object.values(subjectsMap);

    // Compute overall statistics
    let overallMarksSum = 0;
    let overallMaxSum = 0;
    let overallSessionsTotal = 0;
    let overallSessionsAttended = 0;

    subjectsList.forEach(s => {
      overallMarksSum += s.totalMarksObtained;
      overallMaxSum += s.totalMaxMarks;
      overallSessionsTotal += s.attendance.totalSessions;
      overallSessionsAttended += s.attendance.attendedSessions;
    });

    const overallPercentage = overallMaxSum > 0 ? ((overallMarksSum / overallMaxSum) * 100).toFixed(1) : 0;
    const overallAttendance = overallSessionsTotal > 0 ? ((overallSessionsAttended / overallSessionsTotal) * 100).toFixed(1) : 100.0;

    // 4. Role-specific announcements
    const announcementsRes = await query(`
      SELECT id, title, content, is_pinned, created_at
      FROM announcements
      WHERE is_active = TRUE AND target_role IN ('all', 'student')
      ORDER BY is_pinned DESC, created_at DESC
      LIMIT 5
    `);

    // 5. Course Instructors allocated to this class
    let instructors = [];
    try {
      const instructorsRes = await query(`
        SELECT DISTINCT st.id, st.first_name, st.last_name, st.designation, st.qualification,
               sub.subject_code, sub.subject_name
        FROM staff_subject_assignments ssa
        JOIN staff st ON st.id = ssa.staff_id
        JOIN subjects sub ON sub.id = ssa.subject_id
        WHERE ssa.class_id = $1 AND ssa.is_active = TRUE
        ORDER BY sub.subject_code ASC
      `, [classId]);
      instructors = instructorsRes.rows;
    } catch (e) {
      instructors = [];
    }

    return successResponse(res, 'Student academic dashboard data retrieved', {
      student,
      academicSummary: {
        totalSubjects: subjectsList.length,
        overallPercentage: parseFloat(overallPercentage),
        overallAttendance: parseFloat(overallAttendance),
        attendanceStatus: parseFloat(overallAttendance) >= 75 ? 'Satisfactory' : 'Action Required',
      },
      subjects: subjectsList,
      instructors,
      announcements: announcementsRes.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Student Progress Card PDF Download
 */
const downloadProgressCardPDF = async (req, res, next) => {
  try {
    const studentId = req.user.studentId;
    if (!studentId) {
      return errorResponse(res, 'Student profile not linked to this account', 400);
    }

    const data = await progressCardService.getStudentProgressCardData(studentId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="ProgressCard_${data.student.registerNumber}.pdf"`);

    await pdfService.generateProgressCardPDF(data, res);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboard,
  downloadProgressCardPDF,
};
