// 测试上传发票时OCR是否被调用
require('dotenv').config();
const ocrService = require('./services/ocrService');
const path = require('path');
const fs = require('fs');

console.log('=== 测试上传发票OCR调用 ===\n');

// 检查OCR服务
console.log('1. 检查OCR服务:');
console.log('   recognizeInvoice方法:', typeof ocrService.recognizeInvoice === 'function' ? '✓' : '✗');
console.log('   recognizePDFInvoice方法:', typeof ocrService.recognizePDFInvoice === 'function' ? '✓' : '✗');
console.log('');

// 检查文件路径处理
console.log('2. 检查文件路径处理:');
const testPath = path.resolve(__dirname, 'uploads', 'invoices', '2025', '11');
console.log('   测试路径:', testPath);
console.log('   路径是否存在:', fs.existsSync(testPath) ? '✓' : '✗');
console.log('');

// 检查Mistral客户端
console.log('3. 检查Mistral客户端:');
const config = require('./config');
if (config.MISTRAL_API_KEY) {
  console.log('   ✓ MISTRAL_API_KEY已配置');
  try {
    const Mistral = require('@mistralai/mistralai').Mistral;
    const client = new Mistral({ apiKey: config.MISTRAL_API_KEY });
    if (client.ocr && client.ocr.process) {
      console.log('   ✓ OCR API可用');
    } else {
      console.log('   ✗ OCR API不可用');
    }
  } catch (e) {
    console.log('   ✗ Mistral客户端创建失败:', e.message);
  }
} else {
  console.log('   ✗ MISTRAL_API_KEY未配置');
}
console.log('');

console.log('=== 测试完成 ===\n');
console.log('📋 上传发票时，后端日志应该显示:');
console.log('   1. "========================================"');
console.log('   2. "开始OCR识别，文件类型: ..."');
console.log('   3. "调用 ocrService.recognizeInvoice()..."');
console.log('   4. "使用 Mistral AI 识别发票图片"');
console.log('   5. "正在使用 Mistral OCR API 识别发票..."');
console.log('   6. "清理后的文本长度: ..."');
console.log('   7. "正在使用 AI 解析发票文本为结构化数据..."');
console.log('   8. "OCR识别结果: { success: true, ... }"');
console.log('   9. "OCR数据已保存到发票"');




