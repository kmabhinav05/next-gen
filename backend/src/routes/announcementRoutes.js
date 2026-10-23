const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireRoles } = require('../middleware/roleMiddleware');

router.get('/', authenticateToken, announcementController.getAnnouncements);
router.post('/', authenticateToken, requireRoles('admin'), announcementController.createAnnouncement);

module.exports = router;
