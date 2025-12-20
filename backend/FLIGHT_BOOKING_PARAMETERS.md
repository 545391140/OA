# 机票预订参数完整性检查文档

## 问题总结

**错误**: `FlightBooking validation failed: price.total: Path 'price.total' is required.`

**原因**: Amadeus API 响应结构可能不同，价格信息可能在不同位置。

## 完整流程参数检查

### 1. 航班搜索 (`POST /api/flights/search`)

**前端提交参数**:
```javascript
{
  originLocation: Object | String,      // 位置对象或位置ID
  destinationLocation: Object | String, // 位置对象或位置ID
  departureDate: 'YYYY-MM-DD',         // 必填
  returnDate: 'YYYY-MM-DD',            // 可选（往返航班）
  adults: Number,                       // 必填，1-9
  children: Number,                     // 可选，0-9
  infants: Number,                      // 可选，0-9
  travelClass: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST',
  max: Number,                          // 可选，默认250
  currencyCode: 'USD' | 'CNY' | ...,    // 可选
  nonStop: Boolean                      // 可选
}
```

**后端处理**:
- ✅ 验证必填参数
- ✅ 转换位置为机场代码
- ✅ 调用 Amadeus API: `GET /v2/shopping/flight-offers`

**Amadeus API 返回**:
```javascript
{
  data: [{
    id: String,                          // 必填：报价ID
    price: {
      total: String,                    // 必填：总价
      currency: String,                  // 必填：货币代码
      base: String,                      // 可选：基础价格
      fees: Array                        // 可选：费用明细
    },
    itineraries: Array,                 // 必填：行程信息
    travelerPricings: [{                 // 可选：乘客定价信息
      travelerId: String,                // 可能是数字 "1" 或 "TRAVELER_1"
      fareOption: String,
      travelerType: String,
      price: Object
    }]
  }]
}
```

**✅ 检查点**:
- [x] flightOffer.id 存在
- [x] flightOffer.price.total 存在
- [x] flightOffer.itineraries 存在且非空

---

### 2. 价格确认 (`POST /api/flights/confirm-price`)

**前端提交参数**:
```javascript
{
  flightOffer: Object,                  // 必填：完整的航班报价对象
  travelers: Array                      // 可选：乘客信息（如果提供，用于更新 travelerPricings ID 格式）
}
```

**后端处理**:
- ✅ 验证 flightOffer.id 存在
- ✅ 调用 Amadeus API: `POST /v1/shopping/flight-offers/pricing`
- ✅ 如果提供了 travelers，更新 travelerPricings 中的 travelerId 格式

**Amadeus API 返回**:
```javascript
{
  data: {
    flightOffers: [{
      id: String,
      price: {
        total: String,                  // 必填：确认后的总价
        currency: String,
        base: String,
        fees: Array
      },
      travelerPricings: [{              // 必填：乘客定价信息
        travelerId: String,             // 可能是数字 "1" 或 "TRAVELER_1"
        fareOption: String,
        travelerType: String,
        price: Object
      }]
    }],
    price: {                            // 可选：总价格（可能在 flightOffers[0].price）
      total: String,
      currency: String
    },
    travelerPricings: Array              // 可选：乘客定价信息（可能在 flightOffers[0].travelerPricings）
  }
}
```

**后端修复**:
- ✅ 确保返回的数据包含完整的价格信息
- ✅ 如果 responseData 有 price，合并到 confirmedOffer
- ✅ 如果 responseData 有 travelerPricings，添加到 confirmedOffer

**✅ 检查点**:
- [x] confirmedOffer.price.total 存在
- [x] confirmedOffer.travelerPricings 存在（如果有多名乘客）

---

### 3. 创建预订 (`POST /api/flights/bookings`)

**前端提交参数**:
```javascript
{
  travelId: String,                     // 必填：差旅申请ID
  flightOffer: Object,                  // 必填：航班报价（确认价格后的）
  travelers: [{                          // 必填：乘客信息数组
    id: String,                         // 必填：乘客ID（如 "TRAVELER_1"）
    dateOfBirth: 'YYYY-MM-DD',          // 必填：出生日期
    name: {
      firstName: String,                // 必填：名字（英文/拼音）
      lastName: String                  // 必填：姓氏（英文/拼音）
    },
    contact: {
      emailAddress: String,             // 必填：邮箱
      phones: [{                         // 必填：电话数组
        deviceType: 'MOBILE' | 'LANDLINE',
        countryCallingCode: String,      // 必填：国家代码（如 "+86" 或 "86"）
        number: String                   // 必填：电话号码
      }]
    }
  }]
}
```

**后端验证**:
- ✅ travelId 必填
- ✅ flightOffer.id 必填
- ✅ flightOffer.itineraries 必填且非空
- ✅ flightOffer.price.total 必填
- ✅ travelers 必填且非空数组
- ✅ 每个 traveler 的 id、dateOfBirth、name、contact 必填
- ✅ 日期格式验证（YYYY-MM-DD）
- ✅ 邮箱格式验证
- ✅ 电话号码格式验证
- ✅ travelers 与 flightOffer.travelerPricings 匹配验证

**后端规范化**:
- ✅ 姓名规范化（去除特殊字符，转大写）
- ✅ 邮箱规范化（转小写，去除空格）
- ✅ 电话号码规范化（countryCallingCode 去除 + 号，转为纯数字）

**后端调用 Amadeus API**: `POST /v1/booking/flight-orders`

**Amadeus API 返回**:
```javascript
{
  data: {
    type: 'flight-order',
    id: String,                         // 必填：订单ID
    associatedRecords: {
      airline: {
        reference: String               // 可选：预订参考号
      }
    },
    flightOffers: [{                    // 必填：航班报价
      id: String,
      price: {
        total: String,                  // 可能在这里
        currency: String,
        base: String,
        fees: Array
      }
    }],
    travelers: Array,                    // 必填：乘客信息
    price: {                            // 可能在这里（标准位置）
      total: String,                    // 必填：总价
      currency: String,
      base: String,
      fees: Array
    }
  }
}
```

**后端价格提取逻辑（已修复）**:
```javascript
// 位置1: bookingResult.data.price（标准位置）
if (bookingResult.data?.price?.total) {
  priceData = bookingResult.data.price;
}
// 位置2: bookingResult.data.flightOffers[0].price（备用位置）
else if (bookingResult.data?.flightOffers?.[0]?.price?.total) {
  priceData = bookingResult.data.flightOffers[0].price;
}
// 位置3: 使用提交的 flightOffer 中的价格（最后备用）
else if (flightOffer?.price?.total) {
  priceData = flightOffer.price;
}
```

**✅ 检查点**:
- [x] bookingResult.data.id 存在
- [x] bookingResult.data.flightOffers[0] 存在
- [x] bookingResult.data.travelers 存在
- [x] priceData.total 存在（从多个位置获取）
- [x] priceData.currency 存在（默认 'USD'）

---

## 已修复的问题

### 1. 价格信息缺失
**问题**: `price.total` 在 Amadeus API 响应中可能在不同位置
**修复**: 添加了多位置价格提取逻辑，支持：
- `bookingResult.data.price.total`（标准位置）
- `bookingResult.data.flightOffers[0].price.total`（备用位置）
- `flightOffer.price.total`（最后备用）

### 2. 乘客ID不匹配
**问题**: travelers ID 与 travelerPricings 不匹配
**修复**: 
- 在确认价格时传入 travelers 信息
- 更新 travelerPricings 中的 travelerId 格式（数字 → TRAVELER_X）
- 在预订时支持多种ID格式匹配

### 3. 电话号码格式
**问题**: countryCallingCode 格式无效（包含 + 号）
**修复**: 自动去除 + 号，转换为纯数字格式

### 4. 数据验证不完整
**问题**: 缺少对关键字段的验证
**修复**: 添加了完整的数据验证，包括：
- flightOffer 结构验证
- travelers 结构验证
- 日期格式验证
- 邮箱格式验证
- 电话号码格式验证

---

## 参数传递流程图

```
前端搜索
  ↓
提交: { originLocation, destinationLocation, departureDate, adults, ... }
  ↓
后端搜索 API
  ↓
返回: { data: [{ id, price: { total, currency }, itineraries, ... }] }
  ↓
前端选择航班
  ↓
前端确认价格（传入 travelers）
  ↓
提交: { flightOffer, travelers }
  ↓
后端确认价格 API
  ↓
返回: { data: { price: { total }, travelerPricings: [...] } }
  ↓
前端填写乘客信息
  ↓
前端提交预订
  ↓
提交: { travelId, flightOffer, travelers }
  ↓
后端验证和规范化
  ↓
后端调用 Amadeus 创建订单
  ↓
Amadeus 返回: { data: { id, price: { total }, flightOffers: [...], travelers: [...] } }
  ↓
后端提取价格（多位置查找）
  ↓
保存到数据库: { price: { total, currency, base, fees } }
```

---

## 测试建议

1. **测试价格提取**:
   - 测试标准位置（data.price）
   - 测试备用位置（flightOffers[0].price）
   - 测试最后备用（使用提交的 flightOffer.price）

2. **测试乘客ID匹配**:
   - 测试数字ID（1, 2, 3...）
   - 测试 TRAVELER_X 格式（TRAVELER_1, TRAVELER_2...）
   - 测试混合格式

3. **测试数据验证**:
   - 测试缺少必填字段的情况
   - 测试格式错误的情况
   - 测试边界情况

---

## 关键修复代码位置

1. **价格提取逻辑**: `backend/controllers/flightController.js` 第592-618行
2. **价格确认增强**: `backend/services/amadeus/flightSearch.js` 第160-197行
3. **乘客ID匹配**: `backend/controllers/flightController.js` 第365-427行
4. **电话号码规范化**: `backend/controllers/flightController.js` 第493-508行

