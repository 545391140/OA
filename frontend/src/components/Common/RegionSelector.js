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
  const [searchValue, setSearchValue] = useState('');
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  // 热门城市相关状态
  const [showHotCities, setShowHotCities] = useState(false);
  const [hotCityCategory, setHotCityCategory] = useState('international'); // 'domestic' 或 'international'
  const [hotCitySubCategory, setHotCitySubCategory] = useState('internationalHot'); // 国际子分类
  const [domesticSubCategory, setDomesticSubCategory] = useState('hot'); // 国内子分类：'hot' 或字母组
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // 初始化显示值
  useEffect(() => {
    if (value) {
      // 如果value是字符串，直接显示
      if (typeof value === 'string') {
        setSearchValue(value);
        setSelectedLocation(null); // 稍后通过搜索匹配
      } 
      // 如果value是对象
      else if (typeof value === 'object' && value !== null) {
        setSelectedLocation(value);
        // 汽车站不显示编码
        const displayValue = value.type === 'bus' 
          ? value.name 
          : `${value.name}${value.code ? ` (${value.code})` : ''}`;
        setSearchValue(displayValue);
      }
    } else {
      setSearchValue('');
      setSelectedLocation(null);
    }
  }, [value]);

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

  // 从后端API搜索地理位置数据（按需搜索，提升性能）
  const searchLocationsFromAPI = useCallback(async (keyword) => {
    if (!keyword || keyword.trim().length < 1) {
      setFilteredLocations([]);
      return;
    }

    console.log('[RegionSelector] transportationType:', transportationType);
    console.log('[RegionSelector] 搜索关键词:', keyword);

    setLoading(true);
    setErrorMessage('');
    
    try {
      // 构建查询参数
      const params = {
        status: 'active',
        search: keyword.trim(),
        page: 1,
        limit: 50 // 限制返回50条结果
      };

      // 根据交通工具类型添加过滤
      if (transportationType) {
        console.log('[RegionSelector] 设置了transportationType过滤:', transportationType);
        switch (transportationType) {
          case 'flight':
            params.type = 'airport'; // 先搜索机场，城市会在结果中自然包含
            break;
          case 'train':
            params.type = 'station'; // 先搜索火车站
            break;
          case 'car':
          case 'bus':
            params.type = 'city'; // 只搜索城市
            break;
        }
      }

      console.log('[RegionSelector] 请求参数:', params);
      const response = await apiClient.get('/locations', { params });
      
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || '搜索地理位置数据失败');
      }
      
      const locations = response.data.data || [];
      console.log('[RegionSelector] 后端返回的数据数量:', locations.length);
      console.log('[RegionSelector] 后端返回的数据类型分布:', {
        city: locations.filter(l => l.type === 'city').length,
        airport: locations.filter(l => l.type === 'airport').length,
        station: locations.filter(l => l.type === 'station').length,
        bus: locations.filter(l => l.type === 'bus').length
      });
      
      // 验证并转换数据结构
      const validLocations = locations
        .filter(location => 
          location && 
          typeof location === 'object' && 
          location.name
        )
        .map(location => ({
          // 保留原有字段
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
          // 处理parentId（可能是ObjectId或对象）
          parentId: location.parentId?._id || location.parentId?.toString() || location.parentId || null,
          parentCity: location.parentId?.name || null,
          // 风险等级和无机场标识（仅城市）
          riskLevel: location.riskLevel || 'low',
          noAirport: location.noAirport || false
        }));

      // 找出搜索到的城市ID（用于查询关联的机场和火车站）
      const cityIds = validLocations
        .filter(loc => loc.type === 'city' && (loc._id || loc.id))
        .map(loc => loc._id || loc.id);

      console.log('[RegionSelector] 搜索到的城市ID:', cityIds);
      console.log('[RegionSelector] 搜索到的城市:', validLocations.filter(loc => loc.type === 'city'));

      // 查询这些城市下的机场和火车站（通过parentId关联）
      let childrenLocations = [];
      if (cityIds.length > 0) {
        try {
          // 并行查询所有城市下的子项
          const childrenPromises = cityIds.map(cityId => {
            const url = `/locations/parent/${cityId}`;
            console.log(`[RegionSelector] 查询城市 ${cityId} 下的子项: ${url}`);
            return apiClient.get(url).catch(err => {
              console.error(`[RegionSelector] 查询城市 ${cityId} 下的子项失败:`, err);
              console.error(`[RegionSelector] 错误详情:`, {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                url: err.config?.url
              });
              return { data: { success: false, data: [] } };
            });
          });
          
          const childrenResponses = await Promise.all(childrenPromises);
          console.log('[RegionSelector] 子项查询响应:', childrenResponses);
          
          // 合并所有子项
          childrenResponses.forEach((response, index) => {
            if (response.data && response.data.success && response.data.data) {
              console.log(`[RegionSelector] 城市 ${cityIds[index]} 下的子项数量:`, response.data.data.length);
              const children = response.data.data
                .filter(location => 
                  location && 
                  typeof location === 'object' && 
                  location.name
                )
                .map(location => ({
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
                  parentId: location.parentId?._id || location.parentId?.toString() || location.parentId || null,
                  parentCity: location.parentId?.name || null,
                  riskLevel: location.riskLevel || 'low',
                  noAirport: location.noAirport || false
                }));
              
              childrenLocations.push(...children);
            } else {
              console.warn(`[RegionSelector] 城市 ${cityIds[index]} 的查询响应无效:`, response.data);
            }
          });
          
          console.log('[RegionSelector] 查询到的子项总数:', childrenLocations.length);
        } catch (childrenError) {
          console.error('[RegionSelector] 查询城市下的子项失败:', childrenError);
        }
      } else {
        console.log('[RegionSelector] 没有搜索到城市，跳过子项查询');
      }

      // 如果指定了交通工具类型，需要额外获取城市数据（用于飞机/火车）
      // 注意：必须在查询子项之前获取城市，这样才能查询到城市下的机场/火车站
      let additionalCities = [];
      if (transportationType === 'flight' || transportationType === 'train') {
        // 对于飞机和火车，还需要搜索匹配的城市
        const cityParams = {
          status: 'active',
          search: keyword.trim(),
          type: 'city',
          page: 1,
          limit: 20
        };
        
        try {
          const cityResponse = await apiClient.get('/locations', { params: cityParams });
          if (cityResponse.data && cityResponse.data.success) {
            const cities = cityResponse.data.data || [];
            additionalCities = cities
              .filter(location => location && typeof location === 'object' && location.name)
              .map(location => ({
                id: location._id || location.id,
                _id: location._id || location.id,
                name: location.name,
                code: location.code || '',
                type: 'city',
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
                parentId: null,
                parentCity: null,
                riskLevel: location.riskLevel || 'low',
                noAirport: location.noAirport || false
              }));
          }
        } catch (cityError) {
          console.warn('[RegionSelector] 搜索城市数据失败:', cityError);
        }
      }

      // 合并所有城市（包括初始搜索结果和额外搜索的城市）
      const allCities = [
        ...validLocations.filter(loc => loc.type === 'city'),
        ...additionalCities
      ];
      
      // 找出所有城市ID（包括额外搜索到的城市）
      const allCityIds = Array.from(
        new Set([
          ...cityIds,
          ...allCities.map(city => city._id || city.id).filter(Boolean)
        ])
      );

      // 如果找到了新的城市，查询这些城市下的机场和火车站
      const newCityIds = allCityIds.filter(id => !cityIds.includes(id));
      if (newCityIds.length > 0) {
        console.log('[RegionSelector] 发现新的城市ID，查询子项:', newCityIds);
        try {
          const newChildrenPromises = newCityIds.map(cityId => {
            const url = `/locations/parent/${cityId}`;
            console.log(`[RegionSelector] 查询新城市 ${cityId} 下的子项: ${url}`);
            return apiClient.get(url).catch(err => {
              console.error(`[RegionSelector] 查询新城市 ${cityId} 下的子项失败:`, err);
              return { data: { success: false, data: [] } };
            });
          });
          
          const newChildrenResponses = await Promise.all(newChildrenPromises);
          
          newChildrenResponses.forEach((response, index) => {
            if (response.data && response.data.success && response.data.data) {
              const newChildren = response.data.data
                .filter(location => location && typeof location === 'object' && location.name)
                .map(location => ({
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
                  parentId: location.parentId?._id || location.parentId?.toString() || location.parentId || null,
                  parentCity: location.parentId?.name || null,
                  riskLevel: location.riskLevel || 'low',
                  noAirport: location.noAirport || false
                }));
              
              childrenLocations.push(...newChildren);
            }
          });
        } catch (newChildrenError) {
          console.error('[RegionSelector] 查询新城市下的子项失败:', newChildrenError);
        }
      }

      // 合并所有搜索结果和关联的子项
      const allResults = [
        ...validLocations,
        ...additionalCities,
        ...childrenLocations
      ];
      
      // 根据交通工具类型过滤（如果需要）
      let filteredResults = allResults;
      if (transportationType) {
        console.log('[RegionSelector] 应用transportationType过滤前，结果数量:', allResults.length);
        filteredResults = allResults.filter(location => {
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
        console.log('[RegionSelector] 应用transportationType过滤后，结果数量:', filteredResults.length);
        console.log('[RegionSelector] 过滤后的类型分布:', {
          city: filteredResults.filter(l => l.type === 'city').length,
          airport: filteredResults.filter(l => l.type === 'airport').length,
          station: filteredResults.filter(l => l.type === 'station').length,
          bus: filteredResults.filter(l => l.type === 'bus').length
        });
      } else {
        console.log('[RegionSelector] 未设置transportationType，不过滤');
      }

      // 去重并设置结果
      const uniqueResults = Array.from(
        new Map(filteredResults.map(item => [item._id || item.id, item])).values()
      );
      
      console.log('[RegionSelector] 最终结果数量:', uniqueResults.length);
      console.log('[RegionSelector] 最终结果类型分布:', {
        city: uniqueResults.filter(l => l.type === 'city').length,
        airport: uniqueResults.filter(l => l.type === 'airport').length,
        station: uniqueResults.filter(l => l.type === 'station').length,
        bus: uniqueResults.filter(l => l.type === 'bus').length
      });
      
      setFilteredLocations(uniqueResults);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || '搜索地理位置数据失败';
      setErrorMessage(errorMessage);
      console.error('搜索地理位置数据失败:', error);
      setFilteredLocations([]);
    } finally {
      setLoading(false);
    }
  }, [transportationType]);

  // 当value变化时，如果需要查找对应的位置数据
  useEffect(() => {
    if (value && typeof value === 'string' && value.trim()) {
      // 如果value是字符串，尝试搜索匹配的位置
      const timeoutId = setTimeout(() => {
        searchLocationsFromAPI(value);
      }, 300);
      return () => clearTimeout(timeoutId);
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
      // 如果输入框有焦点，显示热门城市
      if (document.activeElement === inputRef.current) {
        setShowHotCities(true);
        setShowDropdown(true);
      } else {
        setShowHotCities(false);
        setShowDropdown(false);
      }
      return;
    }

    // 有搜索内容时，隐藏热门城市，显示搜索结果
    setShowHotCities(false);

    // 防抖处理，避免频繁请求
    const timeoutId = setTimeout(() => {
      searchLocationsFromAPI(searchValue);
    }, 300); // 300ms防抖，给用户输入时间

    return () => clearTimeout(timeoutId);
  }, [searchValue, searchLocationsFromAPI]);

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
    // 汽车站不显示编码
    const displayValue = location.type === 'bus' 
      ? location.name 
      : `${location.name}${location.code ? ` (${location.code})` : ''}`;
    setSearchValue(displayValue);
    setShowDropdown(false);
    
    // 调用onChange回调，传递完整的location对象
    onChange(location);
  };

  // 处理清除
  const handleClear = () => {
    setSearchValue('');
    onChange(null);
  };

  // 处理输入变化
  const handleInputChange = (event) => {
    const value = event.target.value;
    setSearchValue(value);
    
    if (value.trim()) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

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
                {cities.map((cityName) => (
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
                      {cityName}
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

  // 渲染下拉框内容
  const renderDropdownContent = () => {
    // 如果显示热门城市
    if (showHotCities && !searchValue.trim()) {
      return renderHotCities();
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

    if (filteredLocations.length === 0 && searchValue.trim()) {
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
                        {location.name}
                      </Typography>
                      <Chip
                        label={getTypeLabel(location.type)}
                        size="small"
                        color={getTypeColor(location.type)}
                        sx={{ height: 20, fontSize: '0.75rem' }}
                      />
                      {/* 汽车站不显示编码 */}
                      {location.code && location.type !== 'bus' ? (
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
                        location.country
                      ].filter(Boolean).join(', ')}
                      {location.parentCity && (
                        <span> • 隶属: {location.parentCity}</span>
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

    console.log('[RegionSelector] organizeLocationsByHierarchy 输入数据数量:', locations.length);
    console.log('[RegionSelector] organizeLocationsByHierarchy 搜索关键词:', searchKeyword);
    console.log('[RegionSelector] organizeLocationsByHierarchy 输入数据类型分布:', {
      city: locations.filter(l => l.type === 'city').length,
      airport: locations.filter(l => l.type === 'airport').length,
      station: locations.filter(l => l.type === 'station').length,
      bus: locations.filter(l => l.type === 'bus').length
    });

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

    console.log('[RegionSelector] organizeLocationsByHierarchy 组织结果:');
    console.log('- parentMap大小:', parentMap.size);
    console.log('- childrenMap大小:', childrenMap.size);
    console.log('- independentItems数量:', independentItems.length);
    console.log('- independentItems类型分布:', {
      city: independentItems.filter(l => l.type === 'city').length,
      airport: independentItems.filter(l => l.type === 'airport').length,
      station: independentItems.filter(l => l.type === 'station').length,
      bus: independentItems.filter(l => l.type === 'bus').length
    });

    // 处理childrenMap中但parent不在parentMap中的子项（parentId关联错误的情况）
    // 这些子项应该作为独立项目显示
    const orphanedChildren = [];
    childrenMap.forEach((children, parentId) => {
      if (!parentMap.has(parentId)) {
        console.log(`- 发现orphaned子项，parentId ${parentId} 不在parentMap中，数量:`, children.length);
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

    // 对于火车站和汽车站，只保留名称前缀匹配的（如果有关键词）
    const keywordLower = searchKeyword ? searchKeyword.trim().toLowerCase() : '';
    if (keywordLower) {
      const filteredItems = allTransportationItems.filter(item => {
        // 机场：显示所有匹配的
        if (item.type === 'airport') {
          return true;
        }
        
        // 火车站和汽车站：只显示名称前缀匹配的
        if (item.type === 'station' || item.type === 'bus') {
          const nameLower = (item.name || '').toLowerCase();
          // 名称以关键词开头，或者名称完全等于关键词
          return nameLower.startsWith(keywordLower) || nameLower === keywordLower;
        }
        
        // 其他类型：显示所有
        return true;
      });
      
      console.log('[RegionSelector] 前缀匹配过滤前数量:', allTransportationItems.length);
      console.log('[RegionSelector] 前缀匹配过滤后数量:', filteredItems.length);
      console.log('[RegionSelector] 被过滤掉的火车站/汽车站:', 
        allTransportationItems
          .filter(item => !filteredItems.includes(item) && (item.type === 'station' || item.type === 'bus'))
          .map(item => `${item.type}:${item.name}`)
      );
      
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
      
      // 完全匹配（名称完全等于关键词）
      if (nameLower === keywordLower) {
        return 100;
      }
      
      // 前缀匹配（名称以关键词开头，如"成都"匹配"成都东站"）
      if (nameLower.startsWith(keywordLower)) {
        return 80;
      }
      
      // 代码完全匹配
      if (codeLower === keywordLower) {
        return 70;
      }
      
      // 代码前缀匹配
      if (codeLower.startsWith(keywordLower)) {
        return 60;
      }
      
      // 包含匹配（名称包含关键词）
      if (nameLower.includes(keywordLower)) {
        return 50;
      }
      
      // 代码包含匹配
      if (codeLower.includes(keywordLower)) {
        return 40;
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
    
    console.log('[RegionSelector] 排序后的交通工具类型顺序（前10条）:', 
      allTransportationItems.slice(0, 10).map(item => {
        const matchScore = getMatchScore(item, searchKeyword);
        return `${item.type}:${item.name} (匹配度:${matchScore})`;
      }));

    // 先添加城市（优先级最高）
    parentMap.forEach((city, cityId) => {
      result.push(city);
    });

    // 然后添加机场/火车站/汽车站（按优先级排序）
    allTransportationItems.forEach(item => result.push(item));

    console.log('[RegionSelector] organizeLocationsByHierarchy 最终结果数量:', result.length);
    console.log('[RegionSelector] organizeLocationsByHierarchy 最终结果类型分布:', {
      city: result.filter(l => l.type === 'city').length,
      airport: result.filter(l => l.type === 'airport').length,
      station: result.filter(l => l.type === 'station').length,
      bus: result.filter(l => l.type === 'bus').length
    });
    console.log('[RegionSelector] organizeLocationsByHierarchy 前10条结果:', result.slice(0, 10).map(l => `${l.type}:${l.name}`));

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
