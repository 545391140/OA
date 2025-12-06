/**
 * 测试修复后的 API（模拟前端请求）
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function testFixedAPI() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    console.log('='.repeat(80));
    console.log('测试修复后的 API（模拟前端请求）');
    console.log('='.repeat(80));
    
    // 测试三个失败的请求
    const testCases = [
      {
        name: '请求1: page=1&limit=20',
        params: { page: 1, limit: 20 }
      },
      {
        name: '请求2: type=city&status=active',
        params: { type: 'city', status: 'active' }
      },
      {
        name: '请求3: status=active&limit=10000',
        params: { status: 'active', limit: 10000 }
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n【测试】${testCase.name}`);
      console.log('-'.repeat(80));
      console.log('请求参数:', JSON.stringify(testCase.params, null, 2));
      
      try {
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
        } = testCase.params;
        
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
          // 有搜索关键词的逻辑（这里不测试）
        } else {
          if (status) {
            query.status = status;
          }
        }
        
        if (country) {
          query.country = { $regex: country, $options: 'i' };
        }
        
        const pageNum = parseInt(page, 10) || 1;
        const maxLimit = search ? 100 : 10000;
        const limitNum = Math.min(parseInt(limit, 10) || 20, maxLimit);
        const skip = (pageNum - 1) * limitNum;
        const includeChildrenFlag = includeChildren === 'true' || includeChildren === true;
        
        console.log('构建的查询:', JSON.stringify(query, null, 2));
        console.log(`分页: page=${pageNum}, limit=${limitNum}, skip=${skip}`);
        console.log(`useTextSearch: ${useTextSearch}`);
        console.log(`search: ${search || 'undefined'}`);
        
        // 执行查询（模拟修复后的逻辑）
        let total, locations, sortOptions = { type: 1, name: 1 };
        
        if (useTextSearch) {
          console.log('使用文本索引搜索...');
          // 文本搜索逻辑（这里不测试）
        } else {
          // 没有搜索关键词时，直接使用简单查询
          if (!search) {
            console.log('✓ 使用简单查询（无搜索关键词）');
            total = await Location.countDocuments(query);
            locations = await Location.find(query)
              .sort(sortOptions)
              .skip(skip)
              .limit(limitNum)
              .lean();
          } else {
            console.log('使用正则表达式搜索...');
            // 正则表达式搜索逻辑（这里不测试）
          }
        }
        
        console.log(`\n✓ 查询成功`);
        console.log(`  总数: ${total.toLocaleString()}`);
        console.log(`  返回: ${locations.length} 条`);
        
        if (locations.length > 0) {
          console.log(`  前3条:`);
          locations.slice(0, 3).forEach((loc, idx) => {
            console.log(`    [${idx + 1}] ${loc.name} (${loc.type}, ${loc.status})`);
          });
        }
      } catch (error) {
        console.log(`✗ 查询失败: ${error.message}`);
        console.log(`  错误堆栈: ${error.stack}`);
      }
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

testFixedAPI();


