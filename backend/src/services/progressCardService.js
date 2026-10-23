const { query } = require('../config/db');

/**
 * Service to aggregate official Student Progress Card data
 */
const getStudentProgressCardData = async (studentId, options = {}) => {
  // 1. Fetch Student Details & Academic Enrollment
  const studentRes = await query(`
    SELECT s.id, s.register_number, s.roll_no, s.first_name, s.last_name, s.dob, s.gender,
           d.name AS department_name, d.code AS department_code,
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

  if (studentRes.rowCount === 0) {
    throw new Error('Student not found');
  }

  const student = studentRes.rows[0];
  const { class_id: classId, semester_id: semesterId } = student;

  if (!classId || !semesterId) {
    throw new Error('Student is not actively enrolled in a class or semester');
  }

  // 2. Fetch all subjects for this department & semester
  const subjectsRes = await query(`
    SELECT sub.id, sub.subject_code, sub.subject_name, sub.credit, sub.max_internal_marks, sub.is_elective
    FROM subjects sub
    WHERE sub.department_id = (SELECT department_id FROM students WHERE id = $1)
      AND sub.is_active = TRUE
    ORDER BY sub.subject_code ASC
  `, [studentId]);

  // 3. Fetch marks scored by this student in all assessments for this class & semester
  const marksRes = await query(`
    SELECT a.subject_id, a.assessment_name, a.max_marks,
           am.marks_obtained, am.is_absent, am.remarks,
           st.first_name AS staff_first_name, st.last_name AS staff_last_name
    FROM assessments a
    LEFT JOIN assessment_marks am ON am.assessment_id = a.id AND am.student_id = $1
    LEFT JOIN staff st ON st.id = am.entered_by_staff_id
    WHERE a.class_id = $2 AND a.semester_id = $3
    ORDER BY a.subject_id ASC, a.assessment_name ASC
  `, [studentId, classId, semesterId]);

  // Group marks by subject_id
  const marksBySubject = {};
  marksRes.rows.forEach(m => {
    if (!marksBySubject[m.subject_id]) {
      marksBySubject[m.subject_id] = [];
    }
    marksBySubject[m.subject_id].push({
      assessmentName: m.assessment_name,
      maxMarks: parseFloat(m.max_marks),
      marksObtained: m.is_absent ? 0 : (m.marks_obtained !== null ? parseFloat(m.marks_obtained) : null),
      isAbsent: m.is_absent,
      remarks: m.remarks || '',
      staffName: m.staff_first_name ? `${m.staff_first_name} ${m.staff_last_name}` : null
    });
  });

  // 4. Fetch Attendance Sessions and Records for this student in this class & semester
  const attendanceRes = await query(`
    SELECT att.subject_id,
           COUNT(att.id) AS total_sessions,
           SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) AS attended_sessions,
           SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) AS late_sessions
    FROM attendance_sessions att
    JOIN attendance_records ar ON ar.session_id = att.id AND ar.student_id = $1
    WHERE att.class_id = $2 AND att.semester_id = $3
    GROUP BY att.subject_id
  `, [studentId, classId, semesterId]);

  const attBySubject = {};
  attendanceRes.rows.forEach(a => {
    const total = parseInt(a.total_sessions, 10);
    const attended = parseInt(a.attended_sessions, 10);
    const late = parseInt(a.late_sessions, 10);
    const pct = total > 0 ? parseFloat(((attended / total) * 100).toFixed(1)) : 100.0;
    attBySubject[a.subject_id] = {
      totalSessions: total,
      attendedSessions: attended,
      lateSessions: late,
      percentage: pct,
    };
  });

  // 5. Build subject-wise card rows
  let totalCredits = 0;
  let totalScoredMarks = 0;
  let totalMaxInternalMarks = 0;
  let totalConductedSessions = 0;
  let totalAttendedSessions = 0;

  const subjectRows = subjectsRes.rows.map(sub => {
    const assessments = marksBySubject[sub.id] || [];
    const att = attBySubject[sub.id] || { totalSessions: 0, attendedSessions: 0, percentage: 100.0 };

    let subjectScoredSum = 0;
    let subjectMaxSum = 0;
    let hasMarks = false;

    assessments.forEach(a => {
      if (a.marksObtained !== null) {
        hasMarks = true;
        subjectScoredSum += a.marksObtained;
        subjectMaxSum += a.maxMarks;
      }
    });

    const subjectPct = subjectMaxSum > 0 ? parseFloat(((subjectScoredSum / subjectMaxSum) * 100).toFixed(1)) : null;

    totalCredits += parseFloat(sub.credit);
    totalScoredMarks += subjectScoredSum;
    totalMaxInternalMarks += subjectMaxSum;
    totalConductedSessions += att.totalSessions;
    totalAttendedSessions += att.attendedSessions;

    // Attendance Eligibility
    let attEligibility = 'Eligible';
    if (att.totalSessions > 0) {
      if (att.percentage < 65) {
        attEligibility = 'Critical Shortage';
      } else if (att.percentage < 75) {
        attEligibility = 'Condonation Required';
      }
    }

    return {
      subjectId: sub.id,
      subjectCode: sub.subject_code,
      subjectName: sub.subject_name,
      credit: parseFloat(sub.credit),
      maxInternalMarks: parseFloat(sub.max_internal_marks),
      assessments,
      totalScored: hasMarks ? subjectScoredSum : 'N/A',
      totalMax: subjectMaxSum > 0 ? subjectMaxSum : parseFloat(sub.max_internal_marks),
      percentage: subjectPct,
      attendance: {
        totalSessions: att.totalSessions,
        attendedSessions: att.attendedSessions,
        percentage: att.percentage,
        eligibility: attEligibility
      }
    };
  });

  const overallMarksPct = totalMaxInternalMarks > 0
    ? parseFloat(((totalScoredMarks / totalMaxInternalMarks) * 100).toFixed(1))
    : 0;

  const overallAttPct = totalConductedSessions > 0
    ? parseFloat(((totalAttendedSessions / totalConductedSessions) * 100).toFixed(1))
    : 100.0;

  let overallStatus = 'Eligible for End-Semester Examinations';
  if (overallAttPct < 65) {
    overallStatus = 'Shortage of Attendance - Detained from Examination';
  } else if (overallAttPct < 75) {
    overallStatus = 'Shortage of Attendance - Needs Condonation Application';
  }

  return {
    institution: {
      name: 'METROPOLITAN INSTITUTE OF SCIENCE AND TECHNOLOGY',
      accreditation: 'Autonomous Institution • Approved by AICTE • Affiliated to State Technological University',
      department: student.department_name,
      departmentCode: student.department_code,
    },
    student: {
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
      registerNumber: student.register_number,
      rollNo: student.roll_no || '-',
      gender: student.gender,
      className: `${student.batch_name} - Section ${student.section}`,
      semester: `Semester ${student.semester_number} (${student.semester_type || 'Regular'})`,
      academicYear: student.year_name,
    },
    subjects: subjectRows,
    summary: {
      totalCredits,
      totalScoredMarks,
      totalMaxInternalMarks,
      overallMarksPct,
      totalConductedSessions,
      totalAttendedSessions,
      overallAttPct,
      overallStatus,
      isAttendanceShortage: overallAttPct < 75,
    },
    generatedAt: new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  };
};

module.exports = {
  getStudentProgressCardData,
};
