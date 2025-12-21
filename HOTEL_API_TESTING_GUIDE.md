# 酒店预订功能测试指南

## 1. API 端点测试

### 1.1 运行测试脚本

```bash
# 确保后端服务正在运行
cd backend
npm start

# 在另一个终端运行测试脚本
cd backend/scripts
node testHotelApiEndpoints.js
```

### 1.2 测试脚本说明

测试脚本会自动：
1. 登录获取认证 Token
2. 测试所有酒店 API 端点
3. 生成测试报告（JSON 和 Markdown 格式）

**测试的端点：**
- ✅ POST `/api/hotels/search-by-geocode` - 地理坐标搜索
- ✅ POST `/api/hotels/search-by-city` - 城市搜索
- ✅ POST `/api/hotels/search-offers` - 搜索报价
- ✅ POST `/api/hotels/confirm-price` - 确认价格
- ✅ GET `/api/hotels/ratings` - 获取评分
- ✅ GET `/api/hotels/bookings` - 获取预订列表

**测试报告位置：**
- JSON: `backend/logs/hotel-api-endpoints-test-{timestamp}.json`
- Markdown: `backend/logs/hotel-api-endpoints-test-{timestamp}.md`

### 1.3 环境变量配置

测试脚本支持以下环境变量：

```bash
# API Base URL（默认：http://localhost:3001）
export API_BASE_URL=http://localhost:3001

# 测试用户邮箱（默认：admin@example.com）
export TEST_USER_EMAIL=admin@example.com

# 测试用户密码（默认：password123）
export TEST_USER_PASSWORD=password123
```

## 2. 权限配置

### 2.1 权限列表

已添加的酒店相关权限：

| 权限代码 | 说明 | 用途 |
|---------|------|------|
| `hotel.search` | 搜索酒店 | 搜索、价格确认、评分查询 |
| `hotel.booking.view` | 查看预订 | 查看预订列表和详情 |
| `hotel.booking.create` | 创建预订 | 创建酒店预订 |
| `hotel.booking.cancel` | 取消预订 | 取消酒店预订 |

### 2.2 更新角色权限

运行权限初始化脚本，为 admin 角色添加所有权限（包括酒店权限）：

```bash
cd backend/scripts
node initRolePermissions.js
```

### 2.3 为其他角色添加权限

如果需要为其他角色添加酒店权限，可以通过以下方式：

**方式一：通过 API**
```bash
# 获取角色列表
curl -X GET http://localhost:3001/api/roles \
  -H "Authorization: Bearer YOUR_TOKEN"

# 更新角色权限（添加酒店权限）
curl -X PUT http://localhost:3001/api/roles/{roleId} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "permissions": [
      "hotel.search",
      "hotel.booking.view",
      "hotel.booking.create",
      "hotel.booking.cancel"
    ]
  }'
```

**方式二：通过数据库**
```javascript
// MongoDB shell
db.roles.updateOne(
  { code: "YOUR_ROLE_CODE" },
  { $addToSet: { 
    permissions: { 
      $each: [
        "hotel.search",
        "hotel.booking.view",
        "hotel.booking.create",
        "hotel.booking.cancel"
      ]
    }
  }}
)
```

## 3. 前端集成

### 3.1 前端服务文件

已创建 `frontend/src/services/hotelService.js`，提供以下方法：

```javascript
import {
  searchHotelsByGeocode,
  searchHotelsByCity,
  searchHotelsByHotels,
  searchHotelOffers,
  confirmHotelPrice,
  getHotelRatings,
  createHotelBooking,
  getHotelBookings,
  getHotelBooking,
  cancelHotelBooking,
  getHotelBookingsByTravelNumber,
  getTravelHotels,
} from '../services/hotelService';
```

### 3.2 权限检查

前端路由需要使用权限检查：

```javascript
import { PERMISSIONS } from '../config/permissions';
import PermissionRoute from '../components/Common/PermissionRoute';

// 示例：酒店搜索页面
<Route 
  path="hotel/search" 
  element={
    <PermissionRoute requiredPermissions={PERMISSIONS.HOTEL_SEARCH}>
      <HotelSearch />
    </PermissionRoute>
  } 
/>

// 示例：酒店预订列表页面
<Route 
  path="hotel/bookings" 
  element={
    <PermissionRoute requiredPermissions={PERMISSIONS.HOTEL_BOOKING_VIEW}>
      <HotelBookingList />
    </PermissionRoute>
  } 
/>
```

### 3.3 前端页面集成（可选）

根据设计方案，酒店预订功能应该集成到 `FlightSearch.js` 页面中，通过 Tab 切换：

1. **机票预订 Tab**（现有功能，保持不变）
2. **酒店预订 Tab**（新增功能）

**实现步骤：**
1. 修改 `frontend/src/pages/Flight/FlightSearch.js`
2. 添加 Tab 切换组件
3. 创建酒店搜索表单组件
4. 创建酒店列表组件
5. 集成 `hotelService.js` 中的 API 调用

## 4. 手动测试 API 端点

### 4.1 使用 curl

```bash
# 1. 登录获取 Token
TOKEN=$(curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' \
  | jq -r '.token')

# 2. 通过地理坐标搜索酒店
curl -X POST http://localhost:3001/api/hotels/search-by-geocode \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 40.7128,
    "longitude": -74.0060,
    "radius": 5
  }'

# 3. 通过城市搜索酒店
curl -X POST http://localhost:3001/api/hotels/search-by-city \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cityCode": "NYC"
  }'

# 4. 搜索酒店报价
curl -X POST http://localhost:3001/api/hotels/search-offers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "hotelIds": ["RTPAR001"],
    "checkInDate": "2025-12-25",
    "checkOutDate": "2025-12-27",
    "adults": 1,
    "roomQuantity": 1
  }'

# 5. 获取预订列表
curl -X GET http://localhost:3001/api/hotels/bookings \
  -H "Authorization: Bearer $TOKEN"
```

### 4.2 使用 Postman

1. 导入环境变量：
   - `base_url`: `http://localhost:3001`
   - `token`: （从登录响应中获取）

2. 创建 Collection：
   - 酒店搜索
   - 酒店预订管理
   - 差旅申请集成

3. 设置认证：
   - Type: Bearer Token
   - Token: `{{token}}`

## 5. 常见问题

### 5.1 权限错误

**问题**：`User does not have required permission(s): hotel.search`

**解决方案**：
1. 运行权限初始化脚本：`node backend/scripts/initRolePermissions.js`
2. 检查用户角色是否包含酒店权限
3. 确认权限代码正确：`hotel.search`, `hotel.booking.view`, `hotel.booking.create`, `hotel.booking.cancel`

### 5.2 API 连接错误

**问题**：`Request failed with status code 401` 或 `Not authorized`

**解决方案**：
1. 检查 Token 是否有效
2. 确认 Token 格式正确：`Bearer {token}`
3. 重新登录获取新的 Token

### 5.3 Amadeus API 错误

**问题**：`Missing required argument: clientId` 或 `INVALID FORMAT`

**解决方案**：
1. 检查环境变量：`AMADEUS_API_KEY`, `AMADEUS_API_SECRET`
2. 确认 API Key 和 Secret 正确
3. 检查 API 环境：`AMADEUS_API_ENV`（test 或 production）

## 6. 测试检查清单

- [ ] 后端服务正常运行
- [ ] 数据库连接正常
- [ ] 权限已配置（运行 `initRolePermissions.js`）
- [ ] 环境变量已设置（Amadeus API Key/Secret）
- [ ] API 端点测试通过
- [ ] 前端服务文件已创建
- [ ] 前端权限配置已更新
- [ ] 前端页面集成（可选）

## 7. 下一步

1. **运行测试**：执行 `testHotelApiEndpoints.js` 验证所有端点
2. **配置权限**：运行 `initRolePermissions.js` 更新角色权限
3. **前端集成**：根据设计方案实现前端页面（Tab 切换）
4. **端到端测试**：完整的预订流程测试

---

**文档版本**: 1.0  
**创建日期**: 2025-12-21  
**最后更新**: 2025-12-21

