const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  getStandards,
  getStandardById,
  createStandard,
  updateStandard,
  deleteStandard,
  activateStandard,
  deactivateStandard,
  matchStandard
} = require('../controllers/travelStandardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @desc    Get all travel standards
// @route   GET /api/travel-standards
// @access  Private
router.get('/', getStandards);

// @desc    Get travel standard by ID
// @route   GET /api/travel-standards/:id
// @access  Private
router.get('/:id', getStandardById);

// @desc    Create new travel standard
// @route   POST /api/travel-standards
// @access  Private (Finance/Admin only)
router.post(
  '/',
  [
    authorize('admin', 'finance'),
    body('standardCode').notEmpty().withMessage('Standard code is required'),
    body('standardName').notEmpty().withMessage('Standard name is required'),
    body('effectiveDate').isISO8601().withMessage('Valid effective date is required')
  ],
  createStandard
);

// @desc    Update travel standard
// @route   PUT /api/travel-standards/:id
// @access  Private (Finance/Admin only)
router.put(
  '/:id',
  [
    authorize('admin', 'finance'),
    body('standardName').optional().notEmpty().withMessage('Standard name cannot be empty')
  ],
  updateStandard
);

// @desc    Delete travel standard
// @route   DELETE /api/travel-standards/:id
// @access  Private (Admin only)
router.delete('/:id', authorize('admin'), deleteStandard);

// @desc    Activate travel standard
// @route   PUT /api/travel-standards/:id/activate
// @access  Private (Finance/Admin only)
router.put('/:id/activate', authorize('admin', 'finance'), activateStandard);

// @desc    Deactivate travel standard
// @route   PUT /api/travel-standards/:id/deactivate
// @access  Private (Finance/Admin only)
router.put('/:id/deactivate', authorize('admin', 'finance'), deactivateStandard);

// @desc    Match travel standard
// @route   POST /api/travel-standards/match
// @access  Private
router.post('/match', matchStandard);

module.exports = router;

