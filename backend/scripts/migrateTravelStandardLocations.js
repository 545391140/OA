/**
 * 数据迁移脚本：将差旅标准中的城市和国家名称转换为 Location ID
 * 
 * 问题：差旅标准使用城市名称关联地理位置，当名称变更后匹配失效
 * 解决方案：为现有标准添加 locationIds 字段，通过名称查找对应的 Location ID
 * 
 * 使用方法：
 * node backend/scripts/migrateTravelStandardLocations.js
 * 
 * 注意事项：
 * 1. 建议在生产环境执行前先备份数据库
 * 2. 脚本支持 dry-run 模式（不实际修改数据）
 * 3. 脚本会输出详细的迁移日志
 */

const mongoose = require('mongoose');
const path = require('path');

// 加载环境变量和配置
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const config = require('../config');

const TravelStandard = require('../models/TravelStandard');
const Location = require('../models/Location');

// 命令行参数
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('-d');
const verbose = args.includes('--verbose') || args.includes('-v');

// 统计信息
const stats = {
  totalStandards: 0,
  processedStandards: 0,
  updatedConditions: 0,
  skippedConditions: 0,
  failedConditions: 0,
  cityMatches: 0,
  countryMatches: 0,
  cityNotFound: [],
  countryNotFound: []
};

/**
 * 通过名称查找 Location ID
 */
async function findLocationId(name, type) {
  if (!name || !name.trim()) {
    return null;
  }

  const trimmedName = name.trim();
  
  try {
    const location = await Location.findOne({
      $or: [
        { name: trimmedName },
        { city: trimmedName },
        { country: trimmedName }
      ],
      type: type,
      status: 'active'
    });

    return location ? location._id : null;
  } catch (error) {
    console.error(`[ERROR] Failed to find location for ${type} "${trimmedName}":`, error.message);
    return null;
  }
}

/**
 * 迁移单个条件的 Location ID
 */
async function migrateCondition(condition, standardCode) {
  const { type, value, locationIds } = condition;

  // 只处理 city 和 country 类型
  if (type !== 'city' && type !== 'country') {
    return { updated: false, reason: 'not_location_type' };
  }

  // 如果已经有 locationIds，跳过（避免重复迁移）
  if (locationIds && Array.isArray(locationIds) && locationIds.length > 0) {
    if (verbose) {
      console.log(`  [SKIP] Condition already has locationIds: ${value}`);
    }
    stats.skippedConditions++;
    return { updated: false, reason: 'already_has_ids' };
  }

  // 解析条件值（支持逗号分隔的多个值）
  const names = value.split(',').map(v => v.trim()).filter(v => v);
  
  if (names.length === 0) {
    return { updated: false, reason: 'empty_value' };
  }

  // 查找每个名称对应的 Location ID
  const foundIds = [];
  const notFoundNames = [];

  for (const name of names) {
    const locationId = await findLocationId(name, type);
    
    if (locationId) {
      foundIds.push(locationId);
      if (type === 'city') {
        stats.cityMatches++;
      } else {
        stats.countryMatches++;
      }
      
      if (verbose) {
        console.log(`    [MATCH] ${type} "${name}" -> ${locationId}`);
      }
    } else {
      notFoundNames.push(name);
      if (type === 'city') {
        stats.cityNotFound.push({ standardCode, name, type });
      } else {
        stats.countryNotFound.push({ standardCode, name, type });
      }
      
      if (verbose) {
        console.log(`    [NOT_FOUND] ${type} "${name}"`);
      }
    }
  }

  // 如果找到了至少一个 Location ID，更新条件
  if (foundIds.length > 0) {
    condition.locationIds = foundIds;
    stats.updatedConditions++;
    
    if (verbose) {
      console.log(`  [UPDATE] Condition "${value}" -> ${foundIds.length} Location IDs`);
    }
    
    return { 
      updated: true, 
      foundIds: foundIds.length, 
      notFoundNames: notFoundNames.length > 0 ? notFoundNames : null
    };
  } else {
    stats.failedConditions++;
    return { 
      updated: false, 
      reason: 'no_location_found', 
      notFoundNames 
    };
  }
}

/**
 * 迁移单个差旅标准
 */
async function migrateStandard(standard) {
  stats.totalStandards++;
  
  console.log(`\n[${stats.totalStandards}] Processing standard: ${standard.standardCode} (${standard.standardName})`);
  
  let hasUpdates = false;
  const updateResults = [];

  // 遍历所有条件组
  for (let groupIndex = 0; groupIndex < standard.conditionGroups.length; groupIndex++) {
    const group = standard.conditionGroups[groupIndex];
    
    // 遍历组内所有条件
    for (let condIndex = 0; condIndex < group.conditions.length; condIndex++) {
      const condition = group.conditions[condIndex];
      const result = await migrateCondition(condition, standard.standardCode);
      
      if (result.updated) {
        hasUpdates = true;
        updateResults.push({
          groupIndex,
          condIndex,
          type: condition.type,
          value: condition.value,
          foundIds: result.foundIds,
          notFoundNames: result.notFoundNames
        });
      }
    }
  }

  // 如果有更新，保存标准
  if (hasUpdates && !isDryRun) {
    try {
      await standard.save();
      stats.processedStandards++;
      console.log(`  [SUCCESS] Standard updated with ${updateResults.length} conditions`);
      
      if (verbose) {
        updateResults.forEach(result => {
          console.log(`    - ${result.type}: "${result.value}" -> ${result.foundIds} IDs`);
          if (result.notFoundNames) {
            console.log(`      Warning: Could not find: ${result.notFoundNames.join(', ')}`);
          }
        });
      }
    } catch (error) {
      console.error(`  [ERROR] Failed to save standard:`, error.message);
      return false;
    }
  } else if (hasUpdates && isDryRun) {
    stats.processedStandards++;
    console.log(`  [DRY-RUN] Would update ${updateResults.length} conditions`);
    
    if (verbose) {
      updateResults.forEach(result => {
        console.log(`    - ${result.type}: "${result.value}" -> ${result.foundIds} IDs`);
      });
    }
  } else {
    console.log(`  [SKIP] No updates needed`);
  }

  return true;
}

/**
 * 主函数
 */
async function main() {
  try {
    // 连接数据库
    console.log('Connecting to database...');
    const mongoUri = process.env.MONGODB_URI || config.MONGODB_URI || 'mongodb://localhost:27017/travel-expense-system';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Database connected successfully');

    if (isDryRun) {
      console.log('\n⚠️  DRY-RUN MODE: No data will be modified\n');
    }

    // 查找所有有城市或国家条件的差旅标准
    console.log('Finding travel standards with city or country conditions...');
    const standards = await TravelStandard.find({
      'conditionGroups.conditions': {
        $elemMatch: {
          type: { $in: ['city', 'country'] }
        }
      }
    });

    console.log(`Found ${standards.length} standards to process\n`);

    if (standards.length === 0) {
      console.log('No standards to migrate. Exiting.');
      await mongoose.connection.close();
      return;
    }

    // 迁移每个标准
    for (const standard of standards) {
      await migrateStandard(standard);
    }

    // 输出统计信息
    console.log('\n' + '='.repeat(60));
    console.log('Migration Summary');
    console.log('='.repeat(60));
    console.log(`Total standards processed: ${stats.totalStandards}`);
    console.log(`Standards updated: ${stats.processedStandards}`);
    console.log(`Conditions updated: ${stats.updatedConditions}`);
    console.log(`Conditions skipped: ${stats.skippedConditions}`);
    console.log(`Conditions failed: ${stats.failedConditions}`);
    console.log(`City matches: ${stats.cityMatches}`);
    console.log(`Country matches: ${stats.countryMatches}`);

    if (stats.cityNotFound.length > 0) {
      console.log(`\n⚠️  Cities not found (${stats.cityNotFound.length}):`);
      const uniqueCities = [...new Set(stats.cityNotFound.map(item => item.name))];
      uniqueCities.forEach(name => {
        const standards = stats.cityNotFound.filter(item => item.name === name).map(item => item.standardCode);
        console.log(`  - "${name}" (used in: ${standards.join(', ')})`);
      });
    }

    if (stats.countryNotFound.length > 0) {
      console.log(`\n⚠️  Countries not found (${stats.countryNotFound.length}):`);
      const uniqueCountries = [...new Set(stats.countryNotFound.map(item => item.name))];
      uniqueCountries.forEach(name => {
        const standards = stats.countryNotFound.filter(item => item.name === name).map(item => item.standardCode);
        console.log(`  - "${name}" (used in: ${standards.join(', ')})`);
      });
    }

    if (isDryRun) {
      console.log('\n⚠️  This was a DRY-RUN. No data was modified.');
      console.log('Run without --dry-run to apply changes.');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }

  } catch (error) {
    console.error('\n[FATAL ERROR] Migration failed:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { migrateStandard, migrateCondition, findLocationId };

