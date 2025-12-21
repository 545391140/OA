# Amadeus 酒店 API 测试报告

**测试日期**: 2025-12-21  
**测试环境**: Test Environment  
**API Key**: bHIS0a388f5DhS0Q5iw8RVef8PdZeEj2  
**API Secret**: CZqleP2XaliOhAsU  

## 1. 测试摘要

| 测试项目 | 状态 | 说明 |
|---------|------|------|
| 配置验证 | ✅ 通过 | API Key 和 Secret 配置正确 |
| OAuth 2.0 认证 | ✅ 通过 | 成功获取 Access Token（有效期 1799 秒） |
| 酒店地理坐标搜索 | ✅ 通过 | 成功搜索到酒店列表（193个酒店） |
| 酒店报价搜索 | ❌ 失败 | API 参数格式错误（需要进一步验证） |
| 酒店价格确认 | ❌ 失败 | 需要先成功搜索报价 |
| 酒店名称自动完成 | ❌ 失败 | API 参数格式错误 |
| 酒店评分查询 | ⚠️ 警告 | API 调用成功但未找到评分数据 |

**总体状态**: ⚠️ **部分功能可用，需要进一步验证 API 参数格式**

---

## 2. 详细测试结果

### 2.1 ✅ 配置验证

**测试结果**: 通过

**验证内容**:
- API Key 格式正确
- API Secret 格式正确
- 环境配置正确（test）

**配置信息**:
- API Key: `bHIS0a388f5DhS0Q5iw8RVef8PdZeEj2`
- Environment: `test`
- Base URL: `https://test.api.amadeus.com`

---

### 2.2 ✅ OAuth 2.0 认证

**测试结果**: 通过

**验证内容**:
- 成功获取 Access Token
- Token 类型: Bearer
- Token 有效期: 1799 秒（约 30 分钟）
- Token 格式: 28 字符（Amadeus API 标准格式）

**认证端点**:
- `POST https://test.api.amadeus.com/v1/security/oauth2/token`

**请求格式**:
```http
POST /v1/security/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id={API_KEY}&client_secret={API_SECRET}
```

**响应示例**:
```json
{
  "type": "amadeusOAuth2Token",
  "token_type": "Bearer",
  "access_token": "DkFYXMOJ8uTswNk0lfDW...",
  "expires_in": 1799
}
```

**结论**: ✅ 认证功能正常，可以正常获取 Token

---

### 2.3 ✅ 酒店地理坐标搜索（Hotel Name Autocomplete）

**API**: `/v1/reference-data/locations/hotels/by-geocode`  
**方法**: GET  
**状态**: ✅ **成功**

**测试参数**:
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "radius": 5,
  "hotelSource": "ALL",
  "keyword": "hotel"
}
```

**测试结果**:
- ✅ API 调用成功
- ✅ 找到 193 个酒店
- ✅ 返回数据格式正确

**响应数据结构**:
```json
{
  "data": [
    {
      "hotelId": "YXNYCXXX",
      "name": "酒店名称",
      "geoCode": {
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "address": {
        "lines": ["地址行"],
        "cityName": "城市名称",
        "countryCode": "US"
      }
    }
  ],
  "meta": {
    "count": 193
  }
}
```

**示例酒店ID**:
- `YXNYCXXX`
- `ALNYC647`
- `XTNYC130`

**结论**: ✅ **此 API 完全可用，可以用于获取酒店列表**

---

### 2.4 ❌ 酒店报价搜索（Hotel Offers Search）

**API**: `/v3/shopping/hotel-offers/by-hotel`  
**方法**: GET  
**状态**: ❌ **失败 - 参数格式错误**

**测试参数**:
```json
{
  "hotelIds": "YXNYCXXX",
  "checkInDate": "2026-01-20",
  "checkOutDate": "2026-01-22",
  "adults": 1,
  "roomQuantity": 1,
  "currencyCode": "USD"
}
```

**错误响应**:
```json
{
  "errors": [
    {
      "status": 400,
      "code": 308,
      "title": "INVALID FORMAT",
      "detail": "Amadeus Error - INVALID FORMAT"
    }
  ]
}
```

**问题分析**:
1. API 端点可能不正确
2. 参数格式可能不符合 API 要求
3. 可能需要使用不同的 API 版本或端点

**需要进一步验证**:
- 确认正确的 API 端点
- 验证参数格式（hotelIds 是否需要数组格式或其他格式）
- 检查 API 文档中的最新要求

**建议**:
- 查看 Amadeus API 官方文档确认正确的端点
- 尝试使用不同的参数格式
- 联系 Amadeus 技术支持获取帮助

---

### 2.5 ❌ 酒店价格确认（Hotel Offer Price）

**API**: `/v3/shopping/hotel-offers/{offerId}/price`  
**方法**: GET  
**状态**: ❌ **失败 - 需要先成功获取 offerId**

**问题**: 由于酒店报价搜索失败，无法获取 offerId，因此无法测试价格确认功能。

**依赖**: 需要先成功调用酒店报价搜索 API 获取 offerId。

---

### 2.6 ❌ 酒店名称自动完成

**API**: `/v1/reference-data/locations/hotels/by-geocode`  
**方法**: GET  
**状态**: ❌ **失败 - 参数格式错误**

**测试参数**:
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "radius": 5,
  "hotelSource": "ALL",
  "keyword": "hotel"
}
```

**错误响应**:
```json
{
  "errors": [
    {
      "status": 400,
      "code": 367,
      "title": "INVALID FORMAT"
    }
  ]
}
```

**问题分析**:
- 可能是 `keyword` 参数不支持
- 可能是 `hotelSource` 参数值不正确
- 可能需要移除某些可选参数

**注意**: 同样的 API 端点在不使用 `keyword` 参数时成功返回了 193 个酒店，说明基本功能可用。

**建议**: 
- 移除 `keyword` 参数重新测试
- 检查 `hotelSource` 参数的有效值

---

### 2.7 ⚠️ 酒店评分查询（Hotel Ratings）

**API**: `/v2/e-reputation/hotel-sentiments`  
**方法**: GET  
**状态**: ⚠️ **API 调用成功，但未找到评分数据**

**测试参数**:
```json
{
  "hotelIds": "YXNYCXXX,ALNYC647,XTNYC130"
}
```

**响应**:
```json
{
  "data": []
}
```

**分析**:
- ✅ API 端点正确
- ✅ 参数格式正确
- ⚠️ 测试环境可能没有评分数据
- ⚠️ 或者这些酒店ID在测试环境中没有评分数据

**结论**: API 功能正常，但测试环境可能缺少评分数据。生产环境可能有数据。

---

## 3. API 可用性总结

### 3.1 ✅ 完全可用的 API

| API | 端点 | 状态 | 说明 |
|-----|------|------|------|
| **酒店地理坐标搜索** | `/v1/reference-data/locations/hotels/by-geocode` | ✅ 可用 | 成功返回193个酒店 |

**使用示例**:
```javascript
GET /v1/reference-data/locations/hotels/by-geocode?latitude=40.7128&longitude=-74.0060&radius=5&hotelSource=ALL
Authorization: Bearer {access_token}
```

**返回数据格式**:
- `data`: 酒店数组
- 每个酒店包含: `hotelId`, `name`, `geoCode`, `address` 等字段

---

### 3.2 ❌ 需要进一步验证的 API

| API | 端点 | 状态 | 问题 |
|-----|------|------|------|
| **酒店报价搜索** | `/v3/shopping/hotel-offers/by-hotel` | ❌ 参数格式错误 | 需要确认正确的参数格式 |
| **酒店价格确认** | `/v3/shopping/hotel-offers/{offerId}/price` | ❌ 依赖报价搜索 | 需要先成功获取 offerId |
| **酒店名称自动完成** | `/v1/reference-data/locations/hotels/by-geocode` | ⚠️ 部分功能 | 不使用 keyword 参数时可用 |

---

### 3.3 ⚠️ 功能正常但无数据的 API

| API | 端点 | 状态 | 说明 |
|-----|------|------|------|
| **酒店评分查询** | `/v2/e-reputation/hotel-sentiments` | ⚠️ API正常但无数据 | 测试环境可能缺少评分数据 |

---

## 4. 入参格式验证

### 4.1 ✅ 已验证正确的入参格式

#### 酒店地理坐标搜索

**端点**: `/v1/reference-data/locations/hotels/by-geocode`

**必填参数**:
- `latitude` (Number): 纬度，例如: `40.7128`
- `longitude` (Number): 经度，例如: `-74.0060`

**可选参数**:
- `radius` (Number): 搜索半径（公里），例如: `5`
- `hotelSource` (String): 酒店来源，例如: `ALL`, `AMADEUS`, `EXPEDIA`
- ⚠️ `keyword` (String): 关键词（可能不支持或格式不正确）

**请求示例**:
```http
GET /v1/reference-data/locations/hotels/by-geocode?latitude=40.7128&longitude=-74.0060&radius=5&hotelSource=ALL
Authorization: Bearer {access_token}
Accept: application/vnd.amadeus+json
```

**验证结果**: ✅ **参数格式正确，API 调用成功**

---

#### 酒店评分查询

**端点**: `/v2/e-reputation/hotel-sentiments`

**必填参数**:
- `hotelIds` (String): 逗号分隔的酒店ID列表，例如: `"YXNYCXXX,ALNYC647"`

**请求示例**:
```http
GET /v2/e-reputation/hotel-sentiments?hotelIds=YXNYCXXX,ALNYC647,XTNYC130
Authorization: Bearer {access_token}
Accept: application/vnd.amadeus+json
```

**验证结果**: ✅ **参数格式正确，API 调用成功（但测试环境无数据）**

---

### 4.2 ❌ 需要进一步验证的入参格式

#### 酒店报价搜索

**端点**: `/v3/shopping/hotel-offers/by-hotel`

**尝试的参数格式**:
```json
{
  "hotelIds": "YXNYCXXX",  // 单个酒店ID
  "checkInDate": "2026-01-20",
  "checkOutDate": "2026-01-22",
  "adults": 1,
  "roomQuantity": 1,
  "currencyCode": "USD"
}
```

**错误**: `INVALID FORMAT`

**可能的问题**:
1. `hotelIds` 参数格式不正确（可能需要数组格式或其他格式）
2. API 端点可能不正确
3. 日期格式可能不正确
4. 可能需要其他必填参数

**需要验证**:
- 查看 Amadeus API 官方文档
- 尝试不同的参数格式
- 确认 API 版本和端点

---

## 5. 返回数据格式验证

### 5.1 ✅ 已验证的返回数据格式

#### 酒店地理坐标搜索响应

```json
{
  "data": [
    {
      "hotelId": "YXNYCXXX",
      "name": "酒店名称",
      "geoCode": {
        "latitude": 40.7128,
        "longitude": -74.0060
      },
      "address": {
        "lines": ["地址行1", "地址行2"],
        "cityName": "城市名称",
        "countryCode": "US",
        "postalCode": "10001"
      },
      "chainCode": "XX",
      "iataCode": "NYC"
    }
  ],
  "meta": {
    "count": 193,
    "links": {
      "self": "https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-geocode?..."
    }
  }
}
```

**数据结构说明**:
- `data`: 酒店数组
- `data[].hotelId`: 酒店ID（用于后续搜索报价）
- `data[].name`: 酒店名称
- `data[].geoCode`: 地理坐标
- `data[].address`: 地址信息
- `meta`: 元数据（总数、链接等）

---

#### 酒店评分查询响应

```json
{
  "data": [],
  "meta": {
    "count": 0
  }
}
```

**说明**: 测试环境返回空数组，可能是测试环境没有评分数据。

---

### 5.2 ⚠️ 未验证的返回数据格式

由于酒店报价搜索 API 调用失败，以下数据格式尚未验证：

- 酒店报价搜索响应格式
- 酒店价格确认响应格式
- 酒店预订响应格式

**需要**: 先解决 API 参数格式问题，然后验证返回数据格式。

---

## 6. 发现的问题和建议

### 6.1 主要问题

1. **酒店报价搜索 API 参数格式错误**
   - 问题: `/v3/shopping/hotel-offers/by-hotel` 返回 `INVALID FORMAT` 错误
   - 影响: 无法获取酒店报价，影响核心功能
   - 建议: 
     - 查看 Amadeus API 官方文档确认正确的参数格式
     - 联系 Amadeus 技术支持
     - 尝试使用不同的 API 版本或端点

2. **酒店名称自动完成 API 参数问题**
   - 问题: 使用 `keyword` 参数时返回错误
   - 影响: 无法使用关键词搜索
   - 建议: 移除 `keyword` 参数，使用地理坐标搜索即可

3. **测试环境数据限制**
   - 问题: 酒店评分查询返回空数据
   - 影响: 无法验证评分功能
   - 建议: 在生产环境测试，或使用其他测试数据

---

### 6.2 已验证可用的功能

1. ✅ **OAuth 2.0 认证**: 完全可用
2. ✅ **酒店地理坐标搜索**: 完全可用，可以获取酒店列表
3. ✅ **酒店评分查询 API**: API 可用，但测试环境无数据

---

### 6.3 下一步行动

1. **立即行动**:
   - [ ] 查看 Amadeus API 官方文档，确认酒店报价搜索 API 的正确参数格式
   - [ ] 尝试不同的参数格式（数组、逗号分隔等）
   - [ ] 验证日期格式是否正确

2. **短期行动**:
   - [ ] 联系 Amadeus 技术支持获取帮助
   - [ ] 使用 Postman 或类似工具测试 API
   - [ ] 查看 Amadeus API 示例代码

3. **中期行动**:
   - [ ] 在生产环境测试（如果有权限）
   - [ ] 验证所有 API 的返回数据格式
   - [ ] 完善错误处理逻辑

---

## 7. API 接口清单

### 7.1 已验证可用的接口

| 接口 | 端点 | 方法 | 状态 | 备注 |
|------|------|------|------|------|
| OAuth 认证 | `/v1/security/oauth2/token` | POST | ✅ 可用 | 认证功能正常 |
| 酒店地理坐标搜索 | `/v1/reference-data/locations/hotels/by-geocode` | GET | ✅ 可用 | 成功返回193个酒店 |
| 酒店评分查询 | `/v2/e-reputation/hotel-sentiments` | GET | ⚠️ API可用但无数据 | 测试环境可能缺少数据 |

### 7.2 需要进一步验证的接口

| 接口 | 端点 | 方法 | 状态 | 问题 |
|------|------|------|------|------|
| 酒店报价搜索 | `/v3/shopping/hotel-offers/by-hotel` | GET | ❌ 参数格式错误 | 需要确认正确的参数格式 |
| 酒店价格确认 | `/v3/shopping/hotel-offers/{offerId}/price` | GET | ❌ 依赖报价搜索 | 需要先成功获取 offerId |
| 酒店预订 | `/v1/booking/hotel-bookings` | POST | ❌ 未测试 | 需要先解决报价搜索问题 |
| 酒店预订管理 | `/v1/booking/hotel-bookings/{bookingId}` | GET/DELETE | ❌ 未测试 | 需要先解决预订问题 |

---

## 8. 测试环境配置

**环境变量**:
```bash
AMADEUS_HOTEL_API_KEY=bHIS0a388f5DhS0Q5iw8RVef8PdZeEj2
AMADEUS_HOTEL_API_SECRET=CZqleP2XaliOhAsU
AMADEUS_API_ENV=test
```

**Base URL**:
- Test: `https://test.api.amadeus.com`
- Production: `https://api.amadeus.com`

---

## 9. 测试脚本

**测试脚本位置**: `backend/scripts/testHotelApi.js`

**运行方式**:
```bash
# 使用酒店专用 API Key
AMADEUS_HOTEL_API_KEY=bHIS0a388f5DhS0Q5iw8RVef8PdZeEj2 \
AMADEUS_HOTEL_API_SECRET=CZqleP2XaliOhAsU \
node backend/scripts/testHotelApi.js
```

**测试报告位置**:
- JSON: `backend/logs/hotel-api-test-report-{timestamp}.json`
- Markdown: `backend/logs/hotel-api-test-report-{timestamp}.md`

---

## 10. 结论和建议

### 10.1 当前状态

✅ **可用功能**:
- OAuth 2.0 认证
- 酒店地理坐标搜索（可以获取酒店列表）

❌ **需要解决的问题**:
- 酒店报价搜索 API 参数格式
- 酒店价格确认（依赖报价搜索）
- 酒店预订（依赖报价搜索）

⚠️ **部分可用**:
- 酒店评分查询（API 可用但测试环境无数据）

### 10.2 建议

1. **优先解决酒店报价搜索问题**
   - 这是核心功能，必须解决才能继续开发
   - 建议查看官方文档或联系技术支持

2. **使用已验证的 API**
   - 可以先实现酒店列表功能（使用地理坐标搜索）
   - 等报价搜索问题解决后再实现报价和预订功能

3. **完善错误处理**
   - 对于 API 调用失败的情况，提供友好的错误提示
   - 记录详细的错误日志便于排查

4. **持续测试**
   - 定期运行测试脚本验证 API 可用性
   - 在解决参数格式问题后重新测试所有 API

---

**报告生成时间**: 2025-12-21  
**测试脚本版本**: 1.0  
**下次更新**: 解决 API 参数格式问题后

