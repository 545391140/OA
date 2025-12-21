# 酒店列表 API 端点一致性检查

## 文档中的端点（根据 Amadeus API 文档）

Base URL: `https://test.api.amadeus.com/v1`

### 1. 通过酒店ID搜索
- **端点**: `/reference-data/locations/hotels/by-hotels`
- **方法**: `GET`
- **描述**: Search Hotels using its unique Id

### 2. 通过城市搜索
- **端点**: `/reference-data/locations/hotels/by-city`
- **方法**: `GET`
- **描述**: Search Hotels in a city

### 3. 通过地理坐标搜索
- **端点**: `/reference-data/locations/hotels/by-geocode`
- **方法**: `GET`
- **描述**: Search Hotels using Geocode

## 代码中使用的端点

### SDK 调用方式

#### 1. 通过酒店ID搜索
**文件**: `backend/services/amadeus/hotelSearchSdk.js`
```javascript
const response = await amadeus.referenceData.locations.hotels.byHotels.get({
  hotelIds: hotelIds,
});
```
**SDK 路径**: `referenceData.locations.hotels.byHotels`
**实际端点**: `/v1/reference-data/locations/hotels/by-hotels` ✅

#### 2. 通过城市搜索
**文件**: `backend/services/amadeus/hotelSearchSdk.js`
```javascript
const response = await amadeus.referenceData.locations.hotels.byCity.get({
  cityCode,
  hotelSource,
});
```
**SDK 路径**: `referenceData.locations.hotels.byCity`
**实际端点**: `/v1/reference-data/locations/hotels/by-city` ✅

#### 3. 通过地理坐标搜索
**文件**: `backend/services/amadeus/hotelSearchSdk.js`
```javascript
const response = await amadeus.referenceData.locations.hotels.byGeocode.get({
  latitude: latitude.toString(),
  longitude: longitude.toString(),
  radius: radius.toString(),
  hotelSource,
});
```
**SDK 路径**: `referenceData.locations.hotels.byGeocode`
**实际端点**: `/v1/reference-data/locations/hotels/by-geocode` ✅

### HTTP 直接调用方式

#### 测试脚本中的端点
**文件**: `backend/scripts/testHotelApi.js`

1. **通过地理坐标搜索**:
```javascript
`${baseURL}/v1/reference-data/locations/hotels/by-geocode`
```
✅ 与文档一致

2. **通过城市搜索**:
```javascript
`${baseURL}/v1/reference-data/locations/hotels/by-city`
```
✅ 与文档一致

3. **通过酒店ID搜索**:
```javascript
`${baseURL}/v1/reference-data/locations/hotels/by-hotels`
```
✅ 与文档一致

## 端点映射关系

| 文档端点 | SDK 方法 | HTTP 端点 | 状态 |
|---------|---------|----------|------|
| `/reference-data/locations/hotels/by-hotels` | `referenceData.locations.hotels.byHotels` | `/v1/reference-data/locations/hotels/by-hotels` | ✅ 一致 |
| `/reference-data/locations/hotels/by-city` | `referenceData.locations.hotels.byCity` | `/v1/reference-data/locations/hotels/by-city` | ✅ 一致 |
| `/reference-data/locations/hotels/by-geocode` | `referenceData.locations.hotels.byGeocode` | `/v1/reference-data/locations/hotels/by-geocode` | ✅ 一致 |

## SDK 端点转换规则

Amadeus Node.js SDK 会自动将方法调用转换为 HTTP 端点：

- `referenceData.locations.hotels.byCity` → `/v1/reference-data/locations/hotels/by-city`
- `referenceData.locations.hotels.byGeocode` → `/v1/reference-data/locations/hotels/by-geocode`
- `referenceData.locations.hotels.byHotels` → `/v1/reference-data/locations/hotels/by-hotels`

转换规则：
1. 驼峰命名转换为短横线命名（camelCase → kebab-case）
2. 自动添加版本前缀 `/v1`
3. 路径部分保持不变

## 结论

✅ **所有端点都与文档一致**

- SDK 调用方式正确
- HTTP 直接调用方式正确
- 端点路径完全匹配文档

## 相关文件

- `backend/services/amadeus/hotelSearchSdk.js` - 主要实现文件
- `backend/scripts/testHotelApi.js` - 测试脚本
- `backend/controllers/hotelController.js` - 控制器层

---

**检查时间**: 2025-12-21  
**状态**: ✅ 所有端点一致

