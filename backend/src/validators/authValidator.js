const { body, validationResult } = require('express-validator');
const { errorResponse } = require('../utils/responseHelper');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
    }));
    return errorResponse(res, 'Validation failed for request data', 422, formattedErrors);
  }
  next();
};

/**
 * Validation rules for user login
 */
const loginRules = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required')
    .isLength({ max: 255 })
    .withMessage('Username cannot exceed 255 characters'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
];

/**
 * Validation rules for password change
 */
const changePasswordRules = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('New password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('New password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('New password must contain at least one digit'),
];

/**
 * Validation rules for forgot password / reset request
 */
const forgotPasswordRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Registered institutional email or username is required')
    .isLength({ max: 255 })
    .withMessage('Identifier cannot exceed 255 characters'),
];

/**
 * Validation rules for reset password
 */
const resetPasswordRules = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Registered email is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('New password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('New password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('New password must contain at least one digit'),
];

module.exports = {
  validate,
  loginRules,
  changePasswordRules,
  forgotPasswordRules,
  resetPasswordRules,
};
