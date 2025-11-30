/**
 * 城市数据文件
 * 包含拼音映射表、城市列表和热门城市数据
 */

// 拼音映射表（用于中文搜索和字母分类）
export const pinyinMap = {
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

// 所有国内城市列表
export const getAllDomesticCities = () => {
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

// 热门城市数据（支持多语言）
// 格式：{ zh: '中文名', en: 'English Name', ja: '日文', ko: '韩文', ar: '阿拉伯文', vi: '越南文', th: '泰文' }
export const hotCitiesData = {
    // 国内热门城市
    domesticHot: [
      { zh: '北京', en: 'Beijing', ja: '北京', ko: '베이징', ar: 'بكين', vi: 'Bắc Kinh', th: 'ปักกิ่ง' },
      { zh: '上海', en: 'Shanghai', ja: '上海', ko: '상하이', ar: 'شنغهاي', vi: 'Thượng Hải', th: 'เซี่ยงไฮ้' },
      { zh: '广州', en: 'Guangzhou', ja: '広州', ko: '광저우', ar: 'قوانغتشو', vi: 'Quảng Châu', th: 'กวางโจว' },
      { zh: '深圳', en: 'Shenzhen', ja: '深圳', ko: '선전', ar: 'شنتشن', vi: 'Thâm Quyến', th: 'เซินเจิ้น' },
      { zh: '成都', en: 'Chengdu', ja: '成都', ko: '청두', ar: 'تشنغدو', vi: 'Thành Đô', th: 'เฉิงตู' },
      { zh: '杭州', en: 'Hangzhou', ja: '杭州', ko: '항저우', ar: 'هانغتشو', vi: 'Hàng Châu', th: 'หางโจว' },
      { zh: '南京', en: 'Nanjing', ja: '南京', ko: '난징', ar: 'نانجينغ', vi: 'Nam Kinh', th: 'หนานจิง' },
      { zh: '武汉', en: 'Wuhan', ja: '武漢', ko: '우한', ar: 'ووهان', vi: 'Vũ Hán', th: 'อู่ฮั่น' },
      { zh: '西安', en: 'Xi\'an', ja: '西安', ko: '시안', ar: 'شيان', vi: 'Tây An', th: 'ซีอาน' },
      { zh: '重庆', en: 'Chongqing', ja: '重慶', ko: '충칭', ar: 'تشونغتشينغ', vi: 'Trùng Khánh', th: 'ฉงชิ่ง' },
      { zh: '天津', en: 'Tianjin', ja: '天津', ko: '톈진', ar: 'تيانجين', vi: 'Thiên Tân', th: 'เทียนจิน' },
      { zh: '苏州', en: 'Suzhou', ja: '蘇州', ko: '쑤저우', ar: 'سوتشو', vi: 'Tô Châu', th: 'ซูโจว' },
      { zh: '青岛', en: 'Qingdao', ja: '青島', ko: '칭다오', ar: 'تشينغداو', vi: 'Thanh Đảo', th: 'ชิงเต่า' },
      { zh: '长沙', en: 'Changsha', ja: '長沙', ko: '창사', ar: 'تشانغشا', vi: 'Trường Sa', th: 'ฉางชา' },
      { zh: '大连', en: 'Dalian', ja: '大連', ko: '다롄', ar: 'داليان', vi: 'Đại Liên', th: 'ต้าเหลียน' },
      { zh: '厦门', en: 'Xiamen', ja: '廈門', ko: '샤먼', ar: 'شيامن', vi: 'Hạ Môn', th: 'เซี่ยเหมิน' },
      { zh: '无锡', en: 'Wuxi', ja: '無錫', ko: '우시', ar: 'ووشي', vi: 'Vô Tích', th: 'อู๋ซี' },
      { zh: '福州', en: 'Fuzhou', ja: '福州', ko: '푸저우', ar: 'فوتشو', vi: 'Phúc Châu', th: 'ฝูโจว' },
      { zh: '济南', en: 'Jinan', ja: '済南', ko: '지난', ar: 'جينان', vi: 'Tế Nam', th: 'จี่หนาน' },
      { zh: '宁波', en: 'Ningbo', ja: '寧波', ko: '닝보', ar: 'نينغبو', vi: 'Ninh Ba', th: 'หนิงปัว' },
      { zh: '郑州', en: 'Zhengzhou', ja: '鄭州', ko: '정저우', ar: 'تشنغتشو', vi: 'Trịnh Châu', th: 'เจิ้งโจว' },
      { zh: '合肥', en: 'Hefei', ja: '合肥', ko: '허페이', ar: 'خفي', vi: 'Hợp Phì', th: 'เหอเฝย์' },
      { zh: '石家庄', en: 'Shijiazhuang', ja: '石家荘', ko: '스자좡', ar: 'شيجياتشوانغ', vi: 'Thạch Gia Trang', th: 'ฉือเจียจวง' },
      { zh: '哈尔滨', en: 'Harbin', ja: 'ハルビン', ko: '하얼빈', ar: 'هاربين', vi: 'Cáp Nhĩ Tân', th: 'ฮาร์บิน' },
      { zh: '长春', en: 'Changchun', ja: '長春', ko: '창춘', ar: 'تشانغتشون', vi: 'Trường Xuân', th: 'ฉางชุน' },
      { zh: '沈阳', en: 'Shenyang', ja: '瀋陽', ko: '선양', ar: 'شنيانغ', vi: 'Thẩm Dương', th: 'เสิ่นหยาง' },
      { zh: '昆明', en: 'Kunming', ja: '昆明', ko: '쿤밍', ar: 'كونمينغ', vi: 'Côn Minh', th: 'คุนหมิง' },
      { zh: '南宁', en: 'Nanning', ja: '南寧', ko: '난닝', ar: 'ناننينغ', vi: 'Nam Ninh', th: 'หนานหนิง' },
      { zh: '南昌', en: 'Nanchang', ja: '南昌', ko: '난창', ar: 'نانتشانغ', vi: 'Nam Xương', th: 'หนานชาง' },
      { zh: '太原', en: 'Taiyuan', ja: '太原', ko: '타이위안', ar: 'تاييوان', vi: 'Thái Nguyên', th: 'ไท่หยวน' }
    ],
    // 国际及中国港澳台热门城市
    internationalHot: [
      { zh: '东京', en: 'Tokyo', ja: '東京', ko: '도쿄', ar: 'طوكيو', vi: 'Tokyo', th: 'โตเกียว' },
      { zh: '大阪', en: 'Osaka', ja: '大阪', ko: '오사카', ar: 'أوساكا', vi: 'Osaka', th: 'โอซาก้า' },
      { zh: '首尔', en: 'Seoul', ja: 'ソウル', ko: '서울', ar: 'سيول', vi: 'Seoul', th: 'โซล' },
      { zh: '曼谷', en: 'Bangkok', ja: 'バンコク', ko: '방콕', ar: 'بانكوك', vi: 'Bangkok', th: 'กรุงเทพฯ' },
      { zh: '新加坡', en: 'Singapore', ja: 'シンガポール', ko: '싱가포르', ar: 'سنغافورة', vi: 'Singapore', th: 'สิงคโปร์' },
      { zh: '札幌', en: 'Sapporo', ja: '札幌', ko: '삿포로', ar: 'سابورو', vi: 'Sapporo', th: 'ซัปโปโร' },
      { zh: '吉隆坡', en: 'Kuala Lumpur', ja: 'クアラルンプール', ko: '쿠알라룸푸르', ar: 'كوالا لومبور', vi: 'Kuala Lumpur', th: 'กัวลาลัมเปอร์' },
      { zh: '济州岛', en: 'Jeju Island', ja: '済州島', ko: '제주도', ar: 'جزيرة جيجو', vi: 'Đảo Jeju', th: 'เกาะเชจู' },
      { zh: '迪拜', en: 'Dubai', ja: 'ドバイ', ko: '두바이', ar: 'دبي', vi: 'Dubai', th: 'ดูไบ' },
      { zh: '伦敦', en: 'London', ja: 'ロンドン', ko: '런던', ar: 'لندن', vi: 'London', th: 'ลอนดอน' },
      { zh: '悉尼', en: 'Sydney', ja: 'シドニー', ko: '시드니', ar: 'سيدني', vi: 'Sydney', th: 'ซิดนีย์' },
      { zh: '洛杉矶', en: 'Los Angeles', ja: 'ロサンゼルス', ko: '로스앤젤레스', ar: 'لوس أنجلوس', vi: 'Los Angeles', th: 'ลอสแองเจลิส' },
      { zh: '巴黎', en: 'Paris', ja: 'パリ', ko: '파리', ar: 'باريس', vi: 'Paris', th: 'ปารีส' },
      { zh: '墨尔本', en: 'Melbourne', ja: 'メルボルン', ko: '멜버른', ar: 'ملبورن', vi: 'Melbourne', th: 'เมลเบิร์น' },
      { zh: '纽约', en: 'New York', ja: 'ニューヨーク', ko: '뉴욕', ar: 'نيويورك', vi: 'New York', th: 'นิวยอร์ก' },
      { zh: '伊斯坦布尔', en: 'Istanbul', ja: 'イスタンブール', ko: '이스탄불', ar: 'إسطنبول', vi: 'Istanbul', th: 'อิสตันบูล' },
      { zh: '莫斯科', en: 'Moscow', ja: 'モスクワ', ko: '모스크바', ar: 'موسكو', vi: 'Moscow', th: 'มอสโก' },
      { zh: '普吉岛', en: 'Phuket', ja: 'プーケット', ko: '푸켓', ar: 'بوكيت', vi: 'Phuket', th: 'ภูเก็ต' },
      { zh: '巴厘岛', en: 'Bali', ja: 'バリ', ko: '발리', ar: 'بالي', vi: 'Bali', th: 'บาหลี' },
      { zh: '奥克兰', en: 'Auckland', ja: 'オークランド', ko: '오클랜드', ar: 'أوكلاند', vi: 'Auckland', th: 'โอ๊คแลนด์' },
      { zh: '香港', en: 'Hong Kong', ja: '香港', ko: '홍콩', ar: 'هونغ كونغ', vi: 'Hồng Kông', th: 'ฮ่องกง' },
      { zh: '台北', en: 'Taipei', ja: '台北', ko: '타이베이', ar: 'تايبيه', vi: 'Đài Bắc', th: 'ไทเป' },
      { zh: '澳门', en: 'Macau', ja: 'マカオ', ko: '마카오', ar: 'ماكاو', vi: 'Ma Cao', th: 'มาเก๊า' }
    ],
    // 亚洲
    asia: [
      { zh: '东京', en: 'Tokyo', ja: '東京', ko: '도쿄', ar: 'طوكيو', vi: 'Tokyo', th: 'โตเกียว' },
      { zh: '大阪', en: 'Osaka', ja: '大阪', ko: '오사카', ar: 'أوساكا', vi: 'Osaka', th: 'โอซาก้า' },
      { zh: '首尔', en: 'Seoul', ja: 'ソウル', ko: '서울', ar: 'سيول', vi: 'Seoul', th: 'โซล' },
      { zh: '曼谷', en: 'Bangkok', ja: 'バンコク', ko: '방콕', ar: 'بانكوك', vi: 'Bangkok', th: 'กรุงเทพฯ' },
      { zh: '新加坡', en: 'Singapore', ja: 'シンガポール', ko: '싱가포르', ar: 'سنغافورة', vi: 'Singapore', th: 'สิงคโปร์' },
      { zh: '吉隆坡', en: 'Kuala Lumpur', ja: 'クアラルンプール', ko: '쿠알라룸푸르', ar: 'كوالا لومبور', vi: 'Kuala Lumpur', th: 'กัวลาลัมเปอร์' },
      { zh: '迪拜', en: 'Dubai', ja: 'ドバイ', ko: '두바이', ar: 'دبي', vi: 'Dubai', th: 'ดูไบ' },
      { zh: '伊斯坦布尔', en: 'Istanbul', ja: 'イスタンブール', ko: '이스탄불', ar: 'إسطنبول', vi: 'Istanbul', th: 'อิสตันบูล' },
      { zh: '普吉岛', en: 'Phuket', ja: 'プーケット', ko: '푸켓', ar: 'بوكيت', vi: 'Phuket', th: 'ภูเก็ต' },
      { zh: '巴厘岛', en: 'Bali', ja: 'バリ', ko: '발리', ar: 'بالي', vi: 'Bali', th: 'บาหลี' },
      { zh: '济州岛', en: 'Jeju Island', ja: '済州島', ko: '제주도', ar: 'جزيرة جيجو', vi: 'Đảo Jeju', th: 'เกาะเชจู' },
      { zh: '札幌', en: 'Sapporo', ja: '札幌', ko: '삿포로', ar: 'سابورو', vi: 'Sapporo', th: 'ซัปโปโร' },
      { zh: '名古屋', en: 'Nagoya', ja: '名古屋', ko: '나고야', ar: 'ناغويا', vi: 'Nagoya', th: 'นาโกย่า' },
      { zh: '福冈', en: 'Fukuoka', ja: '福岡', ko: '후쿠오카', ar: 'فوكوكا', vi: 'Fukuoka', th: 'ฟุกุโอกะ' },
      { zh: '釜山', en: 'Busan', ja: '釜山', ko: '부산', ar: 'بوسان', vi: 'Busan', th: 'ปูซาน' },
      { zh: '清迈', en: 'Chiang Mai', ja: 'チェンマイ', ko: '치앙마이', ar: 'تشيانغ ماي', vi: 'Chiang Mai', th: 'เชียงใหม่' },
      { zh: '河内', en: 'Hanoi', ja: 'ハノイ', ko: '하노이', ar: 'هانوي', vi: 'Hà Nội', th: 'ฮานอย' },
      { zh: '胡志明市', en: 'Ho Chi Minh City', ja: 'ホーチミン', ko: '호치민', ar: 'هو تشي منه', vi: 'Thành phố Hồ Chí Minh', th: 'โฮจิมินห์' },
      { zh: '马尼拉', en: 'Manila', ja: 'マニラ', ko: '마닐라', ar: 'مانيلا', vi: 'Manila', th: 'มะนิลา' },
      { zh: '雅加达', en: 'Jakarta', ja: 'ジャカルタ', ko: '자카르타', ar: 'جاكرتا', vi: 'Jakarta', th: 'จาการ์ตา' },
      { zh: '新德里', en: 'New Delhi', ja: 'ニューデリー', ko: '뉴델리', ar: 'نيودلهي', vi: 'New Delhi', th: 'นิวเดลี' },
      { zh: '孟买', en: 'Mumbai', ja: 'ムンバイ', ko: '뭄바이', ar: 'مومباي', vi: 'Mumbai', th: 'มุมไบ' },
      { zh: '班加罗尔', en: 'Bangalore', ja: 'バンガロール', ko: '방갈로르', ar: 'بنغالور', vi: 'Bangalore', th: 'บังกาลอร์' },
      { zh: '科伦坡', en: 'Colombo', ja: 'コロンボ', ko: '콜롬보', ar: 'كولومبو', vi: 'Colombo', th: 'โคลัมโบ' },
      { zh: '加德满都', en: 'Kathmandu', ja: 'カトマンズ', ko: '카트만두', ar: 'كاتماندو', vi: 'Kathmandu', th: 'กาฐมาณฑุ' },
      { zh: '达卡', en: 'Dhaka', ja: 'ダッカ', ko: '다카', ar: 'داكا', vi: 'Dhaka', th: 'ธากา' }
    ],
    // 欧洲
    europe: [
      { zh: '伦敦', en: 'London', ja: 'ロンドン', ko: '런던', ar: 'لندن', vi: 'London', th: 'ลอนดอน' },
      { zh: '巴黎', en: 'Paris', ja: 'パリ', ko: '파리', ar: 'باريس', vi: 'Paris', th: 'ปารีส' },
      { zh: '莫斯科', en: 'Moscow', ja: 'モスクワ', ko: '모스크바', ar: 'موسكو', vi: 'Moscow', th: 'มอสโก' },
      { zh: '罗马', en: 'Rome', ja: 'ローマ', ko: '로마', ar: 'روما', vi: 'Rome', th: 'โรม' },
      { zh: '柏林', en: 'Berlin', ja: 'ベルリン', ko: '베를린', ar: 'برلين', vi: 'Berlin', th: 'เบอร์ลิน' },
      { zh: '马德里', en: 'Madrid', ja: 'マドリード', ko: '마드리드', ar: 'مدريد', vi: 'Madrid', th: 'มาดริด' },
      { zh: '阿姆斯特丹', en: 'Amsterdam', ja: 'アムステルダム', ko: '암스테르담', ar: 'أمستردام', vi: 'Amsterdam', th: 'อัมสเตอร์ดัม' },
      { zh: '维也纳', en: 'Vienna', ja: 'ウィーン', ko: '빈', ar: 'فيينا', vi: 'Vienna', th: 'เวียนนา' },
      { zh: '苏黎世', en: 'Zurich', ja: 'チューリッヒ', ko: '취리히', ar: 'زيورخ', vi: 'Zurich', th: 'ซูริก' },
      { zh: '布鲁塞尔', en: 'Brussels', ja: 'ブリュッセル', ko: '브뤼셀', ar: 'بروكسل', vi: 'Brussels', th: 'บรัสเซลส์' },
      { zh: '哥本哈根', en: 'Copenhagen', ja: 'コペンハーゲン', ko: '코펜하겐', ar: 'كوبنهاغن', vi: 'Copenhagen', th: 'โคเปนเฮเกน' },
      { zh: '斯德哥尔摩', en: 'Stockholm', ja: 'ストックホルム', ko: '스톡홀름', ar: 'ستوكهولم', vi: 'Stockholm', th: 'สตอกโฮล์ม' },
      { zh: '奥斯陆', en: 'Oslo', ja: 'オスロ', ko: '오슬로', ar: 'أوسلو', vi: 'Oslo', th: 'ออสโล' },
      { zh: '赫尔辛基', en: 'Helsinki', ja: 'ヘルシンキ', ko: '헬싱키', ar: 'هلسنكي', vi: 'Helsinki', th: 'เฮลซิงกิ' },
      { zh: '都柏林', en: 'Dublin', ja: 'ダブリン', ko: '더블린', ar: 'دبلن', vi: 'Dublin', th: 'ดับลิน' },
      { zh: '里斯本', en: 'Lisbon', ja: 'リスボン', ko: '리스본', ar: 'لشبونة', vi: 'Lisbon', th: 'ลิสบอน' },
      { zh: '雅典', en: 'Athens', ja: 'アテネ', ko: '아테네', ar: 'أثينا', vi: 'Athens', th: 'เอเธนส์' },
      { zh: '布达佩斯', en: 'Budapest', ja: 'ブダペスト', ko: '부다페스트', ar: 'بودابست', vi: 'Budapest', th: 'บูดาเปสต์' },
      { zh: '华沙', en: 'Warsaw', ja: 'ワルシャワ', ko: '바르샤바', ar: 'وارسو', vi: 'Warsaw', th: 'วอร์ซอ' },
      { zh: '布拉格', en: 'Prague', ja: 'プラハ', ko: '프라하', ar: 'براغ', vi: 'Prague', th: 'ปราก' },
      { zh: '巴塞罗那', en: 'Barcelona', ja: 'バルセロナ', ko: '바르셀로나', ar: 'برشلونة', vi: 'Barcelona', th: 'บาร์เซโลนา' },
      { zh: '米兰', en: 'Milan', ja: 'ミラノ', ko: '밀라노', ar: 'ميلانو', vi: 'Milan', th: 'มิลาน' },
      { zh: '慕尼黑', en: 'Munich', ja: 'ミュンヘン', ko: '뮌헨', ar: 'ميونخ', vi: 'Munich', th: 'มิวนิก' },
      { zh: '法兰克福', en: 'Frankfurt', ja: 'フランクフルト', ko: '프랑크푸르트', ar: 'فرانكفورت', vi: 'Frankfurt', th: 'แฟรงก์เฟิร์ต' },
      { zh: '爱丁堡', en: 'Edinburgh', ja: 'エディンバラ', ko: '에든버러', ar: 'إدنبرة', vi: 'Edinburgh', th: 'เอดินบะระ' }
    ],
    // 美洲
    americas: [
      { zh: '纽约', en: 'New York', ja: 'ニューヨーク', ko: '뉴욕', ar: 'نيويورك', vi: 'New York', th: 'นิวยอร์ก' },
      { zh: '洛杉矶', en: 'Los Angeles', ja: 'ロサンゼルス', ko: '로스앤젤레스', ar: 'لوس أنجلوس', vi: 'Los Angeles', th: 'ลอสแองเจลิส' },
      { zh: '旧金山', en: 'San Francisco', ja: 'サンフランシスコ', ko: '샌프란시스코', ar: 'سان فرانسيسكو', vi: 'San Francisco', th: 'ซานฟรานซิสโก' },
      { zh: '芝加哥', en: 'Chicago', ja: 'シカゴ', ko: '시카고', ar: 'شيكاغو', vi: 'Chicago', th: 'ชิคาโก' },
      { zh: '波士顿', en: 'Boston', ja: 'ボストン', ko: '보스턴', ar: 'بوسطن', vi: 'Boston', th: 'บอสตัน' },
      { zh: '华盛顿', en: 'Washington', ja: 'ワシントン', ko: '워싱턴', ar: 'واشنطن', vi: 'Washington', th: 'วอชิงตัน' },
      { zh: '多伦多', en: 'Toronto', ja: 'トロント', ko: '토론토', ar: 'تورونتو', vi: 'Toronto', th: 'โทรอนโต' },
      { zh: '温哥华', en: 'Vancouver', ja: 'バンクーバー', ko: '밴쿠버', ar: 'فانكوفر', vi: 'Vancouver', th: 'แวนคูเวอร์' },
      { zh: '墨西哥城', en: 'Mexico City', ja: 'メキシコシティ', ko: '멕시코시티', ar: 'مدينة مكسيكو', vi: 'Thành phố Mexico', th: 'เม็กซิโกซิตี้' },
      { zh: '里约热内卢', en: 'Rio de Janeiro', ja: 'リオデジャネイロ', ko: '리우데자네이루', ar: 'ريو دي جانيرو', vi: 'Rio de Janeiro', th: 'รีโอเดจาเนโร' },
      { zh: '圣保罗', en: 'São Paulo', ja: 'サンパウロ', ko: '상파울루', ar: 'ساو باولو', vi: 'São Paulo', th: 'เซาเปาโล' },
      { zh: '布宜诺斯艾利斯', en: 'Buenos Aires', ja: 'ブエノスアイレス', ko: '부에노스아이레스', ar: 'بوينس آيرس', vi: 'Buenos Aires', th: 'บัวโนสไอเรส' },
      { zh: '利马', en: 'Lima', ja: 'リマ', ko: '리마', ar: 'ليما', vi: 'Lima', th: 'ลิมา' },
      { zh: '圣地亚哥', en: 'Santiago', ja: 'サンティアゴ', ko: '산티아고', ar: 'سانتياغو', vi: 'Santiago', th: 'ซานติอาโก' },
      { zh: '波哥大', en: 'Bogotá', ja: 'ボゴタ', ko: '보고타', ar: 'بوغوتا', vi: 'Bogotá', th: 'โบโกตา' },
      { zh: '哈瓦那', en: 'Havana', ja: 'ハバナ', ko: '하바나', ar: 'هافانا', vi: 'Havana', th: 'ฮาวานา' },
      { zh: '迈阿密', en: 'Miami', ja: 'マイアミ', ko: '마이애미', ar: 'ميامي', vi: 'Miami', th: 'ไมอามี' },
      { zh: '拉斯维加斯', en: 'Las Vegas', ja: 'ラスベガス', ko: '라스베이거스', ar: 'لاس فيغاس', vi: 'Las Vegas', th: 'ลาสเวกัส' },
      { zh: '西雅图', en: 'Seattle', ja: 'シアトル', ko: '시애틀', ar: 'سياتل', vi: 'Seattle', th: 'ซีแอตเทิล' },
      { zh: '休斯顿', en: 'Houston', ja: 'ヒューストン', ko: '휴스턴', ar: 'هيوستن', vi: 'Houston', th: 'ฮูสตัน' },
      { zh: '达拉斯', en: 'Dallas', ja: 'ダラス', ko: '댈러스', ar: 'دالاس', vi: 'Dallas', th: 'ดัลลัส' },
      { zh: '费城', en: 'Philadelphia', ja: 'フィラデルフィア', ko: '필라델피아', ar: 'فيلادلفيا', vi: 'Philadelphia', th: 'ฟิลาเดลเฟีย' },
      { zh: '亚特兰大', en: 'Atlanta', ja: 'アトランタ', ko: '애틀랜타', ar: 'أتلانتا', vi: 'Atlanta', th: 'แอตแลนตา' },
      { zh: '丹佛', en: 'Denver', ja: 'デンバー', ko: '덴버', ar: 'دنفر', vi: 'Denver', th: 'เดนเวอร์' }
    ],
    // 非洲
    africa: [
      { zh: '开罗', en: 'Cairo', ja: 'カイロ', ko: '카이로', ar: 'القاهرة', vi: 'Cairo', th: 'ไคโร' },
      { zh: '开普敦', en: 'Cape Town', ja: 'ケープタウン', ko: '케이프타운', ar: 'كيب تاون', vi: 'Cape Town', th: 'เคปทาวน์' },
      { zh: '约翰内斯堡', en: 'Johannesburg', ja: 'ヨハネスブルク', ko: '요하네스버그', ar: 'جوهانسبرغ', vi: 'Johannesburg', th: 'โจฮันเนสเบิร์ก' },
      { zh: '内罗毕', en: 'Nairobi', ja: 'ナイロビ', ko: '나이로비', ar: 'نيروبي', vi: 'Nairobi', th: 'ไนโรบี' },
      { zh: '拉各斯', en: 'Lagos', ja: 'ラゴス', ko: '라고스', ar: 'لاغوس', vi: 'Lagos', th: 'ลากอส' },
      { zh: '卡萨布兰卡', en: 'Casablanca', ja: 'カサブランカ', ko: '카사블랑카', ar: 'الدار البيضاء', vi: 'Casablanca', th: 'คาซาบลังกา' },
      { zh: '突尼斯', en: 'Tunis', ja: 'チュニス', ko: '튀니스', ar: 'تونس', vi: 'Tunis', th: 'ตูนิส' },
      { zh: '达累斯萨拉姆', en: 'Dar es Salaam', ja: 'ダルエスサラーム', ko: '다르에스살람', ar: 'دار السلام', vi: 'Dar es Salaam', th: 'ดาร์เอสซาลาม' },
      { zh: '阿克拉', en: 'Accra', ja: 'アクラ', ko: '아크라', ar: 'أكرا', vi: 'Accra', th: 'อักกรา' },
      { zh: '亚的斯亚贝巴', en: 'Addis Ababa', ja: 'アディスアベバ', ko: '아디스아바바', ar: 'أديس أبابا', vi: 'Addis Ababa', th: 'อาดดิสอาบาบา' },
      { zh: '达喀尔', en: 'Dakar', ja: 'ダカール', ko: '다카르', ar: 'داكار', vi: 'Dakar', th: 'ดาการ์' },
      { zh: '阿尔及尔', en: 'Algiers', ja: 'アルジェ', ko: '알제', ar: 'الجزائر', vi: 'Algiers', th: 'แอลเจียร์' },
      { zh: '拉巴特', en: 'Rabat', ja: 'ラバト', ko: '라바트', ar: 'الرباط', vi: 'Rabat', th: 'ราบัต' },
      { zh: '阿比让', en: 'Abidjan', ja: 'アビジャン', ko: '아비장', ar: 'أبيدجان', vi: 'Abidjan', th: 'อาบิดจัน' },
      { zh: '金沙萨', en: 'Kinshasa', ja: 'キンシャサ', ko: '킨샤사', ar: 'كينشاسا', vi: 'Kinshasa', th: 'กินชาซา' },
      { zh: '卢萨卡', en: 'Lusaka', ja: 'ルサカ', ko: '루사카', ar: 'لوساكا', vi: 'Lusaka', th: 'ลูซากา' }
    ],
    // 大洋洲
    oceania: [
      { zh: '悉尼', en: 'Sydney', ja: 'シドニー', ko: '시드니', ar: 'سيدني', vi: 'Sydney', th: 'ซิดนีย์' },
      { zh: '墨尔本', en: 'Melbourne', ja: 'メルボルン', ko: '멜버른', ar: 'ملبورن', vi: 'Melbourne', th: 'เมลเบิร์น' },
      { zh: '奥克兰', en: 'Auckland', ja: 'オークランド', ko: '오클랜드', ar: 'أوكلاند', vi: 'Auckland', th: 'โอ๊คแลนด์' },
      { zh: '布里斯班', en: 'Brisbane', ja: 'ブリスベン', ko: '브리즈번', ar: 'بريسبان', vi: 'Brisbane', th: 'บริสเบน' },
      { zh: '珀斯', en: 'Perth', ja: 'パース', ko: '퍼스', ar: 'بيرث', vi: 'Perth', th: 'เพิร์ท' },
      { zh: '阿德莱德', en: 'Adelaide', ja: 'アデレード', ko: '애들레이드', ar: 'أديلايد', vi: 'Adelaide', th: 'แอดิเลด' },
      { zh: '黄金海岸', en: 'Gold Coast', ja: 'ゴールドコースト', ko: '골드코스트', ar: 'الساحل الذهبي', vi: 'Gold Coast', th: 'โกลด์โคสต์' },
      { zh: '堪培拉', en: 'Canberra', ja: 'キャンベラ', ko: '캔버라', ar: 'كانبرا', vi: 'Canberra', th: 'แคนเบอร์รา' },
      { zh: '惠灵顿', en: 'Wellington', ja: 'ウェリントン', ko: '웰링턴', ar: 'ويلينغتون', vi: 'Wellington', th: 'เวลลิงตัน' },
      { zh: '基督城', en: 'Christchurch', ja: 'クライストチャーチ', ko: '크라이스트처치', ar: 'كرايستشيرش', vi: 'Christchurch', th: 'ไครสต์เชิร์ช' },
      { zh: '皇后镇', en: 'Queenstown', ja: 'クイーンズタウン', ko: '퀸스타운', ar: 'كوينزتاون', vi: 'Queenstown', th: 'ควีนส์ทาวน์' },
      { zh: '凯恩斯', en: 'Cairns', ja: 'ケアンズ', ko: '캐언스', ar: 'كيرنز', vi: 'Cairns', th: 'แครนส์' },
      { zh: '达尔文', en: 'Darwin', ja: 'ダーウィン', ko: '다윈', ar: 'داروين', vi: 'Darwin', th: 'ดาร์วิน' },
      { zh: '霍巴特', en: 'Hobart', ja: 'ホバート', ko: '호바트', ar: 'هوبارت', vi: 'Hobart', th: 'โฮบาร์ต' },
      { zh: '塔斯马尼亚', en: 'Tasmania', ja: 'タスマニア', ko: '태즈메이니아', ar: 'تسمانيا', vi: 'Tasmania', th: 'แทสเมเนีย' },
      { zh: '斐济', en: 'Fiji', ja: 'フィジー', ko: '피지', ar: 'فيجي', vi: 'Fiji', th: 'ฟิจิ' }
    ]
  };

