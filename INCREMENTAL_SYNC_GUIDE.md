# 增量同步使用指南

## 功能说明

同步脚本现在支持增量同步功能，可以只同步自上次同步以来更新的数据，大大提高同步效率。

## 使用方法

### 1. 全量同步（默认）

首次同步或需要完整更新所有数据时使用：

```bash
node backend/scripts/syncGlobalLocations.js
```

或明确指定：

```bash
node backend/scripts/syncGlobalLocations.js --full
```

### 2. 增量同步（自动）

从上次同步时间开始，自动获取更新的数据：

```bash
node backend/scripts/syncGlobalLocations.js --incremental
```

**工作原理：**
- 脚本会自动读取 `.sync_status.json` 文件中记录的上次同步时间
- 只获取自上次同步以来更新的数据
- 同步完成后自动更新同步时间

### 3. 指定开始日期

从指定日期开始同步数据：

```bash
node backend/scripts/syncGlobalLocations.js --start-date 2025-11-01
```

**日期格式：** `YYYY-MM-DD`

### 4. 指定国家ID

同步指定国家的数据：

```bash
node backend/scripts/syncGlobalLocations.js --country-id 1
```

**常用国家ID：**
- `1` - 中国
- `2` - 美国
- `3` - 日本
- 等等...

### 5. 组合使用

```bash
# 从指定日期开始增量同步中国数据
node backend/scripts/syncGlobalLocations.js --incremental --start-date 2025-11-01 --country-id 1
```

## 同步状态文件

脚本会在 `backend/.sync_status.json` 文件中记录同步状态：

```json
{
  "lastSyncTime": "2025-11-29T06:45:00.000Z",
  "syncMode": "incremental",
  "startDate": "2025-11-29"
}
```

**文件位置：** `backend/.sync_status.json`

**注意事项：**
- 该文件会自动创建和更新
- 建议将此文件添加到 `.gitignore`（如果尚未添加）
- 删除此文件后，下次增量同步将自动转为全量同步

## 同步模式对比

| 模式 | 命令 | 说明 | 适用场景 |
|------|------|------|----------|
| **全量同步** | `--full` 或不指定 | 同步所有数据 | 首次同步、定期全量更新 |
| **增量同步** | `--incremental` | 从上次同步时间开始 | 日常更新、定期增量更新 |
| **指定日期** | `--start-date YYYY-MM-DD` | 从指定日期开始 | 补同步、特定时间段数据 |

## 工作流程

### 首次同步

```bash
# 1. 全量同步中国数据
node backend/scripts/syncGlobalLocations.js

# 同步完成后，会自动创建 .sync_status.json 文件
```

### 日常更新

```bash
# 2. 增量同步（每天或定期运行）
node backend/scripts/syncGlobalLocations.js --incremental

# 脚本会自动：
# - 读取上次同步时间
# - 只获取更新的数据
# - 更新同步时间
```

### 补同步

如果某段时间没有同步，需要补同步：

```bash
# 从指定日期开始同步
node backend/scripts/syncGlobalLocations.js --start-date 2025-11-20
```

## API支持

携程API的 `getAllPOIInfo` 方法支持 `startDate` 参数：

```javascript
const poiData = await ctripApiService.getAllPOIInfo({
  countryId: 1,
  startDate: '2025-11-01', // 格式：YYYY-MM-DD
  returnAirport: true,
  returnTrainStation: true,
  returnBusStation: true,
});
```

## 统计信息

同步完成后会显示详细的统计信息：

```
============================================================
同步完成！最终统计:
============================================================
总国家数: 1
处理国家数: 1
成功: 1
失败: 0
总地理位置数据: 1234
创建: 100
更新: 1134
跳过: 0
```

## 注意事项

1. **首次同步**：建议先进行全量同步，建立完整的数据基础
2. **增量同步**：需要先有 `.sync_status.json` 文件，否则会自动转为全量同步
3. **日期格式**：必须使用 `YYYY-MM-DD` 格式
4. **时区**：同步时间使用 UTC 时区存储
5. **数据完整性**：增量同步只获取更新的数据，不会删除已存在的数据

## 故障排查

### 问题：增量同步时提示"未找到上次同步时间"

**原因：** `.sync_status.json` 文件不存在或损坏

**解决：**
```bash
# 删除状态文件，重新全量同步
rm backend/.sync_status.json
node backend/scripts/syncGlobalLocations.js
```

### 问题：增量同步没有获取到新数据

**可能原因：**
1. 该时间段内确实没有数据更新
2. 日期格式错误
3. API返回空数据

**解决：**
- 检查日期格式是否正确
- 尝试使用全量同步验证数据
- 检查API响应

## 最佳实践

1. **定期全量同步**：建议每月进行一次全量同步，确保数据完整性
2. **日常增量同步**：每天或每周进行增量同步，保持数据最新
3. **监控同步状态**：检查 `.sync_status.json` 文件，确保同步正常
4. **备份数据**：重要数据同步前建议备份数据库

## 示例脚本

可以创建定时任务脚本：

```bash
#!/bin/bash
# sync_locations_daily.sh

cd /path/to/project
node backend/scripts/syncGlobalLocations.js --incremental

# 记录日志
echo "$(date): 增量同步完成" >> sync.log
```

添加到 crontab（每天凌晨2点执行）：

```bash
0 2 * * * /path/to/sync_locations_daily.sh
```

