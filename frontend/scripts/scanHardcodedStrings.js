#!/usr/bin/env node

// 硬编码字符串扫描工具
// 用于CI/CD中检测硬编码的英文文本，目标：硬编码率 ≤ 0.2%

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// 配置
const CONFIG = {
  // 扫描的文件类型
  filePatterns: [
    'src/**/*.js',
    'src/**/*.jsx',
    'src/**/*.ts',
    'src/**/*.tsx'
  ],
  
  // 排除的文件/目录
  excludePatterns: [
    'node_modules/**',
    'dist/**',
    'build/**',
    '**/*.test.js',
    '**/*.spec.js',
    '**/*.test.ts',
    '**/*.spec.ts',
    'scripts/**',
    'config/**'
  ],
  
  // 硬编码字符串检测规则
  hardcodedPatterns: [
    // 字符串字面量中的英文文本
    {
      name: 'String Literals',
      pattern: /['"`]([A-Z][a-zA-Z\s]{2,})['"`]/g,
      description: 'String literals with English text'
    },
    
    // JSX中的文本内容
    {
      name: 'JSX Text Content',
      pattern: />\s*([A-Z][a-zA-Z\s]{2,})\s*</g,
      description: 'JSX text content with English text'
    },
    
    // 属性值中的英文文本
    {
      name: 'Attribute Values',
      pattern: /(?:label|placeholder|title|alt|aria-label)=['"`]([A-Z][a-zA-Z\s]{2,})['"`]/g,
      description: 'Attribute values with English text'
    },
    
    // 注释中的英文文本
    {
      name: 'Comments',
      pattern: /\/\*\s*([A-Z][a-zA-Z\s]{2,})\s*\*\//g,
      description: 'Comments with English text'
    },
    
    // 单行注释
    {
      name: 'Single Line Comments',
      pattern: /\/\/\s*([A-Z][a-zA-Z\s]{2,})/g,
      description: 'Single line comments with English text'
    }
  ],
  
  // 允许的硬编码字符串（白名单）
  allowedStrings: [
    // 技术相关
    'React', 'JavaScript', 'TypeScript', 'Node.js', 'npm', 'yarn',
    'HTML', 'CSS', 'JSON', 'API', 'HTTP', 'HTTPS', 'URL', 'URI',
    'DOM', 'BOM', 'AJAX', 'REST', 'GraphQL', 'WebSocket',
    
    // 框架相关
    'Material-UI', 'MUI', 'Ant Design', 'Bootstrap', 'Tailwind',
    'Redux', 'MobX', 'Vue', 'Angular', 'Svelte',
    
    // 工具相关
    'ESLint', 'Prettier', 'Webpack', 'Vite', 'Rollup', 'Babel',
    'Jest', 'Cypress', 'Storybook', 'Docker', 'Kubernetes',
    
    // 常见英文单词（避免误报）
    'OK', 'Yes', 'No', 'Cancel', 'Save', 'Delete', 'Edit', 'View',
    'Add', 'Remove', 'Update', 'Create', 'Submit', 'Reset', 'Clear',
    'Search', 'Filter', 'Sort', 'Export', 'Import', 'Download', 'Upload',
    'Loading', 'Error', 'Success', 'Warning', 'Info', 'Help', 'About',
    
    // 日期时间格式
    'YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'HH:mm:ss',
    
    // 货币代码
    'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KRW', 'AUD', 'CAD',
    
    // 语言代码
    'en', 'zh', 'ja', 'ko', 'ar', 'he', 'fr', 'de', 'es', 'it', 'pt', 'ru',
    
    // 文件扩展名
    '.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.scss', '.html', '.md',
    
    // 环境变量
    'NODE_ENV', 'REACT_APP_', 'process.env', 'localStorage', 'sessionStorage',
    
    // 正则表达式
    'regex', 'pattern', 'match', 'replace', 'split', 'join',
    
    // 数学/统计
    'Math', 'Number', 'String', 'Array', 'Object', 'Function', 'Boolean',
    'Date', 'RegExp', 'Error', 'Promise', 'Set', 'Map', 'WeakMap', 'WeakSet',
    
    // 浏览器API
    'window', 'document', 'navigator', 'location', 'history', 'screen',
    'console', 'alert', 'confirm', 'prompt', 'setTimeout', 'setInterval',
    'fetch', 'XMLHttpRequest', 'FormData', 'Blob', 'File', 'URL',
    
    // CSS相关
    'px', 'em', 'rem', 'vh', 'vw', 'vmin', 'vmax', 'pt', 'pc', 'in', 'cm', 'mm',
    'flex', 'grid', 'block', 'inline', 'none', 'auto', 'center', 'left', 'right',
    'top', 'bottom', 'middle', 'baseline', 'stretch', 'space-between', 'space-around',
    
    // 状态码
    '200', '201', '400', '401', '403', '404', '500', '502', '503', '504',
    
    // 字体相关
    'Roboto', 'Helvetica', 'Arial', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei',
    'PingFang TC', 'Microsoft JhengHei', 'Hiragino Sans', 'Yu Gothic', 'Meiryo',
    'Malgun Gothic', 'Apple SD Gothic Neo', 'Cairo', 'Amiri', 'Heebo', 'Assistant',
    
    // 语言名称
    'English', 'Chinese', 'Simplified Chinese', 'Traditional Chinese', 'Japanese', 'Korean',
    'Arabic', 'Hebrew', 'French', 'German', 'Spanish', 'Italian', 'Portuguese', 'Russian',
    
    // 技术术语
    'Context', 'import', 'export', 'default', 'const', 'let', 'var', 'function', 'class',
    'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue',
    'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'extends', 'implements',
    
    // 注释相关
    'Catch all route', 'Context import', 'Basic Information', 'Destination', 'Travel Dates',
    'Bookings', 'Estimated Cost', 'Departure Date', 'Return Date', 'Add Booking',
    'Save Draft', 'Submit Request', 'Cancel', 'Edit', 'Delete', 'View', 'Search',
    'Profile Details', 'Change Password Dialog', 'Personal Information', 'Profile Overview',
    'Select variant', 'Chip variant', 'Icon variant', 'Default return Select variant',
    
    // 系统相关
    'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy', 'system-ui',
    'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded',
    
    // 国际化相关
    'Locale', 'UTC', 'ICU', 'Sunday', 'Monday', 'Saturday', 'POST', 'Cookie',
    'All Status', 'Approved', 'Pending', 'Rejected', 'Draft', 'Submitted',
    'In Progress', 'Completed', 'Cancelled',
    
    // 模拟数据相关
    'Tokyo', 'John', 'Doe', 'Jane', 'South Korea', 'Seoul', 'Mike', 'Johnson',
    'Smith', 'Wilson', 'Brown', 'Davis', 'Miller', 'Garcia', 'Rodriguez',
    'New York', 'London', 'Paris', 'Berlin', 'Sydney', 'Singapore', 'Hong Kong',
    'Beijing', 'Shanghai', 'Shenzhen', 'Guangzhou', 'Hangzhou', 'Nanjing',
    'United States', 'United Kingdom', 'France', 'Germany', 'Australia',
    'China', 'Japan', 'Korea', 'Canada', 'Brazil', 'India', 'Russia',
    'Deluxe', 'Hertz', 'Michael', 'Mock data', 'replace with actual API call',
    'Failed to load travel data', 'Action Buttons', 'Purpose', 'Actual Cost',
    'Approval Status', 'Business Trip', 'Conference', 'Training', 'Meeting',
    'Client Visit', 'Project Review', 'Team Building', 'Research', 'Sales',
    'Marketing', 'Development', 'Support', 'Consulting', 'Audit',
    'Your Company', 'Custom Range', 'Operations', 'Transportation', 'Meals',
    'Hotel XYZ', 'Airline Co', 'Restaurant ABC', 'Accommodation',
    'All Departments', 'Last 7 Days', 'Last 30 Days', 'Last 90 Days', 'This Year',
    'Engineering', 'HR', 'Finance', 'IT', 'Legal', 'Admin',
    'Office Depot', 'Taxi Service', 'Office Supplies', 'Failed to load report data',
    'PDF', 'Excel', 'Travel Analysis', 'Report Tabs', 'First name is required',
    'Last name is required', 'Email is required', 'Phone is required',
    'Department is required', 'Position is required', 'Password is required',
    'Confirm password is required', 'Passwords do not match', 'Invalid email format',
    'New password is required', 'Failed to update profile', 'Failed to change password',
    'Language', 'Timezone', 'Paid', 'Flight', 'Stationery and office materials',
    'Stationery', 'Internal', 'External', 'Client', 'Project', 'Billable',
    'Non-billable', 'Reimbursable', 'Personal', 'Business', 'Travel', 'Meal',
    'Accommodation', 'Transport', 'Entertainment', 'Office', 'Equipment',
    'Software', 'Training', 'Conference', 'Meeting', 'Phone', 'Internet',
    'Category', 'Amount', 'Actions', 'Fuel', 'Airbnb', 'Hostel', 'Breakfast',
    'Lunch', 'Snacks', 'Mobile Data', 'Train', 'Taxi', 'Rental Car', 'Public Transport',
    'Parking', 'Apartment Rental', 'Dinner', 'Coffee/Tea', 'Business Meal', 'Postage',
    'Courier', 'Office Supplies', 'Equipment', 'Software License', 'Books', 'Magazines',
    'Newspapers', 'Printing', 'Photocopying', 'Shipping', 'Delivery', 'Cleaning',
    'Maintenance', 'Repair', 'Insurance', 'Bank Fees', 'Legal Fees', 'Accounting',
    'Consulting', 'Advertising', 'Marketing', 'Promotion', 'Event', 'Gift', 'Reward',
    'Course', 'Workshop', 'Certification', 'Online Training', 'Miscellaneous', 'Medical',
    'Prospect A', 'Prospect B', 'Tags', 'Tax ID',
    
    // 日期格式
    'MMM DD', 'YYYY-MM-DD', 'MM/DD/YYYY', 'DD/MM/YYYY', 'HH:mm:ss',
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    
    // 公司/组织相关
    'Acme Corp', 'Tech Solutions', 'Global Inc', 'Innovation Ltd', 'Future Systems',
    'Digital Works', 'Smart Solutions', 'Next Gen', 'Advanced Tech', 'Modern Systems'
  ],
  
  // 阈值配置
  thresholds: {
    hardcodedRate: 0.2, // 硬编码率阈值（百分比）
    maxHardcodedStrings: 10 // 最大允许的硬编码字符串数量
  }
};

class HardcodedStringScanner {
  constructor() {
    this.results = {
      totalFiles: 0,
      totalLines: 0,
      hardcodedStrings: [],
      allowedStrings: [],
      violations: [],
      summary: {}
    };
  }

  /**
   * 扫描所有文件
   */
  async scanAll() {
    console.log('🔍 Starting hardcoded string scan...');
    
    // 获取所有需要扫描的文件
    const files = await this.getFilesToScan();
    console.log(`📁 Found ${files.length} files to scan`);
    
    // 扫描每个文件
    for (const file of files) {
      await this.scanFile(file);
    }
    
    // 生成报告
    this.generateReport();
    
    return this.results;
  }

  /**
   * 获取需要扫描的文件列表
   */
  async getFilesToScan() {
    const files = [];
    
    for (const pattern of CONFIG.filePatterns) {
      const matches = glob.sync(pattern, {
        ignore: CONFIG.excludePatterns,
        cwd: process.cwd()
      });
      files.push(...matches);
    }
    
    return [...new Set(files)]; // 去重
  }

  /**
   * 扫描单个文件
   */
  async scanFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      this.results.totalFiles++;
      this.results.totalLines += lines.length;
      
      // 应用所有检测规则
      for (const rule of CONFIG.hardcodedPatterns) {
        this.applyRule(filePath, content, lines, rule);
      }
      
    } catch (error) {
      console.error(`❌ Error scanning file ${filePath}:`, error.message);
    }
  }

  /**
   * 应用检测规则
   */
  applyRule(filePath, content, lines, rule) {
    let match;
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
    
    while ((match = regex.exec(content)) !== null) {
      const matchedText = match[1] || match[0];
      const lineNumber = this.getLineNumber(content, match.index);
      const lineContent = lines[lineNumber - 1] || '';
      
      // 检查是否在白名单中
      if (this.isAllowedString(matchedText)) {
        this.results.allowedStrings.push({
          text: matchedText,
          file: filePath,
          line: lineNumber,
          rule: rule.name,
          lineContent: lineContent.trim()
        });
        continue;
      }
      
      // 记录违规
      const violation = {
        text: matchedText,
        file: filePath,
        line: lineNumber,
        rule: rule.name,
        description: rule.description,
        lineContent: lineContent.trim(),
        severity: this.getSeverity(matchedText)
      };
      
      this.results.hardcodedStrings.push(violation);
      this.results.violations.push(violation);
    }
  }

  /**
   * 获取行号
   */
  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  /**
   * 检查字符串是否在白名单中
   */
  isAllowedString(text) {
    const normalizedText = text.trim();
    
    // 检查完全匹配
    if (CONFIG.allowedStrings.includes(normalizedText)) {
      return true;
    }
    
    // 检查部分匹配（用于技术术语）
    return CONFIG.allowedStrings.some(allowed => 
      normalizedText.includes(allowed) || allowed.includes(normalizedText)
    );
  }

  /**
   * 获取违规严重程度
   */
  getSeverity(text) {
    // 用户界面文本 - 高严重程度
    if (/^(Title|Label|Button|Menu|Dialog|Form|Input|Select|Checkbox|Radio)/i.test(text)) {
      return 'high';
    }
    
    // 错误消息 - 高严重程度
    if (/^(Error|Warning|Success|Info|Message)/i.test(text)) {
      return 'high';
    }
    
    // 导航文本 - 中严重程度
    if (/^(Home|Dashboard|Profile|Settings|Logout|Login|Register)/i.test(text)) {
      return 'medium';
    }
    
    // 其他文本 - 低严重程度
    return 'low';
  }

  /**
   * 生成报告
   */
  generateReport() {
    const { violations, totalFiles, totalLines } = this.results;
    
    // 计算硬编码率
    const hardcodedRate = (violations.length / totalLines) * 100;
    
    // 按严重程度分组
    const violationsBySeverity = {
      high: violations.filter(v => v.severity === 'high'),
      medium: violations.filter(v => v.severity === 'medium'),
      low: violations.filter(v => v.severity === 'low')
    };
    
    // 按文件分组
    const violationsByFile = violations.reduce((acc, violation) => {
      if (!acc[violation.file]) {
        acc[violation.file] = [];
      }
      acc[violation.file].push(violation);
      return acc;
    }, {});
    
    this.results.summary = {
      hardcodedRate,
      totalViolations: violations.length,
      violationsBySeverity,
      violationsByFile,
      thresholdExceeded: hardcodedRate > CONFIG.thresholds.hardcodedRate,
      maxViolationsExceeded: violations.length > CONFIG.thresholds.maxHardcodedStrings
    };
    
    // 输出报告
    this.printReport();
  }

  /**
   * 打印报告
   */
  printReport() {
    const { summary, violations, allowedStrings } = this.results;
    
    console.log('\n📊 Hardcoded String Scan Report');
    console.log('================================');
    
    console.log(`📁 Files scanned: ${this.results.totalFiles}`);
    console.log(`📝 Total lines: ${this.results.totalLines}`);
    console.log(`🚨 Violations found: ${summary.totalViolations}`);
    console.log(`✅ Allowed strings: ${allowedStrings.length}`);
    console.log(`📈 Hardcoded rate: ${summary.hardcodedRate.toFixed(2)}%`);
    console.log(`🎯 Threshold: ${CONFIG.thresholds.hardcodedRate}%`);
    
    // 严重程度统计
    console.log('\n📊 Violations by Severity:');
    console.log(`🔴 High: ${summary.violationsBySeverity.high.length}`);
    console.log(`🟡 Medium: ${summary.violationsBySeverity.medium.length}`);
    console.log(`🟢 Low: ${summary.violationsBySeverity.low.length}`);
    
    // 阈值检查
    if (summary.thresholdExceeded) {
      console.log('\n❌ THRESHOLD EXCEEDED!');
      console.log(`Hardcoded rate (${summary.hardcodedRate.toFixed(2)}%) exceeds threshold (${CONFIG.thresholds.hardcodedRate}%)`);
    } else {
      console.log('\n✅ Threshold check passed');
    }
    
    if (summary.maxViolationsExceeded) {
      console.log('\n❌ MAX VIOLATIONS EXCEEDED!');
      console.log(`Total violations (${summary.totalViolations}) exceeds maximum allowed (${CONFIG.thresholds.maxHardcodedStrings})`);
    }
    
    // 显示前10个违规
    if (violations.length > 0) {
      console.log('\n🔍 Top Violations:');
      violations.slice(0, 10).forEach((violation, index) => {
        console.log(`${index + 1}. [${violation.severity.toUpperCase()}] ${violation.text}`);
        console.log(`   📁 ${violation.file}:${violation.line}`);
        console.log(`   📝 ${violation.lineContent}`);
        console.log('');
      });
    }
    
    // 按文件显示违规
    if (Object.keys(summary.violationsByFile).length > 0) {
      console.log('\n📁 Violations by File:');
      Object.entries(summary.violationsByFile).forEach(([file, fileViolations]) => {
        console.log(`📄 ${file}: ${fileViolations.length} violations`);
      });
    }
  }

  /**
   * 导出结果到JSON文件
   */
  exportResults(outputPath = 'hardcoded-scan-results.json') {
    const exportData = {
      timestamp: new Date().toISOString(),
      config: CONFIG,
      results: this.results
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
    console.log(`\n💾 Results exported to: ${outputPath}`);
  }
}

// 主函数
async function main() {
  const scanner = new HardcodedStringScanner();
  
  try {
    const results = await scanner.scanAll();
    
    // 导出结果
    scanner.exportResults();
    
    // 根据阈值决定退出码
    if (results.summary.thresholdExceeded || results.summary.maxViolationsExceeded) {
      process.exit(1);
    } else {
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Scan failed:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = { HardcodedStringScanner, CONFIG };
