const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const dotenv = require('dotenv');
const ExcelJS = require('exceljs');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const excelService = require('../src/services/excelService');
const { query } = require('../src/config/db');

test('Excel Marks Service: Template Generation and Validation', async (t) => {

  await t.test('1. generateTemplate creates a valid styled workbook for class 1 and subject 1', async () => {
    const buffer = await excelService.generateTemplate(1, 1);
    assert.ok(buffer && buffer.length > 0, 'Buffer should not be empty');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const sheet = workbook.getWorksheet('Marks_Entry');
    assert.ok(sheet, 'Worksheet Marks_Entry should exist');

    // Check title banner
    assert.ok(sheet.getCell('A1').value.includes('INTERNAL ASSESSMENT ENTRY TEMPLATE'));
    // Check pre-populated student
    const regCell = sheet.getCell('A6').value;
    assert.ok(regCell.startsWith('REG2023CSE'), `Expected student register number in cell A6, got: ${regCell}`);
  });

  await t.test('2. parseAndValidateMarks detects invalid marks and missing data correctly', async () => {
    // Construct an Excel workbook with 1 valid row and 2 error rows
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Marks_Entry');

    // Header row at row 5
    ws.getRow(5).values = ['Register Number', 'Roll No', 'Student Name', 'Assessment Name', 'Max Marks', 'Marks Obtained', 'Is Absent (Y/N)', 'Remarks'];
    
    // Row 6: Valid row
    ws.getRow(6).values = ['REG2023CSE001', '1', 'Alex Turner', 'Internal Assessment 1', 50, 42.5, 'N', 'Good'];

    // Row 7: Invalid marks (> max marks)
    ws.getRow(7).values = ['REG2023CSE002', '2', 'Bella Chen', 'Internal Assessment 1', 50, 65, 'N', 'Exceeds'];

    // Row 8: Non-existent student
    ws.getRow(8).values = ['REG999999999', '99', 'Ghost Student', 'Internal Assessment 1', 50, 30, 'N', 'Fake'];

    const buffer = await wb.xlsx.writeBuffer();

    const result = await excelService.parseAndValidateMarks(buffer, 1, 1, 1, 'admin');

    assert.equal(result.summary.totalRows, 3);
    assert.equal(result.summary.validCount, 1);
    assert.equal(result.summary.errorCount, 2);
    assert.equal(result.summary.isValid, false);

    assert.equal(result.validRows[0].registerNumber, 'REG2023CSE001');
    assert.equal(result.validRows[0].marksObtained, 42.5);

    // Verify row 7 error
    const row7Err = result.errors.find(e => e.rowNumber === 7);
    assert.ok(row7Err.issues.some(msg => msg.includes('exceeds Maximum Marks')));

    // Verify row 8 error
    const row8Err = result.errors.find(e => e.rowNumber === 8);
    assert.ok(row8Err.issues.some(msg => msg.includes('not actively enrolled')));
  });

  await t.test('3. commitMarksTransaction atomically commits valid marks to database', async () => {
    const validRows = [
      {
        rowNumber: 6,
        studentId: 1,
        registerNumber: 'REG2023CSE001',
        studentName: 'Alex Turner',
        assessmentName: 'Unit Test Alpha',
        maxMarks: 25,
        marksObtained: 23.5,
        isAbsent: false,
        remarks: 'Excellent work',
      }
    ];

    const result = await excelService.commitMarksTransaction({
      classId: 1,
      subjectId: 1,
      staffId: 1,
      userRole: 'admin',
      validRows,
    });

    assert.equal(result.success, true);
    assert.equal(result.importedCount, 1);

    // Verify record in PostgreSQL database
    const checkDb = await query(`
      SELECT am.marks_obtained, am.is_absent, a.assessment_name, a.max_marks
      FROM assessment_marks am
      JOIN assessments a ON a.id = am.assessment_id
      WHERE am.student_id = 1 AND a.assessment_name = 'Unit Test Alpha'
    `);

    assert.equal(checkDb.rowCount, 1);
    assert.equal(parseFloat(checkDb.rows[0].marks_obtained), 23.5);
    assert.equal(parseFloat(checkDb.rows[0].max_marks), 25);
  });
});
