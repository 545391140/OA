// 验证AI OCR识别是否被调用
require('dotenv').config();
const config = require('./config');

console.log('=== AI OCR 识别验证 ===\n');

// 1. 检查环境变量
console.log('1. 环境变量检查:');
console.log('   process.env.MISTRAL_API_KEY:', process.env.MISTRAL_API_KEY ? '✓ 已设置 (' + process.env.MISTRAL_API_KEY.substring(0, 10) + '...)' : '✗ 未设置');
console.log('   config.MISTRAL_API_KEY:', config.MISTRAL_API_KEY ? '✓ 已配置 (' + config.MISTRAL_API_KEY.substring(0, 10) + '...)' : '✗ 未配置');
console.log('');

// 2. 检查Mistral客户端初始化
console.log('2. Mistral客户端检查:');
try {
  const Mistral = require('@mistralai/mistralai').Mistral;
  if (config.MISTRAL_API_KEY) {
    const client = new Mistral({ apiKey: config.MISTRAL_API_KEY });
    console.log('   ✓ Mistral客户端创建成功');
    
    // 检查OCR API
    if (client.ocr && typeof client.ocr.process === 'function') {
      console.log('   ✓ OCR API可用 (client.ocr.process)');
    } else {
      console.log('   ✗ OCR API不可用');
      console.log('   可用方法:', Object.keys(client));
    }
  } else {
    console.log('   ✗ API Key未配置');
  }
} catch (e) {
  console.log('   ✗ 错误:', e.message);
}
console.log('');

// 3. 检查OCR服务方法
console.log('3. OCR服务方法检查:');
const ocrService = require('./services/ocrService');
const methods = [
  'recognizeInvoice',
  'recognizePDFInvoice', 
  'recognizeInvoiceWithMistral',
  'parseInvoiceDataWithAI',
  'cleanOCRMarkdown'
];

methods.forEach(method => {
  const exists = typeof ocrService[method] === 'function';
  console.log(`   ${method}:`, exists ? '✓' : '✗');
});
console.log('');

// 4. 检查代码逻辑
console.log('4. 代码逻辑检查:');
console.log('   识别流程:');
console.log('   - recognizeInvoice() → recognizeInvoiceWithMistral()');
console.log('   - recognizeInvoiceWithMistral() → mistralClient.ocr.process()');
console.log('   - 提取markdown文本 → cleanOCRMarkdown()');
console.log('   - parseInvoiceDataWithAI() → mistralClient.chat.complete()');
console.log('');

console.log('=== 验证完成 ===\n');
console.log('📋 查看后端日志验证AI调用:');
console.log('   应该看到以下日志:');
console.log('   1. "Mistral AI 客户端初始化成功"');
console.log('   2. "使用 Mistral AI 识别发票图片"');
console.log('   3. "正在使用 Mistral OCR API 识别发票..."');
console.log('   4. "清理后的文本长度: ..."');
console.log('   5. "正在使用 AI 解析发票文本为结构化数据..."');
console.log('   6. "AI解析的结构化数据: ..."');
console.log('\n如果看到 "Mistral API Key 未配置"，说明环境变量未正确加载。');



