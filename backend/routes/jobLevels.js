const express = require('express');
const { body } = require('express-validator');
const {
  getJobLevels,
  getJobLevelById,
  createJobLevel,
  updateJobLevel,
  deleteJobLevel
} = require('../controllers/jobLevelController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @desc    Get all job levels
// @route   GET /api/job-levels
// @access  Private
router.get('/', getJobLevels);

// @desc    Get job level by ID
// @route   GET /api/job-levels/:id
// @access  Private
router.get('/:id', getJobLevelById);

// @desc    Create job level
// @route   POST /api/job-levels
// @access  Private (Admin/Finance only)
router.post(
  '/',
  [
    authorize('admin', 'finance'),
    body('levelCode').notEmpty().withMessage('Level code is required'),
    body('levelName').notEmpty().withMessage('Level name is required'),
    body('levelOrder').isInt().withMessage('Level order must be a number')
  ],
  createJobLevel
);

// @desc    Update job level
// @route   PUT /api/job-levels/:id
// @access  Private (Admin/Finance only)
router.put('/:id', authorize('admin', 'finance'), updateJobLevel);

// @desc    Delete job level
// @route   DELETE /api/job-levels/:id
// @access  Private (Admin only)
router.delete('/:id', authorize('admin'), deleteJobLevel);

module.exports = router;

