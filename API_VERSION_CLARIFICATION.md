# Amadeus 酒店预订 API 版本说明

## 发现的问题

根据官方文档截图，发现存在两个版本的 API：

### v1 API
- **端点**: `POST /v1/booking/hotel-bookings`
- **Base URL**: `test.api.amadeus.com/v1`
- **状态**: ❌ 返回 401 错误（权限未生效）

### v2 API
- **端点**: `POST /v2/booking/hotel-orders`
- **Base URL**: `test.api.amadeus.com/v2`
- **状态**: ⚠️ 返回 400 错误（权限已生效，但需要调整请求格式）
- **错误**: `Parameter missing: tid`

## 关键发现

1. **权限已生效**：v2 API 从 401 变为 400，说明权限已生效
2. **API 版本不同**：v2 API 使用不同的端点和请求格式
3. **SDK 支持**：需要确认 Amadeus Node.js SDK 是否支持 v2 API

## 下一步行动

1. 检查 v2 API 的完整请求格式（特别是 `tid` 参数）
2. 更新代码以使用 v2 API
3. 如果 SDK 不支持 v2，考虑直接使用 HTTP 调用

## 参考文档

- v2 API 文档: https://developers.amadeus.com/self-service/category/hotels/api-doc/hotel-booking/api-reference
- Base URL: `test.api.amadeus.com/v2`
- 端点: `POST /booking/hotel-orders`

