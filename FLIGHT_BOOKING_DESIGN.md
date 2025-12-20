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
│   ├── amadeusApiService.js      # Amadeus API 服务封装
│   └── externalApiService.js     # 外部API通用服务（抽离公共功能）
├── controllers/
│   └── flightController.js        # 机票相关控制器
├── routes/
│   └── flights.js                 # 机票路由
├── models/
│   ├── Flight.js                  # 机票数据模型
│   └── FlightBooking.js           # 预订记录模型
├── utils/
│   └── apiClient.js               # 通用API客户端工具（抽离公共功能）
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

### 2.3 公共功能抽离设计

**设计原则：**
- 避免重复实现相同的功能
- 统一错误处理和重试机制
- 统一认证和Token管理
- 统一API调用封装

**抽离的公共功能：**

1. **外部API通用服务** (`utils/externalApiService.js`)
   - OAuth 2.0 认证通用实现
   - Token缓存和自动刷新
   - 统一的重试机制
   - 统一的错误处理

2. **API客户端工具** (`utils/apiClient.js`)
   - 统一的HTTP请求封装
   - 请求拦截器（添加认证头）
   - 响应拦截器（统一错误处理）
   - 超时和重试配置

3. **数据转换工具** (`utils/dataTransform.js`)
   - 外部API数据格式转换
   - 统一的数据验证
   - 数据标准化处理

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

### 5.0 公共功能抽离

#### 5.0.1 外部API通用服务 (`utils/externalApiService.js`)

**目的：** 抽离携程API和Amadeus API的共同功能，避免重复实现

**功能：**
- OAuth 2.0 认证通用实现
- Token缓存和自动刷新
- 统一的重试机制
- 统一的错误处理

**实现：**

```javascript
/**
 * 外部API通用服务
 * 用于抽离携程API和Amadeus API的共同功能
 */

class ExternalApiService {
  constructor(config) {
    this.config = config;
    this.tokenCache = {
      token: null,
      expiresAt: null,
    };
  }

  /**
   * 获取Access Token（通用OAuth 2.0实现）
   */
  async getAccessToken() {
    // 检查缓存
    if (this.tokenCache.token && this.tokenCache.expiresAt && 
        Date.now() < this.tokenCache.expiresAt - 5 * 60 * 1000) {
      return this.tokenCache.token;
    }

    // 获取新Token
    const token = await this.fetchAccessToken();
    
    // 缓存Token
    this.tokenCache = {
      token,
      expiresAt: Date.now() + (this.config.tokenExpiresIn || 1799) * 1000,
    };

    return token;
  }

  /**
   * 刷新Token
   */
  async refreshAccessToken() {
    this.tokenCache = { token: null, expiresAt: null };
    return await this.getAccessToken();
  }

  /**
   * 统一的重试机制
   */
  async requestWithRetry(requestFn, maxRetries = 1) {
    let lastError;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // 如果是认证错误，尝试刷新Token后重试
        if (error.response?.status === 401 && i < maxRetries) {
          await this.refreshAccessToken();
          continue;
        }
        
        throw error;
      }
    }
    throw lastError;
  }
}

module.exports = ExternalApiService;
```

#### 5.0.2 API客户端工具 (`utils/apiClient.js`)

**目的：** 统一HTTP请求封装，供所有外部API服务使用

**功能：**
- 统一的请求封装
- 统一的错误处理
- 统一的超时配置
- 统一的日志记录

**实现：**

```javascript
/**
 * 通用API客户端
 * 统一处理HTTP请求、错误处理、日志记录
 */

const axios = require('axios');
const logger = require('./logger');

class ApiClient {
  constructor(baseURL, defaultHeaders = {}) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...defaultHeaders,
      },
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`[API] ${config.method.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('[API] Request error:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        logger.error('[API] Response error:', {
          status: error.response?.status,
          message: error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      }
    );
  }

  async get(url, config = {}) {
    return this.client.get(url, config);
  }

  async post(url, data, config = {}) {
    return this.client.post(url, data, config);
  }

  async put(url, data, config = {}) {
    return this.client.put(url, data, config);
  }

  async delete(url, config = {}) {
    return this.client.delete(url, config);
  }
}

module.exports = ApiClient;
```

#### 5.0.3 Amadeus API 服务使用公共功能

**重构后的 `amadeusApiService.js`：**

```javascript
const ExternalApiService = require('../utils/externalApiService');
const ApiClient = require('../utils/apiClient');
const config = require('../config');
const logger = require('../utils/logger');

class AmadeusApiService extends ExternalApiService {
  constructor() {
    const apiConfig = {
      apiKey: config.AMADEUS_API_KEY,
      apiSecret: config.AMADEUS_API_SECRET,
      env: config.AMADEUS_API_ENV || 'test',
      tokenExpiresIn: 1799, // 30分钟
    };

    super(apiConfig);

    this.baseURL = apiConfig.env === 'production'
      ? 'https://api.amadeus.com'
      : 'https://test.api.amadeus.com';

    this.apiClient = new ApiClient(this.baseURL);
  }

  /**
   * 获取Access Token（实现父类抽象方法）
   */
  async fetchAccessToken() {
    const response = await this.apiClient.post(
      '/v1/security/oauth2/token',
      new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.apiKey,
        client_secret: this.config.apiSecret,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    if (response.data && response.data.access_token) {
      return response.data.access_token;
    }
    throw new Error('获取Access Token失败');
  }

  /**
   * 搜索航班（使用公共的重试机制）
   */
  async searchFlightOffers(searchParams) {
    return this.requestWithRetry(async () => {
      const accessToken = await this.getAccessToken();
      const response = await this.apiClient.get(
        '/v2/shopping/flight-offers',
        {
          params: searchParams,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.amadeus+json',
          },
        }
      );
      return response.data;
    });
  }

  // ... 其他方法类似
}

// 导出服务实例和方法
const serviceInstance = new AmadeusApiService();

module.exports = {
  ...serviceInstance,
  validateConfig: () => serviceInstance.validateConfig(),
  testConnection: () => serviceInstance.testConnection(),
};
```

### 5.1 Amadeus API 服务 (`amadeusApiService.js`)

#### 5.1.1 配置验证和连接测试

```javascript
/**
 * 验证 API 配置
 * 在服务启动时调用，确保配置正确
 */
async function validateConfig() {
  const apiKey = config.AMADEUS_API_KEY || process.env.AMADEUS_API_KEY;
  const apiSecret = config.AMADEUS_API_SECRET || process.env.AMADEUS_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    throw new Error('Amadeus API 配置缺失：请设置 AMADEUS_API_KEY 和 AMADEUS_API_SECRET');
  }
  
  logger.info('Amadeus API 配置验证通过');
  return true;
}

/**
 * 测试 API 连接
 * 通过获取 Access Token 来验证 API 是否可用
 */
async function testConnection() {
  try {
    logger.info('正在测试 Amadeus API 连接...');
    const token = await getAccessToken();
    
    if (token) {
      logger.info('✅ Amadeus API 连接测试成功');
      return {
        success: true,
        message: 'Amadeus API 连接正常',
        environment: config.AMADEUS_API_ENV || 'test',
      };
    } else {
      throw new Error('获取 Access Token 失败');
    }
  } catch (error) {
    logger.error('❌ Amadeus API 连接测试失败:', error.message);
    throw new Error(`Amadeus API 连接测试失败: ${error.message}`);
  }
}
```

#### 5.1.2 认证管理

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

#### 5.1.3 航班搜索

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

#### 5.1.4 价格确认

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

#### 5.1.5 创建预订

**基于 Amadeus Flight Create Orders API 文档：**
参考：https://developers.amadeus.com/self-service/category/air/api-doc/flight-create-orders

**重要：** 创建预订时必须关联差旅申请（travelId 必填）

```javascript
/**
 * 创建机票预订
 * @param {Object} bookingData - 预订数据
 * @param {String} bookingData.travelId - 必填：关联的差旅申请ID
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
  // 验证 travelId 必填
  if (!bookingData.travelId) {
    throw new Error('travelId参数必填：机票预订必须关联差旅申请');
  }
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

#### 5.1.6 订单管理

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
 * 创建预订（必须关联差旅申请）
 * @route POST /api/flights/bookings
 * @access Private
 */
exports.createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { travelId, flightOffer, travelers } = req.body;

    // 1. 验证 travelId 必填
    if (!travelId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'travelId参数必填：机票预订必须关联差旅申请',
      });
    }

    // 2. 验证差旅申请存在且属于当前用户
    const travel = await Travel.findById(travelId).session(session);
    if (!travel) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: '差旅申请不存在',
      });
    }

    // 3. 数据权限检查
    const hasAccess = await checkResourceAccess(req, travel, 'travel', 'employee');
    if (!hasAccess) {
      await session.abortTransaction();
      throw ErrorFactory.forbidden('无权访问该差旅申请');
    }

    // 4. 验证差旅申请状态允许添加预订
    if (!['draft', 'approved'].includes(travel.status)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: '当前差旅申请状态不允许添加预订',
      });
    }

    // 5. 调用 Amadeus API 创建预订
    const bookingResult = await amadeusApiService.createFlightOrder({
      flightOffer,
      travelers,
    });

    // 6. 保存预订记录到数据库
    const flightBooking = await FlightBooking.create([{
      travelId,
      employee: req.user.id,
      bookingReference: bookingResult.data.associatedRecords?.airline?.reference,
      amadeusOrderId: bookingResult.data.id,
      flightOffer: bookingResult.data.flightOffers[0],
      travelers: bookingResult.data.travelers,
      status: 'confirmed',
      price: {
        total: bookingResult.data.price?.total,
        currency: bookingResult.data.price?.currency,
        base: bookingResult.data.price?.base,
      },
    }], { session });

    // 7. 更新差旅申请（在同一事务中）
    const bookingCost = parseFloat(bookingResult.data.price?.total || 0);
    
    travel.bookings.push({
      type: 'flight',
      provider: 'Amadeus',
      bookingReference: bookingResult.data.associatedRecords?.airline?.reference,
      amadeusOrderId: bookingResult.data.id,
      flightBookingId: flightBooking[0]._id,
      cost: bookingCost,
      currency: bookingResult.data.price?.currency || 'USD',
      status: 'confirmed',
      details: {
        origin: flightOffer.itineraries[0]?.segments[0]?.departure?.iataCode,
        destination: flightOffer.itineraries[0]?.segments[flightOffer.itineraries[0].segments.length - 1]?.arrival?.iataCode,
        departureDate: flightOffer.itineraries[0]?.segments[0]?.departure?.at,
        returnDate: flightOffer.itineraries[1]?.segments[0]?.departure?.at,
        travelers: travelers.length,
      },
    });

    travel.estimatedCost = (travel.estimatedCost || 0) + bookingCost;
    await travel.save({ session });

    // 8. 提交事务
    await session.commitTransaction();

    // 9. 发送通知
    await notificationService.sendBookingConfirmation(req.user.id, flightBooking[0]);

    res.json({
      success: true,
      data: flightBooking[0],
      message: '机票预订成功',
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error('创建机票预订失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '创建机票预订失败',
    });
  } finally {
    session.endSession();
  }
};

/**
 * 获取预订列表（支持按差旅申请筛选）
 * @route GET /api/flights/bookings
 * @access Private
 */
exports.getBookings = async (req, res) => {
  try {
    const { travelId, status } = req.query;
    
    let query = {};
    query.employee = req.user.id; // 数据权限：只能查看自己的预订
    
    if (travelId) {
      query.travelId = travelId; // 按差旅申请筛选
    }
    
    if (status) {
      query.status = status;
    }
    
    const bookings = await FlightBooking.find(query)
      .populate('travelId', 'travelNumber title status')
      .populate('employee', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    logger.error('获取预订列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取预订列表失败',
    });
  }
};

/**
 * 获取差旅申请的机票预订
 * @route GET /api/travel/:id/flights
 * @access Private
 */
exports.getTravelFlights = async (req, res) => {
  try {
    const travelId = req.params.id;
    
    const travel = await Travel.findById(travelId);
    if (!travel) {
      return res.status(404).json({
        success: false,
        message: '差旅申请不存在',
      });
    }
    
    const hasAccess = await checkResourceAccess(req, travel, 'travel', 'employee');
    if (!hasAccess) {
      throw ErrorFactory.forbidden('无权访问该差旅申请');
    }
    
    const bookings = await FlightBooking.find({ travelId })
      .sort({ createdAt: -1 })
      .lean();
    
    const stats = {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      pending: bookings.filter(b => b.status === 'pending').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      totalCost: bookings
        .filter(b => b.status !== 'cancelled')
        .reduce((sum, b) => sum + parseFloat(b.price?.total || 0), 0),
    };
    
    res.json({
      success: true,
      data: bookings,
      stats,
    });
  } catch (error) {
    logger.error('获取差旅申请机票预订失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取机票预订失败',
    });
  }
};

/**
 * 获取预订详情
 * @route GET /api/flights/bookings/:id
 * @access Private
 */
exports.getBooking = async (req, res) => {
  try {
    const booking = await FlightBooking.findById(req.params.id)
      .populate('travelId', 'travelNumber title status')
      .populate('employee', 'firstName lastName email');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: '预订记录不存在',
      });
    }
    
    // 数据权限检查
    if (booking.employee.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      throw ErrorFactory.forbidden('无权访问该预订');
    }
    
    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    logger.error('获取预订详情失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取预订详情失败',
    });
  }
};

/**
 * 取消预订（同步更新差旅申请）
 * @route DELETE /api/flights/bookings/:id
 * @access Private
 */
exports.cancelBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const booking = await FlightBooking.findById(id).session(session);
    if (!booking) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: '预订记录不存在',
      });
    }
    
    if (booking.employee.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      await session.abortTransaction();
      throw ErrorFactory.forbidden('无权取消该预订');
    }
    
    if (booking.status === 'cancelled') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: '预订已取消',
      });
    }
    
    // 调用 Amadeus API 取消订单
    if (booking.amadeusOrderId) {
      try {
        await amadeusApiService.cancelFlightOrder(booking.amadeusOrderId);
      } catch (error) {
        logger.error('Amadeus 取消订单失败:', error);
      }
    }
    
    // 更新预订记录
    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.cancelledAt = new Date();
    await booking.save({ session });
    
    // 更新关联的差旅申请
    if (booking.travelId) {
      const travel = await Travel.findById(booking.travelId).session(session);
      if (travel) {
        const bookingIndex = travel.bookings.findIndex(
          b => b.flightBookingId && b.flightBookingId.toString() === booking._id.toString()
        );
        
        if (bookingIndex !== -1) {
          travel.bookings[bookingIndex].status = 'cancelled';
        }
        
        if (booking.status === 'confirmed') {
          const bookingCost = parseFloat(booking.price?.total || 0);
          travel.estimatedCost = Math.max(0, (travel.estimatedCost || 0) - bookingCost);
        }
        
        await travel.save({ session });
      }
    }
    
    await session.commitTransaction();
    await notificationService.sendBookingCancellation(req.user.id, booking, reason);
    
    res.json({
      success: true,
      message: '预订已取消',
      data: booking,
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error('取消预订失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '取消预订失败',
    });
  } finally {
    session.endSession();
  }
};
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
router.post('/bookings', createBooking);           // 创建预订（必须关联差旅申请）
router.get('/bookings', getBookings);              // 获取预订列表（支持按差旅申请筛选）
router.get('/bookings/:id', getBooking);          // 获取预订详情
router.delete('/bookings/:id', cancelBooking);    // 取消预订（同步更新差旅申请）

module.exports = router;
```

### 5.4 差旅申请路由扩展 (`routes/travel.js`)

在现有的差旅申请路由中添加机票预订相关端点：

```javascript
// 在 travel.js 中添加
const {
  getTravelFlights  // 获取差旅申请的机票预订
} = require('../controllers/flightController');

// 获取差旅申请的机票预订
router.get('/:id/flights', protect, loadUserRole, getTravelFlights);
```

### 5.4 差旅申请路由扩展 (`routes/travel.js`)

在现有的差旅申请路由中添加机票预订相关端点：

```javascript
// 在 travel.js 中添加
const {
  getTravelFlights  // 获取差旅申请的机票预订
} = require('../controllers/flightController');

// 获取差旅申请的机票预订
router.get('/:id/flights', protect, getTravelFlights);
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

### 7.1 集成设计原则

**核心原则：**
- 机票预订必须与差旅申请关联（可选关联改为必填）
- 机票预订是差旅申请的组成部分
- 预订状态变更自动同步到差旅申请
- 预算和费用自动关联

### 7.2 数据关联设计

#### 7.2.1 FlightBooking 模型关联

```javascript
{
  _id: ObjectId,
  travelId: {
    type: ObjectId,
    ref: 'Travel',
    required: true,  // 必填：必须关联差旅申请
    index: true      // 添加索引提高查询性能
  },
  employee: {
    type: ObjectId,
    ref: 'User',
    required: true
  },
  // ... 其他字段
}
```

#### 7.2.2 Travel 模型扩展

Travel 模型已有 `bookings` 数组，需要确保：
- 机票预订创建时，自动添加到 Travel.bookings
- 预订类型：`type: 'flight'`
- 存储完整的预订信息：
  ```javascript
  {
    type: 'flight',
    provider: 'Amadeus',
    bookingReference: String,      // Amadeus 预订参考号
    amadeusOrderId: String,        // Amadeus 订单ID
    flightBookingId: ObjectId,     // 关联的 FlightBooking 记录ID
    cost: Number,
    currency: String,
    status: String,                // pending, confirmed, cancelled
    details: {
      origin: String,
      destination: String,
      departureDate: Date,
      returnDate: Date,
      travelers: Array
    }
  }
  ```

### 7.3 业务流程集成

#### 7.3.1 从差旅申请创建机票预订

**流程：**
1. 用户在差旅申请详情页点击"预订机票"
2. 系统自动填充搜索条件：
   - 出发地：从 `outbound.departure` 或 `destination` 获取
   - 目的地：从 `outbound.destination` 获取
   - 出发日期：从 `outbound.date` 或 `startDate` 获取
   - 返程日期：从 `inbound.date` 或 `endDate` 获取（如果有）
   - 乘客信息：从 `employee` 关联的用户信息获取
3. 用户搜索并选择航班
4. 创建预订时，自动关联 `travelId`
5. 预订成功后，更新 Travel 模型：
   - 添加到 `bookings` 数组
   - 更新 `estimatedCost`（累加机票费用）
   - 更新状态（如果所有预订都完成）

#### 7.3.2 独立创建机票预订（必须关联差旅申请）

**流程：**
1. 用户在机票搜索页面创建预订
2. **必须选择关联的差旅申请**（下拉选择或搜索）
3. 验证差旅申请：
   - 必须是当前用户的差旅申请
   - 状态必须是 `draft` 或 `approved`
   - 验证日期是否匹配
4. 创建预订并关联
5. 同步更新差旅申请

#### 7.3.3 预订状态同步

**自动同步机制：**
- 预订创建成功 → 更新 Travel.bookings，状态为 `pending`
- 预订确认成功 → 更新 Travel.bookings，状态为 `confirmed`
- 预订取消 → 更新 Travel.bookings，状态为 `cancelled`，并从 `estimatedCost` 中扣除费用

**同步时机：**
- 创建预订时
- 取消预订时
- 定期同步（可选，通过定时任务同步 Amadeus 订单状态）

### 7.4 API 集成点

#### 7.4.1 创建预订 API

```javascript
POST /api/flights/bookings
{
  travelId: ObjectId,        // 必填：关联的差旅申请ID
  flightOffer: Object,       // 航班报价
  travelers: Array,          // 乘客信息
  // ... 其他字段
}
```

**验证逻辑：**
1. 验证 `travelId` 存在且属于当前用户
2. 验证差旅申请状态允许添加预订
3. 验证日期匹配（可选，允许一定灵活性）
4. 创建预订
5. 更新 Travel 模型

#### 7.4.2 获取差旅申请的机票预订

```javascript
GET /api/travel/:id/flights
```

**返回：**
- 该差旅申请关联的所有机票预订
- 预订状态汇总
- 总费用统计

#### 7.4.3 取消预订时的同步

```javascript
DELETE /api/flights/bookings/:id
{
  reason: String  // 取消原因
}
```

**同步逻辑：**
1. 取消 Amadeus 订单
2. 更新 FlightBooking 状态
3. 从 Travel.bookings 中移除或更新状态
4. 从 Travel.estimatedCost 中扣除费用
5. 发送通知

### 7.5 数据一致性保证

**事务处理：**
- 使用 MongoDB 事务确保数据一致性
- 预订创建和 Travel 更新在同一事务中
- 如果 Travel 更新失败，回滚预订创建

**错误处理：**
- 如果 Travel 更新失败，记录错误日志
- 提供手动同步接口
- 定期检查数据一致性

### 7.6 前端集成

#### 7.6.1 差旅申请详情页

**添加机票预订区域：**
- 显示已关联的机票预订列表
- "预订机票"按钮（跳转到机票搜索页，自动填充信息）
- 预订状态和费用显示

#### 7.6.2 机票预订页面

**添加差旅申请选择：**
- 必填字段：选择关联的差旅申请
- 下拉选择：显示用户的所有可用差旅申请
- 搜索功能：支持按差旅单号搜索
- 自动填充：选择差旅申请后，自动填充搜索条件

#### 7.6.3 预订管理页面

**显示关联信息：**
- 显示关联的差旅申请信息
- 支持从差旅申请跳转到机票预订
- 支持从机票预订跳转到差旅申请

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

## 10. API 连接测试和验证

### 10.1 测试的重要性

**为什么需要测试：**
- 验证 API 配置是否正确
- 验证 API Key 和 Secret 是否有效
- 验证网络连接是否正常
- 在服务启动前发现问题
- 提供健康检查功能

### 10.2 服务启动时验证

#### 10.2.1 配置验证

在服务启动时验证 Amadeus API 配置：

```javascript
// backend/services/amadeusApiService.js

/**
 * 验证 API 配置
 * 在服务启动时调用，确保配置正确
 */
async function validateConfig() {
  const apiKey = config.AMADEUS_API_KEY || process.env.AMADEUS_API_KEY;
  const apiSecret = config.AMADEUS_API_SECRET || process.env.AMADEUS_API_SECRET;
  
  if (!apiKey || !apiSecret) {
    throw new Error('Amadeus API 配置缺失：请设置 AMADEUS_API_KEY 和 AMADEUS_API_SECRET');
  }
  
  logger.info('Amadeus API 配置验证通过');
  return true;
}

/**
 * 测试 API 连接
 * 通过获取 Access Token 来验证 API 是否可用
 */
async function testConnection() {
  try {
    logger.info('正在测试 Amadeus API 连接...');
    const token = await getAccessToken();
    
    if (token) {
      logger.info('✅ Amadeus API 连接测试成功');
      return {
        success: true,
        message: 'Amadeus API 连接正常',
        environment: config.AMADEUS_API_ENV || 'test',
      };
    } else {
      throw new Error('获取 Access Token 失败');
    }
  } catch (error) {
    logger.error('❌ Amadeus API 连接测试失败:', error.message);
    throw new Error(`Amadeus API 连接测试失败: ${error.message}`);
  }
}
```

#### 10.2.2 在服务启动时调用

```javascript
// backend/server.js

const amadeusApiService = require('./services/amadeusApiService');

// 在数据库连接后，启动服务器前
connectDB().then(async () => {
  // 验证 Amadeus API 配置
  try {
    await amadeusApiService.validateConfig();
    await amadeusApiService.testConnection();
  } catch (error) {
    logger.error('Amadeus API 初始化失败:', error.message);
    logger.warn('服务将继续启动，但机票功能可能不可用');
    // 不阻止服务启动，但记录警告
  }
  
  // 启动服务器
  app.listen(PORT, () => {
    logger.info(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  });
});
```

### 10.3 健康检查端点

#### 10.3.1 扩展健康检查端点

```javascript
// backend/routes/health.js 或 backend/server.js

/**
 * 健康检查端点（扩展版）
 * 包含外部API状态检查
 */
router.get('/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: 'unknown',
      amadeus: 'unknown',
    },
  };
  
  // 检查数据库连接
  try {
    if (mongoose.connection.readyState === 1) {
      health.services.database = 'connected';
    } else {
      health.services.database = 'disconnected';
      health.status = 'DEGRADED';
    }
  } catch (error) {
    health.services.database = 'error';
    health.status = 'DEGRADED';
  }
  
  // 检查 Amadeus API 连接（可选，不阻塞）
  try {
    const amadeusApiService = require('../services/amadeusApiService');
    const testResult = await Promise.race([
      amadeusApiService.testConnection(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      ),
    ]);
    
    if (testResult.success) {
      health.services.amadeus = 'connected';
    } else {
      health.services.amadeus = 'error';
      health.status = 'DEGRADED';
    }
  } catch (error) {
    health.services.amadeus = 'disconnected';
    // 不改变整体状态，因为 Amadeus 不是核心服务
  }
  
  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

### 10.4 API 连接测试工具

#### 10.4.1 测试脚本

创建独立的测试脚本：

```javascript
// backend/scripts/testAmadeusApi.js

/**
 * Amadeus API 连接测试脚本
 * 用于验证 API 配置和连接是否正常
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const amadeusApiService = require('../services/amadeusApiService');
const logger = require('../utils/logger');

async function testAmadeusApi() {
  console.log('\n🧪 开始测试 Amadeus API 连接...\n');
  
  try {
    // 1. 验证配置
    console.log('1️⃣  验证 API 配置...');
    await amadeusApiService.validateConfig();
    console.log('   ✅ 配置验证通过\n');
    
    // 2. 测试连接（获取 Token）
    console.log('2️⃣  测试 API 连接（获取 Access Token）...');
    const connectionTest = await amadeusApiService.testConnection();
    console.log(`   ✅ ${connectionTest.message}`);
    console.log(`   📍 环境: ${connectionTest.environment}\n`);
    
    // 3. 测试航班搜索（可选，使用测试数据）
    console.log('3️⃣  测试航班搜索功能...');
    try {
      const searchResult = await amadeusApiService.searchFlightOffers({
        originLocationCode: 'PEK',
        destinationLocationCode: 'JFK',
        departureDate: '2025-12-25', // 使用未来日期
        adults: 1,
        travelClass: 'ECONOMY',
        max: 5, // 只获取5个结果用于测试
      });
      
      if (searchResult.success && searchResult.data.length > 0) {
        console.log(`   ✅ 搜索成功，找到 ${searchResult.data.length} 个航班报价`);
        console.log(`   💰 示例价格: ${searchResult.data[0].price?.total} ${searchResult.data[0].price?.currency}\n`);
      } else {
        console.log('   ⚠️  搜索成功，但未找到航班（可能是测试数据问题）\n');
      }
    } catch (error) {
      console.log(`   ⚠️  搜索测试失败: ${error.message}`);
      console.log('   （这可能是正常的，取决于测试环境的数据可用性）\n');
    }
    
    console.log('✅ 所有测试完成！Amadeus API 配置正确，可以正常使用。\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('\n请检查：');
    console.error('1. AMADEUS_API_KEY 和 AMADEUS_API_SECRET 是否正确设置');
    console.error('2. 网络连接是否正常');
    console.error('3. API Key 是否有权限访问 Test Environment');
    console.error('4. 是否超过了 API 请求频率限制\n');
    process.exit(1);
  }
}

// 运行测试
testAmadeusApi();
```

#### 10.4.2 在 package.json 中添加测试命令

```json
{
  "scripts": {
    "test:amadeus": "node backend/scripts/testAmadeusApi.js"
  }
}
```

### 10.5 使用方式

#### 10.5.1 部署前测试

```bash
# 1. 设置环境变量
export AMADEUS_API_KEY=your_api_key
export AMADEUS_API_SECRET=your_api_secret
export AMADEUS_API_ENV=test

# 2. 运行测试脚本
npm run test:amadeus

# 或直接运行
node backend/scripts/testAmadeusApi.js
```

#### 10.5.2 服务启动时自动验证

服务启动时会自动验证配置和连接，如果失败会记录警告但不阻止服务启动。

#### 10.5.3 健康检查

```bash
# 检查服务健康状态（包括 Amadeus API）
curl http://localhost:3001/health
```

### 10.6 错误处理

**测试失败时的处理：**
- 配置缺失：阻止服务启动（如果是生产环境）
- 连接失败：记录警告，服务继续启动（机票功能不可用）
- Token 获取失败：记录错误，提供详细的错误信息

**建议：**
- 开发环境：允许服务启动，但记录警告
- 生产环境：如果配置缺失，应该阻止服务启动

## 11. 测试计划

### 11.1 API 连接测试（新增）
- ✅ 配置验证测试
- ✅ 连接测试（获取 Token）
- ✅ 功能测试（航班搜索）
- ✅ 健康检查端点测试

### 11.2 单元测试
- Amadeus API 服务层测试
- 控制器测试
- 数据模型验证测试

### 11.3 集成测试
- API 端点集成测试
- 与差旅申请集成测试
- 错误场景测试

### 11.4 端到端测试
- 完整的预订流程测试
- 取消流程测试
- 与差旅申请的完整流程测试

## 12. 实现方式选择

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

## 13. 部署计划

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

### 13.4 获取 API 密钥和测试

**步骤：**
1. 访问 [Amadeus for Developers](https://developers.amadeus.com/)
2. 注册开发者账户
3. 创建应用并获取 API Key 和 Secret
4. **重要：在 Test Environment 中测试**
   ```bash
   # 设置测试环境变量
   export AMADEUS_API_KEY=your_test_api_key
   export AMADEUS_API_SECRET=your_test_api_secret
   export AMADEUS_API_ENV=test
   
   # 运行连接测试
   npm run test:amadeus
   ```
5. 确认测试通过后，申请 Production Environment 访问权限
6. 生产环境部署前再次测试

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

## 14. 参考资料

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

## 15. API 请求示例

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

## 16. 注意事项

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

