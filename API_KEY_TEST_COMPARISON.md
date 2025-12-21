# API Key 测试对比报告

## 测试时间
2025-12-21

## 测试的 API Key

### API Key 1（原 Key）
- **API Key**: `bHIS0a388f5DhS0Q5iw8RVef8PdZeEj2`
- **API Secret**: `CZqleP2XaliOhAsU`
- **用途**: 酒店专用 API Key

### API Key 2（新 Key）
- **API Key**: `xNR7xyXorQIlMnh9CyghN7FxoA9zeszO`
- **API Secret**: `CcPEnQZVXK9TAQTl`
- **用途**: 待确认

## 测试结果对比

| 测试项 | API Key 1 (SDK) | API Key 1 (HTTP) | API Key 2 (HTTP) | API Key 2 (SDK) |
|--------|----------------|------------------|------------------|-----------------|
| **Token 获取** | ✅ 成功 | ✅ 成功 | ✅ 成功 | ✅ 成功 |
| **酒店搜索 API** | ✅ 成功 | ✅ 成功 | ✅ 成功 | ✅ 成功 |
| **酒店报价 API** | ✅ 成功 | ✅ 成功 | ✅ 成功 | ✅ 成功 |
| **酒店预订 API** | ❌ 401 错误 | ❌ 401 错误 | ❌ 401 错误 | ❌ 401 错误 |

## 错误详情对比

### API Key 1 错误信息
```json
{
  "errors": [{
    "code": 38190,
    "title": "Invalid access token",
    "detail": "The access token provided in the Authorization header is invalid",
    "status": 401
  }]
}
```

**www-authenticate 头**:
```
Bearer realm="null",error="invalid_token",
error_description="keymanagement.service.InvalidAPICallAsNoApiProductMatchFound: 
Invalid API call as no apiproduct match found"
```

### API Key 2 错误信息
```json
{
  "errors": [{
    "code": 38190,
    "title": "Invalid access token",
    "detail": "The access token provided in the Authorization header is invalid",
    "status": 401
  }]
}
```

**www-authenticate 头**:
```
Bearer realm="null",error="invalid_token",
error_description="keymanagement.service.InvalidAPICallAsNoApiProductMatchFound: 
Invalid API call as no apiproduct match found"
```

## 结论

### ✅ 共同点
1. **两个 API Key 都能成功获取 Token**
2. **两个 API Key 都能成功调用搜索和报价 API**
3. **两个 API Key 都返回相同的预订错误**（错误代码 38190）

### ❌ 问题
**两个 API Key 都缺少酒店预订权限**

- 错误代码：`38190`
- 错误原因：`Invalid API call as no apiproduct match found`
- 含义：API Key 没有关联 "Hotel Booking" API 产品

## 解决方案

### 需要检查的事项
1. **登录 Amadeus 开发者门户**
   - 访问：https://developers.amadeus.com/
   - 进入 "My Self-Service" > "API Keys"

2. **检查两个 API Key 的权限**
   - API Key 1: `bHIS0a388f5DhS0Q5iw8RVef8PdZeEj2`
   - API Key 2: `xNR7xyXorQIlMnh9CyghN7FxoA9zeszO`
   - 确认是否启用了 "Hotel Booking" API 产品

3. **启用预订权限**
   - 如果权限未启用，需要在开发者门户中启用
   - 等待权限生效（可能需要几分钟）

4. **重新测试**
   - 运行测试脚本验证权限是否生效

## 测试脚本

### 直接 HTTP 接口测试
```bash
cd backend
AMADEUS_HOTEL_API_KEY=xNR7xyXorQIlMnh9CyghN7FxoA9zeszO \
AMADEUS_HOTEL_API_SECRET=CcPEnQZVXK9TAQTl \
node scripts/testHotelBookingDirectApi.js
```

### SDK 方式测试
```bash
cd backend
AMADEUS_HOTEL_API_KEY=xNR7xyXorQIlMnh9CyghN7FxoA9zeszO \
AMADEUS_HOTEL_API_SECRET=CcPEnQZVXK9TAQTl \
node scripts/testHotelBookingApi.js
```

## 建议

1. **优先使用 API Key 2**（如果它有更多权限）
2. **在 Amadeus 开发者门户中检查两个 Key 的权限差异**
3. **确认哪个 Key 有预订权限，或为其中一个启用预订权限**
4. **更新 `.env` 文件使用有预订权限的 API Key**

---

**测试完成时间**: 2025-12-21  
**测试环境**: Test (https://test.api.amadeus.com)

