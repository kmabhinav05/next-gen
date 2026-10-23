const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { requireRoles } = require('../middleware/roleMiddleware');

// Enforce authentication & Admin role for all routes in this file
router.use(authenticateToken);
router.use(requireRoles('admin'));

// Stats & Dashboard
router.get('/stats', adminController.getDashboardStats);

// Departments
router.get('/departments', adminController.getDepartments);
router.post('/departments', adminController.createDepartment);

// Classes & Subjects
router.get('/classes', adminController.getClasses);
router.get('/subjects', adminController.getSubjects);
router.post('/subjects', adminController.createSubject);

// Staff management
router.get('/staff', adminController.getStaffList);
router.post('/staff', adminController.createStaff);

// Student management
router.get('/students', adminController.getStudentsList);
router.post('/students', adminController.createStudent);

// User activation toggle
router.patch('/users/:userId/toggle-status', adminController.toggleUserStatus);

// Subject assignments
router.get('/assignments', adminController.getSubjectAssignments);
router.post('/assignments', adminController.createSubjectAssignment);

// Activity audit logs
router.get('/logs', adminController.getActivityLogs);

module.exports = router;
