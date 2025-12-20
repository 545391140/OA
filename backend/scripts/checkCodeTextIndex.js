/**
 * 检查代码中的文本索引定义
 */

const fs = require('fs');
const path = require('path');

const locationModelPath = path.join(__dirname, '../models/Location.js');

console.log('='.repeat(80));
console.log('检查代码中的文本索引定义');
console.log('='.repeat(80));

try {
  const content = fs.readFileSync(locationModelPath, 'utf8');
  
  console.log('\n【1】查找文本索引定义');
  console.log('-'.repeat(80));
  
  // 查找文本索引定义
  const textIndexPattern = /LocationSchema\.index\([\s\S]*?\{[\s\S]*?text[\s\S]*?\}\);/g;
  const matches = content.match(textIndexPattern);
  
  if (matches) {
    console.log(`找到 ${matches.length} 个文本索引定义:\n`);
    matches.forEach((match, idx) => {
      console.log(`[${idx + 1}]`);
      console.log(match);
      console.log();
    });
  } else {
    console.log('未找到文本索引定义');
  }
  
  // 检查是否包含 enName 和 pinyin
  console.log('\n【2】检查是否包含 enName 和 pinyin');
  console.log('-'.repeat(80));
  
  const hasEnName = content.includes("enName: 'text'") || content.includes('enName: "text"');
  const hasPinyin = content.includes("pinyin: 'text'") || content.includes('pinyin: "text"');
  
  console.log(`enName: ${hasEnName ? '✓ 已包含' : '✗ 未包含'}`);
  console.log(`pinyin: ${hasPinyin ? '✓ 已包含' : '✗ 未包含'}`);
  
  // 提取文本索引定义的具体内容
  console.log('\n【3】文本索引定义详情');
  console.log('-'.repeat(80));
  
  const textIndexMatch = content.match(/LocationSchema\.index\([\s\S]*?\{([\s\S]*?)\}[\s\S]*?\);/);
  if (textIndexMatch) {
    const indexContent = textIndexMatch[1];
    console.log('文本索引字段定义:');
    console.log(indexContent);
    
    // 检查每个字段
    const fields = {
      name: indexContent.includes("name: 'text'") || indexContent.includes('name: "text"'),
      code: indexContent.includes("code: 'text'") || indexContent.includes('code: "text"'),
      city: indexContent.includes("city: 'text'") || indexContent.includes('city: "text"'),
      province: indexContent.includes("province: 'text'") || indexContent.includes('province: "text"'),
      district: indexContent.includes("district: 'text'") || indexContent.includes('district: "text"'),
      county: indexContent.includes("county: 'text'") || indexContent.includes('county: "text"'),
      country: indexContent.includes("country: 'text'") || indexContent.includes('country: "text"'),
      countryCode: indexContent.includes("countryCode: 'text'") || indexContent.includes('countryCode: "text"'),
      enName: indexContent.includes("enName: 'text'") || indexContent.includes('enName: "text"'),
      pinyin: indexContent.includes("pinyin: 'text'") || indexContent.includes('pinyin: "text"')
    };
    
    console.log('\n字段检查结果:');
    Object.keys(fields).forEach(field => {
      console.log(`  ${field}: ${fields[field] ? '✓' : '✗'}`);
    });
  }
  
  console.log('\n【4】结论');
  console.log('='.repeat(80));
  
  if (hasEnName && hasPinyin) {
    console.log('✓ 代码中的文本索引定义已经包含 enName 和 pinyin');
    console.log('✓ 不需要修改代码');
    console.log('\n说明:');
    console.log('  - 代码中的定义是正确的');
    console.log('  - 数据库索引已经更新（通过脚本）');
    console.log('  - 代码和数据库现在是一致的');
  } else {
    console.log('⚠ 代码中的文本索引定义不包含 enName 或 pinyin');
    console.log('\n建议:');
    if (!hasEnName) {
      console.log('  - 需要在代码中添加 enName: "text"');
    }
    if (!hasPinyin) {
      console.log('  - 需要在代码中添加 pinyin: "text"');
    }
    console.log('\n但是:');
    console.log('  - 数据库索引已经更新（通过脚本）');
    console.log('  - 即使代码不更新，数据库索引仍然有效');
    console.log('  - 但如果重新创建数据库或同步索引，代码定义会覆盖数据库索引');
  }
  
} catch (error) {
  console.error('错误:', error.message);
  console.error(error.stack);
}










