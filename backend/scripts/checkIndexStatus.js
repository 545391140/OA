/**
 * 检查 Location 集合的索引构建状态
 * 验证复合索引是否已构建完成
 * 
 * 使用方法：
 * node backend/scripts/checkIndexStatus.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Location = require('../models/Location');

async function checkIndexStatus() {
  try {
    console.log('正在连接数据库...');
    await connectDB();
    console.log('✓ 数据库连接成功\n');

    const collection = Location.collection;
    const db = mongoose.connection.db;

    // 1. 检查所有索引
    console.log('=== 检查所有索引 ===');
    const indexes = await collection.indexes();
    
    console.log(`\n共找到 ${indexes.length} 个索引：\n`);
    
    indexes.forEach((idx, index) => {
      const keys = Object.keys(idx.key || {});
      const keyStr = keys.map(k => `${k}_${idx.key[k]}`).join('_');
      console.log(`${index + 1}. ${idx.name || keyStr}`);
      console.log(`   键: ${JSON.stringify(idx.key)}`);
      if (idx.background !== undefined) {
        console.log(`   后台构建: ${idx.background}`);
      }
      if (idx.v !== undefined) {
        console.log(`   版本: ${idx.v}`);
      }
      console.log('');
    });

    // 2. 检查目标复合索引
    console.log('=== 检查目标复合索引 ===\n');
    
    const pinyinStatusIndex = indexes.find(idx => 
      idx.key && idx.key.pinyin === 1 && idx.key.status === 1
    );
    const enNameStatusIndex = indexes.find(idx => 
      idx.key && idx.key.enName === 1 && idx.key.status === 1
    );
    
    if (pinyinStatusIndex) {
      console.log('✓ pinyin_1_status_1 索引存在');
      console.log(`  索引名称: ${pinyinStatusIndex.name}`);
      console.log(`  索引键: ${JSON.stringify(pinyinStatusIndex.key)}`);
    } else {
      console.log('✗ pinyin_1_status_1 索引不存在');
      console.log('  需要运行: node backend/scripts/addCompositeIndexes.js');
    }
    
    console.log('');
    
    if (enNameStatusIndex) {
      console.log('✓ enName_1_status_1 索引存在');
      console.log(`  索引名称: ${enNameStatusIndex.name}`);
      console.log(`  索引键: ${JSON.stringify(enNameStatusIndex.key)}`);
    } else {
      console.log('✗ enName_1_status_1 索引不存在');
      console.log('  需要运行: node backend/scripts/addCompositeIndexes.js');
    }

    // 3. 检查索引构建进度
    console.log('\n=== 检查索引构建进度 ===');
    try {
      const currentOps = await db.admin().command({
        currentOp: true,
        $or: [
          { "command.createIndexes": { $exists: true } },
          { op: "command", "command.createIndexes": { $exists: true } }
        ]
      });
      
      if (currentOps.inprog && currentOps.inprog.length > 0) {
        console.log('⚠ 发现正在构建的索引：');
        currentOps.inprog.forEach(op => {
          console.log(`  操作 ID: ${op.opid}`);
          console.log(`  集合: ${op.ns}`);
          console.log(`  命令: ${JSON.stringify(op.command)}`);
          if (op.secs_running !== undefined) {
            console.log(`  运行时间: ${op.secs_running} 秒`);
          }
        });
      } else {
        console.log('✓ 没有正在构建的索引');
        console.log('  所有索引构建已完成');
      }
    } catch (error) {
      // currentOp 可能需要特殊权限，如果失败则跳过
      console.log('⚠ 无法检查构建进度（可能需要管理员权限）');
      console.log(`  错误: ${error.message}`);
    }

    // 4. 检查集合统计信息
    console.log('\n=== 集合统计信息 ===');
    try {
      const stats = await collection.stats();
      console.log(`集合名称: ${stats.ns}`);
      console.log(`文档数: ${stats.count.toLocaleString()}`);
      console.log(`集合大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`索引数量: ${stats.nindexes}`);
      console.log(`索引总大小: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
      
      // 估算索引构建时间（粗略估算）
      if (stats.count > 0) {
        const estimatedTimeMinutes = Math.ceil(stats.count / 100000); // 假设每分钟构建10万条
        console.log(`\n估算索引构建时间: 约 ${estimatedTimeMinutes} 分钟（基于文档数估算）`);
      }
    } catch (error) {
      console.error('✗ 无法获取集合统计信息:', error.message);
    }

    // 5. 测试查询性能（验证索引是否生效）
    console.log('\n=== 测试查询性能 ===');
    const testQueries = [
      {
        name: '拼音前缀匹配 + status',
        query: { pinyin: { $regex: '^beijing', $options: 'i' }, status: 'active' },
        hint: { pinyin: 1, status: 1 }
      },
      {
        name: '英文前缀匹配 + status',
        query: { enName: { $regex: '^Beijing', $options: 'i' }, status: 'active' },
        hint: { enName: 1, status: 1 }
      }
    ];

    for (const test of testQueries) {
      try {
        console.log(`\n测试: ${test.name}`);
        
        // 不使用 hint
        const start1 = Date.now();
        const explain1 = await Location.find(test.query).limit(10).explain('executionStats');
        const time1 = Date.now() - start1;
        
        const findIndexName = (stage) => {
          if (stage.indexName) return stage.indexName;
          if (stage.inputStage) return findIndexName(stage.inputStage);
          if (stage.inputStages) {
            for (const s of stage.inputStages) {
              const idx = findIndexName(s);
              if (idx) return idx;
            }
          }
          return null;
        };
        
        const indexUsed1 = findIndexName(explain1.executionStats.executionStages) || '无索引';
        const docsExamined1 = explain1.executionStats.totalDocsExamined || 0;
        
        console.log(`  不使用 hint:`);
        console.log(`    使用索引: ${indexUsed1}`);
        console.log(`    扫描文档数: ${docsExamined1.toLocaleString()}`);
        console.log(`    查询耗时: ${time1}ms`);
        
        // 使用 hint
        if (pinyinStatusIndex || enNameStatusIndex) {
          const start2 = Date.now();
          const explain2 = await Location.find(test.query).hint(test.hint).limit(10).explain('executionStats');
          const time2 = Date.now() - start2;
          
          const indexUsed2 = findIndexName(explain2.executionStats.executionStages) || '无索引';
          const docsExamined2 = explain2.executionStats.totalDocsExamined || 0;
          
          console.log(`  使用 hint (${JSON.stringify(test.hint)}):`);
          console.log(`    使用索引: ${indexUsed2}`);
          console.log(`    扫描文档数: ${docsExamined2.toLocaleString()}`);
          console.log(`    查询耗时: ${time2}ms`);
          
          if (docsExamined2 < docsExamined1) {
            const improvement = ((docsExamined1 - docsExamined2) / docsExamined1 * 100).toFixed(1);
            console.log(`    ✓ 性能提升: 扫描文档数减少 ${improvement}%`);
          }
        }
      } catch (error) {
        console.error(`  ✗ 测试失败:`, error.message);
      }
    }

    // 6. 建议
    console.log('\n=== 优化建议 ===');
    if (!pinyinStatusIndex || !enNameStatusIndex) {
      console.log('1. 创建缺失的复合索引:');
      console.log('   node backend/scripts/addCompositeIndexes.js');
    }
    
    if (pinyinStatusIndex && enNameStatusIndex) {
      console.log('1. ✓ 所有复合索引已创建');
      console.log('2. 如果查询性能仍然不佳，可以：');
      console.log('   - 等待索引构建完成（如果还在构建中）');
      console.log('   - 重启 MongoDB 服务以更新查询优化器统计信息');
      console.log('   - 代码中已添加 hint() 支持，会自动使用最优索引');
    }

    console.log('\n✓ 索引状态检查完成');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ 错误:', error.message);
    console.error(error.stack);
    await mongoose.connection.close();
    process.exit(1);
  }
}

checkIndexStatus();











