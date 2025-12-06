/**
 * 测试地理位置 API，使用实际的前端请求参数
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function testLocationAPIWithParams() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    console.log('='.repeat(80));
    console.log('测试地理位置 API（模拟前端请求）');
    console.log('='.repeat(80));
    
    // 模拟前端请求参数
    const testCases = [
      {
        name: '基本查询（无参数）',
        params: {}
      },
      {
        name: '带 status=active',
        params: { status: 'active' }
      },
      {
        name: '带分页参数',
        params: { page: 1, limit: 20, status: 'active' }
      },
      {
        name: '带 type 过滤',
        params: { type: 'city', status: 'active', page: 1, limit: 20 }
      },
      {
        name: '带搜索关键词',
        params: { search: '北京', status: 'active', page: 1, limit: 20 }
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n【测试】${testCase.name}`);
      console.log('-'.repeat(80));
      console.log('请求参数:', JSON.stringify(testCase.params, null, 2));
      
      try {
        // 模拟实际代码的查询逻辑
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
          const searchTrimmed = search.trim();
          
          // 这里需要复制 buildTextSearchQuery 和 buildRegexSearchQuery 函数
          // 为了简化，直接测试查询
          const textSearchQuery = {
            $text: { 
              $search: searchTrimmed,
              $language: 'none'
            }
          };
          
          try {
            query.$text = textSearchQuery.$text;
            useTextSearch = true;
            if (status) {
              query.status = status;
            }
          } catch (error) {
            // 文本搜索失败，使用正则表达式
            useTextSearch = false;
          }
        } else {
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
        
        console.log('构建的查询:', JSON.stringify(query, null, 2));
        console.log(`分页: page=${pageNum}, limit=${limitNum}, skip=${skip}`);
        
        // 执行查询
        let total, locations;
        
        if (useTextSearch) {
          try {
            total = await Location.countDocuments(query);
            locations = await Location.find(query)
              .select({ score: { $meta: 'textScore' } })
              .sort({ score: { $meta: 'textScore' }, type: 1, name: 1 })
              .skip(skip)
              .limit(limitNum)
              .lean();
            
            if (locations.length === 0) {
              // 降级使用正则表达式
              console.log('文本搜索无结果，降级使用正则表达式...');
              useTextSearch = false;
              throw new Error('No results from text search');
            }
          } catch (error) {
            if (error.message.includes('text index') || error.message.includes('No results')) {
              useTextSearch = false;
              // 继续使用正则表达式
            } else {
              throw error;
            }
          }
        }
        
        if (!useTextSearch) {
          // 使用正则表达式搜索
          total = await Location.countDocuments(query);
          locations = await Location.find(query)
            .sort({ type: 1, name: 1 })
            .skip(skip)
            .limit(limitNum)
            .lean();
        }
        
        console.log(`✓ 查询成功`);
        console.log(`  总数: ${total.toLocaleString()}`);
        console.log(`  返回: ${locations.length} 条`);
        
        if (locations.length > 0) {
          console.log(`  前3条:`);
          locations.slice(0, 3).forEach((loc, idx) => {
            console.log(`    [${idx + 1}] ${loc.name} (${loc.type})`);
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

testLocationAPIWithParams();


