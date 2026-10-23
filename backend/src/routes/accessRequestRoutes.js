const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const accessRequestController = require('../controllers/accessRequestController');
const { validate } = require('../validators/authValidator');

// Validation rules for Request Access
const accessRequestRules = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full Name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Full Name must be between 2 and 255 characters'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email Address is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason for Access / Project Name is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Reason for access must be at least 10 characters long'),
];

// POST /api/request-access
router.post('/', accessRequestRules, validate, accessRequestController.requestAccess);

module.exports = router;
