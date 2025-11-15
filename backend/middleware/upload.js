const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');

// 解码文件名（处理URL编码的中文文件名和编码错误）
const decodeFileName = (filename) => {
  try {
    // 如果文件名是URL编码的，先解码
    if (filename.includes('%')) {
      try {
        return decodeURIComponent(filename);
      } catch (e) {
        // URL解码失败，继续其他方法
      }
    }
    
    // 检测是否是 UTF-8 被误解释为 Latin1 的情况
    // 如果文件名包含类似 æ±å 这样的字符，很可能是 UTF-8 被误解释为 Latin1
    const hasLatin1Pattern = /[à-ÿ]/g.test(filename) || /[æ-ÿ]/g.test(filename);
    
    if (hasLatin1Pattern) {
      try {
        // 方法1: 尝试将 Latin1 字节重新解释为 UTF-8
        const fixed1 = Buffer.from(filename, 'latin1').toString('utf-8');
        if (/[\u4e00-\u9fa5]/.test(fixed1)) {
          console.log('文件名编码修复 (方法1):', filename, '->', fixed1);
          return fixed1;
        }
        
        // 方法2: 如果文件名看起来像是乱码，尝试多种编码修复
        // 检查是否包含常见的乱码模式
        const hasGarbledPattern = /æ|±|å|º|è|¡|ç|µ|¥|¨/.test(filename);
        if (hasGarbledPattern) {
          // 尝试将每个字符的 Latin1 字节重新解释为 UTF-8
          const bytes = Buffer.from(filename, 'latin1');
          const fixed2 = bytes.toString('utf-8');
          if (/[\u4e00-\u9fa5]/.test(fixed2) && fixed2.length > 0) {
            console.log('文件名编码修复 (方法2):', filename, '->', fixed2);
            return fixed2;
          }
        }
      } catch (e) {
        // 修复失败，继续其他方法
        console.log('编码修复失败:', e.message);
      }
    }
    
    // 检查是否已经是正确的 UTF-8
    try {
      // 如果文件名包含中文字符，说明已经是正确的 UTF-8
      if (/[\u4e00-\u9fa5]/.test(filename)) {
        return filename;
      }
      
      // 尝试直接使用 UTF-8
      return Buffer.from(filename, 'utf-8').toString('utf-8');
    } catch (e) {
      // UTF-8 解码失败，尝试 Latin1 转 UTF-8
      return Buffer.from(filename, 'latin1').toString('utf-8');
    }
  } catch (error) {
    console.error('文件名解码失败:', error);
    console.error('原始文件名:', filename);
    return filename; // 如果解码失败，返回原文件名
  }
};

// 确保上传目录存在
const uploadDir = path.resolve(__dirname, '..', config.UPLOAD_PATH || './uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 按日期创建子目录
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const subDir = path.join(uploadDir, 'invoices', year.toString(), month, day);
    
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }
    
    cb(null, subDir);
  },
  filename: (req, file, cb) => {
    // 解码原始文件名（处理中文文件名乱码）
    const decodedOriginalName = decodeFileName(file.originalname);
    
    // 生成唯一文件名：时间戳-随机数-原文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(decodedOriginalName);
    const name = path.basename(decodedOriginalName, ext);
    const safeName = name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_'); // 保留中文字符
    
    // 更新 file.originalname 为解码后的名称
    file.originalname = decodedOriginalName;
    
    cb(null, `${uniqueSuffix}-${safeName}${ext}`);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 允许的文件类型
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型。仅支持图片（JPG, PNG, GIF, WEBP）和PDF文件。'), false);
  }
};

// 配置multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE || 10 * 1024 * 1024 // 默认10MB
  },
  fileFilter: fileFilter
});

module.exports = upload;

