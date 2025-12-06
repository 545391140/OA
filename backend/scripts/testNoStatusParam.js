/**
 * 测试没有 status 参数的请求（page=1&limit=20）
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function testNoStatusParam() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    console.log('='.repeat(80));
    console.log('测试没有 status 参数的请求');
    console.log('='.repeat(80));
    
    // 模拟前端请求：只有 page 和 limit，没有 status
    const reqQuery = {
      page: 1,
      limit: 20
    };
    
    console.log('请求参数:', JSON.stringify(reqQuery, null, 2));
    
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
    } = reqQuery;
    
    console.log('\n解析后的参数:');
    console.log(`  type: ${type || 'undefined'}`);
    console.log(`  status: ${status || 'undefined'}`);
    console.log(`  search: ${search || 'undefined'}`);
    console.log(`  page: ${page}`);
    console.log(`  limit: ${limit}`);
    
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
      console.log('\n有搜索关键词...');
    } else {
      console.log('\n无搜索关键词');
      if (status) {
        query.status = status;
        console.log(`  添加 status: ${status}`);
      } else {
        console.log('  没有 status 参数，不添加 status 条件');
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
    
    console.log('\n构建的查询:', JSON.stringify(query, null, 2));
    console.log(`分页: page=${pageNum}, limit=${limitNum}, skip=${skip}`);
    console.log(`useTextSearch: ${useTextSearch}`);
    
    // 执行查询
    let total, locations, sortOptions = { type: 1, name: 1 };
    
    try {
      if (useTextSearch) {
        console.log('\n使用文本索引搜索...');
        // 文本搜索逻辑
      } else {
        // 没有搜索关键词时，直接使用简单查询
        if (!search) {
          console.log('\n✓ 使用简单查询（无搜索关键词）');
          console.log('查询条件:', JSON.stringify(query, null, 2));
          
          total = await Location.countDocuments(query);
          console.log(`总数: ${total.toLocaleString()}`);
          
          locations = await Location.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limitNum)
            .lean();
          
          console.log(`返回: ${locations.length} 条`);
          
          if (locations.length > 0) {
            console.log('\n前5条数据:');
            locations.slice(0, 5).forEach((loc, idx) => {
              console.log(`  [${idx + 1}] ${loc.name} (${loc.type}, ${loc.status || 'N/A'})`);
            });
          }
        } else {
          console.log('\n使用正则表达式搜索...');
          // 正则表达式搜索逻辑
        }
      }
      
      // 如果需要包含子项
      if (includeChildrenFlag) {
        console.log('\n处理 includeChildren...');
        const cityIds = locations
          .filter(loc => loc.type === 'city' && loc._id)
          .map(loc => loc._id);
        
        if (cityIds.length > 0) {
          const childrenLocations = await Location.find({
            parentId: { $in: cityIds },
            status: 'active'
          })
          .sort({ type: 1, name: 1 })
          .lean();
          
          locations = [...locations, ...childrenLocations];
          console.log(`添加子项后: ${locations.length} 条`);
        }
      }
      
      console.log('\n✓ 查询成功');
      console.log(`  总数: ${total.toLocaleString()}`);
      console.log(`  返回: ${locations.length} 条`);
      
    } catch (error) {
      console.log(`\n✗ 查询失败: ${error.message}`);
      console.log(`  错误堆栈: ${error.stack}`);
      throw error;
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

testNoStatusParam();


