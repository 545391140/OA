# v2 API 迁移计划

## 当前状态

### v1 API (`/v1/booking/hotel-bookings`)
- ❌ 返回 401 错误（权限未生效）
- SDK 支持：`amadeus.booking.hotelBookings.post()`

### v2 API (`/v2/booking/hotel-orders`)
- ✅ 权限已生效（从 401 变为 400）
- ⚠️ 需要调整请求格式（缺少 `tid` 参数）
- SDK 支持：待确认

## 需要解决的问题

1. **`tid` 参数**：v2 API 需要 `tid` 参数，但报价响应中没有
2. **请求格式**：v2 API 的请求格式可能与 v1 不同
3. **SDK 支持**：确认 Amadeus Node.js SDK 是否支持 v2 API

## 解决方案

### 方案 1：使用 v2 API（推荐）
- 如果 SDK 支持 v2 API，直接更新代码
- 如果 SDK 不支持，使用 HTTP 直接调用

### 方案 2：等待 v1 API 权限生效
- 继续使用 v1 API
- 等待权限生效后测试

## 下一步行动

1. 检查 v2 API 文档，确认 `tid` 参数的来源
2. 测试 SDK 是否支持 v2 API
3. 更新 `hotelBookingSdk.js` 以支持 v2 API

