const { query } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const progressCardService = require('../services/progressCardService');
const pdfService = require('../services/pdfService');

/**
 * Controller: Parent Academic Portal Dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    const parentId = req.user.parentId;
    if (!parentId) {
      return errorResponse(res, 'Parent profile not associated with this account', 400);
    }

    // 1. Fetch all linked children for this parent
    const childrenRes = await query(`
      SELECT s.id AS student_id, s.register_number, s.roll_no, s.first_name, s.last_name, s.gender, s.phone,
             ps.relationship,
             d.name AS department_name, d.code AS department_code,
             c.id AS class_id, c.section, c.batch_name,
             co.course_name, sem.id AS semester_id, sem.semester_number, ay.year_name
      FROM parent_student ps
      JOIN students s ON s.id = ps.student_id
      JOIN departments d ON d.id = s.department_id
      LEFT JOIN student_enrollments se ON se.student_id = s.id AND se.enrollment_status = 'active'
      LEFT JOIN classes c ON c.id = se.class_id
      LEFT JOIN courses co ON co.id = c.course_id
      LEFT JOIN semesters sem ON sem.id = se.semester_id
      LEFT JOIN academic_years ay ON ay.id = se.academic_year_id
      WHERE ps.parent_id = $1
      ORDER BY s.first_name ASC
    `, [parentId]);

    if (childrenRes.rowCount === 0) {
      return successResponse(res, 'No students linked to this parent account', {
        children: [],
        selectedChild: null,
      });
    }

    // Determine target student: either from query param (if authorized) or first child
    const requestedStudentId = req.query.studentId ? parseInt(req.query.studentId, 10) : childrenRes.rows[0].student_id;

    // Strict Backend Security Check: verify requested student is linked to this parent!
    const targetChild = childrenRes.rows.find(c => c.student_id === requestedStudentId);
    if (!targetChild) {
      return errorResponse(res, 'Unauthorized access: You do not have permission to view academic records for this student', 403);
    }

    const { class_id, semester_id, student_id } = targetChild;

    // 2. Fetch marks for this ward
    const marksRes = await query(`
      SELECT sub.id AS subject_id, sub.subject_code, sub.subject_name, sub.credit, sub.max_internal_marks,
             a.id AS assessment_id, a.assessment_name, a.max_marks AS assessment_max_marks,
             am.marks_obtained, am.is_absent, am.remarks
      FROM subjects sub
      JOIN assessments a ON a.subject_id = sub.id AND a.class_id = $1 AND a.semester_id = $2
      LEFT JOIN assessment_marks am ON am.assessment_id = a.id AND am.student_id = $3
      WHERE sub.is_active = TRUE
      ORDER BY sub.subject_code ASC, a.assessment_name ASC
    `, [class_id, semester_id, student_id]);

    // 3. Fetch attendance for this ward
    const attendanceRes = await query(`
      SELECT sub.id AS subject_id, sub.subject_code, sub.subject_name,
             COUNT(ar.id) AS total_sessions,
             SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) AS attended_sessions
      FROM subjects sub
      JOIN attendance_sessions att ON att.subject_id = sub.id AND att.class_id = $1 AND att.semester_id = $2
      JOIN attendance_records ar ON ar.session_id = att.id AND ar.student_id = $3
      GROUP BY sub.id, sub.subject_code, sub.subject_name
      ORDER BY sub.subject_code ASC
    `, [class_id, semester_id, student_id]);

    // Map subjects
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
          status: pct >= 75.0 ? 'Eligible' : pct >= 65.0 ? 'Low (Attention Required)' : 'Critical Shortage',
        };
      }
    });

    const subjectsList = Object.values(subjectsMap);

    let marksTotal = 0;
    let maxTotal = 0;
    let sessionsTotal = 0;
    let sessionsAttended = 0;

    subjectsList.forEach(s => {
      marksTotal += s.totalMarksObtained;
      maxTotal += s.totalMaxMarks;
      sessionsTotal += s.attendance.totalSessions;
      sessionsAttended += s.attendance.attendedSessions;
    });

    const overallPct = maxTotal > 0 ? ((marksTotal / maxTotal) * 100).toFixed(1) : 0;
    const overallAtt = sessionsTotal > 0 ? ((sessionsAttended / sessionsTotal) * 100).toFixed(1) : 100.0;

    // 4. Fetch announcements targeted for parents
    const announcementsRes = await query(`
      SELECT id, title, content, is_pinned, created_at
      FROM announcements
      WHERE is_active = TRUE AND target_role IN ('all', 'parent')
      ORDER BY is_pinned DESC, created_at DESC
      LIMIT 5
    `);

    return successResponse(res, 'Parent dashboard data retrieved', {
      children: childrenRes.rows,
      selectedChild: targetChild,
      academicSummary: {
        totalSubjects: subjectsList.length,
        overallPercentage: parseFloat(overallPct),
        overallAttendance: parseFloat(overallAtt),
        attendanceStatus: parseFloat(overallAtt) >= 75 ? 'Satisfactory' : 'Action Required',
      },
      subjects: subjectsList,
      announcements: announcementsRes.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Controller: Download Ward Progress Card PDF
 */
const downloadWardProgressCardPDF = async (req, res, next) => {
  try {
    const parentId = req.user.parentId;
    const { studentId } = req.params;

    if (!parentId) {
      return errorResponse(res, 'Parent profile not linked to this account', 400);
    }

    // Verify parent is linked to this specific student
    const checkLink = await query(
      `SELECT id FROM parent_student WHERE parent_id = $1 AND student_id = $2`,
      [parentId, parseInt(studentId, 10)]
    );

    if (checkLink.rowCount === 0 && req.user.role !== 'admin') {
      return errorResponse(res, 'Unauthorized access to student academic progress card', 403);
    }

    const data = await progressCardService.getStudentProgressCardData(parseInt(studentId, 10));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="ProgressCard_${data.student.registerNumber}.pdf"`);

    await pdfService.generateProgressCardPDF(data, res);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboard,
  downloadWardProgressCardPDF,
};
