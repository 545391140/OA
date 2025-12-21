/**
 * 酒店查询预订服务
 * 提供酒店搜索、价格确认、预订管理等 API 调用
 */

import apiClient from '../utils/axiosConfig';

/**
 * 通过地理坐标搜索酒店
 * @param {Object} searchParams - 搜索参数
 * @param {Number} searchParams.latitude - 纬度（必填）
 * @param {Number} searchParams.longitude - 经度（必填）
 * @param {Number} searchParams.radius - 搜索半径（可选，单位：公里，默认5）
 * @param {String} searchParams.hotelSource - 酒店来源（可选，ALL, AMADEUS, EXPEDIA，默认ALL）
 * @returns {Promise<Object>} 酒店列表
 */
export const searchHotelsByGeocode = (searchParams) => {
  return apiClient.post('/hotels/search-by-geocode', searchParams);
};

/**
 * 通过城市搜索酒店
 * @param {Object} searchParams - 搜索参数
 * @param {String} searchParams.cityCode - 城市代码（IATA代码，如：NYC）（必填）
 * @param {String} searchParams.hotelSource - 酒店来源（可选，ALL, AMADEUS, EXPEDIA，默认ALL）
 * @returns {Promise<Object>} 酒店列表
 */
export const searchHotelsByCity = (searchParams) => {
  return apiClient.post('/hotels/search-by-city', searchParams);
};

/**
 * 通过酒店ID搜索酒店
 * @param {Object} searchParams - 搜索参数
 * @param {String|Array} searchParams.hotelIds - 酒店ID（单个或多个，逗号分隔）（必填）
 * @returns {Promise<Object>} 酒店列表
 */
export const searchHotelsByHotels = (searchParams) => {
  return apiClient.post('/hotels/search-by-hotels', searchParams);
};

/**
 * 搜索酒店报价
 * @param {Object} searchParams - 搜索参数
 * @param {String|Array} searchParams.hotelIds - 酒店ID（单个或多个，建议使用多个以提高成功率）
 * @param {String} searchParams.checkInDate - 入住日期 (YYYY-MM-DD)
 * @param {String} searchParams.checkOutDate - 退房日期 (YYYY-MM-DD)
 * @param {Number} searchParams.adults - 成人数量（1-9）
 * @param {Number} searchParams.roomQuantity - 房间数量（默认1）
 * @param {String} searchParams.currencyCode - 货币代码（可选）
 * @returns {Promise<Object>} 酒店报价列表
 */
export const searchHotelOffers = (searchParams) => {
  return apiClient.post('/hotels/search-offers', searchParams);
};

/**
 * 确认酒店价格
 * @param {Object} params - 参数对象
 * @param {String} params.offerId - 酒店报价ID（必填）
 * @returns {Promise<Object>} 确认后的价格
 */
export const confirmHotelPrice = (params) => {
  return apiClient.post('/hotels/confirm-price', params);
};

/**
 * 获取酒店评分
 * @param {Object} params - 参数对象
 * @param {String} params.hotelIds - 酒店ID列表（逗号分隔，必填）
 * @returns {Promise<Object>} 酒店评分列表
 */
export const getHotelRatings = (params) => {
  return apiClient.get('/hotels/ratings', { params });
};

/**
 * 创建酒店预订
 * @param {Object} bookingData - 预订数据
 * @param {String} bookingData.travelId - 差旅申请ID（必填）
 * @param {String} bookingData.offerId - 酒店报价ID（必填）
 * @param {Object} bookingData.hotelOffer - 酒店报价信息（完整对象，必填）
 * @param {Array} bookingData.guests - 客人信息数组（必填）
 * @param {Array} bookingData.payments - 支付信息（可选）
 * @param {Array} bookingData.rooms - 房间信息（可选）
 * @param {String} bookingData.specialRequests - 特殊要求（可选）
 * @returns {Promise<Object>} 预订结果
 */
export const createHotelBooking = (bookingData) => {
  return apiClient.post('/hotels/bookings', bookingData);
};

/**
 * 获取预订列表
 * @param {Object} params - 查询参数
 * @param {String} params.travelId - 差旅申请ID（可选，用于筛选）
 * @param {String} params.status - 预订状态（可选，用于筛选）
 * @returns {Promise<Object>} 预订列表
 */
export const getHotelBookings = (params = {}) => {
  return apiClient.get('/hotels/bookings', { params });
};

/**
 * 获取预订详情
 * @param {String} bookingId - 预订ID
 * @returns {Promise<Object>} 预订详情
 */
export const getHotelBooking = (bookingId) => {
  return apiClient.get(`/hotels/bookings/${bookingId}`);
};

/**
 * 取消预订
 * @param {String} bookingId - 预订ID
 * @param {String} reason - 取消原因（可选）
 * @returns {Promise<Object>} 取消结果
 */
export const cancelHotelBooking = (bookingId, reason) => {
  return apiClient.delete(`/hotels/bookings/${bookingId}`, { data: { reason } });
};

/**
 * 根据差旅单号查询酒店预订及费用（用于核销）
 * @param {String} travelNumber - 差旅单号
 * @returns {Promise<Object>} 预订列表及费用汇总
 */
export const getHotelBookingsByTravelNumber = (travelNumber) => {
  return apiClient.get(`/hotels/bookings/by-travel-number/${travelNumber}`);
};

/**
 * 获取差旅申请的酒店预订
 * @param {String} travelId - 差旅申请ID
 * @returns {Promise<Object>} 酒店预订列表及统计
 */
export const getTravelHotels = (travelId) => {
  return apiClient.get(`/travel/${travelId}/hotels`);
};

