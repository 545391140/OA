#!/usr/bin/env node
/**
 * OCR诊断脚本
 * 用于排查上传发票时未调用AI OCR识别的问题
 */

const config = require('./config');
const path = require('path');
const fs = require('fs');

console.log('========================================');
console.log('OCR诊断工具');
console.log('========================================\n');

// 1. 检查配置文件
console.log('1. 检查配置文件:');
console.log('   config.js 路径:', path.resolve(__dirname, 'config.js'));
console.log('   config.js 存在:', fs.existsSync(path.resolve(__dirname, 'config.js')) ? '✓' : '✗');
console.log('   MISTRAL_API_KEY 配置:', config.MISTRAL_API_KEY ? `✓ 已配置 (${config.MISTRAL_API_KEY.substring(0, 10)}...)` : '✗ 未配置');
console.log('');

// 2. 检查环境变量
console.log('2. 检查环境变量:');
console.log('   process.env.MISTRAL_API_KEY:', process.env.MISTRAL_API_KEY ? `✓ 已设置 (${process.env.MISTRAL_API_KEY.substring(0, 10)}...)` : '✗ 未设置');
console.log('');

// 3. 检查Mistral包
console.log('3. 检查 @mistralai/mistralai 包:');
try {
  const Mistral = require('@mistralai/mistralai').Mistral;
  console.log('   ✓ 包已安装');
  
  if (config.MISTRAL_API_KEY) {
    try {
      const client = new Mistral({
        apiKey: config.MISTRAL_API_KEY,
      });
      console.log('   ✓ 客户端创建成功');
      
      // 检查OCR API
      if (client.ocr && client.ocr.process) {
        console.log('   ✓ OCR API 可用');
      } else {
        console.log('   ⚠ OCR API 不可用，将使用 Chat API');
        console.log('   client.ocr:', client.ocr ? '存在' : '不存在');
        if (client.ocr) {
          console.log('   client.ocr 的方法:', Object.keys(client.ocr));
        }
      }
      
      // 检查Chat API
      if (client.chat && client.chat.complete) {
        console.log('   ✓ Chat API 可用');
      } else {
        console.log('   ✗ Chat API 不可用');
      }
    } catch (clientError) {
      console.log('   ✗ 客户端创建失败:', clientError.message);
    }
  } else {
    console.log('   ⚠ API Key 未配置，无法测试客户端');
  }
} catch (e) {
  console.log('   ✗ 包未安装或加载失败:', e.message);
  console.log('   提示: 运行 npm install @mistralai/mistralai');
}
console.log('');

// 4. 检查OCR服务
console.log('4. 检查 OCR 服务:');
try {
  const ocrService = require('./services/ocrService');
  console.log('   ✓ OCR 服务加载成功');
  console.log('   可用方法:', Object.getOwnPropertyNames(Object.getPrototypeOf(ocrService)).filter(m => m !== 'constructor'));
} catch (e) {
  console.log('   ✗ OCR 服务加载失败:', e.message);
}
console.log('');

// 5. 检查上传目录
console.log('5. 检查上传目录:');
const uploadPath = config.UPLOAD_PATH || './uploads';
const absoluteUploadPath = path.isAbsolute(uploadPath) 
  ? uploadPath 
  : path.resolve(__dirname, uploadPath);
console.log('   上传路径:', absoluteUploadPath);
console.log('   路径存在:', fs.existsSync(absoluteUploadPath) ? '✓' : '✗');
if (fs.existsSync(absoluteUploadPath)) {
  try {
    fs.accessSync(absoluteUploadPath, fs.constants.W_OK);
    console.log('   路径可写: ✓');
  } catch (e) {
    console.log('   路径可写: ✗', e.message);
  }
} else {
  console.log('   提示: 上传目录不存在，将在首次上传时自动创建');
}
console.log('');

// 6. 检查路由
console.log('6. 检查路由配置:');
try {
  const invoicesRoute = require('./routes/invoices');
  console.log('   ✓ invoices 路由加载成功');
} catch (e) {
  console.log('   ✗ invoices 路由加载失败:', e.message);
}
console.log('');

// 7. 总结
console.log('========================================');
console.log('诊断总结:');
console.log('========================================');

const issues = [];

if (!config.MISTRAL_API_KEY) {
  issues.push('✗ MISTRAL_API_KEY 未配置');
  console.log('   解决方案:');
  console.log('   1. 在 backend/.env 文件中添加: MISTRAL_API_KEY=your_api_key');
  console.log('   2. 或者在 backend/config.js 中直接配置');
  console.log('   3. 重启服务器使配置生效');
} else {
  console.log('   ✓ MISTRAL_API_KEY 已配置');
}

try {
  require('@mistralai/mistralai');
  console.log('   ✓ @mistralai/mistralai 包已安装');
} catch (e) {
  issues.push('✗ @mistralai/mistralai 包未安装');
  console.log('   解决方案: 运行 npm install @mistralai/mistralai');
}

if (issues.length === 0) {
  console.log('\n✓ 所有检查通过！OCR功能应该可以正常工作。');
  console.log('\n如果仍然遇到问题，请检查服务器日志中的详细错误信息。');
} else {
  console.log('\n发现以下问题:');
  issues.forEach(issue => console.log(`   ${issue}`));
  console.log('\n请解决上述问题后重试。');
}

console.log('========================================\n');


