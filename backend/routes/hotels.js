const express = require('express');
const {
  searchHotelsByGeocode,
  searchHotelsByCity,
  searchHotelsByHotels,
  searchHotelOffers,
  confirmPrice,
  getHotelRatings,
  createBooking,
  getBookings,
  getBookingsByTravelNumber,
  getBooking,
  cancelBooking,
  getTravelHotels,
} = require('../controllers/hotelController');
const { protect, checkPermission } = require('../middleware/auth');

const router = express.Router();

// 所有路由需要认证
router.use(protect);

// 酒店搜索 - 需要 hotel.search 权限
router.post('/search-by-geocode', checkPermission('hotel.search'), searchHotelsByGeocode);
router.post('/search-by-city', checkPermission('hotel.search'), searchHotelsByCity);
router.post('/search-by-hotels', checkPermission('hotel.search'), searchHotelsByHotels);
router.post('/search-offers', checkPermission('hotel.search'), searchHotelOffers);

// 价格确认 - 需要 hotel.search 权限（搜索流程的一部分）
router.post('/confirm-price', checkPermission('hotel.search'), confirmPrice);

// 酒店评分查询 - 需要 hotel.search 权限
router.get('/ratings', checkPermission('hotel.search'), getHotelRatings);

// 预订管理
router.post('/bookings', checkPermission('hotel.booking.create'), createBooking);                              // 创建预订（必须关联差旅申请）
router.get('/bookings', checkPermission('hotel.booking.view'), getBookings);                                 // 获取预订列表（支持按差旅申请筛选）
router.get('/bookings/by-travel-number/:travelNumber', checkPermission('hotel.booking.view'), getBookingsByTravelNumber); // 根据差旅单号查询预订（用于核销）
router.get('/bookings/:id', checkPermission('hotel.booking.view'), getBooking);                              // 获取预订详情
router.delete('/bookings/:id', checkPermission('hotel.booking.cancel'), cancelBooking);                        // 取消预订（同步更新差旅申请）

module.exports = router;

