const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');

// Chatbot endpoints are accessible to authenticated and guest visitors alike
router.get('/faqs', chatbotController.getFaqs);
router.post('/message', chatbotController.askQuestion);

module.exports = router;
