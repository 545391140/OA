# 携程API配置说明

## ⚠️ 安全提醒

**重要**：API密钥是敏感信息，建议使用环境变量而不是硬编码在代码中。

## 当前配置

已配置的API密钥：
- **AppKey**: `obk_rjwl`
- **AppSecurity**: `eW5(Np%RrUuU#(Z3x$8@kOW(`

## 推荐配置方式

### 方式一：使用环境变量（推荐）

创建 `.env` 文件（已在 `.gitignore` 中，不会被提交）：

```bash
# 携程商旅API配置
CTRIP_APP_KEY=obk_rjwl
CTRIP_APP_SECURITY=eW5(Np%RrUuU#(Z3x$8@kOW(
```

### 方式二：使用默认值（当前方式）

当前配置文件中已设置默认值，可以直接使用。但**不建议在生产环境使用**。

## 配置位置

配置文件：`backend/config.js`

```javascript
// 携程商旅API配置
CTRIP_APP_KEY: process.env.CTRIP_APP_KEY || 'obk_rjwl',
CTRIP_APP_SECURITY: process.env.CTRIP_APP_SECURITY || 'eW5(Np%RrUuU#(Z3x$8@kOW('
```

## 测试配置

配置完成后，可以通过以下方式测试：

### 1. 测试Ticket获取

```bash
# 需要先登录获取token
curl -X GET http://localhost:3001/api/ctrip/ticket \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. 测试国家数据获取

```bash
curl -X GET http://localhost:3001/api/ctrip/countries \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. 测试POI数据获取

```bash
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

## 生产环境部署

在生产环境部署时，**必须**使用环境变量：

1. 在服务器上设置环境变量
2. 或使用 `.env` 文件（确保不会被提交到代码仓库）
3. 移除代码中的默认值

## 注意事项

1. ✅ `.env` 文件已在 `.gitignore` 中，不会被提交
2. ✅ 当前配置可以直接使用（开发环境）
3. ⚠️ 生产环境请使用环境变量
4. ⚠️ 不要将API密钥提交到代码仓库

