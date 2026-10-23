const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireRoles } = require('../middleware/roleMiddleware');

router.use(authenticateToken);
router.use(requireRoles('student', 'admin'));

router.get('/dashboard', studentController.getDashboard);
router.get('/progress-card/pdf', studentController.downloadProgressCardPDF);

module.exports = router;
