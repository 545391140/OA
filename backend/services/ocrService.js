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
  Mistral = require('@mistralai/mistralai').Mistral;
  
  if (config.MISTRAL_API_KEY) {
    mistralClient = new Mistral({
      apiKey: config.MISTRAL_API_KEY,
    });
  }
} catch (e) {
  mistralClient = null;
}

// 导入阿里云 DashScope (使用 OpenAI SDK 兼容模式)
let OpenAI;
let dashscopeClient;
try {
  OpenAI = require('openai');
  
  if (config.DASHSCOPE_API_KEY) {
    dashscopeClient = new OpenAI({
      apiKey: config.DASHSCOPE_API_KEY,
      baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });
  }
} catch (e) {
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
    // 增加关键字段：发票号码、发票日期、销售方名称、购买方名称、金额、税号
    const criticalFields = [
      'invoiceNumber',    // 发票号码（必填）
      'invoiceDate',      // 发票日期（必填）
      'vendorName',       // 销售方名称
      'vendorTaxId',      // 销售方税号（必填）
      'buyerName',        // 购买方名称
      'buyerTaxId',       // 购买方税号（必填）
      'totalAmount'       // 价税合计
    ];

    // 必填字段：发票号码、发票日期、销售方税号、购买方税号必须存在
    const requiredFields = ['invoiceNumber', 'invoiceDate', 'vendorTaxId', 'buyerTaxId'];
    
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

    // 税号验证：只检查是否存在，不检查格式
    // 如果税号不存在，会在 requiredFields 检查中被检测到，触发阿里云OCR fallback

    // 如果必填字段缺失，直接返回不完整
    if (missingRequiredFields.length > 0) {
      return { 
        isComplete: false, 
        missingFields: missingRequiredFields
      };
    }

    // 如果必填字段都存在，要求至少有 5 个关键字段有值，才认为识别完整
    // 例如：发票号码 + 发票日期 + 销售方名称 + 销售方税号 + 金额 = 5个字段
    const requiredFieldCount = 5;
    if (validFieldCount >= requiredFieldCount) {
      return { 
        isComplete: true, 
        missingFields: []
      };
    }

    return { 
      isComplete: false, 
      missingFields: missingFields
    };
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
    
    // 检查是否配置了至少一个 OCR 服务
    if (!mistralClient && !dashscopeClient) {
      const errorMsg = 'OCR 服务未配置，请设置 MISTRAL_API_KEY 或 DASHSCOPE_API_KEY 环境变量';
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
      try {
        const mistralResult = await this.recognizeInvoiceWithMistral(imagePath, 'image');
        
        // 检查识别结果是否完整
        if (mistralResult.success && mistralResult.invoiceData) {
          const { isComplete, missingFields } = this.isRecognitionComplete(mistralResult.invoiceData);
          
          if (isComplete) {
            // 数据已经过完整流程处理：OCR提取 → AI解析 → 字段映射 → 数据标准化
            return mistralResult;
          } else {
            if (missingFields && missingFields.length > 0) {
            }
          }
        } else {
        }
      } catch (error) {
      }
    }
    
    // 如果 Mistral 识别不全或失败，使用阿里云 OCR
    if (dashscopeClient) {
      try {
        const dashscopeResult = await this.recognizeInvoiceWithDashScope(imagePath, 'image');
        
        if (dashscopeResult.success) {
          // 数据已经过完整流程处理：OCR提取 → AI解析 → 字段映射 → 数据标准化
          return dashscopeResult;
        } else {
        }
      } catch (error) {
      }
    }
    
    // 如果都失败了，返回错误
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
      return {};
    }

    try {
      // 清理OCR返回的markdown数据（移除无用格式，但保留全部内容）
      const cleanedText = this.cleanOCRMarkdown(textContent);
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

      console.log('========================================');
      console.log('AI 解析响应');
      console.log('AI 返回的原始内容长度:', aiResponse.length);
      console.log('AI 返回的原始内容（前500字符）:', aiResponse.substring(0, 500));
      console.log('AI 返回的完整内容:', aiResponse);
      console.log('========================================');

      // 解析 AI 返回的 JSON
      let invoiceData = {};
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log('找到 JSON 匹配，开始解析...');
          invoiceData = JSON.parse(jsonMatch[0]);
          console.log('✓ JSON 解析成功，字段数量:', Object.keys(invoiceData).length);
          console.log('解析后的数据:', JSON.stringify(invoiceData, null, 2));
        } else {
          console.log('未找到 JSON 匹配，尝试直接解析...');
          invoiceData = JSON.parse(aiResponse);
          console.log('✓ JSON 解析成功，字段数量:', Object.keys(invoiceData).length);
          console.log('解析后的数据:', JSON.stringify(invoiceData, null, 2));
        }
      } catch (parseError) {
        // AI解析失败，返回空数据
        console.error('✗ JSON 解析失败:', parseError.message);
        console.error('解析错误堆栈:', parseError.stack);
        console.error('尝试解析的内容:', aiResponse);
        return {};
      }

      // 返回 AI 解析的原始数据，不进行字段映射和数据标准化
      // 字段映射和数据标准化将在调用此方法后进行
      return invoiceData;
    } catch (error) {
      
      // 检查是否是token限制错误
      if (error.message && (error.message.includes('token') || error.message.includes('length') || error.message.includes('limit'))) {
      }
      
      // AI解析失败，返回空数据
      return {};
    }
  }

  /**
   * 识别PDF发票（使用 Mistral AI OCR，如果识别不全则使用阿里云 OCR）
   * @param {string} pdfPath - PDF文件路径
   * @param {number} pageNumber - 页码（默认第1页，暂未使用，Mistral OCR会处理所有页面）
   * @param {string} preConvertedImagePath - 提前转换好的图片路径（可选，如果提供则 fallback 时直接使用）
   * @returns {Promise<Object>} 识别结果
   */
  async recognizePDFInvoice(pdfPath, pageNumber = 1, preConvertedImagePath = null) {
    
    // 检查是否配置了至少一个 OCR 服务
    if (!mistralClient && !dashscopeClient) {
      const errorMsg = 'OCR 服务未配置，请设置 MISTRAL_API_KEY 或 DASHSCOPE_API_KEY 环境变量';
      return {
        success: false,
        error: errorMsg,
        text: '',
        confidence: 0,
        invoiceData: {}
      };
    }
    
    // 首先尝试使用 Mistral AI OCR（使用原 PDF，不需要转换后的图片）
    if (mistralClient) {
      try {
        const mistralResult = await this.recognizeInvoiceWithMistral(pdfPath, 'pdf');
        
        // 检查识别结果是否完整
        if (mistralResult.success && mistralResult.invoiceData) {
          const { isComplete, missingFields } = this.isRecognitionComplete(mistralResult.invoiceData);
          
          if (isComplete) {
            // 数据已经过完整流程处理：OCR提取 → AI解析 → 字段映射 → 数据标准化
            return mistralResult;
          } else {
          }
        } else {
        }
      } catch (error) {
      }
    }
    
    // 如果 Mistral 识别不全或失败，使用阿里云 OCR
    // 如果提供了提前转换的图片路径，直接使用，否则在函数内部转换
    if (dashscopeClient) {
      try {
        const dashscopeResult = await this.recognizeInvoiceWithDashScope(pdfPath, 'pdf', preConvertedImagePath);
        
        if (dashscopeResult.success) {
          // 数据已经过完整流程处理：OCR提取 → AI解析 → 字段映射 → 数据标准化
          return dashscopeResult;
        } else {
        }
      } catch (error) {
      }
    }
    
    // 如果都失败了，返回错误
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
      
      if (!mistralClient) {
        const errorMsg = 'Mistral AI 未配置，请设置 MISTRAL_API_KEY 环境变量';
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

      if (!fs.existsSync(absolutePath)) {
        throw new Error(`文件不存在: ${absolutePath}`);
      }

      // 检查是否支持 OCR API
      
      if (!mistralClient.ocr || !mistralClient.ocr.process) {
        // 降级到传统 OCR + Chat API 方法
        return await this.recognizeInvoiceWithMistralChat(filePath, fileType);
      }
      

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
      
      const ocrStartTime = Date.now();
      const result = await mistralClient.ocr.process({
        model: 'mistral-ocr-2505', // OCR 专用模型
        document: documentParam,
      });
      const ocrDuration = Date.now() - ocrStartTime;

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
        
        
        // 输出OCR识别的原始文本统计信息（完整提取，不截断）
        if (textContent && textContent.length > 0) {
        }
        
        // 记录使用信息（如果有）
        if (result.usage_info) {
        }
      } else {
        // 检查是否有 document_annotation（如果使用了 JSON 格式）
        if (result.document_annotation) {
          try {
            const annotation = typeof result.document_annotation === 'string' 
              ? JSON.parse(result.document_annotation) 
              : result.document_annotation;
            textContent = JSON.stringify(annotation, null, 2);
          } catch (e) {
            textContent = result.document_annotation;
          }
        }
      }

      // ============================================
      // 执行流程：OCR提取 → AI解析 → 字段映射 → 数据标准化
      // ============================================
      
      // 步骤1: OCR提取（已完成，textContent 为 markdown 文本）
      
      // 步骤2: AI解析（将 markdown 文本解析为结构化 JSON）
      if (textContent && textContent.trim().length > 0) {
        try {
          invoiceData = await this.parseInvoiceDataWithAI(textContent);
        } catch (aiError) {
          // AI解析失败，使用空数据
          invoiceData = {};
        }
      } else {
        // 如果没有文本内容，使用空数据
        invoiceData = {};
      }

      // 步骤3: 字段映射（将不同格式的字段名映射到标准字段名）
      const beforeMapping = Object.keys(invoiceData).length;
      invoiceData = this.mapFieldNames(invoiceData);
      const afterMapping = Object.keys(invoiceData).length;
      
      // 步骤4: 数据标准化（日期格式、金额类型、字符串清理等）
      invoiceData = this.normalizeInvoiceData(invoiceData);
      
      // 验证销售方和购买方信息
      if (!invoiceData.vendorName && !invoiceData.vendorTaxId) {
      }
      
      if (!invoiceData.buyerName && !invoiceData.buyerTaxId) {
      }
      

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
      if (error.response) {
      }
      // 如果 OCR API 失败，尝试使用 Chat API 方法
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
      const aiStartTime = Date.now();
      
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
      } catch (parseError) {
        // AI解析失败，返回空数据
        invoiceData = {};
      }

      // ============================================
      // 执行流程：OCR提取 → AI解析 → 字段映射 → 数据标准化
      // ============================================
      
      // 步骤1: OCR提取（已完成，textContent 为 markdown 文本）
      
      // 步骤2: AI解析（Chat API 已返回结构化 JSON）
      
      // 步骤3: 字段映射（将不同格式的字段名映射到标准字段名）
      const beforeMapping = Object.keys(invoiceData).length;
      invoiceData = this.mapFieldNames(invoiceData);
      const afterMapping = Object.keys(invoiceData).length;
      
      // 步骤4: 数据标准化（日期格式、金额类型、字符串清理等）
      invoiceData = this.normalizeInvoiceData(invoiceData);
      
      // 验证销售方和购买方信息
      if (!invoiceData.vendorName && !invoiceData.vendorTaxId) {
      }
      
      if (!invoiceData.buyerName && !invoiceData.buyerTaxId) {
      }
      

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
      possiblePopplerPaths.forEach((p, i) => {
        // 路径检查
      });
      
      try {
        execSync('pdftoppm -v', { stdio: 'ignore' });
        pdftoppmPath = 'pdftoppm';
      } catch (e) {
        // 尝试自定义路径
        for (const binDir of possiblePopplerPaths) {
          const testPath = binDir ? path.join(binDir, 'pdftoppm') : 'pdftoppm';
          try {
            execSync(`"${testPath}" -v`, { stdio: 'ignore' });
            pdftoppmPath = testPath;
            popplerBinDir = binDir;
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
          
          const startTime = Date.now();
          execSync(command, { stdio: 'pipe', encoding: 'utf8' });
          const duration = Date.now() - startTime;
          
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
            throw new Error(`PDF 转换失败：生成的图片文件不存在。可能的文件名: ${possiblePaths.join(', ')}`);
          }
          
          return foundPath;
        } catch (systemError) {
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
      }
      
      const startTime = Date.now();
      await pdfPoppler.convert(pdfPath, options);
      const duration = Date.now() - startTime;
      
      // pdf-poppler 会生成带页码的文件名
      const generatedPath = path.join(outputDir, `${options.out_prefix}-${pageNumber}.png`);
      if (fs.existsSync(generatedPath)) {
        return generatedPath;
      } else {
        throw new Error('PDF 转换失败：生成的图片文件不存在');
      }
    } catch (error) {
      
      // 如果 pdf-poppler 失败，尝试使用 pdf2pic 作为备选方案
      try {
        const pdf2pic = require('pdf2pic');
        const outputDir = path.dirname(pdfPath);
        const outputPrefix = path.basename(pdfPath, path.extname(pdfPath));
        
        const pdf2picOptions = {
          density: 200,
          saveFilename: outputPrefix,
          savePath: outputDir,
          format: 'png',
          width: 2000,
          height: 2000
        };
        
        const convert = pdf2pic.fromPath(pdfPath, pdf2picOptions);
        const startTime = Date.now();
        const result = await convert(pageNumber, { responseType: 'image' });
        const duration = Date.now() - startTime;
        
        if (result && result.path && fs.existsSync(result.path)) {
          return result.path;
        } else {
        }
      } catch (pdf2picError) {
      }
      
      // 如果所有方法都失败，抛出错误
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
   * @param {string} preConvertedImagePath - 提前转换好的图片路径（可选，如果提供则直接使用，不进行转换）
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeInvoiceWithDashScope(filePath, fileType = 'image', preConvertedImagePath = null) {
    try {
      
      if (!dashscopeClient) {
        const errorMsg = '阿里云 DashScope 未配置，请设置 DASHSCOPE_API_KEY 环境变量';
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

      if (!fs.existsSync(absolutePath)) {
        throw new Error(`文件不存在: ${absolutePath}`);
          }

      // 如果是 PDF，先转换为图片（如果提供了提前转换的图片，直接使用）
      let imagePath = absolutePath;
      let tempImagePath = null; // 用于标记临时文件，需要在函数结束时清理
      
      if (fileType === 'pdf') {
        // 如果提供了提前转换的图片路径，直接使用
        if (preConvertedImagePath && fs.existsSync(preConvertedImagePath)) {
          console.log('使用提前转换的图片:', preConvertedImagePath);
          imagePath = preConvertedImagePath;
          // 注意：提前转换的图片由调用者管理，这里不标记为临时文件
        } else {
          // 如果没有提前转换，则在这里转换
          try {
            console.log('PDF 转图片（fallback 时转换）...');
            imagePath = await this.convertPDFToImage(absolutePath, 1);
            tempImagePath = imagePath; // 标记为临时文件，后续需要删除
          } catch (convertError) {
            return {
              success: false,
              error: `PDF 转图片失败: ${convertError.message}`,
              text: '',
              confidence: 0,
              invoiceData: {}
            };
          }
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

      const ocrStartTime = Date.now();
      
      // 调用阿里云 OCR API - 返回 markdown 格式文本
      const response = await dashscopeClient.chat.completions.create({
        model: 'qwen-vl-max',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: ocrPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                  min_pixels: 28 * 28 * 600,
                  max_pixels: 28 * 28 * 15360   
                }
              }
            ]
          }
        ]
      });

      const ocrDuration = Date.now() - ocrStartTime;

      // 解析响应 - OCR 返回 markdown 格式文本
      const ocrText = response.choices[0]?.message?.content || '';
      
      console.log('========================================');
      console.log('阿里云 OCR API 响应');
      console.log('OCR 原始文本长度:', ocrText.length);
      console.log('OCR 原始文本内容:', ocrText);
      console.log('OCR 完整响应:', JSON.stringify(response, null, 2));
      console.log('========================================');
      
      if (ocrText.length > 0) {
      }
      
      if (!ocrText || ocrText.trim().length === 0) {
        throw new Error('阿里云 OCR 未返回文本内容');
      }

      // ============================================
      // 执行流程：OCR提取 → AI解析 → 字段映射 → 数据标准化
      // ============================================
      
      // 步骤1: OCR提取（已完成，ocrText 为 markdown 文本）
      if (fileType === 'pdf') {
          } else {
      }
      
      // 步骤2: AI解析（将 markdown 文本解析为结构化 JSON）
      let invoiceData = {};
      try {
        console.log('========================================');
        console.log('开始 AI 解析 OCR 文本');
        console.log('OCR 文本长度:', ocrText.length);
        console.log('OCR 文本内容（前500字符）:', ocrText.substring(0, 500));
        console.log('========================================');
        invoiceData = await this.parseInvoiceDataWithAI(ocrText);
        console.log('AI 解析完成，返回的字段数量:', Object.keys(invoiceData).length);
        console.log('AI 解析返回的数据:', JSON.stringify(invoiceData, null, 2));
      } catch (parseError) {
        // AI解析失败，返回空数据
        console.error('✗ AI 解析异常:', parseError.message);
        console.error('解析错误堆栈:', parseError.stack);
        invoiceData = {};
      }

      // 步骤3: 字段映射（将不同格式的字段名映射到标准字段名）
      const beforeMapping = Object.keys(invoiceData).length;
      console.log('字段映射前，字段数量:', beforeMapping);
      console.log('字段映射前的数据:', JSON.stringify(invoiceData, null, 2));
      invoiceData = this.mapFieldNames(invoiceData);
      const afterMapping = Object.keys(invoiceData).length;
      console.log('字段映射后，字段数量:', afterMapping);
      console.log('字段映射后的数据:', JSON.stringify(invoiceData, null, 2));
      
      // 步骤4: 数据标准化（日期格式、金额类型、字符串清理等）
      console.log('开始数据标准化...');
      invoiceData = this.normalizeInvoiceData(invoiceData);
      console.log('数据标准化完成，最终字段数量:', Object.keys(invoiceData).length);
      console.log('数据标准化后的数据:', JSON.stringify(invoiceData, null, 2));
      
      // 验证销售方和购买方信息
      if (!invoiceData.vendorName && !invoiceData.vendorTaxId) {
      }
      
      if (!invoiceData.buyerName && !invoiceData.buyerTaxId) {
      }
      

      // OCR识别完成后，删除PDF转换的临时图片文件
      if (tempImagePath && fs.existsSync(tempImagePath)) {
        try {
          fs.unlinkSync(tempImagePath);
        } catch (cleanupError) {
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
      if (error.response) {
      }
      
      // OCR识别失败时，也删除PDF转换的临时图片文件
      if (tempImagePath && fs.existsSync(tempImagePath)) {
        try {
          fs.unlinkSync(tempImagePath);
        } catch (cleanupError) {
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

const ocrServiceInstance = new OCRService();
// 导出客户端以便外部检查
ocrServiceInstance.mistralClient = mistralClient;
ocrServiceInstance.dashscopeClient = dashscopeClient;
module.exports = ocrServiceInstance;

