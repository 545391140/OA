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

```javascript
// 认证流程
1. 使用 API Key 和 API Secret 获取 Access Token
2. Access Token 有效期：1799秒（约30分钟）
3. 使用 Access Token 调用其他 API
```

### 3.2 使用的 API 端点

| API | 端点 | 用途 |
|-----|------|------|
| Flight Offers Search | `/v2/shopping/flight-offers` | 搜索航班报价 |
| Flight Offers Price | `/v1/shopping/flight-offers/pricing` | 确认航班价格 |
| Flight Create Orders | `/v1/booking/flight-orders` | 创建预订订单 |
| Flight Order Management | `/v1/booking/flight-orders/{id}` | 管理订单（查看、取消） |

### 3.3 API 配置

需要在环境变量中配置：
- `AMADEUS_API_KEY`: Amadeus API Key
- `AMADEUS_API_SECRET`: Amadeus API Secret
- `AMADEUS_API_ENV`: 环境（test/production），默认 test

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

```javascript
/**
 * 获取 Access Token
 * Token 有效期：1799秒，需要缓存并自动刷新
 */
async function getAccessToken() {
  // 1. 检查缓存是否有效
  // 2. 如果无效，调用认证API获取新Token
  // 3. 缓存Token并返回
}

/**
 * 刷新 Access Token
 */
async function refreshAccessToken() {
  // 强制刷新Token
}
```

#### 5.1.2 航班搜索

```javascript
/**
 * 搜索航班报价
 * @param {Object} searchParams - 搜索参数
 * @param {String} searchParams.originLocationCode - 出发机场代码
 * @param {String} searchParams.destinationLocationCode - 到达机场代码
 * @param {String} searchParams.departureDate - 出发日期 (YYYY-MM-DD)
 * @param {String} searchParams.returnDate - 返程日期 (可选)
 * @param {Number} searchParams.adults - 成人数量
 * @param {Number} searchParams.children - 儿童数量（可选）
 * @param {Number} searchParams.infants - 婴儿数量（可选）
 * @param {String} searchParams.travelClass - 舱位等级（ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST）
 * @param {Number} searchParams.max - 最大返回结果数（默认250）
 * @returns {Promise<Array>} 航班报价列表
 */
async function searchFlightOffers(searchParams) {
  // 1. 获取Access Token
  // 2. 调用 Flight Offers Search API
  // 3. 处理响应并返回格式化的航班数据
}
```

#### 5.1.3 价格确认

```javascript
/**
 * 确认航班价格
 * @param {String} offerId - 报价ID
 * @returns {Promise<Object>} 确认后的价格信息
 */
async function confirmFlightPrice(offerId) {
  // 调用 Flight Offers Price API 确认价格
}
```

#### 5.1.4 创建预订

```javascript
/**
 * 创建机票预订
 * @param {Object} bookingData - 预订数据
 * @param {Object} bookingData.flightOffer - 航班报价
 * @param {Array} bookingData.travelers - 乘客信息
 * @returns {Promise<Object>} 预订结果
 */
async function createFlightOrder(bookingData) {
  // 1. 验证数据
  // 2. 调用 Flight Create Orders API
  // 3. 返回预订结果
}
```

#### 5.1.5 订单管理

```javascript
/**
 * 获取订单详情
 * @param {String} orderId - Amadeus订单ID
 * @returns {Promise<Object>} 订单详情
 */
async function getFlightOrder(orderId) {
  // 调用订单查询API
}

/**
 * 取消订单
 * @param {String} orderId - Amadeus订单ID
 * @returns {Promise<Object>} 取消结果
 */
async function cancelFlightOrder(orderId) {
  // 调用订单取消API
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

## 11. 部署计划

### 11.1 环境配置

**开发环境：**
- 使用 Amadeus Test Environment
- 使用测试 API Key

**生产环境：**
- 使用 Amadeus Production Environment
- 使用生产 API Key
- 配置监控和告警

### 11.2 依赖安装

```bash
# 后端需要安装 amadeus SDK（可选，也可以直接使用 axios）
npm install amadeus

# 或者直接使用 axios（推荐，与现有代码风格一致）
# axios 已在项目中安装
```

### 11.3 环境变量

```env
# Amadeus API 配置
AMADEUS_API_KEY=your_api_key
AMADEUS_API_SECRET=your_api_secret
AMADEUS_API_ENV=test  # 或 production
```

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

- [Amadeus for Developers 文档](https://developers.amadeus.com/self-service/apis-docs/guides/developer-guides/)
- [Flight Offers Search API](https://developers.amadeus.com/self-service/category/air/api-doc/flight-offers-search)
- [Flight Create Orders API](https://developers.amadeus.com/self-service/category/air/api-doc/flight-create-orders)
- [Amadeus Node.js SDK](https://github.com/amadeus4dev/amadeus-node)

## 14. 注意事项

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

