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
const { protect, checkPermission } = require('../middleware/auth');

const router = express.Router();

// 所有路由需要认证
router.use(protect);

// 搜索航班 - 需要 flight.search 权限
router.post('/search', checkPermission('flight.search'), searchFlights);

// 确认价格 - 需要 flight.search 权限（搜索流程的一部分）
router.post('/confirm-price', checkPermission('flight.search'), confirmPrice);

// 预订管理
router.post('/bookings', checkPermission('flight.booking.create'), createBooking);                              // 创建预订（必须关联差旅申请）- 需要 flight.booking.create 权限
router.get('/bookings', checkPermission('flight.booking.view'), getBookings);                                 // 获取预订列表（支持按差旅申请筛选）- 需要 flight.booking.view 权限
router.get('/bookings/by-travel-number/:travelNumber', checkPermission('flight.booking.view'), getBookingsByTravelNumber); // 根据差旅单号查询预订（用于核销）- 需要 flight.booking.view 权限
router.get('/bookings/:id', checkPermission('flight.booking.view'), getBooking);                              // 获取预订详情 - 需要 flight.booking.view 权限
router.delete('/bookings/:id', checkPermission('flight.booking.cancel'), cancelBooking);                        // 取消预订（同步更新差旅申请）- 需要 flight.booking.cancel 权限

module.exports = router;

