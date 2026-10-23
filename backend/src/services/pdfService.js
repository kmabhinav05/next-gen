const PDFDocument = require('pdfkit');

/**
 * Generate a PDF Student Progress Card using PDFKit
 * @param {Object} cardData - Data from progressCardService.getStudentProgressCardData
 * @param {WritableStream} outputStream - Express response or file stream
 */
const generateProgressCardPDF = (cardData, outputStream) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 36, // 0.5 in
        info: {
          Title: `Progress Card - ${cardData.student.registerNumber}`,
          Author: 'Next Gen Grading System',
          Subject: 'Official Student Progress Report',
        }
      });

      doc.pipe(outputStream);

      // Colors
      const primaryNavy = '#0F172A';
      const accentTeal = '#0D9488';
      const textDark = '#1E293B';
      const textMuted = '#64748B';
      const borderGray = '#CBD5E1';
      const rowAlt = '#F8FAFC';

      // --- HEADER ---
      doc.rect(36, 36, 523, 70).fill(primaryNavy);

      doc.fillColor('#FFFFFF')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text('METROPOLITAN INSTITUTE OF SCIENCE & TECHNOLOGY', 36, 48, { align: 'center', width: 523 });

      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#94A3B8')
         .text('Autonomous Institution • Approved by AICTE • Affiliated to State Technological University', 36, 66, { align: 'center', width: 523 });

      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor(accentTeal)
         .text(`DEPARTMENT OF ${cardData.institution.department.toUpperCase()}`, 36, 80, { align: 'center', width: 523 });

      // Sub-banner
      doc.rect(36, 110, 523, 24).fill('#F1F5F9');
      doc.fillColor(primaryNavy)
         .fontSize(10)
         .font('Helvetica-Bold')
         .text('OFFICIAL CONTINUOUS ASSESSMENT & ATTENDANCE PROGRESS CARD', 36, 117, { align: 'center', width: 523 });

      // --- STUDENT PROFILE BOX ---
      const profileTop = 142;
      doc.rect(36, profileTop, 523, 62).strokeColor(borderGray).lineWidth(1).stroke();
      doc.rect(36, profileTop, 523, 62).fillColor('#FFFFFF').fill();
      doc.rect(36, profileTop, 523, 62).strokeColor(borderGray).lineWidth(1).stroke();

      doc.fontSize(9).font('Helvetica-Bold').fillColor(primaryNavy);
      doc.text('Student Name:', 46, profileTop + 10);
      doc.font('Helvetica').fillColor(textDark).text(cardData.student.name, 125, profileTop + 10);

      doc.font('Helvetica-Bold').fillColor(primaryNavy).text('Register No:', 320, profileTop + 10);
      doc.font('Helvetica').fillColor(textDark).text(cardData.student.registerNumber, 395, profileTop + 10);

      doc.font('Helvetica-Bold').fillColor(primaryNavy).text('Class / Batch:', 46, profileTop + 26);
      doc.font('Helvetica').fillColor(textDark).text(cardData.student.className, 125, profileTop + 26);

      doc.font('Helvetica-Bold').fillColor(primaryNavy).text('Semester:', 320, profileTop + 26);
      doc.font('Helvetica').fillColor(textDark).text(cardData.student.semester, 395, profileTop + 26);

      doc.font('Helvetica-Bold').fillColor(primaryNavy).text('Academic Year:', 46, profileTop + 42);
      doc.font('Helvetica').fillColor(textDark).text(cardData.student.academicYear, 125, profileTop + 42);

      doc.font('Helvetica-Bold').fillColor(primaryNavy).text('Report Date:', 320, profileTop + 42);
      doc.font('Helvetica').fillColor(textDark).text(cardData.generatedAt, 395, profileTop + 42);

      // --- TABLE 1: ASSESSMENT MARKS ---
      let currentY = 216;
      doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryNavy)
         .text('1. INTERNAL ASSESSMENT MARKS EVALUATION', 36, currentY);

      currentY += 15;

      // Table Header
      doc.rect(36, currentY, 523, 20).fill(primaryNavy);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
      doc.text('Code', 42, currentY + 6, { width: 45 });
      doc.text('Subject Title', 90, currentY + 6, { width: 175 });
      doc.text('Credits', 270, currentY + 6, { width: 35, align: 'center' });
      doc.text('IA-1', 315, currentY + 6, { width: 35, align: 'center' });
      doc.text('IA-2', 360, currentY + 6, { width: 35, align: 'center' });
      doc.text('Scored', 405, currentY + 6, { width: 45, align: 'center' });
      doc.text('Max', 455, currentY + 6, { width: 45, align: 'center' });
      doc.text('%', 505, currentY + 6, { width: 45, align: 'center' });

      currentY += 20;

      // Rows
      cardData.subjects.forEach((sub, idx) => {
        const isAlt = idx % 2 === 1;
        if (isAlt) {
          doc.rect(36, currentY, 523, 18).fill(rowAlt);
        }

        doc.rect(36, currentY, 523, 18).strokeColor(borderGray).lineWidth(0.5).stroke();

        // Extract IA-1 and IA-2 scores
        let ia1 = '-';
        let ia2 = '-';
        sub.assessments.forEach(a => {
          const name = a.assessmentName.toLowerCase();
          const scoreStr = a.isAbsent ? 'Abs' : (a.marksObtained !== null ? a.marksObtained : '-');
          if (name.includes('1')) ia1 = scoreStr;
          else if (name.includes('2')) ia2 = scoreStr;
          else if (ia1 === '-') ia1 = scoreStr;
        });

        doc.fontSize(8).font('Helvetica-Bold').fillColor(primaryNavy).text(sub.subjectCode, 42, currentY + 5, { width: 45 });
        doc.font('Helvetica').fillColor(textDark).text(sub.subjectName, 90, currentY + 5, { width: 175, ellipsis: true });
        doc.text(String(sub.credit), 270, currentY + 5, { width: 35, align: 'center' });
        doc.text(String(ia1), 315, currentY + 5, { width: 35, align: 'center' });
        doc.text(String(ia2), 360, currentY + 5, { width: 35, align: 'center' });
        doc.font('Helvetica-Bold').text(String(sub.totalScored), 405, currentY + 5, { width: 45, align: 'center' });
        doc.font('Helvetica').text(String(sub.totalMax), 455, currentY + 5, { width: 45, align: 'center' });

        const pctStr = sub.percentage !== null ? `${sub.percentage}%` : '-';
        doc.font('Helvetica-Bold').fillColor(sub.percentage >= 50 ? '#065F46' : '#991B1B')
           .text(pctStr, 505, currentY + 5, { width: 45, align: 'center' });

        currentY += 18;
      });

      // Total Marks Row
      doc.rect(36, currentY, 523, 18).fill('#F1F5F9');
      doc.rect(36, currentY, 523, 18).strokeColor(borderGray).lineWidth(1).stroke();
      doc.fontSize(8).font('Helvetica-Bold').fillColor(primaryNavy)
         .text('TOTAL INTERNAL MARKS', 42, currentY + 5, { width: 220 })
         .text(String(cardData.summary.totalCredits), 270, currentY + 5, { width: 35, align: 'center' })
         .text(String(cardData.summary.totalScoredMarks), 405, currentY + 5, { width: 45, align: 'center' })
         .text(String(cardData.summary.totalMaxInternalMarks), 455, currentY + 5, { width: 45, align: 'center' })
         .text(`${cardData.summary.overallMarksPct}%`, 505, currentY + 5, { width: 45, align: 'center' });

      currentY += 28;

      // --- TABLE 2: ATTENDANCE SUMMARY ---
      doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryNavy)
         .text('2. SUBJECT ATTENDANCE RECORD (MINIMUM MANDATORY: 75%)', 36, currentY);

      currentY += 15;

      // Table Header
      doc.rect(36, currentY, 523, 20).fill(primaryNavy);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#FFFFFF');
      doc.text('Code', 42, currentY + 6, { width: 50 });
      doc.text('Subject Title', 95, currentY + 6, { width: 200 });
      doc.text('Conducted Sessions', 300, currentY + 6, { width: 70, align: 'center' });
      doc.text('Attended', 380, currentY + 6, { width: 50, align: 'center' });
      doc.text('Attendance %', 440, currentY + 6, { width: 55, align: 'center' });
      doc.text('Eligibility', 500, currentY + 6, { width: 50, align: 'center' });

      currentY += 20;

      // Rows
      cardData.subjects.forEach((sub, idx) => {
        const isAlt = idx % 2 === 1;
        if (isAlt) {
          doc.rect(36, currentY, 523, 18).fill(rowAlt);
        }

        doc.rect(36, currentY, 523, 18).strokeColor(borderGray).lineWidth(0.5).stroke();

        const att = sub.attendance;
        const isShortage = att.percentage < 75;

        doc.fontSize(8).font('Helvetica-Bold').fillColor(primaryNavy).text(sub.subjectCode, 42, currentY + 5, { width: 50 });
        doc.font('Helvetica').fillColor(textDark).text(sub.subjectName, 95, currentY + 5, { width: 200, ellipsis: true });
        doc.text(String(att.totalSessions), 300, currentY + 5, { width: 70, align: 'center' });
        doc.text(String(att.attendedSessions), 380, currentY + 5, { width: 50, align: 'center' });

        doc.font('Helvetica-Bold').fillColor(isShortage ? '#B91C1C' : '#0F172A')
           .text(`${att.percentage}%`, 440, currentY + 5, { width: 55, align: 'center' });

        doc.fontSize(7).font('Helvetica-Bold').fillColor(isShortage ? '#B91C1C' : '#065F46')
           .text(att.eligibility, 500, currentY + 6, { width: 50, align: 'center' });

        currentY += 18;
      });

      // Overall Attendance Summary Row
      doc.rect(36, currentY, 523, 18).fill('#F1F5F9');
      doc.rect(36, currentY, 523, 18).strokeColor(borderGray).lineWidth(1).stroke();
      doc.fontSize(8).font('Helvetica-Bold').fillColor(primaryNavy)
         .text('OVERALL ATTENDANCE SUMMARY', 42, currentY + 5, { width: 250 })
         .text(String(cardData.summary.totalConductedSessions), 300, currentY + 5, { width: 70, align: 'center' })
         .text(String(cardData.summary.totalAttendedSessions), 380, currentY + 5, { width: 50, align: 'center' })
         .fillColor(cardData.summary.isAttendanceShortage ? '#B91C1C' : primaryNavy)
         .text(`${cardData.summary.overallAttPct}%`, 440, currentY + 5, { width: 55, align: 'center' })
         .text(cardData.summary.isAttendanceShortage ? 'Action Req.' : 'Satisfied', 500, currentY + 5, { width: 50, align: 'center' });

      currentY += 28;

      // --- ACADEMIC STANDING BANNER ---
      const standingColor = cardData.summary.isAttendanceShortage ? '#FEF2F2' : '#F0FDF4';
      const standingBorder = cardData.summary.isAttendanceShortage ? '#FCA5A5' : '#86EFAC';
      const standingText = cardData.summary.isAttendanceShortage ? '#991B1B' : '#166534';

      doc.rect(36, currentY, 523, 30).fill(standingColor);
      doc.rect(36, currentY, 523, 30).strokeColor(standingBorder).lineWidth(1).stroke();

      doc.fontSize(9).font('Helvetica-Bold').fillColor(standingText)
         .text(`Academic Standing & Status: ${cardData.summary.overallStatus}`, 46, currentY + 10, { width: 503 });

      currentY += 42;

      // --- SIGNATURES SECTION ---
      doc.rect(36, currentY, 523, 75).strokeColor(borderGray).lineWidth(1).stroke();

      const sigY = currentY + 50;

      // Signatures
      doc.fontSize(8).font('Helvetica-Bold').fillColor(primaryNavy);

      // Class Advisor
      doc.moveTo(56, sigY).lineTo(180, sigY).strokeColor(borderGray).stroke();
      doc.text('Class Advisor / Mentor', 56, sigY + 5, { width: 124, align: 'center' });

      // Head of Department
      doc.moveTo(235, sigY).lineTo(360, sigY).strokeColor(borderGray).stroke();
      doc.text('Head of the Department (HOD)', 235, sigY + 5, { width: 125, align: 'center' });

      // Parent / Guardian
      doc.moveTo(415, sigY).lineTo(535, sigY).strokeColor(borderGray).stroke();
      doc.text('Parent / Guardian Signature', 415, sigY + 5, { width: 120, align: 'center' });

      // --- FOOTER NOTICE ---
      doc.fontSize(7).font('Helvetica').fillColor(textMuted)
         .text('This is a computer-generated official progress card generated via Next Gen Grading Academic Assistance System. For questions, contact the Department Office.', 36, 785, { align: 'center', width: 523 });

      doc.end();
      outputStream.on('finish', () => resolve());
      outputStream.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateProgressCardPDF,
};
