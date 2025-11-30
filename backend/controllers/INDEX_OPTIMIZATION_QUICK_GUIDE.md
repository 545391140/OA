# 索引优化快速指南

## 🎯 问题

拼音和英文搜索性能慢，查询扫描了 597,963 条文档（全表扫描），耗时 1,651-6,793ms。

## ✅ 解决方案

### 1. 验证索引状态

```bash
# 检查索引是否存在和构建状态
node backend/scripts/checkIndexStatus.js
```

**预期输出**：
- ✓ `pinyin_1_status_1` 索引存在
- ✓ `enName_1_status_1` 索引存在
- ✓ 没有正在构建的索引

### 2. 如果索引不存在

```bash
# 创建复合索引
node backend/scripts/addCompositeIndexes.js
```

### 3. 代码已自动优化

代码中已实现以下优化：

1. **自动使用 hint()**：根据查询条件自动选择最优索引
2. **优化查询结构**：尝试将 status 放在 $or 外面
3. **智能索引选择**：优先使用 `{ pinyin: 1, status: 1 }` 或 `{ enName: 1, status: 1 }`

### 4. 验证优化效果

运行检查脚本后，查看：
- ✅ 查询是否使用了复合索引
- ✅ 扫描文档数是否大幅减少（从 597,963 降至 < 1000）
- ✅ 查询耗时是否降低（从 1,651ms 降至 < 200ms）

## 📊 性能对比

| 查询类型 | 优化前 | 优化后（预期） | 提升 |
|---------|--------|--------------|------|
| 拼音前缀匹配 | 1,651-2,094ms | 50-200ms | 10-40x |
| 拼音包含匹配 | 6,793ms | 500-1,000ms | 7-14x |

## 🔧 手动验证（MongoDB Shell）

```javascript
// 1. 检查索引
db.locations.getIndexes()

// 2. 检查索引构建进度
db.currentOp({ "command.createIndexes": { $exists: true } })

// 3. 测试查询（不使用 hint）
db.locations.find({ 
  pinyin: { $regex: '^beijing', $options: 'i' }, 
  status: 'active' 
}).limit(10).explain('executionStats')

// 4. 测试查询（使用 hint）
db.locations.find({ 
  pinyin: { $regex: '^beijing', $options: 'i' }, 
  status: 'active' 
}).hint({ pinyin: 1, status: 1 }).limit(10).explain('executionStats')
```

## 📝 注意事项

1. **索引构建时间**：对于 60 万条数据，索引构建可能需要几分钟到几小时
2. **查询优化器更新**：可能需要重启 MongoDB 或等待一段时间才能看到性能提升
3. **前缀匹配 vs 包含匹配**：
   - 前缀匹配（`^pattern`）可以使用索引 ✅
   - 包含匹配（`pattern`）无法使用索引 ⚠️

## 🚀 快速检查清单

- [ ] 运行 `checkIndexStatus.js` 检查索引状态
- [ ] 确认复合索引已创建
- [ ] 确认索引构建已完成
- [ ] 测试查询性能（查看扫描文档数和耗时）
- [ ] 对比使用 hint 前后的性能

---

**相关文档**：
- `SEARCH_INDEX_OPTIMIZATION.md` - 详细优化方案
- `INDEX_OPTIMIZATION_COMPLETE.md` - 索引优化完成报告

