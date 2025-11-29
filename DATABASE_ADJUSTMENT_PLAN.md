# 数据库结构调整方案

## 一、当前状态分析

### 1.1 携程API返回的数据字段

**省份数据：**
- `provinceId` (Long) - 省份ID
- `provinceName` (String) - 省份中文名
- `provinceEnName` (String) - 省份英文名

**城市数据：**
- `cityId` (Long) - 城市ID
- `cityName` (String) - 城市中文名
- `cityEnName` (String) - 城市英文名
- `cityCode` (String) - 城市代码（行政区划代码）
- `cityPinYin` (String) - 城市拼音
- `districtCode` (String) - 行政区划代码
- `corpTag` (Short) - 0:标准城市, 1:非标城市（仅用于机票预订）

**机场数据：**
- `airportCode` (String) - 机场三字码
- `airportName` (String) - 机场中文名
- `airportEnName` (String) - 机场英文名
- `airportTypeList` (List<String>) - 机场类型列表（1:通用机场, 2:无效废弃, 3:火车站/停机坪, 4:军用机场）
- `airportBuildingList` (List) - 航站楼列表

**火车站数据：**
- `trainCode` (String) - 火车站三字码
- `trainName` (String) - 火车站中文名
- `trainEnName` (String) - 火车站英文名

**汽车站数据：**
- `busName` (String) - 汽车站中文名
- `busPinYinName` (String) - 汽车站名称拼音

**县级市数据：**
- `countyId` (Long) - 县级市ID
- `countyName` (String) - 县级市中文名
- `countyEnName` (String) - 县级市英文名
- `countyCode` (String) - 县级市代码
- `countyPinyin` (String) - 县级市拼音
- `corpTag` (Short) - 0:标准城市, 1:非标城市

**行政区数据：**
- `districtId` (Long) - 行政区ID
- `districtName` (String) - 行政区名称
- `districtEnName` (String) - 行政区英文名称

### 1.2 当前数据库模型字段

**基础字段：**
- `name`, `code`, `type`, `status`
- `city`, `province`, `district`, `county`, `country`, `countryCode`
- `enName`, `pinyin`
- `coordinates`, `timezone`
- `parentId`, `continentId`

**城市特有字段：**
- `cityLevel` (1-4)
- `riskLevel` (low/medium/high/very_high)
- `noAirport` (Boolean)
- `remark` (String)

## 二、不匹配问题分析

### 2.1 缺失的字段（携程API有，数据库没有）

1. **ID字段**
   - `cityId` - 携程城市ID
   - `provinceId` - 携程省份ID
   - `countyId` - 携程县级市ID
   - `districtId` - 携程行政区ID
   - **影响**：无法与携程API数据建立唯一关联，增量更新困难

2. **非标城市标识**
   - `corpTag` - 标识是否为非标城市（仅用于机票预订）
   - **影响**：当前存储在remark中，不利于查询和过滤

3. **机场详细信息**
   - `airportTypeList` - 机场类型列表（当前存储在remark的JSON中）
   - `airportBuildingList` - 航站楼列表（当前存储在remark的JSON中）
   - **影响**：无法直接查询机场类型，需要解析JSON

4. **行政区划代码**
   - `districtCode` - 行政区划代码（如：320600）
   - **影响**：无法直接使用行政区划代码查询

### 2.2 数据完整性问题

1. **坐标数据**
   - 携程API可能不提供精确坐标
   - 当前使用默认值 `{latitude: 0, longitude: 0}`
   - **影响**：无法进行地理位置相关功能

2. **城市等级**
   - 携程API不提供城市等级（1-4线）
   - 当前使用默认值 4
   - **影响**：差旅标准匹配可能不准确

3. **风险等级**
   - 携程API不提供风险等级
   - 当前使用默认值 'low'
   - **影响**：无法进行风险等级筛选

## 三、调整方案

### 方案一：最小调整方案（推荐）⭐

**只添加必要的ID字段，保持现有结构**

#### 3.1.1 新增字段

```javascript
// 携程API的ID字段（用于增量更新和关联）
ctripCityId: {
  type: Number,  // Long类型在MongoDB中用Number
  index: true
},
ctripProvinceId: {
  type: Number,
  index: true
},
ctripCountyId: {
  type: Number,
  index: true
},
ctripDistrictId: {
  type: Number,
  index: true
},

// 非标城市标识（从remark中提取）
corpTag: {
  type: Number,
  enum: [0, 1],  // 0:标准城市, 1:非标城市
  default: 0
},

// 行政区划代码
districtCode: {
  type: String,
  index: true,
  trim: true
}
```

#### 3.1.2 索引优化

```javascript
// 添加复合索引用于增量更新
LocationSchema.index({ ctripCityId: 1, type: 1 });
LocationSchema.index({ corpTag: 1, type: 1 });
LocationSchema.index({ districtCode: 1 });
```

#### 3.1.3 优点
- ✅ 改动最小，风险低
- ✅ 支持增量更新
- ✅ 支持非标城市过滤
- ✅ 保持向后兼容

#### 3.1.4 缺点
- ❌ 机场详细信息仍存储在remark中
- ❌ 坐标数据仍为默认值

---

### 方案二：完整调整方案

**添加所有携程API字段，优化数据结构**

#### 3.2.1 新增字段

```javascript
// 携程ID字段
ctripCityId: Number,
ctripProvinceId: Number,
ctripCountyId: Number,
ctripDistrictId: Number,

// 非标城市标识
corpTag: {
  type: Number,
  enum: [0, 1],
  default: 0
},

// 行政区划代码
districtCode: String,

// 机场详细信息（结构化存储）
airportInfo: {
  airportTypes: [String],  // 机场类型列表
  buildings: [{  // 航站楼列表
    buildingId: Number,
    buildingName: String,
    buildingEnName: String,
    shortName: String,
    shortNameEN: String,
    smsName: String
  }]
}
```

#### 3.2.2 数据源字段

```javascript
// 数据来源标识
dataSource: {
  type: String,
  enum: ['ctrip', 'manual', 'other'],
  default: 'ctrip'
},

// 数据同步时间
syncedAt: Date,

// 数据版本（用于追踪数据变更）
dataVersion: String
```

#### 3.2.3 优点
- ✅ 完整保留携程API数据
- ✅ 支持结构化查询机场信息
- ✅ 支持数据版本管理
- ✅ 支持多数据源

#### 3.2.4 缺点
- ❌ 改动较大，需要数据迁移
- ❌ 增加存储空间
- ❌ 需要更新所有相关代码

---

### 方案三：混合方案（平衡）

**添加关键字段，其他数据保持现状**

#### 3.3.1 新增字段

```javascript
// 携程ID（必须）
ctripCityId: Number,
ctripProvinceId: Number,
ctripCountyId: Number,
ctripDistrictId: Number,

// 非标城市标识（必须）
corpTag: {
  type: Number,
  enum: [0, 1],
  default: 0
},

// 行政区划代码（推荐）
districtCode: String,

// 数据同步元数据
metadata: {
  syncedAt: Date,
  dataSource: String,  // 'ctrip'
  apiVersion: String   // API版本号
}
```

#### 3.3.2 保持现状
- 机场详细信息继续存储在 `remark` 中（JSON格式）
- 坐标数据保持默认值，后续可通过其他API补充

#### 3.3.3 优点
- ✅ 平衡了功能需求和改动成本
- ✅ 支持增量更新
- ✅ 支持非标城市过滤
- ✅ 改动适中

---

## 四、推荐方案

### 推荐：方案一（最小调整方案）

**理由：**
1. 改动最小，风险可控
2. 满足核心需求：增量更新、非标城市过滤
3. 向后兼容，不影响现有功能
4. 后续可根据需要逐步扩展

### 实施步骤

1. **第一步：添加字段**
   ```javascript
   // 在Location模型中添加
   ctripCityId: Number,
   ctripProvinceId: Number,
   ctripCountyId: Number,
   ctripDistrictId: Number,
   corpTag: { type: Number, enum: [0, 1], default: 0 },
   districtCode: String
   ```

2. **第二步：更新同步脚本**
   - 在转换数据时填充这些字段
   - 从 `remark` 中提取 `corpTag` 信息

3. **第三步：添加索引**
   - 为新增字段添加索引
   - 优化查询性能

4. **第四步：数据迁移（可选）**
   - 如果已有数据，运行迁移脚本填充新字段
   - 从现有数据中提取可用信息

## 五、后续优化建议

### 5.1 坐标数据补充
- 通过第三方地理编码API（如高德、百度）补充坐标数据
- 或使用携程其他API获取坐标信息

### 5.2 城市等级自动识别
- 建立城市等级规则库
- 根据城市名称、GDP等指标自动判断城市等级

### 5.3 风险等级管理
- 建立风险等级管理功能
- 支持手动设置和自动更新

### 5.4 增量更新机制
- 使用 `startDate` 参数定期同步增量数据
- 处理失效数据（`invalidGeoList`）

## 六、风险评估

### 6.1 方案一风险
- **低风险**：只添加可选字段，不影响现有数据
- **迁移成本**：低（可选，新数据自动填充）

### 6.2 方案二风险
- **中高风险**：需要数据迁移和代码更新
- **迁移成本**：高（需要迁移脚本和测试）

### 6.3 方案三风险
- **低中风险**：改动适中，需要测试
- **迁移成本**：中（需要部分迁移）

## 七、总结

**建议采用方案一（最小调整方案）**，原因：
1. ✅ 满足核心需求（增量更新、非标城市过滤）
2. ✅ 改动最小，风险可控
3. ✅ 向后兼容
4. ✅ 后续可扩展

**如果未来需要更完整的数据结构，可以逐步迁移到方案二或方案三。**

