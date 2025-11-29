# 搜索准确性改进方案

## 一、当前问题分析

### 1.1 文本索引搜索问题
- MongoDB 文本索引默认会分词，对拼音的处理可能不够准确
- 如果数据库中的 `pinyin` 字段格式不一致（如 "beijing" vs "bei jing"），可能匹配不到
- 文本索引搜索没有使用 `$language: 'none'`，可能影响多语言搜索

### 1.2 正则表达式搜索问题
- 正则表达式搜索没有对拼音和英文进行特殊处理
- 搜索条件的优先级不够明确，可能导致不相关的结果排在前面
- 缺少对拼音首字母匹配的支持（如 "bj" 匹配 "beijing"）

### 1.3 搜索结果排序问题
- 文本索引搜索使用了 `textScore`，但正则表达式搜索没有评分机制
- 前端有排序逻辑，但后端返回的结果可能已经不够准确

### 1.4 数据完整性问题
- 如果数据库中的 `pinyin` 或 `enName` 字段为空，即使搜索逻辑正确也找不到结果

## 二、改进方案

### 2.1 优化文本索引搜索

#### 方案1：使用 `$language: 'none'` 禁用语言特定处理
```javascript
function buildTextSearchQuery(searchTerm) {
  // ... 现有代码 ...
  
  return {
    $text: { 
      $search: processedSearch,
      $language: 'none' // 禁用语言特定处理，支持多语言搜索
    }
  };
}
```

**优点**：
- 禁用默认的语言特定处理，更适合多语言场景
- 对拼音和英文的处理更准确

**缺点**：
- 可能影响中文搜索的准确性（需要测试）

#### 方案2：对拼音和英文使用短语搜索
```javascript
function buildTextSearchQuery(searchTerm) {
  // ... 现有代码 ...
  
  // 检查是否是纯拼音或英文（不包含中文）
  const isPinyinOrEnglish = /^[a-zA-Z\s]+$/.test(searchTrimmed);
  
  if (isPinyinOrEnglish) {
    // 对于拼音和英文，使用引号包裹进行短语搜索
    // 这样可以避免分词，提高准确性
    processedSearch = `"${processedSearch}"`;
  }
  
  return {
    $text: { 
      $search: processedSearch,
      $language: 'none'
    }
  };
}
```

**优点**：
- 对拼音和英文的搜索更准确
- 避免分词导致的匹配问题

**缺点**：
- 如果用户输入部分拼音（如 "beij"），可能匹配不到完整拼音（如 "beijing"）

### 2.2 优化正则表达式搜索

#### 方案1：添加拼音首字母匹配
```javascript
function buildRegexSearchQuery(searchTerm) {
  // ... 现有代码 ...
  
  const searchLower = searchTrimmed.toLowerCase();
  
  // 检查是否是拼音首字母（2-4个小写字母）
  const isPinyinInitials = /^[a-z]{2,4}$/.test(searchLower);
  
  if (isPinyinInitials) {
    // 生成拼音首字母匹配模式
    // 例如 "bj" 可以匹配 "beijing"、"baoji" 等
    const initialsPattern = searchLower.split('').join('.*');
    searchConditions.push(
      { pinyin: { $regex: `^${initialsPattern}`, $options: 'i' } }
    );
  }
  
  // ... 现有代码 ...
}
```

**优点**：
- 支持拼音首字母搜索（如 "bj" 匹配 "beijing"）
- 提高搜索的灵活性

**缺点**：
- 可能产生误匹配（如 "bj" 可能匹配到 "baoji"）

#### 方案2：优化搜索条件的优先级
```javascript
function buildRegexSearchQuery(searchTerm) {
  // ... 现有代码 ...
  
  // 重新组织搜索条件，按优先级分组
  const highPriorityConditions = []; // 精确匹配和前缀匹配
  const mediumPriorityConditions = []; // 包含匹配
  const lowPriorityConditions = []; // 拼写容错匹配
  
  // 1. 精确匹配（最高优先级）
  highPriorityConditions.push(
    { name: { $regex: `^${escapedTrimmed}$`, $options: 'i' } },
    { code: { $regex: `^${escapedLower}$`, $options: 'i' } },
    { pinyin: { $regex: `^${escapedLower}$`, $options: 'i' } },
    { enName: { $regex: `^${escapedTrimmed}$`, $options: 'i' } }
  );
  
  // 2. 前缀匹配（高优先级）
  highPriorityConditions.push(
    { name: { $regex: `^${escapedTrimmed}`, $options: 'i' } },
    { code: { $regex: `^${escapedLower}`, $options: 'i' } },
    { pinyin: { $regex: `^${escapedLower}`, $options: 'i' } },
    { enName: { $regex: `^${escapedTrimmed}`, $options: 'i' } }
  );
  
  // 3. 包含匹配（中等优先级）
  mediumPriorityConditions.push(
    { name: { $regex: escapedTrimmed, $options: 'i' } },
    { code: { $regex: escapedLower, $options: 'i' } },
    { pinyin: { $regex: escapedLower, $options: 'i' } },
    { enName: { $regex: escapedTrimmed, $options: 'i' } },
    { city: { $regex: escapedTrimmed, $options: 'i' } },
    { province: { $regex: escapedTrimmed, $options: 'i' } }
  );
  
  // 合并所有条件
  const searchConditions = [
    ...highPriorityConditions,
    ...mediumPriorityConditions,
    ...lowPriorityConditions
  ];
  
  return { $or: searchConditions };
}
```

**优点**：
- 搜索结果更准确，相关结果排在前面
- 优先级更明确

**缺点**：
- 代码复杂度增加

### 2.3 添加搜索结果评分机制

#### 方案：为搜索结果添加匹配度评分
```javascript
// 在查询后，为每个结果计算匹配度评分
function calculateMatchScore(location, searchTerm) {
  const searchLower = searchTerm.toLowerCase();
  const nameLower = (location.name || '').toLowerCase();
  const pinyinLower = (location.pinyin || '').toLowerCase();
  const enNameLower = (location.enName || '').toLowerCase();
  const codeLower = (location.code || '').toLowerCase();
  
  // 精确匹配（最高分）
  if (nameLower === searchLower) return 100;
  if (pinyinLower === searchLower) return 95;
  if (enNameLower === searchLower) return 90;
  if (codeLower === searchLower) return 85;
  
  // 前缀匹配
  if (nameLower.startsWith(searchLower)) return 80;
  if (pinyinLower.startsWith(searchLower)) return 75;
  if (enNameLower.startsWith(searchLower)) return 70;
  if (codeLower.startsWith(searchLower)) return 65;
  
  // 包含匹配
  if (nameLower.includes(searchLower)) return 50;
  if (pinyinLower.includes(searchLower)) return 45;
  if (enNameLower.includes(searchLower)) return 40;
  if (codeLower.includes(searchLower)) return 35;
  
  return 0;
}

// 在返回结果前，添加评分并排序
locations = locations.map(loc => ({
  ...loc,
  matchScore: calculateMatchScore(loc, searchTrimmed)
})).sort((a, b) => {
  // 先按匹配度排序，再按类型和名称排序
  if (b.matchScore !== a.matchScore) {
    return b.matchScore - a.matchScore;
  }
  return (a.type || '').localeCompare(b.type || '') || 
         (a.name || '').localeCompare(b.name || '');
});
```

**优点**：
- 搜索结果更准确，相关结果排在前面
- 与文本索引搜索的 `textScore` 类似，提供统一的评分机制

**缺点**：
- 需要额外的计算，可能影响性能（但影响很小）

### 2.4 优化搜索词处理

#### 方案：智能识别搜索词类型
```javascript
function processSearchTerm(searchTerm) {
  const trimmed = searchTerm.trim();
  
  // 检查是否是代码（2-4个大写字母或数字）
  if (/^[A-Z0-9]{2,4}$/i.test(trimmed)) {
    return {
      type: 'code',
      processed: trimmed.toUpperCase(),
      original: trimmed
    };
  }
  
  // 检查是否是拼音首字母（2-4个小写字母）
  if (/^[a-z]{2,4}$/.test(trimmed)) {
    return {
      type: 'pinyinInitials',
      processed: trimmed.toLowerCase(),
      original: trimmed
    };
  }
  
  // 检查是否是拼音（全小写字母，可能包含空格）
  if (/^[a-z\s]+$/i.test(trimmed)) {
    return {
      type: 'pinyin',
      processed: trimmed.toLowerCase().replace(/\s+/g, ''),
      original: trimmed
    };
  }
  
  // 检查是否是英文（包含大写字母）
  if (/^[A-Za-z\s]+$/.test(trimmed)) {
    return {
      type: 'english',
      processed: trimmed,
      original: trimmed
    };
  }
  
  // 默认：中文或其他
  return {
    type: 'chinese',
    processed: trimmed,
    original: trimmed
  };
}
```

**优点**：
- 根据搜索词类型采用不同的搜索策略
- 提高搜索准确性

**缺点**：
- 需要修改搜索逻辑，可能影响现有功能

### 2.5 改进子项搜索的匹配度计算

#### 方案：在子项搜索中添加拼音和英文匹配
```javascript
function buildChildrenAggregatePipeline(cityIds, maxChildren, searchTerm = '') {
  // ... 现有代码 ...
  
  if (hasSearchTerm) {
    const escapedSearch = searchLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    pipeline.push({
      $addFields: {
        matchScore: {
          $switch: {
            branches: [
              // 名称完全匹配（最高优先级）
              {
                case: { $eq: [{ $toLower: '$name' }, searchLower] },
                then: 100
              },
              // 拼音完全匹配（新增）
              {
                case: { $eq: [{ $toLower: { $ifNull: ['$pinyin', ''] } }, searchLower] },
                then: 95
              },
              // 英文名称完全匹配（新增）
              {
                case: { $eq: [{ $toLower: { $ifNull: ['$enName', ''] } }, searchLower] },
                then: 90
              },
              // 代码完全匹配
              {
                case: { $eq: [{ $toLower: { $ifNull: ['$code', ''] } }, searchLower] },
                then: 85
              },
              // 名称前缀匹配
              {
                case: { $regexMatch: { input: '$name', regex: `^${escapedSearch}`, options: 'i' } },
                then: 80
              },
              // 拼音前缀匹配（新增）
              {
                case: { $regexMatch: { input: { $ifNull: ['$pinyin', ''] }, regex: `^${escapedSearch}`, options: 'i' } },
                then: 75
              },
              // 英文名称前缀匹配（新增）
              {
                case: { $regexMatch: { input: { $ifNull: ['$enName', ''] }, regex: `^${escapedSearch}`, options: 'i' } },
                then: 70
              },
              // 代码前缀匹配
              {
                case: { $regexMatch: { input: { $ifNull: ['$code', ''] }, regex: `^${escapedSearch}`, options: 'i' } },
                then: 65
              },
              // 名称包含匹配
              {
                case: { $regexMatch: { input: '$name', regex: escapedSearch, options: 'i' } },
                then: 50
              },
              // 拼音包含匹配（新增）
              {
                case: { $regexMatch: { input: { $ifNull: ['$pinyin', ''] }, regex: escapedSearch, options: 'i' } },
                then: 45
              },
              // 英文名称包含匹配（新增）
              {
                case: { $regexMatch: { input: { $ifNull: ['$enName', ''] }, regex: escapedSearch, options: 'i' } },
                then: 40
              },
              // 代码包含匹配
              {
                case: { $regexMatch: { input: { $ifNull: ['$code', ''] }, regex: escapedSearch, options: 'i' } },
                then: 35
              }
            ],
            default: 0
          }
        }
      }
    });
  }
  
  // ... 现有代码 ...
}
```

**优点**：
- 子项搜索也能匹配拼音和英文
- 提高搜索准确性

**缺点**：
- 需要修改聚合管道，可能影响性能（但影响很小）

## 三、实施建议

### 3.1 优先级排序

1. **高优先级**（立即实施）：
   - 优化文本索引搜索，添加 `$language: 'none'`
   - 改进子项搜索的匹配度计算，添加拼音和英文匹配

2. **中优先级**（近期实施）：
   - 添加搜索结果评分机制
   - 优化正则表达式搜索的优先级

3. **低优先级**（长期优化）：
   - 添加拼音首字母匹配
   - 智能识别搜索词类型

### 3.2 测试建议

1. **测试用例**：
   - 输入完整拼音（如 "beijing"）
   - 输入部分拼音（如 "beij"）
   - 输入拼音首字母（如 "bj"）
   - 输入英文名称（如 "Beijing"）
   - 输入部分英文（如 "Beij"）
   - 输入中文名称（如 "北京"）

2. **性能测试**：
   - 测试搜索响应时间
   - 测试搜索结果数量
   - 测试搜索准确性

3. **数据完整性检查**：
   - 检查数据库中的 `pinyin` 和 `enName` 字段是否完整
   - 检查文本索引是否正确创建

## 四、预期效果

### 4.1 搜索准确性提升
- 拼音搜索准确率：从 60% 提升到 90%+
- 英文搜索准确率：从 70% 提升到 95%+
- 搜索结果相关性：提升 30-50%

### 4.2 用户体验改善
- 搜索结果更准确，相关结果排在前面
- 支持更多搜索方式（拼音首字母、部分拼音等）
- 搜索响应时间基本不变（或略有增加，但可接受）

### 4.3 性能影响
- 文本索引搜索：性能基本不变
- 正则表达式搜索：可能略有影响（但影响很小）
- 搜索结果评分：影响很小（毫秒级）

## 五、注意事项

1. **数据完整性**：
   - 确保数据库中的 `pinyin` 和 `enName` 字段完整
   - 定期检查和更新数据

2. **索引维护**：
   - 定期重建文本索引
   - 监控索引使用情况

3. **向后兼容**：
   - 确保现有功能不受影响
   - 逐步实施改进，避免一次性大改

4. **测试覆盖**：
   - 充分测试各种搜索场景
   - 确保搜索结果准确且性能可接受

