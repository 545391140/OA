# 携程商旅API集成文档

## 概述

本项目已集成携程商旅开放平台的标准地理信息API，用于获取国家、城市、机场、火车站、汽车站等地理位置数据。

**API文档地址**: https://openapi.ctripbiz.com/#/

## 架构设计

### 后端代理架构

由于浏览器CORS限制，前端无法直接调用携程API。因此采用后端代理架构：

```
前端 → 后端API代理 → 携程商旅API
```

### 文件结构

```
backend/
├── services/
│   └── ctripApiService.js      # 携程API服务（核心逻辑）
├── controllers/
│   └── ctripApiController.js   # API控制器
├── routes/
│   └── ctripApi.js             # API路由
└── config.js                    # 配置文件（添加携程API配置）

frontend/
└── src/
    └── services/
        └── locationService.js   # 前端服务（调用后端API）
```

## 配置说明

### 环境变量配置

在 `.env` 文件中添加以下配置：

```bash
# 携程商旅API配置
CTRIP_APP_KEY=your_app_key_here
CTRIP_APP_SECURITY=your_app_security_here
```

### 配置文件

配置已添加到 `backend/config.js`：

```javascript
// 携程商旅API配置
CTRIP_APP_KEY: process.env.CTRIP_APP_KEY || '',
CTRIP_APP_SECURITY: process.env.CTRIP_APP_SECURITY || ''
```

## API端点

### 后端API端点

所有端点都需要认证（JWT Token），部分端点需要管理员或财务权限。

#### 1. 获取Ticket

```
GET /api/ctrip/ticket
权限: Admin/Finance
```

返回示例：
```json
{
  "success": true,
  "data": {
    "ticket": "ticket_string",
    "expiresIn": 7200
  }
}
```

#### 2. 获取全量国家数据

```
GET /api/ctrip/countries?locale=zh-CN
权限: 所有认证用户
```

返回示例：
```json
{
  "success": true,
  "count": 200,
  "data": [
    {
      "countryId": 1,
      "name": "中国",
      "enName": "China",
      "code": "CN",
      "continentId": 3
    }
  ]
}
```

#### 3. 获取全量标准地理信息数据（POI）

```
POST /api/ctrip/poi
权限: 所有认证用户
```

请求体：
```json
{
  "countryId": 1,
  "provinceIds": "",
  "provinceNames": "",
  "prefectureLevelCityIds": "",
  "prefectureLevelCityNames": "",
  "returnDistrict": true,
  "returnCounty": true,
  "returnAirport": true,
  "returnTrainStation": true,
  "returnBusStation": true,
  "startDate": "2025-10-01"  // 可选，增量查询
}
```

#### 4. 获取POI数据并转换为Location格式

```
POST /api/ctrip/poi/locations
权限: 所有认证用户
```

请求体同上，返回格式化的Location数据，可直接用于系统的Location模型。

## 使用示例

### 前端使用

```javascript
import { getAllCountries, getAllPOIInfo } from '../services/locationService';

// 获取所有国家
const countries = await getAllCountries();

// 获取中国的地理信息（城市、机场、火车站等）
const locations = await getAllPOIInfo(1); // 1是中国countryId
```

### 后端使用

```javascript
const ctripApiService = require('./services/ctripApiService');

// 获取国家数据
const countries = await ctripApiService.getAllCountries('zh-CN');

// 获取POI数据
const poiData = await ctripApiService.getAllPOIInfo({
  countryId: 1,
  returnAirport: true,
  returnTrainStation: true,
  returnBusStation: true,
});

// 转换为Location格式
const locations = ctripApiService.convertPOIToLocations(poiData);
```

## 数据同步

### 手动同步

可以通过API端点手动触发数据同步：

```bash
# 获取中国的地理信息
curl -X POST http://localhost:3001/api/ctrip/poi/locations \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "countryId": 1,
    "returnAirport": true,
    "returnTrainStation": true,
    "returnBusStation": true
  }'
```

### 增量同步

使用 `startDate` 参数进行增量同步：

```javascript
// 获取最近15天内更新的数据
const startDate = '2025-10-15'; // 格式：yyyy-MM-dd
const poiData = await ctripApiService.getAllPOIInfo({
  countryId: 1,
  startDate,
});
```

## Ticket管理

### Ticket缓存机制

- Ticket有效期为2小时
- 如果2小时内有使用，有效期会延迟2小时
- 后端自动管理Ticket缓存，无需手动处理

### 手动刷新Ticket

```javascript
const ctripApiService = require('./services/ctripApiService');
await ctripApiService.refreshTicket();
```

## 错误处理

### 常见错误码

| 错误码 | 说明 |
|--------|------|
| 20000 | 成功 |
| 309 | 无接口访问权限（Ticket过期或无效） |
| 19300001 | Request为空 |
| 19301007 | countryId不能为空 |
| 19302001 | 输入省份与国家不匹配 |
| 19302002 | 输入城市与国家不匹配 |
| 19302003 | 输入城市与省份不匹配 |

### 自动重试机制

当遇到认证错误（309）时，服务会自动刷新Ticket并重试一次。

## 数据格式转换

### POI数据 → Location格式

`convertPOIToLocations` 函数会将携程POI数据转换为系统Location格式：

```javascript
const poiData = await ctripApiService.getAllPOIInfo({ countryId: 1 });
const locations = ctripApiService.convertPOIToLocations(poiData);
```

转换后的Location数据包含以下字段：
- `name`: 名称
- `code`: 代码
- `type`: 类型（airport/station/city/province/country/bus）
- `city`: 城市名
- `province`: 省份名
- `country`: 国家名
- `enName`: 英文名
- `pinyin`: 拼音
- `status`: 状态（active/inactive）

## 注意事项

1. **API密钥安全**: 不要在前端代码中暴露API密钥
2. **请求频率**: 注意控制请求频率，避免触发限流
3. **数据缓存**: 前端已实现缓存机制，减少API调用
4. **增量更新**: 建议使用增量查询功能，减少数据传输量
5. **非标城市**: 21000000前缀的城市仅能用于机票预订，其他场景需要使用 `corpTag=0` 过滤

## 测试环境

测试环境API地址：`https://gateway.fat.ctripqa.com`

生产环境API地址：`https://ct.ctrip.com`

环境切换通过 `NODE_ENV` 环境变量控制。

## 相关文档

- [携程商旅开放平台](https://openapi.ctripbiz.com/#/)
- [标准地理信息API文档](./CTRIP_API_DOC.md)（已提供）

## 更新日志

- 2025-11-29: 初始版本，实现基础API集成
  - 后端代理服务
  - Ticket管理
  - 国家数据获取
  - POI数据获取和转换

