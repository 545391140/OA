# Amadeus 酒店预订 API 验证报告

## API 文档参考
- **官方文档**: https://developers.amadeus.com/self-service/category/hotels/api-doc/hotel-booking/api-reference
- **测试时间**: 2025-12-21

## API 端点信息

### 预订接口
- **端点**: `POST /v1/booking/hotel-bookings`
- **环境**:
  - Test: `https://test.api.amadeus.com/v1/booking/hotel-bookings`
  - Production: `https://api.amadeus.com/v1/booking/hotel-bookings`

### 请求格式验证

根据官方文档，我们的实现格式：

```javascript
{
  "data": {
    "offerId": "string",  // ✅ 必填
    "guests": [           // ✅ 必填
      {
        "id": "string",   // ✅ 已实现
        "name": {         // ✅ 已实现
          "firstName": "string",
          "lastName": "string"
        },
        "contact": {      // ✅ 已实现
          "emailAddress": "string",
          "phones": [     // ✅ 已实现
            {
              "deviceType": "MOBILE" | "LANDLINE",
              "countryCallingCode": "string",
              "number": "string"
            }
          ]
        }
      }
    ],
    "payments": [...],    // ⚠️ 可选
    "rooms": [...]        // ⚠️ 可选
  }
}
```

**✅ 我们的实现符合文档要求**

## 测试结果

### API Key 1: `bHIS0a388f5DhS0Q5iw8RVef8PdZeEj2`
- **Token 获取**: ✅ 成功
- **搜索 API**: ✅ 成功
- **报价 API**: ✅ 成功
- **预订 API**: ❌ **401 错误（错误代码 38190）**

### API Key 2: `xNR7xyXorQIlMnh9CyghN7FxoA9zeszO`
- **Token 获取**: ✅ 成功
- **搜索 API**: ✅ 成功
- **报价 API**: ✅ 成功
- **预订 API**: ❌ **401 错误（错误代码 38190）**

## 错误分析

### 错误代码 38190
- **HTTP 状态码**: 401 Unauthorized
- **错误标题**: Invalid access token
- **错误详情**: The access token provided in the Authorization header is invalid
- **根本原因**: `Invalid API call as no apiproduct match found`

### 关键发现

1. **Token 本身有效**
   - 两个 API Key 都能成功获取 Token
   - Token 可以用于搜索和报价 API

2. **API 产品权限缺失**
   - 错误信息明确：`no apiproduct match found`
   - 表示 API Key 没有关联 "Hotel Booking" API 产品

3. **请求格式正确**
   - 我们的请求体格式符合官方文档要求
   - SDK 和直接 HTTP 调用都使用相同的格式

## 权限要求

根据 Amadeus 文档，酒店预订 API 需要：

1. **API 产品权限**
   - 必须在 Amadeus 开发者门户中启用 "Hotel Booking" API 产品
   - 这是 Self-Service API，需要单独申请权限

2. **API Key 配置**
   - API Key 必须关联到包含预订权限的 API 产品
   - 测试环境和生产环境的权限是分开的

## 解决方案

### 步骤 1: 检查 API Key 权限

1. 登录 [Amadeus for Developers](https://developers.amadeus.com/)
2. 进入 "My Self-Service" > "API Keys"
3. 检查两个 API Key 的权限：
   - API Key 1: `bHIS0a388f5DhS0Q5iw8RVef8PdZeEj2`
   - API Key 2: `xNR7xyXorQIlMnh9CyghN7FxoA9zeszO`

### 步骤 2: 启用预订权限

在 API Key 详情页面：
1. 查看 "API Products" 或 "Permissions" 部分
2. 确认是否包含 "Hotel Booking" 或 "Hotel Self-Service Booking"
3. 如果未启用，点击启用该权限
4. 等待权限生效（可能需要几分钟）

### 步骤 3: 验证权限

权限启用后，运行测试脚本验证：

```bash
# 使用 API Key 1
cd backend
AMADEUS_HOTEL_API_KEY=bHIS0a388f5DhS0Q5iw8RVef8PdZeEj2 \
AMADEUS_HOTEL_API_SECRET=CZqleP2XaliOhAsU \
node scripts/testHotelBookingDirectApi.js

# 或使用 API Key 2
AMADEUS_HOTEL_API_KEY=xNR7xyXorQIlMnh9CyghN7FxoA9zeszO \
AMADEUS_HOTEL_API_SECRET=CcPEnQZVXK9TAQTl \
node scripts/testHotelBookingDirectApi.js
```

## 代码实现验证

### ✅ 请求格式正确
我们的代码实现完全符合官方文档要求：

```javascript
// backend/services/amadeus/hotelBookingSdk.js
const requestBody = {
  data: {
    offerId,                    // ✅ 必填字段
    guests: guests.map(...),    // ✅ 必填字段，格式正确
    payments,                   // ⚠️ 可选字段
    rooms,                      // ⚠️ 可选字段
  },
};
```

### ✅ SDK 调用方式正确
```javascript
// SDK 调用方式
await amadeus.booking.hotelBookings.post(requestBody);
```

### ✅ HTTP 直接调用方式正确
```javascript
// HTTP 直接调用方式
await axios.post(
  `${baseURL}/v1/booking/hotel-bookings`,
  requestBody,
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/vnd.amadeus+json',
      'Accept': 'application/vnd.amadeus+json',
    },
  }
);
```

## 结论

1. ✅ **代码实现正确** - 请求格式完全符合官方文档
2. ✅ **Token 获取正常** - 两个 API Key 都能成功获取 Token
3. ❌ **权限配置缺失** - 两个 API Key 都缺少酒店预订权限
4. ⚠️ **需要操作** - 在 Amadeus 开发者门户中启用预订权限

## 参考文档

- [Amadeus 酒店预订 API 参考](https://developers.amadeus.com/self-service/category/hotels/api-doc/hotel-booking/api-reference)
- [Amadeus 常见错误和权限](https://developers.amadeus.com/self-service/apis-docs/guides/permissions-and-errors-744)
- [Amadeus API Keys 管理](https://developers.amadeus.com/self-service/apis-docs/guides/api-keys-5)

---

**验证完成时间**: 2025-12-21  
**验证环境**: Test (https://test.api.amadeus.com)

