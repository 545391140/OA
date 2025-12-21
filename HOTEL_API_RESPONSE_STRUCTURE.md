# 酒店列表接口返回数据结构文档

## 接口说明

酒店列表接口主要有以下几个：

1. **搜索酒店报价** - `POST /api/hotels/search-offers`（最常用，返回包含报价的酒店列表）
2. **通过地理坐标搜索酒店** - `POST /api/hotels/search-by-geocode`
3. **通过城市搜索酒店** - `POST /api/hotels/search-by-city`
4. **通过酒店ID搜索酒店** - `POST /api/hotels/search-by-hotels`

## 接口响应格式

### 统一响应格式

```json
{
  "success": true,
  "data": [
    // 酒店对象数组
  ],
  "meta": {
    "count": 10,
    "links": {
      "self": "https://api.amadeus.com/v3/shopping/hotel-offers?..."
    }
  },
  "count": 10
}
```

## 单个酒店完整数据结构

以下是一个酒店对象的完整数据结构（来自 `/api/hotels/search-offers` 接口）：

```json
{
  "hotel": {
    "hotelId": "RTPAR001",                    // 酒店ID（Amadeus唯一标识）
    "name": "Grand Hotel Paris",              // 酒店名称
    "chainCode": "RT",                        // 连锁代码（可选）
    "iataCode": "PAR",                        // IATA城市代码（可选）
    "cityCode": "PAR",                        // 城市代码
    "dupeId": "700012345",                    // 重复ID（可选）
    "geoCode": {                              // 地理坐标
      "latitude": 48.8566,                    // 纬度
      "longitude": 2.3522                     // 经度
    },
    "address": {                              // 地址信息
      "lines": [                              // 地址行数组
        "123 Avenue des Champs-Élysées",
        "Floor 5"
      ],
      "cityName": "Paris",                    // 城市名称
      "countryCode": "FR",                    // 国家代码（ISO 3166-1 alpha-2）
      "postalCode": "75008",                  // 邮政编码
      "stateCode": "IDF",                     // 州/省代码（可选）
      "region": "Île-de-France"               // 地区名称（可选）
    },
    "amenities": [                            // 设施列表（可选）
      "PARKING",
      "WIFI",
      "POOL",
      "GYM",
      "RESTAURANT"
    ],
    "rating": 4.5,                            // 评分（1-5，可选）
    "description": {                          // 酒店描述（可选）
      "lang": "en",                           // 语言代码
      "text": "A luxurious hotel in the heart of Paris..."  // 描述文本
    },
    "contact": {                              // 联系方式（可选）
      "phone": "+33-1-23-45-67-89",          // 电话
      "fax": "+33-1-23-45-67-90",           // 传真（可选）
      "email": "info@grandhotelparis.com"    // 邮箱（可选）
    },
    "media": [                                // 媒体资源（可选）
      {
        "uri": "https://example.com/hotel-image.jpg",
        "category": "EXTERIOR"
      }
    ]
  },
  "offers": [                                 // 报价数组（至少包含一个报价）
    {
      "id": "OFFER123456789",                 // 报价ID（用于价格确认和预订）
      "checkInDate": "2024-12-20",            // 入住日期（YYYY-MM-DD）
      "checkOutDate": "2024-12-22",           // 退房日期（YYYY-MM-DD）
      "room": {                               // 房间信息
        "type": "STANDARD_ROOM",              // 房间类型代码
        "typeEstimated": {                    // 房间类型估算信息
          "category": "STANDARD_ROOM",        // 房间类别
          "beds": 1,                          // 床数
          "bedType": "DOUBLE"                 // 床型（SINGLE, DOUBLE, QUEEN, KING等）
        },
        "description": {                      // 房间描述
          "lang": "en",
          "text": "Standard room with city view"
        }
      },
      "guests": {                             // 客人信息
        "adults": 2,                          // 成人数量
        "children": 0                         // 儿童数量（可选）
      },
      "price": {                              // 价格信息
        "currency": "USD",                     // 货币代码（ISO 4217）
        "total": "500.00",                    // 总价（字符串格式）
        "base": "450.00",                     // 基础价格（不含税费，可选）
        "taxes": [                            // 税费明细（可选）
          {
            "code": "CITY_TAX",
            "amount": "10.00",
            "currency": "USD",
            "included": false                 // 是否已包含在总价中
          },
          {
            "code": "VAT",
            "amount": "40.00",
            "currency": "USD",
            "included": true
          }
        ],
        "variations": {                        // 价格变化（可选）
          "average": {                         // 平均价格
            "base": "450.00",
            "total": "500.00"
          },
          "changes": [                         // 价格变化列表
            {
              "startDate": "2024-12-20",
              "endDate": "2024-12-21",
              "total": "250.00"
            }
          ]
        }
      },
      "policies": {                           // 政策信息
        "paymentType": "GUARANTEE",           // 支付类型（GUARANTEE, DEPOSIT, PAY_AT_HOTEL）
        "cancellation": {                     // 取消政策
          "type": "FREE_CANCELLATION",        // 取消类型（FREE_CANCELLATION, NON_REFUNDABLE, PARTIAL_REFUND等）
          "amount": "0.00",                   // 取消费用
          "currency": "USD",
          "numberOfNights": 0,                // 免费取消的夜数
          "deadline": "2024-12-19T18:00:00"  // 免费取消截止时间（可选）
        },
        "deposit": {                          // 押金政策（可选）
          "amount": "100.00",
          "currency": "USD",
          "acceptedPayments": ["CREDIT_CARD"]
        },
        "checkInOut": {                       // 入住/退房政策（可选）
          "checkIn": "15:00",
          "checkOut": "11:00"
        },
        "holdTime": {                         // 保留时间（可选）
          "deadline": "2024-12-19T18:00:00"
        },
        "prepay": false,                      // 是否预付
        "refundable": true                    // 是否可退款
      },
      "self": "https://api.amadeus.com/v3/shopping/hotel-offers/OFFER123456789",  // 报价资源链接
      "rateCode": "BAR",                      // 价格代码（BAR, CORP等，可选）
      "rateFamilyEstimated": {                // 价格系列估算（可选）
        "code": "PRO",
        "type": "P"
      },
      "commission": {                         // 佣金信息（可选）
        "percentage": "10.00",
        "amount": "50.00",
        "currency": "USD"
      },
      "boardType": "ROOM_ONLY",               // 餐食类型（ROOM_ONLY, BREAKFAST, HALF_BOARD, FULL_BOARD等，可选）
      "roomQuantity": 1,                      // 房间数量
      "category": "STANDARD"                   // 报价类别（可选）
    }
    // 可能有多个报价对象
  ],
  "self": "https://api.amadeus.com/v3/shopping/hotel-offers?hotelIds=RTPAR001&checkInDate=2024-12-20&checkOutDate=2024-12-22"  // 酒店资源链接（可选）
}
```

## 字段说明

### hotel 对象（酒店基本信息）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `hotelId` | String | 是 | Amadeus酒店唯一标识符 |
| `name` | String | 是 | 酒店名称 |
| `chainCode` | String | 否 | 酒店连锁代码 |
| `iataCode` | String | 否 | IATA城市代码 |
| `cityCode` | String | 是 | 城市代码（IATA格式） |
| `dupeId` | String | 否 | 重复ID |
| `geoCode` | Object | 否 | 地理坐标 |
| `geoCode.latitude` | Number | 否 | 纬度 |
| `geoCode.longitude` | Number | 否 | 经度 |
| `address` | Object | 否 | 地址信息 |
| `address.lines` | Array[String] | 否 | 地址行数组 |
| `address.cityName` | String | 否 | 城市名称 |
| `address.countryCode` | String | 否 | 国家代码（ISO 3166-1 alpha-2） |
| `address.postalCode` | String | 否 | 邮政编码 |
| `address.stateCode` | String | 否 | 州/省代码 |
| `address.region` | String | 否 | 地区名称 |
| `amenities` | Array[String] | 否 | 设施列表 |
| `rating` | Number | 否 | 评分（1-5） |
| `description` | Object | 否 | 酒店描述 |
| `description.lang` | String | 否 | 语言代码 |
| `description.text` | String | 否 | 描述文本 |
| `contact` | Object | 否 | 联系方式 |
| `contact.phone` | String | 否 | 电话 |
| `contact.fax` | String | 否 | 传真 |
| `contact.email` | String | 否 | 邮箱 |
| `media` | Array[Object] | 否 | 媒体资源（图片等） |

### offers 数组（报价信息）

每个报价对象包含以下字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | String | 是 | 报价ID（用于价格确认和预订） |
| `checkInDate` | String | 是 | 入住日期（YYYY-MM-DD） |
| `checkOutDate` | String | 是 | 退房日期（YYYY-MM-DD） |
| `room` | Object | 是 | 房间信息 |
| `room.type` | String | 是 | 房间类型代码 |
| `room.typeEstimated` | Object | 否 | 房间类型估算信息 |
| `room.typeEstimated.category` | String | 否 | 房间类别 |
| `room.typeEstimated.beds` | Number | 否 | 床数 |
| `room.typeEstimated.bedType` | String | 否 | 床型 |
| `room.description` | Object | 否 | 房间描述 |
| `guests` | Object | 是 | 客人信息 |
| `guests.adults` | Number | 是 | 成人数量（1-9） |
| `guests.children` | Number | 否 | 儿童数量 |
| `price` | Object | 是 | 价格信息 |
| `price.currency` | String | 是 | 货币代码（ISO 4217） |
| `price.total` | String | 是 | 总价（字符串格式） |
| `price.base` | String | 否 | 基础价格（不含税费） |
| `price.taxes` | Array[Object] | 否 | 税费明细 |
| `price.variations` | Object | 否 | 价格变化 |
| `policies` | Object | 是 | 政策信息 |
| `policies.paymentType` | String | 是 | 支付类型 |
| `policies.cancellation` | Object | 否 | 取消政策 |
| `policies.cancellation.type` | String | 否 | 取消类型 |
| `policies.cancellation.amount` | String | 否 | 取消费用 |
| `policies.cancellation.currency` | String | 否 | 货币代码 |
| `policies.cancellation.numberOfNights` | Number | 否 | 免费取消的夜数 |
| `policies.cancellation.deadline` | String | 否 | 免费取消截止时间 |
| `policies.deposit` | Object | 否 | 押金政策 |
| `policies.checkInOut` | Object | 否 | 入住/退房政策 |
| `policies.holdTime` | Object | 否 | 保留时间 |
| `policies.prepay` | Boolean | 否 | 是否预付 |
| `policies.refundable` | Boolean | 否 | 是否可退款 |
| `self` | String | 否 | 报价资源链接 |
| `rateCode` | String | 否 | 价格代码 |
| `rateFamilyEstimated` | Object | 否 | 价格系列估算 |
| `commission` | Object | 否 | 佣金信息 |
| `boardType` | String | 否 | 餐食类型 |
| `roomQuantity` | Number | 是 | 房间数量 |
| `category` | String | 否 | 报价类别 |

## 其他接口返回格式

### 1. 通过地理坐标/城市/酒店ID搜索酒店

这些接口返回的酒店对象结构较简单，不包含 `offers` 数组：

```json
{
  "hotelId": "RTPAR001",
  "name": "Grand Hotel Paris",
  "chainCode": "RT",
  "iataCode": "PAR",
  "cityCode": "PAR",
  "geoCode": {
    "latitude": 48.8566,
    "longitude": 2.3522
  },
  "address": {
    "lines": ["123 Avenue des Champs-Élysées"],
    "cityName": "Paris",
    "countryCode": "FR",
    "postalCode": "75008"
  }
}
```

### 2. 价格确认接口返回

价格确认接口 (`POST /api/hotels/confirm-price`) 返回的数据结构与报价搜索类似，但价格信息会更详细和准确。

## 注意事项

1. **报价ID (`offer.id`)**：用于后续的价格确认和预订操作，必须保存。
2. **价格格式**：价格字段（`total`, `base`等）都是字符串格式，需要转换为数字进行计算。
3. **日期格式**：所有日期字段使用 `YYYY-MM-DD` 格式。
4. **货币代码**：使用 ISO 4217 标准（如 USD, EUR, CNY）。
5. **可选字段**：很多字段是可选的，前端需要做空值检查。
6. **多个报价**：一个酒店可能有多个报价（不同房型、不同价格政策），通常取第一个或按价格排序。
7. **取消政策**：`policies.cancellation.type` 可能的值：
   - `FREE_CANCELLATION` - 免费取消
   - `NON_REFUNDABLE` - 不可退款
   - `PARTIAL_REFUND` - 部分退款

## 示例：前端使用

```javascript
// 从接口响应中提取酒店信息
const hotel = response.data[0];
const hotelInfo = hotel.hotel;
const offer = hotel.offers[0];

// 获取基本信息
const hotelId = hotelInfo.hotelId;
const hotelName = hotelInfo.name;
const rating = hotelInfo.rating || 0;
const address = hotelInfo.address?.lines?.[0] || '';

// 获取价格信息
const price = parseFloat(offer.price.total);
const currency = offer.price.currency;

// 获取房间信息
const beds = offer.room.typeEstimated?.beds || 1;
const bedType = offer.room.typeEstimated?.bedType || '';

// 获取取消政策
const cancellationType = offer.policies.cancellation?.type;
const isFreeCancellation = cancellationType === 'FREE_CANCELLATION';

// 获取报价ID（用于预订）
const offerId = offer.id;
```

## 相关接口

- **搜索酒店报价**：`POST /api/hotels/search-offers`
- **确认价格**：`POST /api/hotels/confirm-price`
- **创建预订**：`POST /api/hotels/bookings`
- **获取酒店评分**：`GET /api/hotels/ratings?hotelIds=xxx`

