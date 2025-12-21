# 酒店查询预订功能设计方案

## 1. 项目概述

### 1.1 功能描述
基于 Amadeus Self-Service APIs 实现酒店查询和预订功能，集成到现有的差旅费用管理系统中。

### 1.2 技术栈
- **后端**: Node.js + Express + MongoDB
- **前端**: React + Material-UI
- **第三方API**: Amadeus for Developers (Self-Service APIs)
- **参考文档**: https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/

### 1.3 功能范围
- ✅ 酒店搜索（Hotel Search）
- ✅ 酒店详情查询
- ✅ 酒店价格确认
- ✅ 酒店预订
- ✅ 预订管理（查看、取消、修改）
- ✅ 与差旅申请集成
- ✅ 核销时根据差旅单号查询酒店预订及费用
- ✅ 酒店名称自动完成（Hotel Name Autocomplete）
- ✅ 酒店评分查询（Hotel Ratings）

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
│   ├── amadeus/                   # Amadeus API 服务模块（扩展）
│   │   ├── index.js              # 统一导出入口
│   │   ├── base.js                # 基础配置、认证、Token 管理（复用）
│   │   ├── flightSearch.js        # 航班搜索和价格确认（已有）
│   │   ├── booking.js             # 航班预订创建和订单管理（已有）
│   │   ├── hotelSearch.js          # 酒店搜索和价格确认（新增）
│   │   └── hotelBooking.js        # 酒店预订创建和订单管理（新增）
│   └── externalApiService.js     # 外部API通用服务（复用）
├── controllers/
│   ├── flightController.js        # 机票相关控制器（已有）
│   └── hotelController.js         # 酒店相关控制器（新增）
├── routes/
│   ├── flights.js                 # 机票路由（已有）
│   └── hotels.js                  # 酒店路由（新增）
├── models/
│   ├── FlightBooking.js           # 机票预订记录模型（已有）
│   └── HotelBooking.js            # 酒店预订记录模型（新增）
├── utils/
│   └── apiClient.js               # 通用API客户端工具（复用）
└── config.js                      # 配置（复用 Amadeus API 配置）

frontend/
├── src/
│   ├── pages/
│   │   ├── Flight/                # 航班相关页面（修改）
│   │   │   ├── FlightSearch.js    # 修改：增加 Tab 页，包含机票和酒店搜索
│   │   │   ├── FlightList.js      # 航班列表（已有，保持不变）
│   │   │   ├── FlightDetail.js    # 航班详情（已有）
│   │   │   └── BookingManagement.js # 预订管理（已有，可扩展支持酒店）
│   │   └── Hotel/                 # 酒店相关页面（新增）
│   │       ├── HotelList.js       # 酒店列表组件
│   │       ├── HotelDetail.js     # 酒店详情页面
│   │       └── HotelBookingForm.js # 酒店预订表单
│   ├── components/
│   │   ├── Flight/                # 航班组件（已有，保持不变）
│   │   │   ├── FlightSearchForm.js # 机票搜索表单（已有）
│   │   │   └── FlightFilterBar.js # 航班筛选栏（已有）
│   │   └── Hotel/                 # 酒店组件（新增）
│   │       ├── HotelSearchForm.js  # 酒店搜索表单组件
│   │       ├── HotelCard.js       # 酒店卡片组件
│   │       ├── HotelFilterBar.js  # 酒店筛选栏组件
│   │       └── HotelBookingForm.js # 酒店预订表单组件
│   └── services/
│       ├── flightService.js       # 前端航班 API 服务（已有）
│       └── hotelService.js        # 前端酒店 API 服务（新增）
```

### 2.3 设计原则

**复用现有架构：**
- 复用 Amadeus API 基础认证模块（`base.js`）
- 复用外部API通用服务
- 参考航班预订的实现模式
- 保持代码风格一致

**模块化设计：**
- 酒店搜索和预订功能独立模块
- 与航班功能共享基础服务
- 便于维护和扩展

## 3. Amadeus API 集成

### 3.1 API 认证

酒店功能复用航班功能的 OAuth 2.0 认证机制，使用相同的 `base.js` 模块。

**认证流程：**
1. 使用 API Key 和 API Secret 获取 Access Token（复用）
2. Access Token 有效期：1799秒（约30分钟）
3. 使用 Access Token 调用酒店相关 API

**认证端点：**
- Test Environment: `https://test.api.amadeus.com/v1/security/oauth2/token`
- Production Environment: `https://api.amadeus.com/v1/security/oauth2/token`

### 3.2 使用的 API 端点

| API | 端点 | 方法 | 用途 | 文档链接 |
|-----|------|------|------|----------|
| **Hotel Search** | `/v3/shopping/hotel-offers` | GET | 搜索酒店报价 | [文档](https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-search) |
| **Hotel Offers Search** | `/v3/shopping/hotel-offers/by-hotel` | GET | 根据酒店ID搜索报价 | [文档](https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-offers-search) |
| **Hotel Offer Price** | `/v3/shopping/hotel-offers/{offerId}/price` | GET | 确认酒店价格 | [文档](https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-offers-price) |
| **Hotel Booking** | `/v1/booking/hotel-bookings` | POST | 创建酒店预订 | [文档](https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-booking) |
| **Hotel Booking Management** | `/v1/booking/hotel-bookings/{bookingId}` | GET/DELETE | 查看/取消订单 | [文档](https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-booking-management) |
| **Hotel Name Autocomplete** | `/v1/reference-data/locations/hotels/by-geocode` | GET | 酒店名称自动完成 | [文档](https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-name-autocomplete) |
| **Hotel Ratings** | `/v2/e-reputation/hotel-sentiments` | GET | 酒店评分查询 | [文档](https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-ratings) |

### 3.3 API 基础 URL

- **Test Environment**: `https://test.api.amadeus.com`
- **Production Environment**: `https://api.amadeus.com`

### 3.4 API 配置

复用航班功能的配置：
- `AMADEUS_API_KEY`: Amadeus API Key（复用）
- `AMADEUS_API_SECRET`: Amadeus API Secret（复用）
- `AMADEUS_API_ENV`: 环境（test/production），默认 test（复用）

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
      "self": "https://api.amadeus.com/v3/shopping/hotel-offers?..."
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
        "parameter": "cityCode"
      }
    }
  ]
}
```

## 4. 数据模型设计

### 4.1 Hotel 模型（酒店信息）

```javascript
{
  _id: ObjectId,
  hotelId: String,              // Amadeus 酒店ID
  name: String,                 // 酒店名称
  chainCode: String,           // 连锁代码
  iataCode: String,            // IATA代码
  address: {
    lines: [String],           // 地址行
    cityName: String,          // 城市名称
    countryCode: String,       // 国家代码
    postalCode: String,        // 邮政编码
  },
  geoCode: {
    latitude: Number,          // 纬度
    longitude: Number,          // 经度
  },
  amenities: [String],         // 设施列表
  rating: Number,               // 评分（1-5）
  description: {
    lang: String,               // 语言
    text: String,               // 描述文本
  },
  contact: {
    phone: String,              // 电话
    fax: String,                // 传真
    email: String,              // 邮箱
  },
  createdAt: Date,
  updatedAt: Date
}
```

### 4.2 HotelBooking 模型（预订记录）

```javascript
{
  _id: ObjectId,
  bookingReference: String,    // 预订参考号（Amadeus返回）
  travelId: ObjectId,           // 关联的差旅申请ID（必填）
  employee: ObjectId,           // 预订员工ID
  hotelOffer: Object,           // 酒店报价信息（完整）
  hotel: {                      // 酒店基本信息
    hotelId: String,
    name: String,
    address: Object,
    geoCode: Object,
  },
  checkIn: Date,                // 入住日期
  checkOut: Date,               // 退房日期
  guests: [{                    // 客人信息
    id: String,                 // Amadeus traveler ID
    name: {
      firstName: String,
      lastName: String,
    },
    contact: {
      emailAddress: String,
      phones: [{
        deviceType: String,
        countryCallingCode: String,
        number: String,
      }],
    },
  }],
  rooms: [{                     // 房间信息
    type: String,               // 房间类型
    guests: Number,             // 入住人数
  }],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'failed'],
    default: 'pending'
  },
  price: {
    total: String,              // 总价
    currency: String,           // 货币代码
    base: String,               // 基础价格
    taxes: [{
      amount: String,
      code: String,
      type: String,
    }],
  },
  amadeusBookingId: String,    // Amadeus 订单ID
  cancellationPolicy: String,   // 取消政策
  cancellationReason: String,   // 取消原因（如果取消）
  cancelledAt: Date,           // 取消时间
  specialRequests: String,      // 特殊要求
  createdAt: Date,
  updatedAt: Date
}
```

## 5. 后端实现

### 5.1 Amadeus API 服务模块化设计

**文件结构：**
```
backend/services/amadeus/
├── index.js              # 统一导出入口（扩展）
├── base.js               # 基础功能（复用）
├── flightSearch.js       # 航班搜索（已有）
├── booking.js            # 航班预订（已有）
├── hotelSearch.js        # 酒店搜索和价格确认（新增）
└── hotelBooking.js       # 酒店预订创建和订单管理（新增）
```

**模块职责划分：**

| 文件 | 职责 | 预估行数 |
|------|------|---------|
| `base.js` | 配置验证、Token 获取/刷新、基础工具函数（复用） | ~150 行 |
| `hotelSearch.js` | 酒店搜索、价格确认、酒店名称自动完成、酒店评分 | ~300 行 |
| `hotelBooking.js` | 创建预订、订单管理（获取/取消/修改） | ~350 行 |
| `index.js` | 统一导出、向后兼容（扩展） | ~80 行 |

---

### 5.1.1 酒店搜索模块 (`amadeus/hotelSearch.js`)

**职责：**
- 酒店报价搜索
- 根据酒店ID搜索报价
- 价格确认
- 酒店名称自动完成
- 酒店评分查询

**依赖：**
- 依赖 `base.js` 获取 Token 和 Base URL

**导出接口：**
```javascript
const { getAccessToken, getBaseURL } = require('./base');

module.exports = {
  searchHotelOffers,
  searchHotelOffersByHotel,
  confirmHotelPrice,
  getHotelNameAutocomplete,
  getHotelRatings,
};
```

**详细实现：**

#### 5.1.1.1 搜索酒店报价

```javascript
/**
 * 搜索酒店报价
 * 参考：https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-search
 * 
 * @param {Object} searchParams - 搜索参数
 * @param {String} searchParams.cityCode - 城市代码（IATA代码，如：NYC）
 * @param {String} searchParams.checkInDate - 入住日期 (YYYY-MM-DD)
 * @param {String} searchParams.checkOutDate - 退房日期 (YYYY-MM-DD)
 * @param {Number} searchParams.adults - 成人数量（1-9）
 * @param {Number} searchParams.roomQuantity - 房间数量（默认1）
 * @param {String} searchParams.currencyCode - 货币代码（可选，如：USD, CNY）
 * @param {Number} searchParams.priceRange - 价格范围（可选）
 * @param {Number} searchParams.ratings - 评分筛选（可选，1-5）
 * @param {Array} searchParams.hotelIds - 酒店ID列表（可选）
 * @param {String} searchParams.hotelName - 酒店名称（可选）
 * @param {Number} searchParams.latitude - 纬度（可选，与经度一起使用）
 * @param {Number} searchParams.longitude - 经度（可选，与纬度一起使用）
 * @param {Number} searchParams.radius - 搜索半径（可选，单位：公里）
 * @param {Number} searchParams.radiusUnit - 半径单位（可选，KM 或 MI）
 * @returns {Promise<Object>} 包含data和meta的响应对象
 */
async function searchHotelOffers(searchParams) {
  try {
    const {
      cityCode,
      checkInDate,
      checkOutDate,
      adults = 1,
      roomQuantity = 1,
      currencyCode = 'USD',
      priceRange,
      ratings,
      hotelIds,
      hotelName,
      latitude,
      longitude,
      radius,
      radiusUnit = 'KM',
    } = searchParams;

    // 参数验证
    if (!cityCode && !(latitude && longitude)) {
      throw new Error('缺少必填参数：cityCode 或 (latitude 和 longitude)');
    }
    if (!checkInDate || !checkOutDate) {
      throw new Error('缺少必填参数：checkInDate 和 checkOutDate');
    }
    if (adults < 1 || adults > 9) {
      throw new Error('成人数量必须在1-9之间');
    }

    // 获取 Access Token
    const accessToken = await getAccessToken();
    const baseURL = getBaseURL();

    // 构建查询参数
    const params = new URLSearchParams({
      checkInDate,
      checkOutDate,
      adults: adults.toString(),
      roomQuantity: roomQuantity.toString(),
      currencyCode,
    });

    if (cityCode) {
      params.append('cityCode', cityCode);
    }
    if (latitude && longitude) {
      params.append('latitude', latitude.toString());
      params.append('longitude', longitude.toString());
      if (radius) {
        params.append('radius', radius.toString());
        params.append('radiusUnit', radiusUnit);
      }
    }
    if (priceRange) {
      params.append('priceRange', priceRange.toString());
    }
    if (ratings) {
      params.append('ratings', ratings.toString());
    }
    if (hotelIds && Array.isArray(hotelIds)) {
      hotelIds.forEach(id => params.append('hotelIds', id));
    }
    if (hotelName) {
      params.append('hotelName', hotelName);
    }

    // 调用 API
    const response = await axios.get(
      `${baseURL}/v3/shopping/hotel-offers?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (response.data && response.data.data) {
      logger.debug(`搜索到 ${response.data.data.length} 个酒店报价`);
      return {
        success: true,
        data: response.data.data,
        meta: response.data.meta || {},
      };
    } else {
      throw new Error('API响应格式错误');
    }
  } catch (error) {
    logger.error('搜索酒店报价失败:', error.message);
    
    // 如果是认证错误，尝试刷新Token后重试一次
    if (error.response?.status === 401) {
      logger.debug('Token可能过期，尝试刷新后重试...');
      await refreshAccessToken();
      return searchHotelOffers(searchParams);
    }
    
    throw error;
  }
}
```

#### 5.1.1.2 根据酒店ID搜索报价

```javascript
/**
 * 根据酒店ID搜索报价
 * 参考：https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-offers-search
 * 
 * @param {Object} searchParams - 搜索参数
 * @param {String} searchParams.hotelId - 酒店ID（必填）
 * @param {String} searchParams.checkInDate - 入住日期 (YYYY-MM-DD)
 * @param {String} searchParams.checkOutDate - 退房日期 (YYYY-MM-DD)
 * @param {Number} searchParams.adults - 成人数量（1-9）
 * @param {Number} searchParams.roomQuantity - 房间数量（默认1）
 * @param {String} searchParams.currencyCode - 货币代码（可选）
 * @returns {Promise<Object>} 包含data和meta的响应对象
 */
async function searchHotelOffersByHotel(searchParams) {
  try {
    const {
      hotelId,
      checkInDate,
      checkOutDate,
      adults = 1,
      roomQuantity = 1,
      currencyCode = 'USD',
    } = searchParams;

    // 参数验证
    if (!hotelId) {
      throw new Error('缺少必填参数：hotelId');
    }
    if (!checkInDate || !checkOutDate) {
      throw new Error('缺少必填参数：checkInDate 和 checkOutDate');
    }

    // 获取 Access Token
    const accessToken = await getAccessToken();
    const baseURL = getBaseURL();

    // 构建查询参数
    const params = new URLSearchParams({
      checkInDate,
      checkOutDate,
      adults: adults.toString(),
      roomQuantity: roomQuantity.toString(),
      currencyCode,
    });

    // 调用 API
    const response = await axios.get(
      `${baseURL}/v3/shopping/hotel-offers/by-hotel?hotelIds=${hotelId}&${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (response.data && response.data.data) {
      logger.debug(`搜索到酒店 ${hotelId} 的报价`);
      return {
        success: true,
        data: response.data.data,
        meta: response.data.meta || {},
      };
    } else {
      throw new Error('API响应格式错误');
    }
  } catch (error) {
    logger.error('根据酒店ID搜索报价失败:', error.message);
    
    if (error.response?.status === 401) {
      logger.debug('Token可能过期，尝试刷新后重试...');
      await refreshAccessToken();
      return searchHotelOffersByHotel(searchParams);
    }
    
    throw error;
  }
}
```

#### 5.1.1.3 确认酒店价格

```javascript
/**
 * 确认酒店价格
 * 参考：https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-offers-price
 * 
 * @param {String} offerId - 酒店报价ID（必填）
 * @returns {Promise<Object>} 确认后的价格信息
 */
async function confirmHotelPrice(offerId) {
  try {
    if (!offerId) {
      throw new Error('offerId参数必填');
    }

    // 获取 Access Token
    const accessToken = await getAccessToken();
    const baseURL = getBaseURL();

    // 调用 API
    const response = await axios.get(
      `${baseURL}/v3/shopping/hotel-offers/${offerId}/price`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (response.data && response.data.data) {
      logger.debug('酒店价格确认成功');
      return {
        success: true,
        data: response.data.data,
        meta: response.data.meta || {},
      };
    } else {
      throw new Error('价格确认API响应格式错误');
    }
  } catch (error) {
    logger.error('确认酒店价格失败:', error.message);
    
    if (error.response?.status === 401) {
      logger.debug('Token可能过期，尝试刷新后重试...');
      await refreshAccessToken();
      return confirmHotelPrice(offerId);
    }
    
    // 处理价格变更错误
    if (error.response?.status === 400) {
      const errorDetail = error.response.data?.errors?.[0]?.detail;
      if (errorDetail && errorDetail.includes('price')) {
        throw new Error('酒店价格已变更，请重新搜索');
      }
    }
    
    throw error;
  }
}
```

#### 5.1.1.4 酒店名称自动完成

```javascript
/**
 * 酒店名称自动完成
 * 参考：https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-name-autocomplete
 * 
 * @param {Object} searchParams - 搜索参数
 * @param {Number} searchParams.latitude - 纬度（必填）
 * @param {Number} searchParams.longitude - 经度（必填）
 * @param {String} searchParams.keyword - 关键词（可选）
 * @param {Number} searchParams.radius - 搜索半径（可选，单位：公里）
 * @param {String} searchParams.hotelSource - 酒店来源（可选，ALL, AMADEUS, EXPEDIA）
 * @returns {Promise<Object>} 酒店列表
 */
async function getHotelNameAutocomplete(searchParams) {
  try {
    const {
      latitude,
      longitude,
      keyword,
      radius = 5,
      hotelSource = 'ALL',
    } = searchParams;

    // 参数验证
    if (!latitude || !longitude) {
      throw new Error('缺少必填参数：latitude 和 longitude');
    }

    // 获取 Access Token
    const accessToken = await getAccessToken();
    const baseURL = getBaseURL();

    // 构建查询参数
    const params = new URLSearchParams({
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      radius: radius.toString(),
      hotelSource,
    });

    if (keyword) {
      params.append('keyword', keyword);
    }

    // 调用 API
    const response = await axios.get(
      `${baseURL}/v1/reference-data/locations/hotels/by-geocode?${params.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (response.data && response.data.data) {
      logger.debug(`找到 ${response.data.data.length} 个酒店`);
      return {
        success: true,
        data: response.data.data,
        meta: response.data.meta || {},
      };
    } else {
      throw new Error('API响应格式错误');
    }
  } catch (error) {
    logger.error('酒店名称自动完成失败:', error.message);
    
    if (error.response?.status === 401) {
      logger.debug('Token可能过期，尝试刷新后重试...');
      await refreshAccessToken();
      return getHotelNameAutocomplete(searchParams);
    }
    
    throw error;
  }
}
```

#### 5.1.1.5 酒店评分查询

```javascript
/**
 * 酒店评分查询
 * 参考：https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-ratings
 * 
 * @param {Object} searchParams - 搜索参数
 * @param {String} searchParams.hotelIds - 酒店ID列表（逗号分隔，必填）
 * @returns {Promise<Object>} 酒店评分列表
 */
async function getHotelRatings(searchParams) {
  try {
    const { hotelIds } = searchParams;

    // 参数验证
    if (!hotelIds) {
      throw new Error('缺少必填参数：hotelIds');
    }

    // 获取 Access Token
    const accessToken = await getAccessToken();
    const baseURL = getBaseURL();

    // 调用 API
    const response = await axios.get(
      `${baseURL}/v2/e-reputation/hotel-sentiments?hotelIds=${hotelIds}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.amadeus+json',
        },
        timeout: 30000,
      }
    );

    if (response.data && response.data.data) {
      logger.debug(`获取到 ${response.data.data.length} 个酒店的评分`);
      return {
        success: true,
        data: response.data.data,
        meta: response.data.meta || {},
      };
    } else {
      throw new Error('API响应格式错误');
    }
  } catch (error) {
    logger.error('获取酒店评分失败:', error.message);
    
    if (error.response?.status === 401) {
      logger.debug('Token可能过期，尝试刷新后重试...');
      await refreshAccessToken();
      return getHotelRatings(searchParams);
    }
    
    throw error;
  }
}
```

---

### 5.1.2 酒店预订管理模块 (`amadeus/hotelBooking.js`)

**职责：**
- 创建酒店预订
- 获取订单详情
- 取消订单
- 修改订单（如果支持）

**依赖：**
- 依赖 `base.js` 获取 Token 和 Base URL

**导出接口：**
```javascript
const { getAccessToken, getBaseURL } = require('./base');

module.exports = {
  createHotelBooking,
  getHotelBooking,
  cancelHotelBooking,
};
```

**详细实现：**

#### 5.1.2.1 创建酒店预订

```javascript
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

    // 获取 Access Token
    const accessToken = await getAccessToken();
    const baseURL = getBaseURL();

    // 构建请求体
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

    // 调用 API
    const response = await axios.post(
      `${baseURL}/v1/booking/hotel-bookings`,
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
      logger.debug('酒店预订成功');
      return {
        success: true,
        data: response.data.data,
        meta: response.data.meta || {},
      };
    } else {
      throw new Error('预订API响应格式错误');
    }
  } catch (error) {
    logger.error('创建酒店预订失败:', error.message);
    
    // 如果是认证错误，尝试刷新Token后重试一次
    if (error.response?.status === 401) {
      logger.debug('Token可能过期，尝试刷新后重试...');
      await refreshAccessToken();
      return createHotelBooking(bookingData);
    }
    
    throw error;
  }
}
```

#### 5.1.2.2 获取订单详情

```javascript
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

    // 获取 Access Token
    const accessToken = await getAccessToken();
    const baseURL = getBaseURL();

    // 调用 API
    const response = await axios.get(
      `${baseURL}/v1/booking/hotel-bookings/${bookingId}`,
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
      return getHotelBooking(bookingId);
    }
    
    throw error;
  }
}
```

#### 5.1.2.3 取消订单

```javascript
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

    // 获取 Access Token
    const accessToken = await getAccessToken();
    const baseURL = getBaseURL();

    // 调用 API
    const response = await axios.delete(
      `${baseURL}/v1/booking/hotel-bookings/${bookingId}`,
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
      return cancelHotelBooking(bookingId);
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

---

### 5.1.3 统一导出入口 (`amadeus/index.js`)

**扩展后的导出接口：**

```javascript
// backend/services/amadeus/index.js
const base = require('./base');
const flightSearch = require('./flightSearch');
const flightBooking = require('./booking');
const hotelSearch = require('./hotelSearch');
const hotelBooking = require('./hotelBooking');

// 统一导出所有功能
module.exports = {
  // 基础功能
  ...base,
  
  // 航班搜索
  ...flightSearch,
  
  // 航班预订管理
  ...flightBooking,
  
  // 酒店搜索
  ...hotelSearch,
  
  // 酒店预订管理
  ...hotelBooking,
};
```

**使用方式：**
```javascript
// 方式一：直接导入（推荐）
const amadeusApi = require('./services/amadeus');
await amadeusApi.searchHotelOffers({...});
await amadeusApi.createHotelBooking({...});

// 方式二：按需导入
const { searchHotelOffers } = require('./services/amadeus/hotelSearch');
const { createHotelBooking } = require('./services/amadeus/hotelBooking');
```

---

### 5.2 控制器 (`hotelController.js`)

```javascript
/**
 * 搜索酒店
 * @route POST /api/hotels/search
 */
exports.searchHotels = async (req, res) => {
  // 1. 验证请求参数
  // 2. 调用 amadeusApiService.searchHotelOffers
  // 3. 可选：保存搜索结果到数据库（用于历史记录）
  // 4. 返回结果
}

/**
 * 确认酒店价格
 * @route POST /api/hotels/confirm-price
 */
exports.confirmPrice = async (req, res) => {
  // 1. 验证报价ID
  // 2. 调用 amadeusApiService.confirmHotelPrice
  // 3. 返回确认后的价格
}

/**
 * 创建预订（必须关联差旅申请）
 * @route POST /api/hotels/bookings
 * @access Private
 */
exports.createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { travelId, offerId, guests, payments, rooms, specialRequests } = req.body;

    // 1. 验证 travelId 必填
    if (!travelId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'travelId参数必填：酒店预订必须关联差旅申请',
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
    const bookingResult = await amadeusApiService.createHotelBooking({
      offerId,
      guests,
      payments,
      rooms,
    });

    // 6. 保存预订记录到数据库
    const hotelBooking = await HotelBooking.create([{
      travelId,
      employee: req.user.id,
      bookingReference: bookingResult.data.associatedRecords?.reference,
      amadeusBookingId: bookingResult.data.id,
      hotelOffer: bookingResult.data.offer,
      hotel: {
        hotelId: bookingResult.data.offer.hotel.hotelId,
        name: bookingResult.data.offer.hotel.name,
        address: bookingResult.data.offer.hotel.address,
        geoCode: bookingResult.data.offer.hotel.geoCode,
      },
      checkIn: bookingResult.data.offer.checkIn,
      checkOut: bookingResult.data.offer.checkOut,
      guests: bookingResult.data.guests,
      rooms: bookingResult.data.rooms || [],
      status: 'confirmed',
      price: {
        total: bookingResult.data.price?.total,
        currency: bookingResult.data.price?.currency,
        base: bookingResult.data.price?.base,
        taxes: bookingResult.data.price?.taxes || [],
      },
      cancellationPolicy: bookingResult.data.offer.policies?.cancellation,
      specialRequests,
    }], { session });

    // 7. 更新差旅申请（在同一事务中）
    const bookingCost = parseFloat(bookingResult.data.price?.total || 0);
    
    travel.bookings.push({
      type: 'hotel',
      provider: 'Amadeus',
      bookingReference: bookingResult.data.associatedRecords?.reference,
      amadeusBookingId: bookingResult.data.id,
      hotelBookingId: hotelBooking[0]._id,
      cost: bookingCost,
      currency: bookingResult.data.price?.currency || 'USD',
      status: 'confirmed',
      details: {
        hotelName: bookingResult.data.offer.hotel.name,
        checkIn: bookingResult.data.offer.checkIn,
        checkOut: bookingResult.data.offer.checkOut,
        guests: guests.length,
        rooms: rooms?.length || 1,
      },
    });

    travel.estimatedCost = (travel.estimatedCost || 0) + bookingCost;
    await travel.save({ session });

    // 8. 提交事务
    await session.commitTransaction();

    // 9. 发送通知
    await notificationService.sendBookingConfirmation(req.user.id, hotelBooking[0]);

    res.json({
      success: true,
      data: hotelBooking[0],
      message: '酒店预订成功',
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error('创建酒店预订失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '创建酒店预订失败',
    });
  } finally {
    session.endSession();
  }
};

/**
 * 获取预订列表（支持按差旅申请筛选）
 * @route GET /api/hotels/bookings
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
    
    const bookings = await HotelBooking.find(query)
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
 * 获取差旅申请的酒店预订
 * @route GET /api/travel/:id/hotels
 * @access Private
 */
exports.getTravelHotels = async (req, res) => {
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
    
    const bookings = await HotelBooking.find({ travelId })
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
    logger.error('获取差旅申请酒店预订失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取酒店预订失败',
    });
  }
};

/**
 * 根据差旅单号查询酒店预订及费用（用于核销）
 * @route GET /api/hotels/bookings/by-travel-number/:travelNumber
 * @access Private
 * 
 * 用途：在费用核销时，根据差旅单号查询该差旅申请关联的所有酒店预订及费用汇总
 */
exports.getBookingsByTravelNumber = async (req, res) => {
  try {
    const { travelNumber } = req.params;
    
    if (!travelNumber) {
      return res.status(400).json({
        success: false,
        message: '差旅单号不能为空',
      });
    }
    
    // 1. 根据差旅单号查找差旅申请
    const travel = await Travel.findOne({ travelNumber })
      .populate('employee', 'firstName lastName email');
    
    if (!travel) {
      return res.status(404).json({
        success: false,
        message: `差旅单号 ${travelNumber} 不存在`,
      });
    }
    
    // 2. 数据权限检查
    const hasAccess = await checkResourceAccess(req, travel, 'travel', 'employee');
    if (!hasAccess) {
      throw ErrorFactory.forbidden('无权访问该差旅申请');
    }
    
    // 3. 查询该差旅申请关联的所有酒店预订
    const bookings = await HotelBooking.find({ travelId: travel._id })
      .sort({ createdAt: -1 })
      .lean();
    
    // 4. 计算费用汇总
    const expenseSummary = {
      // 预订统计
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
      pendingBookings: bookings.filter(b => b.status === 'pending').length,
      cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
      
      // 费用统计（只统计已确认且未取消的预订）
      totalAmount: 0,
      totalAmountByCurrency: {}, // 按货币分类统计
      
      // 可核销费用（已确认且未取消的预订）
      reimbursableAmount: 0,
      reimbursableBookings: [],
    };
    
    bookings.forEach(booking => {
      if (booking.status === 'confirmed' && booking.status !== 'cancelled') {
        const amount = parseFloat(booking.price?.total || 0);
        const currency = booking.price?.currency || 'USD';
        
        expenseSummary.totalAmount += amount;
        
        // 按货币分类统计
        if (!expenseSummary.totalAmountByCurrency[currency]) {
          expenseSummary.totalAmountByCurrency[currency] = 0;
        }
        expenseSummary.totalAmountByCurrency[currency] += amount;
        
        // 可核销费用
        expenseSummary.reimbursableAmount += amount;
        expenseSummary.reimbursableBookings.push({
          bookingId: booking._id,
          bookingReference: booking.bookingReference,
          amadeusBookingId: booking.amadeusBookingId,
          amount,
          currency,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          hotelName: booking.hotel?.name,
          guests: booking.guests?.length || 0,
          rooms: booking.rooms?.length || 1,
          status: booking.status,
        });
      }
    });
    
    // 5. 返回结果
    res.json({
      success: true,
      data: {
        travel: {
          _id: travel._id,
          travelNumber: travel.travelNumber,
          title: travel.title,
          status: travel.status,
          employee: travel.employee,
          startDate: travel.startDate,
          endDate: travel.endDate,
        },
        bookings: bookings.map(booking => ({
          _id: booking._id,
          bookingReference: booking.bookingReference,
          amadeusBookingId: booking.amadeusBookingId,
          status: booking.status,
          price: booking.price,
          hotel: booking.hotel,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          guests: booking.guests || [],
          rooms: booking.rooms || [],
          createdAt: booking.createdAt,
          cancelledAt: booking.cancelledAt,
        })),
        expenseSummary,
      },
    });
  } catch (error) {
    logger.error('根据差旅单号查询酒店预订失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '查询酒店预订失败',
    });
  }
};

/**
 * 获取预订详情
 * @route GET /api/hotels/bookings/:id
 * @access Private
 */
exports.getBooking = async (req, res) => {
  try {
    const booking = await HotelBooking.findById(req.params.id)
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
 * @route DELETE /api/hotels/bookings/:id
 * @access Private
 */
exports.cancelBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const booking = await HotelBooking.findById(id).session(session);
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
    if (booking.amadeusBookingId) {
      try {
        await amadeusApiService.cancelHotelBooking(booking.amadeusBookingId);
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
          b => b.hotelBookingId && b.hotelBookingId.toString() === booking._id.toString()
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

### 5.3 路由 (`hotels.js`)

```javascript
const express = require('express');
const {
  searchHotels,
  confirmPrice,
  createBooking,
  getBookings,
  getBookingsByTravelNumber,
  getBooking,
  cancelBooking,
  getHotelNameAutocomplete,
  getHotelRatings,
} = require('../controllers/hotelController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 所有路由需要认证
router.use(protect);

// 酒店搜索
router.post('/search', searchHotels);
router.post('/search-by-hotel', searchHotels); // 根据酒店ID搜索

// 价格确认
router.post('/confirm-price', confirmPrice);

// 酒店名称自动完成
router.get('/autocomplete', getHotelNameAutocomplete);

// 酒店评分查询
router.get('/ratings', getHotelRatings);

// 预订管理
router.post('/bookings', createBooking);                              // 创建预订（必须关联差旅申请）
router.get('/bookings', getBookings);                                 // 获取预订列表（支持按差旅申请筛选）
router.get('/bookings/by-travel-number/:travelNumber', getBookingsByTravelNumber); // 根据差旅单号查询预订（用于核销）
router.get('/bookings/:id', getBooking);                              // 获取预订详情
router.delete('/bookings/:id', cancelBooking);                        // 取消预订（同步更新差旅申请）

module.exports = router;
```

### 5.4 差旅申请路由扩展 (`routes/travel.js`)

在现有的差旅申请路由中添加酒店预订相关端点：

```javascript
// 在 travel.js 中添加
const {
  getTravelHotels  // 获取差旅申请的酒店预订
} = require('../controllers/hotelController');

// 获取差旅申请的酒店预订
router.get('/:id/hotels', protect, loadUserRole, getTravelHotels);
```

### 5.5 数据模型 (`models/HotelBooking.js`)

```javascript
const mongoose = require('mongoose');

const HotelBookingSchema = new mongoose.Schema({
  // 关联的差旅申请ID（必填）
  travelId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Travel',
    required: [true, '差旅申请ID必填：酒店预订必须关联差旅申请'],
    index: true,
  },
  // 预订员工ID
  employee: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, '预订员工ID必填'],
    index: true,
  },
  // 预订参考号（Amadeus返回）
  bookingReference: {
    type: String,
    trim: true,
    index: true,
  },
  // Amadeus 订单ID
  amadeusBookingId: {
    type: String,
    trim: true,
  },
  // 酒店报价信息（完整对象，存储 Amadeus API 返回的完整数据）
  hotelOffer: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  // 酒店基本信息
  hotel: {
    hotelId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    address: {
      type: mongoose.Schema.Types.Mixed,
    },
    geoCode: {
      latitude: Number,
      longitude: Number,
    },
  },
  // 入住日期
  checkIn: {
    type: Date,
    required: true,
  },
  // 退房日期
  checkOut: {
    type: Date,
    required: true,
  },
  // 客人信息
  guests: [{
    id: {
      type: String,
      required: true,
    },
    name: {
      firstName: {
        type: String,
        required: true,
        trim: true,
      },
      lastName: {
        type: String,
        required: true,
        trim: true,
      },
    },
    contact: {
      emailAddress: {
        type: String,
        required: true,
        lowercase: true,
      },
      phones: [{
        deviceType: {
          type: String,
          enum: ['MOBILE', 'LANDLINE'],
        },
        countryCallingCode: {
          type: String,
          trim: true,
        },
        number: {
          type: String,
          trim: true,
        },
      }],
    },
  }],
  // 房间信息
  rooms: [{
    type: {
      type: String,
      trim: true,
    },
    guests: {
      type: Number,
      default: 1,
    },
  }],
  // 预订状态
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'failed'],
    default: 'pending',
  },
  // 价格信息
  price: {
    total: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
    },
    base: {
      type: String,
    },
    taxes: [{
      amount: {
        type: String,
      },
      code: {
        type: String,
      },
      type: {
        type: String,
      },
    }],
  },
  // 取消政策
  cancellationPolicy: {
    type: String,
    trim: true,
  },
  // 取消原因
  cancellationReason: {
    type: String,
    trim: true,
  },
  // 取消时间
  cancelledAt: {
    type: Date,
  },
  // 特殊要求
  specialRequests: {
    type: String,
    trim: true,
  },
  // 备注
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

// 索引
HotelBookingSchema.index({ travelId: 1, createdAt: -1 });
HotelBookingSchema.index({ employee: 1, createdAt: -1 });
HotelBookingSchema.index({ status: 1 });
HotelBookingSchema.index({ amadeusBookingId: 1 }, { unique: true, sparse: true });
HotelBookingSchema.index({ checkIn: 1, checkOut: 1 });

module.exports = mongoose.model('HotelBooking', HotelBookingSchema);
```

## 6. 前端实现

### 6.1 预订搜索页面（Tab 页设计）

**设计说明：**
- 修改现有的 `FlightSearch.js` 页面，增加 Tab 页切换功能
- 页面顶部添加 Tab 切换器：**机票预订** Tab（现有功能）和 **酒店预订** Tab（新增功能）
- 两个 Tab 共享页面布局，但展示不同的搜索表单和搜索结果
- 保持现有机票搜索功能完全不变，仅增加 Tab 切换和酒店搜索功能

**页面结构：**
```
┌─────────────────────────────────────┐
│  Tab 切换器                          │
│  [机票预订] [酒店预订]                │
├─────────────────────────────────────┤
│  根据选中的 Tab 显示对应的搜索表单      │
│  - 机票 Tab: 显示航班搜索表单         │
│  - 酒店 Tab: 显示酒店搜索表单         │
├─────────────────────────────────────┤
│  搜索结果区域                         │
│  - 机票 Tab: 显示航班列表             │
│  - 酒店 Tab: 显示酒店列表             │
└─────────────────────────────────────┘
```

**修改后的页面组件结构：**

```javascript
// frontend/src/pages/Flight/FlightSearch.js（修改）
import { Tabs, Tab, Box } from '@mui/material';
import FlightSearchForm from './FlightSearchForm';  // 机票搜索表单（现有）
import HotelSearchForm from '../Hotel/HotelSearchForm';  // 酒店搜索表单（新增）
import FlightList from './FlightList';  // 航班列表（现有）
import HotelList from '../Hotel/HotelList';  // 酒店列表（新增）

const FlightSearch = () => {
  const [activeTab, setActiveTab] = useState(0); // 0: 机票, 1: 酒店
  
  return (
    <Container>
      {/* Tab 切换器 */}
      <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
        <Tab label="机票预订" icon={<FlightTakeoffIcon />} />
        <Tab label="酒店预订" icon={<HotelIcon />} />
      </Tabs>
      
      {/* 根据 Tab 显示对应的搜索表单和结果 */}
      {activeTab === 0 ? (
        <>
          <FlightSearchForm onSearch={handleFlightSearch} />
          {flightResults && <FlightList flights={flightResults} />}
        </>
      ) : (
        <>
          <HotelSearchForm onSearch={handleHotelSearch} />
          {hotelResults && <HotelList hotels={hotelResults} />}
        </>
      )}
    </Container>
  );
};
```

**Tab 页功能说明：**

#### 6.1.1 机票预订 Tab（现有功能，保持不变）

**功能：**
- 航班搜索表单（出发地、目的地、日期、乘客数量、舱位等级）
- 往返/单程切换
- 航班搜索结果展示
- 航班筛选和排序
- 航班详情查看和预订

**组件：**
- `FlightSearchForm`: 机票搜索表单（现有）
- `FlightList`: 航班列表（现有）
- `FlightFilterBar`: 航班筛选栏（现有）

#### 6.1.2 酒店预订 Tab（新增功能）

**功能：**
- 酒店搜索表单（城市/位置、入住日期、退房日期、客人数量、房间数量）
- 日期选择器
- 城市/位置自动完成
- 酒店名称自动完成
- 酒店搜索结果展示
- 筛选器（价格、评分、设施等）

**主要组件：**
- `HotelSearchForm`: 酒店搜索表单（新增）
- `HotelCard`: 酒店卡片（列表展示，新增）
- `HotelFilters`: 筛选器（价格、评分、设施等，新增）

**Tab 切换逻辑：**
- 切换 Tab 时，清空当前 Tab 的搜索结果
- 保持各 Tab 的搜索条件独立（使用不同的 state）
- 支持从 URL 参数或路由状态恢复 Tab 状态和搜索条件
- 使用 sessionStorage 保存各 Tab 的搜索状态，便于页面刷新后恢复

**实现细节：**

1. **状态管理：**
```javascript
const [activeTab, setActiveTab] = useState(0); // 0: 机票, 1: 酒店
const [flightSearchParams, setFlightSearchParams] = useState({});
const [hotelSearchParams, setHotelSearchParams] = useState({});
const [flightResults, setFlightResults] = useState(null);
const [hotelResults, setHotelResults] = useState(null);
```

2. **Tab 切换处理：**
```javascript
const handleTabChange = (event, newValue) => {
  setActiveTab(newValue);
  // 切换 Tab 时，可以保存当前 Tab 的状态到 sessionStorage
  if (newValue === 0) {
    // 切换到机票 Tab，保存酒店搜索状态
    saveHotelSearchState();
  } else {
    // 切换到酒店 Tab，保存机票搜索状态
    saveFlightSearchState();
  }
};
```

3. **URL 参数支持：**
```javascript
// 支持从 URL 参数指定默认 Tab
// /flight/search?tab=hotel 直接打开酒店 Tab
const searchParams = new URLSearchParams(location.search);
const tabParam = searchParams.get('tab');
if (tabParam === 'hotel') {
  setActiveTab(1);
}
```

4. **路由集成：**
```javascript
// 从差旅申请详情页跳转时，可以指定 Tab
// navigate('/flight/search', { state: { defaultTab: 'hotel' } });
useEffect(() => {
  if (location.state?.defaultTab === 'hotel') {
    setActiveTab(1);
  }
}, [location.state]);
```

**页面布局示例：**
```javascript
<Container maxWidth="lg" sx={{ py: 4 }}>
  {/* Tab 切换器 - 固定在顶部 */}
  <Paper elevation={1} sx={{ mb: 3 }}>
    <Tabs 
      value={activeTab} 
      onChange={handleTabChange}
      variant="fullWidth"
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        '& .MuiTab-root': {
          minHeight: 64,
          fontSize: '16px',
          fontWeight: 600,
        },
      }}
    >
      <Tab 
        label="机票预订" 
        icon={<FlightTakeoffIcon />} 
        iconPosition="start"
      />
      <Tab 
        label="酒店预订" 
        icon={<HotelIcon />} 
        iconPosition="start"
      />
    </Tabs>
  </Paper>

  {/* 根据 Tab 显示对应内容 */}
  <Box>
    {activeTab === 0 ? (
      <>
        {/* 机票搜索表单 */}
        <FlightSearchForm 
          initialValues={flightSearchParams}
          onSearch={handleFlightSearch}
        />
        {/* 航班搜索结果 */}
        {flightResults && (
          <FlightList 
            flights={flightResults}
            searchParams={flightSearchParams}
            onSelectFlight={handleSelectFlight}
          />
        )}
      </>
    ) : (
      <>
        {/* 酒店搜索表单 */}
        <HotelSearchForm 
          initialValues={hotelSearchParams}
          onSearch={handleHotelSearch}
        />
        {/* 酒店搜索结果 */}
        {hotelResults && (
          <HotelList 
            hotels={hotelResults}
            searchParams={hotelSearchParams}
            onSelectHotel={handleSelectHotel}
          />
        )}
      </>
    )}
  </Box>
</Container>
```

### 6.2 酒店搜索表单组件 (`HotelSearchForm.js`)

**功能：**
- 城市/位置输入（支持城市代码或经纬度）
- 入住日期选择器
- 退房日期选择器
- 客人数量选择
- 房间数量选择
- 酒店名称搜索（可选）
- 搜索按钮

**组件设计：**
```javascript
// frontend/src/components/Hotel/HotelSearchForm.js
const HotelSearchForm = ({ onSearch, initialValues }) => {
  const [cityCode, setCityCode] = useState('');
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  const [adults, setAdults] = useState(1);
  const [roomQuantity, setRoomQuantity] = useState(1);
  
  const handleSearch = () => {
    onSearch({
      cityCode,
      checkInDate: checkInDate?.format('YYYY-MM-DD'),
      checkOutDate: checkOutDate?.format('YYYY-MM-DD'),
      adults,
      roomQuantity,
    });
  };
  
  return (
    <Paper>
      {/* 搜索表单字段 */}
      {/* 搜索按钮 */}
    </Paper>
  );
};
```

### 6.3 酒店列表组件 (`HotelList.js`)

**功能：**
- 显示酒店搜索结果列表
- 酒店卡片展示（名称、地址、价格、评分、设施等）
- 酒店筛选和排序
- 点击酒店卡片跳转到详情页

**组件设计：**
```javascript
// frontend/src/components/Hotel/HotelList.js
const HotelList = ({ hotels, searchParams, onSelectHotel }) => {
  return (
    <Box>
      <HotelFilterBar hotels={hotels} />
      {hotels.map(hotel => (
        <HotelCard 
          key={hotel.hotel.hotelId} 
          hotel={hotel}
          onClick={() => onSelectHotel(hotel)}
        />
      ))}
    </Box>
  );
};
```

### 6.4 酒店详情页面 (`HotelDetail.js`)

**功能：**
- 显示酒店详细信息
- 显示价格明细
- 显示取消政策
- 显示酒店评分和评论
- 预订按钮
- 返回搜索列表

### 6.5 酒店预订表单 (`HotelBookingForm.js`)

**功能：**
- 客人信息表单（姓名、联系方式）
- 房间选择
- 与差旅申请关联选择
- 价格确认
- 特殊要求输入
- 提交预订

### 6.6 预订管理页面 (`BookingManagement.js`)

**功能：**
- 显示用户的所有预订（机票和酒店）
- Tab 切换：机票预订 / 酒店预订
- 预订状态筛选
- 查看预订详情
- 取消预订

**功能：**
- 显示用户的所有预订
- 预订状态筛选
- 查看预订详情
- 取消预订

### 6.7 API 服务 (`hotelService.js`)

```javascript
// 搜索酒店
export const searchHotels = (searchParams) => {
  return apiClient.post('/hotels/search', searchParams);
};

// 根据酒店ID搜索
export const searchHotelsByHotel = (searchParams) => {
  return apiClient.post('/hotels/search-by-hotel', searchParams);
};

// 确认价格
export const confirmPrice = (offerId) => {
  return apiClient.post('/hotels/confirm-price', { offerId });
};

// 酒店名称自动完成
export const getHotelNameAutocomplete = (params) => {
  return apiClient.get('/hotels/autocomplete', { params });
};

// 酒店评分查询
export const getHotelRatings = (hotelIds) => {
  return apiClient.get('/hotels/ratings', { params: { hotelIds } });
};

// 创建预订
export const createBooking = (bookingData) => {
  return apiClient.post('/hotels/bookings', bookingData);
};

// 获取预订列表
export const getBookings = (params) => {
  return apiClient.get('/hotels/bookings', { params });
};

// 获取预订详情
export const getBooking = (id) => {
  return apiClient.get(`/hotels/bookings/${id}`);
};

// 取消预订
export const cancelBooking = (id, reason) => {
  return apiClient.delete(`/hotels/bookings/${id}`, { data: { reason } });
};
```

## 7. 与差旅申请集成

### 7.1 集成设计原则

**核心原则：**
- 酒店预订必须与差旅申请关联（必填）
- 酒店预订是差旅申请的组成部分
- 预订状态变更自动同步到差旅申请
- 预算和费用自动关联

### 7.2 数据关联设计

#### 7.2.1 HotelBooking 模型关联

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
- 酒店预订创建时，自动添加到 Travel.bookings
- 预订类型：`type: 'hotel'`
- 存储完整的预订信息：
  ```javascript
  {
    type: 'hotel',
    provider: 'Amadeus',
    bookingReference: String,      // Amadeus 预订参考号
    amadeusBookingId: String,        // Amadeus 订单ID
    hotelBookingId: ObjectId,       // 关联的 HotelBooking 记录ID
    cost: Number,
    currency: String,
    status: String,                // pending, confirmed, cancelled
    details: {
      hotelName: String,
      checkIn: Date,
      checkOut: Date,
      guests: Number,
      rooms: Number,
    }
  }
  ```

### 7.3 业务流程集成

#### 7.3.1 从差旅申请创建酒店预订

**流程：**
1. 用户在差旅申请详情页点击"预订酒店"按钮
2. 跳转到预订搜索页面（`/flight/search`），并自动切换到酒店 Tab
3. 系统自动填充搜索条件：
   - 城市：从 `destination` 获取（如果 destination 是 Location 对象，提取 cityCode）
   - 入住日期：从 `startDate` 获取
   - 退房日期：从 `endDate` 获取
   - 客人数量：默认 1 人（可从用户信息获取）
   - 房间数量：默认 1 间
4. 用户搜索并选择酒店
5. 点击酒店卡片，跳转到酒店详情/预订页面
6. 在预订页面，`travelId` 自动填充（从路由参数或 state 传递）
7. 用户填写客人信息和特殊要求，提交预订
8. 创建预订时，自动关联 `travelId`
9. 预订成功后，更新 Travel 模型：
   - 添加到 `bookings` 数组
   - 更新 `estimatedCost`（累加酒店费用）
   - 更新状态（如果所有预订都完成）

**跳转代码示例：**
```javascript
// 在差旅申请详情页
const handleBookHotel = () => {
  navigate('/flight/search', {
    state: {
      defaultTab: 'hotel',  // 指定默认 Tab
      travelId: travel._id,  // 传递差旅申请ID
      prefillData: {         // 预填充数据
        cityCode: getCityCode(travel.destination),
        checkInDate: travel.startDate,
        checkOutDate: travel.endDate,
        adults: 1,
      },
    },
  });
};
```

#### 7.3.2 独立创建酒店预订（必须关联差旅申请）

**流程：**
1. 用户在酒店搜索页面创建预订
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
POST /api/hotels/bookings
{
  travelId: ObjectId,        // 必填：关联的差旅申请ID
  offerId: String,           // 酒店报价ID
  guests: Array,             // 客人信息
  payments: Array,           // 支付信息（可选）
  rooms: Array,              // 房间信息（可选）
  specialRequests: String,   // 特殊要求（可选）
  // ... 其他字段
}
```

**验证逻辑：**
1. 验证 `travelId` 存在且属于当前用户
2. 验证差旅申请状态允许添加预订
3. 验证日期匹配（可选，允许一定灵活性）
4. 创建预订
5. 更新 Travel 模型

#### 7.4.2 获取差旅申请的酒店预订

```javascript
GET /api/travel/:id/hotels
```

**返回：**
- 该差旅申请关联的所有酒店预订
- 预订状态汇总
- 总费用统计

#### 7.4.3 根据差旅单号查询酒店预订及费用（核销用）

```javascript
GET /api/hotels/bookings/by-travel-number/:travelNumber
```

**用途：**
- 在费用核销（报销）流程中，根据差旅单号查询酒店预订及费用
- 支持按差旅单号快速查询，无需知道差旅申请的 ID

**返回数据：**
```json
{
  "success": true,
  "data": {
    "travel": {
      "_id": "...",
      "travelNumber": "TR-20251206-0001",
      "title": "差旅申请标题",
      "status": "approved",
      "employee": {...},
      "startDate": "2025-12-25",
      "endDate": "2025-12-30"
    },
    "bookings": [
      {
        "_id": "...",
        "bookingReference": "HTL123456",
        "amadeusBookingId": "...",
        "status": "confirmed",
        "price": {
          "total": "500.00",
          "currency": "USD"
        },
        "hotel": {...},
        "checkIn": "2025-12-25",
        "checkOut": "2025-12-30",
        "guests": [...],
        "rooms": [...],
        "createdAt": "...",
        "cancelledAt": null
      }
    ],
    "expenseSummary": {
      "totalBookings": 1,
      "confirmedBookings": 1,
      "pendingBookings": 0,
      "cancelledBookings": 0,
      "totalAmount": 500.00,
      "totalAmountByCurrency": {
        "USD": 500.00
      },
      "reimbursableAmount": 500.00,
      "reimbursableBookings": [
        {
          "bookingId": "...",
          "bookingReference": "HTL123456",
          "amount": 500.00,
          "currency": "USD",
          "checkIn": "2025-12-25",
          "checkOut": "2025-12-30",
          "hotelName": "示例酒店",
          "guests": 1,
          "rooms": 1,
          "status": "confirmed"
        }
      ]
    }
  }
}
```

**费用汇总说明：**
- `totalBookings`: 总预订数
- `confirmedBookings`: 已确认的预订数
- `cancelledBookings`: 已取消的预订数
- `totalAmount`: 总费用（所有已确认且未取消的预订）
- `totalAmountByCurrency`: 按货币分类的费用统计
- `reimbursableAmount`: 可核销费用（已确认且未取消的预订）
- `reimbursableBookings`: 可核销的预订列表（包含详细信息）

**使用场景：**
1. 费用核销时，用户输入差旅单号
2. 系统自动查询该差旅单关联的所有酒店预订
3. 显示费用汇总和可核销金额
4. 用户可以选择将酒店费用添加到报销单中

#### 7.4.4 取消预订时的同步

```javascript
DELETE /api/hotels/bookings/:id
{
  reason: String  // 取消原因
}
```

**同步逻辑：**
1. 取消 Amadeus 订单
2. 更新 HotelBooking 状态
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

**添加酒店预订区域：**
- 显示已关联的酒店预订列表
- "预订酒店"按钮（跳转到预订搜索页面，自动切换到酒店 Tab，并填充搜索条件）
- 预订状态和费用显示
- 与机票预订区域并列显示，保持一致的 UI 风格

**跳转实现：**
```javascript
// 在差旅申请详情页添加"预订酒店"按钮
<Button
  variant="contained"
  startIcon={<HotelIcon />}
  onClick={() => {
    navigate('/flight/search', {
      state: {
        defaultTab: 'hotel',
        travelId: travel._id,
        prefillData: {
          cityCode: extractCityCode(travel.destination),
          checkInDate: travel.startDate,
          checkOutDate: travel.endDate,
        },
      },
    });
  }}
>
  预订酒店
</Button>
```

#### 7.6.2 酒店预订页面（Tab 页）

**在机票搜索页面的酒店 Tab 中：**
- 酒店搜索表单（城市、日期、客人、房间）
- 酒店搜索结果列表
- 点击酒店卡片跳转到酒店详情页

**在酒店详情/预订页面：**
- 添加差旅申请选择
- 必填字段：选择关联的差旅申请
- 下拉选择：显示用户的所有可用差旅申请
- 搜索功能：支持按差旅单号搜索
- 自动填充：选择差旅申请后，自动填充搜索条件

#### 7.6.3 预订管理页面

**显示关联信息：**
- 显示关联的差旅申请信息
- 支持从差旅申请跳转到酒店预订
- 支持从酒店预订跳转到差旅申请

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

- 酒店已售罄
- 价格已变更
- 预订失败
- 取消失败（超过取消时限）
- 日期冲突

## 9. 安全考虑

### 9.1 API 密钥管理
- 使用环境变量存储 API Key 和 Secret（复用航班功能的配置）
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

### 10.1 API 连接测试

**测试项目：**
- 配置验证
- OAuth 2.0 认证
- 酒店搜索 API
- 酒店价格确认 API
- 酒店预订 API
- 响应格式验证
- 错误处理验证

### 10.2 单元测试

- Amadeus API 服务层测试
- 控制器测试
- 数据模型验证测试

### 10.3 集成测试

- API 端点集成测试
- 与差旅申请集成测试
- 错误场景测试

### 10.4 端到端测试

- 完整的预订流程测试
- 取消流程测试
- 与差旅申请的完整流程测试

## 11. 部署计划

### 11.1 环境配置

**开发环境：**
- 使用 Amadeus Test Environment（复用航班功能的配置）
- 使用测试 API Key
- Base URL: `https://test.api.amadeus.com`

**生产环境：**
- 使用 Amadeus Production Environment
- 使用生产 API Key
- Base URL: `https://api.amadeus.com`
- 配置监控和告警

### 11.2 依赖安装

```bash
# 无需额外安装依赖，复用现有依赖
# axios 已在项目中安装
# Amadeus API 配置已存在
```

### 11.3 环境变量

复用航班功能的配置：
```env
# Amadeus API 配置（复用）
AMADEUS_API_KEY=your_api_key_here
AMADEUS_API_SECRET=your_api_secret_here
AMADEUS_API_ENV=test  # test 或 production
```

### 11.4 获取 API 密钥和测试

**步骤：**
1. 复用航班功能的 Amadeus API Key 和 Secret
2. 在 Test Environment 中测试酒店相关 API
3. 确认测试通过后，申请 Production Environment 访问权限
4. 生产环境部署前再次测试

## 12. 开发阶段

### 阶段 1: 基础功能（1-2周）
- ✅ 扩展 Amadeus API 服务模块（添加酒店搜索功能）
- ✅ 实现酒店搜索功能
- ✅ 实现价格确认功能
- ✅ 修改机票搜索页面，增加 Tab 页切换功能
- ✅ 实现酒店搜索表单组件
- ✅ 实现酒店列表组件
- ✅ 基础前端页面

### 阶段 2: 预订功能（1-2周）
- ✅ 实现预订创建功能
- ✅ 实现预订管理功能
- ✅ 完善 Tab 页切换逻辑和状态管理
- ✅ 实现从差旅申请页面跳转到酒店 Tab 的功能
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
- [API 目录 - 酒店](https://developers.amadeus.com/self-service/category/hotel)

### 13.2 酒店相关 API 文档

- [Hotel Search API](https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-search)
- [Hotel Offers Search API](https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-offers-search)
- [Hotel Offer Price API](https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-offers-price)
- [Hotel Booking API](https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-booking)
- [Hotel Booking Management API](https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-booking-management)
- [Hotel Name Autocomplete API](https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-name-autocomplete)
- [Hotel Ratings API](https://developers.amadeus.com/self-service/category/hotel/api-doc/hotel-ratings)

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

## 14. API 请求示例

### 14.1 搜索酒店请求示例

```bash
GET https://test.api.amadeus.com/v3/shopping/hotel-offers?cityCode=NYC&checkInDate=2025-12-25&checkOutDate=2025-12-30&adults=1&roomQuantity=1&currencyCode=USD
Authorization: Bearer {access_token}
Accept: application/vnd.amadeus+json
```

### 14.2 价格确认请求示例

```bash
GET https://test.api.amadeus.com/v3/shopping/hotel-offers/{offerId}/price
Authorization: Bearer {access_token}
Accept: application/vnd.amadeus+json
```

### 14.3 创建预订请求示例

```bash
POST https://test.api.amadeus.com/v1/booking/hotel-bookings
Authorization: Bearer {access_token}
Content-Type: application/vnd.amadeus+json
Accept: application/vnd.amadeus+json

{
  "data": {
    "offerId": "ABC123XYZ",
    "guests": [
      {
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
   - 酒店价格可能随时变化
   - 需要在预订前重新确认价格
   - 处理价格变更的情况

3. **预订政策**
   - 不同酒店的取消政策不同
   - 需要明确告知用户取消政策
   - 实现取消时限检查

4. **数据存储**
   - 保存完整的预订信息用于审计
   - 定期同步 Amadeus 订单状态
   - 处理订单状态不一致的情况

5. **与航班功能的区别**
   - 酒店预订不需要乘客出生日期
   - 酒店预订需要入住和退房日期
   - 酒店预订可能需要多个房间
   - 酒店预订可能有不同的取消政策

---

**文档版本**: 1.0  
**创建日期**: 2025-01-06  
**最后更新**: 2025-01-06  
**参考文档**: FLIGHT_BOOKING_DESIGN.md

