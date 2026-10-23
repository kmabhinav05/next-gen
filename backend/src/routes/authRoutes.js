const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { loginRules, changePasswordRules, forgotPasswordRules, resetPasswordRules, validate } = require('../validators/authValidator');

// Public route: User login
router.post('/login', loginRules, validate, authController.login);

// Public route: Forgot password / Reset
router.post('/forgot-password', forgotPasswordRules, validate, authController.forgotPassword);
router.post('/reset-password', resetPasswordRules, validate, authController.resetPassword);

// Protected routes (any active authenticated user)
router.get('/me', authenticateToken, authController.getMe);
router.post('/change-password', authenticateToken, changePasswordRules, validate, authController.changePassword);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
