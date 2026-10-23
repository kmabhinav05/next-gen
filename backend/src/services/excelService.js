const ExcelJS = require('exceljs');
const { query, getClient } = require('../config/db');

/**
 * Excel Service for Academic Department Assistance System
 * Handles downloadable templates, file parsing, multi-point validation, and transactional commits.
 */

/**
 * Generate a downloadable Excel template for a class and subject
 */
const generateTemplate = async (classId, subjectId) => {
  // Fetch subject and class metadata
  const metaRes = await query(`
    SELECT sub.subject_code, sub.subject_name, sub.max_internal_marks,
           c.section, c.batch_name, co.course_code, sem.semester_number, ay.year_name
    FROM subjects sub
    CROSS JOIN classes c
    JOIN courses co ON co.id = c.course_id
    JOIN semesters sem ON sem.id = c.semester_id
    JOIN academic_years ay ON ay.id = c.academic_year_id
    WHERE sub.id = $1 AND c.id = $2
  `, [subjectId, classId]);

  if (metaRes.rowCount === 0) {
    throw new Error('Invalid Subject or Class ID');
  }

  const meta = metaRes.rows[0];

  // Fetch enrolled students
  const studentsRes = await query(`
    SELECT s.id, s.register_number, s.roll_no, s.first_name, s.last_name
    FROM student_enrollments se
    JOIN students s ON s.id = se.student_id
    WHERE se.class_id = $1 AND se.enrollment_status = 'active'
    ORDER BY s.register_number ASC
  `, [classId]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Next Gen Grading System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Marks_Entry', {
    properties: { tabColor: { argb: '0F172A' } },
    views: [{ state: 'frozen', ySplit: 5 }]
  });

  // Sheet Title Banner
  worksheet.mergeCells('A1:G1');
  worksheet.getCell('A1').value = `NEXT GEN GRADING - INTERNAL ASSESSMENT ENTRY TEMPLATE`;
  worksheet.getCell('A1').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFF' } };
  worksheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0F172A' } };
  worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 30;

  // Metadata Subheader
  worksheet.mergeCells('A2:G2');
  worksheet.getCell('A2').value = `Subject: ${meta.subject_code} - ${meta.subject_name} | Class: ${meta.batch_name} Sec ${meta.section} (Sem ${meta.semester_number}) | Year: ${meta.year_name}`;
  worksheet.getCell('A2').font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FFFFFF' } };
  worksheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
  worksheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(2).height = 22;

  // Instruction banner
  worksheet.mergeCells('A3:G3');
  worksheet.getCell('A3').value = `Instructions: Fill in Assessment Name (e.g. IA-1, IA-2, Assignment), Max Marks, Marks Obtained. Set 'Is Absent' to 'Y' if student was absent.`;
  worksheet.getCell('A3').font = { name: 'Arial', size: 9, bold: true, color: { argb: '065F46' } };
  worksheet.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D1FAE5' } };
  worksheet.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(3).height = 20;

  worksheet.getRow(4).height = 10; // blank separator row

  // Table Columns Header
  const headers = [
    { header: 'Register Number', key: 'reg_no', width: 22 },
    { header: 'Roll No', key: 'roll_no', width: 14 },
    { header: 'Student Name', key: 'student_name', width: 28 },
    { header: 'Assessment Name', key: 'assessment_name', width: 26 },
    { header: 'Max Marks', key: 'max_marks', width: 14 },
    { header: 'Marks Obtained', key: 'marks_obtained', width: 16 },
    { header: 'Is Absent (Y/N)', key: 'is_absent', width: 16 },
    { header: 'Remarks', key: 'remarks', width: 28 },
  ];

  const headerRow = worksheet.getRow(5);
  headers.forEach((h, idx) => {
    worksheet.getColumn(idx + 1).width = h.width;
    const cell = headerRow.getCell(idx + 1);
    cell.value = h.header;
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0D9488' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: '0F172A' } },
      bottom: { style: 'medium', color: { argb: '0F172A' } },
      left: { style: 'thin', color: { argb: 'CCCCCC' } },
      right: { style: 'thin', color: { argb: 'CCCCCC' } },
    };
  });
  headerRow.height = 25;

  // Populate enrolled students
  let currentRow = 6;
  studentsRes.rows.forEach(s => {
    const row = worksheet.getRow(currentRow);
    row.getCell(1).value = s.register_number;
    row.getCell(2).value = s.roll_no || '-';
    row.getCell(3).value = `${s.first_name} ${s.last_name}`;
    row.getCell(4).value = 'Internal Assessment 1';
    row.getCell(5).value = 50;
    row.getCell(6).value = ''; // To be filled by faculty
    row.getCell(7).value = 'N';
    row.getCell(8).value = '';

    // Zebra striping and borders
    const isEven = currentRow % 2 === 0;
    for (let c = 1; c <= 8; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = { vertical: 'middle', horizontal: c <= 3 ? 'left' : 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'E2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
        left: { style: 'thin', color: { argb: 'E2E8F0' } },
        right: { style: 'thin', color: { argb: 'E2E8F0' } },
      };
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };
      }
    }
    row.height = 20;
    currentRow++;
  });

  return await workbook.xlsx.writeBuffer();
};

/**
 * Parse and validate uploaded marks Excel file without committing
 */
const parseAndValidateMarks = async (fileBuffer, classId, subjectId, staffId, userRole) => {
  // 1. Authorization check: ensure staff is assigned to this course
  if (userRole !== 'admin') {
    const assignCheck = await query(`
      SELECT academic_year_id, semester_id 
      FROM staff_subject_assignments
      WHERE staff_id = $1 AND class_id = $2 AND subject_id = $3 AND is_active = TRUE
    `, [staffId, classId, subjectId]);

    if (assignCheck.rowCount === 0) {
      throw new Error('Unauthorized: You are not assigned to enter marks for this subject and class');
    }
  }

  // 2. Fetch active enrolled students for validation
  const enrolledRes = await query(`
    SELECT s.id, s.register_number, s.first_name, s.last_name
    FROM student_enrollments se
    JOIN students s ON s.id = se.student_id
    WHERE se.class_id = $1 AND se.enrollment_status = 'active'
  `, [classId]);

  const studentMap = new Map();
  enrolledRes.rows.forEach(s => {
    studentMap.set(s.register_number.trim().toUpperCase(), s);
  });

  // 3. Read Workbook with ExcelJS
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('The uploaded Excel file contains no worksheets');
  }

  const validRows = [];
  const errors = [];
  const seenStudentAssessments = new Set();

  // Find header row (search for Register Number)
  let headerRowIndex = 5;
  for (let r = 1; r <= 10; r++) {
    const row = worksheet.getRow(r);
    for (let c = 1; c <= 8; c++) {
      const val = String(row.getCell(c).value || '').trim().toLowerCase();
      if (val.includes('register number') || val.includes('reg no')) {
        headerRowIndex = r;
        break;
      }
    }
    if (headerRowIndex === r) break;
  }

  // Iterate through data rows
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRowIndex) return; // skip header and title rows

    const regNoRaw = row.getCell(1).text || String(row.getCell(1).value || '');
    const regNo = regNoRaw.trim().toUpperCase();

    // Skip empty trailing rows
    if (!regNo) return;

    const studentName = row.getCell(3).text || String(row.getCell(3).value || '').trim();
    const assessmentName = (row.getCell(4).text || String(row.getCell(4).value || '')).trim();
    const maxMarksVal = row.getCell(5).value;
    const marksObtVal = row.getCell(6).value;
    const isAbsentVal = String(row.getCell(7).value || '').trim().toUpperCase();
    const remarks = String(row.getCell(8).value || '').trim();

    const rowErrors = [];

    // Validation 1: Student enrolled check
    const student = studentMap.get(regNo);
    if (!student) {
      rowErrors.push(`Student with Register Number '${regNo}' is not actively enrolled in this class`);
    }

    // Validation 2: Assessment name
    if (!assessmentName) {
      rowErrors.push('Assessment Name is required');
    }

    // Validation 3: Duplicate entry check in same file
    const uniqueKey = `${regNo}_${assessmentName.toLowerCase()}`;
    if (seenStudentAssessments.has(uniqueKey)) {
      rowErrors.push(`Duplicate entry for student ${regNo} in assessment '${assessmentName}'`);
    } else {
      seenStudentAssessments.add(uniqueKey);
    }

    // Validation 4: Max marks check
    const maxMarks = parseFloat(maxMarksVal);
    if (isNaN(maxMarks) || maxMarks <= 0) {
      rowErrors.push(`Invalid Max Marks '${maxMarksVal}'. Must be a positive number`);
    }

    // Validation 5: Marks obtained / Absent check
    const isAbsent = isAbsentVal === 'Y' || isAbsentVal === 'YES' || isAbsentVal === 'TRUE';
    let marksObtained = 0;

    if (!isAbsent) {
      if (marksObtVal === null || marksObtVal === undefined || marksObtVal === '') {
        rowErrors.push('Marks Obtained is empty while Is Absent is not set to Y');
      } else {
        marksObtained = parseFloat(marksObtVal);
        if (isNaN(marksObtained) || marksObtained < 0) {
          rowErrors.push(`Invalid Marks Obtained '${marksObtVal}'. Must be a non-negative number`);
        } else if (!isNaN(maxMarks) && marksObtained > maxMarks) {
          rowErrors.push(`Marks Obtained (${marksObtained}) exceeds Maximum Marks (${maxMarks})`);
        }
      }
    }

    if (rowErrors.length > 0) {
      errors.push({
        rowNumber,
        registerNumber: regNo,
        studentName,
        assessmentName,
        issues: rowErrors,
      });
    } else {
      validRows.push({
        rowNumber,
        studentId: student.id,
        registerNumber: regNo,
        studentName: `${student.first_name} ${student.last_name}`,
        assessmentName,
        maxMarks,
        marksObtained: isAbsent ? 0 : marksObtained,
        isAbsent,
        remarks: remarks || null,
      });
    }
  });

  return {
    summary: {
      totalRows: validRows.length + errors.length,
      validCount: validRows.length,
      errorCount: errors.length,
      isValid: errors.length === 0 && validRows.length > 0,
    },
    validRows,
    errors,
  };
};

/**
 * Commit validated marks into PostgreSQL using a strict ACID transaction
 */
const commitMarksTransaction = async ({ classId, subjectId, staffId, userRole, validRows }) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Retrieve class academic_year and semester
    const classMetaRes = await client.query(`
      SELECT semester_id, academic_year_id FROM classes WHERE id = $1
    `, [classId]);

    if (classMetaRes.rowCount === 0) {
      throw new Error('Class not found');
    }

    const { semester_id: semesterId, academic_year_id: academicYearId } = classMetaRes.rows[0];

    // Authorization verification
    if (userRole !== 'admin') {
      const authCheck = await client.query(`
        SELECT id FROM staff_subject_assignments
        WHERE staff_id = $1 AND class_id = $2 AND subject_id = $3 AND is_active = TRUE
      `, [staffId, classId, subjectId]);

      if (authCheck.rowCount === 0) {
        throw new Error('Unauthorized to record assessment marks for this class');
      }
    }

    // Cache of assessment_id by assessment_name
    const assessmentIdCache = new Map();

    let insertedOrUpdatedCount = 0;

    for (const row of validRows) {
      let assessmentId = assessmentIdCache.get(row.assessmentName);

      if (!assessmentId) {
        // Upsert assessment entity
        const assessRes = await client.query(`
          INSERT INTO assessments (subject_id, class_id, semester_id, academic_year_id, assessment_name, max_marks, created_by_staff_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (subject_id, class_id, semester_id, assessment_name)
          DO UPDATE SET max_marks = EXCLUDED.max_marks
          RETURNING id
        `, [subjectId, classId, semesterId, academicYearId, row.assessmentName, row.maxMarks, staffId]);

        assessmentId = assessRes.rows[0].id;
        assessmentIdCache.set(row.assessmentName, assessmentId);
      }

      // Upsert individual student mark
      await client.query(`
        INSERT INTO assessment_marks (assessment_id, student_id, marks_obtained, is_absent, remarks, entered_by_staff_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (assessment_id, student_id)
        DO UPDATE SET marks_obtained = EXCLUDED.marks_obtained,
                      is_absent = EXCLUDED.is_absent,
                      remarks = EXCLUDED.remarks,
                      entered_by_staff_id = EXCLUDED.entered_by_staff_id,
                      updated_at = CURRENT_TIMESTAMP
      `, [assessmentId, row.studentId, row.marksObtained, row.isAbsent, row.remarks, staffId]);

      insertedOrUpdatedCount++;
    }

    // Audit log
    await client.query(`
      INSERT INTO activity_logs (user_id, action_type, entity_name, entity_id, details)
      VALUES ($1, 'IMPORT_MARKS_EXCEL', 'assessments', $2, $3)
    `, [
      staffId,
      subjectId,
      JSON.stringify({ classId, subjectId, totalRowsImported: insertedOrUpdatedCount })
    ]);

    await client.query('COMMIT');
    return {
      success: true,
      importedCount: insertedOrUpdatedCount,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  generateTemplate,
  parseAndValidateMarks,
  commitMarksTransaction,
};
