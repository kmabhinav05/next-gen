const express = require('express');
const router = express.Router();
const parentController = require('../controllers/parentController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireRoles } = require('../middleware/roleMiddleware');

router.use(authenticateToken);
router.use(requireRoles('parent', 'admin'));

router.get('/dashboard', parentController.getDashboard);
router.get('/progress-card/:studentId/pdf', parentController.downloadWardProgressCardPDF);

module.exports = router;
