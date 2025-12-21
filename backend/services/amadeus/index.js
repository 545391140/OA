/**
 * Amadeus API 服务统一导出入口
 * 统一导出所有模块的功能，保持向后兼容
 */

const base = require('./base');                    // 航班业务使用（Axios）
const flightSearch = require('./flightSearch');     // 航班业务使用（Axios）
const flightBooking = require('./booking');        // 航班业务使用（Axios）
const hotelSearchSdk = require('./hotelSearchSdk'); // 酒店业务使用（SDK）
const hotelBookingSdk = require('./hotelBookingSdk'); // 酒店业务使用（SDK）

// 统一导出所有功能
module.exports = {
  // 基础功能（航班业务使用）
  ...base,
  
  // 航班搜索（Axios方式）
  ...flightSearch,
  
  // 航班预订管理（Axios方式）
  ...flightBooking,
  
  // 酒店搜索（SDK方式）
  ...hotelSearchSdk,
  
  // 酒店预订管理（SDK方式）
  ...hotelBookingSdk,
};

