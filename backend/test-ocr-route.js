/**
 * 测试 OCR 识别路由
 * 用于诊断 500 错误
 */

const path = require('path');
const fs = require('fs');
const ocrService = require('./services/ocrService');

async function testOCR() {
  console.log('========================================');
  console.log('测试 OCR 服务');
  console.log('========================================');
  
  // 检查 OCR 服务是否加载
  console.log('OCR Service:', typeof ocrService);
  console.log('recognizeInvoice:', typeof ocrService.recognizeInvoice);
  console.log('recognizePDFInvoice:', typeof ocrService.recognizePDFInvoice);
  
  // 检查方法是否存在
  if (typeof ocrService.recognizeInvoice !== 'function') {
    console.error('错误: recognizeInvoice 方法不存在');
    return;
  }
  
  // 查找测试文件
  const uploadsDir = path.join(__dirname, 'uploads', 'invoices');
  console.log('查找测试文件目录:', uploadsDir);
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('上传目录不存在，创建测试目录...');
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  // 查找最近的图片文件
  const findTestFile = (dir) => {
    const files = [];
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          files.push(...findTestFile(fullPath));
        } else if (/\.(jpg|jpeg|png|pdf)$/i.test(item.name)) {
          files.push(fullPath);
        }
      }
    } catch (e) {
      // 忽略错误
    }
    return files;
  };
  
  const testFiles = findTestFile(uploadsDir);
  console.log(`找到 ${testFiles.length} 个测试文件`);
  
  if (testFiles.length === 0) {
    console.log('没有找到测试文件，请先上传一个发票文件');
    return;
  }
  
  // 测试第一个文件
  const testFile = testFiles[0];
  console.log('测试文件:', testFile);
  console.log('文件是否存在:', fs.existsSync(testFile));
  
  if (!fs.existsSync(testFile)) {
    console.error('测试文件不存在');
    return;
  }
  
  try {
    console.log('========================================');
    console.log('开始 OCR 识别测试...');
    console.log('========================================');
    
    const result = await ocrService.recognizeInvoice(testFile);
    
    console.log('========================================');
    console.log('OCR 识别结果:');
    console.log('Success:', result.success);
    console.log('Error:', result.error);
    console.log('Has Data:', !!result.invoiceData);
    console.log('========================================');
    
  } catch (error) {
    console.error('========================================');
    console.error('OCR 识别失败:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('========================================');
  }
}

testOCR().catch(console.error);


