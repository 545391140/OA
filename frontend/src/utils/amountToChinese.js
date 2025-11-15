/**
 * 将金额转换为中文大写（人民币大写）
 * @param {number|string} amount - 金额数字
 * @returns {string} 中文大写金额字符串，如：壹万贰仟叁佰肆拾伍元陆角柒分
 */
export const amountToChinese = (amount) => {
  if (!amount && amount !== 0) {
    return '';
  }

  // 转换为数字
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(num) || num < 0) {
    return '';
  }

  // 如果金额为0，返回"零元整"
  if (num === 0) {
    return '零元整';
  }

  // 中文数字
  const chineseNumbers = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
  const chineseUnits = ['', '拾', '佰', '仟'];
  const chineseBigUnits = ['', '万', '亿'];
  const chineseDecimalUnits = ['角', '分'];

  // 将金额转换为字符串，保留两位小数
  const amountStr = num.toFixed(2);
  const [integerPart, decimalPart] = amountStr.split('.');

  // 转换整数部分
  const convertInteger = (str) => {
    if (str === '0') return '';
    
    let result = '';
    const len = str.length;
    let zeroFlag = false; // 标记是否需要添加"零"

    for (let i = 0; i < len; i++) {
      const digit = parseInt(str[i]);
      const pos = len - i - 1;
      const unitPos = pos % 4; // 个、十、百、千
      const bigUnitPos = Math.floor(pos / 4); // 万、亿

      if (digit !== 0) {
        if (zeroFlag) {
          result += '零';
          zeroFlag = false;
        }
        result += chineseNumbers[digit] + chineseUnits[unitPos];
      } else {
        zeroFlag = true;
      }

      // 添加万、亿单位
      if (unitPos === 0 && bigUnitPos > 0) {
        if (zeroFlag && result.length > 0) {
          result += '零';
        }
        result += chineseBigUnits[bigUnitPos];
        zeroFlag = false;
      }
    }

    return result;
  };

  // 转换小数部分
  const convertDecimal = (str) => {
    if (!str || str === '00') return '';
    
    let result = '';
    for (let i = 0; i < str.length && i < 2; i++) {
      const digit = parseInt(str[i]);
      if (digit !== 0) {
        result += chineseNumbers[digit] + chineseDecimalUnits[i];
      }
    }
    
    return result;
  };

  const integerChinese = convertInteger(integerPart);
  const decimalChinese = convertDecimal(decimalPart);

  // 组合结果
  let result = '';
  if (integerChinese) {
    result += integerChinese + '元';
  }
  
  if (decimalChinese) {
    result += decimalChinese;
  } else if (integerChinese) {
    result += '整';
  }

  return result || '零元整';
};

