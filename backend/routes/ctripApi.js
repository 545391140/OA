/**
 * 携程API路由
 */

const express = require('express');
const {
  getTicket,
  getCountries,
  getPOIInfo,
  getPOIAsLocations,
} = require('../controllers/ctripApiController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// 所有路由需要认证
router.use(protect);

// @desc    获取Ticket
// @route   GET /api/ctrip/ticket
// @access  Private (Admin/Finance only)
router.get('/ticket', authorize('admin', 'finance'), getTicket);

// @desc    获取全量国家数据
// @route   GET /api/ctrip/countries
// @access  Private
router.get('/countries', getCountries);

// @desc    获取全量标准地理信息数据（POI）
// @route   POST /api/ctrip/poi
// @access  Private
router.post('/poi', getPOIInfo);

// @desc    获取POI数据并转换为Location格式
// @route   POST /api/ctrip/poi/locations
// @access  Private
router.post('/poi/locations', getPOIAsLocations);

module.exports = router;

