/**
 * 城市工具函数
 * 提供城市相关的工具函数
 */

import { pinyinMap, getAllDomesticCities } from '../data/cityData';

/**
 * 获取城市拼音首字母
 * @param {string} cityName - 城市名称
 * @returns {string} 拼音首字母（大写）
 */
export const getCityFirstLetter = (cityName) => {
  const pinyin = pinyinMap[cityName] || '';
  if (pinyin) {
    return pinyin.charAt(0).toUpperCase();
  }
  // 如果没有拼音映射，尝试使用拼音库或返回空
  return '';
};

/**
 * 按字母分类国内城市
 * @returns {Object} 按字母分类的城市对象
 */
export const getDomesticCitiesByLetter = () => {
  const allCities = getAllDomesticCities();
  const citiesByLetter = {
    'ABCDEF': [],
    'GHIJ': [],
    'KLMN': [],
    'PQRSTUVW': [],
    'XYZ': []
  };
  
  allCities.forEach(city => {
    const firstLetter = getCityFirstLetter(city);
    if (['A', 'B', 'C', 'D', 'E', 'F'].includes(firstLetter)) {
      citiesByLetter['ABCDEF'].push(city);
    } else if (['G', 'H', 'I', 'J'].includes(firstLetter)) {
      citiesByLetter['GHIJ'].push(city);
    } else if (['K', 'L', 'M', 'N'].includes(firstLetter)) {
      citiesByLetter['KLMN'].push(city);
    } else if (['P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W'].includes(firstLetter)) {
      citiesByLetter['PQRSTUVW'].push(city);
    } else if (['X', 'Y', 'Z'].includes(firstLetter)) {
      citiesByLetter['XYZ'].push(city);
    }
  });
  
  return citiesByLetter;
};

