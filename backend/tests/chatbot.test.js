const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const chatbotController = require('../src/controllers/chatbotController');

// Mock response helper
function createMockRes() {
  return {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    }
  };
}

test('Chatbot Module Tests', async (t) => {

  await t.test('1. getFaqs returns categorized academic FAQs', async () => {
    const res = createMockRes();
    await chatbotController.getFaqs({}, res, (err) => { throw err; });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.data.total >= 4);
    assert.ok(res.data.data.categories['Attendance'] !== undefined);
  });

  await t.test('2. askQuestion answers attendance minimum query with high confidence', async () => {
    const req = { body: { query: 'What is the minimum attendance required?' } };
    const res = createMockRes();
    await chatbotController.askQuestion(req, res, (err) => { throw err; });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.data.answer.includes('75%'));
  });

  await t.test('3. askQuestion falls back gracefully for uncommon queries', async () => {
    const req = { body: { query: 'Can I park my bicycle inside the lab?' } };
    const res = createMockRes();
    await chatbotController.askQuestion(req, res, (err) => { throw err; });

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.success, true);
    assert.ok(res.data.data.answer.includes('academic advisor') || res.data.data.answer.includes('attendance'));
  });
});
