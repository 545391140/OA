// 参考携程的城市数据结构
export const ctripCities = [
  // 国内热门城市
  { id: 'BJ', name: '北京', nameEn: 'Beijing', country: '中国', countryCode: 'CN', type: 'domestic', hot: true, airports: ['PEK', 'PKX'] },
  { id: 'SH', name: '上海', nameEn: 'Shanghai', country: '中国', countryCode: 'CN', type: 'domestic', hot: true, airports: ['PVG', 'SHA'] },
  { id: 'GZ', name: '广州', nameEn: 'Guangzhou', country: '中国', countryCode: 'CN', type: 'domestic', hot: true, airports: ['CAN'] },
  { id: 'SZ', name: '深圳', nameEn: 'Shenzhen', country: '中国', countryCode: 'CN', type: 'domestic', hot: true, airports: ['SZX'] },
  { id: 'CD', name: '成都', nameEn: 'Chengdu', country: '中国', countryCode: 'CN', type: 'domestic', hot: true, airports: ['CTU', 'TFU'] },
  { id: 'HZ', name: '杭州', nameEn: 'Hangzhou', country: '中国', countryCode: 'CN', type: 'domestic', hot: true, airports: ['HGH'] },
  { id: 'NJ', name: '南京', nameEn: 'Nanjing', country: '中国', countryCode: 'CN', type: 'domestic', hot: true, airports: ['NKG'] },
  { id: 'WH', name: '武汉', nameEn: 'Wuhan', country: '中国', countryCode: 'CN', type: 'domestic', hot: true, airports: ['WUH'] },
  { id: 'XA', name: '西安', nameEn: 'Xian', country: '中国', countryCode: 'CN', type: 'domestic', hot: true, airports: ['XIY'] },
  { id: 'CQ', name: '重庆', nameEn: 'Chongqing', country: '中国', countryCode: 'CN', type: 'domestic', hot: true, airports: ['CKG'] },
  { id: 'TJ', name: '天津', nameEn: 'Tianjin', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['TSN'] },
  { id: 'QD', name: '青岛', nameEn: 'Qingdao', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['TAO'] },
  { id: 'DL', name: '大连', nameEn: 'Dalian', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['DLC'] },
  { id: 'SY', name: '沈阳', nameEn: 'Shenyang', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['SHE'] },
  { id: 'CC', name: '长春', nameEn: 'Changchun', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['CGQ'] },
  { id: 'HRB', name: '哈尔滨', nameEn: 'Harbin', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['HRB'] },
  { id: 'KM', name: '昆明', nameEn: 'Kunming', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['KMG'] },
  { id: 'NN', name: '南宁', nameEn: 'Nanning', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['NNG'] },
  { id: 'FZ', name: '福州', nameEn: 'Fuzhou', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['FOC'] },
  { id: 'XM', name: '厦门', nameEn: 'Xiamen', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['XMN'] },
  { id: 'CS', name: '长沙', nameEn: 'Changsha', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['CSX'] },
  { id: 'NC', name: '南昌', nameEn: 'Nanchang', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['KHN'] },
  { id: 'TY', name: '太原', nameEn: 'Taiyuan', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['TYN'] },
  { id: 'SHI', name: '石家庄', nameEn: 'Shijiazhuang', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['SJW'] },
  { id: 'HH', name: '呼和浩特', nameEn: 'Hohhot', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['HET'] },
  { id: 'LZ', name: '兰州', nameEn: 'Lanzhou', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['LHW'] },
  { id: 'XN', name: '西宁', nameEn: 'Xining', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['XNN'] },
  { id: 'YC', name: '银川', nameEn: 'Yinchuan', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['INC'] },
  { id: 'UR', name: '乌鲁木齐', nameEn: 'Urumqi', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['URC'] },
  { id: 'LS', name: '拉萨', nameEn: 'Lhasa', country: '中国', countryCode: 'CN', type: 'domestic', hot: false, airports: ['LXA'] },
  { id: 'HK', name: '香港', nameEn: 'Hong Kong', country: '中国', countryCode: 'HK', type: 'domestic', hot: true, airports: ['HKG'] },
  { id: 'MC', name: '澳门', nameEn: 'Macau', country: '中国', countryCode: 'MO', type: 'domestic', hot: false, airports: ['MFM'] },
  { id: 'TP', name: '台北', nameEn: 'Taipei', country: '中国', countryCode: 'TW', type: 'domestic', hot: true, airports: ['TPE', 'TSA'] },

  // 国际热门城市
  { id: 'NYC', name: '纽约', nameEn: 'New York', country: '美国', countryCode: 'US', type: 'international', hot: true, airports: ['JFK', 'LGA', 'EWR'] },
  { id: 'LAX', name: '洛杉矶', nameEn: 'Los Angeles', country: '美国', countryCode: 'US', type: 'international', hot: true, airports: ['LAX'] },
  { id: 'SF', name: '旧金山', nameEn: 'San Francisco', country: '美国', countryCode: 'US', type: 'international', hot: true, airports: ['SFO'] },
  { id: 'CHI', name: '芝加哥', nameEn: 'Chicago', country: '美国', countryCode: 'US', type: 'international', hot: false, airports: ['ORD', 'MDW'] },
  { id: 'SEA', name: '西雅图', nameEn: 'Seattle', country: '美国', countryCode: 'US', type: 'international', hot: false, airports: ['SEA'] },
  { id: 'BOS', name: '波士顿', nameEn: 'Boston', country: '美国', countryCode: 'US', type: 'international', hot: false, airports: ['BOS'] },
  { id: 'MIA', name: '迈阿密', nameEn: 'Miami', country: '美国', countryCode: 'US', type: 'international', hot: false, airports: ['MIA'] },
  { id: 'LAS', name: '拉斯维加斯', nameEn: 'Las Vegas', country: '美国', countryCode: 'US', type: 'international', hot: false, airports: ['LAS'] },

  { id: 'TYO', name: '东京', nameEn: 'Tokyo', country: '日本', countryCode: 'JP', type: 'international', hot: true, airports: ['NRT', 'HND'] },
  { id: 'OSA', name: '大阪', nameEn: 'Osaka', country: '日本', countryCode: 'JP', type: 'international', hot: true, airports: ['KIX', 'ITM'] },
  { id: 'KYO', name: '京都', nameEn: 'Kyoto', country: '日本', countryCode: 'JP', type: 'international', hot: false, airports: [] },
  { id: 'FUK', name: '福冈', nameEn: 'Fukuoka', country: '日本', countryCode: 'JP', type: 'international', hot: false, airports: ['FUK'] },
  { id: 'SAP', name: '札幌', nameEn: 'Sapporo', country: '日本', countryCode: 'JP', type: 'international', hot: false, airports: ['CTS'] },

  { id: 'SEL', name: '首尔', nameEn: 'Seoul', country: '韩国', countryCode: 'KR', type: 'international', hot: true, airports: ['ICN', 'GMP'] },
  { id: 'PUS', name: '釜山', nameEn: 'Busan', country: '韩国', countryCode: 'KR', type: 'international', hot: false, airports: ['PUS'] },
  { id: 'JEJ', name: '济州', nameEn: 'Jeju', country: '韩国', countryCode: 'KR', type: 'international', hot: false, airports: ['CJU'] },

  { id: 'SIN', name: '新加坡', nameEn: 'Singapore', country: '新加坡', countryCode: 'SG', type: 'international', hot: true, airports: ['SIN'] },

  { id: 'BKK', name: '曼谷', nameEn: 'Bangkok', country: '泰国', countryCode: 'TH', type: 'international', hot: true, airports: ['BKK', 'DMK'] },
  { id: 'CNX', name: '清迈', nameEn: 'Chiang Mai', country: '泰国', countryCode: 'TH', type: 'international', hot: false, airports: ['CNX'] },
  { id: 'HKT', name: '普吉', nameEn: 'Phuket', country: '泰国', countryCode: 'TH', type: 'international', hot: false, airports: ['HKT'] },

  { id: 'KUL', name: '吉隆坡', nameEn: 'Kuala Lumpur', country: '马来西亚', countryCode: 'MY', type: 'international', hot: true, airports: ['KUL', 'SZB'] },
  { id: 'PEN', name: '槟城', nameEn: 'Penang', country: '马来西亚', countryCode: 'MY', type: 'international', hot: false, airports: ['PEN'] },

  { id: 'JKT', name: '雅加达', nameEn: 'Jakarta', country: '印度尼西亚', countryCode: 'ID', type: 'international', hot: false, airports: ['CGK', 'HLP'] },
  { id: 'DPS', name: '巴厘岛', nameEn: 'Bali', country: '印度尼西亚', countryCode: 'ID', type: 'international', hot: true, airports: ['DPS'] },

  { id: 'MNL', name: '马尼拉', nameEn: 'Manila', country: '菲律宾', countryCode: 'PH', type: 'international', hot: false, airports: ['MNL'] },
  { id: 'CEB', name: '宿务', nameEn: 'Cebu', country: '菲律宾', countryCode: 'PH', type: 'international', hot: false, airports: ['CEB'] },

  { id: 'SGN', name: '胡志明市', nameEn: 'Ho Chi Minh City', country: '越南', countryCode: 'VN', type: 'international', hot: false, airports: ['SGN'] },
  { id: 'HAN', name: '河内', nameEn: 'Hanoi', country: '越南', countryCode: 'VN', type: 'international', hot: false, airports: ['HAN'] },
  { id: 'DAD', name: '岘港', nameEn: 'Da Nang', country: '越南', countryCode: 'VN', type: 'international', hot: false, airports: ['DAD'] },

  { id: 'DEL', name: '新德里', nameEn: 'New Delhi', country: '印度', countryCode: 'IN', type: 'international', hot: false, airports: ['DEL'] },
  { id: 'BOM', name: '孟买', nameEn: 'Mumbai', country: '印度', countryCode: 'IN', type: 'international', hot: false, airports: ['BOM'] },
  { id: 'BLR', name: '班加罗尔', nameEn: 'Bangalore', country: '印度', countryCode: 'IN', type: 'international', hot: false, airports: ['BLR'] },

  { id: 'LON', name: '伦敦', nameEn: 'London', country: '英国', countryCode: 'GB', type: 'international', hot: true, airports: ['LHR', 'LGW', 'STN'] },
  { id: 'MAN', name: '曼彻斯特', nameEn: 'Manchester', country: '英国', countryCode: 'GB', type: 'international', hot: false, airports: ['MAN'] },
  { id: 'EDI', name: '爱丁堡', nameEn: 'Edinburgh', country: '英国', countryCode: 'GB', type: 'international', hot: false, airports: ['EDI'] },

  { id: 'PAR', name: '巴黎', nameEn: 'Paris', country: '法国', countryCode: 'FR', type: 'international', hot: true, airports: ['CDG', 'ORY'] },
  { id: 'LYS', name: '里昂', nameEn: 'Lyon', country: '法国', countryCode: 'FR', type: 'international', hot: false, airports: ['LYS'] },
  { id: 'NCE', name: '尼斯', nameEn: 'Nice', country: '法国', countryCode: 'FR', type: 'international', hot: false, airports: ['NCE'] },

  { id: 'BER', name: '柏林', nameEn: 'Berlin', country: '德国', countryCode: 'DE', type: 'international', hot: false, airports: ['BER', 'SXF'] },
  { id: 'MUN', name: '慕尼黑', nameEn: 'Munich', country: '德国', countryCode: 'DE', type: 'international', hot: false, airports: ['MUC'] },
  { id: 'HAM', name: '汉堡', nameEn: 'Hamburg', country: '德国', countryCode: 'DE', type: 'international', hot: false, airports: ['HAM'] },
  { id: 'FRA', name: '法兰克福', nameEn: 'Frankfurt', country: '德国', countryCode: 'DE', type: 'international', hot: false, airports: ['FRA'] },

  { id: 'ROM', name: '罗马', nameEn: 'Rome', country: '意大利', countryCode: 'IT', type: 'international', hot: false, airports: ['FCO', 'CIA'] },
  { id: 'MIL', name: '米兰', nameEn: 'Milan', country: '意大利', countryCode: 'IT', type: 'international', hot: false, airports: ['MXP', 'LIN'] },
  { id: 'VEN', name: '威尼斯', nameEn: 'Venice', country: '意大利', countryCode: 'IT', type: 'international', hot: false, airports: ['VCE'] },
  { id: 'FLO', name: '佛罗伦萨', nameEn: 'Florence', country: '意大利', countryCode: 'IT', type: 'international', hot: false, airports: ['FLR'] },

  { id: 'MAD', name: '马德里', nameEn: 'Madrid', country: '西班牙', countryCode: 'ES', type: 'international', hot: false, airports: ['MAD'] },
  { id: 'BCN', name: '巴塞罗那', nameEn: 'Barcelona', country: '西班牙', countryCode: 'ES', type: 'international', hot: false, airports: ['BCN'] },

  { id: 'MOW', name: '莫斯科', nameEn: 'Moscow', country: '俄罗斯', countryCode: 'RU', type: 'international', hot: false, airports: ['SVO', 'DME', 'VKO'] },
  { id: 'LED', name: '圣彼得堡', nameEn: 'St. Petersburg', country: '俄罗斯', countryCode: 'RU', type: 'international', hot: false, airports: ['LED'] },

  { id: 'TOR', name: '多伦多', nameEn: 'Toronto', country: '加拿大', countryCode: 'CA', type: 'international', hot: false, airports: ['YYZ', 'YTZ'] },
  { id: 'VAN', name: '温哥华', nameEn: 'Vancouver', country: '加拿大', countryCode: 'CA', type: 'international', hot: false, airports: ['YVR'] },
  { id: 'MON', name: '蒙特利尔', nameEn: 'Montreal', country: '加拿大', countryCode: 'CA', type: 'international', hot: false, airports: ['YUL'] },

  { id: 'SYD', name: '悉尼', nameEn: 'Sydney', country: '澳大利亚', countryCode: 'AU', type: 'international', hot: true, airports: ['SYD'] },
  { id: 'MEL', name: '墨尔本', nameEn: 'Melbourne', country: '澳大利亚', countryCode: 'AU', type: 'international', hot: false, airports: ['MEL'] },
  { id: 'BNE', name: '布里斯班', nameEn: 'Brisbane', country: '澳大利亚', countryCode: 'AU', type: 'international', hot: false, airports: ['BNE'] },
  { id: 'PER', name: '珀斯', nameEn: 'Perth', country: '澳大利亚', countryCode: 'AU', type: 'international', hot: false, airports: ['PER'] }
];

// 获取热门城市
export const getHotCities = (type = 'all') => {
  if (type === 'all') {
    return ctripCities.filter(city => city.hot);
  }
  return ctripCities.filter(city => city.hot && city.type === type);
};

// 搜索城市
export const searchCities = (query, type = 'all') => {
  if (!query || query.trim() === '') {
    return getHotCities(type);
  }
  
  const searchTerm = query.toLowerCase().trim();
  
  return ctripCities.filter(city => {
    if (type !== 'all' && city.type !== type) {
      return false;
    }
    
    return (
      city.name.toLowerCase().includes(searchTerm) ||
      city.nameEn.toLowerCase().includes(searchTerm) ||
      city.country.toLowerCase().includes(searchTerm) ||
      city.airports.some(airport => airport.toLowerCase().includes(searchTerm))
    );
  }).sort((a, b) => {
    // 优先显示热门城市
    if (a.hot && !b.hot) return -1;
    if (!a.hot && b.hot) return 1;
    
    // 然后按匹配度排序
    const aNameMatch = a.name.toLowerCase().startsWith(searchTerm);
    const bNameMatch = b.name.toLowerCase().startsWith(searchTerm);
    if (aNameMatch && !bNameMatch) return -1;
    if (!aNameMatch && bNameMatch) return 1;
    
    return 0;
  });
};

// 根据ID获取城市信息
export const getCityById = (id) => {
  return ctripCities.find(city => city.id === id);
};

// 获取所有国家
export const getAllCountries = () => {
  const countries = [...new Set(ctripCities.map(city => city.country))];
  return countries.sort();
};

// 根据国家获取城市
export const getCitiesByCountry = (country) => {
  return ctripCities.filter(city => city.country === country);
};
