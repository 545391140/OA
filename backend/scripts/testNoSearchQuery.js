/**
 * 测试无搜索关键词的查询（这是前端地理位置管理页面的默认查询）
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function testNoSearchQuery() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    console.log('='.repeat(80));
    console.log('测试无搜索关键词的查询（模拟前端地理位置管理页面）');
    console.log('='.repeat(80));
    
    // 模拟前端请求：无搜索关键词，只有分页参数
    const testParams = {
      page: 1,
      limit: 20,
      status: 'active'
    };
    
    console.log('请求参数:', JSON.stringify(testParams, null, 2));
    
    // 模拟实际代码逻辑
    const { 
      type, 
      status, 
      search, 
      city, 
      country,
      page = 1,
      limit = 20,
      includeChildren = false,
      searchPriority = null
    } = testParams;
    
    const query = {};
    let useTextSearch = false;
    let statusMergedIntoOr = false;
    
    if (type) {
      query.type = type;
    }
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }
    
    if (search) {
      console.log('有搜索关键词，使用搜索逻辑...');
      // ... 搜索逻辑
    } else {
      console.log('无搜索关键词，直接添加 status...');
      if (status) {
        query.status = status;
      }
    }
    
    if (country) {
      if (useTextSearch && query.$text) {
        query.country = { $regex: country, $options: 'i' };
      } else if (query.$or && Array.isArray(query.$or)) {
        query.$or = query.$or.map(condition => ({
          ...condition,
          country: { $regex: country, $options: 'i' }
        }));
      } else {
        query.country = { $regex: country, $options: 'i' };
      }
    }
    
    const pageNum = parseInt(page, 10) || 1;
    const maxLimit = search ? 100 : 10000;
    const limitNum = Math.min(parseInt(limit, 10) || 20, maxLimit);
    const skip = (pageNum - 1) * limitNum;
    
    console.log('\n构建的查询:', JSON.stringify(query, null, 2));
    console.log(`分页: page=${pageNum}, limit=${limitNum}, skip=${skip}`);
    console.log(`useTextSearch: ${useTextSearch}`);
    console.log(`statusMergedIntoOr: ${statusMergedIntoOr}`);
    
    // 执行查询
    try {
      if (useTextSearch) {
        console.log('\n使用文本索引搜索...');
        // ... 文本搜索逻辑
      } else {
        console.log('\n使用普通查询...');
        
        // 直接使用 find 查询（无搜索关键词时）
        const total = await Location.countDocuments(query);
        const locations = await Location.find(query)
          .sort({ type: 1, name: 1 })
          .skip(skip)
          .limit(limitNum)
          .lean();
        
        console.log(`✓ 查询成功`);
        console.log(`  总数: ${total.toLocaleString()}`);
        console.log(`  返回: ${locations.length} 条`);
        
        if (locations.length > 0) {
          console.log(`  前5条:`);
          locations.slice(0, 5).forEach((loc, idx) => {
            console.log(`    [${idx + 1}] ${loc.name} (${loc.type}, ${loc.status})`);
          });
        }
      }
    } catch (error) {
      console.log(`✗ 查询失败: ${error.message}`);
      console.log(`  错误堆栈: ${error.stack}`);
    }
    
    console.log('\n✓ 测试完成');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

testNoSearchQuery();


