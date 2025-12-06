# 币种管理功能设置指南

## 问题诊断

如果遇到 "API endpoint not found" 错误，请按以下步骤检查：

### 1. 检查后端服务是否运行

确保后端服务正在运行：
```bash
cd backend
npm start
# 或
node server.js
```

### 2. 检查路由是否正确注册

确认 `backend/server.js` 中包含：
```javascript
const currencyRoutes = require('./routes/currencies');
app.use('/api/currencies', currencyRoutes);
```

### 3. 检查数据库表是否存在

运行检查脚本：
```bash
cd backend
node scripts/checkCurrencyTable.js
```

这个脚本会：
- 显示所有数据库集合
- 检查 `currencies` 集合是否存在
- 显示币种数据数量
- 测试 Currency 模型是否正常工作

### 4. 初始化币种数据

如果数据库中没有币种数据，运行初始化脚本：
```bash
cd backend
node scripts/initCurrencies.js
```

这个脚本会创建以下默认币种：
- CNY (人民币) - 默认币种，汇率 1.0
- USD (美元) - 汇率 0.14
- EUR (欧元) - 汇率 0.13
- GBP (英镑) - 汇率 0.11
- JPY (日元) - 汇率 20.0
- KRW (韩元) - 汇率 180.0

## API 端点列表

所有端点都需要认证（Bearer Token）：

1. **获取所有币种**
   - `GET /api/currencies`
   - 查询参数：`isActive`, `code`, `search`

2. **获取活跃币种**
   - `GET /api/currencies/active`
   - 返回所有启用的币种

3. **获取汇率**
   - `GET /api/currencies/exchange-rates`
   - 返回所有活跃币种的汇率

4. **根据代码获取币种**
   - `GET /api/currencies/code/:code`
   - 例如：`GET /api/currencies/code/USD`

5. **根据ID获取币种**
   - `GET /api/currencies/:id`

6. **创建币种** (需要 admin 或 finance 权限)
   - `POST /api/currencies`
   - Body: `{ code, name, exchangeRate, ... }`

7. **更新币种** (需要 admin 或 finance 权限)
   - `PUT /api/currencies/:id`

8. **删除币种** (需要 admin 权限)
   - `DELETE /api/currencies/:id`

## 常见问题

### Q: 为什么 API 返回 404？

A: 可能的原因：
1. 后端服务未运行
2. 路由未正确注册（检查 server.js）
3. API 路径错误（应该是 `/api/currencies` 而不是 `/currencies`）

### Q: 为什么返回空数组？

A: 数据库中没有币种数据，运行初始化脚本：
```bash
node backend/scripts/initCurrencies.js
```

### Q: 为什么返回 401 Unauthorized？

A: 所有币种 API 都需要认证。确保：
1. 用户已登录
2. 请求头包含有效的 Bearer Token
3. Token 未过期

### Q: 如何验证数据库连接？

A: 运行检查脚本：
```bash
node backend/scripts/checkCurrencyTable.js
```

## MongoDB 集合名称

MongoDB 会自动将模型名称转换为集合名称：
- 模型：`Currency`
- 集合：`currencies` (Mongoose 自动将单数转为复数，并小写)

## 测试 API

使用 curl 测试（需要先获取 token）：

```bash
# 获取活跃币种
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/currencies/active

# 获取所有币种
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/currencies
```

## 下一步

1. ✅ 运行 `checkCurrencyTable.js` 检查数据库
2. ✅ 如果表不存在或为空，运行 `initCurrencies.js`
3. ✅ 重启后端服务
4. ✅ 访问前端币种管理页面：`http://localhost:3000/currencies`

