const { query } = require('../config/db');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * Chatbot Controller: Academic Department Assistance
 */
const getFaqs = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT id, category, question, answer, keywords
      FROM chatbot_faqs
      WHERE is_active = TRUE
      ORDER BY category ASC, display_order ASC
    `);

    // Group by category
    const grouped = {};
    result.rows.forEach(faq => {
      if (!grouped[faq.category]) {
        grouped[faq.category] = [];
      }
      grouped[faq.category].push(faq);
    });

    return successResponse(res, 'Academic FAQs retrieved', {
      total: result.rowCount,
      categories: grouped,
      faqs: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

const askQuestion = async (req, res, next) => {
  try {
    const { query: userQuery } = req.body;

    if (!userQuery || typeof userQuery !== 'string' || userQuery.trim().length === 0) {
      return errorResponse(res, 'Query parameter is required', 400);
    }

    const cleanQuery = userQuery.trim().toLowerCase();
    const tokens = cleanQuery.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(t => t.length > 2);

    // 1. Check database for direct question or keyword matches
    const allFaqsRes = await query(`
      SELECT id, category, question, answer, keywords
      FROM chatbot_faqs
      WHERE is_active = TRUE
    `);

    let bestMatch = null;
    let highestScore = 0;

    for (const faq of allFaqsRes.rows) {
      let score = 0;
      const questionText = faq.question.toLowerCase();
      const answerText = faq.answer.toLowerCase();
      const keywords = (faq.keywords || '').toLowerCase();

      // Exact substring match
      if (questionText.includes(cleanQuery)) {
        score += 10;
      }

      // Keyword and token matching
      for (const token of tokens) {
        if (questionText.includes(token)) score += 3;
        if (keywords.includes(token)) score += 4;
        if (answerText.includes(token)) score += 1;
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = faq;
      }
    }

    if (bestMatch && highestScore >= 3) {
      return successResponse(res, 'Answer found', {
        matchedQuestion: bestMatch.question,
        category: bestMatch.category,
        answer: bestMatch.answer,
        confidence: highestScore >= 7 ? 'high' : 'medium',
      });
    }

    // 2. Fallback heuristic responses for common academic domains
    let fallbackAnswer = '';
    let category = 'General Assistance';

    if (cleanQuery.includes('attend') || cleanQuery.includes('shortage') || cleanQuery.includes('percent') || cleanQuery.includes('absent')) {
      category = 'Attendance Policy';
      fallbackAnswer = 'The university mandates a minimum of 75% attendance in every course. If your attendance falls between 65% and 74%, you must submit medical condonation forms verified by a registered medical practitioner to the Department Office.';
    } else if (cleanQuery.includes('mark') || cleanQuery.includes('internal') || cleanQuery.includes('exam') || cleanQuery.includes('score') || cleanQuery.includes('grade')) {
      category = 'Assessment Guidelines';
      fallbackAnswer = 'Internal assessments contribute 50 marks to the overall semester grade, calculated from continuous internal tests (IA-1, IA-2), assignments, and laboratory assessments. If you have concerns about your marks, please discuss them directly with your course instructor.';
    } else if (cleanQuery.includes('progress') || cleanQuery.includes('card') || cleanQuery.includes('ptm') || cleanQuery.includes('pdf')) {
      category = 'Progress Reports';
      fallbackAnswer = 'Digital student progress cards are generated automatically using internal assessment marks and PostgreSQL attendance logs. You can preview and download your official PDF progress card directly from your dashboard.';
    } else if (cleanQuery.includes('contact') || cleanQuery.includes('hod') || cleanQuery.includes('faculty') || cleanQuery.includes('teacher')) {
      category = 'Faculty Contact';
      fallbackAnswer = 'You can reach out to the Head of Department (HOD) Dr. Sarah Jenkins at s.jenkins@university.edu or visit the Department Office in Academic Block A, Room 302 during counseling hours (3:00 PM - 4:30 PM).';
    } else {
      fallbackAnswer = 'I can help answer questions regarding attendance minimums (75%), internal test marks, progress cards, parent portal access, and study tips. If your question is not listed, please consult your class mentor or academic advisor.';
    }

    return successResponse(res, 'Academic guidance provided', {
      matchedQuestion: userQuery,
      category,
      answer: fallbackAnswer,
      confidence: 'fallback',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getFaqs,
  askQuestion,
};
