/**
 * 地区选择器组件 - 基于携程API的地理位置服务
 * 支持机场、火车站、城市的搜索和选择
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  Box,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Chip,
  InputAdornment,
  IconButton,
  useTheme,
  alpha,
  Divider,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Grid,
  Button
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FlightIcon from '@mui/icons-material/Flight';
import TrainIcon from '@mui/icons-material/Train';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import { searchLocations } from '../../services/locationService';
import apiClient from '../../utils/axiosConfig';
import { useTranslation } from 'react-i18next';

// 拼音映射表（用于中文搜索和字母分类）
const pinyinMap = {
  // A
  '安阳': 'anyang', '安庆': 'anqing', '安顺': 'anshun', '阿克苏': 'akesu',
  // B
  '北京': 'beijing', '包头': 'baotou', '保定': 'baoding', '本溪': 'benxi', '蚌埠': 'bengbu',
  '巴彦淖尔': 'bayannaoer', '巴中': 'bazhong', '博尔塔拉': 'boertala',
  // C
  '成都': 'chengdu', '重庆': 'chongqing', '长沙': 'changsha', '长春': 'changchun',
  '常州': 'changzhou', '承德': 'chengde', '赤峰': 'chifeng', '滁州': 'chuzhou',
  '池州': 'chizhou', '昌都': 'changdu', '昌吉': 'changji', '楚雄': 'chuxiong',
  // D
  '大连': 'dalian', '大同': 'datong', '丹东': 'dandong', '大庆': 'daqing',
  '东营': 'dongying', '达州': 'dazhou', '德阳': 'deyang', '大理': 'dali',
  '德宏': 'dehong', '迪庆': 'diqing',
  // E
  '鄂尔多斯': 'eerduosi', '鄂州': 'ezhou',
  // F
  '福州': 'fuzhou', '佛山': 'foshan', '抚顺': 'fushun', '阜新': 'fuxin',
  '抚州': 'fuzhou', '防城港': 'fangchenggang',
  // G
  '广州': 'guangzhou', '贵阳': 'guiyang', '桂林': 'guilin', '赣州': 'ganzhou',
  '广元': 'guangyuan', '广安': 'guangan', '甘孜': 'ganzi', '果洛': 'guoluo',
  // H
  '杭州': 'hangzhou', '哈尔滨': 'haerbin', '合肥': 'hefei', '海口': 'haikou',
  '呼和浩特': 'huhehaote', '邯郸': 'handan', '衡水': 'hengshui', '黄石': 'huangshi',
  '黄冈': 'huanggang', '黄山': 'huangshan', '淮南': 'huainan', '淮北': 'huaibei',
  '淮安': 'huaian', '湖州': 'huzhou', '惠州': 'huizhou', '河源': 'heyuan',
  '红河': 'honghe', '哈密': 'hami', '海东': 'haidong', '海北': 'haibei',
  '海南': 'hainan', '海西': 'haixi',
  // J
  '济南': 'jinan', '吉林': 'jilin', '锦州': 'jinzhou', '鸡西': 'jixi',
  '佳木斯': 'jiamusi', '嘉兴': 'jiaxing', '金华': 'jinhua', '九江': 'jiujiang',
  '景德镇': 'jingdezhen', '吉安': 'jian', '焦作': 'jiaozuo', '荆门': 'jingmen',
  '荆州': 'jingzhou', '江门': 'jiangmen', '揭阳': 'jieyang', '晋中': 'jinzhong',
  '晋城': 'jincheng', '济宁': 'jining', '金昌': 'jinchang', '酒泉': 'jiuquan',
  // K
  '昆明': 'kunming', '开封': 'kaifeng', '克拉玛依': 'kelamayi', '喀什': 'kashi',
  '克孜勒苏': 'kezilesu',
  // L
  '拉萨': 'lasa', '兰州': 'lanzhou', '洛阳': 'luoyang', '漯河': 'luohe',
  '六安': 'liuan', '六盘水': 'liupanshui', '乐山': 'leshan', '泸州': 'luzhou',
  '凉山': 'liangshan', '丽江': 'lijiang', '临沧': 'lincang', '临夏': 'linxia',
  '陇南': 'longnan', '龙岩': 'longyan', '柳州': 'liuzhou', '来宾': 'laibin',
  '廊坊': 'langfang', '辽阳': 'liaoyang', '辽源': 'liaoyuan', '连云港': 'lianyungang',
  // M
  '绵阳': 'mianyang', '眉山': 'meishan', '茂名': 'maoming', '梅州': 'meizhou',
  '马鞍山': 'maanshan', '牡丹江': 'mudanjiang',
  // N
  '南京': 'nanjing', '南宁': 'nanning', '南昌': 'nanchang', '宁波': 'ningbo',
  '南平': 'nanping', '南通': 'nantong', '内江': 'neijiang', '南充': 'nanchong',
  '怒江': 'nujiang', '那曲': 'naqu', '宁德': 'ningde',
  // P
  '攀枝花': 'panzhihua', '平顶山': 'pingdingshan', '萍乡': 'pingxiang', '莆田': 'putian',
  '普洱': 'puer', '平凉': 'pingliang',
  // Q
  '青岛': 'qingdao', '齐齐哈尔': 'qiqihaer', '七台河': 'qitaihe', '衢州': 'quzhou',
  '泉州': 'quanzhou', '曲靖': 'qujing', '黔东南': 'qiandongnan', '黔南': 'qiannan',
  '黔西南': 'qianxinan', '庆阳': 'qingyang', '清远': 'qingyuan', '钦州': 'qinzhou',
  '秦皇岛': 'qinhuangdao', '潜江': 'qianjiang',
  // R
  '日照': 'rizhao', '日喀则': 'rikaze',
  // S
  '上海': 'shanghai', '深圳': 'shenzhen', '沈阳': 'shenyang', '石家庄': 'shijiazhuang',
  '苏州': 'suzhou', '三亚': 'sanya', '三沙': 'sansha', '三明': 'sanming',
  '韶关': 'shaoguan', '汕头': 'shantou', '汕尾': 'shanwei', '绍兴': 'shaoxing',
  '上饶': 'shangrao', '商洛': 'shangluo', '十堰': 'shiyan', '随州': 'suizhou',
  '邵阳': 'shaoyang', '四平': 'siping', '松原': 'songyuan', '宿迁': 'suqian',
  '宿州': 'suzhou', '遂宁': 'suining', '石嘴山': 'shizuishan', '石河子': 'shihezi',
  '双鸭山': 'shuangyashan', '朔州': 'shuozhou', '三门峡': 'sanmenxia',
  // T
  '天津': 'tianjin', '太原': 'taiyuan', '台州': 'taizhou', '泰安': 'taian',
  '泰州': 'taizhou', '铜陵': 'tongling', '铜川': 'tongchuan', '铜仁': 'tongren',
  '通辽': 'tongliao', '通化': 'tonghua', '天水': 'tianshui', '吐鲁番': 'tulufan',
  '塔城': 'tacheng', '图木舒克': 'tumushuke',
  // W
  '武汉': 'wuhan', '无锡': 'wuxi', '乌鲁木齐': 'wulumuqi', '温州': 'wenzhou',
  '芜湖': 'wuhu', '乌海': 'wuhai', '文山': 'wenshan', '梧州': 'wuzhou',
  '万宁': 'wanning', '五指山': 'wuzhishan', '五家渠': 'wujiaqu', '吴忠': 'wuzhong',
  '威海': 'weihai', '潍坊': 'weifang', '渭南': 'weinan', '武威': 'wuwei',
  // X
  '西安': 'xian', '厦门': 'xiamen', '西宁': 'xining', '徐州': 'xuzhou',
  '新余': 'xinyu', '新乡': 'xinxiang', '信阳': 'xinyang', '湘潭': 'xiangtan',
  '湘西': 'xiangxi', '忻州': 'xinzhou', '兴安盟': 'xinganmeng', '西双版纳': 'xishuangbanna',
  '锡林郭勒': 'xilinguole', '宣城': 'xuancheng', '许昌': 'xuchang', '咸宁': 'xianning',
  '襄阳': 'xiangyang', '孝感': 'xiaogan', '新竹': 'xinzhu', '新北': 'xinbei',
  '新竹县': 'xinzhu', '新北市': 'xinbei',
  // Y
  '银川': 'yinchuan', '扬州': 'yangzhou', '盐城': 'yancheng', '宜昌': 'yichang',
  '宜春': 'yichun', '宜宾': 'yibin', '益阳': 'yiyang', '永州': 'yongzhou',
  '岳阳': 'yueyang', '云浮': 'yunfu', '玉林': 'yulin', '玉溪': 'yuxi',
  '玉树': 'yushu', '延边': 'yanbian', '延安': 'yanan', '榆林': 'yulin',
  '伊春': 'yichun', '伊犁': 'yili', '阳江': 'yangjiang', '阳泉': 'yangquan',
  '运城': 'yuncheng', '营口': 'yingkou', '鹰潭': 'yingtan', '雅安': 'yaan',
  '阿坝': 'aba', '阿里': 'ali', '阿拉尔': 'alaer', '阿勒泰': 'aletai',
  // Z
  '郑州': 'zhengzhou', '珠海': 'zhuhai', '中山': 'zhongshan', '肇庆': 'zhaoqing',
  '漳州': 'zhangzhou', '镇江': 'zhenjiang', '株洲': 'zhuzhou', '张家界': 'zhangjiajie',
  '张家口': 'zhangjiakou', '周口': 'zhoukou', '驻马店': 'zhumadian', '自贡': 'zigong',
  '资阳': 'ziyang', '遵义': 'zunyi', '昭通': 'zhaotong', '中卫': 'zhongwei',
  '舟山': 'zhoushan', '枣庄': 'zaozhuang', '湛江': 'zhanjiang', '潮州': 'chaozhou',
  '长治': 'changzhi', '朝阳': 'chaoyang', '承德': 'chengde'
};

// 获取城市拼音首字母
const getCityFirstLetter = (cityName) => {
  const pinyin = pinyinMap[cityName] || '';
  if (pinyin) {
    return pinyin.charAt(0).toUpperCase();
  }
  // 如果没有拼音映射，尝试使用拼音库或返回空
  return '';
};

// 所有国内城市列表（按拼音首字母分类）
const getAllDomesticCities = () => {
  const cities = [
    '北京', '上海', '广州', '深圳', '成都', '杭州', '南京', '武汉', '西安', '重庆',
    '天津', '苏州', '青岛', '长沙', '大连', '厦门', '无锡', '福州', '济南', '宁波',
    '郑州', '合肥', '石家庄', '哈尔滨', '长春', '沈阳', '昆明', '南宁', '南昌', '太原',
    '贵阳', '海口', '兰州', '西宁', '银川', '乌鲁木齐', '拉萨', '呼和浩特', '包头', '鄂尔多斯',
    '唐山', '保定', '邯郸', '秦皇岛', '廊坊', '沧州', '衡水', '邢台', '张家口', '承德',
    '大同', '阳泉', '长治', '晋城', '朔州', '晋中', '运城', '忻州', '临汾',
    '乌海', '赤峰', '通辽', '呼伦贝尔', '巴彦淖尔', '乌兰察布', '兴安盟',
    '鞍山', '抚顺', '本溪', '丹东', '锦州', '营口', '阜新', '辽阳',
    '吉林', '四平', '辽源', '通化', '白山', '松原', '白城', '延边',
    '齐齐哈尔', '鸡西', '鹤岗', '双鸭山', '大庆', '伊春', '佳木斯', '七台河', '牡丹江',
    '徐州', '常州', '南通', '连云港', '淮安', '盐城', '扬州', '镇江', '泰州', '宿迁',
    '温州', '嘉兴', '湖州', '绍兴', '金华', '衢州', '舟山', '台州', '丽水',
    '芜湖', '蚌埠', '淮南', '马鞍山', '淮北', '铜陵', '安庆', '黄山', '滁州', '阜阳', '宿州', '六安', '亳州', '池州', '宣城',
    '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德',
    '景德镇', '萍乡', '九江', '新余', '鹰潭', '赣州', '吉安', '宜春', '抚州', '上饶',
    '淄博', '枣庄', '东营', '烟台', '潍坊', '济宁', '泰安', '威海', '日照', '临沂', '德州', '聊城', '滨州', '菏泽',
    '开封', '洛阳', '平顶山', '安阳', '鹤壁', '新乡', '焦作', '濮阳', '许昌', '漯河', '三门峡', '南阳', '商丘', '信阳', '周口', '驻马店', '济源',
    '黄石', '十堰', '宜昌', '襄阳', '鄂州', '荆门', '孝感', '荆州', '黄冈', '咸宁', '随州', '恩施', '仙桃', '潜江', '天门', '神农架',
    '株洲', '湘潭', '衡阳', '邵阳', '岳阳', '常德', '张家界', '益阳', '郴州', '永州', '怀化', '娄底', '湘西',
    '韶关', '珠海', '汕头', '佛山', '江门', '湛江', '茂名', '肇庆', '惠州', '梅州', '汕尾', '河源', '阳江', '清远', '东莞', '中山', '潮州', '揭阳', '云浮',
    '柳州', '桂林', '梧州', '北海', '防城港', '钦州', '贵港', '玉林', '百色', '贺州', '河池', '来宾', '崇左',
    '三亚', '三沙', '儋州', '五指山', '琼海', '文昌', '万宁', '东方',
    '自贡', '攀枝花', '泸州', '德阳', '绵阳', '广元', '遂宁', '内江', '乐山', '南充', '眉山', '宜宾', '广安', '达州', '雅安', '巴中', '资阳', '阿坝', '甘孜', '凉山',
    '六盘水', '遵义', '安顺', '毕节', '铜仁', '黔西南', '黔东南', '黔南',
    '曲靖', '玉溪', '保山', '昭通', '丽江', '普洱', '临沧', '楚雄', '红河', '文山', '西双版纳', '大理', '德宏', '怒江', '迪庆',
    '昌都', '山南', '日喀则', '那曲', '阿里', '林芝',
    '铜川', '宝鸡', '咸阳', '渭南', '延安', '汉中', '榆林', '安康', '商洛',
    '嘉峪关', '金昌', '白银', '天水', '武威', '张掖', '平凉', '酒泉', '庆阳', '定西', '陇南', '临夏', '甘南',
    '海东', '海北', '黄南', '海南', '果洛', '玉树', '海西',
    '石嘴山', '吴忠', '固原', '中卫',
    '克拉玛依', '吐鲁番', '哈密', '昌吉', '博尔塔拉', '巴音郭楞', '阿克苏', '克孜勒苏', '喀什', '和田', '伊犁', '塔城', '阿勒泰', '石河子', '阿拉尔', '图木舒克', '五家渠', '北屯', '铁门关', '双河', '可克达拉', '昆玉', '胡杨河'
  ];
  
  // 去重
  return Array.from(new Set(cities));
};

// 按字母分类国内城市
const getDomesticCitiesByLetter = () => {
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

// 热门城市数据
const hotCitiesData = {
  // 国内热门城市
  domesticHot: [
    '北京', '上海', '广州', '深圳', '成都', '杭州', '南京', '武汉', '西安', '重庆',
    '天津', '苏州', '青岛', '长沙', '大连', '厦门', '无锡', '福州', '济南', '宁波',
    '郑州', '合肥', '石家庄', '哈尔滨', '长春', '沈阳', '昆明', '南宁', '南昌', '太原'
  ],
  // 国内所有城市（按字母分类）
  domesticByLetter: getDomesticCitiesByLetter(),
  // 国际及中国港澳台热门城市
  internationalHot: [
    '东京', '大阪', '首尔', '曼谷', '新加坡', '札幌', '吉隆坡', '济州岛', '迪拜',
    '伦敦', '悉尼', '洛杉矶', '巴黎', '墨尔本', '纽约', '伊斯坦布尔', '莫斯科', '普吉岛',
    '巴厘岛', '奥克兰', '香港', '台北', '澳门'
  ],
  // 亚洲
  asia: [
    '东京', '大阪', '首尔', '曼谷', '新加坡', '吉隆坡', '迪拜', '伊斯坦布尔', '普吉岛',
    '巴厘岛', '济州岛', '札幌', '名古屋', '福冈', '釜山', '清迈', '河内', '胡志明市',
    '马尼拉', '雅加达', '新德里', '孟买', '班加罗尔', '科伦坡', '加德满都', '达卡'
  ],
  // 欧洲
  europe: [
    '伦敦', '巴黎', '莫斯科', '罗马', '柏林', '马德里', '阿姆斯特丹', '维也纳', '苏黎世',
    '布鲁塞尔', '哥本哈根', '斯德哥尔摩', '奥斯陆', '赫尔辛基', '都柏林', '里斯本', '雅典',
    '布达佩斯', '华沙', '布拉格', '巴塞罗那', '米兰', '慕尼黑', '法兰克福', '爱丁堡'
  ],
  // 美洲
  americas: [
    '纽约', '洛杉矶', '旧金山', '芝加哥', '波士顿', '华盛顿', '多伦多', '温哥华', '墨西哥城',
    '里约热内卢', '圣保罗', '布宜诺斯艾利斯', '利马', '圣地亚哥', '波哥大', '哈瓦那',
    '迈阿密', '拉斯维加斯', '西雅图', '休斯顿', '达拉斯', '费城', '亚特兰大', '丹佛'
  ],
  // 非洲
  africa: [
    '开罗', '开普敦', '约翰内斯堡', '内罗毕', '拉各斯', '卡萨布兰卡', '突尼斯', '达累斯萨拉姆',
    '阿克拉', '亚的斯亚贝巴', '达喀尔', '阿尔及尔', '拉巴特', '阿比让', '金沙萨', '卢萨卡'
  ],
  // 大洋洲
  oceania: [
    '悉尼', '墨尔本', '奥克兰', '布里斯班', '珀斯', '阿德莱德', '黄金海岸', '堪培拉',
    '惠灵顿', '基督城', '皇后镇', '凯恩斯', '达尔文', '霍巴特', '塔斯马尼亚', '斐济'
  ]
};

// 样式化组件
const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    minHeight: 56,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    fontSize: 16,
    fontFamily: 'Inter, Roboto, Helvetica, Arial, sans-serif',
    lineHeight: 1.5,
    letterSpacing: '0.00938em',
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: '#d1d5db',
      borderWidth: '1px',
      borderRadius: 8,
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: '#3b82f6',
      borderWidth: '2px',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#2563eb',
      borderWidth: '2px',
      boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)',
    },
    '&.Mui-error .MuiOutlinedInput-notchedOutline': {
      borderColor: '#dc2626',
      borderWidth: '2px',
    },
  },
  '& .MuiInputLabel-root': {
    fontSize: 16,
    fontWeight: 500,
    color: '#6b7280',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#2563eb',
  },
}));

// 高风险提示动画
const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
`;

const DropdownPaper = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  zIndex: 1300,
  minWidth: 300,
  maxWidth: 'calc(100vw - 40px)',
  maxHeight: 'calc(100vh - 100px)', // 限制最大高度，留出边距
  overflowX: 'hidden',
  overflowY: 'auto', // 添加垂直滚动
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  // 自定义滚动条样式
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
    borderRadius: '3px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#c1c1c1',
    borderRadius: '3px',
    '&:hover': {
      background: '#a8a8a8',
    },
  },
}));

const RegionSelector = ({
  label = '选择地区',
  value = '',
  onChange = () => {},
  placeholder = '搜索城市、机场或火车站',
  error = false,
  helperText = '',
  required = false,
  disabled = false,
  transportationType = null // 新增：交通工具类型，用于过滤数据
}) => {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language || 'zh';
  const isChinese = currentLanguage.toLowerCase().startsWith('zh');
  
  // 获取显示名称的辅助函数
  const getDisplayName = useCallback((location) => {
    if (!location) return '';
    const displayName = isChinese 
      ? (location.name || '') 
      : (location.enName || location.name || '');
    // 确保返回的是字符串，避免返回 undefined 或 null
    return String(displayName || '');
  }, [isChinese]);
  const [searchValue, setSearchValue] = useState('');
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  // 状态标记：区分"用户正在输入"和"已选择位置"
  const [isUserTyping, setIsUserTyping] = useState(false);
  // 热门城市相关状态
  const [showHotCities, setShowHotCities] = useState(false);
  const [hotCityCategory, setHotCityCategory] = useState('international'); // 'domestic' 或 'international'
  const [hotCitySubCategory, setHotCitySubCategory] = useState('internationalHot'); // 国际子分类
  const [domesticSubCategory, setDomesticSubCategory] = useState('hot'); // 国内子分类：'hot' 或字母组
  
  // 自动补全相关状态
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isComposing, setIsComposing] = useState(false); // 中文输入法组合状态
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const suggestionsRef = useRef(null);
  
  // 请求取消控制器
  const abortControllerRef = useRef(null);
  const autocompleteAbortControllerRef = useRef(null);
  const autocompleteTimeoutRef = useRef(null);
  
  // 搜索结果缓存（Map<keyword, {data, timestamp}>）
  const searchCacheRef = useRef(new Map());
  const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存时间
  const MAX_CACHE_SIZE = 100; // 最大缓存数量
  
  // 防重复搜索：记录上次搜索的关键词
  const lastSearchKeywordRef = useRef('');

  // 初始化显示值
  useEffect(() => {
    if (value) {
      // 如果value是字符串，直接显示
      if (typeof value === 'string') {
        setSearchValue(value);
        setSelectedLocation(null); // 稍后通过搜索匹配
        setIsUserTyping(false); // 初始化时不是用户输入
      } 
      // 如果value是对象
      else if (typeof value === 'object' && value !== null) {
        setSelectedLocation(value);
        // 根据语言选择显示名称
        const displayName = getDisplayName(value);
        // 汽车站不显示编码，城市类型显示国家代码，其他类型显示编码
        let codeToShow = '';
        if (value.type === 'city' && value.countryCode) {
          codeToShow = value.countryCode;
        } else if (value.type !== 'bus' && value.code) {
          codeToShow = value.code;
        }
        const displayValue = codeToShow ? `${displayName} (${codeToShow})` : displayName;
        setSearchValue(displayValue);
        setIsUserTyping(false); // 初始化时不是用户输入
      }
    } else {
      setSearchValue('');
      setSelectedLocation(null);
      setIsUserTyping(false);
    }
  }, [value, getDisplayName]);

  // 监听语言变化，更新已选择位置的显示
  useEffect(() => {
    if (selectedLocation) {
      const displayName = getDisplayName(selectedLocation);
      // 汽车站不显示编码，城市类型显示国家代码，其他类型显示编码
      let codeToShow = '';
      if (selectedLocation.type === 'city' && selectedLocation.countryCode) {
        codeToShow = selectedLocation.countryCode;
      } else if (selectedLocation.type !== 'bus' && selectedLocation.code) {
        codeToShow = selectedLocation.code;
      }
      const displayValue = codeToShow ? `${displayName} (${codeToShow})` : displayName;
      setSearchValue(displayValue);
      setIsUserTyping(false); // 语言变化更新显示时不是用户输入
    }
  }, [currentLanguage, selectedLocation, getDisplayName]);

  // 根据交通工具类型生成动态placeholder
  const getDynamicPlaceholder = () => {
    if (!transportationType) {
      return placeholder;
    }
    
    switch (transportationType) {
      case 'flight':
        return '搜索机场或城市';
      case 'train':
        return '搜索火车站或城市';
      case 'car':
      case 'bus':
        return '搜索城市';
      default:
        return placeholder;
    }
  };

  /**
   * 检查搜索关键词是否满足最小长度要求
   * 中文至少2个字符，英文/拼音至少3个字符，代码至少2个字符
   */
  const isValidSearchLength = useCallback((keyword) => {
    if (!keyword || !keyword.trim()) {
      return false;
    }
    
    const trimmed = keyword.trim();
    
    // 检查是否是代码（通常是2-4个大写字母或数字）
    if (/^[A-Z0-9]{2,4}$/i.test(trimmed)) {
      return trimmed.length >= 2;
    }
    
    // 检查是否包含中文字符
    const hasChinese = /[\u4e00-\u9fa5]/.test(trimmed);
    if (hasChinese) {
      // 中文至少2个字符
      return trimmed.length >= 2;
    }
    
    // 英文/拼音至少3个字符
    return trimmed.length >= 3;
  }, []);

  /**
   * 检查是否满足自动补全的最小长度要求（比搜索要求更宽松）
   * 中文至少1个字符，英文/拼音至少2个字符，代码至少1个字符
   */
  const isValidAutocompleteLength = useCallback((keyword) => {
    if (!keyword || !keyword.trim()) {
      return false;
    }
    
    const trimmed = keyword.trim();
    
    // 检查是否是代码
    if (/^[A-Z0-9]{1,4}$/i.test(trimmed)) {
      return trimmed.length >= 1;
    }
    
    // 检查是否包含中文字符
    const hasChinese = /[\u4e00-\u9fa5]/.test(trimmed);
    if (hasChinese) {
      // 中文至少1个字符
      return trimmed.length >= 1;
    }
    
    // 英文/拼音至少2个字符
    return trimmed.length >= 2;
  }, []);

  /**
   * 转换位置数据为标准格式（提取重复代码）
   */
  const transformLocationData = useCallback((location) => {
    if (!location || typeof location !== 'object' || !location.name) {
      return null;
    }
    
    // 处理 parentId：后端可能返回完整的 parentId 对象（包含城市信息）
    let parentId = null;
    let parentCity = null;
    let parentIdObj = null;
    
    if (location.parentId) {
      if (typeof location.parentId === 'object') {
        // parentId 是对象，包含完整的城市信息
        parentId = location.parentId._id || location.parentId.id || null;
        parentCity = location.parentId.name || null;
        parentIdObj = location.parentId; // 保留完整对象，用于后续提取城市信息
      } else {
        // parentId 是字符串或 ObjectId
        parentId = location.parentId.toString();
        parentIdObj = { _id: parentId };
      }
    }
    
    return {
      id: location._id || location.id,
      _id: location._id || location.id,
      name: location.name,
      code: location.code || '',
      type: location.type || 'city',
      city: location.city || '',
      province: location.province || '',
      district: location.district || '',
      county: location.county || '',
      country: location.country || '中国',
      countryCode: location.countryCode || '',
      enName: location.enName || '',
      pinyin: location.pinyin || '',
      coordinates: location.coordinates || { latitude: 0, longitude: 0 },
      timezone: location.timezone || 'Asia/Shanghai',
      status: location.status || 'active',
      parentId: parentId,
      parentCity: parentCity,
      parentIdObj: parentIdObj, // 新增：保留完整的 parentId 对象，用于提取城市信息
      riskLevel: location.riskLevel || 'low',
      noAirport: location.noAirport || false
    };
  }, []);

  /**
   * 清理过期的缓存
   */
  const cleanExpiredCache = useCallback(() => {
    const now = Date.now();
    const cache = searchCacheRef.current;
    
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        cache.delete(key);
      }
    }
    
    // 如果缓存数量超过最大值，删除最旧的
    if (cache.size > MAX_CACHE_SIZE) {
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, cache.size - MAX_CACHE_SIZE);
      toDelete.forEach(([key]) => cache.delete(key));
    }
  }, []);

  /**
   * 获取缓存键（包含关键词和交通工具类型）
   */
  const getCacheKey = useCallback((keyword, transportationType) => {
    return `${keyword.trim().toLowerCase()}_${transportationType || 'all'}`;
  }, []);

  /**
   * 检查是否是取消错误
   */
  const isCancelError = useCallback((error) => {
    if (!error) return false;
    return error.name === 'CanceledError' || 
           error.name === 'AbortError' || 
           error.code === 'ERR_CANCELED' ||
           (error.message && error.message.includes('canceled'));
  }, []);

  /**
   * 从缓存获取搜索结果（返回深拷贝，避免状态污染）
   */
  const getCachedResult = useCallback((keyword, transportationType) => {
    cleanExpiredCache();
    const cacheKey = getCacheKey(keyword, transportationType);
    const cached = searchCacheRef.current.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      // 返回深拷贝，避免状态污染
      try {
        return JSON.parse(JSON.stringify(cached.data));
      } catch (error) {
        console.error('[RegionSelector] 缓存数据深拷贝失败:', error);
        // 如果深拷贝失败，返回原数据（虽然不理想，但至少不会崩溃）
        return cached.data;
      }
    }
    
    return null;
  }, [cleanExpiredCache, getCacheKey]);

  /**
   * 保存搜索结果到缓存
   */
  const setCachedResult = useCallback((keyword, transportationType, data) => {
    cleanExpiredCache();
    const cacheKey = getCacheKey(keyword, transportationType);
    searchCacheRef.current.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    });
  }, [cleanExpiredCache, getCacheKey]);

  /**
   * 获取自动补全建议（轻量级搜索，只返回少量结果）
   */
  const fetchAutocompleteSuggestions = useCallback(async (keyword) => {
    if (!keyword || !keyword.trim()) {
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
      return;
    }

    const trimmedKeyword = keyword.trim();
    
    // 检查是否满足自动补全的最小长度要求
    if (!isValidAutocompleteLength(trimmedKeyword)) {
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
      return;
    }

    // 取消之前的请求
    if (autocompleteAbortControllerRef.current) {
      autocompleteAbortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    autocompleteAbortControllerRef.current = abortController;

    try {
      const params = {
        status: 'active',
        search: trimmedKeyword,
        page: 1,
        limit: 8 // 自动补全只返回8条建议
      };

      // 根据交通工具类型添加过滤
      if (transportationType) {
        switch (transportationType) {
          case 'flight':
            // 不限制type，返回机场和城市
            break;
          case 'train':
            // 不限制type，返回火车站和城市
            break;
          case 'car':
          case 'bus':
            params.type = 'city';
            break;
        }
      }

      const response = await apiClient.get('/locations', {
        params,
        signal: abortController.signal
      });

      if (abortController.signal.aborted) {
        return;
      }

      if (response.data && response.data.success) {
        const locations = response.data.data || [];
        const suggestions = locations
          .map(transformLocationData)
          .filter(location => location !== null)
          .slice(0, 8); // 限制最多8条

        // 只有在请求未被取消时才更新状态
        if (!abortController.signal.aborted) {
          setAutocompleteSuggestions(suggestions);
          setShowAutocomplete(suggestions.length > 0);
          setSelectedSuggestionIndex(-1);
        }
      } else {
        if (!abortController.signal.aborted) {
          setAutocompleteSuggestions([]);
          setShowAutocomplete(false);
        }
      }
    } catch (error) {
      if (isCancelError(error) || abortController.signal.aborted) {
        return;
      }
      // 自动补全失败不影响主搜索，静默处理
      console.warn('[RegionSelector] 获取自动补全建议失败:', error);
      if (!abortController.signal.aborted) {
        setAutocompleteSuggestions([]);
        setShowAutocomplete(false);
      }
    }
  }, [transportationType, transformLocationData, isValidAutocompleteLength, isCancelError]);

  // 从后端API搜索地理位置数据（按需搜索，提升性能）
  const searchLocationsFromAPI = useCallback(async (keyword) => {
    // 防重复搜索：如果关键词与上次相同，跳过
    const trimmedKeyword = keyword?.trim() || '';
    if (trimmedKeyword === lastSearchKeywordRef.current) {
      console.log('[RegionSelector] 搜索关键词与上次相同，跳过搜索:', trimmedKeyword);
      return;
    }
    
    console.log('[RegionSelector] ========== 开始搜索 ==========');
    console.log('[RegionSelector] 搜索关键词:', trimmedKeyword);
    console.log('[RegionSelector] 交通工具类型:', transportationType);
    
    // 更新上次搜索关键词
    lastSearchKeywordRef.current = trimmedKeyword;
    
    if (!keyword || keyword.trim().length < 1) {
      console.log('[RegionSelector] 关键词为空，清空结果');
      setFilteredLocations([]);
      return;
    }

    // 检查最小搜索长度
    if (!isValidSearchLength(keyword)) {
      console.log('[RegionSelector] 搜索长度不符合要求:', keyword.length);
      setFilteredLocations([]);
      setLoading(false);
      return;
    }
    console.log('[RegionSelector] 搜索长度验证通过');

    // 检查缓存
    const cachedResult = getCachedResult(keyword, transportationType);
    if (cachedResult) {
      console.log('[RegionSelector] 使用缓存结果，数量:', cachedResult.length);
      setFilteredLocations(cachedResult);
      setLoading(false);
      return;
    }
    console.log('[RegionSelector] 缓存未命中，发送API请求');

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的 AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setErrorMessage('');
    
    try {
      // 优化：根据交通工具类型智能决定是否使用 includeChildren
      // 构建查询参数
      const params = {
        status: 'active',
        search: keyword.trim(),
        page: 1,
        limit: 50, // 限制返回50条结果
      };
      
      console.log('[RegionSelector] 初始查询参数:', params);

      // 根据交通工具类型添加过滤和优化 includeChildren
      if (transportationType) {
        switch (transportationType) {
          case 'flight':
            // 对于飞机，搜索机场和城市
            // 使用 includeChildren 获取城市的机场，但限制每个城市最多5个机场
            params.includeChildren = 'true';
            params.maxChildrenPerCity = 5; // 每个城市最多5个机场
            break;
          case 'train':
            // 对于火车，搜索火车站和城市
            // 使用 includeChildren 获取城市的火车站，但限制每个城市最多5个火车站
            params.includeChildren = 'true';
            params.maxChildrenPerCity = 5; // 每个城市最多5个火车站
            break;
          case 'car':
          case 'bus':
            // 对于汽车/公交，只搜索城市，不需要子项
            params.type = 'city';
            // 不使用 includeChildren，减少数据传输
            break;
          default:
            // 默认情况：不使用 includeChildren，避免返回过多数据
            break;
        }
      } else {
        // 没有指定交通工具类型时，不使用 includeChildren
        // 避免返回过多不必要的数据
      }

      console.log('[RegionSelector] 发送API请求，参数:', params);
      console.log('[RegionSelector] API URL: /locations');
      
      const response = await apiClient.get('/locations', { 
        params,
        signal: abortController.signal
      });
      
      console.log('[RegionSelector] API响应状态:', response.status);
      console.log('[RegionSelector] API响应数据:', response.data);
      
      // 检查请求是否被取消
      if (abortController.signal.aborted) {
        console.log('[RegionSelector] 请求已被取消');
        return;
      }
      
      if (!response.data || !response.data.success) {
        console.error('[RegionSelector] API返回失败:', response.data);
        throw new Error(response.data?.message || '搜索地理位置数据失败');
      }
      
      const locations = response.data.data || [];
      console.log('[RegionSelector] 收到结果数量:', locations.length);
      console.log('[RegionSelector] 前3个结果:', locations.slice(0, 3));
      
      // 验证并转换数据结构（使用提取的函数）
      const validLocations = locations
        .map(transformLocationData)
        .filter(location => location !== null);

      // 优化：由于使用了 includeChildren 参数，子项已经包含在结果中
      // 后端已经通过 parentId 字段包含了城市信息，不需要额外的API调用
      
      // 从机场/火车站的 parentId 中提取城市信息，确保城市也在结果中
      if (transportationType === 'flight' || transportationType === 'train') {
        const cityMap = new Map(); // 用于存储已提取的城市，避免重复
        
        // 先收集所有城市（直接匹配的城市）
        validLocations.forEach(loc => {
          if (loc.type === 'city' && loc._id) {
            cityMap.set(loc._id.toString(), loc);
          }
        });
        
        // 从机场/火车站的 parentId 中提取城市信息
        validLocations.forEach(loc => {
          if ((loc.type === 'airport' || loc.type === 'station') && loc.parentId) {
            const parentIdStr = loc.parentId.toString();
            
            // 如果该城市不在结果中，且 parentIdObj 中有城市信息，则添加城市
            if (parentIdStr && !cityMap.has(parentIdStr) && loc.parentIdObj) {
              const parentCity = loc.parentIdObj;
              
              // 从 parentIdObj 中提取城市信息（后端已经填充了完整的城市信息）
              if (parentCity.name) {
                const cityInfo = {
                  id: parentIdStr,
                  _id: parentIdStr,
                  name: parentCity.name,
                  code: parentCity.code || '',
                  type: 'city',
                  city: parentCity.city || parentCity.name,
                  province: parentCity.province || '',
                  district: '',
                  county: '',
                  country: loc.country || '中国',
                  countryCode: loc.countryCode || '',
                  enName: parentCity.enName || '',
                  pinyin: '',
                  coordinates: { latitude: 0, longitude: 0 },
                  timezone: 'Asia/Shanghai',
                  status: 'active',
                  parentId: null,
                  parentCity: null,
                  parentIdObj: null,
                  riskLevel: 'low',
                  noAirport: false
                };
                cityMap.set(parentIdStr, cityInfo);
                validLocations.push(cityInfo);
              }
            }
          }
        });
      }
      
      // 去重（基于 _id），因为 includeChildren 可能导致重复
      const uniqueLocations = Array.from(
        new Map(validLocations.map(loc => [loc._id || loc.id, loc])).values()
      );

      // 优化：由于使用了 includeChildren，子项已经包含在 uniqueLocations 中
      // 根据交通工具类型过滤
      let filteredResults = uniqueLocations;
      if (transportationType) {
        filteredResults = uniqueLocations.filter(location => {
          switch (transportationType) {
            case 'flight':
              return location.type === 'airport' || location.type === 'city';
            case 'train':
              return location.type === 'station' || location.type === 'city';
            case 'car':
            case 'bus':
              return location.type === 'city';
            default:
              return true;
          }
        });
      }

      // 最终去重（虽然已经去重过，但为了确保）
      const uniqueResults = Array.from(
        new Map(filteredResults.map(item => [item._id || item.id, item])).values()
      );
      
      // 检查请求是否被取消
      if (abortController.signal.aborted) {
        return;
      }
      
      // 保存到缓存
      setCachedResult(keyword, transportationType, uniqueResults);
      
      console.log('[RegionSelector] 最终返回结果数量:', uniqueResults.length);
      console.log('[RegionSelector] 最终前3个结果:', uniqueResults.slice(0, 3).map(loc => ({
        name: loc.name,
        pinyin: loc.pinyin,
        enName: loc.enName,
        code: loc.code,
        type: loc.type
      })));
      
      setFilteredLocations(uniqueResults);
      console.log('[RegionSelector] ========== 搜索完成 ==========');
    } catch (error) {
      // 如果是取消请求，不显示错误
      if (isCancelError(error) || abortController.signal.aborted) {
        console.log('[RegionSelector] 请求被取消，不显示错误');
        return;
      }
      
      const errorMessage = error.response?.data?.message || error.message || '搜索地理位置数据失败';
      console.error('[RegionSelector] 搜索失败:', {
        error: errorMessage,
        response: error.response?.data,
        status: error.response?.status
      });
      setErrorMessage(errorMessage);
      setFilteredLocations([]);
    } finally {
      // 只有在请求未被取消时才更新loading状态
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [transportationType, transformLocationData, isValidSearchLength, getCachedResult, setCachedResult, isCancelError]);


  // 当value变化时，如果需要查找对应的位置数据
  useEffect(() => {
    if (value && typeof value === 'string' && value.trim()) {
      // 如果value是字符串，尝试搜索匹配的位置
      // 标记为用户输入状态，允许搜索
      setIsUserTyping(true);
      const timeoutId = setTimeout(() => {
        searchLocationsFromAPI(value);
      }, 300);
      return () => {
        clearTimeout(timeoutId);
        // 取消请求
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      };
    }
  }, [value, searchLocationsFromAPI]);

  // 监听窗口滚动和大小变化，更新下拉框位置
  useEffect(() => {
    if (!showDropdown) return;

    const handleScroll = () => {
      // 触发重新渲染以更新位置
      setShowDropdown(prev => prev);
    };

    const handleResize = () => {
      // 触发重新渲染以更新位置
      setShowDropdown(prev => prev);
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [showDropdown]);

  // 搜索逻辑 - 使用后端搜索（按需加载，提升性能）
  useEffect(() => {
    if (!searchValue.trim()) {
      setFilteredLocations([]);
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
      // 如果输入框有焦点，显示热门城市
      if (document.activeElement === inputRef.current) {
        setShowHotCities(true);
        setShowDropdown(true);
      } else {
        setShowHotCities(false);
        setShowDropdown(false);
      }
      // 清空上次搜索关键词
      lastSearchKeywordRef.current = '';
      return;
    }

    // 如果已选择位置且不是用户正在输入，跳过搜索（避免已选择位置时重复搜索）
    if (selectedLocation && !isUserTyping) {
      console.log('[RegionSelector] 已选择位置且非用户输入，跳过搜索');
      return;
    }

    // 检查最小搜索长度
    if (!isValidSearchLength(searchValue)) {
      setFilteredLocations([]);
      setShowHotCities(false);
      setShowDropdown(true);
      // 如果满足自动补全条件，只显示自动补全建议
      if (isValidAutocompleteLength(searchValue)) {
        // 自动补全建议已经在 handleInputChange 中获取
        return;
      }
      return;
    }

    // 有搜索内容时，隐藏热门城市和自动补全，显示搜索结果
    setShowHotCities(false);
    setShowAutocomplete(false);

    // 防抖处理，避免频繁请求
    const timeoutId = setTimeout(() => {
      searchLocationsFromAPI(searchValue);
    }, 300); // 300ms防抖，给用户输入时间

    return () => {
      clearTimeout(timeoutId);
      // 组件卸载时取消请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchValue, searchLocationsFromAPI, isValidSearchLength, isValidAutocompleteLength, selectedLocation, isUserTyping]);

  // 组件卸载时的清理
  useEffect(() => {
    return () => {
      // 取消进行中的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (autocompleteAbortControllerRef.current) {
        autocompleteAbortControllerRef.current.abort();
      }
      // 清除防抖定时器
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }
    };
  }, []);

  // 处理输入框点击
  const handleInputClick = () => {
    if (disabled) return;
    setShowDropdown(true);
  };

  // 处理输入框焦点
  const handleInputFocus = () => {
    if (disabled) return;
    setShowDropdown(true);
    // 如果没有搜索内容，显示热门城市
    if (!searchValue.trim()) {
      setShowHotCities(true);
    }
  };

  // 处理输入框失焦
  const handleInputBlur = (event) => {
    // 延迟隐藏下拉框，以便点击选项
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setShowDropdown(false);
        setShowHotCities(false);
      }
    }, 150);
  };

  // 处理选择
  const handleSelect = (location) => {
    // 根据语言选择显示名称
    const displayName = getDisplayName(location);
    // 汽车站不显示编码，城市类型显示国家代码，其他类型显示编码
    let codeToShow = '';
    if (location.type === 'city' && location.countryCode) {
      codeToShow = location.countryCode;
    } else if (location.type !== 'bus' && location.code) {
      codeToShow = location.code;
    }
    const displayValue = codeToShow ? `${displayName} (${codeToShow})` : displayName;
    setSearchValue(displayValue);
    setSelectedLocation(location);
    setIsUserTyping(false); // 选择位置后，标记为非用户输入状态
    setShowDropdown(false);
    // 清空上次搜索关键词，允许下次搜索
    lastSearchKeywordRef.current = '';
    
    // 调用onChange回调，传递完整的location对象
    onChange(location);
  };

  // 处理清除
  const handleClear = () => {
    setSearchValue('');
    setSelectedLocation(null);
    setIsUserTyping(false); // 清除时标记为非用户输入状态
    // 清空上次搜索关键词
    lastSearchKeywordRef.current = '';
    onChange(null);
  };

  // 处理输入变化
  const handleInputChange = useCallback((event) => {
    const value = event.target.value;
    setSearchValue(value);
    setIsUserTyping(true); // 用户输入时，标记为用户输入状态
    setSelectedLocation(null); // 用户输入时，清空已选择的位置
    
    if (value.trim()) {
      setShowDropdown(true);
      setShowHotCities(false); // 有输入时隐藏热门城市
      
      // 如果满足自动补全条件，获取建议（使用防抖）
      if (isValidAutocompleteLength(value)) {
        // 清除之前的防抖定时器
        if (autocompleteTimeoutRef.current) {
          clearTimeout(autocompleteTimeoutRef.current);
        }
        
        // 设置防抖，200ms后获取建议
        autocompleteTimeoutRef.current = setTimeout(() => {
          fetchAutocompleteSuggestions(value);
        }, 200);
      } else {
        // 不满足自动补全条件，清除建议
        if (autocompleteTimeoutRef.current) {
          clearTimeout(autocompleteTimeoutRef.current);
          autocompleteTimeoutRef.current = null;
        }
        setAutocompleteSuggestions([]);
        setShowAutocomplete(false);
      }
    } else {
      // 清空输入，清除所有状态
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
        autocompleteTimeoutRef.current = null;
      }
      // 清空上次搜索关键词
      lastSearchKeywordRef.current = '';
      setShowDropdown(false);
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
      // 如果输入框有焦点，显示热门城市
      if (document.activeElement === inputRef.current) {
        setShowHotCities(true);
        setShowDropdown(true);
      }
    }
  }, [isValidAutocompleteLength, fetchAutocompleteSuggestions]);

  // 处理键盘事件（用于自动补全导航）
  const handleKeyDown = (event) => {
    // 如果正在使用中文输入法，不处理导航键
    if (isComposing) {
      return;
    }

    // 如果显示自动补全建议
    if (showAutocomplete && autocompleteSuggestions.length > 0) {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedSuggestionIndex(prev => {
            const nextIndex = prev < autocompleteSuggestions.length - 1 ? prev + 1 : prev;
            // 滚动到选中的建议
            if (suggestionsRef.current && nextIndex >= 0) {
              const suggestionElement = suggestionsRef.current.children[nextIndex];
              if (suggestionElement) {
                suggestionElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
              }
            }
            return nextIndex;
          });
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedSuggestionIndex(prev => {
            const nextIndex = prev > 0 ? prev - 1 : -1;
            // 滚动到选中的建议
            if (suggestionsRef.current && nextIndex >= 0) {
              const suggestionElement = suggestionsRef.current.children[nextIndex];
              if (suggestionElement) {
                suggestionElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
              }
            }
            return nextIndex;
          });
          break;
        case 'Enter':
          if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < autocompleteSuggestions.length) {
            event.preventDefault();
            const selectedSuggestion = autocompleteSuggestions[selectedSuggestionIndex];
            handleSelectSuggestion(selectedSuggestion);
          }
          break;
        case 'Escape':
          event.preventDefault();
          setShowAutocomplete(false);
          setSelectedSuggestionIndex(-1);
          break;
        default:
          break;
      }
    }
  };

  // 处理中文输入法组合开始
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  // 处理中文输入法组合结束
  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  // 选择自动补全建议
  const handleSelectSuggestion = useCallback((suggestion) => {
    const displayName = getDisplayName(suggestion);
    const displayValue = suggestion.type === 'bus'
      ? displayName
      : `${displayName}${suggestion.code ? ` (${suggestion.code})` : ''}`;
    
    // 清除防抖定时器
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
      autocompleteTimeoutRef.current = null;
    }
    
    setSearchValue(displayValue);
    setSelectedLocation(suggestion);
    setIsUserTyping(false); // 选择建议后，标记为非用户输入状态
    setShowAutocomplete(false);
    setAutocompleteSuggestions([]);
    setSelectedSuggestionIndex(-1);
    // 清空上次搜索关键词，允许下次搜索
    lastSearchKeywordRef.current = '';
    
    // 调用onChange回调
    onChange(suggestion);
    
    // 触发完整搜索以获取更多结果
    if (isValidSearchLength(displayName)) {
      searchLocationsFromAPI(displayName);
    }
  }, [getDisplayName, isValidSearchLength, searchLocationsFromAPI, onChange]);

  // 获取类型图标
  const getTypeIcon = (type) => {
    switch (type) {
      case 'airport':
        return <FlightIcon sx={{ fontSize: 20 }} />;
      case 'station':
        return <TrainIcon sx={{ fontSize: 20 }} />;
      case 'city':
        return <LocationCityIcon sx={{ fontSize: 20 }} />;
      default:
        return <LocationOnIcon sx={{ fontSize: 20 }} />;
    }
  };

  // 获取类型颜色
  const getTypeColor = (type) => {
    switch (type) {
      case 'airport':
        return 'primary';
      case 'station':
        return 'secondary';
      case 'city':
        return 'success';
      default:
        return 'default';
    }
  };

  // 获取类型标签
  const getTypeLabel = (type) => {
    switch (type) {
      case 'airport':
        return '机场';
      case 'station':
        return '火车站';
      case 'city':
        return '城市';
      default:
        return '地区';
    }
  };

  // 获取风险等级标签
  const getRiskLevelLabel = (level) => {
    const labels = { 
      low: '低', 
      medium: '中', 
      high: '高', 
      very_high: '很高' 
    };
    return labels[level] || level;
  };

  // 获取风险等级颜色
  const getRiskLevelColor = (level) => {
    const colors = { 
      low: 'success', 
      medium: 'warning', 
      high: 'error', 
      very_high: 'error' 
    };
    return colors[level] || 'default';
  };

  // 获取热门城市列表
  const getHotCitiesList = () => {
    if (hotCityCategory === 'domestic') {
      if (domesticSubCategory === 'hot') {
        return hotCitiesData.domesticHot;
      } else {
        // 按字母筛选
        return hotCitiesData.domesticByLetter[domesticSubCategory] || [];
      }
    } else {
      return hotCitiesData[hotCitySubCategory] || hotCitiesData.internationalHot;
    }
  };

  // 处理热门城市选择
  const handleHotCitySelect = async (cityName) => {
    // 设置搜索值
    setSearchValue(cityName);
    setShowHotCities(false);
    
    // 搜索该城市
    try {
      await searchLocationsFromAPI(cityName);
      // 如果搜索到结果，自动选择第一个匹配的城市
      // 注意：这里不自动选择，让用户从搜索结果中选择
    } catch (error) {
      console.error('搜索热门城市失败:', error);
    }
  };

  // 渲染热门城市内容
  const renderHotCities = () => {
    const cities = getHotCitiesList();
    
    return (
      <Box sx={{ width: '100%', maxWidth: 800 }}>
        <Box sx={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
          {/* 左侧分类 */}
          <Box sx={{ 
            width: 120, 
            borderRight: '1px solid #e5e7eb',
            bgcolor: '#f9fafb'
          }}>
            <Button
              fullWidth
              onClick={() => {
                setHotCityCategory('domestic');
                setDomesticSubCategory('hot'); // 切换到国内时，默认显示热门
              }}
              disableRipple
              sx={{
                justifyContent: 'center',
                px: 2,
                py: 1.5,
                textTransform: 'none',
                color: hotCityCategory === 'domestic' ? '#2563eb' : '#6b7280',
                bgcolor: hotCityCategory === 'domestic' ? '#eff6ff' : 'transparent',
                fontWeight: hotCityCategory === 'domestic' ? 600 : 400,
                border: 'none !important',
                outline: 'none !important',
                boxShadow: 'none !important',
                textAlign: 'center',
                '&:hover': {
                  bgcolor: hotCityCategory === 'domestic' ? '#dbeafe' : '#f3f4f6',
                  border: 'none !important',
                  outline: 'none !important',
                  boxShadow: 'none !important'
                },
                '&:focus': {
                  outline: 'none !important',
                  border: 'none !important',
                  boxShadow: 'none !important'
                },
                '&:focus-visible': {
                  outline: 'none !important',
                  border: 'none !important',
                  boxShadow: 'none !important'
                },
                '&:active': {
                  outline: 'none !important',
                  border: 'none !important',
                  boxShadow: 'none !important'
                }
              }}
            >
              国内
            </Button>
            <Button
              fullWidth
              onClick={() => {
                setHotCityCategory('international');
                setHotCitySubCategory('internationalHot');
              }}
              disableRipple
              sx={{
                justifyContent: 'center',
                px: 2,
                py: 1.5,
                textTransform: 'none',
                color: hotCityCategory === 'international' ? '#2563eb' : '#6b7280',
                bgcolor: hotCityCategory === 'international' ? '#eff6ff' : 'transparent',
                fontWeight: hotCityCategory === 'international' ? 600 : 400,
                border: 'none !important',
                outline: 'none !important',
                boxShadow: 'none !important',
                textAlign: 'center',
                '&:hover': {
                  bgcolor: hotCityCategory === 'international' ? '#dbeafe' : '#f3f4f6',
                  border: 'none !important',
                  outline: 'none !important',
                  boxShadow: 'none !important'
                },
                '&:focus': {
                  outline: 'none !important',
                  border: 'none !important',
                  boxShadow: 'none !important'
                },
                '&:focus-visible': {
                  outline: 'none !important',
                  border: 'none !important',
                  boxShadow: 'none !important'
                },
                '&:active': {
                  outline: 'none !important',
                  border: 'none !important',
                  boxShadow: 'none !important'
                }
              }}
            >
              国际及<br />中国港澳台
            </Button>
          </Box>

          {/* 右侧内容区域 */}
          <Box sx={{ flex: 1 }}>
            {/* 子分类标签 */}
            {hotCityCategory === 'domestic' && (
              <Box sx={{ borderBottom: '1px solid #e5e7eb', px: 2 }}>
                <Tabs
                  value={domesticSubCategory}
                  onChange={(e, newValue) => setDomesticSubCategory(newValue)}
                  sx={{
                    minHeight: 48,
                    '& .MuiTab-root': {
                      minHeight: 48,
                      textTransform: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#6b7280',
                      textAlign: 'center',
                      justifyContent: 'center',
                      '&.Mui-selected': {
                        color: '#2563eb',
                        fontWeight: 600
                      }
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: '#2563eb',
                      height: 2
                    }
                  }}
                >
                  <Tab label="热门" value="hot" />
                  <Tab label="ABCDEF" value="ABCDEF" />
                  <Tab label="GHIJ" value="GHIJ" />
                  <Tab label="KLMN" value="KLMN" />
                  <Tab label="PQRSTUVW" value="PQRSTUVW" />
                  <Tab label="XYZ" value="XYZ" />
                </Tabs>
              </Box>
            )}
            {hotCityCategory === 'international' && (
              <Box sx={{ borderBottom: '1px solid #e5e7eb', px: 2 }}>
                <Tabs
                  value={hotCitySubCategory}
                  onChange={(e, newValue) => setHotCitySubCategory(newValue)}
                  sx={{
                    minHeight: 48,
                    '& .MuiTab-root': {
                      minHeight: 48,
                      textTransform: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: '#6b7280',
                      textAlign: 'center',
                      justifyContent: 'center',
                      '&.Mui-selected': {
                        color: '#2563eb',
                        fontWeight: 600
                      }
                    },
                    '& .MuiTabs-indicator': {
                      backgroundColor: '#2563eb',
                      height: 2
                    }
                  }}
                >
                  <Tab label="国际•中国港澳台热门" value="internationalHot" />
                  <Tab label="亚洲" value="asia" />
                  <Tab label="欧洲" value="europe" />
                  <Tab label="美洲" value="americas" />
                  <Tab label="非洲" value="africa" />
                  <Tab label="大洋洲" value="oceania" />
                </Tabs>
              </Box>
            )}

            {/* 城市网格 */}
            <Box sx={{ p: 1.5 }}>
              <Grid container spacing={0.5}>
                {cities.filter(cityName => cityName && typeof cityName === 'string').map((cityName) => (
                  <Grid item xs={4} sm={3} md={2} key={cityName}>
                    <Box
                      component="div"
                      onClick={() => handleHotCitySelect(cityName)}
                      onMouseDown={(e) => e.preventDefault()}
                      tabIndex={-1}
                      sx={{
                        py: 1,
                        px: 1.5,
                        color: '#374151',
                        fontSize: '0.875rem',
                        fontWeight: 400,
                        cursor: 'pointer',
                        borderRadius: 1,
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        border: 'none !important',
                        outline: 'none !important',
                        boxShadow: 'none !important',
                        userSelect: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        '&:hover': {
                          color: '#2563eb',
                          bgcolor: '#eff6ff',
                          border: 'none !important',
                          outline: 'none !important',
                          boxShadow: 'none !important'
                        },
                        '&:focus': {
                          outline: 'none !important',
                          border: 'none !important',
                          boxShadow: 'none !important'
                        },
                        '&:focus-visible': {
                          outline: 'none !important',
                          border: 'none !important',
                          boxShadow: 'none !important'
                        },
                        '&:active': {
                          outline: 'none !important',
                          border: 'none !important',
                          boxShadow: 'none !important',
                          bgcolor: '#eff6ff'
                        }
                      }}
                    >
                      {cityName || ''}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  // 渲染自动补全建议
  const renderAutocompleteSuggestions = () => {
    if (!showAutocomplete || autocompleteSuggestions.length === 0) {
      return null;
    }

    return (
      <Box sx={{ p: 0 }}>
        <Box sx={{ px: 2, py: 1, borderBottom: '1px solid #e5e7eb' }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem', fontWeight: 500 }}>
            搜索建议
          </Typography>
        </Box>
        <List ref={suggestionsRef} sx={{ p: 0, maxHeight: 300, overflowY: 'auto' }}>
          {autocompleteSuggestions.map((suggestion, index) => {
            const isSelected = index === selectedSuggestionIndex;
            return (
              <ListItem
                key={suggestion.id || suggestion._id}
                button
                onClick={() => handleSelectSuggestion(suggestion)}
                onMouseEnter={() => setSelectedSuggestionIndex(index)}
                sx={{
                  py: 1,
                  px: 2,
                  bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.12),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {getTypeIcon(suggestion.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Typography variant="body2" sx={{ fontWeight: isSelected ? 600 : 400 }}>
                        {getDisplayName(suggestion)}
                      </Typography>
                      {/* 城市类型显示国家代码，其他类型显示编码 */}
                      {suggestion.type === 'city' && suggestion.countryCode ? (
                        <Chip
                          label={suggestion.countryCode}
                          size="small"
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.7rem' }}
                        />
                      ) : suggestion.code && suggestion.type !== 'bus' ? (
                        <Chip
                          label={suggestion.code}
                          size="small"
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.7rem' }}
                        />
                      ) : null}
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {[
                        suggestion.city,
                        suggestion.province && suggestion.province !== suggestion.city ? suggestion.province : null,
                        isChinese ? suggestion.country : (suggestion.countryCode || suggestion.country)
                      ].filter(Boolean).join(', ')}
                    </Typography>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      </Box>
    );
  };

  // 渲染下拉框内容
  const renderDropdownContent = () => {
    // 如果显示热门城市
    if (showHotCities && !searchValue.trim()) {
      return renderHotCities();
    }

    // 如果显示自动补全建议（且不满足完整搜索条件）
    // 注意：只有在不满足完整搜索条件时才显示自动补全建议
    if (showAutocomplete && autocompleteSuggestions.length > 0 && !isValidSearchLength(searchValue)) {
      return renderAutocompleteSuggestions();
    }

    if (loading) {
      return (
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress size={20} sx={{ mr: 1 }} />
          <Typography variant="body2">加载中...</Typography>
        </Box>
      );
    }

    if (errorMessage) {
      return (
        <Box sx={{ p: 2 }}>
          <Alert severity="error" size="small">
            {errorMessage}
          </Alert>
        </Box>
      );
    }

    if (filteredLocations.length === 0 && searchValue.trim() && isValidSearchLength(searchValue)) {
      return (
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            未找到匹配的地区
          </Typography>
        </Box>
      );
    }

    // 按层级关系组织数据（传入搜索关键词用于排序）
    const organizedLocations = organizeLocationsByHierarchy(filteredLocations, searchValue.trim());

    return (
      <List sx={{ p: 0 }}>
        {organizedLocations.map((location, index) => {
          // 判断是否是子项（机场或火车站有parentId）
          const isChild = (location.type === 'airport' || location.type === 'station') && location.parentId;
          
          return (
            <React.Fragment key={location.id || location._id}>
              <ListItem
                button
                onClick={() => handleSelect(location)}
                sx={{
                  py: 1.5,
                  px: isChild ? 4 : 2, // 子项缩进
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.04),
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {getTypeIcon(location.type)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 500 }}>
                        {getDisplayName(location)}
                      </Typography>
                      <Chip
                        label={getTypeLabel(location.type)}
                        size="small"
                        color={getTypeColor(location.type)}
                        sx={{ height: 20, fontSize: '0.75rem' }}
                      />
                      {/* 汽车站不显示编码 */}
                      {/* 城市类型显示国家代码，其他类型显示编码 */}
                      {location.type === 'city' && location.countryCode ? (
                        <Chip
                          label={location.countryCode}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.75rem' }}
                        />
                      ) : location.code && location.type !== 'bus' ? (
                        <Chip
                          label={location.code}
                          size="small"
                          variant="outlined"
                          sx={{ height: 20, fontSize: '0.75rem' }}
                        />
                      ) : null}
                      {/* 城市类型显示风险等级（低风险不显示，显示在右侧） */}
                      {location.type === 'city' && location.riskLevel && location.riskLevel !== 'low' ? (
                        <Chip
                          label={`风险${getRiskLevelLabel(location.riskLevel)}`}
                          size="small"
                          color={getRiskLevelColor(location.riskLevel)}
                          sx={{ 
                            height: 20, 
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            marginLeft: 'auto',
                            ...(location.riskLevel === 'high' || location.riskLevel === 'very_high' ? {
                              animation: `${pulse} 2s infinite`
                            } : {})
                          }}
                        />
                      ) : null}
                      {/* 城市类型显示无机场标识 */}
                      {location.type === 'city' && location.noAirport ? (
                        <Chip
                          label="无机场"
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{ 
                            height: 20, 
                            fontSize: '0.7rem',
                            fontWeight: 500
                          }}
                        />
                      ) : null}
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {[
                        location.province && location.province !== location.city ? location.province : null,
                        location.city,
                        location.district,
                        isChinese ? location.country : (location.countryCode || location.country)
                      ].filter(Boolean).join(', ')}
                      {location.parentCity && (
                        <span> • {isChinese ? '隶属' : 'Parent'}: {isChinese ? location.parentCity : (location.parentCityEnName || location.parentCity)}</span>
                      )}
                    </Typography>
                  }
                />
              </ListItem>
              {index < organizedLocations.length - 1 && <Divider />}
            </React.Fragment>
          );
        })}
      </List>
    );
  };

  // 计算下拉框位置
  const getDropdownPosition = () => {
    if (!inputRef.current) {
      return { top: 0, left: 0, width: 300 };
    }

    const inputRect = inputRef.current.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // 计算可用空间
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const spaceBelow = viewportHeight - inputRect.bottom;
    const spaceAbove = inputRect.top;
    const maxDropdownHeight = Math.min(500, viewportHeight - 100); // 热门城市需要更高
    
    // 如果显示热门城市，使用更宽的宽度
    const dropdownWidth = showHotCities 
      ? Math.min(800, viewportWidth - 40) // 热门城市界面宽度
      : Math.max(inputRect.width, 300); // 普通搜索界面宽度
    
    let top, maxHeight;
    
    // 如果下方空间足够，显示在下方
    if (spaceBelow >= 200 || spaceBelow > spaceAbove) {
      top = inputRect.bottom + scrollTop + 4;
      maxHeight = Math.min(maxDropdownHeight, spaceBelow - 20);
    } else {
      // 否则显示在上方
      top = inputRect.top + scrollTop - maxDropdownHeight - 4;
      maxHeight = Math.min(maxDropdownHeight, spaceAbove - 20);
    }

    // 调整左侧位置，确保不超出屏幕
    let left = inputRect.left + scrollLeft;
    if (left + dropdownWidth > viewportWidth) {
      left = viewportWidth - dropdownWidth - 20;
    }
    if (left < 20) {
      left = 20;
    }

    return {
      top: Math.max(10, top), // 确保不会超出屏幕顶部
      left: left,
      width: dropdownWidth,
      maxHeight: Math.max(showHotCities ? 400 : 200, maxHeight), // 热门城市最小高度400px
    };
  };

  // 按层级关系组织位置数据
  const organizeLocationsByHierarchy = (locations, searchKeyword = '') => {
    if (!locations || locations.length === 0) {
      return [];
    }

    const result = [];
    const parentMap = new Map(); // 城市ID -> 城市对象
    const childrenMap = new Map(); // 城市ID -> [机场/火车站/汽车站列表]
    const independentItems = [];

    // 分离城市和其子项（机场/火车站/汽车站）
    locations.forEach(location => {
      // 标准化location的ID
      const locationId = location.id || location._id || location._id?.toString();
      
      // 如果是城市类型
      if (location.type === 'city') {
        if (locationId) {
          parentMap.set(locationId.toString(), location);
        }
      } 
      // 如果是机场、火车站或汽车站，且有parentId
      else if ((location.type === 'airport' || location.type === 'station' || location.type === 'bus') && location.parentId) {
        // 标准化parentId
        let parentId;
        if (typeof location.parentId === 'object') {
          parentId = location.parentId._id || location.parentId.id || location.parentId.toString();
        } else {
          parentId = location.parentId.toString();
        }
        
        if (parentId) {
          const parentIdStr = parentId.toString();
          if (!childrenMap.has(parentIdStr)) {
            childrenMap.set(parentIdStr, []);
          }
          childrenMap.get(parentIdStr).push(location);
        }
      } 
      // 独立项目（没有parentId的机场/火车站/汽车站）
      else {
        independentItems.push(location);
      }
    });

    // 处理childrenMap中但parent不在parentMap中的子项（parentId关联错误的情况）
    // 这些子项应该作为独立项目显示
    const orphanedChildren = [];
    childrenMap.forEach((children, parentId) => {
      if (!parentMap.has(parentId)) {
        orphanedChildren.push(...children);
      }
    });

    // 合并所有需要显示的机场/火车站/汽车站（优先显示）
    const allTransportationItems = [
      ...independentItems,
      ...orphanedChildren
    ];
    
    // 从parentMap的城市中提取其子项
    parentMap.forEach((city, cityId) => {
      const children = childrenMap.get(cityId.toString()) || [];
      allTransportationItems.push(...children);
    });

    // 对于火车站和汽车站，保留匹配关键词的（如果有关键词）
    // 优化：不仅匹配名称前缀，还匹配包含、拼音、英文名称、代码等
    const keywordLower = searchKeyword ? searchKeyword.trim().toLowerCase() : '';
    if (keywordLower) {
      const filteredItems = allTransportationItems.filter(item => {
        // 机场：显示所有匹配的
        if (item.type === 'airport') {
          return true;
        }
        
        // 火车站和汽车站：显示匹配名称、拼音、英文名称或代码的
        if (item.type === 'station' || item.type === 'bus') {
          const nameLower = (item.name || '').toLowerCase();
          const pinyinLower = (item.pinyin || '').toLowerCase();
          const enNameLower = (item.enName || '').toLowerCase();
          const codeLower = (item.code || '').toLowerCase();
          
          // 名称匹配：前缀匹配、完全匹配或包含匹配
          if (nameLower.startsWith(keywordLower) || 
              nameLower === keywordLower || 
              nameLower.includes(keywordLower)) {
            return true;
          }
          
          // 拼音匹配：前缀匹配、完全匹配或包含匹配
          if (pinyinLower && (
              pinyinLower.startsWith(keywordLower) || 
              pinyinLower === keywordLower || 
              pinyinLower.includes(keywordLower))) {
            return true;
          }
          
          // 英文名称匹配：前缀匹配、完全匹配或包含匹配
          if (enNameLower && (
              enNameLower.startsWith(keywordLower) || 
              enNameLower === keywordLower || 
              enNameLower.includes(keywordLower))) {
            return true;
          }
          
          // 代码匹配：前缀匹配、完全匹配或包含匹配
          if (codeLower && (
              codeLower.startsWith(keywordLower) || 
              codeLower === keywordLower || 
              codeLower.includes(keywordLower))) {
            return true;
          }
          
          return false;
        }
        
        // 其他类型：显示所有
        return true;
      });
      
      // 清空原数组并填充过滤后的结果
      allTransportationItems.length = 0;
      allTransportationItems.push(...filteredItems);
    }

    // 按类型优先级排序：city(1) > airport(2) > station(3) > bus(4)
    // 优先级数字越小，排序越靠前
    const typePriority = {
      'city': 1,      // 最高优先级（最先显示）
      'airport': 2,  // 第二优先级
      'station': 3,   // 第三优先级
      'bus': 4        // 最低优先级（最后显示）
    };
    
    // 计算名称匹配度（用于排序）
    const getMatchScore = (location, keyword) => {
      if (!keyword || !keyword.trim()) {
        return 0;
      }
      
      const keywordLower = keyword.trim().toLowerCase();
      const nameLower = (location.name || '').toLowerCase();
      const codeLower = (location.code || '').toLowerCase();
      const pinyinLower = (location.pinyin || '').toLowerCase();
      const enNameLower = (location.enName || '').toLowerCase();
      
      // 完全匹配（名称完全等于关键词）- 最高优先级
      if (nameLower === keywordLower) {
        return 100;
      }
      
      // 拼音完全匹配
      if (pinyinLower === keywordLower) {
        return 95;
      }
      
      // 英文名称完全匹配
      if (enNameLower === keywordLower) {
        return 90;
      }
      
      // 代码完全匹配
      if (codeLower === keywordLower) {
        return 85;
      }
      
      // 前缀匹配（名称以关键词开头，如"成都"匹配"成都东站"）
      if (nameLower.startsWith(keywordLower)) {
        return 80;
      }
      
      // 拼音前缀匹配
      if (pinyinLower && pinyinLower.startsWith(keywordLower)) {
        return 75;
      }
      
      // 英文名称前缀匹配
      if (enNameLower && enNameLower.startsWith(keywordLower)) {
        return 70;
      }
      
      // 代码前缀匹配
      if (codeLower.startsWith(keywordLower)) {
        return 65;
      }
      
      // 包含匹配（名称包含关键词）
      if (nameLower.includes(keywordLower)) {
        return 50;
      }
      
      // 拼音包含匹配
      if (pinyinLower && pinyinLower.includes(keywordLower)) {
        return 45;
      }
      
      // 英文名称包含匹配
      if (enNameLower && enNameLower.includes(keywordLower)) {
        return 40;
      }
      
      // 代码包含匹配
      if (codeLower.includes(keywordLower)) {
        return 35;
      }
      
      return 0;
    };
    
    allTransportationItems.sort((a, b) => {
      const priorityA = typePriority[a.type] || 99;
      const priorityB = typePriority[b.type] || 99;
      
      // 首先按类型优先级排序
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // 同类型按名称匹配度排序（匹配度高的优先）
      const matchScoreA = getMatchScore(a, searchKeyword);
      const matchScoreB = getMatchScore(b, searchKeyword);
      
      if (matchScoreA !== matchScoreB) {
        return matchScoreB - matchScoreA; // 匹配度高的在前
      }
      
      // 匹配度相同，按名称长度排序（短名称优先，如"成都站"优先于"成都东站"）
      const nameLengthA = (a.name || '').length;
      const nameLengthB = (b.name || '').length;
      if (nameLengthA !== nameLengthB) {
        return nameLengthA - nameLengthB;
      }
      
      // 最后按名称中文排序
      return (a.name || '').localeCompare(b.name || '', 'zh-CN');
    });
    
    // 先添加城市（优先级最高）
    parentMap.forEach((city, cityId) => {
      result.push(city);
    });

    // 然后添加机场/火车站/汽车站（按优先级排序）
    allTransportationItems.forEach(item => result.push(item));

    return result;
  };

  return (
    <Box sx={{ position: 'relative' }}>
      <StyledTextField
        ref={inputRef}
        fullWidth
        label={label}
        value={searchValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onClick={handleInputClick}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={getDynamicPlaceholder()}
        error={error}
        helperText={helperText}
        required={required}
        disabled={disabled}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: 'text.secondary' }} />
            </InputAdornment>
          ),
          endAdornment: searchValue && !disabled && (
            <InputAdornment position="end">
              <IconButton
                onClick={handleClear}
                size="small"
                sx={{ p: 0.5 }}
              >
                <ClearIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      {/* 下拉框 */}
      {showDropdown && ReactDOM.createPortal(
        <DropdownPaper
          ref={dropdownRef}
          sx={{
            position: 'fixed',
            zIndex: 1300,
            mt: 0.5,
            ...getDropdownPosition(),
          }}
        >
          {renderDropdownContent()}
        </DropdownPaper>,
        document.body
      )}
    </Box>
  );
};

export default RegionSelector;
