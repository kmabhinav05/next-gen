const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const dotenv = require('dotenv');
const { Writable } = require('stream');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const progressCardService = require('../src/services/progressCardService');
const pdfService = require('../src/services/pdfService');

test('Progress Cards & PDF Generation Service', async (t) => {

  await t.test('1. getStudentProgressCardData retrieves and computes full academic card for Alex Turner (ID 1)', async () => {
    const data = await progressCardService.getStudentProgressCardData(1);

    assert.ok(data.institution.name.includes('METROPOLITAN INSTITUTE'));
    assert.equal(data.student.registerNumber, 'REG2023CSE001');
    assert.equal(data.student.name, 'Alex Turner');
    assert.ok(Array.isArray(data.subjects) && data.subjects.length > 0);

    // Verify summary computations
    assert.ok(typeof data.summary.overallMarksPct === 'number');
    assert.ok(typeof data.summary.overallAttPct === 'number');
    assert.ok(data.summary.totalConductedSessions >= 0);
    assert.ok(data.summary.totalAttendedSessions >= 0);
  });

  await t.test('2. generateProgressCardPDF streams a valid PDF document without errors', async () => {
    const data = await progressCardService.getStudentProgressCardData(1);

    const chunks = [];
    const memoryStream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk);
        callback();
      }
    });

    await pdfService.generateProgressCardPDF(data, memoryStream);

    const pdfBuffer = Buffer.concat(chunks);
    assert.ok(pdfBuffer.length > 1000, `PDF should be substantial in size, got ${pdfBuffer.length} bytes`);
    
    // PDF Magic bytes '%PDF'
    const magic = pdfBuffer.slice(0, 4).toString('utf-8');
    assert.equal(magic, '%PDF');
  });
});
