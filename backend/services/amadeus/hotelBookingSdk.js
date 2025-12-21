/**
 * 酒店预订管理服务模块（使用 Amadeus SDK）
 * 负责创建预订、获取订单详情、取消订单等功能
 */

const Amadeus = require('amadeus');
const config = require('../../config');
const logger = require('../../utils/logger');

// 初始化 SDK 实例（与 hotelSearchSdk.js 共享配置）
const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_HOTEL_API_KEY || config.AMADEUS_API_KEY || process.env.AMADEUS_API_KEY,
  clientSecret: process.env.AMADEUS_HOTEL_API_SECRET || config.AMADEUS_API_SECRET || process.env.AMADEUS_API_SECRET,
  hostname: (config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test') === 'production' 
    ? 'production' 
    : 'test',
});

/**
 * 统一错误处理适配器
 * 将 SDK 错误格式转换为统一的错误格式
 */
function handleSdkError(error) {
  // SDK 错误格式
  if (error.description) {
    const errorObj = new Error(error.description);
    errorObj.code = error.code;
    errorObj.statusCode = error.statusCode || 500;
    errorObj.originalError = error;
    return errorObj;
  }
  
  // 其他错误
  return error;
}

/**
 * 创建酒店预订
 * 参考：https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-booking
 * 
 * @param {Object} bookingData - 预订数据
 * @param {Object} bookingData.offerId - 酒店报价ID（必填）
 * @param {Array} bookingData.guests - 客人信息数组
 * @param {Object} bookingData.guests[].name - 姓名 {firstName: String, lastName: String}
 * @param {Object} bookingData.guests[].contact - 联系方式
 * @param {String} bookingData.guests[].contact.emailAddress - 邮箱
 * @param {Array} bookingData.guests[].contact.phones - 电话数组
 * @param {String} bookingData.payments - 支付信息（可选）
 * @param {String} bookingData.rooms - 房间信息（可选）
 * @returns {Promise<Object>} 预订结果
 */
async function createHotelBooking(bookingData) {
  try {
    const { offerId, guests, payments, rooms } = bookingData;

    // 数据验证
    if (!offerId) {
      throw new Error('offerId参数无效');
    }
    if (!guests || !Array.isArray(guests) || guests.length === 0) {
      throw new Error('guests参数无效：必须至少包含一个客人');
    }

    // 验证客人信息
    guests.forEach((guest, index) => {
      if (!guest.name || !guest.contact) {
        throw new Error(`客人${index + 1}信息不完整`);
      }
      if (!guest.name.firstName || !guest.name.lastName) {
        throw new Error(`客人${index + 1}姓名不完整`);
      }
      if (!guest.contact.emailAddress) {
        throw new Error(`客人${index + 1}邮箱必填`);
      }
    });

    // 构建请求体（SDK 格式）
    const requestBody = {
      data: {
        offerId,
        guests: guests.map((guest, index) => ({
          id: guest.id || `GUEST_${index + 1}`,
          name: {
            firstName: guest.name.firstName,
            lastName: guest.name.lastName,
          },
          contact: {
            emailAddress: guest.contact.emailAddress,
            phones: guest.contact.phones || [],
          },
        })),
      },
    };

    if (payments) {
      requestBody.data.payments = payments;
    }
    if (rooms) {
      requestBody.data.rooms = rooms;
    }

    // 使用 SDK 调用 API（SDK 自动处理认证和 Token）
    const response = await amadeus.booking.hotelBookings.post(requestBody);

    if (response.data && response.data) {
      logger.debug('酒店预订成功');
      return {
        success: true,
        data: response.data,
        meta: response.meta || {},
      };
    } else {
      throw new Error('预订API响应格式错误');
    }
  } catch (error) {
    logger.error('创建酒店预订失败:', error.message);
    throw handleSdkError(error);
  }
}

/**
 * 获取订单详情
 * 参考：https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-booking-management
 * 
 * @param {String} bookingId - Amadeus订单ID
 * @returns {Promise<Object>} 订单详情
 */
async function getHotelBooking(bookingId) {
  try {
    if (!bookingId) {
      throw new Error('bookingId参数必填');
    }

    // 使用 SDK 调用 API（SDK 自动处理认证和 Token）
    const response = await amadeus.booking.hotelBooking(bookingId).get();

    if (response.data && response.data) {
      return {
        success: true,
        data: response.data,
        meta: response.meta || {},
      };
    } else {
      throw new Error('获取订单详情API响应格式错误');
    }
  } catch (error) {
    logger.error('获取订单详情失败:', error.message);
    throw handleSdkError(error);
  }
}

/**
 * 取消订单
 * 参考：https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-booking-management
 * 
 * @param {String} bookingId - Amadeus订单ID
 * @returns {Promise<Object>} 取消结果
 */
async function cancelHotelBooking(bookingId) {
  try {
    if (!bookingId) {
      throw new Error('bookingId参数必填');
    }

    // 使用 SDK 调用 API（SDK 自动处理认证和 Token）
    const response = await amadeus.booking.hotelBooking(bookingId).delete();

    if (response.data && response.data) {
      logger.debug('订单取消成功');
      return {
        success: true,
        data: response.data,
        meta: response.meta || {},
      };
    } else {
      // DELETE请求可能返回204 No Content
      return {
        success: true,
        message: '订单已取消',
      };
    }
  } catch (error) {
    logger.error('取消订单失败:', error.message);
    
    // 处理订单无法取消的情况
    if (error.code === 400 || error.statusCode === 400 || 
        error.code === 422 || error.statusCode === 422) {
      const errorDetail = error.description || error.message;
      throw new Error(errorDetail || '订单无法取消，可能已超过取消时限');
    }
    
    throw handleSdkError(error);
  }
}

module.exports = {
  createHotelBooking,
  getHotelBooking,
  cancelHotelBooking,
};

