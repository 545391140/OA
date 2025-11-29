# 携程API环境切换说明

## ✅ 已切换到生产环境

系统已默认使用**生产环境**，所有API调用将指向：
- **生产环境**: `https://ct.ctrip.com`

## 环境配置

### 当前默认配置

- **后端服务** (`backend/services/ctripApiService.js`): 默认使用生产环境
- **前端服务** (`frontend/src/services/locationService.js`): 已配置生产环境
- **测试脚本**: 默认使用生产环境

### 环境切换方法

#### 方法一：使用环境变量（推荐）

**切换到测试环境：**
```bash
export CTRIP_USE_TEST_ENV=true
node backend/scripts/testCtripApi.js
```

**使用生产环境（默认）：**
```bash
unset CTRIP_USE_TEST_ENV
# 或
export CTRIP_USE_TEST_ENV=false
node backend/scripts/testCtripApi.js
```

#### 方法二：修改代码

在 `backend/services/ctripApiService.js` 中：
```javascript
get baseURL() {
  if (process.env.CTRIP_USE_TEST_ENV === 'true') {
    return this.test.baseURL;  // 测试环境
  }
  return this.production.baseURL;  // 生产环境（默认）
}
```

## 环境对比

| 环境 | BaseURL | 状态 | 说明 |
|------|---------|------|------|
| **生产环境** | `https://ct.ctrip.com` | ✅ 正常 | 默认环境，所有功能可用 |
| **测试环境** | `https://gateway.fat.ctripqa.com` | ❌ 不可用 | 返回"非对接客户"错误 |

## 测试结果

### 生产环境测试 ✅

- ✅ Ticket获取：成功
- ✅ 国家列表获取：成功（233个国家）
- ✅ POI数据获取：成功（34个省份）

### 测试环境测试 ❌

- ❌ Ticket获取：失败（"非对接客户"错误）
- 可能原因：
  - 测试环境需要不同的API密钥
  - 账号未开通测试环境权限
  - 测试环境暂时不可用

## 使用建议

1. **开发环境**: 使用生产环境（当前默认）
2. **生产部署**: 使用生产环境（当前默认）
3. **测试环境**: 如需使用，请联系携程确认测试环境权限和密钥

## 验证配置

运行以下命令验证当前环境：

```bash
# 测试生产环境（默认）
node backend/scripts/testCtripApi.js

# 测试生产环境（明确指定）
NODE_ENV=production node backend/scripts/testCtripApi.js

# 测试测试环境（如果可用）
CTRIP_USE_TEST_ENV=true node backend/scripts/testCtripApi.js
```

## 注意事项

1. ⚠️ 生产环境是默认环境，无需额外配置
2. ⚠️ 测试环境当前不可用，如需使用请联系携程
3. ✅ 所有API功能在生产环境正常工作
4. ✅ 可以开始使用生产环境进行数据同步

