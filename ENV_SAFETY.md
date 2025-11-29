# 环境变量安全保护说明

## 🛡️ 保护机制

部署脚本已实现**安全保护机制**，**不会覆盖**服务器上已有的环境配置。

## ✅ 保护行为

### 1. `deploy-sync.sh` - 部署脚本

**行为：**
- ✅ 如果服务器上已有 `.env` 文件，**不会覆盖**
- ✅ 如果不存在，会从模板创建（仅首次部署）
- ✅ 显示提示信息，告知用户文件已存在

**示例输出：**
```
✓ .env 文件已存在，保持不变（不会覆盖）
  如需更新配置，请运行: ./setup-server-env.sh --force user@server.com /path/to/project
```

### 2. `setup-server-env.sh` - 环境变量配置脚本

**默认行为（安全模式）：**
- ✅ 如果服务器上已有 `.env` 文件，**跳过上传**
- ✅ 显示警告信息，提示文件已存在
- ✅ 建议使用 `--force` 参数强制更新

**强制更新模式（`--force`）：**
- ⚠️ 使用 `--force` 参数时，会**先备份**现有文件
- ✅ 备份文件名：`.env.backup.YYYYMMDD-HHMMSS`
- ✅ 然后上传新的配置文件

## 📋 使用场景

### 场景1：首次部署

```bash
# 服务器上没有 .env 文件
./setup-server-env.sh user@server.com /path/to/project

# 结果：创建新的 .env 文件
```

### 场景2：服务器已有配置

```bash
# 服务器上已有 .env 文件
./setup-server-env.sh user@server.com /path/to/project

# 结果：跳过上传，不覆盖现有配置
# 输出：⚠ 服务器上已有 .env 文件，跳过上传以避免覆盖
```

### 场景3：需要更新配置

```bash
# 强制更新（会先备份）
./setup-server-env.sh --force user@server.com /path/to/project

# 结果：
# 1. 备份现有文件为 .env.backup.20251129-164530
# 2. 上传新的配置文件
```

## 🔍 验证现有配置

在更新配置前，可以先查看服务器上的现有配置：

```bash
# 查看服务器上的 .env 文件
ssh user@server.com 'cat /path/to/project/backend/.env'

# 查看备份文件（如果有）
ssh user@server.com 'ls -la /path/to/project/backend/.env.backup.*'
```

## 📝 手动更新配置

如果不想使用脚本，可以手动更新：

```bash
# 1. SSH连接到服务器
ssh user@server.com

# 2. 进入项目目录
cd /path/to/project/backend

# 3. 备份现有配置（可选但推荐）
cp .env .env.backup.$(date +%Y%m%d-%H%M%S)

# 4. 编辑配置文件
nano .env

# 5. 保存并设置权限
chmod 600 .env
```

## 🔄 恢复备份

如果需要恢复之前的配置：

```bash
# 1. 查看备份文件
ssh user@server.com 'ls -la /path/to/project/backend/.env.backup.*'

# 2. 恢复备份
ssh user@server.com 'cd /path/to/project/backend && cp .env.backup.YYYYMMDD-HHMMSS .env'
```

## ⚠️ 注意事项

1. **默认行为是安全的**：不会覆盖现有配置
2. **使用 `--force` 需谨慎**：会覆盖现有配置（但会先备份）
3. **定期备份**：建议定期备份 `.env` 文件
4. **检查配置**：更新后验证配置是否正确

## 📊 文件状态检查

检查服务器上的环境变量文件状态：

```bash
# 检查 .env 文件是否存在
ssh user@server.com '[ -f /path/to/project/backend/.env ] && echo "存在" || echo "不存在"'

# 检查文件权限
ssh user@server.com 'ls -la /path/to/project/backend/.env'

# 查看配置（隐藏敏感信息）
ssh user@server.com 'cd /path/to/project/backend && grep -E "^[^#]" .env | sed "s/=.*/=***/"'
```

## 🎯 最佳实践

1. **首次部署**：使用默认模式，创建新配置
2. **日常更新**：手动编辑，避免使用 `--force`
3. **配置迁移**：使用 `--force` 并检查备份
4. **定期备份**：重要配置变更前先备份

## ✅ 总结

- ✅ **默认安全**：不会覆盖现有配置
- ✅ **强制更新**：使用 `--force` 时会先备份
- ✅ **提示明确**：清楚告知用户操作结果
- ✅ **可恢复**：备份文件可以恢复

**结论：部署脚本是安全的，不会意外覆盖服务器上的环境配置。**

