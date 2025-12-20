/**
 * 机票查询预订服务
 * 提供航班搜索、价格确认、预订管理等 API 调用
 */

import apiClient from '../utils/axiosConfig';

/**
 * 搜索航班
 * @param {Object} searchParams - 搜索参数
 * @param {String|Object} searchParams.originLocation - 出发地位置对象或位置ID（支持城市或机场）
 * @param {String|Object} searchParams.destinationLocation - 目的地位置对象或位置ID（支持城市或机场）
 * @param {String} searchParams.originLocationCode - 出发机场代码（兼容旧接口，3位代码）
 * @param {String} searchParams.destinationLocationCode - 到达机场代码（兼容旧接口，3位代码）
 * @param {String} searchParams.departureDate - 出发日期 (YYYY-MM-DD)
 * @param {String} searchParams.returnDate - 返程日期 (可选)
 * @param {Number} searchParams.adults - 成人数量
 * @param {Number} searchParams.children - 儿童数量
 * @param {Number} searchParams.infants - 婴儿数量
 * @param {String} searchParams.travelClass - 舱位等级
 * @param {Number} searchParams.max - 最大返回结果数
 * @param {String} searchParams.currencyCode - 货币代码
 * @param {Boolean} searchParams.nonStop - 是否只显示直飞航班
 * @returns {Promise<Object>} 搜索结果
 */
export const searchFlights = (searchParams) => {
  return apiClient.post('/flights/search', searchParams);
};

/**
 * 确认航班价格
 * @param {Object} flightOffer - 航班报价对象
 * @returns {Promise<Object>} 确认后的价格
 */
export const confirmPrice = (flightOffer) => {
  return apiClient.post('/flights/confirm-price', { flightOffer });
};

/**
 * 创建预订
 * @param {Object} bookingData - 预订数据
 * @param {String} bookingData.travelId - 差旅申请ID（必填）
 * @param {Object} bookingData.flightOffer - 航班报价
 * @param {Array} bookingData.travelers - 乘客信息数组
 * @returns {Promise<Object>} 预订结果
 */
export const createBooking = (bookingData) => {
  return apiClient.post('/flights/bookings', bookingData);
};

/**
 * 获取预订列表
 * @param {Object} params - 查询参数
 * @param {String} params.travelId - 差旅申请ID（可选）
 * @param {String} params.status - 预订状态（可选）
 * @returns {Promise<Object>} 预订列表
 */
export const getBookings = (params = {}) => {
  return apiClient.get('/flights/bookings', { params });
};

/**
 * 根据差旅单号查询机票预订及费用（用于核销）
 * @param {String} travelNumber - 差旅单号
 * @returns {Promise<Object>} 预订和费用信息
 */
export const getBookingsByTravelNumber = (travelNumber) => {
  return apiClient.get(`/flights/bookings/by-travel-number/${travelNumber}`);
};

/**
 * 获取预订详情
 * @param {String} id - 预订ID
 * @returns {Promise<Object>} 预订详情
 */
export const getBooking = (id) => {
  return apiClient.get(`/flights/bookings/${id}`);
};

/**
 * 取消预订
 * @param {String} id - 预订ID
 * @param {String} reason - 取消原因（可选）
 * @returns {Promise<Object>} 取消结果
 */
export const cancelBooking = (id, reason) => {
  return apiClient.delete(`/flights/bookings/${id}`, { data: { reason } });
};

/**
 * 获取差旅申请的机票预订
 * @param {String} travelId - 差旅申请ID
 * @returns {Promise<Object>} 机票预订列表和统计
 */
export const getTravelFlights = (travelId) => {
  return apiClient.get(`/travel/${travelId}/flights`);
};

