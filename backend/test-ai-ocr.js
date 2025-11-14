// 测试脚本：验证AI OCR识别是否被调用
const ocrService = require('./services/ocrService');
const config = require('./config');

console.log('=== AI OCR 识别验证 ===\n');

// 1. 检查配置
console.log('1. 检查配置:');
console.log('   MISTRAL_API_KEY:', config.MISTRAL_API_KEY ? '✓ 已配置' : '✗ 未配置');
console.log('');

// 2. 检查Mistral客户端
console.log('2. 检查Mistral客户端:');
try {
  const Mistral = require('@mistralai/mistralai').Mistral;
  if (config.MISTRAL_API_KEY) {
    const client = new Mistral({ apiKey: config.MISTRAL_API_KEY });
    console.log('   ✓ Mistral客户端创建成功');
    
    // 检查OCR API是否可用
    if (client.ocr && client.ocr.process) {
      console.log('   ✓ OCR API可用');
    } else {
      console.log('   ✗ OCR API不可用');
    }
  } else {
    console.log('   ✗ API Key未配置，无法创建客户端');
  }
} catch (e) {
  console.log('   ✗ Mistral AI未安装或初始化失败:', e.message);
}
console.log('');

// 3. 检查识别方法
console.log('3. 检查识别方法:');
console.log('   recognizeInvoice:', typeof ocrService.recognizeInvoice === 'function' ? '✓ 存在' : '✗ 不存在');
console.log('   recognizePDFInvoice:', typeof ocrService.recognizePDFInvoice === 'function' ? '✓ 存在' : '✗ 不存在');
console.log('   recognizeInvoiceWithMistral:', typeof ocrService.recognizeInvoiceWithMistral === 'function' ? '✓ 存在' : '✗ 不存在');
console.log('   parseInvoiceDataWithAI:', typeof ocrService.parseInvoiceDataWithAI === 'function' ? '✓ 存在' : '✗ 不存在');
console.log('   cleanOCRMarkdown:', typeof ocrService.cleanOCRMarkdown === 'function' ? '✓ 存在' : '✗ 不存在');
console.log('');

console.log('=== 验证完成 ===');
console.log('\n提示: 查看后端日志，应该能看到以下日志:');
console.log('  - "使用 Mistral AI 识别发票图片"');
console.log('  - "正在使用 Mistral OCR API 识别发票..."');
console.log('  - "清理后的文本长度: ..."');
console.log('  - "正在使用 AI 解析发票文本为结构化数据..."');
console.log('  - "AI解析的结构化数据: ..."');



