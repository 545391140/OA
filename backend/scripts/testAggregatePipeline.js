/**
 * 测试聚合管道中的 $addFields 和排序是否正常工作
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function testAggregatePipeline() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    const searchTerm = 'Tokyo';
    const status = 'active';
    const escapedTrimmed = 'Tokyo';
    const escapedLower = 'tokyo';
    
    console.log('='.repeat(80));
    console.log('测试聚合管道中的 $addFields 和排序');
    console.log('='.repeat(80));
    
    // 测试 1: 不带 $addFields 的查询
    console.log('\n【测试 1】不带 $addFields 的查询');
    console.log('-'.repeat(80));
    const pipeline1 = [
      {
        $match: {
          status: 'active',
          $or: [
            { enName: { $regex: '^Tokyo', $options: 'i' } }
          ]
        }
      },
      { $limit: 5 }
    ];
    
    try {
      const result1 = await Location.aggregate(pipeline1);
      console.log(`✓ 查询成功，找到 ${result1.length} 条结果`);
      if (result1.length > 0) {
        console.log(`  第一条数据字段: ${Object.keys(result1[0]).join(', ')}`);
        console.log(`  是否有 matchScore: ${'matchScore' in result1[0]}`);
      }
    } catch (error) {
      console.log(`✗ 查询失败: ${error.message}`);
    }
    
    // 测试 2: 带 $addFields 但不排序
    console.log('\n【测试 2】带 $addFields 但不排序');
    console.log('-'.repeat(80));
    const pipeline2 = [
      {
        $match: {
          status: 'active',
          $or: [
            { enName: { $regex: '^Tokyo', $options: 'i' } }
          ]
        }
      },
      {
        $addFields: {
          matchScore: {
            $cond: [
              { $eq: [{ $toLower: { $ifNull: ['$enName', ''] } }, escapedLower] },
              100,
              {
                $cond: [
                  { $regexMatch: { input: { $toLower: { $ifNull: ['$enName', ''] } }, regex: `^${escapedLower}`, options: 'i' } },
                  80,
                  0
                ]
              }
            ]
          }
        }
      },
      { $limit: 5 }
    ];
    
    try {
      const result2 = await Location.aggregate(pipeline2);
      console.log(`✓ 查询成功，找到 ${result2.length} 条结果`);
      if (result2.length > 0) {
        console.log(`  第一条数据字段: ${Object.keys(result2[0]).join(', ')}`);
        console.log(`  是否有 matchScore: ${'matchScore' in result2[0]}`);
        console.log(`  matchScore 值: ${result2[0].matchScore}`);
        console.log(`  完整数据:`, JSON.stringify(result2[0], null, 2));
      }
    } catch (error) {
      console.log(`✗ 查询失败: ${error.message}`);
      console.log(`  错误堆栈: ${error.stack}`);
    }
    
    // 测试 3: 带 $addFields 并排序
    console.log('\n【测试 3】带 $addFields 并排序');
    console.log('-'.repeat(80));
    const pipeline3 = [
      {
        $match: {
          status: 'active',
          $or: [
            { enName: { $regex: '^Tokyo', $options: 'i' } }
          ]
        }
      },
      {
        $addFields: {
          matchScore: {
            $cond: [
              { $eq: [{ $toLower: { $ifNull: ['$enName', ''] } }, escapedLower] },
              100,
              {
                $cond: [
                  { $regexMatch: { input: { $toLower: { $ifNull: ['$enName', ''] } }, regex: `^${escapedLower}`, options: 'i' } },
                  80,
                  0
                ]
              }
            ]
          }
        }
      },
      { $sort: { matchScore: -1, type: 1, name: 1 } },
      { $limit: 5 }
    ];
    
    try {
      const result3 = await Location.aggregate(pipeline3);
      console.log(`✓ 查询成功，找到 ${result3.length} 条结果`);
      if (result3.length > 0) {
        console.log(`  第一条数据字段: ${Object.keys(result3[0]).join(', ')}`);
        console.log(`  是否有 matchScore: ${'matchScore' in result3[0]}`);
        console.log(`  matchScore 值: ${result3[0].matchScore}`);
        console.log(`  完整数据:`, JSON.stringify(result3[0], null, 2));
      }
    } catch (error) {
      console.log(`✗ 查询失败: ${error.message}`);
      console.log(`  错误堆栈: ${error.stack}`);
    }
    
    // 测试 4: 检查 $regexMatch 是否支持
    console.log('\n【测试 4】检查 $regexMatch 是否支持');
    console.log('-'.repeat(80));
    try {
      const adminDb = mongoose.connection.db.admin();
      const serverStatus = await adminDb.serverStatus();
      const versionParts = serverStatus.version.split('.').map(Number);
      const majorVersion = versionParts[0];
      const minorVersion = versionParts[1];
      
      console.log(`MongoDB 版本: ${serverStatus.version}`);
      if (majorVersion > 4 || (majorVersion === 4 && minorVersion >= 2)) {
        console.log('✓ $regexMatch 支持（MongoDB 4.2+）');
      } else {
        console.log(`⚠ $regexMatch 可能不支持（需要 MongoDB 4.2+，当前 ${serverStatus.version}）`);
      }
    } catch (error) {
      console.log(`⚠ 无法获取服务器状态: ${error.message}`);
    }
    
    // 测试 5: 测试实际的完整管道（模拟实际代码）
    console.log('\n【测试 5】测试实际的完整管道（模拟实际代码）');
    console.log('-'.repeat(80));
    const actualPipeline = [
      {
        $match: {
          status: 'active',
          $or: [
            { enName: { $regex: '^Tokyo$', $options: 'i' } },
            { pinyin: { $regex: '^tokyo$', $options: 'i' } },
            { enName: { $regex: '^Tokyo', $options: 'i' } },
            { pinyin: { $regex: '^tokyo', $options: 'i' } }
          ]
        }
      },
      {
        $addFields: {
          matchScore: {
            $cond: [
              { $or: [
                { $eq: [{ $toLower: { $ifNull: ['$pinyin', ''] } }, escapedLower] },
                { $eq: [{ $toLower: { $ifNull: ['$enName', ''] } }, escapedLower] }
              ]},
              100,
              {
                $cond: [
                  { $or: [
                    { $regexMatch: { input: { $toLower: { $ifNull: ['$pinyin', ''] } }, regex: `^${escapedLower}`, options: 'i' } },
                    { $regexMatch: { input: { $toLower: { $ifNull: ['$enName', ''] } }, regex: `^${escapedTrimmed}`, options: 'i' } }
                  ]},
                  80,
                  0
                ]
              }
            ]
          }
        }
      },
      { $sort: { matchScore: -1, type: 1, name: 1 } },
      { $skip: 0 },
      { $limit: 20 }
    ];
    
    console.log('完整管道:');
    console.log(JSON.stringify(actualPipeline, null, 2));
    
    try {
      const result5 = await Location.aggregate(actualPipeline);
      console.log(`\n✓ 查询成功，找到 ${result5.length} 条结果`);
      if (result5.length > 0) {
        result5.forEach((loc, idx) => {
          console.log(`\n  [${idx + 1}] ${loc.name}`);
          console.log(`      matchScore: ${loc.matchScore !== undefined ? loc.matchScore : 'N/A'}`);
          console.log(`      enName: ${loc.enName}`);
          console.log(`      pinyin: ${loc.pinyin}`);
        });
      } else {
        console.log('\n✗ 查询返回空结果！');
      }
    } catch (error) {
      console.log(`\n✗ 查询失败: ${error.message}`);
      console.log(`  错误堆栈: ${error.stack}`);
      
      // 如果是因为 matchScore 字段不存在导致的排序错误，尝试修复
      if (error.message.includes('matchScore') || error.message.includes('sort')) {
        console.log('\n尝试修复：先添加 matchScore，再排序');
        const fixedPipeline = [
          ...actualPipeline.slice(0, 2), // $match 和 $addFields
          { $sort: { matchScore: -1, type: 1, name: 1 } },
          { $skip: 0 },
          { $limit: 20 }
        ];
        
        try {
          const fixedResult = await Location.aggregate(fixedPipeline);
          console.log(`✓ 修复后查询成功，找到 ${fixedResult.length} 条结果`);
        } catch (fixedError) {
          console.log(`✗ 修复后仍然失败: ${fixedError.message}`);
        }
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

testAggregatePipeline();


