# 同步脚本功能总结

## ✅ 已完成的功能

### 1. 增量同步支持

脚本现在支持三种同步模式：

#### 全量同步（默认）
```bash
node backend/scripts/syncGlobalLocations.js
# 或
node backend/scripts/syncGlobalLocations.js --full
```

#### 增量同步（自动）
```bash
node backend/scripts/syncGlobalLocations.js --incremental
```
- 自动读取上次同步时间
- 只同步更新的数据
- 同步完成后自动更新同步时间

#### 指定日期同步
```bash
node backend/scripts/syncGlobalLocations.js --start-date 2025-11-01
```
- 从指定日期开始同步
- 日期格式：`YYYY-MM-DD`

### 2. 国家选择

支持指定国家ID进行同步：

```bash
node backend/scripts/syncGlobalLocations.js --country-id 1
```

**默认行为：** 只同步中国（countryId: 1）

### 3. 同步状态管理

- **状态文件位置：** `backend/.sync_status.json`
- **自动创建和更新**
- **记录内容：**
  ```json
  {
    "lastSyncTime": "2025-11-29T07:23:59.017Z",
    "syncMode": "incremental",
    "startDate": "2025-11-29"
  }
  ```

### 4. 命令行参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `--full` | 全量同步 | `--full` |
| `--incremental` | 增量同步 | `--incremental` |
| `--start-date` | 指定开始日期 | `--start-date 2025-11-01` |
| `--country-id` | 指定国家ID | `--country-id 1` |

### 5. 组合使用示例

```bash
# 从指定日期开始增量同步中国数据
node backend/scripts/syncGlobalLocations.js --incremental --start-date 2025-11-01 --country-id 1
```

## 📋 实现的功能列表

### 核心功能
- ✅ 全量同步
- ✅ 增量同步（基于上次同步时间）
- ✅ 指定日期同步
- ✅ 国家选择
- ✅ 同步状态记录
- ✅ 错误处理和统计

### 辅助功能
- ✅ 命令行参数解析
- ✅ 日期格式验证
- ✅ 日期格式化
- ✅ 同步状态文件读写
- ✅ 详细的统计信息输出

### API集成
- ✅ 支持 `startDate` 参数
- ✅ 使用生产环境（默认）
- ✅ 正确的字段名（`appkey` 全小写）
- ✅ Ticket缓存机制

## 🧪 测试结果

所有功能已通过测试：

```
✅ 命令行参数解析：通过
✅ 日期格式化：通过
✅ 日期验证：通过
✅ 同步状态文件操作：通过
```

## 📝 使用流程

### 首次同步

```bash
# 1. 全量同步中国数据
node backend/scripts/syncGlobalLocations.js

# 同步完成后会自动创建 .sync_status.json
```

### 日常更新

```bash
# 2. 增量同步（每天或定期运行）
node backend/scripts/syncGlobalLocations.js --incremental
```

### 补同步

```bash
# 3. 从指定日期开始同步
node backend/scripts/syncGlobalLocations.js --start-date 2025-11-20
```

## 🔧 技术实现

### 关键函数

1. **`parseArgs()`** - 解析命令行参数
2. **`getLastSyncTime()`** - 读取上次同步时间
3. **`saveSyncTime()`** - 保存同步时间
4. **`formatDate()`** - 格式化日期为 YYYY-MM-DD
5. **`validateDate()`** - 验证日期格式
6. **`processCountry()`** - 处理单个国家的数据（支持startDate参数）

### 数据流程

```
命令行参数 → 解析参数 → 确定同步模式 → 获取开始日期 → 
调用API（带startDate） → 转换数据 → 保存/更新 → 记录同步时间
```

## 📊 统计信息

同步完成后会显示：

- 总国家数
- 处理国家数
- 成功/失败数量
- 总地理位置数据
- 创建/更新/跳过数量
- 错误列表

## ⚠️ 注意事项

1. **首次同步**：建议先进行全量同步
2. **增量同步**：需要先有 `.sync_status.json` 文件
3. **日期格式**：必须使用 `YYYY-MM-DD` 格式
4. **状态文件**：建议添加到 `.gitignore`
5. **数据完整性**：增量同步不会删除已存在的数据

## 🚀 下一步

现在可以开始同步中国的地理位置数据：

```bash
# 全量同步中国数据
node backend/scripts/syncGlobalLocations.js
```

同步完成后，可以使用增量同步保持数据最新：

```bash
# 增量同步（每天或定期运行）
node backend/scripts/syncGlobalLocations.js --incremental
```

## 📚 相关文档

- `INCREMENTAL_SYNC_GUIDE.md` - 增量同步详细使用指南
- `ENVIRONMENT_SWITCH.md` - 环境切换说明
- `API_TEST_RESULTS.md` - API测试结果

