const fs = require('fs');
const path = require('path');
// 确保在加载配置前加载环境变量
require('dotenv').config();
const config = require('../config');

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

// 导入pdfjs-dist（Node.js环境）
let pdfjsLib;
try {
  // 为Node.js环境提供DOMMatrix polyfill（pdfjs-dist 5.x需要）
  if (typeof global !== 'undefined' && !global.DOMMatrix) {
    // 提供完整的DOMMatrix polyfill
    global.DOMMatrix = class DOMMatrix {
      constructor(init) {
        this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
        if (init) {
          if (typeof init === 'string') {
            const m = init.match(/matrix\(([^)]+)\)/);
            if (m) {
              const values = m[1].split(',').map(v => parseFloat(v.trim()));
              if (values.length >= 6) {
                this.a = values[0]; this.b = values[1];
                this.c = values[2]; this.d = values[3];
                this.e = values[4]; this.f = values[5];
              }
            }
          } else if (Array.isArray(init) && init.length >= 6) {
            this.a = init[0]; this.b = init[1];
            this.c = init[2]; this.d = init[3];
            this.e = init[4]; this.f = init[5];
          }
        }
      }
      multiply(other) {
        return new DOMMatrix([
          this.a * other.a + this.c * other.b,
          this.b * other.a + this.d * other.b,
          this.a * other.c + this.c * other.d,
          this.b * other.c + this.d * other.d,
          this.a * other.e + this.c * other.f + this.e,
          this.b * other.e + this.d * other.f + this.f
        ]);
      }
      translate(x, y) {
        return this.multiply(new DOMMatrix([1, 0, 0, 1, x, y]));
      }
      scale(x, y) {
        return this.multiply(new DOMMatrix([x, 0, 0, y || x, 0, 0]));
      }
    };
    console.log('DOMMatrix polyfill已设置');
  }

  // 尝试导入pdfjs-dist
  // pdfjs-dist 5.x版本在Node.js中需要DOMMatrix polyfill
  try {
    // 直接导入（需要polyfill）
    pdfjsLib = require('pdfjs-dist');
    if (typeof pdfjsLib.getDocument === 'function') {
      console.log('pdfjs-dist导入成功，版本:', pdfjsLib.version || 'unknown');
    } else {
      throw new Error('getDocument method not found');
    }
  } catch (e1) {
    console.error('pdfjs-dist导入失败:', e1.message);
    pdfjsLib = null;
  }
} catch (e) {
  console.error('pdfjs-dist初始化失败:', e.message);
  pdfjsLib = null;
}

class OCRService {
  /**
   * 识别发票图片（仅使用 Mistral AI OCR）
   * @param {string} imagePath - 图片路径
   * @returns {Promise<Object>} 识别结果
   */
  async recognizeInvoice(imagePath) {
    console.log('========================================');
    console.log('recognizeInvoice 被调用');
    console.log('图片路径:', imagePath);
    console.log('mistralClient 状态:', mistralClient ? '已初始化' : '未初始化');
    console.log('config.MISTRAL_API_KEY 状态:', config.MISTRAL_API_KEY ? `已配置 (${config.MISTRAL_API_KEY.substring(0, 10)}...)` : '未配置');
    
    // 检查是否配置了 Mistral AI
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
    
    console.log('使用 Mistral AI 识别发票图片');
    console.log('========================================');
    return await this.recognizeInvoiceWithMistral(imagePath, 'image');
  }


  /**
   * [已删除] 正则表达式解析方法
   * 此方法已被移除，现在仅使用AI解析方案
   * 如需解析发票数据，请使用 parseInvoiceDataWithAI() 方法
   */

  /**
   * 清理OCR返回的markdown数据，移除无用的表格和重复内容
   * 优化：减少过度清理，保留重要信息（如税号、地址、电话等）
   * @param {string} textContent - OCR识别的markdown文本
   * @returns {string} 清理后的文本
   */
  cleanOCRMarkdown(textContent) {
    if (!textContent) return '';
    
    let cleaned = textContent;
    
    // 移除图片引用
    cleaned = cleaned.replace(/!\[.*?\]\(.*?\)/g, '');
    
    // 移除空表格行（只包含空单元格的行）
    const lines = cleaned.split('\n');
    const filteredLines = [];
    let inTable = false;
    let emptyTableRowCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 检测表格开始
      if (line.startsWith('|') && line.includes('---')) {
        inTable = true;
        emptyTableRowCount = 0;
        // 跳过表格分隔符
        continue;
      }
      
      // 检测表格行
      if (inTable && line.startsWith('|')) {
        // 检查是否是空行（只包含空单元格的行）
        const cells = line.split('|').map(c => c.trim()).filter(c => c);
        // 优化：只过滤完全空的行，保留包含任何内容的行（即使是单个字符）
        // 这样可以保留短税号、编号等重要信息
        const isEmptyRow = cells.length === 0 || cells.every(c => c.length === 0);
        
        if (isEmptyRow) {
          emptyTableRowCount++;
          // 如果连续空行超过5行（放宽限制），跳过后续空行
          if (emptyTableRowCount > 5) {
            continue;
          }
        } else {
          emptyTableRowCount = 0;
        }
        
        // 优化：不再跳过包含"电话"、"机器编号"等的行，因为这些信息可能包含重要数据
        // 只跳过完全无意义的纯标签行（没有任何值的行）
        // 例如："| 电话 | 电话号 |" 这样的行会被保留，因为可能包含实际电话号码
        // 但如果整行只有标签没有值，则跳过
        if (cells.length > 0) {
          const hasValue = cells.some(cell => {
            // 检查单元格是否包含实际数据（数字、字母、中文等）
            const hasContent = /[\d\w\u4e00-\u9fa5]/.test(cell);
            // 检查是否只是纯标签（如"电话"、"机器编号"等）
            const isLabelOnly = /^(电话|电话号|机器编号|备案号|电话编号|地址|名称|税号|纳税人识别号|统一社会信用代码)$/i.test(cell);
            return hasContent && !isLabelOnly;
          });
          
          // 如果行中有实际数据，保留；如果只是标签行，也保留（可能下一行有数据）
          // 完全跳过的情况：整行都是空单元格或只有无意义的标签
        }
      } else {
        inTable = false;
        emptyTableRowCount = 0;
      }
      
      // 保留非空行
      if (line.length > 0) {
        filteredLines.push(lines[i]);
      }
    }
    
    cleaned = filteredLines.join('\n');
    
    // 移除重复的空行（保留最多2个连续空行）
    cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n');
    
    // 不限制文本长度，提取全部文本用于解析
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
      // 构建提示词（包含所有字段，特别是购买方税号）
      // 重要：要求只返回纯JSON格式，不要markdown格式，不要代码块标记
      const systemPrompt = `你是一个专业的发票识别助手。请从提供的发票文本中提取以下信息，并以纯JSON格式返回（不要使用markdown代码块，直接返回JSON对象）：

{
  "invoiceNumber": "发票号码（发票号码字段的值，如：19599492）",
  "invoiceCode": "发票代码（发票代码字段的值，如：035022100211）",
  "invoiceDate": "发票日期/开票日期（格式：YYYY-MM-DD，如：2022-07-12）",
  "invoiceType": "发票类型（如：增值税普通发票、电子发票(普通发票)等）",
  "amount": 合计金额/金额合计（数字，不含货币符号，不含税金额）,
  "taxAmount": 税额合计/税额（数字，不含货币符号，如果免税则为0）,
  "totalAmount": 价税合计/总计（数字，不含货币符号，含税总金额）,
  "currency": "货币类型（如：CNY, USD等，默认CNY）",
  "vendorName": "销售方名称（销售方/开票方名称，如：厦门滴滴出行科技有限公司）",
  "vendorTaxId": "销售方税号（销售方纳税人识别号/统一社会信用代码，如：91350203MA32T53J0X）",
  "vendorAddress": "销售方地址（销售方地址、电话信息）",
  "buyerName": "购买方名称（购买方/买方名称，如：北京星网锐捷网络技术有限公司）",
  "buyerTaxId": "购买方税号（购买方纳税人识别号/统一社会信用代码，如：91110108668444162H）",
  "issuer": "开票人（开票人字段的值）",
  "totalAmountInWords": "价税合计大写（如：叁拾捌圆捌角肆分）",
  "items": [
    {
      "name": "项目名称（货物或应税劳务、服务名称）",
      "unitPrice": 单价（数字）,
      "quantity": 数量（数字）,
      "amount": 金额（数字，该项的金额）,
      "taxRate": "税率（如：3%、免税等）",
      "taxAmount": 税额（数字，如果免税则为0）
    }
  ]
}

字段识别说明（支持中文和英文发票）：

**通用字段：**
- 发票号码/invoiceNumber：查找"发票号码"、"发票号"、"Invoice Number"、"Invoice No."后的数字
- 发票代码/invoiceCode：查找"发票代码"、"Invoice Code"后的数字
- 开票日期/invoiceDate：查找"开票日期"、"发票日期"、"Issue Date"、"Date"后的日期，转换为YYYY-MM-DD格式
- 发票类型/invoiceType：查找"发票类型"、"Invoice Type"、"Type"等

**销售方/卖方信息（Seller/Vendor/Merchant）：**
- 销售方名称/vendorName：**必须仔细查找**以下关键词后的公司名称：
  - "销售方"、"开票方"、"销货方"、"开票单位"、"销售单位"
  - "Seller"、"Vendor"、"Merchant"、"From"、"Issuer"
  - 如果看到"名称:"、"Name:"等标签，查找其后的公司名称
  - 注意：销售方信息可能在发票的顶部、底部或右侧，请仔细查找整个文本
- 销售方税号/vendorTaxId：查找销售方信息区域中的：
  - "纳税人识别号"、"统一社会信用代码"、"税号"、"Tax ID"、"Tax Number"、"EIN"、"VAT Number"
  - 通常是一个18位或15位的字母数字组合
- 销售方地址/vendorAddress：查找销售方信息区域中的"地址"、"Address"、"Location"等

**购买方/买方信息（Buyer/Purchaser/Customer）：**
- 购买方名称/buyerName：**必须仔细查找**以下关键词后的公司名称：
  - "购买方"、"买方"、"购货方"、"购买单位"、"付款单位"
  - "Buyer"、"Purchaser"、"Customer"、"To"、"Bill To"
  - 如果看到"名称:"、"Name:"等标签，查找其后的公司名称
  - 注意：购买方信息可能在发票的顶部、底部或左侧，请仔细查找整个文本
- 购买方税号/buyerTaxId：查找购买方信息区域中的：
  - "纳税人识别号"、"统一社会信用代码"、"税号"、"Tax ID"、"Tax Number"、"EIN"、"VAT Number"
  - 通常是一个18位或15位的字母数字组合

**金额信息：**
- 金额/amount：查找"合计金额"、"金额合计"、"Subtotal"、"Amount"、"Net Amount"（不含税）
- 税额/taxAmount：查找"税额合计"、"税额"、"Tax Amount"、"VAT"、"Tax"（如果显示"免税"、"Tax Exempt"、"***"则为0）
- 价税合计/totalAmount：查找"价税合计"、"总计"、"Total Amount"、"Total"、"Grand Total"（含税总金额）
- 货币/currency：查找货币类型，如"CNY"、"USD"、"EUR"、"JPY"等，默认为"CNY"

**其他字段：**
- 开票人/issuer：查找"开票人"、"Issuer"、"Issued By"等
- 价税合计大写/totalAmountInWords：查找"价税合计大写"、"Amount in Words"等
- 项目明细/items：从表格中提取所有项目行，包括名称、单价、数量、金额、税率、税额

**重要要求：**
1. 只返回纯JSON对象，不要使用markdown代码块（不要用\`\`\`json包裹）
2. 不要添加任何解释文字或说明
3. 如果某个字段无法识别，请返回 null 或空字符串
4. **无论发票是中文还是英文，都必须使用上述JSON字段名返回（vendorName, buyerName等），不要使用Seller, Buyer等英文字段名**
5. **特别注意：销售方和购买方信息是发票的核心信息，必须仔细查找整个文本，不要遗漏**
6. 仔细区分"销售方/Seller"和"购买方/Buyer"，不要混淆
7. 如果文本中有"购买方信息"或"销售方信息"这样的标题，其下的内容就是对应的信息
8. 日期格式必须转换为YYYY-MM-DD格式
9. 金额字段必须是数字类型，不要包含货币符号
10. 忽略markdown表格中的无用数据，只提取真实的发票信息
11. 对于国外发票，确保字段映射正确：Seller → vendorName, Buyer → buyerName`;

      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `请从以下发票文本中提取信息（已清理无用表格数据，请仔细识别真实发票信息）：

**特别注意：**
1. 必须仔细查找销售方（开票方）和购买方（买方）的完整信息，包括名称和税号
2. 销售方和购买方信息可能在文本的不同位置，请完整扫描整个文本
3. 如果看到"购买方信息"、"销售方信息"等标题，其下的内容就是对应的信息
4. 查找"名称:"、"统一社会信用代码"、"纳税人识别号"等标签后的值

发票文本：
${cleanedText || '这是一张发票，请尝试识别其中的信息。'}`
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
        // 清理null值，转换为空字符串
        Object.keys(invoiceData).forEach(key => {
          if (invoiceData[key] === null) {
            invoiceData[key] = '';
          }
        });
      } catch (parseError) {
        console.error('解析 AI 响应失败:', parseError);
        console.error('AI响应内容:', aiResponse.substring(0, 500));
        // AI解析失败，返回空数据
        console.error('AI解析失败，无法提取发票数据');
        return {};
      }

      // 清理和验证数据
      console.log('AI解析的原始数据:', JSON.stringify(invoiceData, null, 2));
      
      // 字段映射：确保英文字段名正确映射到标准字段名（兼容国外发票）
      // 如果AI返回了Seller/Buyer等字段，映射到vendorName/buyerName
      if (invoiceData.Seller && !invoiceData.vendorName) {
        invoiceData.vendorName = invoiceData.Seller;
        delete invoiceData.Seller;
      }
      if (invoiceData.Vendor && !invoiceData.vendorName) {
        invoiceData.vendorName = invoiceData.Vendor;
        delete invoiceData.Vendor;
      }
      if (invoiceData.Merchant && !invoiceData.vendorName) {
        invoiceData.vendorName = invoiceData.Merchant;
        delete invoiceData.Merchant;
      }
      if (invoiceData['Seller Name'] && !invoiceData.vendorName) {
        invoiceData.vendorName = invoiceData['Seller Name'];
        delete invoiceData['Seller Name'];
      }
      
      if (invoiceData.Buyer && !invoiceData.buyerName) {
        invoiceData.buyerName = invoiceData.Buyer;
        delete invoiceData.Buyer;
      }
      if (invoiceData.Purchaser && !invoiceData.buyerName) {
        invoiceData.buyerName = invoiceData.Purchaser;
        delete invoiceData.Purchaser;
      }
      if (invoiceData.Customer && !invoiceData.buyerName) {
        invoiceData.buyerName = invoiceData.Customer;
        delete invoiceData.Customer;
      }
      if (invoiceData['Buyer Name'] && !invoiceData.buyerName) {
        invoiceData.buyerName = invoiceData['Buyer Name'];
        delete invoiceData['Buyer Name'];
      }
      
      // 税号字段映射
      if (invoiceData['Seller Tax ID'] && !invoiceData.vendorTaxId) {
        invoiceData.vendorTaxId = invoiceData['Seller Tax ID'];
        delete invoiceData['Seller Tax ID'];
      }
      if (invoiceData['Vendor Tax ID'] && !invoiceData.vendorTaxId) {
        invoiceData.vendorTaxId = invoiceData['Vendor Tax ID'];
        delete invoiceData['Vendor Tax ID'];
      }
      if (invoiceData['Buyer Tax ID'] && !invoiceData.buyerTaxId) {
        invoiceData.buyerTaxId = invoiceData['Buyer Tax ID'];
        delete invoiceData['Buyer Tax ID'];
      }
      
      // 地址字段映射
      if (invoiceData['Seller Address'] && !invoiceData.vendorAddress) {
        invoiceData.vendorAddress = invoiceData['Seller Address'];
        delete invoiceData['Seller Address'];
      }
      if (invoiceData['Vendor Address'] && !invoiceData.vendorAddress) {
        invoiceData.vendorAddress = invoiceData['Vendor Address'];
        delete invoiceData['Vendor Address'];
      }
      
      console.log('字段映射后的数据:', JSON.stringify(invoiceData, null, 2));
      
      // 日期解析：支持多种格式
      if (invoiceData.invoiceDate && typeof invoiceData.invoiceDate === 'string') {
        // 支持格式：YYYY-MM-DD, YYYY/MM/DD, YYYY年MM月DD日, YYYY.MM.DD
        let dateStr = invoiceData.invoiceDate.trim();
        const datePatterns = [
          /(\d{4})[年\/\-\.](\d{1,2})[月\/\-\.](\d{1,2})[日]?/,  // 2022年07月12日 或 2022/07/12
          /(\d{4})(\d{2})(\d{2})/,  // 20220712
        ];
        
        for (const pattern of datePatterns) {
          const match = dateStr.match(pattern);
          if (match) {
            const year = match[1];
            const month = match[2].padStart(2, '0');
            const day = match[3].padStart(2, '0');
            invoiceData.invoiceDate = `${year}-${month}-${day}`;
            console.log('日期解析成功:', invoiceData.invoiceDate);
            break;
          }
        }
      }

      // 金额解析
      if (invoiceData.amount !== undefined && invoiceData.amount !== null) {
        if (typeof invoiceData.amount === 'string') {
          invoiceData.amount = parseFloat(invoiceData.amount.replace(/[^\d.]/g, '')) || 0;
        }
        console.log('金额解析:', invoiceData.amount);
      }

      if (invoiceData.taxAmount !== undefined && invoiceData.taxAmount !== null) {
        if (typeof invoiceData.taxAmount === 'string') {
          // 如果显示"免税"或"***"，则设为0
          if (invoiceData.taxAmount.includes('免税') || invoiceData.taxAmount.includes('***')) {
            invoiceData.taxAmount = 0;
          } else {
            invoiceData.taxAmount = parseFloat(invoiceData.taxAmount.replace(/[^\d.]/g, '')) || 0;
          }
        }
        console.log('税额解析:', invoiceData.taxAmount);
      }

      if (invoiceData.totalAmount !== undefined && invoiceData.totalAmount !== null) {
        if (typeof invoiceData.totalAmount === 'string') {
          invoiceData.totalAmount = parseFloat(invoiceData.totalAmount.replace(/[^\d.]/g, '')) || 0;
        }
        console.log('价税合计解析:', invoiceData.totalAmount);
      }

      // 验证销售方和购买方信息
      console.log('========================================');
      console.log('销售方信息识别结果:');
      console.log(`- 名称: ${invoiceData.vendorName || '(未识别)'}`);
      console.log(`- 税号: ${invoiceData.vendorTaxId || '(未识别)'}`);
      console.log(`- 地址: ${invoiceData.vendorAddress || '(未识别)'}`);
      if (!invoiceData.vendorName && !invoiceData.vendorTaxId) {
        console.warn('⚠ 警告：未识别到销售方信息，请检查OCR文本是否包含销售方信息');
      }
      
      console.log('购买方信息识别结果:');
      console.log(`- 名称: ${invoiceData.buyerName || '(未识别)'}`);
      console.log(`- 税号: ${invoiceData.buyerTaxId || '(未识别)'}`);
      if (!invoiceData.buyerName && !invoiceData.buyerTaxId) {
        console.warn('⚠ 警告：未识别到购买方信息，请检查OCR文本是否包含购买方信息');
      }
      
      console.log('项目明细数量:', invoiceData.items ? invoiceData.items.length : 0);
      console.log('========================================');

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
   * 将PDF转换为图片（使用pdfjs-dist和sharp）
   * @param {string} pdfPath - PDF文件路径
   * @param {number} pageNumber - 页码（从1开始，默认第1页）
   * @returns {Promise<string>} 转换后的图片路径
   */
  async convertPDFToImage(pdfPath, pageNumber = 1) {
    try {
      console.log('开始转换PDF为图片:', pdfPath, '页码:', pageNumber);
      
      // 读取PDF文件
      const pdfData = fs.readFileSync(pdfPath);
      
      // 加载PDF文档
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdfDocument = await loadingTask.promise;
      
      // 获取指定页面
      const page = await pdfDocument.getPage(pageNumber - 1);
      
      // 设置渲染参数（提高分辨率以获得更好的OCR效果）
      const viewport = page.getViewport({ scale: 2.0 });
      const width = Math.floor(viewport.width);
      const height = Math.floor(viewport.height);
      
      // 使用pdfjs-dist的render方法获取图像数据
      const renderContext = {
        viewport: viewport,
        intent: 'display'
      };
      
      // 渲染页面为图像数据
      const renderTask = page.render(renderContext);
      await renderTask.promise;
      
      // 获取页面操作符列表（用于提取文本和图像）
      // 由于pdfjs-dist在Node.js环境中渲染比较复杂，我们使用另一种方法
      // 直接使用pdf-poppler（如果可用）或提示用户
      
      // 临时方案：使用pdf-poppler（需要系统安装poppler）
      // 如果pdf-poppler不可用，返回错误提示
      try {
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
        
        await pdfPoppler.convert(pdfPath, options);
        
        // pdf-poppler会生成带页码的文件名
        const generatedPath = path.join(outputDir, `${options.out_prefix}-${pageNumber}.png`);
        if (fs.existsSync(generatedPath)) {
          console.log('PDF转换成功（使用pdf-poppler），输出路径:', generatedPath);
          return generatedPath;
        }
      } catch (popplerError) {
        console.log('pdf-poppler不可用，尝试使用pdfjs-dist的文本提取方法');
        // 如果pdf-poppler不可用，尝试提取PDF中的文本内容
        const textContent = await page.getTextContent();
        const text = textContent.items.map(item => item.str).join(' ');
        
        // 如果PDF包含文本层，直接返回文本
        if (text.trim().length > 0) {
          console.log('PDF包含文本层，直接提取文本');
          // 将文本保存到临时文件
          const tempTextPath = pdfPath.replace('.pdf', '_temp.txt');
          fs.writeFileSync(tempTextPath, text);
          
          // 注意：此方法仅用于PDF转图片，不进行数据解析
          // 数据解析应由调用方使用 parseInvoiceDataWithAI 方法
          console.warn('PDF文本层提取完成，但未进行数据解析（已移除正则表达式解析降级方案）');
          
          return {
            success: true,
            text: text,
            confidence: 100, // PDF文本层提取的置信度是100%
            invoiceData: {}, // 返回空数据，需要调用方使用AI解析
            rawData: {
              text: text,
              words: [],
              lines: text.split('\n')
            }
          };
        }
      }
      
      throw new Error('PDF转换失败，请确保已安装poppler工具或PDF包含文本层');
    } catch (error) {
      console.error('PDF转换错误:', error);
      throw error;
    }
  }

  /**
   * 识别PDF发票（仅使用 Mistral AI OCR）
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
    console.log('config.MISTRAL_API_KEY 状态:', config.MISTRAL_API_KEY ? `已配置 (${config.MISTRAL_API_KEY.substring(0, 10)}...)` : '未配置');
    
    // 检查是否配置了 Mistral AI
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
    
    console.log('使用 Mistral AI 识别 PDF 发票');
    console.log('========================================');
    return await this.recognizeInvoiceWithMistral(pdfPath, 'pdf');
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
      console.log('正在使用 Mistral OCR API 识别发票...');
      console.log('请求参数:', {
        model: 'mistral-ocr-2505',
        documentType: documentParam.type,
        hasDocumentUrl: !!documentParam.documentUrl,
        hasImageUrl: !!documentParam.imageUrl
      });
      
      const ocrStartTime = Date.now();
      const result = await mistralClient.ocr.process({
        model: 'mistral-ocr-2505', // OCR 专用模型
        document: documentParam,
      });
      const ocrDuration = Date.now() - ocrStartTime;
      console.log(`Mistral OCR API 调用耗时: ${ocrDuration}ms`);
      console.log('Mistral OCR API 响应类型:', typeof result);
      console.log('Mistral OCR API 响应键:', Object.keys(result || {}));
      console.log('Mistral OCR API 响应摘要:', {
        hasPages: !!(result?.pages),
        pagesCount: result?.pages?.length || 0,
        model: result?.model,
        hasUsageInfo: !!result?.usage_info
      });

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
          console.log('OCR识别的原始文本统计:');
          console.log(`- 总字符数: ${textContent.length}`);
          console.log(`- 总行数: ${textContent.split('\n').length}`);
          console.log(`- 前500字符预览:`);
          console.log(textContent.substring(0, 500));
          console.log(`- 后500字符预览:`);
          console.log(textContent.substring(Math.max(0, textContent.length - 500)));
          console.log('========================================');
          console.log('✓ OCR已提取全部文本，将完整发送给AI解析');
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

      // 使用Chat API将OCR文本解析为结构化JSON数据
      if (textContent && textContent.trim().length > 0) {
        try {
          invoiceData = await this.parseInvoiceDataWithAI(textContent);
          console.log('AI解析的结构化数据:', JSON.stringify(invoiceData, null, 2));
        } catch (aiError) {
          console.error('AI解析失败:', aiError.message);
          // AI解析失败，使用空数据
          invoiceData = {};
        }
      } else {
        // 如果没有文本内容，使用空数据
        invoiceData = {};
      }

      // 清理和验证数据
      if (invoiceData.invoiceDate && typeof invoiceData.invoiceDate === 'string') {
        const dateMatch = invoiceData.invoiceDate.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
        if (dateMatch) {
          invoiceData.invoiceDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
        }
      }

      if (invoiceData.amount && typeof invoiceData.amount === 'string') {
        invoiceData.amount = parseFloat(invoiceData.amount.replace(/[^\d.]/g, ''));
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
      console.log('调用 Mistral OCR API 提取文本...');
      const ocrResult = await mistralClient.ocr.process({
        model: 'mistral-ocr-2505',
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

      // 构建提示词（包含所有字段，特别是购买方税号）
      // 重要：要求只返回纯JSON格式，不要markdown格式
      const systemPrompt = `你是一个专业的发票识别助手。请从提供的发票文本中提取以下信息，并以纯JSON格式返回（不要使用markdown代码块，直接返回JSON对象）：

{
  "invoiceNumber": "发票号码（发票号码字段的值，如：19599492）",
  "invoiceCode": "发票代码（发票代码字段的值，如：035022100211）",
  "invoiceDate": "发票日期/开票日期（格式：YYYY-MM-DD，如：2022-07-12）",
  "invoiceType": "发票类型（如：增值税普通发票、电子发票(普通发票)等）",
  "amount": 合计金额/金额合计（数字，不含货币符号，不含税金额）,
  "taxAmount": 税额合计/税额（数字，不含货币符号，如果免税则为0）,
  "totalAmount": 价税合计/总计（数字，不含货币符号，含税总金额）,
  "currency": "货币类型（如：CNY, USD等，默认CNY）",
  "vendorName": "销售方名称（销售方/开票方名称，如：厦门滴滴出行科技有限公司）",
  "vendorTaxId": "销售方税号（销售方纳税人识别号/统一社会信用代码，如：91350203MA32T53J0X）",
  "vendorAddress": "销售方地址（销售方地址、电话信息）",
  "buyerName": "购买方名称（购买方/买方名称，如：北京星网锐捷网络技术有限公司）",
  "buyerTaxId": "购买方税号（购买方纳税人识别号/统一社会信用代码，如：91110108668444162H）",
  "issuer": "开票人（开票人字段的值）",
  "totalAmountInWords": "价税合计大写（如：叁拾捌圆捌角肆分）",
  "items": [
    {
      "name": "项目名称（货物或应税劳务、服务名称）",
      "unitPrice": 单价（数字）,
      "quantity": 数量（数字）,
      "amount": 金额（数字，该项的金额）,
      "taxRate": "税率（如：3%、免税等）",
      "taxAmount": 税额（数字，如果免税则为0）
    }
  ]
}

字段识别说明（支持中文和英文发票）：

**通用字段：**
- 发票号码/invoiceNumber：查找"发票号码"、"发票号"、"Invoice Number"、"Invoice No."后的数字
- 发票代码/invoiceCode：查找"发票代码"、"Invoice Code"后的数字
- 开票日期/invoiceDate：查找"开票日期"、"发票日期"、"Issue Date"、"Date"后的日期，转换为YYYY-MM-DD格式
- 发票类型/invoiceType：查找"发票类型"、"Invoice Type"、"Type"等

**销售方/卖方信息（Seller/Vendor/Merchant）：**
- 销售方名称/vendorName：**必须仔细查找**以下关键词后的公司名称：
  - "销售方"、"开票方"、"销货方"、"开票单位"、"销售单位"
  - "Seller"、"Vendor"、"Merchant"、"From"、"Issuer"
  - 如果看到"名称:"、"Name:"等标签，查找其后的公司名称
  - 注意：销售方信息可能在发票的顶部、底部或右侧，请仔细查找整个文本
- 销售方税号/vendorTaxId：查找销售方信息区域中的：
  - "纳税人识别号"、"统一社会信用代码"、"税号"、"Tax ID"、"Tax Number"、"EIN"、"VAT Number"
  - 通常是一个18位或15位的字母数字组合
- 销售方地址/vendorAddress：查找销售方信息区域中的"地址"、"Address"、"Location"等

**购买方/买方信息（Buyer/Purchaser/Customer）：**
- 购买方名称/buyerName：**必须仔细查找**以下关键词后的公司名称：
  - "购买方"、"买方"、"购货方"、"购买单位"、"付款单位"
  - "Buyer"、"Purchaser"、"Customer"、"To"、"Bill To"
  - 如果看到"名称:"、"Name:"等标签，查找其后的公司名称
  - 注意：购买方信息可能在发票的顶部、底部或左侧，请仔细查找整个文本
- 购买方税号/buyerTaxId：查找购买方信息区域中的：
  - "纳税人识别号"、"统一社会信用代码"、"税号"、"Tax ID"、"Tax Number"、"EIN"、"VAT Number"
  - 通常是一个18位或15位的字母数字组合

**金额信息：**
- 金额/amount：查找"合计金额"、"金额合计"、"Subtotal"、"Amount"、"Net Amount"（不含税）
- 税额/taxAmount：查找"税额合计"、"税额"、"Tax Amount"、"VAT"、"Tax"（如果显示"免税"、"Tax Exempt"、"***"则为0）
- 价税合计/totalAmount：查找"价税合计"、"总计"、"Total Amount"、"Total"、"Grand Total"（含税总金额）
- 货币/currency：查找货币类型，如"CNY"、"USD"、"EUR"、"JPY"等，默认为"CNY"

**其他字段：**
- 开票人/issuer：查找"开票人"、"Issuer"、"Issued By"等
- 价税合计大写/totalAmountInWords：查找"价税合计大写"、"Amount in Words"等
- 项目明细/items：从表格中提取所有项目行，包括名称、单价、数量、金额、税率、税额

**重要要求：**
1. 只返回纯JSON对象，不要使用markdown代码块（不要用\`\`\`json包裹）
2. 不要添加任何解释文字或说明
3. 如果某个字段无法识别，请返回 null 或空字符串
4. **无论发票是中文还是英文，都必须使用上述JSON字段名返回（vendorName, buyerName等），不要使用Seller, Buyer等英文字段名**
5. **特别注意：销售方和购买方信息是发票的核心信息，必须仔细查找整个文本，不要遗漏**
6. 仔细区分"销售方/Seller"和"购买方/Buyer"，不要混淆
7. 如果文本中有"购买方信息"或"销售方信息"这样的标题，其下的内容就是对应的信息
8. 日期格式必须转换为YYYY-MM-DD格式
9. 金额字段必须是数字类型，不要包含货币符号`;

      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `请从以下发票文本中提取信息：

**特别注意：**
1. 必须仔细查找销售方（开票方）和购买方（买方）的完整信息，包括名称和税号
2. 销售方和购买方信息可能在文本的不同位置，请完整扫描整个文本
3. 如果看到"购买方信息"、"销售方信息"等标题，其下的内容就是对应的信息
4. 查找"名称:"、"统一社会信用代码"、"纳税人识别号"等标签后的值

发票文本：
${textContent || '这是一张发票，请尝试识别其中的信息。'}`
        }
      ];

      // 调用 Mistral Chat API
      // 使用 response_format 强制返回 JSON 格式
      console.log('正在使用 Mistral Chat API 识别发票...');
      console.log(`- 文本长度: ${textContent.length} 字符`);
      console.log(`- Temperature: 0.2 (提高识别能力)`);
      console.log(`- Max Tokens: 6000 (确保完整响应)`);
      
      // 估算 token 数量（粗略估算：1 token ≈ 4 字符）
      const estimatedTokens = Math.ceil(textContent.length / 4);
      const maxTokens = Math.min(6000, Math.max(2000, estimatedTokens + 2000)); // 确保有足够空间返回完整 JSON
      
      const result = await mistralClient.chat.complete({
        model: 'mistral-small-latest',
        messages: messages,
        temperature: 0.2, // 提高 temperature 以增强识别复杂格式的能力
        topP: 0.9, // 添加 top_p 参数控制多样性
        maxTokens: maxTokens, // 设置足够的 max_tokens 确保完整响应
        responseFormat: { type: 'json_object' }, // 强制返回JSON格式
      });

      const aiResponse = result.choices[0]?.message?.content || '';
      console.log('Mistral Chat API 响应:', aiResponse);

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
        console.error('解析 AI 响应失败:', parseError);
        // AI解析失败，返回空数据
        console.error('无法解析AI响应为JSON格式');
        invoiceData = {};
      }

      // 清理和验证数据
      console.log('Chat API解析的原始数据:', JSON.stringify(invoiceData, null, 2));
      
      // 字段映射：确保英文字段名正确映射到标准字段名（兼容国外发票）
      // 如果AI返回了Seller/Buyer等字段，映射到vendorName/buyerName
      if (invoiceData.Seller && !invoiceData.vendorName) {
        invoiceData.vendorName = invoiceData.Seller;
        delete invoiceData.Seller;
      }
      if (invoiceData.Vendor && !invoiceData.vendorName) {
        invoiceData.vendorName = invoiceData.Vendor;
        delete invoiceData.Vendor;
      }
      if (invoiceData.Merchant && !invoiceData.vendorName) {
        invoiceData.vendorName = invoiceData.Merchant;
        delete invoiceData.Merchant;
      }
      if (invoiceData['Seller Name'] && !invoiceData.vendorName) {
        invoiceData.vendorName = invoiceData['Seller Name'];
        delete invoiceData['Seller Name'];
      }
      
      if (invoiceData.Buyer && !invoiceData.buyerName) {
        invoiceData.buyerName = invoiceData.Buyer;
        delete invoiceData.Buyer;
      }
      if (invoiceData.Purchaser && !invoiceData.buyerName) {
        invoiceData.buyerName = invoiceData.Purchaser;
        delete invoiceData.Purchaser;
      }
      if (invoiceData.Customer && !invoiceData.buyerName) {
        invoiceData.buyerName = invoiceData.Customer;
        delete invoiceData.Customer;
      }
      if (invoiceData['Buyer Name'] && !invoiceData.buyerName) {
        invoiceData.buyerName = invoiceData['Buyer Name'];
        delete invoiceData['Buyer Name'];
      }
      
      // 税号字段映射
      if (invoiceData['Seller Tax ID'] && !invoiceData.vendorTaxId) {
        invoiceData.vendorTaxId = invoiceData['Seller Tax ID'];
        delete invoiceData['Seller Tax ID'];
      }
      if (invoiceData['Vendor Tax ID'] && !invoiceData.vendorTaxId) {
        invoiceData.vendorTaxId = invoiceData['Vendor Tax ID'];
        delete invoiceData['Vendor Tax ID'];
      }
      if (invoiceData['Buyer Tax ID'] && !invoiceData.buyerTaxId) {
        invoiceData.buyerTaxId = invoiceData['Buyer Tax ID'];
        delete invoiceData['Buyer Tax ID'];
      }
      
      // 地址字段映射
      if (invoiceData['Seller Address'] && !invoiceData.vendorAddress) {
        invoiceData.vendorAddress = invoiceData['Seller Address'];
        delete invoiceData['Seller Address'];
      }
      if (invoiceData['Vendor Address'] && !invoiceData.vendorAddress) {
        invoiceData.vendorAddress = invoiceData['Vendor Address'];
        delete invoiceData['Vendor Address'];
      }
      
      console.log('字段映射后的数据:', JSON.stringify(invoiceData, null, 2));
      
      // 日期解析：支持多种格式
      if (invoiceData.invoiceDate && typeof invoiceData.invoiceDate === 'string') {
        let dateStr = invoiceData.invoiceDate.trim();
        const datePatterns = [
          /(\d{4})[年\/\-\.](\d{1,2})[月\/\-\.](\d{1,2})[日]?/,
          /(\d{4})(\d{2})(\d{2})/,
        ];
        
        for (const pattern of datePatterns) {
          const match = dateStr.match(pattern);
          if (match) {
            const year = match[1];
            const month = match[2].padStart(2, '0');
            const day = match[3].padStart(2, '0');
            invoiceData.invoiceDate = `${year}-${month}-${day}`;
            break;
          }
        }
      }

      // 金额解析
      if (invoiceData.amount !== undefined && invoiceData.amount !== null && typeof invoiceData.amount === 'string') {
        invoiceData.amount = parseFloat(invoiceData.amount.replace(/[^\d.]/g, '')) || 0;
      }

      if (invoiceData.taxAmount !== undefined && invoiceData.taxAmount !== null) {
        if (typeof invoiceData.taxAmount === 'string') {
          if (invoiceData.taxAmount.includes('免税') || invoiceData.taxAmount.includes('***')) {
            invoiceData.taxAmount = 0;
          } else {
            invoiceData.taxAmount = parseFloat(invoiceData.taxAmount.replace(/[^\d.]/g, '')) || 0;
          }
        }
      }

      if (invoiceData.totalAmount !== undefined && invoiceData.totalAmount !== null && typeof invoiceData.totalAmount === 'string') {
        invoiceData.totalAmount = parseFloat(invoiceData.totalAmount.replace(/[^\d.]/g, '')) || 0;
      }

      console.log('Chat API最终解析结果:', JSON.stringify(invoiceData, null, 2));

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
}

module.exports = new OCRService();

