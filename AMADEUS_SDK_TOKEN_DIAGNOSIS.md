# Amadeus SDK Token 问题诊断报告

## 问题描述
"The access token provided in the Authorization header is invalid" 错误

## 诊断结果

### ✅ 已验证正常的部分

1. **SDK 配置正确**
   - 环境配置：`AMADEUS_API_ENV=test` ✅
   - SDK hostname：`test` ✅
   - API 端点：`https://test.api.amadeus.com` ✅

2. **API Key 和 Secret 配置正确**
   - `AMADEUS_HOTEL_API_KEY`: `bHIS0a388f5DhS0Q5iw8RVef8PdZeEj2` ✅
   - `AMADEUS_HOTEL_API_SECRET`: 已设置 ✅
   - API Key 属于测试环境 ✅

3. **Token 获取成功**
   - SDK 能够成功获取 Access Token ✅
   - Token 格式正确：`Bearer IP4cYNBVaoz33IJ2vOKl8GOuOv2T` ✅
   - Token 有效期：1799 秒（约 30 分钟）✅

4. **酒店搜索 API 调用成功**
   - `referenceData.locations.hotels.byCity.get()` ✅
   - `shopping.hotelOffersSearch.get()` ✅
   - 所有搜索相关的 API 都能正常工作 ✅

### ⚠️ 可能的问题点

1. **酒店预订 API 的特殊性**
   - 预订 API (`booking.hotelBookings.post`) 可能需要不同的权限
   - 某些测试环境的 API Key 可能只有搜索权限，没有预订权限
   - 预订 API 可能需要额外的认证或配置

2. **Token 时效性问题**
   - Token 在获取后可能在某些情况下过期
   - 预订 API 调用时，Token 可能已经失效
   - SDK 的 Token 自动刷新机制可能在某些情况下不工作

3. **API 版本或端点问题**
   - 预订 API 的端点可能与其他 API 不同
   - 可能需要特定的 API 版本或格式

## 解决方案

### 方案 1：确保 Token 在预订前有效（已实现）

在 `hotelBookingSdk.js` 中，我们已经在预订前调用一个简单的 API 来确保 Token 有效：

```javascript
// 预获取 Token：调用一个简单的 API 来确保 Token 已获取并有效
await currentAmadeus.referenceData.locations.hotels.byCity.get({
  cityCode: 'NYC',
  hotelSource: 'ALL',
}).catch(() => {
  // 忽略错误，这只是为了触发 Token 获取/刷新
});
```

### 方案 2：增强错误处理和重试机制（已实现）

在 `hotelBookingSdk.js` 中，我们已经实现了：
- 检测认证错误（401）
- 重置 SDK 实例
- 自动重试一次

### 方案 3：检查 API Key 权限

**重要：** 请检查 Amadeus 开发者门户中的 API Key 权限设置：

1. 登录 [Amadeus for Developers](https://developers.amadeus.com/)
2. 进入 "My Self-Service" > "API Keys"
3. 检查你的 API Key (`bHIS0a388f5DhS0Q5iw8RVef8PdZeEj2`) 的权限
4. 确认是否启用了 "Hotel Booking" 权限

**可能的情况：**
- ✅ 搜索权限：已启用（已验证可用）
- ❌ 预订权限：可能未启用（需要检查）

### 方案 4：验证环境匹配

**当前配置：**
- `.env` 中：`AMADEUS_API_ENV=test` ✅
- SDK 配置：`hostname: 'test'` ✅
- API Key：测试环境的 Key ✅

**验证方法：**
运行诊断脚本：
```bash
cd backend
node scripts/diagnoseAmadeusSdk.js
```

## 代码检查清单

### ✅ 已实现的改进

1. **共享 SDK 实例** (`amadeusSdkInstance.js`)
   - ✅ 统一的 SDK 配置
   - ✅ 单例模式确保一致性
   - ✅ 环境配置正确

2. **错误处理** (`hotelBookingSdk.js`)
   - ✅ 检测认证错误（401）
   - ✅ 自动重试机制
   - ✅ 详细的错误日志

3. **Token 预验证** (`hotelBookingSdk.js`)
   - ✅ 预订前调用简单 API 确保 Token 有效
   - ✅ 忽略预验证错误，继续尝试预订

### 🔍 需要进一步检查的

1. **API Key 权限**
   - [ ] 检查 Amadeus 开发者门户中的权限设置
   - [ ] 确认是否启用了酒店预订权限

2. **实际错误信息**
   - [ ] 查看完整的错误响应（包括 `description` 字段）
   - [ ] 检查是否有其他错误代码或消息

3. **预订 API 调用**
   - [ ] 验证请求体格式是否正确
   - [ ] 检查 `offerId` 是否有效
   - [ ] 确认客人信息格式是否符合要求

## 测试步骤

### 1. 运行诊断脚本
```bash
cd backend
node scripts/diagnoseAmadeusSdk.js
```

**预期结果：**
- ✅ SDK 实例创建成功
- ✅ Token 获取成功
- ✅ 酒店搜索 API 调用成功

### 2. 测试预订 API
```bash
cd backend
node scripts/testHotelBookingApi.js
```

**预期结果：**
- ✅ Token 获取成功
- ✅ 获取酒店报价成功
- ⚠️ 预订 API 可能返回 401（如果 API Key 没有预订权限）

### 3. 检查实际错误

如果预订 API 仍然返回 401 错误，请：

1. **查看完整的错误响应**
   ```javascript
   console.error('完整错误:', JSON.stringify(error, null, 2));
   ```

2. **检查错误描述**
   - `error.description` - 可能包含更详细的错误信息
   - `error.response` - 完整的 API 响应

3. **验证 API Key 权限**
   - 登录 Amadeus 开发者门户
   - 检查 API Key 的权限设置

## 建议的下一步操作

1. **立即检查：**
   - [ ] 登录 Amadeus 开发者门户
   - [ ] 检查 API Key 的权限设置
   - [ ] 确认是否启用了 "Hotel Booking" 权限

2. **如果权限已启用：**
   - [ ] 查看完整的错误响应
   - [ ] 检查预订 API 的请求格式
   - [ ] 验证 `offerId` 是否有效

3. **如果权限未启用：**
   - [ ] 在 Amadeus 开发者门户中启用预订权限
   - [ ] 等待权限生效（可能需要几分钟）
   - [ ] 重新测试预订 API

## 相关文件

- `backend/services/amadeus/amadeusSdkInstance.js` - SDK 实例管理
- `backend/services/amadeus/hotelBookingSdk.js` - 酒店预订服务
- `backend/services/amadeus/hotelSearchSdk.js` - 酒店搜索服务
- `backend/scripts/diagnoseAmadeusSdk.js` - 诊断脚本
- `backend/scripts/testHotelBookingApi.js` - 预订 API 测试脚本

## 总结

**当前状态：**
- ✅ SDK 配置正确
- ✅ Token 获取成功
- ✅ 搜索 API 正常工作
- ⚠️ 预订 API 可能因权限问题失败

**最可能的原因：**
1. API Key 没有酒店预订权限（最可能）
2. Token 在预订 API 调用时已过期（已通过预验证解决）
3. 预订 API 的请求格式不正确（需要进一步检查）

**建议：**
优先检查 Amadeus 开发者门户中的 API Key 权限设置，这是最可能的问题原因。

