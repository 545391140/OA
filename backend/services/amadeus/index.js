/**
 * Amadeus API 服务统一导出入口
 * 统一导出所有模块的功能，保持向后兼容
 */

const base = require('./base');
const flightSearch = require('./flightSearch');
const booking = require('./booking');

// 统一导出所有功能
module.exports = {
  // 基础功能
  ...base,
  
  // 航班搜索
  ...flightSearch,
  
  // 预订管理
  ...booking,
};

