const express = require('express');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const Travel = require('../models/Travel');
const ocrService = require('../services/ocrService');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const router = express.Router();

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const {
      status,
      category,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // 构建查询条件
    const query = { uploadedBy: req.user.id };

    if (status) {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) {
        query.invoiceDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.invoiceDate.$lte = new Date(endDate);
      }
    }

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'vendor.name': { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    // 排序
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // 分页
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // 列表页只需要展示字段，排除大字段以提升性能
    // 排除的字段：ocrData（OCR数据，rawData可能很大）、items（明细数组）、traveler（出行人信息）、buyer（购买方信息）
    // 列表页需要的字段：_id, invoiceNumber, invoiceDate, amount, currency, category, status, createdAt, file, vendor.name, relatedExpense, relatedTravel
    
    // 优化：按照 Mongoose Populate 的工作原理，先查询主数据，再批量查询关联数据
    // 这样可以更精确地控制查询，减少不必要的查询
    const invoices = await Invoice.find(query)
      .select('_id invoiceNumber invoiceDate amount currency category status createdAt file vendor.name relatedExpense relatedTravel')
      .lean() // 返回普通对象而非 Mongoose 文档，减少内存占用和序列化开销
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    // 按照 Mongoose Populate 的工作原理：收集所有需要 populate 的 ID，然后批量查询
    // 步骤 1：收集所有唯一的 relatedExpense 和 relatedTravel ID
    const expenseIds = [...new Set(
      invoices
        .map(i => i.relatedExpense)
        .filter(Boolean) // 过滤掉 null/undefined
        .map(id => id.toString ? id.toString() : id) // 确保是字符串格式
    )];
    
    const travelIds = [...new Set(
      invoices
        .map(i => i.relatedTravel)
        .filter(Boolean) // 过滤掉 null/undefined
        .map(id => id.toString ? id.toString() : id) // 确保是字符串格式
    )];

    // 步骤 2：批量查询关联数据（只在有 ID 时才查询）
    const [expenses, travels] = await Promise.all([
      // 只有当有 expenseIds 时才查询
      expenseIds.length > 0 
        ? Expense.find({ _id: { $in: expenseIds } })
            .select('_id title')
            .lean()
        : Promise.resolve([]),
      // 只有当有 travelIds 时才查询
      travelIds.length > 0
        ? Travel.find({ _id: { $in: travelIds } })
            .select('_id title')
            .lean()
        : Promise.resolve([])
    ]);

    // 步骤 3：创建 ID 到数据的映射表（提升查找性能）
    const expenseMap = new Map(expenses.map(e => [e._id.toString(), e]));
    const travelMap = new Map(travels.map(t => [t._id.toString(), t]));

    // 步骤 4：合并数据到原始文档中（模拟 Mongoose populate 的行为）
    invoices.forEach(invoice => {
      // Populate relatedExpense
      if (invoice.relatedExpense) {
        const expenseId = invoice.relatedExpense.toString ? invoice.relatedExpense.toString() : invoice.relatedExpense;
        invoice.relatedExpense = expenseMap.get(expenseId) || null;
      }
      
      // Populate relatedTravel
      if (invoice.relatedTravel) {
        const travelId = invoice.relatedTravel.toString ? invoice.relatedTravel.toString() : invoice.relatedTravel;
        invoice.relatedTravel = travelMap.get(travelId) || null;
      }
    });

    const total = await Invoice.countDocuments(query);

    res.json({
      success: true,
      count: invoices.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: invoices
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: '获取发票列表失败'
    });
  }
});

// @desc    Get invoice PDF preview (first page as image)
// @route   GET /api/invoices/:id/preview
// @access  Private
router.get('/:id/preview', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: '发票不存在'
      });
    }

    // 检查权限
    if (invoice.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权访问此文件'
      });
    }

    // 只处理PDF文件
    if (!invoice.file.mimeType.includes('pdf')) {
      return res.status(400).json({
        success: false,
        message: '只有PDF文件可以生成预览图'
      });
    }

    const filePath = path.resolve(__dirname, '..', invoice.file.path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    // 使用OCR服务将PDF第一页转换为图片
    const previewImagePath = await ocrService.convertPDFToImage(filePath, 1);

    if (!fs.existsSync(previewImagePath)) {
      return res.status(500).json({
        success: false,
        message: 'PDF预览图生成失败'
      });
    }

    // 返回图片文件
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="preview.png"`);
    res.sendFile(previewImagePath);
  } catch (error) {
    console.error('Get invoice preview error:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取预览图失败'
    });
  }
});

// @desc    Get invoice file
// @route   GET /api/invoices/:id/file
// @access  Private
router.get('/:id/file', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: '发票不存在'
      });
    }

    // 检查权限
    if (invoice.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权访问此文件'
      });
    }

    const filePath = path.resolve(__dirname, '..', invoice.file.path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    res.setHeader('Content-Type', invoice.file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(invoice.file.originalName)}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Get invoice file error:', error);
    res.status(500).json({
      success: false,
      message: '获取文件失败'
    });
  }
});

// @desc    Get single invoice
// @route   GET /api/invoices/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('uploadedBy', 'firstName lastName email')
      .populate('relatedExpense', 'title amount category')
      .populate('relatedTravel', 'title destination')
      .populate('verifiedBy', 'firstName lastName');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: '发票不存在'
      });
    }

    // 检查权限：只能查看自己的发票或管理员
    if (invoice.uploadedBy._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权访问此发票'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      message: '获取发票详情失败'
    });
  }
});

// @desc    Recognize invoice image with OCR (temporary, doesn't save invoice)
// @route   POST /api/invoices/recognize-image
// @access  Private
// NOTE: This route must be defined BEFORE /:id routes to avoid route conflicts
router.post('/recognize-image', protect, upload.single('file'), async (req, res) => {
  console.log('========================================');
  console.log('收到 OCR 识别请求');
  console.log('用户:', req.user ? req.user.email : '未登录');
  console.log('文件:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : '无文件');
  console.log('========================================');
  
  // 提前转换的图片路径（用于 PDF 文件）
  let convertedImagePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要识别的图片文件'
      });
    }

    // 检查文件类型（支持图片和PDF）
    if (!req.file.mimetype.startsWith('image/') && req.file.mimetype !== 'application/pdf') {
      // 删除文件
      if (req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error('Delete file error:', unlinkError);
        }
      }
      return res.status(400).json({
        success: false,
        message: '仅支持图片和PDF格式的OCR识别'
      });
    }

    const filePath = path.resolve(__dirname, '..', req.file.path);

    // 检查 OCR 服务是否可用
    if (!ocrService || typeof ocrService.recognizeInvoice !== 'function') {
      // 删除临时文件
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (unlinkError) {
        console.error('Delete temp file error:', unlinkError);
      }
      
      return res.status(503).json({
        success: false,
        message: 'OCR服务不可用，请检查后端配置'
      });
    }

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({
        success: false,
        message: `文件不存在: ${filePath}`
      });
    }

    // 优化：如果是 PDF，提前转换为图片（这样 fallback 到阿里云时就不需要再转换了）
    if (req.file.mimetype === 'application/pdf') {
      try {
        console.log('PDF 文件，提前转换为图片...');
        convertedImagePath = await ocrService.convertPDFToImage(filePath, 1);
        console.log('PDF 转换完成，图片路径:', convertedImagePath);
      } catch (convertError) {
        console.warn('PDF 提前转换失败，将在 fallback 时转换:', convertError.message);
        // 转换失败不影响主流程，fallback 时会再次尝试转换
        convertedImagePath = null;
      }
    }

    // 执行OCR识别（根据文件类型选择不同的识别方法）
    let ocrResult;
    try {
      console.log('开始OCR识别，文件类型:', req.file.mimetype);
      console.log('文件路径:', filePath);
      console.log('文件大小:', req.file.size, 'bytes');
      
      if (req.file.mimetype.startsWith('image/')) {
        console.log('调用 recognizeInvoice 方法...');
        ocrResult = await ocrService.recognizeInvoice(filePath);
      } else if (req.file.mimetype === 'application/pdf') {
        console.log('调用 recognizePDFInvoice 方法...');
        // 传入转换后的图片路径（如果已转换）
        ocrResult = await ocrService.recognizePDFInvoice(filePath, 1, convertedImagePath);
      } else {
        throw new Error('不支持的文件类型');
      }
      
      console.log('OCR识别完成，结果:', {
        success: ocrResult?.success,
        hasData: !!ocrResult?.invoiceData,
        error: ocrResult?.error,
        hasText: !!ocrResult?.text,
        textLength: ocrResult?.text ? ocrResult.text.length : 0
      });
      
      // 确保 ocrResult 存在
      if (!ocrResult) {
        throw new Error('OCR识别返回空结果');
      }
    } catch (ocrError) {
      console.error('========================================');
      console.error('OCR service error:', ocrError);
      console.error('Error message:', ocrError.message);
      console.error('Error stack:', ocrError.stack);
      console.error('========================================');
      
      // 删除临时文件（包括上传的文件和转换后的图片）
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        // 删除提前转换的图片文件（如果存在）
        if (convertedImagePath && fs.existsSync(convertedImagePath)) {
          fs.unlinkSync(convertedImagePath);
        }
      } catch (unlinkError) {
        console.error('Delete temp file error:', unlinkError);
      }
      
      return res.status(500).json({
        success: false,
        message: `OCR识别失败: ${ocrError.message || '未知错误'}`,
        error: ocrError.message || 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? ocrError.stack : undefined
      });
    }

    // OCR识别完成后，删除上传的文件和转换后的图片（如果存在）
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('OCR识别完成，已删除上传文件:', filePath);
      }
      // 删除提前转换的图片文件（如果存在）
      if (convertedImagePath && fs.existsSync(convertedImagePath)) {
        fs.unlinkSync(convertedImagePath);
        console.log('OCR识别完成，已删除转换后的图片:', convertedImagePath);
      }
    } catch (unlinkError) {
      console.error('删除文件失败:', unlinkError.message);
    }

    if (ocrResult && ocrResult.success) {
      try {
        const responseData = {
        success: true,
        message: 'OCR识别成功',
        data: {
          ocrData: {
            extracted: true,
            confidence: ocrResult.confidence || 0,
            rawData: ocrResult.rawData || {},
              extractedAt: new Date().toISOString()
          },
          recognizedData: ocrResult.invoiceData || {},
          text: ocrResult.text || ''
        }
        };
        
        console.log('准备返回成功响应，数据大小:', JSON.stringify(responseData).length, 'bytes');
        res.json(responseData);
      } catch (responseError) {
        console.error('响应序列化错误:', responseError);
        console.error('错误堆栈:', responseError.stack);
        res.status(500).json({
          success: false,
          message: '响应序列化失败: ' + responseError.message,
          error: responseError.message
      });
      }
    } else {
      const errorMessage = ocrResult?.error || 'OCR识别失败，请检查配置或重试';
      console.log('OCR识别失败，返回错误响应:', errorMessage);
      res.status(500).json({
        success: false,
        message: errorMessage,
        error: ocrResult?.error || 'Unknown error'
      });
    }
  } catch (error) {
    console.error('========================================');
    console.error('OCR recognize route error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request file:', req.file ? {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : 'No file');
    console.error('========================================');
    
    // 删除临时文件（包括上传的文件和转换后的图片）
    if (req.file && req.file.path) {
      try {
        const filePath = path.resolve(__dirname, '..', req.file.path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('已删除临时文件:', filePath);
        }
        // 删除提前转换的图片文件（如果存在）
        if (convertedImagePath && fs.existsSync(convertedImagePath)) {
          fs.unlinkSync(convertedImagePath);
          console.log('已删除转换后的图片:', convertedImagePath);
        }
      } catch (unlinkError) {
        console.error('Delete file error:', unlinkError);
      }
    }
    
    // 提供更详细的错误信息
    let errorMessage = 'OCR识别失败';
    if (error.message) {
      errorMessage += ': ' + error.message;
    }
    
    // 检查是否是配置问题
    if (error.message && error.message.includes('MISTRAL_API_KEY')) {
      errorMessage += '。请配置 MISTRAL_API_KEY 环境变量';
    }
    
    // 检查是否是文件问题
    if (error.code === 'ENOENT') {
      errorMessage = '文件不存在或无法访问';
    } else if (error.code === 'EACCES') {
      errorMessage = '文件访问权限不足';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message || 'Unknown error',
      errorCode: error.code,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @desc    Upload invoice
// @route   POST /api/invoices/upload
// @access  Private
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择要上传的文件'
      });
    }

    // 确保文件名正确编码（处理中文文件名）
    let originalName = req.file.originalname;
    try {
      // 如果文件名包含URL编码，先解码
      if (originalName.includes('%')) {
        try {
          originalName = decodeURIComponent(originalName);
        } catch (e) {
          // URL解码失败，继续其他方法
        }
      }
      
      // 检测是否是 UTF-8 被误解释为 Latin1 的情况
      const hasLatin1Pattern = /[à-ÿ]/g.test(originalName) || /[æ-ÿ]/g.test(originalName);
      
      if (hasLatin1Pattern) {
        try {
          // 尝试将 Latin1 字节重新解释为 UTF-8
          const fixed = Buffer.from(originalName, 'latin1').toString('utf-8');
          
          // 验证修复后的字符串是否包含有效的中文字符
          if (/[\u4e00-\u9fa5]/.test(fixed)) {
            console.log('文件名编码修复:', originalName, '->', fixed);
            originalName = fixed;
          }
        } catch (e) {
          // 修复失败，继续其他方法
        }
      }
      
      // 如果文件名已经包含中文字符，说明编码正确
      if (!/[\u4e00-\u9fa5]/.test(originalName)) {
        // 尝试从 latin1 转换到 utf-8
        try {
          const converted = Buffer.from(originalName, 'latin1').toString('utf-8');
          if (/[\u4e00-\u9fa5]/.test(converted)) {
            originalName = converted;
          }
        } catch (e) {
          // 转换失败，使用原文件名
        }
      }
    } catch (error) {
      console.error('文件名编码处理失败:', error);
      console.error('原始文件名:', originalName);
      // 如果处理失败，使用原文件名
    }

    const invoiceData = {
      uploadedBy: req.user.id,
      file: {
        filename: req.file.filename,
        originalName: originalName,
        path: req.file.path,
        size: req.file.size,
        mimeType: req.file.mimetype
      },
      status: 'pending'
    };

    // 如果提供了其他字段，也保存
    if (req.body.invoiceNumber) invoiceData.invoiceNumber = req.body.invoiceNumber;
    if (req.body.invoiceDate) invoiceData.invoiceDate = req.body.invoiceDate;
    if (req.body.invoiceType) invoiceData.invoiceType = req.body.invoiceType;
    if (req.body.amount) invoiceData.amount = parseFloat(req.body.amount);
    if (req.body.currency) invoiceData.currency = req.body.currency;
    if (req.body.taxAmount) invoiceData.taxAmount = parseFloat(req.body.taxAmount);
    if (req.body.totalAmount) invoiceData.totalAmount = parseFloat(req.body.totalAmount);
    if (req.body.category) invoiceData.category = req.body.category;
    
    // 销售方（商户）信息
    if (req.body.vendorName || req.body.vendorTaxId || req.body.vendorAddress) {
      invoiceData.vendor = {};
      if (req.body.vendorName) invoiceData.vendor.name = req.body.vendorName;
      if (req.body.vendorTaxId) invoiceData.vendor.taxId = req.body.vendorTaxId;
      if (req.body.vendorAddress) invoiceData.vendor.address = req.body.vendorAddress;
    }
    
    // 购买方信息
    if (req.body.buyerName || req.body.buyerTaxId || req.body.buyerAddress) {
      invoiceData.buyer = {};
      if (req.body.buyerName) invoiceData.buyer.name = req.body.buyerName;
      if (req.body.buyerTaxId) invoiceData.buyer.taxId = req.body.buyerTaxId;
      if (req.body.buyerAddress) invoiceData.buyer.address = req.body.buyerAddress;
    }
    
    // 发票项目明细
    if (req.body.items) {
      try {
        invoiceData.items = typeof req.body.items === 'string' 
          ? JSON.parse(req.body.items) 
          : req.body.items;
      } catch (e) {
        console.error('解析项目明细失败:', e);
      }
    }
    
    // 开票人
    if (req.body.issuer) invoiceData.issuer = req.body.issuer;
    
    // 价税合计（大写）
    if (req.body.totalAmountInWords) invoiceData.totalAmountInWords = req.body.totalAmountInWords;
    
    if (req.body.notes) invoiceData.notes = req.body.notes;
    if (req.body.tags) {
      try {
        invoiceData.tags = typeof req.body.tags === 'string'
          ? JSON.parse(req.body.tags)
          : Array.isArray(req.body.tags) 
            ? req.body.tags 
            : req.body.tags.split(',').map(t => t.trim());
      } catch (e) {
        invoiceData.tags = req.body.tags.split(',').map(t => t.trim());
      }
    }

    const invoice = await Invoice.create(invoiceData);

    // 检查前端是否已经进行过 OCR 识别
    const skipOcr = req.body.skipOcr === 'true' || req.body.skipOcr === true;
    
    // 如果前端已经进行过 OCR 识别，直接使用前端传递的 OCR 数据
    if (skipOcr && req.body.ocrData) {
      try {
        const ocrDataFromFrontend = typeof req.body.ocrData === 'string' 
          ? JSON.parse(req.body.ocrData) 
          : req.body.ocrData;
        
        invoice.ocrData = {
          extracted: ocrDataFromFrontend.extracted !== false,
          confidence: ocrDataFromFrontend.confidence || 0,
          rawData: ocrDataFromFrontend.rawData || {},
          extractedAt: ocrDataFromFrontend.extractedAt ? new Date(ocrDataFromFrontend.extractedAt) : new Date()
        };
        
        await invoice.save();
        console.log('✓ 使用前端传递的 OCR 数据，跳过后端 OCR 识别');
        
        // 重新加载发票以获取最新数据
        const updatedInvoice = await Invoice.findById(invoice._id).populate('uploadedBy', 'name email');
        
        return res.status(201).json({
          success: true,
          message: '发票上传成功',
          data: updatedInvoice
        });
      } catch (ocrDataError) {
        console.error('解析前端 OCR 数据失败:', ocrDataError);
        // 如果解析失败，继续执行后端 OCR 识别
      }
    }
    // 如果前端未进行 OCR 识别，且是图片或PDF文件，自动进行OCR识别
    else if (!skipOcr && (req.file.mimetype.startsWith('image/') || req.file.mimetype === 'application/pdf')) {
      console.log('========================================');
      console.log('开始OCR识别，文件类型:', req.file.mimetype);
      console.log('文件路径:', req.file.path);
      console.log('文件大小:', req.file.size, 'bytes');
      
      // 检查Mistral AI配置
      const config = require('../config');
      console.log('MISTRAL_API_KEY配置状态:', config.MISTRAL_API_KEY ? `已配置 (${config.MISTRAL_API_KEY.substring(0, 10)}...)` : '未配置');
      
      // 确保文件路径是绝对路径
      const filePath = path.isAbsolute(req.file.path) 
        ? req.file.path 
        : path.resolve(__dirname, '..', req.file.path);
      console.log('绝对路径:', filePath);
      console.log('文件是否存在:', fs.existsSync(filePath) ? '✓' : '✗');
      
      // 验证文件可读性
      try {
        fs.accessSync(filePath, fs.constants.R_OK);
        console.log('文件可读性: ✓');
      } catch (accessError) {
        console.error('文件不可读:', accessError.message);
      }
      console.log('========================================');
      
      try {
        let ocrResult;
        const startTime = Date.now();
        if (req.file.mimetype.startsWith('image/')) {
          console.log('调用 ocrService.recognizeInvoice()...');
          ocrResult = await ocrService.recognizeInvoice(filePath);
        } else if (req.file.mimetype === 'application/pdf') {
          console.log('调用 ocrService.recognizePDFInvoice()...');
          ocrResult = await ocrService.recognizePDFInvoice(filePath);
        }
        const duration = Date.now() - startTime;
        console.log(`OCR识别耗时: ${duration}ms`);
        console.log('OCR识别结果:', {
          success: ocrResult.success,
          confidence: ocrResult.confidence,
          hasData: !!ocrResult.invoiceData,
          error: ocrResult.error,
          fieldsCount: ocrResult.invoiceData ? Object.keys(ocrResult.invoiceData).length : 0,
          hasText: !!ocrResult.text,
          textLength: ocrResult.text ? ocrResult.text.length : 0
        });
        
        if (ocrResult.success) {
          // 更新OCR数据（即使没有识别到具体字段，也保存OCR结果）
          invoice.ocrData = {
            extracted: true,
            confidence: ocrResult.confidence || 0,
            rawData: ocrResult.rawData || { text: ocrResult.text || '' },
            extractedAt: new Date()
          };

          // 如果OCR识别到信息，自动填充（仅在用户未手动填写时）
          if (ocrResult.invoiceData) {
            console.log('开始赋值 OCR 识别数据，识别到的字段:', Object.keys(ocrResult.invoiceData));
            
            // 基本信息
            if (ocrResult.invoiceData.invoiceNumber && (!invoice.invoiceNumber || invoice.invoiceNumber.trim() === '')) {
              invoice.invoiceNumber = ocrResult.invoiceData.invoiceNumber;
              console.log('✓ 赋值 invoiceNumber:', invoice.invoiceNumber);
            }
            if (ocrResult.invoiceData.invoiceDate && !invoice.invoiceDate) {
              invoice.invoiceDate = new Date(ocrResult.invoiceData.invoiceDate);
              console.log('✓ 赋值 invoiceDate:', invoice.invoiceDate);
            }
            if (ocrResult.invoiceData.invoiceType && (!invoice.invoiceType || invoice.invoiceType.trim() === '')) {
              invoice.invoiceType = ocrResult.invoiceData.invoiceType;
              console.log('✓ 赋值 invoiceType:', invoice.invoiceType);
            }
            if (ocrResult.invoiceData.amount !== undefined && ocrResult.invoiceData.amount !== null && (!invoice.amount || invoice.amount === 0)) {
              invoice.amount = parseFloat(ocrResult.invoiceData.amount);
              console.log('✓ 赋值 amount:', invoice.amount);
            }
            if (ocrResult.invoiceData.taxAmount !== undefined && ocrResult.invoiceData.taxAmount !== null && (!invoice.taxAmount || invoice.taxAmount === 0)) {
              invoice.taxAmount = parseFloat(ocrResult.invoiceData.taxAmount);
              console.log('✓ 赋值 taxAmount:', invoice.taxAmount);
            }
            if (ocrResult.invoiceData.totalAmount !== undefined && ocrResult.invoiceData.totalAmount !== null && (!invoice.totalAmount || invoice.totalAmount === 0)) {
              invoice.totalAmount = parseFloat(ocrResult.invoiceData.totalAmount);
              console.log('✓ 赋值 totalAmount:', invoice.totalAmount);
            }
            
            // 销售方（商户）信息
            if (ocrResult.invoiceData.vendorName && (!invoice.vendor?.name || invoice.vendor.name.trim() === '')) {
              invoice.vendor = invoice.vendor || {};
              invoice.vendor.name = ocrResult.invoiceData.vendorName;
              console.log('✓ 赋值 vendor.name:', invoice.vendor.name);
            }
            if (ocrResult.invoiceData.vendorTaxId && (!invoice.vendor?.taxId || invoice.vendor.taxId.trim() === '')) {
              invoice.vendor = invoice.vendor || {};
              invoice.vendor.taxId = ocrResult.invoiceData.vendorTaxId;
              console.log('✓ 赋值 vendor.taxId:', invoice.vendor.taxId);
            }
            if (ocrResult.invoiceData.vendorAddress && (!invoice.vendor?.address || invoice.vendor.address.trim() === '')) {
              invoice.vendor = invoice.vendor || {};
              invoice.vendor.address = ocrResult.invoiceData.vendorAddress;
              console.log('✓ 赋值 vendor.address:', invoice.vendor.address);
            }
            
            // 购买方信息
            if (ocrResult.invoiceData.buyerName || ocrResult.invoiceData.buyerTaxId) {
              invoice.buyer = invoice.buyer || {};
              if (ocrResult.invoiceData.buyerName && (!invoice.buyer.name || invoice.buyer.name.trim() === '')) {
                invoice.buyer.name = ocrResult.invoiceData.buyerName;
                console.log('✓ 赋值 buyer.name:', invoice.buyer.name);
              }
              if (ocrResult.invoiceData.buyerTaxId && (!invoice.buyer.taxId || invoice.buyer.taxId.trim() === '')) {
                invoice.buyer.taxId = ocrResult.invoiceData.buyerTaxId;
                console.log('✓ 赋值 buyer.taxId:', invoice.buyer.taxId);
              }
            }
            
            // 发票项目明细
            if (ocrResult.invoiceData.items && Array.isArray(ocrResult.invoiceData.items) && ocrResult.invoiceData.items.length > 0) {
              invoice.items = ocrResult.invoiceData.items;
              console.log('✓ 赋值 items，数量:', invoice.items.length);
            }
            
            // 开票人
            if (ocrResult.invoiceData.issuer && (!invoice.issuer || invoice.issuer.trim() === '')) {
              invoice.issuer = ocrResult.invoiceData.issuer;
              console.log('✓ 赋值 issuer:', invoice.issuer);
            }
            
            // 出行人信息
            if (ocrResult.invoiceData.travelerName || ocrResult.invoiceData.travelerIdNumber || 
                ocrResult.invoiceData.departure || ocrResult.invoiceData.destination) {
              invoice.traveler = invoice.traveler || {};
              if (ocrResult.invoiceData.travelerName && (!invoice.traveler.name || invoice.traveler.name.trim() === '')) {
                invoice.traveler.name = ocrResult.invoiceData.travelerName;
                console.log('✓ 赋值 traveler.name:', invoice.traveler.name);
              }
              if (ocrResult.invoiceData.travelerIdNumber && (!invoice.traveler.idNumber || invoice.traveler.idNumber.trim() === '')) {
                invoice.traveler.idNumber = ocrResult.invoiceData.travelerIdNumber;
                console.log('✓ 赋值 traveler.idNumber:', invoice.traveler.idNumber);
              }
              if (ocrResult.invoiceData.departure && (!invoice.traveler.departure || invoice.traveler.departure.trim() === '')) {
                invoice.traveler.departure = ocrResult.invoiceData.departure;
                console.log('✓ 赋值 traveler.departure:', invoice.traveler.departure);
              }
              if (ocrResult.invoiceData.destination && (!invoice.traveler.destination || invoice.traveler.destination.trim() === '')) {
                invoice.traveler.destination = ocrResult.invoiceData.destination;
                console.log('✓ 赋值 traveler.destination:', invoice.traveler.destination);
              }
            }
            
            // 价税合计（大写）
            if (ocrResult.invoiceData.totalAmountInWords && (!invoice.totalAmountInWords || invoice.totalAmountInWords.trim() === '')) {
              invoice.totalAmountInWords = ocrResult.invoiceData.totalAmountInWords;
              console.log('✓ 赋值 totalAmountInWords:', invoice.totalAmountInWords);
            }
            
            console.log('OCR 数据赋值完成');
          }

          await invoice.save();
          console.log('OCR数据已保存到发票');
          console.log('识别的字段:', Object.keys(ocrResult.invoiceData || {}).join(', '));
        } else {
          console.error('OCR识别失败:', ocrResult.error);
          console.error('OCR失败详情:', JSON.stringify(ocrResult, null, 2));
          // 即使OCR失败，也记录尝试信息
          invoice.ocrData = {
            extracted: false,
            error: ocrResult.error || 'OCR识别失败',
            attemptedAt: new Date()
          };
          await invoice.save();
        }
      } catch (ocrError) {
        console.error('========================================');
        console.error('OCR识别异常:', ocrError.message);
        console.error('OCR错误类型:', ocrError.constructor.name);
        console.error('OCR错误堆栈:', ocrError.stack);
        console.error('========================================');
        // OCR失败不影响发票上传，但记录错误信息
        try {
          invoice.ocrData = {
            extracted: false,
            error: ocrError.message,
            attemptedAt: new Date()
          };
          await invoice.save();
        } catch (saveError) {
          console.error('保存OCR错误信息失败:', saveError.message);
        }
      }
      
      // OCR识别完成后，删除上传的文件
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('OCR识别完成，已删除上传文件:', filePath);
        }
      } catch (unlinkError) {
        console.error('删除上传文件失败:', unlinkError.message);
      }
    } else {
      console.log('非图片文件，跳过OCR识别，文件类型:', req.file.mimetype);
      
      // 非图片文件也删除上传的文件（识别完成后）
      try {
        const filePath = path.isAbsolute(req.file.path) 
          ? req.file.path 
          : path.resolve(__dirname, '..', req.file.path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('已删除上传文件:', filePath);
        }
      } catch (unlinkError) {
        console.error('删除上传文件失败:', unlinkError.message);
      }
    }

    // 重新查询发票以获取完整数据（包括OCR识别后的字段）
    const updatedInvoice = await Invoice.findById(invoice._id)
      .populate('uploadedBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: '发票上传成功',
      data: updatedInvoice
    });
  } catch (error) {
    console.error('Upload invoice error:', error);
    
    // 如果创建失败，删除已上传的文件
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Delete file error:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: '发票上传失败: ' + error.message
    });
  }
});

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
router.put('/:id', protect, upload.single('file'), async (req, res) => {
  try {
    let invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: '发票不存在'
      });
    }

    // 检查权限
    if (invoice.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权修改此发票'
      });
    }

    // 如果上传了新文件，更新文件信息
    if (req.file) {
      // 删除旧文件（如果存在）
      if (invoice.file && invoice.file.path) {
        const oldFilePath = path.join(__dirname, '..', invoice.file.path);
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
          } catch (err) {
            console.error('删除旧文件失败:', err);
          }
        }
      }

      // 处理文件名编码（与上传路由相同的逻辑）
      let originalName = req.file.originalname;
      try {
        if (originalName.includes('%')) {
          try {
            originalName = decodeURIComponent(originalName);
          } catch (e) {}
        }
        
        const hasLatin1Pattern = /[à-ÿ]/g.test(originalName) || /[æ-ÿ]/g.test(originalName);
        if (hasLatin1Pattern) {
          try {
            const fixed = Buffer.from(originalName, 'latin1').toString('utf-8');
            if (/[\u4e00-\u9fa5]/.test(fixed)) {
              originalName = fixed;
            }
          } catch (e) {}
        }
        
        if (!/[\u4e00-\u9fa5]/.test(originalName)) {
          try {
            const converted = Buffer.from(originalName, 'latin1').toString('utf-8');
            if (/[\u4e00-\u9fa5]/.test(converted)) {
              originalName = converted;
            }
          } catch (e) {}
        }
      } catch (error) {
        console.error('文件名编码处理失败:', error);
      }

      invoice.file = {
        filename: req.file.filename,
        originalName: originalName,
        path: req.file.path,
        size: req.file.size,
        mimeType: req.file.mimetype
      };
    }

    // 处理表单数据（可能是JSON字符串或对象）
    let bodyData = req.body;
    if (typeof req.body.vendor === 'string') {
      try {
        bodyData.vendor = JSON.parse(req.body.vendor);
      } catch (e) {
        console.error('解析vendor失败:', e);
      }
    }
    if (typeof req.body.buyer === 'string') {
      try {
        bodyData.buyer = JSON.parse(req.body.buyer);
      } catch (e) {
        console.error('解析buyer失败:', e);
      }
    }
    if (typeof req.body.items === 'string') {
      try {
        bodyData.items = JSON.parse(req.body.items);
      } catch (e) {
        console.error('解析items失败:', e);
      }
    }
    if (typeof req.body.tags === 'string') {
      try {
        bodyData.tags = JSON.parse(req.body.tags);
      } catch (e) {
        console.error('解析tags失败:', e);
      }
    }

    // 更新字段
    const updateFields = [
      'invoiceNumber',
      'invoiceDate',
      'invoiceType',
      'amount',
      'currency',
      'taxAmount',
      'totalAmount',
      'category',
      'notes',
      'status',
      'totalAmountInWords'
    ];

    updateFields.forEach(field => {
      if (bodyData[field] !== undefined && bodyData[field] !== null && bodyData[field] !== '') {
        if (field === 'amount' || field === 'taxAmount' || field === 'totalAmount') {
          invoice[field] = parseFloat(bodyData[field]);
        } else {
          invoice[field] = bodyData[field];
        }
      }
    });

    // 更新商户信息（销售方）
    if (bodyData.vendor) {
      invoice.vendor = { ...invoice.vendor, ...bodyData.vendor };
    }

    // 更新购买方信息
    if (bodyData.buyer) {
      invoice.buyer = { ...invoice.buyer, ...bodyData.buyer };
    }

    // 更新发票项目明细
    if (bodyData.items !== undefined) {
      invoice.items = Array.isArray(bodyData.items) ? bodyData.items : [];
    }

    // 更新开票人
    if (bodyData.issuer !== undefined) {
      invoice.issuer = bodyData.issuer || null;
    }

    // 更新出行人信息
    if (bodyData.traveler) {
      invoice.traveler = { ...invoice.traveler, ...bodyData.traveler };
    }

    // 更新价税合计（大写）
    if (bodyData.totalAmountInWords !== undefined) {
      invoice.totalAmountInWords = bodyData.totalAmountInWords || null;
    }

    // 更新标签
    if (bodyData.tags !== undefined) {
      invoice.tags = Array.isArray(bodyData.tags) 
        ? bodyData.tags 
        : (typeof bodyData.tags === 'string' ? bodyData.tags.split(',').map(t => t.trim()).filter(t => t) : []);
    }

    // 更新关联
    if (bodyData.relatedExpense !== undefined) {
      invoice.relatedExpense = bodyData.relatedExpense || null;
    }
    if (bodyData.relatedTravel !== undefined) {
      invoice.relatedTravel = bodyData.relatedTravel || null;
    }

    // 如果状态改为verified，记录审核信息
    if (bodyData.status === 'verified' && invoice.status !== 'verified') {
      invoice.verifiedBy = req.user.id;
      invoice.verifiedAt = new Date();
    }

    await invoice.save();

    res.json({
      success: true,
      message: '发票更新成功',
      data: invoice
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({
      success: false,
      message: '更新发票失败: ' + error.message
    });
  }
});

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: '发票不存在'
      });
    }

    // 检查权限
    if (invoice.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权删除此发票'
      });
    }

    // 删除文件
    if (invoice.file && invoice.file.path) {
      try {
        const filePath = path.resolve(__dirname, '..', invoice.file.path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (fileError) {
        console.error('Delete file error:', fileError);
      }
    }

    await invoice.deleteOne();

    res.json({
      success: true,
      message: '发票删除成功'
    });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({
      success: false,
      message: '删除发票失败'
    });
  }
});


// @desc    Link invoice to expense or travel
// @route   POST /api/invoices/:id/link
// @access  Private
router.post('/:id/link', protect, async (req, res) => {
  try {
    const { type, id: relatedId } = req.body; // type: 'expense' or 'travel'

    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: '发票不存在'
      });
    }

    // 检查权限
    if (invoice.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权操作此发票'
      });
    }

    if (type === 'expense') {
      const expense = await Expense.findById(relatedId);
      if (!expense) {
        return res.status(404).json({
          success: false,
          message: '费用记录不存在'
        });
      }
      invoice.relatedExpense = relatedId;
      invoice.status = 'linked';
    } else if (type === 'travel') {
      const travel = await Travel.findById(relatedId);
      if (!travel) {
        return res.status(404).json({
          success: false,
          message: '差旅记录不存在'
        });
      }
      invoice.relatedTravel = relatedId;
      invoice.status = 'linked';
    } else {
      return res.status(400).json({
        success: false,
        message: '无效的关联类型'
      });
    }

    await invoice.save();

    res.json({
      success: true,
      message: '关联成功',
      data: invoice
    });
  } catch (error) {
    console.error('Link invoice error:', error);
    res.status(500).json({
      success: false,
      message: '关联失败'
    });
  }
});

// @desc    Recognize invoice with OCR
// @route   POST /api/invoices/:id/recognize
// @access  Private
router.post('/:id/recognize', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: '发票不存在'
      });
    }

    // 检查权限
    if (invoice.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权操作此发票'
      });
    }

    // 检查文件类型（支持图片和PDF）
    if (!invoice.file.mimeType.startsWith('image/') && invoice.file.mimeType !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        message: '仅支持图片和PDF格式的OCR识别'
      });
    }

    const filePath = path.resolve(__dirname, '..', invoice.file.path);

    // 执行OCR识别（根据文件类型选择不同的识别方法）
    let ocrResult;
    if (invoice.file.mimeType.startsWith('image/')) {
      ocrResult = await ocrService.recognizeInvoice(filePath);
    } else if (invoice.file.mimeType === 'application/pdf') {
      ocrResult = await ocrService.recognizePDFInvoice(filePath);
    }

    if (ocrResult.success) {
      // 更新OCR数据
      invoice.ocrData = {
        extracted: true,
        confidence: ocrResult.confidence,
        rawData: ocrResult.rawData,
        extractedAt: new Date()
      };

      // 返回识别结果，但不自动更新发票信息（让用户确认）
      res.json({
        success: true,
        message: 'OCR识别成功',
        data: {
          ocrData: invoice.ocrData,
          recognizedData: ocrResult.invoiceData,
          text: ocrResult.text
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'OCR识别失败: ' + ocrResult.error
      });
    }
  } catch (error) {
    console.error('OCR recognize error:', error);
    res.status(500).json({
      success: false,
      message: 'OCR识别失败: ' + error.message
    });
  }
});

// @desc    Apply OCR recognized data to invoice
// @route   POST /api/invoices/:id/apply-ocr
// @access  Private
router.post('/:id/apply-ocr', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: '发票不存在'
      });
    }

    // 检查权限
    if (invoice.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '无权操作此发票'
      });
    }

    // 检查是否有OCR数据
    if (!invoice.ocrData || !invoice.ocrData.extracted) {
      return res.status(400).json({
        success: false,
        message: '请先进行OCR识别'
      });
    }

    // 应用OCR识别的数据（用户可以选择应用哪些字段）
    const { fields } = req.body; // fields: ['invoiceNumber', 'invoiceDate', 'amount', 'vendor', ...]

    if (fields && Array.isArray(fields)) {
      // 从rawData中提取信息（这里简化处理，实际应该从recognizedData中获取）
      // 为了简化，我们重新解析一次
      const recognizedData = ocrService.parseInvoiceData(invoice.ocrData.rawData.text || '');

      if (fields.includes('invoiceNumber') && recognizedData.invoiceNumber) {
        invoice.invoiceNumber = recognizedData.invoiceNumber;
      }
      if (fields.includes('invoiceDate') && recognizedData.invoiceDate) {
        invoice.invoiceDate = new Date(recognizedData.invoiceDate);
      }
      if (fields.includes('amount') && recognizedData.amount) {
        invoice.amount = recognizedData.amount;
      }
      if (fields.includes('vendor') && recognizedData.vendorName) {
        invoice.vendor = invoice.vendor || {};
        if (recognizedData.vendorName) invoice.vendor.name = recognizedData.vendorName;
        if (recognizedData.vendorTaxId) invoice.vendor.taxId = recognizedData.vendorTaxId;
        if (recognizedData.vendorAddress) invoice.vendor.address = recognizedData.vendorAddress;
      }
    }

    await invoice.save();

    res.json({
      success: true,
      message: 'OCR数据应用成功',
      data: invoice
    });
  } catch (error) {
    console.error('Apply OCR error:', error);
    res.status(500).json({
      success: false,
      message: '应用OCR数据失败: ' + error.message
    });
  }
});

module.exports = router;

