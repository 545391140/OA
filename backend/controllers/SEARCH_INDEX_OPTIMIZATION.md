# 拼音和英文搜索索引优化方案

## 🔍 问题分析

### 核心问题

1. **索引使用不当**
   - 虽然创建了 `pinyin_1` 和 `enName_1` 索引，但查询时没有使用这些索引
   - MongoDB 查询优化器选择了 `status_1` 索引而不是 `pinyin_1` 或 `enName_1` 索引
   - 导致全表扫描（扫描了 597,963 条文档）

2. **复合索引未生效**
   - 虽然创建了复合索引 `{ pinyin: 1, status: 1 }` 和 `{ enName: 1, status: 1 }`
   - 但查询结构导致 MongoDB 无法使用这些复合索引
   - 查询结构：`{ status: 'active', $or: [{ pinyin: {...} }, { enName: {...} }, ...] }`
   - 这种结构下，MongoDB 无法将 status 和 pinyin/enName 组合起来使用复合索引

### 性能影响

| 查询类型 | 索引使用 | 扫描文档数 | 查询耗时 |
|---------|---------|-----------|---------|
| 英文前缀匹配 | enName_1 ✓ | 10 | 263-361ms |
| 拼音前缀匹配 | status_1 ⚠ | 597,963 | 1,651-2,094ms |
| 英文包含匹配 | enName_1 ✓ | 10 | 538ms |
| 拼音包含匹配 | status_1 ⚠ | 597,963 | 6,793ms |

## ✅ 优化方案

### 方案 1：使用 hint() 强制使用复合索引（推荐）

**实现方式**：在查询中添加 `.hint()` 强制 MongoDB 使用指定的复合索引。

**代码实现**：
```javascript
// 对于拼音查询
Location.find(query).hint({ pinyin: 1, status: 1 })

// 对于英文查询
Location.find(query).hint({ enName: 1, status: 1 })
```

**优势**：
- 直接强制使用最优索引，不依赖查询优化器
- 性能提升最明显
- 代码中已实现智能 hint 选择

### 方案 2：优化查询结构

#### 2.1 将 status 放在 $or 外面（尝试方案）

**查询结构**：
```javascript
// 优化后（尝试）
{ status: 'active', $or: [{ pinyin: /^bei/ }, ...] }
```

**实现**：代码中已实现，如果 status 已合并到 $or 条件中，会尝试提取到顶层。

#### 2.2 将 status 合并到每个 $or 条件中（备选方案）

**查询结构**：
```javascript
{
  $or: [
    { pinyin: { $regex: '^beijing', $options: 'i' }, status: 'active' },
    { enName: { $regex: '^Beijing', $options: 'i' }, status: 'active' },
    ...
  ]
}
```

**优势**：确保每个 $or 分支都可以使用对应的复合索引。

### 2. 代码变更

#### 2.1 新增 `getOptimalIndexHint` 函数

智能选择最优的索引 hint：
```javascript
function getOptimalIndexHint(query, orConditions = null) {
  // 如果查询包含 status 和 $or 条件，尝试使用复合索引
  if (query.status && orConditions && Array.isArray(orConditions)) {
    const hasPinyinPrefix = orConditions.some(cond => 
      cond.pinyin && cond.pinyin.$regex && cond.pinyin.$regex.startsWith('^')
    );
    const hasEnNamePrefix = orConditions.some(cond => 
      cond.enName && cond.enName.$regex && cond.enName.$regex.startsWith('^')
    );
    
    if (hasPinyinPrefix) {
      return { pinyin: 1, status: 1 };
    } else if (hasEnNamePrefix) {
      return { enName: 1, status: 1 };
    }
  }
  return null;
}
```

#### 2.2 `buildRegexSearchQuery` 函数

支持将 status 合并到每个 $or 条件中：
```javascript
function buildRegexSearchQuery(searchTerm, searchPriority = null, status = null) {
  // ...
  const addStatusCondition = (condition) => {
    if (status) {
      return { ...condition, status };
    }
    return condition;
  };
  // ...
}
```

#### 2.3 `getLocations` 函数

**关键变更**：
1. 智能提取 status 到顶层（如果所有 $or 条件都包含 status）
2. 自动添加 hint() 强制使用复合索引
3. 同时支持两种查询结构，让 MongoDB 选择最优的

```javascript
// 优化查询结构：尝试将 status 放在外面
if (statusMergedIntoOr && query.$or && Array.isArray(query.$or)) {
  const allHaveStatus = query.$or.every(cond => cond.status === status);
  
  if (allHaveStatus && status) {
    // 提取 status 到顶层
    optimizedQuery = {
      ...query,
      status: status,
      $or: query.$or.map(cond => {
        const { status: _, ...rest } = cond;
        return rest;
      })
    };
  }
}

// 获取最优的索引 hint
const queryHint = getOptimalIndexHint(optimizedQuery, optimizedQuery.$or);

// 使用 hint（如果可用）
let findQuery = Location.find(optimizedQuery);
if (queryHint) {
  findQuery = findQuery.hint(queryHint);
}
```

### 3. 索引状态检查脚本

#### 3.1 `checkIndexStatus.js`（新增）

检查索引构建状态和查询性能：
```bash
node backend/scripts/checkIndexStatus.js
```

功能：
- ✅ 检查所有索引是否存在
- ✅ 检查索引构建进度（是否有正在构建的索引）
- ✅ 测试查询性能（对比使用 hint 前后的效果）
- ✅ 提供优化建议

#### 3.2 `optimizeIndexUsage.js`

验证索引使用情况：
```bash
node backend/scripts/optimizeIndexUsage.js
```

功能：
- 检查索引是否存在和构建状态
- 测试查询性能（不使用 hint）
- 测试使用 hint 强制使用复合索引
- 提供优化建议

## 📊 预期效果

优化完成后，预期性能提升：

| 查询类型 | 优化前 | 优化后（预期） | 提升倍数 |
|---------|--------|--------------|---------|
| 拼音前缀匹配 | 1,651-2,094ms | 50-200ms | 10-40x |
| 拼音包含匹配 | 6,793ms | 500-1,000ms | 7-14x |
| 英文前缀匹配 | 263-361ms | 50-200ms | 2-7x |

## 🔧 使用说明

### 1. 验证复合索引是否构建完成

```bash
# 方法1：使用检查脚本（推荐）
node backend/scripts/checkIndexStatus.js

# 方法2：直接连接 MongoDB
# 连接到 MongoDB，执行以下命令
db.locations.getIndexes()
```

检查是否存在：
- `pinyin_1_status_1`
- `enName_1_status_1`

如果索引正在构建中，查看进度：
```javascript
db.currentOp({ "command.createIndexes": { $exists: true } })
```

### 2. 验证优化效果

运行脚本后，检查：
- ✅ 索引是否存在
- ✅ 查询是否使用了复合索引（`pinyin_1_status_1` 或 `enName_1_status_1`）
- ✅ 扫描文档数是否大幅减少
- ✅ 使用 hint 前后的性能对比

### 3. 代码已自动使用 hint

代码中已实现智能 hint 选择：
- 自动检测查询条件
- 优先使用 `{ pinyin: 1, status: 1 }` 或 `{ enName: 1, status: 1 }`
- 无需手动添加 hint

### 4. 如果索引仍未使用

如果索引已创建但查询优化器仍未使用，可以尝试：

1. **等待索引构建完成**
   - 对于 60 万条数据，索引构建可能需要几分钟到几小时
   - 使用 `checkIndexStatus.js` 检查构建进度

2. **重启 MongoDB 服务**
   - 重启服务以更新查询优化器统计信息

3. **代码已自动使用 hint**
   - 代码中已实现 hint 支持，会自动强制使用最优索引
   - 无需手动修改查询

4. **重建索引（谨慎使用）**
   - 运行 `db.locations.reIndex()` 重建索引
   - ⚠️ 注意：这会锁定集合，影响生产环境

## 📝 注意事项

1. **前缀匹配 vs 包含匹配**
   - 前缀匹配（`^pattern`）可以使用索引
   - 包含匹配（`pattern`）无法使用索引
   - 建议优先使用前缀匹配查询

2. **查询结构优化**
   - 确保 `status` 条件合并到每个 `$or` 条件中
   - 这样 MongoDB 才能使用复合索引

3. **索引构建时间**
   - 复合索引可能还在后台构建中
   - 对于大量数据，索引构建可能需要较长时间
   - 可以使用 `db.locations.getIndexes()` 检查索引状态

4. **查询优化器更新**
   - MongoDB 查询优化器需要时间更新统计信息
   - 可能需要等待一段时间才能看到性能提升
   - 可以尝试重启 MongoDB 或强制更新统计信息

## 🎯 验证步骤

1. **运行优化脚本**
   ```bash
   node backend/scripts/optimizeIndexUsage.js
   ```

2. **检查查询执行计划**
   - 查看是否使用了 `pinyin_1_status_1` 或 `enName_1_status_1` 索引
   - 检查扫描文档数是否大幅减少

3. **测试实际查询性能**
   - 使用实际搜索关键词测试
   - 对比优化前后的查询耗时

4. **监控生产环境**
   - 部署后监控查询性能
   - 检查日志中的查询耗时

---

**完成时间**: 2025-11-30  
**状态**: ✅ 代码优化完成，等待索引构建完成和查询优化器更新

