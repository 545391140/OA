/**
 * Mistral AI OCR 功能测试脚本
 * 用于验证 Mistral OCR API 是否正常工作
 */

require('dotenv').config();
const { Mistral } = require('@mistralai/mistralai');
const fs = require('fs');
const path = require('path');

async function testMistralOCR() {
  console.log('=== Mistral AI OCR 功能测试 ===\n');

  // 1. 检查 API Key
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    console.error('❌ 错误: MISTRAL_API_KEY 未配置');
    console.log('请在 backend/.env 文件中设置 MISTRAL_API_KEY');
    return;
  }
  console.log('✅ API Key 已配置:', apiKey.substring(0, 10) + '...');

  // 2. 初始化 Mistral 客户端
  let mistralClient;
  try {
    mistralClient = new Mistral({
      apiKey: apiKey,
    });
    console.log('✅ Mistral 客户端初始化成功');
  } catch (error) {
    console.error('❌ Mistral 客户端初始化失败:', error.message);
    return;
  }

  // 3. 检查 OCR API 是否可用
  if (!mistralClient.ocr || !mistralClient.ocr.process) {
    console.error('❌ OCR API 不可用');
    console.log('请检查 @mistralai/mistralai 包版本是否支持 OCR API');
    return;
  }
  console.log('✅ OCR API 可用');

  // 4. 测试 API 调用（使用一个简单的测试）
  console.log('\n--- 测试 API 连接 ---');
  try {
    // 创建一个简单的测试图片（1x1 像素的 PNG）
    // 或者尝试使用一个 URL（如果支持）
    console.log('尝试调用 OCR API...');
    
    // 注意：这里我们使用一个最小的测试
    // 实际使用时需要真实的图片或 PDF 文件
    const testImageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    // 使用正确的 OCR 模型名称（从模型列表中获取）
    const ocrModel = 'mistral-ocr-latest'; // 使用 latest 版本
    
    console.log(`使用模型: ${ocrModel}...`);
    const result = await mistralClient.ocr.process({
      model: ocrModel,
      document: {
        imageUrl: {
          url: testImageUrl,
        },
        type: 'image_url',
      },
    });

    console.log('✅ API 调用成功！');
    console.log('\n响应信息:');
    console.log('- 模型:', result.model || 'unknown');
    console.log('- 页数:', result.pages?.length || 0);
    if (result.usage_info) {
      console.log('- 处理页数:', result.usage_info.pages_processed || 'unknown');
    }
    
    if (result.pages && result.pages.length > 0) {
      console.log('\n第一页内容预览:');
      const firstPage = result.pages[0];
      const preview = (firstPage.markdown || '').substring(0, 200);
      console.log(preview + (firstPage.markdown?.length > 200 ? '...' : ''));
    }

    console.log('\n✅ Mistral AI OCR 功能测试通过！');
    console.log('\n提示: 现在可以上传发票图片或 PDF 进行识别了。');
    
  } catch (error) {
    console.error('❌ API 调用失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('\n错误详情:', error);
  }
}

// 运行测试
testMistralOCR().catch(console.error);

