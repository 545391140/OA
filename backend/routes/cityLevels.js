const express = require('express');
const { body } = require('express-validator');
const {
  getCityLevels,
  getCityLevelById,
  createCityLevel,
  updateCityLevel,
  deleteCityLevel,
  getCityLevelByCode
} = require('../controllers/cityLevelController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @desc    Get all city levels
// @route   GET /api/city-levels
// @access  Private
router.get('/', getCityLevels);

// @desc    Get city level by code
// @route   GET /api/city-levels/code/:code
// @access  Private
router.get('/code/:code', getCityLevelByCode);

// @desc    Get city level by ID
// @route   GET /api/city-levels/:id
// @access  Private
router.get('/:id', getCityLevelById);

// @desc    Create city level
// @route   POST /api/city-levels
// @access  Private (Admin/Finance only)
router.post(
  '/',
  [
    authorize('admin', 'finance'),
    body('cityCode').notEmpty().withMessage('City code is required'),
    body('cityName').notEmpty().withMessage('City name is required'),
    body('level').isInt({ min: 1, max: 4 }).withMessage('Level must be between 1 and 4')
  ],
  createCityLevel
);

// @desc    Update city level
// @route   PUT /api/city-levels/:id
// @access  Private (Admin/Finance only)
router.put('/:id', authorize('admin', 'finance'), updateCityLevel);

// @desc    Delete city level
// @route   DELETE /api/city-levels/:id
// @access  Private (Admin only)
router.delete('/:id', authorize('admin'), deleteCityLevel);

module.exports = router;

