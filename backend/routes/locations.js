const express = require('express');
const { body } = require('express-validator');
const {
  getLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  batchCreateLocations,
  getLocationsByParent
} = require('../controllers/locationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @desc    Get all locations
// @route   GET /api/locations
// @access  Private
router.get('/', getLocations);

// @desc    Get locations by parent (city)
// @route   GET /api/locations/parent/:parentId
// @access  Private
// 注意：必须在 /:id 路由之前定义，否则会被 /:id 路由匹配
router.get('/parent/:parentId', getLocationsByParent);

// @desc    Get location by ID
// @route   GET /api/locations/:id
// @access  Private
// 注意：必须在所有具体路由之后定义，因为 :id 是通配符
router.get('/:id', getLocationById);

// @desc    Create location
// @route   POST /api/locations
// @access  Private (Admin/Finance only)
router.post(
  '/',
  [
    authorize('admin', 'finance'),
    body('name').notEmpty().withMessage('Location name is required'),
    body('type').isIn(['airport', 'station', 'city', 'province', 'country', 'bus']).withMessage('Invalid location type')
  ],
  createLocation
);

// @desc    Update location
// @route   PUT /api/locations/:id
// @access  Private (Admin/Finance only)
router.put('/:id', authorize('admin', 'finance'), updateLocation);

// @desc    Delete location
// @route   DELETE /api/locations/:id
// @access  Private (Admin only)
router.delete('/:id', authorize('admin'), deleteLocation);

// @desc    Batch create locations
// @route   POST /api/locations/batch
// @access  Private (Admin/Finance only)
router.post('/batch', authorize('admin', 'finance'), batchCreateLocations);

module.exports = router;
