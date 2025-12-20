const express = require('express');
const {
  searchFlights,
  confirmPrice,
  createBooking,
  getBookings,
  getBookingsByTravelNumber,
  getBooking,
  cancelBooking,
} = require('../controllers/flightController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 所有路由需要认证
router.use(protect);

// 搜索航班
router.post('/search', searchFlights);

// 确认价格
router.post('/confirm-price', confirmPrice);

// 预订管理
router.post('/bookings', createBooking);                              // 创建预订（必须关联差旅申请）
router.get('/bookings', getBookings);                                 // 获取预订列表（支持按差旅申请筛选）
router.get('/bookings/by-travel-number/:travelNumber', getBookingsByTravelNumber); // 根据差旅单号查询预订（用于核销）
router.get('/bookings/:id', getBooking);                              // 获取预订详情
router.delete('/bookings/:id', cancelBooking);                        // 取消预订（同步更新差旅申请）

module.exports = router;

