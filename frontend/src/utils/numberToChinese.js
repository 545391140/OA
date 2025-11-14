/**
 * 将数字转换为中文数字
 * @param {number} num - 要转换的数字
 * @returns {string} 中文数字字符串
 */
export const numberToChinese = (num) => {
  if (typeof num !== 'number' || num < 1 || num > 99) {
    return num.toString();
  }

  const chineseNumbers = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const chineseUnits = ['', '十', '百', '千', '万'];

  if (num < 10) {
    return chineseNumbers[num];
  }

  if (num === 10) {
    return '十';
  }

  if (num < 20) {
    return '十' + chineseNumbers[num % 10];
  }

  if (num < 100) {
    const tens = Math.floor(num / 10);
    const ones = num % 10;
    return chineseNumbers[tens] + '十' + (ones > 0 ? chineseNumbers[ones] : '');
  }

  return num.toString();
};


