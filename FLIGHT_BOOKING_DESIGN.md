# 机票查询预订功能设计方案

## 1. 项目概述

### 1.1 功能描述
基于 Amadeus Self-Service APIs 实现机票查询和预订功能，集成到现有的差旅费用管理系统中。

### 1.2 技术栈
- **后端**: Node.js + Express + MongoDB
- **前端**: React + Material-UI
- **第三方API**: Amadeus for Developers (Self-Service APIs)
- **参考文档**: https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/

### 1.3 功能范围
- ✅ 机票搜索（Flight Offers Search）
- ✅ 航班详情查询
- ✅ 机票价格确认
- ✅ 机票预订
- ✅ 预订管理（查看、取消）
- ✅ 与差旅申请集成

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────┐
│   Frontend       │
│  (React/UI)      │
└────────┬─────────┘
         │
         │ HTTP/REST API
         │
┌────────▼─────────┐
│   Backend API    │
│   (Express)      │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────────┐
│MongoDB│ │  Amadeus  │
│       │ │    API    │
└───────┘ └───────────┘
```

### 2.2 目录结构

```
backend/
├── services/
│   └── amadeusApiService.js      # Amadeus API 服务封装
├── controllers/
│   └── flightController.js        # 机票相关控制器
├── routes/
│   └── flights.js                 # 机票路由
├── models/
│   ├── Flight.js                  # 机票数据模型
│   └── FlightBooking.js           # 预订记录模型
└── config.js                      # 配置（添加 Amadeus API 配置）

frontend/
├── src/
│   ├── pages/
│   │   └── Flight/
│   │       ├── FlightSearch.js     # 机票搜索页面
│   │       ├── FlightList.js       # 航班列表页面
│   │       ├── FlightDetail.js     # 航班详情页面
│   │       └── BookingManagement.js # 预订管理页面
│   ├── components/
│   │   └── Flight/
│   │       ├── FlightSearchForm.js  # 搜索表单组件
│   │       ├── FlightCard.js       # 航班卡片组件
│   │       └── BookingForm.js      # 预订表单组件
│   └── services/
│       └── flightService.js        # 前端 API 服务
```

## 3. Amadeus API 集成

### 3.1 API 认证

Amadeus Self-Service APIs 使用 OAuth 2.0 认证：

**认证流程：**
1. 使用 API Key 和 API Secret 获取 Access Token
2. Access Token 有效期：1799秒（约30分钟）
3. 使用 Access Token 调用其他 API

**认证端点：**
- Test Environment: `https://test.api.amadeus.com/v1/security/oauth2/token`
- Production Environment: `https://api.amadeus.com/v1/security/oauth2/token`

**认证请求示例：**
```javascript
POST /v1/security/oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id={API_KEY}&client_secret={API_SECRET}
```

**响应示例：**
```json
{
  "type": "amadeusOAuth2Token",
  "username": "your-email@example.com",
  "application_name": "your-app-name",
  "client_id": "your-client-id",
  "token_type": "Bearer",
  "access_token": "eyJ...",
  "expires_in": 1799,
  "state": "approved",
  "scope": ""
}
```

### 3.2 使用的 API 端点

| API | 端点 | 方法 | 用途 | 文档链接 |
|-----|------|------|------|----------|
| **Flight Offers Search** | `/v2/shopping/flight-offers` | GET | 搜索航班报价 | [文档](https://developers.amadeus.com/self-service/category/air/api-doc/flight-offers-search) |
| **Flight Offers Price** | `/v1/shopping/flight-offers/pricing` | POST | 确认航班价格 | [文档](https://developers.amadeus.com/self-service/category/air/api-doc/flight-offers-price) |
| **Flight Create Orders** | `/v1/booking/flight-orders` | POST | 创建预订订单 | [文档](https://developers.amadeus.com/self-service/category/air/api-doc/flight-create-orders) |
| **Flight Order Management** | `/v1/booking/flight-orders/{id}` | GET/DELETE | 查看/取消订单 | [文档](https://developers.amadeus.com/self-service/category/air/api-doc/flight-orders) |

### 3.3 API 基础 URL

- **Test Environment**: `https://test.api.amadeus.com`
- **Production Environment**: `https://api.amadeus.com`

### 3.4 API 配置

需要在环境变量中配置：
- `AMADEUS_API_KEY`: Amadeus API Key（从开发者门户获取）
- `AMADEUS_API_SECRET`: Amadeus API Secret（从开发者门户获取）
- `AMADEUS_API_ENV`: 环境（test/production），默认 test

### 3.5 API 限制

根据 Amadeus for Developers 文档：

**Rate Limits（请求频率限制）：**
- Test Environment: 10 requests/second
- Production Environment: 根据订阅计划不同而不同

**注意事项：**
- 需要实现请求频率控制
- 建议使用缓存减少重复请求
- 实现重试机制处理临时错误

### 3.6 API 响应格式

所有 API 响应遵循统一格式：

**成功响应：**
```json
{
  "data": [...],
  "meta": {
    "count": 10,
    "links": {
      "self": "https://api.amadeus.com/v2/shopping/flight-offers?..."
    }
  }
}
```

**错误响应：**
```json
{
  "errors": [
    {
      "status": 400,
      "code": 477,
      "title": "INVALID FORMAT",
      "detail": "The format of your request is invalid",
      "source": {
        "parameter": "originLocationCode"
      }
    }
  ]
}
```

## 4. 数据模型设计

### 4.1 Flight 模型（航班信息）

```javascript
{
  _id: ObjectId,
  origin: {
    iataCode: String,        // 出发机场代码（如：PEK）
    cityCode: String,        // 出发城市代码
    name: String            // 出发机场名称
  },
  destination: {
    iataCode: String,        // 到达机场代码
    cityCode: String,       // 到达城市代码
    name: String            // 到达机场名称
  },
  departureDate: Date,      // 出发日期
  returnDate: Date,         // 返程日期（可选）
  numberOfBookableSeats: Number,  // 可预订座位数
  price: {
    total: String,          // 总价
    currency: String,       // 货币代码
    base: String           // 基础价格
  },
  itineraries: [{
    duration: String,       // 飞行时长
    segments: [{
      departure: {
        iataCode: String,
        at: Date
      },
      arrival: {
        iataCode: String,
        at: Date
      },
      carrierCode: String,  // 航空公司代码
      number: String,       // 航班号
      aircraft: {
        code: String        // 机型代码
      }
    }]
  }],
  amadeusOfferId: String,   // Amadeus 报价ID
  createdAt: Date,
  updatedAt: Date
}
```

### 4.2 FlightBooking 模型（预订记录）

```javascript
{
  _id: ObjectId,
  bookingReference: String,  // 预订参考号（Amadeus返回）
  travelId: ObjectId,       // 关联的差旅申请ID
  employee: ObjectId,       // 预订员工ID
  flightOffer: Object,      // 航班报价信息（完整）
  travelers: [{             // 乘客信息
    id: String,             // Amadeus traveler ID
    dateOfBirth: Date,
    name: {
      firstName: String,
      lastName: String
    },
    contact: {
      emailAddress: String,
      phones: [{
        deviceType: String,
        countryCallingCode: String,
        number: String
      }]
    }
  }],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'failed'],
    default: 'pending'
  },
  price: {
    total: String,
    currency: String,
    base: String
  },
  amadeusOrderId: String,   // Amadeus 订单ID
  cancellationReason: String, // 取消原因（如果取消）
  cancelledAt: Date,        // 取消时间
  createdAt: Date,
  updatedAt: Date
}
```

## 5. 后端实现

### 5.1 Amadeus API 服务 (`amadeusApiService.js`)

#### 5.1.1 认证管理

**基于 Amadeus 官方文档的认证实现：**

```javascript
const axios = require('axios');
const logger = require('../utils/logger');
const config = require('../config');

// Token 缓存
let tokenCache = {
  accessToken: null,
  expiresAt: null,
};

/**
 * 获取 Access Token
 * Token 有效期：1799秒（约30分钟），需要缓存并自动刷新
 * 参考：https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/authorization-262
 */
async function getAccessToken() {
  // 检查缓存是否有效（提前5分钟刷新）
  if (tokenCache.accessToken && tokenCache.expiresAt && Date.now() < tokenCache.expiresAt - 5 * 60 * 1000) {
    return tokenCache.accessToken;
  }

  try {
    const apiKey = config.AMADEUS_API_KEY || process.env.AMADEUS_API_KEY;
    const apiSecret = config.AMADEUS_API_SECRET || process.env.AMADEUS_API_SECRET;
    const env = config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test';

    if (!apiKey || !apiSecret) {
      throw new Error('Amadeus API配置缺失：请配置AMADEUS_API_KEY和AMADEUS_API_SECRET');
    }

    const baseURL = env === 'production' 
      ? 'https://api.amadeus.com'
      : 'https://test.api.amadeus.com';

    const response = await axios.post(
      `${baseURL}/v1/security/oauth2/token`,
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: apiKey,
        client_secret: apiSecret,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );

    if (response.data && response.data.access_token) {
      const expiresIn = response.data.expires_in || 1799;
      tokenCache = {
        accessToken: response.data.access_token,
        expiresAt: Date.now() + expiresIn * 1000,
      };
      logger.debug('Amadeus Access Token获取成功');
      return tokenCache.accessToken;
    } else {
      throw new Error('获取Access Token失败：响应格式错误');
    }
  } catch (error) {
    logger.error('获取Amadeus Access Token失败:', error.message);
    throw new Error(`获取Amadeus Access Token失败: ${error.message}`);
  }
}

/**
 * 刷新 Access Token
 */
async function refreshAccessToken() {
  tokenCache = { accessToken: null, expiresAt: null };
  return await getAccessToken();
}

/**
 * 获取 API 基础 URL
 */
function getBaseURL() {
  const env = config.AMADEUS_API_ENV || process.env.AMADEUS_API_ENV || 'test';
  return env === 'production'
    ? 'https://api.amadeus.com'
    : 'https://test.api.amadeus.com';
}
```

#### 5.1.2 航班搜索

**基于 Amadeus Flight Offers Search API 文档：**
参考：https://developers.amadeus.com/self-service/category/air/api-doc/flight-offers-search

```javascript
/**
 * 搜索航班报价
 * @param {Object} searchParams - 搜索参数
 * @param {String} searchParams.originLocationCode - 出发机场代码（IATA代码，如：PEK）
 * @param {String} searchParams.destinationLocationCode - 到达机场代码（IATA代码，如：JFK）
 * @param {String} searchParams.departureDate - 出发日期 (YYYY-MM-DD)
 * @param {String} searchParams.returnDate - 返程日期 (可选，往返航班必填)
 * @param {Number} searchParams.adults - 成人数量（1-9）
 * @param {Number} searchParams.children - 儿童数量（可选，0-9）
 * @param {Number} searchParams.infants - 婴儿数量（可选，0-9）
 * @param {String} searchParams.travelClass - 舱位等级（ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST）
 * @param {Number} searchParams.max - 最大返回结果数（默认250，最大250）
 * @param {String} searchParams.currencyCode - 货币代码（可选，如：USD, CNY）
 * @param {Boolean} searchParams.nonStop - 是否只显示直飞航班（可选）
 * @returns {Promise<Object>} 包含data和meta的响应对象
 */
async function searchFlightOffers(searchParams) {
  try {
    const {
      originLocationCode,
      destinationLocationCode,
      departureDate,
      returnDate,
      adults = 1,
      children = 0,
      infants = 0,
      travelClass = 'ECONOMY',
      max = 250,
      currencyCode = 'USD',
      nonStop = false,
    } = searchParams;

    // 参数验证
    if (!originLocationCode || !destinationLocationCode || !departureDate) {
      throw new Error('缺少必填参数：originLocationCode, destinationLocationCode, departureDate');
    }

    if (adults < 1 || adults > 9) {
      throw new Error('成人数量必须在1-9之间');
    }

    // 获取 Access Token
    const accessToken = await getAccessToken();
    const baseURL = getBaseURL();

    // 构建查询参数
    const params = new URLSearchParams({
      originLocationCode,
      destinationLocationCode,
      departureDate,
      adults: adults.toString(),
      travelClass,
      max: Math.min(max, 250).toString(),
      currencyCode,
    });

    if (returnDate) {
      params.append('returnDate', returnDate);
    }
    if (children > 0) {
      params.append('children', children.toString());
    }
    if (infants > 0) {
      params.append('infants', infants.toString());
    }
    if (nonStop) {
      params.append('nonStop', 'true');
    }

    // 调用 API
    const response = await axios.get(
      `${baseURL}/v2/shopping/flight-offers?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (response.data && response.data.data) {
      logger.debug(`搜索到 ${response.data.data.length} 个航班报价`);
      return {
        success: true,
        data: response.data.data,
        meta: response.data.meta || {},
      };
    } else {
      throw new Error('API响应格式错误');
    }
  } catch (error) {
    logger.error('搜索航班报价失败:', error.message);
    
    // 如果是认证错误，尝试刷新Token后重试一次
    if (error.response?.status === 401) {
      logger.debug('Token可能过期，尝试刷新后重试...');
      await refreshAccessToken();
      return searchFlightOffers(searchParams);
    }
    
    throw error;
  }
}
```

#### 5.1.3 价格确认

**基于 Amadeus Flight Offers Price API 文档：**
参考：https://developers.amadeus.com/self-service/category/air/api-doc/flight-offers-price

```javascript
/**
 * 确认航班价格
 * 注意：在预订前必须调用此API确认价格，因为价格可能已变更
 * @param {Object} flightOffer - 完整的航班报价对象（从搜索API返回）
 * @returns {Promise<Object>} 确认后的价格信息
 */
async function confirmFlightPrice(flightOffer) {
  try {
    if (!flightOffer || !flightOffer.id) {
      throw new Error('flightOffer参数无效：必须包含完整的航班报价对象');
    }

    // 获取 Access Token
    const accessToken = await getAccessToken();
    const baseURL = getBaseURL();

    // 调用 API（POST请求，需要发送完整的flightOffer对象）
    const response = await axios.post(
      `${baseURL}/v1/shopping/flight-offers/pricing`,
      {
        data: {
          type: 'flight-offers-pricing',
          flightOffers: [flightOffer],
        },
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/vnd.amadeus+json',
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (response.data && response.data.data && response.data.data.flightOffers) {
      const confirmedOffer = response.data.data.flightOffers[0];
      logger.debug('航班价格确认成功');
      return {
        success: true,
        data: confirmedOffer,
        meta: response.data.meta || {},
      };
    } else {
      throw new Error('价格确认API响应格式错误');
    }
  } catch (error) {
    logger.error('确认航班价格失败:', error.message);
    
    // 如果是认证错误，尝试刷新Token后重试一次
    if (error.response?.status === 401) {
      logger.debug('Token可能过期，尝试刷新后重试...');
      await refreshAccessToken();
      return confirmFlightPrice(flightOffer);
    }
    
    // 处理价格变更错误
    if (error.response?.status === 400) {
      const errorDetail = error.response.data?.errors?.[0]?.detail;
      if (errorDetail && errorDetail.includes('price')) {
        throw new Error('航班价格已变更，请重新搜索');
      }
    }
    
    throw error;
  }
}
```

#### 5.1.4 创建预订

**基于 Amadeus Flight Create Orders API 文档：**
参考：https://developers.amadeus.com/self-service/category/air/api-doc/flight-create-orders

```javascript
/**
 * 创建机票预订
 * @param {Object} bookingData - 预订数据
 * @param {Object} bookingData.flightOffer - 航班报价（必须是通过价格确认API返回的）
 * @param {Array} bookingData.travelers - 乘客信息数组
 * @param {Object} bookingData.travelers[].dateOfBirth - 出生日期 (YYYY-MM-DD)
 * @param {Object} bookingData.travelers[].name - 姓名 {firstName: String, lastName: String}
 * @param {Object} bookingData.travelers[].contact - 联系方式
 * @param {String} bookingData.travelers[].contact.emailAddress - 邮箱
 * @param {Array} bookingData.travelers[].contact.phones - 电话数组
 * @param {String} bookingData.travelers[].contact.phones[].deviceType - 设备类型（MOBILE, LANDLINE）
 * @param {String} bookingData.travelers[].contact.phones[].countryCallingCode - 国家代码（如：+86）
 * @param {String} bookingData.travelers[].contact.phones[].number - 电话号码
 * @param {String} bookingData.travelers[].id - 乘客ID（可选，系统会自动生成）
 * @returns {Promise<Object>} 预订结果
 */
async function createFlightOrder(bookingData) {
  try {
    const { flightOffer, travelers } = bookingData;

    // 数据验证
    if (!flightOffer || !flightOffer.id) {
      throw new Error('flightOffer参数无效');
    }
    if (!travelers || !Array.isArray(travelers) || travelers.length === 0) {
      throw new Error('travelers参数无效：必须至少包含一个乘客');
    }

    // 验证乘客信息
    travelers.forEach((traveler, index) => {
      if (!traveler.dateOfBirth || !traveler.name || !traveler.contact) {
        throw new Error(`乘客${index + 1}信息不完整`);
      }
      if (!traveler.name.firstName || !traveler.name.lastName) {
        throw new Error(`乘客${index + 1}姓名不完整`);
      }
      if (!traveler.contact.emailAddress) {
        throw new Error(`乘客${index + 1}邮箱必填`);
      }
    });

    // 获取 Access Token
    const accessToken = await getAccessToken();
    const baseURL = getBaseURL();

    // 构建请求体
    const requestBody = {
      data: {
        type: 'flight-order',
        flightOffers: [flightOffer],
        travelers: travelers.map((traveler, index) => ({
          id: traveler.id || `TRAVELER_${index + 1}`,
          dateOfBirth: traveler.dateOfBirth,
          name: {
            firstName: traveler.name.firstName,
            lastName: traveler.name.lastName,
          },
          contact: {
            emailAddress: traveler.contact.emailAddress,
            phones: traveler.contact.phones || [],
          },
        })),
      },
    };

    // 调用 API
    const response = await axios.post(
      `${baseURL}/v1/booking/flight-orders`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/vnd.amadeus+json',
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 60000, // 预订可能需要更长时间
      }
    );

    if (response.data && response.data.data) {
      logger.debug('机票预订成功');
      return {
        success: true,
        data: response.data.data,
        meta: response.data.meta || {},
      };
    } else {
      throw new Error('预订API响应格式错误');
    }
  } catch (error) {
    logger.error('创建机票预订失败:', error.message);
    
    // 如果是认证错误，尝试刷新Token后重试一次
    if (error.response?.status === 401) {
      logger.debug('Token可能过期，尝试刷新后重试...');
      await refreshAccessToken();
      return createFlightOrder(bookingData);
    }
    
    throw error;
  }
}
```

#### 5.1.5 订单管理

**基于 Amadeus Flight Order Management API 文档：**
参考：https://developers.amadeus.com/self-service/category/air/api-doc/flight-orders

```javascript
/**
 * 获取订单详情
 * @param {String} orderId - Amadeus订单ID
 * @returns {Promise<Object>} 订单详情
 */
async function getFlightOrder(orderId) {
  try {
    if (!orderId) {
      throw new Error('orderId参数必填');
    }

    // 获取 Access Token
    const accessToken = await getAccessToken();
    const baseURL = getBaseURL();

    // 调用 API
    const response = await axios.get(
      `${baseURL}/v1/booking/flight-orders/${orderId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (response.data && response.data.data) {
      return {
        success: true,
        data: response.data.data,
        meta: response.data.meta || {},
      };
    } else {
      throw new Error('获取订单详情API响应格式错误');
    }
  } catch (error) {
    logger.error('获取订单详情失败:', error.message);
    
    // 如果是认证错误，尝试刷新Token后重试一次
    if (error.response?.status === 401) {
      logger.debug('Token可能过期，尝试刷新后重试...');
      await refreshAccessToken();
      return getFlightOrder(orderId);
    }
    
    throw error;
  }
}

/**
 * 取消订单
 * @param {String} orderId - Amadeus订单ID
 * @returns {Promise<Object>} 取消结果
 */
async function cancelFlightOrder(orderId) {
  try {
    if (!orderId) {
      throw new Error('orderId参数必填');
    }

    // 获取 Access Token
    const accessToken = await getAccessToken();
    const baseURL = getBaseURL();

    // 调用 API
    const response = await axios.delete(
      `${baseURL}/v1/booking/flight-orders/${orderId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (response.data && response.data.data) {
      logger.debug('订单取消成功');
      return {
        success: true,
        data: response.data.data,
        meta: response.data.meta || {},
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
    
    // 如果是认证错误，尝试刷新Token后重试一次
    if (error.response?.status === 401) {
      logger.debug('Token可能过期，尝试刷新后重试...');
      await refreshAccessToken();
      return cancelFlightOrder(orderId);
    }
    
    // 处理订单无法取消的情况
    if (error.response?.status === 400 || error.response?.status === 422) {
      const errorDetail = error.response.data?.errors?.[0]?.detail;
      throw new Error(errorDetail || '订单无法取消，可能已超过取消时限');
    }
    
    throw error;
  }
}
```

### 5.2 控制器 (`flightController.js`)

```javascript
/**
 * 搜索航班
 * @route POST /api/flights/search
 */
exports.searchFlights = async (req, res) => {
  // 1. 验证请求参数
  // 2. 调用 amadeusApiService.searchFlightOffers
  // 3. 可选：保存搜索结果到数据库（用于历史记录）
  // 4. 返回结果
}

/**
 * 确认航班价格
 * @route POST /api/flights/confirm-price
 */
exports.confirmPrice = async (req, res) => {
  // 1. 验证报价ID
  // 2. 调用 amadeusApiService.confirmFlightPrice
  // 3. 返回确认后的价格
}

/**
 * 创建预订
 * @route POST /api/flights/bookings
 */
exports.createBooking = async (req, res) => {
  // 1. 验证请求数据
  // 2. 关联差旅申请（如果提供travelId）
  // 3. 调用 amadeusApiService.createFlightOrder
  // 4. 保存预订记录到数据库
  // 5. 更新关联的差旅申请
  // 6. 发送通知
  // 7. 返回预订结果
}

/**
 * 获取预订列表
 * @route GET /api/flights/bookings
 */
exports.getBookings = async (req, res) => {
  // 1. 应用数据权限过滤
  // 2. 查询数据库
  // 3. 返回预订列表
}

/**
 * 获取预订详情
 * @route GET /api/flights/bookings/:id
 */
exports.getBooking = async (req, res) => {
  // 1. 验证权限
  // 2. 查询数据库
  // 3. 可选：从Amadeus同步最新状态
  // 4. 返回详情
}

/**
 * 取消预订
 * @route DELETE /api/flights/bookings/:id
 */
exports.cancelBooking = async (req, res) => {
  // 1. 验证权限和状态
  // 2. 调用 amadeusApiService.cancelFlightOrder
  // 3. 更新数据库记录
  // 4. 更新关联的差旅申请
  // 5. 发送通知
  // 6. 返回结果
}
```

### 5.3 路由 (`flights.js`)

```javascript
const express = require('express');
const {
  searchFlights,
  confirmPrice,
  createBooking,
  getBookings,
  getBooking,
  cancelBooking
} = require('../controllers/flightController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 所有路由需要认证
router.use(protect);

// 搜索航班
router.post('/search', searchFlights);

// 确认价格
router.post('/confirm-price', confirmPrice);

// 预订管理
router.post('/bookings', createBooking);
router.get('/bookings', getBookings);
router.get('/bookings/:id', getBooking);
router.delete('/bookings/:id', cancelBooking);

module.exports = router;
```

## 6. 前端实现

### 6.1 机票搜索页面 (`FlightSearch.js`)

**功能：**
- 搜索表单（出发地、目的地、日期、乘客数量、舱位等级）
- 日期选择器
- 机场/城市自动完成
- 搜索结果展示

**主要组件：**
- `FlightSearchForm`: 搜索表单
- `FlightCard`: 航班卡片（列表展示）
- `FlightFilters`: 筛选器（价格、时间、航空公司等）

### 6.2 航班详情页面 (`FlightDetail.js`)

**功能：**
- 显示航班详细信息
- 显示价格明细
- 预订按钮
- 返回搜索列表

### 6.3 预订表单 (`BookingForm.js`)

**功能：**
- 乘客信息表单（姓名、出生日期、联系方式）
- 与差旅申请关联选择
- 价格确认
- 提交预订

### 6.4 预订管理页面 (`BookingManagement.js`)

**功能：**
- 显示用户的所有预订
- 预订状态筛选
- 查看预订详情
- 取消预订

### 6.5 API 服务 (`flightService.js`)

```javascript
// 搜索航班
export const searchFlights = (searchParams) => {
  return apiClient.post('/flights/search', searchParams);
};

// 确认价格
export const confirmPrice = (offerId) => {
  return apiClient.post('/flights/confirm-price', { offerId });
};

// 创建预订
export const createBooking = (bookingData) => {
  return apiClient.post('/flights/bookings', bookingData);
};

// 获取预订列表
export const getBookings = (params) => {
  return apiClient.get('/flights/bookings', { params });
};

// 获取预订详情
export const getBooking = (id) => {
  return apiClient.get(`/flights/bookings/${id}`);
};

// 取消预订
export const cancelBooking = (id, reason) => {
  return apiClient.delete(`/flights/bookings/${id}`, { data: { reason } });
};
```

## 7. 与差旅申请集成

### 7.1 集成点

1. **在差旅申请中关联机票预订**
   - 在 Travel 模型的 `bookings` 数组中添加机票预订记录
   - 预订类型：`type: 'flight'`
   - 存储 Amadeus 订单ID和预订参考号

2. **从差旅申请创建机票预订**
   - 在差旅申请详情页提供"预订机票"按钮
   - 自动填充出发地、目的地、日期等信息

3. **预算关联**
   - 机票预订费用自动关联到差旅申请的 `estimatedCost`
   - 支持多程机票的预算分配

### 7.2 数据同步

- 机票预订状态变更时，同步更新差旅申请状态
- 取消机票时，更新差旅申请的预算和状态

## 8. 错误处理

### 8.1 API 错误处理

```javascript
// Amadeus API 常见错误码
- 400: Bad Request（请求参数错误）
- 401: Unauthorized（认证失败）
- 403: Forbidden（权限不足）
- 404: Not Found（资源不存在）
- 429: Too Many Requests（请求频率过高）
- 500: Internal Server Error（服务器错误）
```

### 8.2 业务错误处理

- 航班已售罄
- 价格已变更
- 预订失败
- 取消失败（超过取消时限）

## 9. 安全考虑

### 9.1 API 密钥管理
- 使用环境变量存储 API Key 和 Secret
- 不在代码中硬编码敏感信息
- 生产环境使用不同的密钥

### 9.2 数据权限
- 用户只能查看和操作自己的预订
- 管理员可以查看所有预订
- 使用现有的数据权限中间件

### 9.3 请求限制
- 实现请求频率限制（Rate Limiting）
- 防止恶意请求
- 缓存常用查询结果

## 10. 测试计划

### 10.1 单元测试
- Amadeus API 服务层测试
- 控制器测试
- 数据模型验证测试

### 10.2 集成测试
- API 端点集成测试
- 与差旅申请集成测试
- 错误场景测试

### 10.3 端到端测试
- 完整的预订流程测试
- 取消流程测试
- 与差旅申请的完整流程测试

## 11. 实现方式选择

### 11.1 方式一：使用 Amadeus Node.js SDK（推荐）

**优点：**
- 官方维护，API 更新及时
- 自动处理认证和 Token 刷新
- 类型定义完善
- 代码更简洁

**安装：**
```bash
npm install amadeus
```

**使用示例：**
```javascript
const Amadeus = require('amadeus');

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_API_KEY,
  clientSecret: process.env.AMADEUS_API_SECRET,
  hostname: process.env.AMADEUS_API_ENV === 'production' ? 'production' : 'test'
});

// 搜索航班
const response = await amadeus.shopping.flightOffersSearch.get({
  originLocationCode: 'PEK',
  destinationLocationCode: 'JFK',
  departureDate: '2025-06-01',
  adults: 1,
  travelClass: 'ECONOMY',
  max: 250
});

// 创建预订
const bookingResponse = await amadeus.booking.flightOrders.post({
  data: {
    type: 'flight-order',
    flightOffers: [flightOffer],
    travelers: travelers
  }
});
```

**参考文档：**
- [Amadeus Node.js SDK GitHub](https://github.com/amadeus4dev/amadeus-node)
- [SDK 文档](https://amadeus4dev.github.io/amadeus-node/)

### 11.2 方式二：直接使用 Axios（当前方案）

**优点：**
- 与现有代码风格一致（参考 ctripApiService.js）
- 更灵活的控制
- 不增加额外依赖

**缺点：**
- 需要手动处理认证和 Token 刷新
- 需要手动构建请求

**当前设计文档采用方式二，但可以轻松切换到方式一。**

## 12. 部署计划

### 12.1 环境配置

**开发环境：**
- 使用 Amadeus Test Environment
- 使用测试 API Key
- Base URL: `https://test.api.amadeus.com`

**生产环境：**
- 使用 Amadeus Production Environment
- 使用生产 API Key
- Base URL: `https://api.amadeus.com`
- 配置监控和告警

### 12.2 依赖安装

```bash
# 方式一：使用 Amadeus SDK（推荐）
npm install amadeus

# 方式二：使用 Axios（已安装）
# axios 已在项目中安装，无需额外安装
```

### 12.3 环境变量

```env
# Amadeus API 配置
AMADEUS_API_KEY=your_api_key_here
AMADEUS_API_SECRET=your_api_secret_here
AMADEUS_API_ENV=test  # test 或 production
```

### 12.4 获取 API 密钥

1. 访问 [Amadeus for Developers](https://developers.amadeus.com/)
2. 注册开发者账户
3. 创建应用并获取 API Key 和 Secret
4. 在 Test Environment 中测试
5. 申请 Production Environment 访问权限

## 12. 开发阶段

### 阶段 1: 基础功能（1-2周）
- ✅ 配置 Amadeus API 认证
- ✅ 实现航班搜索功能
- ✅ 实现价格确认功能
- ✅ 基础前端页面

### 阶段 2: 预订功能（1-2周）
- ✅ 实现预订创建功能
- ✅ 实现预订管理功能
- ✅ 完善前端界面
- ✅ 错误处理

### 阶段 3: 集成与优化（1周）
- ✅ 与差旅申请集成
- ✅ 数据权限控制
- ✅ 性能优化
- ✅ 测试和文档

## 13. 参考资料

### 13.1 官方文档

- [Amadeus for Developers 主页](https://developers.amadeus.com/)
- [开发者指南](https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/)
- [API 目录](https://developers.amadeus.com/self-service/category/air)
- [快速开始指南](https://developers.amadeus.com/self-service/apis-docs/guides/quick-start-5)

### 13.2 航班相关 API 文档

- [Flight Offers Search API](https://developers.amadeus.com/self-service/category/air/api-doc/flight-offers-search)
- [Flight Offers Price API](https://developers.amadeus.com/self-service/category/air/api-doc/flight-offers-price)
- [Flight Create Orders API](https://developers.amadeus.com/self-service/category/air/api-doc/flight-create-orders)
- [Flight Orders Management API](https://developers.amadeus.com/self-service/category/air/api-doc/flight-orders)

### 13.3 SDK 和工具

- [Amadeus Node.js SDK](https://github.com/amadeus4dev/amadeus-node)
- [Amadeus Node.js SDK 文档](https://amadeus4dev.github.io/amadeus-node/)
- [Postman Collection](https://developers.amadeus.com/self-service/apis-docs/guides/developer-tools/postman-collection-5)
- [Mock Server](https://developers.amadeus.com/self-service/apis-docs/guides/developer-tools/mock-server-5)

### 13.4 认证和授权

- [OAuth 2.0 认证指南](https://developers.amadeus.com/self-service/apis-docs/guides/authorization-262)
- [API Keys 管理](https://developers.amadeus.com/self-service/apis-docs/guides/api-keys-5)

### 13.5 最佳实践

- [Rate Limits](https://developers.amadeus.com/self-service/apis-docs/guides/rate-limits-5)
- [错误处理](https://developers.amadeus.com/self-service/apis-docs/guides/common-errors-5)
- [分页处理](https://developers.amadeus.com/self-service/apis-docs/guides/pagination-5)

### 13.6 代码示例

- [GitHub 代码示例](https://github.com/amadeus4dev)
- [交互式示例](https://developers.amadeus.com/self-service/apis-docs/guides/examples-and-prototypes/interactive-examples-5)

## 14. API 请求示例

### 14.1 搜索航班请求示例

```bash
GET https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=PEK&destinationLocationCode=JFK&departureDate=2025-06-01&adults=1&travelClass=ECONOMY&max=250
Authorization: Bearer {access_token}
Accept: application/vnd.amadeus+json
```

### 14.2 价格确认请求示例

```bash
POST https://test.api.amadeus.com/v1/shopping/flight-offers/pricing
Authorization: Bearer {access_token}
Content-Type: application/vnd.amadeus+json
Accept: application/vnd.amadeus+json

{
  "data": {
    "type": "flight-offers-pricing",
    "flightOffers": [
      {
        "type": "flight-offer",
        "id": "1",
        "source": "GDS",
        "instantTicketingRequired": false,
        "nonHomogeneous": false,
        "oneWay": false,
        "lastTicketingDate": "2025-05-31",
        "numberOfBookableSeats": 9,
        "itineraries": [...],
        "price": {...},
        "pricingOptions": {...},
        "validatingAirlineCodes": ["CA"]
      }
    ]
  }
}
```

### 14.3 创建预订请求示例

```bash
POST https://test.api.amadeus.com/v1/booking/flight-orders
Authorization: Bearer {access_token}
Content-Type: application/vnd.amadeus+json
Accept: application/vnd.amadeus+json

{
  "data": {
    "type": "flight-order",
    "flightOffers": [...],
    "travelers": [
      {
        "id": "1",
        "dateOfBirth": "1990-01-01",
        "name": {
          "firstName": "ZHANG",
          "lastName": "SAN"
        },
        "contact": {
          "emailAddress": "zhangsan@example.com",
          "phones": [
            {
              "deviceType": "MOBILE",
              "countryCallingCode": "86",
              "number": "13800138000"
            }
          ]
        }
      }
    ]
  }
}
```

## 15. 注意事项

1. **API 限制**
   - Amadeus Self-Service API 有请求频率限制
   - 需要合理使用缓存
   - 避免重复请求

2. **价格时效性**
   - 航班价格可能随时变化
   - 需要在预订前重新确认价格
   - 处理价格变更的情况

3. **预订政策**
   - 不同航空公司的取消政策不同
   - 需要明确告知用户取消政策
   - 实现取消时限检查

4. **数据存储**
   - 保存完整的预订信息用于审计
   - 定期同步 Amadeus 订单状态
   - 处理订单状态不一致的情况

---

**文档版本**: 1.0  
**创建日期**: 2025-01-06  
**最后更新**: 2025-01-06

