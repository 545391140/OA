# 文本索引更新指南：添加 enName 和 pinyin 字段

## 📋 当前情况

### 当前文本索引配置
- **索引名称**: `name_text_code_text_city_text_country_text`
- **包含字段**: `name`, `code`, `city`, `country`
- **不包含字段**: `enName`, `pinyin`

### 问题
搜索 "tokyo" 时，文本索引搜索返回 0 条结果，因为：
- Tokyo 的 `name` 是 "东京"（中文），不匹配 "tokyo"
- Tokyo 的 `enName` 是 "Tokyo"，但 `enName` 不在文本索引中
- 因此文本索引搜索无法找到 Tokyo

## ✅ 解决方案

### 方法 1: 通过代码更新（推荐）

在 `backend/models/Location.js` 中，文本索引定义已经包含了 `enName` 和 `pinyin`：

```javascript
LocationSchema.index({ 
  name: 'text', 
  code: 'text', 
  city: 'text', 
  province: 'text',
  district: 'text',
  county: 'text',
  country: 'text', 
  countryCode: 'text',
  enName: 'text',  // 英文名称（支持英文搜索）
  pinyin: 'text'   // 拼音（支持拼音搜索）
});
```

**但是**，数据库中的实际索引可能还没有更新。需要：

1. **删除旧索引**
2. **重新创建索引**（Mongoose 会自动根据 Schema 定义创建）

### 方法 2: 通过 MongoDB Shell 手动更新

```javascript
// 1. 连接到 MongoDB
use your_database_name

// 2. 删除旧的文本索引
db.locations.dropIndex("name_text_code_text_city_text_country_text")

// 3. 创建新的文本索引（包含 enName 和 pinyin）
db.locations.createIndex(
  {
    name: "text",
    code: "text",
    city: "text",
    province: "text",
    district: "text",
    county: "text",
    country: "text",
    countryCode: "text",
    enName: "text",   // 新增
    pinyin: "text"    // 新增
  },
  {
    name: "text_index_with_enName_pinyin",
    weights: {
      name: 10,        // 中文名称权重最高
      enName: 8,       // 英文名称权重较高
      pinyin: 8,       // 拼音权重较高
      code: 5,         // 代码权重中等
      city: 3,         // 城市权重较低
      province: 2,     // 省份权重较低
      district: 1,     // 区县权重最低
      county: 1,       // 县权重最低
      country: 1,      // 国家权重最低
      countryCode: 1   // 国家代码权重最低
    },
    background: true   // 后台创建，不阻塞其他操作
  }
)
```

### 方法 3: 使用脚本更新（不改代码）

运行脚本：
```bash
node backend/scripts/checkAndUpdateTextIndex.js
```

脚本会：
1. 检查当前文本索引
2. 验证是否包含 enName 和 pinyin
3. 如果不包含，删除旧索引并创建新索引
4. 测试新索引是否正常工作

## 🔍 验证索引更新

### 检查索引是否创建成功

```javascript
// MongoDB Shell
db.locations.getIndexes()

// 应该看到新的文本索引，包含 enName 和 pinyin
```

### 测试文本索引搜索

```javascript
// 测试搜索 "tokyo"（应该能找到 Tokyo）
db.locations.find({
  $text: { $search: "tokyo", $language: "none" },
  status: "active"
})

// 测试搜索 "dongjing"（应该能找到东京）
db.locations.find({
  $text: { $search: "dongjing", $language: "none" },
  status: "active"
})
```

## ⚠️ 注意事项

1. **索引构建时间**: 如果数据量很大（30万+条），索引构建可能需要一些时间
2. **后台构建**: 使用 `background: true` 选项，索引会在后台构建，不会阻塞其他操作
3. **索引大小**: 添加更多字段会增加索引大小
4. **性能影响**: 文本索引构建期间可能略微影响写入性能

## 📊 索引权重说明

权重决定了搜索结果的排序优先级：
- **name (10)**: 中文名称匹配优先级最高
- **enName (8)**: 英文名称匹配优先级较高
- **pinyin (8)**: 拼音匹配优先级较高
- **code (5)**: 代码匹配优先级中等
- **其他字段 (1-3)**: 其他字段匹配优先级较低

## 🎯 预期效果

更新索引后：
- ✅ 搜索 "tokyo" 可以通过文本索引找到 Tokyo
- ✅ 搜索 "dongjing" 可以通过文本索引找到东京
- ✅ 搜索 "东京" 仍然可以通过文本索引找到东京
- ✅ 文本索引搜索性能更好，不需要降级到正则表达式搜索

## 📝 总结

**可以**将 `enName` 和 `pinyin` 添加到文本索引中，这样可以：
1. 提高搜索性能（文本索引比正则表达式快）
2. 支持英文和拼音搜索
3. 减少降级到正则表达式搜索的情况

**建议**: 使用方法 2（MongoDB Shell）或方法 3（脚本）更新索引，这样不需要修改代码。

