# 酒店搜索优化说明

## 问题分析

### 问题：搜索"北京"只有一个酒店

**可能原因：**

1. **城市代码问题**
   - "北京"的城市代码应该是 `BJS`（Beijing）
   - 如果 RegionSelector 返回的城市代码不正确，会导致搜索失败或结果很少

2. **酒店数量限制**
   - 原代码只取前10个酒店ID进行报价搜索
   - 如果这10个酒店在指定日期没有可用报价，结果就会很少

3. **报价可用性**
   - 即使找到了多个酒店，在指定日期可能只有少数酒店有可用报价
   - Amadeus API 只返回有可用房间的酒店报价

## 优化方案

### 1. 增加搜索的酒店数量
- **修改前**：只取前10个酒店ID
- **修改后**：增加到20个酒店ID
- **原因**：提高找到可用报价的概率

### 2. 添加调试日志
- 记录找到的酒店总数
- 记录用于报价搜索的酒店ID数量
- 记录最终找到的报价数量
- **用途**：帮助诊断搜索问题

### 3. 改进错误提示
- 当未找到酒店时，提示用户检查城市代码
- 当报价数量少于酒店数量时，给出信息提示
- **用途**：帮助用户理解搜索结果

### 4. 常见城市代码参考

| 城市 | 城市代码 | 说明 |
|------|---------|------|
| 北京 | BJS | Beijing |
| 上海 | SHA | Shanghai |
| 广州 | CAN | Guangzhou |
| 深圳 | SZX | Shenzhen |
| 成都 | CTU | Chengdu |
| 杭州 | HGH | Hangzhou |
| 纽约 | NYC | New York |
| 巴黎 | PAR | Paris |
| 伦敦 | LON | London |
| 东京 | TYO | Tokyo |

## 代码修改

### 修改文件：`frontend/src/pages/Flight/FlightSearch.js`

**主要改动：**

1. **增加搜索酒店数量**
```javascript
// 修改前
const hotelIds = hotels.slice(0, 10).map(h => h.hotelId).filter(Boolean);

// 修改后
const hotelIds = hotels.slice(0, 20).map(h => h.hotelId).filter(Boolean);
```

2. **添加调试日志**
```javascript
console.log(`🔍 找到 ${hotels.length} 个酒店（城市代码: ${params.cityCode}）`);
console.log(`📋 提取了 ${hotelIds.length} 个酒店ID用于报价搜索`);
console.log(`💰 找到 ${results.length} 个酒店报价（从 ${hotelIds.length} 个酒店中）`);
```

3. **改进通知提示**
```javascript
// 如果报价数量少于酒店数量，提示用户
if (results.length < hotelIds.length && results.length > 0) {
  showNotification(`找到 ${results.length} 个酒店报价（共 ${hotels.length} 个酒店，其中 ${hotelIds.length} 个已查询）`, 'info');
} else if (results.length === 0) {
  showNotification(`未找到可用报价（已查询 ${hotelIds.length} 个酒店）`, 'warning');
} else {
  showNotification(`找到 ${results.length} 个酒店报价`, 'success');
}
```

## 使用建议

### 1. 确认城市代码
- 使用 RegionSelector 选择城市时，确保选择的是正确的城市
- 如果搜索结果很少，检查浏览器控制台的日志，确认城市代码是否正确

### 2. 调整搜索日期
- 如果搜索结果很少，尝试调整入住/退房日期
- 某些日期可能酒店可用性较低

### 3. 查看调试日志
- 打开浏览器开发者工具（F12）
- 查看 Console 标签中的日志信息
- 了解搜索过程中各阶段的数据

## 进一步优化建议

### 1. 动态调整搜索数量
- 如果第一次搜索结果很少，可以自动增加搜索的酒店数量
- 或者允许用户手动调整搜索范围

### 2. 添加重试机制
- 如果报价搜索失败，可以重试
- 或者尝试分批搜索酒店报价

### 3. 缓存搜索结果
- 缓存城市酒店列表，避免重复请求
- 缓存报价结果，提高响应速度

### 4. 支持地理坐标搜索
- 如果城市代码搜索失败，可以尝试使用地理坐标搜索
- 提供更灵活的搜索方式

---

**文档版本**: 1.0  
**创建日期**: 2025-12-21  
**最后更新**: 2025-12-21

