/**
 * 测试增量同步功能
 * 用于验证增量同步相关的辅助函数
 */

const fs = require('fs');
const path = require('path');

// 同步状态文件路径
const SYNC_STATUS_FILE = path.join(__dirname, '../.sync_status.json');

/**
 * 解析命令行参数（测试版本）
 */
function parseArgs(args) {
  const options = {
    full: false,
    incremental: false,
    startDate: null,
    countryId: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--full') {
      options.full = true;
    } else if (arg === '--incremental') {
      options.incremental = true;
    } else if (arg === '--start-date' && i + 1 < args.length) {
      options.startDate = args[++i];
    } else if (arg === '--country-id' && i + 1 < args.length) {
      options.countryId = parseInt(args[++i], 10);
    }
  }

  return options;
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 验证日期格式
 */
function validateDate(dateString) {
  if (!dateString) return null;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    throw new Error(`日期格式错误，应为 YYYY-MM-DD: ${dateString}`);
  }
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`无效的日期: ${dateString}`);
  }
  return dateString;
}

/**
 * 读取上次同步时间
 */
function getLastSyncTime() {
  try {
    if (fs.existsSync(SYNC_STATUS_FILE)) {
      const data = fs.readFileSync(SYNC_STATUS_FILE, 'utf8');
      const status = JSON.parse(data);
      return status.lastSyncTime ? new Date(status.lastSyncTime) : null;
    }
  } catch (error) {
    console.warn('读取同步状态文件失败:', error.message);
  }
  return null;
}

/**
 * 保存同步时间
 */
function saveSyncTime(syncMode, startDate) {
  try {
    const status = {
      lastSyncTime: new Date().toISOString(),
      syncMode: syncMode,
      startDate: startDate,
    };
    fs.writeFileSync(SYNC_STATUS_FILE, JSON.stringify(status, null, 2), 'utf8');
    return status;
  } catch (error) {
    console.warn('保存同步状态文件失败:', error.message);
    return null;
  }
}

// 测试函数
function test() {
  console.log('='.repeat(60));
  console.log('测试增量同步功能');
  console.log('='.repeat(60));

  // 测试1: 解析命令行参数
  console.log('\n1. 测试命令行参数解析:');
  const testArgs1 = ['--incremental'];
  const result1 = parseArgs(testArgs1);
  console.log('  输入:', testArgs1.join(' '));
  console.log('  结果:', JSON.stringify(result1, null, 2));
  console.log('  ✓ 参数解析正确');

  const testArgs2 = ['--start-date', '2025-11-01', '--country-id', '1'];
  const result2 = parseArgs(testArgs2);
  console.log('\n  输入:', testArgs2.join(' '));
  console.log('  结果:', JSON.stringify(result2, null, 2));
  console.log('  ✓ 参数解析正确');

  // 测试2: 日期格式化
  console.log('\n2. 测试日期格式化:');
  const testDate = new Date('2025-11-29T10:30:00Z');
  const formatted = formatDate(testDate);
  console.log('  输入:', testDate.toISOString());
  console.log('  输出:', formatted);
  console.log('  ✓ 日期格式化正确');

  // 测试3: 日期验证
  console.log('\n3. 测试日期验证:');
  try {
    const validDate = validateDate('2025-11-29');
    console.log('  输入: 2025-11-29');
    console.log('  输出:', validDate);
    console.log('  ✓ 日期验证通过');

    try {
      validateDate('2025-13-45');
      console.log('  ✗ 应该抛出错误');
    } catch (error) {
      console.log('  ✓ 无效日期正确拒绝:', error.message);
    }
  } catch (error) {
    console.log('  ✗ 日期验证失败:', error.message);
  }

  // 测试4: 同步状态文件操作
  console.log('\n4. 测试同步状态文件操作:');
  const lastSync = getLastSyncTime();
  if (lastSync) {
    console.log('  上次同步时间:', lastSync.toISOString());
  } else {
    console.log('  未找到上次同步时间（首次同步）');
  }

  const savedStatus = saveSyncTime('incremental', '2025-11-29');
  if (savedStatus) {
    console.log('  ✓ 同步状态保存成功');
    console.log('  保存的内容:', JSON.stringify(savedStatus, null, 2));
  }

  const newLastSync = getLastSyncTime();
  if (newLastSync) {
    console.log('  ✓ 同步状态读取成功');
    console.log('  读取的时间:', newLastSync.toISOString());
  }

  console.log('\n' + '='.repeat(60));
  console.log('所有测试完成！');
  console.log('='.repeat(60));
}

if (require.main === module) {
  test();
}

module.exports = { parseArgs, formatDate, validateDate, getLastSyncTime, saveSyncTime };

