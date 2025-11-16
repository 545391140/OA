const fs = require('fs');
const path = require('path');
// 确保在加载配置前加载环境变量
// 注意：必须从 backend 目录加载 .env
const dotenv = require('dotenv');
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const config = require('../config');
// 导入统一的提示词配置
const {
  OCR_PROMPT,
  AI_ANALYSIS_SYSTEM_PROMPT,
  AI_ANALYSIS_USER_PROMPT_TEMPLATE,
  MISTRAL_CHAT_SYSTEM_PROMPT,
  MISTRAL_CHAT_USER_PROMPT_TEMPLATE,
} = require('./ocrPrompts');

// 导入 Mistral AI
let Mistral;
let mistralClient;
try {
  console.log('========================================');
  console.log('初始化 Mistral AI 客户端...');
  console.log('检查 @mistralai/mistralai 包...');
  Mistral = require('@mistralai/mistralai').Mistral;
  console.log('✓ @mistralai/mistralai 包加载成功');
  
  console.log('检查 MISTRAL_API_KEY 配置...');
  console.log('config.MISTRAL_API_KEY:', config.MISTRAL_API_KEY ? `已配置 (${config.MISTRAL_API_KEY.substring(0, 10)}...)` : '未配置');
  console.log('process.env.MISTRAL_API_KEY:', process.env.MISTRAL_API_KEY ? `已设置 (${process.env.MISTRAL_API_KEY.substring(0, 10)}...)` : '未设置');
  
  if (config.MISTRAL_API_KEY) {
    mistralClient = new Mistral({
      apiKey: config.MISTRAL_API_KEY,
    });
    console.log('✓ Mistral AI 客户端初始化成功');
    console.log('检查 OCR API 可用性...');
    if (mistralClient.ocr && mistralClient.ocr.process) {
      console.log('✓ Mistral OCR API 可用');
    } else {
      console.log('⚠ Mistral OCR API 不可用，将使用 Chat API 方法');
    }
  } else {
    console.log('✗ Mistral API Key 未配置，OCR功能将不可用');
    console.log('提示: 请在环境变量中设置 MISTRAL_API_KEY 或在 config.js 中配置');
  }
  console.log('========================================');
} catch (e) {
  console.error('========================================');
  console.error('✗ Mistral AI 初始化失败:', e.message);
  console.error('错误堆栈:', e.stack);
  console.error('提示: 请确保已安装 @mistralai/mistralai 包: npm install @mistralai/mistralai');
  console.error('========================================');
  mistralClient = null;
}

// 导入阿里云 DashScope (使用 OpenAI SDK 兼容模式)
let OpenAI;
let dashscopeClient;
try {
  console.log('========================================');
  console.log('初始化阿里云 DashScope 客户端...');
  console.log('检查 openai 包...');
  OpenAI = require('openai');
  console.log('✓ openai 包加载成功');
  
  console.log('检查 DASHSCOPE_API_KEY 配置...');
  console.log('config.DASHSCOPE_API_KEY:', config.DASHSCOPE_API_KEY ? `已配置 (${config.DASHSCOPE_API_KEY.substring(0, 10)}...)` : '未配置');
  console.log('process.env.DASHSCOPE_API_KEY:', process.env.DASHSCOPE_API_KEY ? `已设置 (${process.env.DASHSCOPE_API_KEY.substring(0, 10)}...)` : '未设置');
  
  if (config.DASHSCOPE_API_KEY) {
    dashscopeClient = new OpenAI({
      apiKey: config.DASHSCOPE_API_KEY,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });
    console.log('✓ 阿里云 DashScope 客户端初始化成功');
  } else {
    console.log('⚠ DashScope API Key 未配置，将无法使用阿里云 OCR fallback');
    console.log('提示: 请在环境变量中设置 DASHSCOPE_API_KEY 或在 config.js 中配置');
  }
  console.log('========================================');
} catch (e) {
  console.error('========================================');
  console.error('✗ 阿里云 DashScope 初始化失败:', e.message);
  console.error('错误堆栈:', e.stack);
  console.error('提示: 请确保已安装 openai 包: npm install openai');
  console.error('========================================');
  dashscopeClient = null;
}

class OCRService {
  // ============================================
  // 数据验证和完整性检查
  // ============================================

  /**
   * 检查识别结果是否完整
   * @param {Object} invoiceData - 识别出的发票数据
   * @returns {Object} { isComplete: boolean, missingFields: Array<string> }
   */
  isRecognitionComplete(invoiceData) {
    if (!invoiceData || typeof invoiceData !== 'object') {
      return { isComplete: false, missingFields: ['所有字段'] };
    }

    // 定义关键字段（必须存在的字段）
    // 增加关键字段：发票号码、发票日期、销售方名称、购买方名称、金额
    const criticalFields = [
      'invoiceNumber',    // 发票号码（必填）
      'invoiceDate',      // 发票日期（必填）
      'vendorName',       // 销售方名称
      'buyerName',        // 购买方名称
      'totalAmount'       // 价税合计
    ];

    // 必填字段：发票号码和发票日期必须存在
    const requiredFields = ['invoiceNumber', 'invoiceDate'];
    
    // 检查关键字段是否存在且不为空
    const missingFields = [];
    let validFieldCount = 0;
    
    for (const field of criticalFields) {
      const value = invoiceData[field];
      if (value && 
          !((typeof value === 'string' && value.trim() === '') ||
            (typeof value === 'number' && (isNaN(value) || value === 0)))) {
        validFieldCount++;
      } else {
        missingFields.push(field);
      }
    }

    // 检查必填字段是否缺失
    const missingRequiredFields = requiredFields.filter(field => {
      const value = invoiceData[field];
      return !value || 
             (typeof value === 'string' && value.trim() === '') ||
             (typeof value === 'number' && (isNaN(value) || value === 0));
    });

    // 如果必填字段缺失，直接返回不完整
    if (missingRequiredFields.length > 0) {
      console.log(`⚠️  识别不完整：必填字段缺失 (${missingRequiredFields.join(', ')})`);
      console.log(`   已识别 ${validFieldCount}/${criticalFields.length} 个关键字段`);
      console.log(`   缺失字段: ${missingFields.join(', ')}`);
      return { isComplete: false, missingFields };
    }

    // 如果必填字段都存在，要求至少有 4 个关键字段有值，才认为识别完整
    // 例如：发票号码 + 发票日期 + 销售方名称 + 金额 = 4个字段
    const requiredFieldCount = 4;
    if (validFieldCount >= requiredFieldCount) {
      console.log(`✓ 识别结果完整，已识别 ${validFieldCount}/${criticalFields.length} 个关键字段`);
      return { isComplete: true, missingFields: [] };
    }

    console.log(`⚠️  识别不完整，只识别了 ${validFieldCount}/${criticalFields.length} 个关键字段（需要至少 ${requiredFieldCount} 个）`);
    console.log(`   缺失字段: ${missingFields.join(', ')}`);
    return { isComplete: false, missingFields };
  }

  /**
   * 清理和标准化发票数据
   * @param {Object} invoiceData - 原始发票数据
   * @returns {Object} 清理后的发票数据
   */
  normalizeInvoiceData(invoiceData) {
    if (!invoiceData || typeof invoiceData !== 'object') {
      return {};
    }

    const normalized = { ...invoiceData };

    // 1. 日期格式标准化 (YYYY-MM-DD)
    if (normalized.invoiceDate && typeof normalized.invoiceDate === 'string') {
      const dateFormats = [
        /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,  // YYYY-MM-DD 或 YYYY/MM/DD
        /(\d{4})年(\d{1,2})月(\d{1,2})日/,      // YYYY年MM月DD日
        /(\d{2})[-\/](\d{1,2})[-\/](\d{1,2})/   // YY-MM-DD (假设20XX年)
      ];

      for (const pattern of dateFormats) {
        const match = normalized.invoiceDate.match(pattern);
        if (match) {
          let year = match[1];
          const month = match[2].padStart(2, '0');
          const day = match[3].padStart(2, '0');
          
          // 处理两位年份
          if (year.length === 2) {
            year = '20' + year;
      }
          
          normalized.invoiceDate = `${year}-${month}-${day}`;
          break;
        }
      }
  }

    // 2. 金额字段类型转换和清理
    const amountFields = ['amount', 'taxAmount', 'totalAmount'];
    for (const field of amountFields) {
      if (normalized[field] !== undefined && normalized[field] !== null) {
        if (typeof normalized[field] === 'string') {
          // 处理免税标识
          if (field === 'taxAmount' && 
              (normalized[field].includes('免税') || 
               normalized[field].includes('***') ||
               normalized[field].includes('Tax Exempt'))) {
            normalized[field] = 0;
    } else {
            normalized[field] = parseFloat(normalized[field].replace(/[^\d.]/g, '')) || 0;
          }
        } else if (typeof normalized[field] === 'number') {
          normalized[field] = isNaN(normalized[field]) ? 0 : normalized[field];
        }
      }
    }

    // 3. 字符串字段清理（去除首尾空格）
    const stringFields = [
      'invoiceNumber', 'invoiceCode', 'invoiceType', 'currency',
      'vendorName', 'vendorTaxId', 'vendorAddress',
      'buyerName', 'buyerTaxId', 'buyerAddress',
      'issuer', 'totalAmountInWords'
    ];
    for (const field of stringFields) {
      if (normalized[field] && typeof normalized[field] === 'string') {
        normalized[field] = normalized[field].trim();
    }
    }

    // 4. 发票分类映射（中文转英文）
    if (normalized.category) {
      const categoryMap = {
        '交通': 'transportation',
        '住宿': 'accommodation',
        '餐饮': 'meals',
        '娱乐': 'entertainment',
        '通讯': 'communication',
        '办公用品': 'office_supplies',
        '培训': 'training',
        '其他': 'other'
      };
      // 如果category是中文，转换为英文；如果已经是英文，保持不变
      normalized.category = categoryMap[normalized.category] || normalized.category || 'other';
    } else {
      // 如果没有category字段，设置为默认值
      normalized.category = 'other';
    }

    // 5. 空值处理（null 转为空字符串，但category保持默认值）
    Object.keys(normalized).forEach(key => {
      if (key === 'category') {
        // category字段不处理，保持上面的逻辑
        return;
      }
      if (normalized[key] === null) {
        normalized[key] = '';
      }
    });

    return normalized;
  }

  /**
   * 字段映射：将不同格式的字段名映射到标准字段名
   * @param {Object} invoiceData - 原始发票数据
   * @returns {Object} 映射后的发票数据
   */
  mapFieldNames(invoiceData) {
    if (!invoiceData || typeof invoiceData !== 'object') {
      return {};
    }

    const mapped = { ...invoiceData };

    // 销售方字段映射
    const vendorNameMappings = ['Seller', 'Vendor', 'Merchant', 'Seller Name'];
    for (const key of vendorNameMappings) {
      if (mapped[key] && !mapped.vendorName) {
        mapped.vendorName = mapped[key];
        delete mapped[key];
      }
    }

    // 购买方字段映射
    const buyerNameMappings = ['Buyer', 'Purchaser', 'Customer', 'Buyer Name'];
    for (const key of buyerNameMappings) {
      if (mapped[key] && !mapped.buyerName) {
        mapped.buyerName = mapped[key];
        delete mapped[key];
  }
    }

    // 税号字段映射
    if (mapped['Seller Tax ID'] && !mapped.vendorTaxId) {
      mapped.vendorTaxId = mapped['Seller Tax ID'];
      delete mapped['Seller Tax ID'];
    }
    if (mapped['Vendor Tax ID'] && !mapped.vendorTaxId) {
      mapped.vendorTaxId = mapped['Vendor Tax ID'];
      delete mapped['Vendor Tax ID'];
    }
    if (mapped['Buyer Tax ID'] && !mapped.buyerTaxId) {
      mapped.buyerTaxId = mapped['Buyer Tax ID'];
      delete mapped['Buyer Tax ID'];
    }

    // 地址字段映射
    if (mapped['Seller Address'] && !mapped.vendorAddress) {
      mapped.vendorAddress = mapped['Seller Address'];
      delete mapped['Seller Address'];
    }
    if (mapped['Vendor Address'] && !mapped.vendorAddress) {
      mapped.vendorAddress = mapped['Vendor Address'];
      delete mapped['Vendor Address'];
}
    if (mapped['Buyer Address'] && !mapped.buyerAddress) {
      mapped.buyerAddress = mapped['Buyer Address'];
      delete mapped['Buyer Address'];
    }

    return mapped;
  }

  // ============================================
  // OCR 识别入口方法
  // ============================================

  /**
   * 识别发票图片（使用 Mistral AI OCR，如果识别不全则使用阿里云 OCR）
   * @param {string} imagePath - 图片路径
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeInvoice(imagePath) {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║               📄 发票识别流程开始                              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log(`📁 文件路径: ${imagePath}`);
    console.log(`📅 识别时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log(`🔧 Mistral AI: ${mistralClient ? '✅ 已初始化' : '❌ 未初始化'}`);
    console.log(`🔧 阿里云 DashScope: ${dashscopeClient ? '✅ 已初始化' : '❌ 未初始化'}`);
    console.log('════════════════════════════════════════════════════════════════');
    
    // 检查是否配置了至少一个 OCR 服务
    if (!mistralClient && !dashscopeClient) {
      const errorMsg = 'OCR 服务未配置，请设置 MISTRAL_API_KEY 或 DASHSCOPE_API_KEY 环境变量';
      console.error('OCR失败:', errorMsg);
      console.log('========================================');
      return {
        success: false,
        error: errorMsg,
        text: '',
        confidence: 0,
        invoiceData: {}
      };
    }
    
    // 首先尝试使用 Mistral AI OCR
    if (mistralClient) {
      console.log('\n┌────────────────────────────────────────────────────────────┐');
      console.log('│ 🔵 第一步: 使用 Mistral AI OCR 识别发票                      │');
      console.log('└────────────────────────────────────────────────────────────┘');
      try {
        const mistralResult = await this.recognizeInvoiceWithMistral(imagePath, 'image');
        
        // 检查识别结果是否完整
        if (mistralResult.success && mistralResult.invoiceData) {
          const { isComplete, missingFields } = this.isRecognitionComplete(mistralResult.invoiceData);
          
          if (isComplete) {
            console.log('\n╔════════════════════════════════════════════════════════════════╗');
            console.log('║  ✅ Mistral AI 识别成功 - 识别结果完整                          ║');
            console.log('╚════════════════════════════════════════════════════════════════╝');
            console.log('📊 识别结果摘要:');
            console.log(`   - 发票号码: ${mistralResult.invoiceData.invoiceNumber || '(未识别)'}`);
            console.log(`   - 发票日期: ${mistralResult.invoiceData.invoiceDate || '(未识别)'}`);
            console.log(`   - 销售方: ${mistralResult.invoiceData.vendorName || '(未识别)'}`);
            console.log(`   - 购买方: ${mistralResult.invoiceData.buyerName || '(未识别)'}`);
            console.log(`   - 价税合计: ${mistralResult.invoiceData.totalAmount || '(未识别)'}`);
            console.log(`   - OCR文本长度: ${mistralResult.text?.length || 0} 字符`);
            console.log('════════════════════════════════════════════════════════════════\n');
            // 数据已经过完整流程处理：OCR提取 → AI解析 → 字段映射 → 数据标准化
            return mistralResult;
          } else {
            console.log('\n╔════════════════════════════════════════════════════════════════╗');
            console.log('║  ⚠️  Mistral AI 识别不完整 - 切换到阿里云 OCR                  ║');
            console.log('╚════════════════════════════════════════════════════════════════╝');
            console.log(`📋 缺失字段: ${missingFields.join(', ')}`);
            console.log('🔄 流转: Mistral AI → 阿里云 DashScope OCR');
            console.log('════════════════════════════════════════════════════════════════');
          }
        } else {
          console.log('\n╔════════════════════════════════════════════════════════════════╗');
          console.log('║  ❌ Mistral AI 识别失败 - 切换到阿里云 OCR                      ║');
          console.log('╚════════════════════════════════════════════════════════════════╝');
          console.log('🔄 流转: Mistral AI → 阿里云 DashScope OCR');
          console.log('════════════════════════════════════════════════════════════════');
        }
      } catch (error) {
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║  ❌ Mistral AI 识别出错 - 切换到阿里云 OCR                        ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');
        console.error(`错误信息: ${error.message}`);
        console.log('🔄 流转: Mistral AI → 阿里云 DashScope OCR');
        console.log('════════════════════════════════════════════════════════════════');
      }
    }
    
    // 如果 Mistral 识别不全或失败，使用阿里云 OCR
    if (dashscopeClient) {
      console.log('\n┌────────────────────────────────────────────────────────────┐');
      console.log('│ 🟢 第二步: 使用阿里云 DashScope OCR 识别发票                  │');
      console.log('└────────────────────────────────────────────────────────────┘');
      try {
        const dashscopeResult = await this.recognizeInvoiceWithDashScope(imagePath, 'image');
        
        if (dashscopeResult.success) {
          console.log('\n╔════════════════════════════════════════════════════════════════╗');
          console.log('║  ✅ 阿里云 DashScope OCR 识别成功                                ║');
          console.log('╚════════════════════════════════════════════════════════════════╝');
          console.log('📊 识别结果摘要:');
          console.log(`   - 发票号码: ${dashscopeResult.invoiceData.invoiceNumber || '(未识别)'}`);
          console.log(`   - 发票日期: ${dashscopeResult.invoiceData.invoiceDate || '(未识别)'}`);
          console.log(`   - 销售方: ${dashscopeResult.invoiceData.vendorName || '(未识别)'}`);
          console.log(`   - 购买方: ${dashscopeResult.invoiceData.buyerName || '(未识别)'}`);
          console.log(`   - 价税合计: ${dashscopeResult.invoiceData.totalAmount || '(未识别)'}`);
          console.log(`   - OCR文本长度: ${dashscopeResult.text?.length || 0} 字符`);
          console.log('════════════════════════════════════════════════════════════════\n');
          // 数据已经过完整流程处理：OCR提取 → AI解析 → 字段映射 → 数据标准化
          return dashscopeResult;
        } else {
          console.log('\n╔════════════════════════════════════════════════════════════════╗');
          console.log('║  ❌ 阿里云 DashScope OCR 识别失败                                ║');
          console.log('╚════════════════════════════════════════════════════════════════╝');
        }
      } catch (error) {
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║  ❌ 阿里云 DashScope OCR 识别出错                                ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');
        console.error(`错误信息: ${error.message}`);
      }
    }
    
    // 如果都失败了，返回错误
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  ❌ 所有 OCR 服务都识别失败                                      ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('════════════════════════════════════════════════════════════════\n');
    return {
      success: false,
      error: '所有 OCR 服务都识别失败',
      text: '',
      confidence: 0,
      invoiceData: {}
    };
  }


  

  /**
   * 清理OCR返回的markdown数据，移除无用的表格和重复内容
   * 优化：尽可能保留所有信息，只做最小限度的清理
   * @param {string} textContent - OCR识别的markdown文本
   * @returns {string} 清理后的文本
   */
  cleanOCRMarkdown(textContent) {
    if (!textContent) return '';
    
    let cleaned = textContent;
    
    // 1. 移除图片引用（不影响文本内容）
    cleaned = cleaned.replace(/!\[.*?\]\(.*?\)/g, '');
    
    // 2. 最小限度清理：只移除完全无意义的空行和重复空行
    const lines = cleaned.split('\n');
    const filteredLines = [];
    let emptyLineCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // 保留所有非空行
      if (trimmedLine.length > 0) {
        filteredLines.push(line);
        emptyLineCount = 0;
        } else {
        // 只保留最多2个连续空行（用于保持段落结构）
        emptyLineCount++;
        if (emptyLineCount <= 2) {
          filteredLines.push(line);
        }
      }
    }
    
    cleaned = filteredLines.join('\n');
    
    // 3. 移除过多的连续空行（保留最多3个连续空行，用于分隔大段落）
    cleaned = cleaned.replace(/\n{5,}/g, '\n\n\n\n');
    
    // 4. 保留所有文本内容，不截断
    // 注意：Mistral Chat API支持较长的上下文，可以处理完整文本
    // 如果遇到token限制，API会返回错误，我们会在错误处理中处理
    
    console.log('文本清理完成：');
    console.log(`- 原始长度: ${textContent.length} 字符`);
    console.log(`- 清理后长度: ${cleaned.length} 字符`);
    console.log(`- 保留比例: ${((cleaned.length / textContent.length) * 100).toFixed(1)}%`);
    console.log('- 清理策略：最小限度清理，保留所有可见信息');
    
    return cleaned.trim();
  }

  /**
   * 使用AI解析OCR文本为结构化JSON数据
   * @param {string} textContent - OCR识别的文本
   * @returns {Promise<Object>} 解析后的发票数据
   */
  async parseInvoiceDataWithAI(textContent) {
    if (!mistralClient) {
      // 如果没有配置Mistral，返回空数据
      console.error('Mistral AI 未配置，无法解析发票数据');
      return {};
    }

    try {
      // 清理OCR返回的markdown数据（移除无用格式，但保留全部内容）
      const cleanedText = this.cleanOCRMarkdown(textContent);
      console.log('========================================');
      console.log('文本清理统计:');
      console.log(`- 原始文本长度: ${textContent.length} 字符`);
      console.log(`- 清理后长度: ${cleanedText.length} 字符`);
      console.log(`- 保留比例: ${((cleanedText.length / textContent.length) * 100).toFixed(1)}%`);
      console.log(`- 前800字符预览:`);
      console.log(cleanedText.substring(0, 800));
      console.log(`- 后800字符预览:`);
      console.log(cleanedText.substring(Math.max(0, cleanedText.length - 800)));
      console.log('========================================');
      console.log('✓ 已清理文本格式，将完整发送给AI解析（不截断）');
      // 使用统一的提示词配置
      const messages = [
        {
          role: 'system',
          content: AI_ANALYSIS_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: AI_ANALYSIS_USER_PROMPT_TEMPLATE(cleanedText)
        }
      ];

      // 调用 Mistral Chat API
      // 使用 response_format 强制返回 JSON 格式
      console.log('========================================');
      console.log('正在使用 AI 解析发票文本为结构化数据...');
      console.log(`- 发送文本长度: ${cleanedText.length} 字符`);
      console.log(`- 使用模型: mistral-small-latest`);
      console.log(`- 文本将完整发送（不截断）`);
      console.log(`- Temperature: 0.2 (提高识别能力)`);
      console.log(`- Max Tokens: 6000 (确保完整响应)`);
      console.log('========================================');
      
      // 估算 token 数量（粗略估算：1 token ≈ 4 字符）
      const estimatedTokens = Math.ceil(cleanedText.length / 4);
      const maxTokens = Math.min(6000, Math.max(2000, estimatedTokens + 2000)); // 确保有足够空间返回完整 JSON
      
      const result = await mistralClient.chat.complete({
        model: 'mistral-small-latest',
        messages: messages,
        temperature: 0.2, // 提高 temperature 以增强识别复杂格式的能力
        topP: 0.9, // 添加 top_p 参数控制多样性
        maxTokens: maxTokens, // 设置足够的 max_tokens 确保完整响应
        responseFormat: { type: 'json_object' }, // 强制返回JSON格式
        // 注意：如果文本过长，API可能会返回错误，我们会在catch中处理
      });

      const aiResponse = result.choices[0]?.message?.content || '';
      console.log('AI 解析响应:', aiResponse);

      // 解析 AI 返回的 JSON
      let invoiceData = {};
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          invoiceData = JSON.parse(jsonMatch[0]);
        } else {
          invoiceData = JSON.parse(aiResponse);
        }
      } catch (parseError) {
        console.error('解析 AI 响应失败:', parseError);
        console.error('AI响应内容:', aiResponse.substring(0, 500));
        // AI解析失败，返回空数据
        console.error('AI解析失败，无法提取发票数据');
        return {};
      }

      // 返回 AI 解析的原始数据，不进行字段映射和数据标准化
      // 字段映射和数据标准化将在调用此方法后进行
      console.log('AI解析的原始数据:', JSON.stringify(invoiceData, null, 2));
      return invoiceData;
    } catch (error) {
      console.error('========================================');
      console.error('AI 解析错误:', error.message);
      console.error('错误类型:', error.constructor.name);
      
      // 检查是否是token限制错误
      if (error.message && (error.message.includes('token') || error.message.includes('length') || error.message.includes('limit'))) {
        console.error('⚠ 文本过长导致token限制，建议：');
        console.error('   1. 检查OCR提取的文本是否包含过多无用内容');
        console.error('   2. 考虑分段处理长文本');
        console.error(`   当前文本长度: ${textContent.length} 字符`);
      }
      
      console.error('错误堆栈:', error.stack);
      console.error('========================================');
      // AI解析失败，返回空数据
      console.error('AI解析过程中发生错误，无法提取发票数据');
      return {};
    }
  }

  /**
   * 识别PDF发票（使用 Mistral AI OCR，如果识别不全则使用阿里云 OCR）
   * @param {string} pdfPath - PDF文件路径
   * @param {number} pageNumber - 页码（默认第1页，暂未使用，Mistral OCR会处理所有页面）
   * @returns {Promise<Object>} 识别结果
   */
  async recognizePDFInvoice(pdfPath, pageNumber = 1) {
    console.log('========================================');
    console.log('recognizePDFInvoice 被调用');
    console.log('PDF路径:', pdfPath);
    console.log('页码:', pageNumber);
    console.log('mistralClient 状态:', mistralClient ? '已初始化' : '未初始化');
    console.log('dashscopeClient 状态:', dashscopeClient ? '已初始化' : '未初始化');
    console.log('config.MISTRAL_API_KEY 状态:', config.MISTRAL_API_KEY ? `已配置 (${config.MISTRAL_API_KEY.substring(0, 10)}...)` : '未配置');
    console.log('config.DASHSCOPE_API_KEY 状态:', config.DASHSCOPE_API_KEY ? `已配置 (${config.DASHSCOPE_API_KEY.substring(0, 10)}...)` : '未配置');
    
    // 检查是否配置了至少一个 OCR 服务
    if (!mistralClient && !dashscopeClient) {
      const errorMsg = 'OCR 服务未配置，请设置 MISTRAL_API_KEY 或 DASHSCOPE_API_KEY 环境变量';
      console.error('OCR失败:', errorMsg);
      console.log('========================================');
      return {
        success: false,
        error: errorMsg,
        text: '',
        confidence: 0,
        invoiceData: {}
      };
    }
    
    // 首先尝试使用 Mistral AI OCR
    if (mistralClient) {
      console.log('第一步: 使用 Mistral AI 识别 PDF 发票');
    console.log('========================================');
      try {
        const mistralResult = await this.recognizeInvoiceWithMistral(pdfPath, 'pdf');
        
        // 检查识别结果是否完整
        if (mistralResult.success && mistralResult.invoiceData) {
          const { isComplete, missingFields } = this.isRecognitionComplete(mistralResult.invoiceData);
          
          if (isComplete) {
            console.log('✓ Mistral AI 识别完整，直接返回结果');
            console.log('========================================');
            // 数据已经过完整流程处理：OCR提取 → AI解析 → 字段映射 → 数据标准化
            return mistralResult;
          } else {
            console.log(`⚠ Mistral AI 识别不完整，缺失字段: ${missingFields.join(', ')}`);
            console.log('尝试使用阿里云 OCR 作为补充');
          }
        } else {
          console.log('⚠ Mistral AI 识别失败，尝试使用阿里云 OCR');
        }
      } catch (error) {
        console.error('Mistral AI 识别出错:', error.message);
        console.log('尝试使用阿里云 OCR 作为备选');
      }
    }
    
    // 如果 Mistral 识别不全或失败，使用阿里云 OCR
    if (dashscopeClient) {
      console.log('第二步: 使用阿里云 DashScope OCR 识别 PDF 发票');
      console.log('========================================');
      try {
        const dashscopeResult = await this.recognizeInvoiceWithDashScope(pdfPath, 'pdf');
        
        if (dashscopeResult.success) {
          console.log('✓ 阿里云 OCR 识别完成');
          console.log('========================================');
          // 数据已经过完整流程处理：OCR提取 → AI解析 → 字段映射 → 数据标准化
          return dashscopeResult;
        } else {
          console.error('✗ 阿里云 OCR 识别失败');
        }
      } catch (error) {
        console.error('阿里云 OCR 识别出错:', error.message);
      }
    }
    
    // 如果都失败了，返回错误
    console.log('========================================');
    return {
      success: false,
      error: '所有 OCR 服务都识别失败',
      text: '',
      confidence: 0,
      invoiceData: {}
    };
  }

  /**
   * 使用 Mistral AI OCR API 识别发票（图片或PDF）
   * @param {string} filePath - 文件路径
   * @param {string} fileType - 文件类型 ('image' 或 'pdf')
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeInvoiceWithMistral(filePath, fileType = 'image') {
    try {
      console.log('========================================');
      console.log('recognizeInvoiceWithMistral 被调用');
      console.log('文件路径:', filePath);
      console.log('文件类型:', fileType);
      console.log('mistralClient 状态:', mistralClient ? '已初始化' : '未初始化');
      
      if (!mistralClient) {
        const errorMsg = 'Mistral AI 未配置，请设置 MISTRAL_API_KEY 环境变量';
        console.error('OCR失败:', errorMsg);
        console.log('========================================');
        return {
          success: false,
          error: errorMsg,
          text: '',
          confidence: 0,
          invoiceData: {}
        };
      }

      const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.resolve(__dirname, '..', filePath);
      console.log('绝对路径:', absolutePath);
      console.log('文件是否存在:', fs.existsSync(absolutePath) ? '✓' : '✗');

      if (!fs.existsSync(absolutePath)) {
        throw new Error(`文件不存在: ${absolutePath}`);
      }

      // 检查是否支持 OCR API
      console.log('检查 Mistral OCR API 可用性...');
      console.log('mistralClient.ocr:', mistralClient.ocr ? '存在' : '不存在');
      console.log('mistralClient.ocr.process:', mistralClient.ocr?.process ? '存在' : '不存在');
      
      if (!mistralClient.ocr || !mistralClient.ocr.process) {
        console.log('Mistral OCR API 不可用，降级到 Chat API 方法');
        console.log('========================================');
        // 降级到传统 OCR + Chat API 方法
        return await this.recognizeInvoiceWithMistralChat(filePath, fileType);
      }
      
      console.log('Mistral OCR API 可用，继续处理...');

      // 读取文件并转换为 base64
      const fileBuffer = fs.readFileSync(absolutePath);
      const fileBase64 = fileBuffer.toString('base64');
      
      // 获取文件 MIME 类型
      const ext = path.extname(absolutePath).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf'
      };
      const mimeType = mimeTypes[ext] || (fileType === 'pdf' ? 'application/pdf' : 'image/jpeg');
      
      // 创建 data URL（根据 Mistral API 文档，支持 data URL）
      const dataUrl = `data:${mimeType};base64,${fileBase64}`;

      // 构建文档参数（根据 Mistral SDK 的实际要求）
      // SDK 要求：
      // - 对于图片：{ imageUrl: { url: "..." }, type: "image_url" }
      // - 对于文档：{ documentUrl: "...", type: "document_url" }
      let documentParam;
      if (fileType === 'pdf' || ext === '.pdf') {
        // PDF 文档使用 documentUrl
        documentParam = {
          documentUrl: dataUrl,
          type: 'document_url',
        };
      } else {
        // 图片：使用 imageUrl 对象，type 为 image_url
        documentParam = {
          imageUrl: {
            url: dataUrl,
          },
          type: 'image_url',
        };
      }

      // 调用 Mistral OCR API
      // 使用结构化输出，通过Chat API解析OCR提取的文本
      // Mistral OCR API 会自动提取所有可见文字并返回 markdown 格式
      // 注意：Mistral OCR API 目前不支持自定义提示词，但会自动按照通用 OCR 要求提取所有信息
      console.log('正在使用 Mistral OCR API 识别发票（将提取所有可见文字，返回 markdown 格式）...');
      console.log('请求参数:', {
        model: 'mistral-ocr-2505',
        documentType: documentParam.type,
        hasDocumentUrl: !!documentParam.documentUrl,
        hasImageUrl: !!documentParam.imageUrl
      });
      console.log('注意：Mistral OCR API 会自动识别图片/PDF中的所有文字，包括小字、印章、边角信息等');
      console.log('OCR 识别要求（通用）：完整提取所有可见文字，返回 markdown 格式，不遗漏任何信息');
      
      const ocrStartTime = Date.now();
      const result = await mistralClient.ocr.process({
        model: 'mistral-ocr-2505', // OCR 专用模型
        document: documentParam,
      });
      const ocrDuration = Date.now() - ocrStartTime;
      console.log(`\n  ⏱️  调用耗时: ${ocrDuration}ms`);
      console.log(`  📄 处理页数: ${result?.pages?.length || 0}`);
      console.log(`  ✅ OCR 调用成功`);
      console.log('════════════════════════════════════════════════════════════════');

      // 解析 OCR 结果
      // 根据 API 文档：响应格式为 { pages: [{ index, markdown, images, dimensions }], model, usage_info }
      let textContent = '';
      let invoiceData = {};

      // 从 pages 数组中提取文本
      if (result.pages && Array.isArray(result.pages) && result.pages.length > 0) {
        // 合并所有页面的 markdown 文本
        // pages 数组中的每个元素包含：index, markdown, images, dimensions
        textContent = result.pages
          .sort((a, b) => (a.index || 0) - (b.index || 0)) // 按索引排序
          .map(page => page.markdown || '')
          .filter(text => text.trim().length > 0) // 过滤空文本
          .join('\n\n');
        
        console.log(`提取了 ${result.pages.length} 页文本，总长度: ${textContent.length} 字符`);
        console.log(`使用的模型: ${result.model || 'unknown'}`);
        
        // 输出OCR识别的原始文本统计信息（完整提取，不截断）
        if (textContent && textContent.length > 0) {
          console.log('========================================');
          console.log('OCR识别的原始markdown文本统计:');
          console.log(`- 总字符数: ${textContent.length}`);
          console.log(`- 总行数: ${textContent.split('\n').length}`);
          console.log(`- 表格数量: ${(textContent.match(/\|/g) || []).length / 2} (估算)`);
          console.log(`- 前800字符预览:`);
          console.log(textContent.substring(0, 800));
          console.log(`- 后800字符预览:`);
          console.log(textContent.substring(Math.max(0, textContent.length - 800)));
          console.log('========================================');
          console.log('✓ OCR已提取全部markdown文本，将完整发送给AI解析（不截断，保留所有信息）');
        }
        
        // 记录使用信息（如果有）
        if (result.usage_info) {
          console.log(`处理页数: ${result.usage_info.pages_processed || 'unknown'}`);
        }
      } else {
        console.warn('OCR API 响应中没有 pages 数据');
        // 检查是否有 document_annotation（如果使用了 JSON 格式）
        if (result.document_annotation) {
          try {
            const annotation = typeof result.document_annotation === 'string' 
              ? JSON.parse(result.document_annotation) 
              : result.document_annotation;
            textContent = JSON.stringify(annotation, null, 2);
            console.log('使用 document_annotation 数据');
          } catch (e) {
            textContent = result.document_annotation;
          }
        }
      }

      // ============================================
      // 执行流程：OCR提取 → AI解析 → 字段映射 → 数据标准化
      // ============================================
      console.log('\n┌────────────────────────────────────────────────────────────┐');
      console.log('│ 📋 数据处理流程开始                                          │');
      console.log('└────────────────────────────────────────────────────────────┘');
      
      // 步骤1: OCR提取（已完成，textContent 为 markdown 文本）
      console.log('\n  [1/4] 🔍 OCR提取');
      console.log(`      ✅ 使用服务: Mistral OCR API (mistral-ocr-2505)`);
      console.log(`      📝 OCR文本长度: ${textContent.length} 字符`);
      console.log(`      📄 输出格式: Markdown`);
      
      // 步骤2: AI解析（将 markdown 文本解析为结构化 JSON）
      if (textContent && textContent.trim().length > 0) {
        try {
          console.log('\n  [2/4] 🤖 AI解析');
          console.log(`      ✅ 使用服务: Mistral AI Chat API (mistral-small-latest)`);
          console.log(`      📥 输入: Markdown 文本 (${textContent.length} 字符)`);
          invoiceData = await this.parseInvoiceDataWithAI(textContent);
          console.log(`      📤 输出: JSON 结构化数据`);
          console.log(`      📊 识别字段数: ${Object.keys(invoiceData).length} 个`);
        } catch (aiError) {
          console.error(`      ❌ AI解析失败: ${aiError.message}`);
          // AI解析失败，使用空数据
          invoiceData = {};
        }
      } else {
        // 如果没有文本内容，使用空数据
        invoiceData = {};
      }

      // 步骤3: 字段映射（将不同格式的字段名映射到标准字段名）
      console.log('\n  [3/4] 🔄 字段映射');
      const beforeMapping = Object.keys(invoiceData).length;
      invoiceData = this.mapFieldNames(invoiceData);
      const afterMapping = Object.keys(invoiceData).length;
      console.log(`      📋 映射前字段数: ${beforeMapping}`);
      console.log(`      📋 映射后字段数: ${afterMapping}`);
      
      // 步骤4: 数据标准化（日期格式、金额类型、字符串清理等）
      console.log('\n  [4/4] ✨ 数据标准化');
      invoiceData = this.normalizeInvoiceData(invoiceData);
      console.log(`      ✅ 日期格式: YYYY-MM-DD`);
      console.log(`      ✅ 金额类型: 数字`);
      console.log(`      ✅ 字符串: 已清理空格`);
      
      // 验证销售方和购买方信息
      console.log('\n┌────────────────────────────────────────────────────────────┐');
      console.log('│ 📊 识别结果验证                                              │');
      console.log('└────────────────────────────────────────────────────────────┘');
      console.log('  📦 销售方信息:');
      console.log(`      - 名称: ${invoiceData.vendorName || '❌ 未识别'}`);
      console.log(`      - 税号: ${invoiceData.vendorTaxId || '❌ 未识别'}`);
      console.log(`      - 地址: ${invoiceData.vendorAddress || '❌ 未识别'}`);
      if (!invoiceData.vendorName && !invoiceData.vendorTaxId) {
        console.warn('      ⚠️  警告：未识别到销售方信息');
      }
      
      console.log('\n  📦 购买方信息:');
      console.log(`      - 名称: ${invoiceData.buyerName || '❌ 未识别'}`);
      console.log(`      - 税号: ${invoiceData.buyerTaxId || '❌ 未识别'}`);
      if (!invoiceData.buyerName && !invoiceData.buyerTaxId) {
        console.warn('      ⚠️  警告：未识别到购买方信息');
      }
      
      console.log('\n  📋 其他信息:');
      console.log(`      - 发票号码: ${invoiceData.invoiceNumber || '❌ 未识别'}`);
      console.log(`      - 发票日期: ${invoiceData.invoiceDate || '❌ 未识别'}`);
      console.log(`      - 价税合计: ${invoiceData.totalAmount || '❌ 未识别'}`);
      console.log(`      - 项目明细: ${invoiceData.items ? invoiceData.items.length : 0} 项`);
      console.log('════════════════════════════════════════════════════════════════');

      return {
        success: true,
        text: textContent,
        confidence: 95, // Mistral OCR API 不直接返回置信度，使用默认值
        invoiceData: invoiceData,
        rawData: {
          text: textContent,
          words: [],
          lines: textContent.split('\n').filter(line => line.trim().length > 0),
          fullResponse: result, // 保存完整响应以便调试
          pages: result.pages || [],
          model: result.model,
          usageInfo: result.usage_info
        }
      };
    } catch (error) {
      console.error('========================================');
      console.error('Mistral OCR API 识别错误:', error.message);
      console.error('错误类型:', error.constructor.name);
      console.error('错误堆栈:', error.stack);
      if (error.response) {
        console.error('API响应状态:', error.response.status);
        console.error('API响应数据:', JSON.stringify(error.response.data, null, 2));
      }
      console.error('========================================');
      // 如果 OCR API 失败，尝试使用 Chat API 方法
      console.log('尝试使用 Chat API 方法作为备选...');
      return await this.recognizeInvoiceWithMistralChat(filePath, fileType);
    }
  }

  /**
   * 使用 Mistral AI Chat API 识别发票（备选方法）
   * @param {string} filePath - 文件路径
   * @param {string} fileType - 文件类型 ('image' 或 'pdf')
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeInvoiceWithMistralChat(filePath, fileType = 'image') {
    try {
      const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.resolve(__dirname, '..', filePath);

      // 对于图片和PDF，直接使用Mistral OCR API处理
      // 不需要预处理，Mistral OCR API可以直接处理图片和PDF文件
      console.log(`使用 Mistral Chat API 识别${fileType === 'image' ? '图片' : 'PDF'}发票...`);
      
      // 读取文件并转换为 base64
      const fileBuffer = fs.readFileSync(absolutePath);
      const fileBase64 = fileBuffer.toString('base64');
      
      // 获取文件 MIME 类型
      const ext = path.extname(absolutePath).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf'
      };
      const mimeType = mimeTypes[ext] || (fileType === 'pdf' ? 'application/pdf' : 'image/jpeg');
      
      // 创建 data URL
      const dataUrl = `data:${mimeType};base64,${fileBase64}`;

      // 构建文档参数
      let documentParam;
      if (fileType === 'pdf' || ext === '.pdf') {
        documentParam = {
          documentUrl: dataUrl,
          type: 'document_url',
        };
      } else {
        documentParam = {
          imageUrl: {
            url: dataUrl,
          },
          type: 'image_url',
        };
      }

      // 调用 Mistral OCR API 提取文本
      // 注意：Mistral OCR API 目前不支持自定义提示词，但会自动按照通用 OCR 要求提取所有信息
      console.log('调用 Mistral OCR API 提取文本...');
      console.log('OCR 识别要求（通用）：完整提取所有可见文字，返回 markdown 格式，不遗漏任何信息');
      const ocrResult = await mistralClient.ocr.process({
        model: 'mistral-ocr-2505', // OCR 专用模型
        document: documentParam,
      });

      let textContent = '';
      if (ocrResult.pages && Array.isArray(ocrResult.pages) && ocrResult.pages.length > 0) {
        textContent = ocrResult.pages
          .sort((a, b) => (a.index || 0) - (b.index || 0))
          .map(page => page.markdown || '')
          .filter(text => text.trim().length > 0)
          .join('\n\n');
        console.log(`OCR 提取的文本长度: ${textContent.length}`);
      }

      // 使用统一的提示词配置
      const messages = [
        {
          role: 'system',
          content: MISTRAL_CHAT_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: MISTRAL_CHAT_USER_PROMPT_TEMPLATE(textContent)
        }
      ];

      // 估算 token 数量（粗略估算：1 token ≈ 4 字符）
      const estimatedTokens = Math.ceil(textContent.length / 4);
      const maxTokens = Math.min(6000, Math.max(2000, estimatedTokens + 2000)); // 确保有足够空间返回完整 JSON
      
      // 调用 Mistral Chat API
      // 使用 response_format 强制返回 JSON 格式
      console.log('\n┌────────────────────────────────────────────────────────────┐');
      console.log('│ 🤖 调用 Mistral Chat API (Fallback)                         │');
      console.log('└────────────────────────────────────────────────────────────┘');
      console.log(`  🤖 模型: mistral-small-latest`);
      console.log(`  📥 输入: Markdown 文本 (${textContent.length} 字符)`);
      console.log(`  📤 输出: JSON 结构化数据`);
      console.log(`  ⚙️  Temperature: 0.2`);
      console.log(`  ⚙️  Max Tokens: ${maxTokens}`);
      const aiStartTime = Date.now();
      console.log('════════════════════════════════════════════════════════════════');
      
      const result = await mistralClient.chat.complete({
        model: 'mistral-small-latest',
        messages: messages,
        temperature: 0.2, // 提高 temperature 以增强识别复杂格式的能力
        topP: 0.9, // 添加 top_p 参数控制多样性
        maxTokens: maxTokens, // 设置足够的 max_tokens 确保完整响应
        responseFormat: { type: 'json_object' }, // 强制返回JSON格式
      });

      const aiDuration = Date.now() - aiStartTime;
      const aiResponse = result.choices[0]?.message?.content || '';
      console.log(`\n  ⏱️  调用耗时: ${aiDuration}ms`);

      // 解析 AI 返回的 JSON
      let invoiceData = {};
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          invoiceData = JSON.parse(jsonMatch[0]);
        } else {
          invoiceData = JSON.parse(aiResponse);
        }
        // 清理null值，转换为空字符串
        Object.keys(invoiceData).forEach(key => {
          if (invoiceData[key] === null) {
            invoiceData[key] = '';
          }
        });
        console.log(`  ✅ AI 解析成功`);
        console.log(`  📊 识别字段数: ${Object.keys(invoiceData).length} 个`);
        console.log('════════════════════════════════════════════════════════════════');
      } catch (parseError) {
        console.error(`  ❌ AI解析失败: ${parseError.message}`);
        // AI解析失败，返回空数据
        invoiceData = {};
      }

      // ============================================
      // 执行流程：OCR提取 → AI解析 → 字段映射 → 数据标准化
      // ============================================
      console.log('\n┌────────────────────────────────────────────────────────────┐');
      console.log('│ 📋 数据处理流程开始                                          │');
      console.log('└────────────────────────────────────────────────────────────┘');
      
      // 步骤1: OCR提取（已完成，textContent 为 markdown 文本）
      console.log('\n  [1/4] 🔍 OCR提取');
      console.log(`      ✅ 使用服务: Mistral OCR API (mistral-ocr-2505)`);
      console.log(`      📝 OCR文本长度: ${textContent.length} 字符`);
      console.log(`      📄 输出格式: Markdown`);
      
      // 步骤2: AI解析（Chat API 已返回结构化 JSON）
      console.log('\n  [2/4] 🤖 AI解析');
      console.log(`      ✅ 使用服务: Mistral AI Chat API (mistral-small-latest)`);
      console.log(`      📥 输入: Markdown 文本 (${textContent.length} 字符)`);
      console.log(`      📤 输出: JSON 结构化数据`);
      console.log(`      📊 识别字段数: ${Object.keys(invoiceData).length} 个`);
      
      // 步骤3: 字段映射（将不同格式的字段名映射到标准字段名）
      console.log('\n  [3/4] 🔄 字段映射');
      const beforeMapping = Object.keys(invoiceData).length;
      invoiceData = this.mapFieldNames(invoiceData);
      const afterMapping = Object.keys(invoiceData).length;
      console.log(`      📋 映射前字段数: ${beforeMapping}`);
      console.log(`      📋 映射后字段数: ${afterMapping}`);
      
      // 步骤4: 数据标准化（日期格式、金额类型、字符串清理等）
      console.log('\n  [4/4] ✨ 数据标准化');
      invoiceData = this.normalizeInvoiceData(invoiceData);
      console.log(`      ✅ 日期格式: YYYY-MM-DD`);
      console.log(`      ✅ 金额类型: 数字`);
      console.log(`      ✅ 字符串: 已清理空格`);
      
      // 验证销售方和购买方信息
      console.log('\n┌────────────────────────────────────────────────────────────┐');
      console.log('│ 📊 识别结果验证                                              │');
      console.log('└────────────────────────────────────────────────────────────┘');
      console.log('  📦 销售方信息:');
      console.log(`      - 名称: ${invoiceData.vendorName || '❌ 未识别'}`);
      console.log(`      - 税号: ${invoiceData.vendorTaxId || '❌ 未识别'}`);
      console.log(`      - 地址: ${invoiceData.vendorAddress || '❌ 未识别'}`);
      if (!invoiceData.vendorName && !invoiceData.vendorTaxId) {
        console.warn('      ⚠️  警告：未识别到销售方信息');
      }
      
      console.log('\n  📦 购买方信息:');
      console.log(`      - 名称: ${invoiceData.buyerName || '❌ 未识别'}`);
      console.log(`      - 税号: ${invoiceData.buyerTaxId || '❌ 未识别'}`);
      if (!invoiceData.buyerName && !invoiceData.buyerTaxId) {
        console.warn('      ⚠️  警告：未识别到购买方信息');
      }
      
      console.log('\n  📋 其他信息:');
      console.log(`      - 发票号码: ${invoiceData.invoiceNumber || '❌ 未识别'}`);
      console.log(`      - 发票日期: ${invoiceData.invoiceDate || '❌ 未识别'}`);
      console.log(`      - 价税合计: ${invoiceData.totalAmount || '❌ 未识别'}`);
      console.log(`      - 项目明细: ${invoiceData.items ? invoiceData.items.length : 0} 项`);
      console.log('════════════════════════════════════════════════════════════════');

      return {
        success: true,
        text: textContent || aiResponse,
        confidence: 95,
        invoiceData: invoiceData,
        rawData: {
          text: textContent || aiResponse,
          words: [],
          lines: (textContent || aiResponse).split('\n')
        }
      };
    } catch (error) {
      console.error('Mistral Chat API 识别错误:', error);
      return {
        success: false,
        error: error.message,
        text: '',
        confidence: 0,
        invoiceData: {}
      };
      }
  }

  /**
   * 将 PDF 转换为图片（使用 pdf-poppler）
   * @param {string} pdfPath - PDF 文件路径
   * @param {number} pageNumber - 页码（从1开始，默认第1页）
   * @returns {Promise<string>} 转换后的图片路径
   */
  async convertPDFToImage(pdfPath, pageNumber = 1) {
    try {
      console.log('开始转换 PDF 为图片:', pdfPath, '页码:', pageNumber);
      
      // 检查 poppler 工具是否可用
      const { execSync } = require('child_process');
      
      // 可能的 poppler 路径（按优先级排序）
      const possiblePopplerPaths = [
        '', // 系统 PATH 中的 poppler
        process.env.POPPLER_PATH ? `${process.env.POPPLER_PATH}/bin` : null,
        `${process.env.HOME}/.local/poppler/bin`,
        '/usr/local/bin',
        '/opt/homebrew/bin',
        '/usr/bin'
      ].filter(Boolean);
      
      let pdftoppmPath = null;
      let popplerBinDir = null;
      
      // 首先尝试系统 PATH
      try {
        execSync('pdftoppm -v', { stdio: 'ignore' });
        pdftoppmPath = 'pdftoppm';
        console.log('✓ 找到系统 PATH 中的 poppler');
      } catch (e) {
        // 尝试自定义路径
        for (const binDir of possiblePopplerPaths) {
          const testPath = binDir ? path.join(binDir, 'pdftoppm') : 'pdftoppm';
          try {
            execSync(`"${testPath}" -v`, { stdio: 'ignore' });
            pdftoppmPath = testPath;
            popplerBinDir = binDir;
            console.log(`✓ 找到 poppler: ${testPath}`);
            break;
          } catch (err) {
            // 继续尝试下一个路径
          }
        }
      }
      
      // 优先使用系统 pdftoppm 命令（更可靠）
      if (pdftoppmPath) {
        try {
          const outputDir = path.dirname(pdfPath);
          const outputPrefix = path.basename(pdfPath, path.extname(pdfPath));
          const outputPath = path.join(outputDir, `${outputPrefix}_page${pageNumber}.png`);
          
          // 使用 pdftoppm 直接转换
          // pdftoppm 输出格式：prefix-page.png（例如：file-1.png）
          const outputPrefixName = `${outputPrefix}_page${pageNumber}`;
          const expectedOutputPath = path.join(outputDir, `${outputPrefixName}-${pageNumber}.png`);
          
          // 构建命令：pdftoppm -png -f 1 -l 1 -singlefile input.pdf output_prefix
          // -singlefile 参数会生成单个文件 output_prefix-1.png
          const command = `"${pdftoppmPath}" -png -f ${pageNumber} -l ${pageNumber} -singlefile "${pdfPath}" "${path.join(outputDir, outputPrefixName)}"`;
          
          console.log(`执行命令: ${command}`);
          execSync(command, { stdio: 'pipe', encoding: 'utf8' });
          
          // pdftoppm 使用 -singlefile 时，输出文件名格式为：prefix-1.png（页码从1开始）
          // 例如：如果输出前缀是 "file_page1"，则生成 "file_page1-1.png"
          // 注意：pdftoppm 总是使用页码 "1" 作为后缀，即使指定了 -f 和 -l
          const possiblePaths = [
            path.join(outputDir, `${outputPrefixName}-1.png`), // prefix_page1-1.png (最常见)
            path.join(outputDir, `${outputPrefixName}-${pageNumber}.png`), // prefix_page1-1.png (如果 pageNumber=1)
            path.join(outputDir, `${outputPrefixName}.png`), // prefix_page1.png (无页码后缀)
            path.join(outputDir, `${outputPrefix}-1.png`), // prefix-1.png (简化前缀)
            expectedOutputPath // prefix_page1-1.png (原始预期路径)
          ];
          
          // 查找实际生成的图片文件
          let foundPath = null;
          for (const possiblePath of possiblePaths) {
            if (fs.existsSync(possiblePath)) {
              foundPath = possiblePath;
              break;
            }
          }
          
          // 如果没找到，列出目录中的所有文件以便调试
          if (!foundPath) {
            const filesInDir = fs.readdirSync(outputDir).filter(f => f.endsWith('.png'));
            console.error(`未找到转换后的图片文件。目录中的 PNG 文件:`, filesInDir);
            throw new Error(`PDF 转换失败：生成的图片文件不存在。可能的文件名: ${possiblePaths.join(', ')}`);
          }
          
          console.log(`✓ PDF 转换成功（使用系统 pdftoppm），输出路径: ${foundPath}`);
          return foundPath;
        } catch (systemError) {
          console.error('系统 pdftoppm 转换失败:', systemError.message);
          // 继续尝试 pdf-poppler
        }
      }
      
      // 如果系统 pdftoppm 不可用，尝试使用 pdf-poppler
      const pdfPoppler = require('pdf-poppler');
      const outputDir = path.dirname(pdfPath);
      const outputFilename = path.basename(pdfPath, path.extname(pdfPath)) + `_page${pageNumber}.png`;
      const outputPath = path.join(outputDir, outputFilename);
      
      const options = {
        format: 'png',
        out_dir: outputDir,
        out_prefix: path.basename(pdfPath, path.extname(pdfPath)),
        page: pageNumber
      };
      
      // 如果找到了自定义 poppler 路径，设置环境变量
      if (popplerBinDir) {
        const originalPath = process.env.PATH;
        process.env.PATH = `${popplerBinDir}:${originalPath}`;
        console.log(`设置 PATH: ${process.env.PATH}`);
      }
      
      await pdfPoppler.convert(pdfPath, options);
      
      // pdf-poppler 会生成带页码的文件名
      const generatedPath = path.join(outputDir, `${options.out_prefix}-${pageNumber}.png`);
      if (fs.existsSync(generatedPath)) {
        console.log('✓ PDF 转换成功（使用 pdf-poppler），输出路径:', generatedPath);
        return generatedPath;
      } else {
        throw new Error('PDF 转换失败：生成的图片文件不存在');
      }
    } catch (error) {
      console.error('PDF 转换错误（pdf-poppler）:', error.message);
      
      // 如果 pdf-poppler 失败，尝试使用 pdf2pic 作为备选方案
      try {
        console.log('尝试使用 pdf2pic 作为备选方案...');
        const pdf2pic = require('pdf2pic');
        const outputDir = path.dirname(pdfPath);
        const outputPrefix = path.basename(pdfPath, path.extname(pdfPath));
        
        const convert = pdf2pic.fromPath(pdfPath, {
          density: 200,
          saveFilename: outputPrefix,
          savePath: outputDir,
          format: 'png',
          width: 2000,
          height: 2000
        });
        
        const result = await convert(pageNumber, { responseType: 'image' });
        if (result && result.path && fs.existsSync(result.path)) {
          console.log('✓ PDF 转换成功（使用 pdf2pic），输出路径:', result.path);
          return result.path;
        }
      } catch (pdf2picError) {
        console.error('pdf2pic 转换也失败:', pdf2picError.message);
      }
      
      // 如果两种方法都失败，抛出错误
      const errorMsg = error.message || '未知错误';
      
      // 检查是否是 poppler 未安装的错误
      if (errorMsg.includes('pdftoppm') || errorMsg.includes('poppler') || errorMsg.includes('command not found')) {
        const installHint = process.platform === 'darwin' 
          ? 'brew install poppler（如果网络有问题，可以稍后重试）' 
          : '请安装 poppler 工具包';
        throw new Error(`PDF 转图片失败: 系统未安装 poppler 工具。请运行: ${installHint}`);
      }
      
      throw new Error(`PDF 转图片失败: ${errorMsg}`);
    }
      }
      
  /**
   * 使用阿里云 DashScope OCR 识别发票（图片或PDF）
   * @param {string} filePath - 文件路径
   * @param {string} fileType - 文件类型 ('image' 或 'pdf')
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeInvoiceWithDashScope(filePath, fileType = 'image') {
    try {
      console.log('========================================');
      console.log('recognizeInvoiceWithDashScope 被调用');
      console.log('文件路径:', filePath);
      console.log('文件类型:', fileType);
      
      if (!dashscopeClient) {
        const errorMsg = '阿里云 DashScope 未配置，请设置 DASHSCOPE_API_KEY 环境变量';
        console.error('OCR失败:', errorMsg);
        console.log('========================================');
        return {
          success: false,
          error: errorMsg,
          text: '',
          confidence: 0,
          invoiceData: {}
        };
      }

      const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.resolve(__dirname, '..', filePath);
      console.log('绝对路径:', absolutePath);
      console.log('文件是否存在:', fs.existsSync(absolutePath) ? '✓' : '✗');

      if (!fs.existsSync(absolutePath)) {
        throw new Error(`文件不存在: ${absolutePath}`);
      }

      // 如果是 PDF，先转换为图片
      let imagePath = absolutePath;
      let tempImagePath = null; // 用于标记临时文件，需要在函数结束时清理
      
      if (fileType === 'pdf') {
        console.log('\n┌────────────────────────────────────────────────────────────┐');
        console.log('│ 📄 PDF 转图片处理                                            │');
        console.log('└────────────────────────────────────────────────────────────┘');
        console.log('  🔧 转换工具: poppler (pdftoppm)');
        console.log(`  📄 PDF路径: ${absolutePath}`);
        try {
          imagePath = await this.convertPDFToImage(absolutePath, 1);
          tempImagePath = imagePath; // 标记为临时文件，后续需要删除
          console.log(`  ✅ 转换成功: ${imagePath}`);
          console.log('════════════════════════════════════════════════════════════════');
        } catch (convertError) {
          console.error(`  ❌ PDF 转图片失败: ${convertError.message}`);
          console.log('════════════════════════════════════════════════════════════════');
          return {
            success: false,
            error: `PDF 转图片失败: ${convertError.message}`,
            text: '',
            confidence: 0,
            invoiceData: {}
          };
        }
      }

      // 读取图片文件并转换为 base64
      const fileBuffer = fs.readFileSync(imagePath);
      const fileBase64 = fileBuffer.toString('base64');
      
      // 获取文件 MIME 类型（转换后都是图片）
      const ext = path.extname(imagePath).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
      };
      const mimeType = mimeTypes[ext] || 'image/png';
      
      // 创建 data URL
      const dataUrl = `data:${mimeType};base64,${fileBase64}`;

      // 使用统一的 OCR 提示词配置
      const ocrPrompt = OCR_PROMPT;

      console.log('\n┌────────────────────────────────────────────────────────────┐');
      console.log('│ 🔍 调用阿里云 DashScope OCR API                              │');
      console.log('└────────────────────────────────────────────────────────────┘');
      console.log(`  🤖 模型: qwen-vl-ocr-latest`);
      console.log(`  📄 输入: ${fileType === 'pdf' ? '图片 (PDF转换)' : '图片'}`);
      console.log(`  📝 输出格式: Markdown`);
      const ocrStartTime = Date.now();
      
      // 调用阿里云 OCR API - 返回 markdown 格式文本
      const response = await dashscopeClient.chat.completions.create({
        model: 'qwen-vl-ocr-latest',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: ocrPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                  min_pixels: 28 * 28 * 4,
                  max_pixels: 28 * 28 * 8192
                }
              }
            ]
          }
        ]
      });

      const ocrDuration = Date.now() - ocrStartTime;
      console.log(`  ⏱️  调用耗时: ${ocrDuration}ms`);
      console.log('  ✅ OCR 调用成功');
      console.log('════════════════════════════════════════════════════════════════');

      // 解析响应 - OCR 返回 markdown 格式文本
      const ocrText = response.choices[0]?.message?.content || '';
      console.log(`\n  📝 OCR文本长度: ${ocrText.length} 字符`);
      if (ocrText.length > 0) {
        console.log(`  📄 文本预览（前200字符）: ${ocrText.substring(0, 200)}...`);
      }
      
      if (!ocrText || ocrText.trim().length === 0) {
        throw new Error('阿里云 OCR 未返回文本内容');
      }

      // ============================================
      // 执行流程：OCR提取 → AI解析 → 字段映射 → 数据标准化
      // ============================================
      console.log('\n┌────────────────────────────────────────────────────────────┐');
      console.log('│ 📋 数据处理流程开始                                          │');
      console.log('└────────────────────────────────────────────────────────────┘');
      
      // 步骤1: OCR提取（已完成，ocrText 为 markdown 文本）
      console.log('\n  [1/4] 🔍 OCR提取');
      console.log(`      ✅ 使用服务: 阿里云 DashScope OCR (qwen-vl-ocr-latest)`);
      if (fileType === 'pdf') {
        console.log(`      📄 文件类型: PDF (已转换为图片)`);
        console.log(`      🛠️  转换工具: poppler (pdftoppm)`);
      } else {
        console.log(`      📄 文件类型: 图片`);
      }
      console.log(`      📝 OCR文本长度: ${ocrText.length} 字符`);
      console.log(`      📄 输出格式: Markdown`);
      
      // 步骤2: AI解析（将 markdown 文本解析为结构化 JSON）
      console.log('\n  [2/4] 🤖 AI解析');
      console.log(`      ✅ 使用服务: Mistral AI Chat API (mistral-small-latest)`);
      console.log(`      📥 输入: Markdown 文本 (${ocrText.length} 字符)`);
      let invoiceData = {};
      try {
        invoiceData = await this.parseInvoiceDataWithAI(ocrText);
        console.log(`      📤 输出: JSON 结构化数据`);
        console.log(`      📊 识别字段数: ${Object.keys(invoiceData).length} 个`);
      } catch (parseError) {
        console.error(`      ❌ AI解析失败: ${parseError.message}`);
        // AI解析失败，返回空数据
        invoiceData = {};
      }

      // 步骤3: 字段映射（将不同格式的字段名映射到标准字段名）
      console.log('\n  [3/4] 🔄 字段映射');
      const beforeMapping = Object.keys(invoiceData).length;
      invoiceData = this.mapFieldNames(invoiceData);
      const afterMapping = Object.keys(invoiceData).length;
      console.log(`      📋 映射前字段数: ${beforeMapping}`);
      console.log(`      📋 映射后字段数: ${afterMapping}`);
      
      // 步骤4: 数据标准化（日期格式、金额类型、字符串清理等）
      console.log('\n  [4/4] ✨ 数据标准化');
      invoiceData = this.normalizeInvoiceData(invoiceData);
      console.log(`      ✅ 日期格式: YYYY-MM-DD`);
      console.log(`      ✅ 金额类型: 数字`);
      console.log(`      ✅ 字符串: 已清理空格`);
      
      // 验证销售方和购买方信息
      console.log('\n┌────────────────────────────────────────────────────────────┐');
      console.log('│ 📊 识别结果验证                                              │');
      console.log('└────────────────────────────────────────────────────────────┘');
      console.log('  📦 销售方信息:');
      console.log(`      - 名称: ${invoiceData.vendorName || '❌ 未识别'}`);
      console.log(`      - 税号: ${invoiceData.vendorTaxId || '❌ 未识别'}`);
      console.log(`      - 地址: ${invoiceData.vendorAddress || '❌ 未识别'}`);
      if (!invoiceData.vendorName && !invoiceData.vendorTaxId) {
        console.warn('      ⚠️  警告：未识别到销售方信息');
      }
      
      console.log('\n  📦 购买方信息:');
      console.log(`      - 名称: ${invoiceData.buyerName || '❌ 未识别'}`);
      console.log(`      - 税号: ${invoiceData.buyerTaxId || '❌ 未识别'}`);
      if (!invoiceData.buyerName && !invoiceData.buyerTaxId) {
        console.warn('      ⚠️  警告：未识别到购买方信息');
      }
      
      console.log('\n  📋 其他信息:');
      console.log(`      - 发票号码: ${invoiceData.invoiceNumber || '❌ 未识别'}`);
      console.log(`      - 发票日期: ${invoiceData.invoiceDate || '❌ 未识别'}`);
      console.log(`      - 价税合计: ${invoiceData.totalAmount || '❌ 未识别'}`);
      console.log(`      - 项目明细: ${invoiceData.items ? invoiceData.items.length : 0} 项`);
      console.log('════════════════════════════════════════════════════════════════');

      // 清理临时图片文件（如果是 PDF 转换生成的）
      if (tempImagePath && fs.existsSync(tempImagePath)) {
        try {
          fs.unlinkSync(tempImagePath);
          console.log('✓ 已清理临时图片文件:', tempImagePath);
        } catch (cleanupError) {
          console.warn('清理临时文件失败:', cleanupError.message);
        }
      }

      return {
        success: true,
        text: ocrText,
        confidence: 90, // 阿里云 OCR 默认置信度
        invoiceData: invoiceData,
        rawData: {
          text: ocrText,
          words: [],
          lines: ocrText.split('\n').filter(line => line.trim().length > 0),
          fullResponse: response,
          provider: 'dashscope'
        }
      };
    } catch (error) {
      console.error('========================================');
      console.error('阿里云 DashScope OCR 识别错误:', error.message);
      console.error('错误类型:', error.constructor.name);
      console.error('错误堆栈:', error.stack);
      if (error.response) {
        console.error('API响应状态:', error.response.status);
        console.error('API响应数据:', JSON.stringify(error.response.data, null, 2));
      }
      console.error('========================================');
      
      // 清理临时图片文件（错误情况下也要清理）
      if (tempImagePath && fs.existsSync(tempImagePath)) {
        try {
          fs.unlinkSync(tempImagePath);
          console.log('✓ 已清理临时图片文件:', tempImagePath);
        } catch (cleanupError) {
          console.warn('清理临时文件失败:', cleanupError.message);
        }
      }
      
      return {
        success: false,
        error: error.message,
        text: '',
        confidence: 0,
        invoiceData: {}
      };
    }
  }
}

module.exports = new OCRService();

