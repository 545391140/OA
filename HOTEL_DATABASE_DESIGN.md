# 酒店预订功能数据库设计方案

## 1. 设计概述

### 1.1 设计原则
- **数据完整性**：存储完整的 Amadeus API 返回数据，便于审计和问题排查
- **查询性能**：合理设计索引，支持高频查询场景
- **数据关联**：与现有 Travel 和 FlightBooking 模型保持一致的设计风格
- **扩展性**：预留扩展字段，支持未来功能扩展
- **数据一致性**：使用 MongoDB 事务保证数据一致性

### 1.2 数据模型列表
1. **Hotel** - 酒店基本信息（可选，用于缓存）
2. **HotelBooking** - 酒店预订记录（核心模型）
3. **HotelSearchHistory** - 酒店搜索历史（可选，用于分析）

---

## 2. 数据模型详细设计

### 2.1 Hotel 模型（酒店基本信息缓存）

**用途**：缓存酒店基本信息，减少重复 API 调用，提高查询性能

**设计说明**：
- 可选模型，主要用于缓存常用酒店信息
- 数据来源于 `by-geocode`、`by-city`、`by-hotels` 接口
- 可以设置 TTL 自动过期，或手动更新

**Schema 设计**：

```javascript
const HotelSchema = new mongoose.Schema({
  // Amadeus 酒店ID（唯一标识）
  hotelId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  
  // 酒店名称
  name: {
    type: String,
    required: true,
    trim: true,
    index: 'text', // 全文搜索
  },
  
  // 连锁代码
  chainCode: {
    type: String,
    trim: true,
    index: true,
  },
  
  // IATA 代码
  iataCode: {
    type: String,
    trim: true,
    index: true,
  },
  
  // 重复ID（Amadeus内部使用）
  dupeId: {
    type: Number,
  },
  
  // 地理坐标
  geoCode: {
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
  },
  
  // 地址信息
  address: {
    countryCode: {
      type: String,
      trim: true,
      index: true,
    },
    postalCode: {
      type: String,
      trim: true,
    },
    stateCode: {
      type: String,
      trim: true,
    },
    cityName: {
      type: String,
      trim: true,
      index: true,
    },
    lines: [{
      type: String,
      trim: true,
    }],
  },
  
  // 距离信息（搜索时返回）
  distance: {
    value: Number,
    unit: {
      type: String,
      enum: ['KM', 'MI'],
      default: 'KM',
    },
  },
  
  // 最后更新时间（Amadeus）
  lastUpdate: {
    type: Date,
  },
  
  // 本地缓存过期时间
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }, // TTL索引，自动删除过期数据
    default: function() {
      // 默认7天后过期
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    },
  },
  
  // 使用统计（用于缓存策略）
  accessCount: {
    type: Number,
    default: 0,
  },
  
  lastAccessedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// 索引
HotelSchema.index({ hotelId: 1 }, { unique: true });
HotelSchema.index({ 'geoCode.latitude': 1, 'geoCode.longitude': 1 }); // 地理坐标搜索
HotelSchema.index({ 'address.cityName': 1 }); // 城市搜索
HotelSchema.index({ 'address.countryCode': 1 }); // 国家搜索
HotelSchema.index({ name: 'text' }); // 全文搜索
HotelSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL索引
HotelSchema.index({ lastAccessedAt: -1 }); // 最近访问排序
```

**使用场景**：
- 缓存常用酒店信息，减少 API 调用
- 支持地理坐标和城市搜索
- 支持酒店名称全文搜索
- 自动过期机制，保证数据新鲜度

---

### 2.2 HotelBooking 模型（酒店预订记录）

**用途**：存储酒店预订记录，关联差旅申请，支持预订管理和核销

**设计说明**：
- 核心模型，必须关联差旅申请（travelId）
- 存储完整的 Amadeus API 返回数据
- 支持预订状态管理（pending, confirmed, cancelled, failed）
- 支持价格和取消政策信息

**Schema 设计**：

```javascript
const HotelBookingSchema = new mongoose.Schema({
  // ========== 关联信息 ==========
  
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
  
  // ========== 预订标识 ==========
  
  // 预订参考号（Amadeus返回，用于客户查询）
  bookingReference: {
    type: String,
    trim: true,
    index: true,
  },
  
  // Amadeus 订单ID（唯一标识）
  amadeusBookingId: {
    type: String,
    trim: true,
    index: true,
    sparse: true, // 允许null，但如果有值则唯一
  },
  
  // ========== 酒店信息 ==========
  
  // 酒店基本信息（从报价中提取）
  hotel: {
    hotelId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    chainCode: String,
    iataCode: String,
    cityCode: String,
    geoCode: {
      latitude: Number,
      longitude: Number,
    },
    address: {
      countryCode: String,
      postalCode: String,
      stateCode: String,
      cityName: String,
      lines: [String],
    },
  },
  
  // ========== 入住信息 ==========
  
  // 入住日期
  checkIn: {
    type: Date,
    required: true,
    index: true,
  },
  
  // 退房日期
  checkOut: {
    type: Date,
    required: true,
    index: true,
  },
  
  // 入住天数
  nights: {
    type: Number,
    default: function() {
      if (this.checkIn && this.checkOut) {
        return Math.ceil((this.checkOut - this.checkIn) / (1000 * 60 * 60 * 24));
      }
      return 0;
    },
  },
  
  // ========== 客人信息 ==========
  
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
        countryCallingCode: String,
        number: String,
      }],
    },
  }],
  
  // 成人数量
  adults: {
    type: Number,
    required: true,
    min: 1,
    max: 9,
  },
  
  // 儿童数量
  children: {
    type: Number,
    default: 0,
    min: 0,
  },
  
  // ========== 房间信息 ==========
  
  rooms: [{
    type: {
      type: String,
      trim: true,
    },
    typeEstimated: {
      beds: Number,
      bedType: String, // KING, QUEEN, etc.
    },
    description: {
      text: String,
      lang: String,
    },
    guests: {
      type: Number,
      default: 1,
    },
  }],
  
  // 房间数量
  roomQuantity: {
    type: Number,
    default: 1,
    min: 1,
  },
  
  // ========== 价格信息 ==========
  
  price: {
    total: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      default: 'USD',
      index: true,
    },
    base: {
      type: String,
    },
    taxes: [{
      amount: String,
      code: String,
      type: String,
    }],
    variations: {
      average: {
        base: String,
      },
      changes: [{
        startDate: Date,
        endDate: Date,
        base: String,
      }],
    },
  },
  
  // 价格数值（用于计算和排序）
  priceAmount: {
    type: Number,
    default: function() {
      return parseFloat(this.price?.total || 0);
    },
    index: true,
  },
  
  // ========== 报价信息 ==========
  
  // 报价ID（Amadeus）
  offerId: {
    type: String,
    required: true,
    index: true,
  },
  
  // 报价代码
  rateCode: {
    type: String,
    trim: true,
  },
  
  // 完整报价信息（存储 Amadeus API 返回的完整数据）
  hotelOffer: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  
  // ========== 取消政策 ==========
  
  cancellationPolicy: {
    cancellations: [{
      numberOfNights: Number,
      deadline: Date,
      amount: String,
      policyType: {
        type: String,
        enum: ['CANCELLATION', 'NO_SHOW'],
      },
    }],
    paymentType: {
      type: String,
      enum: ['guarantee', 'deposit', 'prepaid'],
    },
    refundable: {
      cancellationRefund: {
        type: String,
        enum: ['REFUNDABLE_UP_TO_DEADLINE', 'NON_REFUNDABLE', 'UNKNOWN'],
      },
    },
  },
  
  // ========== 预订状态 ==========
  
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'failed'],
    default: 'pending',
    index: true,
  },
  
  // 状态变更历史（用于审计）
  statusHistory: [{
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'failed'],
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    reason: String,
  }],
  
  // ========== 取消信息 ==========
  
  cancellationReason: {
    type: String,
    trim: true,
  },
  
  cancelledAt: {
    type: Date,
    index: true,
  },
  
  cancelledBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
  },
  
  // ========== 其他信息 ==========
  
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
  
  // 确认信息（Amadeus返回）
  confirmation: {
    confirmationNumber: String,
    confirmationCode: String,
    confirmationUrl: String,
  },
  
  // 支付信息（如果已支付）
  payment: {
    method: String,
    transactionId: String,
    paidAt: Date,
    amount: String,
    currency: String,
  },
  
  // 同步状态（与 Amadeus 同步）
  syncStatus: {
    type: String,
    enum: ['synced', 'pending', 'failed'],
    default: 'synced',
  },
  
  lastSyncedAt: {
    type: Date,
  },
  
  syncError: {
    type: String,
  },
}, {
  timestamps: true,
});

// ========== 索引设计 ==========

// 基础查询索引
HotelBookingSchema.index({ travelId: 1, createdAt: -1 }); // 按差旅申请查询
HotelBookingSchema.index({ employee: 1, createdAt: -1 }); // 按员工查询
HotelBookingSchema.index({ status: 1, createdAt: -1 }); // 按状态查询

// 预订标识索引
HotelBookingSchema.index({ bookingReference: 1 }); // 按预订参考号查询
HotelBookingSchema.index({ amadeusBookingId: 1 }, { unique: true, sparse: true }); // Amadeus订单ID唯一

// 日期范围查询索引
HotelBookingSchema.index({ checkIn: 1, checkOut: 1 }); // 按入住日期查询
HotelBookingSchema.index({ checkIn: 1, status: 1 }); // 按入住日期和状态查询

// 酒店查询索引
HotelBookingSchema.index({ 'hotel.hotelId': 1, createdAt: -1 }); // 按酒店ID查询
HotelBookingSchema.index({ 'hotel.cityCode': 1, checkIn: 1 }); // 按城市和日期查询

// 价格查询索引
HotelBookingSchema.index({ priceAmount: 1 }); // 按价格排序
HotelBookingSchema.index({ 'price.currency': 1, priceAmount: 1 }); // 按货币和价格查询

// 复合索引（常用查询组合）
HotelBookingSchema.index({ employee: 1, status: 1, createdAt: -1 }); // 员工+状态+时间
HotelBookingSchema.index({ travelId: 1, status: 1 }); // 差旅申请+状态
HotelBookingSchema.index({ checkIn: 1, checkOut: 1, status: 1 }); // 日期范围+状态

// TTL索引（可选，自动清理过期预订）
// HotelBookingSchema.index({ cancelledAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 }); // 取消后1年删除
```

**使用场景**：
- 存储酒店预订记录
- 关联差旅申请
- 支持预订管理和状态跟踪
- 支持价格和取消政策查询
- 支持核销时查询预订信息

---

### 2.3 HotelSearchHistory 模型（酒店搜索历史）

**用途**：记录用户搜索历史，用于分析和推荐

**设计说明**：
- 可选模型，用于分析用户搜索行为
- 可以设置 TTL 自动过期
- 支持搜索条件分析和推荐

**Schema 设计**：

```javascript
const HotelSearchHistorySchema = new mongoose.Schema({
  // 搜索用户
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // 搜索类型
  searchType: {
    type: String,
    enum: ['geocode', 'city', 'hotels'],
    required: true,
  },
  
  // 搜索参数
  searchParams: {
    // 地理坐标搜索
    latitude: Number,
    longitude: Number,
    radius: Number,
    
    // 城市搜索
    cityCode: String,
    
    // 酒店ID搜索
    hotelIds: [String],
    
    // 通用参数
    hotelSource: {
      type: String,
      enum: ['ALL', 'AMADEUS', 'EXPEDIA'],
    },
  },
  
  // 搜索结果统计
  results: {
    hotelsFound: {
      type: Number,
      default: 0,
    },
    offersFound: {
      type: Number,
      default: 0,
    },
  },
  
  // 搜索时间
  searchedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  
  // 是否最终预订
  booked: {
    type: Boolean,
    default: false,
  },
  
  // 关联的预订ID（如果预订）
  bookingId: {
    type: mongoose.Schema.ObjectId,
    ref: 'HotelBooking',
  },
  
  // 过期时间（TTL）
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 },
    default: function() {
      // 默认90天后过期
      return new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    },
  },
}, {
  timestamps: true,
});

// 索引
HotelSearchHistorySchema.index({ user: 1, searchedAt: -1 }); // 用户搜索历史
HotelSearchHistorySchema.index({ 'searchParams.cityCode': 1, searchedAt: -1 }); // 城市搜索分析
HotelSearchHistorySchema.index({ booked: 1, searchedAt: -1 }); // 预订转化分析
HotelSearchHistorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL索引
```

**使用场景**：
- 记录用户搜索历史
- 分析热门搜索城市和酒店
- 推荐相关酒店
- 分析搜索转化率

---

## 3. 数据关联关系

### 3.1 与 Travel 模型的关联

**关联方式**：
- `HotelBooking.travelId` → `Travel._id` (ObjectId引用)
- `Travel.bookings[]` 数组中包含酒店预订信息

**Travel 模型扩展**（已存在，无需修改）：
```javascript
bookings: [{
  type: 'hotel', // 类型标识
  provider: 'Amadeus',
  bookingReference: String,
  amadeusBookingId: String,
  hotelBookingId: ObjectId, // 关联 HotelBooking._id
  cost: Number,
  currency: String,
  status: String,
  details: {
    hotelName: String,
    checkIn: Date,
    checkOut: Date,
    guests: Number,
    rooms: Number,
  }
}]
```

**关联查询示例**：
```javascript
// 查询差旅申请的所有酒店预订
const bookings = await HotelBooking.find({ travelId: travel._id });

// 查询差旅申请的酒店预订统计
const stats = await HotelBooking.aggregate([
  { $match: { travelId: travel._id } },
  { $group: {
    _id: '$status',
    count: { $sum: 1 },
    totalCost: { $sum: '$priceAmount' }
  }}
]);
```

### 3.2 与 User 模型的关联

**关联方式**：
- `HotelBooking.employee` → `User._id` (ObjectId引用)
- `HotelSearchHistory.user` → `User._id` (ObjectId引用)

**关联查询示例**：
```javascript
// 查询用户的所有酒店预订
const bookings = await HotelBooking.find({ employee: user._id })
  .populate('travelId', 'travelNumber title status');

// 查询用户的搜索历史
const history = await HotelSearchHistory.find({ user: user._id })
  .sort({ searchedAt: -1 })
  .limit(10);
```

### 3.3 与 Hotel 模型的关联（可选）

**关联方式**：
- `HotelBooking.hotel.hotelId` → `Hotel.hotelId` (String引用)

**关联查询示例**：
```javascript
// 查询酒店的预订记录
const bookings = await HotelBooking.find({ 'hotel.hotelId': hotel.hotelId });

// 查询热门酒店（按预订次数）
const popularHotels = await HotelBooking.aggregate([
  { $group: {
    _id: '$hotel.hotelId',
    hotelName: { $first: '$hotel.name' },
    bookingCount: { $sum: 1 },
    totalRevenue: { $sum: '$priceAmount' }
  }},
  { $sort: { bookingCount: -1 } },
  { $limit: 10 }
]);
```

---

## 4. 数据库索引策略

### 4.1 HotelBooking 索引优先级

**高频查询索引**（必须）：
1. `{ travelId: 1, createdAt: -1 }` - 按差旅申请查询预订
2. `{ employee: 1, createdAt: -1 }` - 按员工查询预订
3. `{ bookingReference: 1 }` - 按预订参考号查询
4. `{ status: 1, createdAt: -1 }` - 按状态查询

**中频查询索引**（推荐）：
5. `{ checkIn: 1, checkOut: 1 }` - 按日期范围查询
6. `{ 'hotel.hotelId': 1, createdAt: -1 }` - 按酒店查询
7. `{ 'hotel.cityCode': 1, checkIn: 1 }` - 按城市和日期查询

**低频查询索引**（可选）：
8. `{ priceAmount: 1 }` - 按价格排序
9. `{ cancelledAt: 1 }` - 按取消时间查询

### 4.2 Hotel 索引优先级

**高频查询索引**（必须）：
1. `{ hotelId: 1 }` - 唯一索引
2. `{ 'geoCode.latitude': 1, 'geoCode.longitude': 1 }` - 地理坐标搜索
3. `{ 'address.cityName': 1 }` - 城市搜索

**中频查询索引**（推荐）：
4. `{ name: 'text' }` - 全文搜索
5. `{ expiresAt: 1 }` - TTL索引

### 4.3 索引优化建议

1. **复合索引顺序**：将选择性高的字段放在前面
2. **覆盖索引**：对于只读查询，尽量使用覆盖索引
3. **索引监控**：定期监控索引使用情况，删除未使用的索引
4. **TTL索引**：合理设置过期时间，避免数据无限增长

---

## 5. 数据一致性保证

### 5.1 事务使用场景

**预订创建**：
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // 1. 创建酒店预订
  const booking = await HotelBooking.create([bookingData], { session });
  
  // 2. 更新差旅申请
  travel.bookings.push({
    type: 'hotel',
    hotelBookingId: booking[0]._id,
    cost: booking[0].priceAmount,
    // ...
  });
  travel.estimatedCost += booking[0].priceAmount;
  await travel.save({ session });
  
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

**预订取消**：
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // 1. 更新预订状态
  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  await booking.save({ session });
  
  // 2. 更新差旅申请
  const bookingIndex = travel.bookings.findIndex(
    b => b.hotelBookingId.toString() === booking._id.toString()
  );
  if (bookingIndex !== -1) {
    travel.bookings[bookingIndex].status = 'cancelled';
    travel.estimatedCost = Math.max(0, travel.estimatedCost - booking.priceAmount);
  }
  await travel.save({ session });
  
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

### 5.2 数据验证

**预订创建前验证**：
- 验证差旅申请存在且属于当前用户
- 验证差旅申请状态允许添加预订
- 验证入住日期和退房日期合理性
- 验证价格信息完整性

**预订取消前验证**：
- 验证预订状态允许取消
- 验证取消时限（根据取消政策）
- 验证用户权限

---

## 6. 数据迁移方案

### 6.1 初始数据迁移

**无需迁移**：新功能，无历史数据

### 6.2 索引创建

**创建索引脚本**：
```javascript
// 创建索引（不影响现有数据）
async function createHotelIndexes() {
  await HotelBooking.createIndexes();
  await Hotel.createIndexes();
  await HotelSearchHistory.createIndexes();
}
```

### 6.3 数据清理

**TTL索引自动清理**：
- Hotel 模型：7天后自动删除过期缓存
- HotelSearchHistory 模型：90天后自动删除历史记录

**手动清理脚本**（可选）：
```javascript
// 清理取消超过1年的预订（可选）
async function cleanupOldCancelledBookings() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  await HotelBooking.deleteMany({
    status: 'cancelled',
    cancelledAt: { $lt: oneYearAgo }
  });
}
```

---

## 7. 性能优化建议

### 7.1 查询优化

**使用投影减少数据传输**：
```javascript
// 只查询需要的字段
const bookings = await HotelBooking.find({ travelId })
  .select('hotel.name checkIn checkOut price status')
  .lean(); // 使用lean()提高性能
```

**使用聚合管道优化复杂查询**：
```javascript
// 统计查询使用聚合
const stats = await HotelBooking.aggregate([
  { $match: { travelId } },
  { $group: {
    _id: '$status',
    count: { $sum: 1 },
    totalCost: { $sum: '$priceAmount' }
  }}
]);
```

### 7.2 缓存策略

**Hotel 模型缓存**：
- 缓存常用酒店信息
- 设置7天TTL
- 按访问频率更新

**查询结果缓存**（可选）：
- 使用 Redis 缓存热门查询结果
- 设置合理的过期时间
- 考虑缓存失效策略

### 7.3 分页优化

**使用游标分页**：
```javascript
// 使用游标分页（推荐）
const bookings = await HotelBooking.find({ travelId })
  .sort({ createdAt: -1 })
  .limit(20)
  .skip(cursor);

// 或使用基于ID的分页（更高效）
const bookings = await HotelBooking.find({
  travelId,
  _id: { $lt: lastId }
})
  .sort({ _id: -1 })
  .limit(20);
```

---

## 8. 数据安全考虑

### 8.1 数据访问控制

**用户权限**：
- 用户只能查看和操作自己的预订
- 管理员可以查看所有预订
- 使用中间件验证权限

**数据脱敏**：
- 敏感信息（如支付信息）加密存储
- 日志中不记录敏感信息

### 8.2 数据备份

**备份策略**：
- 定期备份 HotelBooking 数据
- 保留至少30天的备份
- 测试备份恢复流程

---

## 9. 监控和告警

### 9.1 关键指标监控

**数据量监控**：
- HotelBooking 集合大小
- 每日新增预订数量
- 预订状态分布

**性能监控**：
- 查询响应时间
- 索引使用情况
- 慢查询日志

**业务监控**：
- 预订成功率
- 取消率
- 平均预订金额

### 9.2 告警规则

**数据异常告警**：
- 预订创建失败率 > 5%
- 数据同步失败
- 索引使用异常

---

## 10. 总结

### 10.1 核心模型

1. **HotelBooking** - 核心模型，必须实现
2. **Hotel** - 可选模型，用于缓存优化
3. **HotelSearchHistory** - 可选模型，用于分析

### 10.2 关键设计点

1. **数据完整性**：存储完整的 Amadeus API 返回数据
2. **关联关系**：必须关联差旅申请（travelId）
3. **索引优化**：合理设计索引，支持高频查询
4. **事务保证**：使用 MongoDB 事务保证数据一致性
5. **性能优化**：使用缓存、分页、聚合等优化查询性能

### 10.3 实施优先级

**Phase 1（必须）**：
- HotelBooking 模型
- 基础索引
- 与 Travel 模型关联

**Phase 2（推荐）**：
- Hotel 模型缓存
- 高级索引优化
- 搜索历史记录

**Phase 3（可选）**：
- 数据分析和报表
- 高级缓存策略
- 性能监控

---

**文档版本**: 1.0  
**创建日期**: 2025-12-21  
**基于**: Amadeus SDK 测试结果和现有 FlightBooking 模型设计

