const express = require('express');
const { body } = require('express-validator');
const {
  matchStandard,
  validateExpense
} = require('../controllers/standardMatchController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @desc    Match travel standard for a trip
// @route   POST /api/standard-match/match
// @access  Private
router.post(
  '/match',
  [
    body('destination').notEmpty().withMessage('Destination is required'),
    body('startDate').isISO8601().withMessage('Valid start date is required')
  ],
  matchStandard
);

// @desc    Validate expense against standard
// @route   POST /api/standard-match/validate
// @access  Private
router.post(
  '/validate',
  [
    body('standardId').notEmpty().withMessage('Standard ID is required'),
    body('expense').isObject().withMessage('Expense object is required')
  ],
  validateExpense
);

module.exports = router;

