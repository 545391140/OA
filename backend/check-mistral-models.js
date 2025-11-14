/**
 * 检查 Mistral AI 可用的模型列表
 */

require('dotenv').config();
const { Mistral } = require('@mistralai/mistralai');

async function checkModels() {
  console.log('=== 检查 Mistral AI 可用模型 ===\n');

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    console.error('❌ MISTRAL_API_KEY 未配置');
    return;
  }

  const mistralClient = new Mistral({ apiKey });

  try {
    // 查询可用模型列表
    console.log('查询可用模型...');
    const models = await mistralClient.models.list();
    
    console.log('\n✅ 可用模型列表:');
    models.data.forEach(model => {
      console.log(`- ${model.id} (${model.object})`);
      if (model.permission) {
        console.log(`  权限: ${JSON.stringify(model.permission)}`);
      }
    });

    // 查找 OCR 相关模型
    console.log('\n--- OCR 相关模型 ---');
    const ocrModels = models.data.filter(m => 
      m.id.toLowerCase().includes('ocr') || 
      m.id.toLowerCase().includes('cx')
    );
    
    if (ocrModels.length > 0) {
      console.log('找到 OCR 相关模型:');
      ocrModels.forEach(model => {
        console.log(`- ${model.id}`);
      });
    } else {
      console.log('未找到 OCR 相关模型');
      console.log('\n提示: OCR API 可能需要特定的访问权限或账户类型');
      console.log('建议: 检查 Mistral AI 控制台或联系支持团队');
    }

  } catch (error) {
    console.error('❌ 查询模型失败:', error.message);
    if (error.response) {
      console.error('响应:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkModels().catch(console.error);






