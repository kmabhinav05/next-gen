const express = require('express');
const router = express.Router();
const multer = require('multer');
const staffController = require('../controllers/staffController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireRoles } = require('../middleware/roleMiddleware');

// Multer memory storage configuration for Excel uploads (5 MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const validMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ];
    if (validMimes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are permitted'));
    }
  }
});

// All routes require authentication & Staff or Admin role
router.use(authenticateToken);
router.use(requireRoles('staff', 'admin'));

// Dashboard & Attendance
router.get('/dashboard', staffController.getDashboard);
router.get('/classes/:classId/subjects/:subjectId/students', staffController.getClassStudents);
router.post('/attendance', staffController.recordAttendance);

// Excel Marks Import Workflow
router.get('/excel/template', staffController.downloadExcelTemplate);
router.post('/excel/preview', upload.single('file'), staffController.previewExcelMarks);
router.post('/excel/commit', staffController.commitExcelMarks);

// Progress Cards Management
router.get('/progress-cards/students', staffController.getClassProgressCardsList);
router.get('/progress-cards/:studentId', staffController.getStudentProgressCard);
router.get('/progress-cards/:studentId/pdf', staffController.downloadProgressCardPDF);

module.exports = router;
