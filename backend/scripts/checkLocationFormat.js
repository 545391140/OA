/**
 * 检查同步数据格式与数据库模型的匹配情况
 */

const Location = require('../models/Location');

// 模拟同步脚本生成的数据格式
const sampleSyncData = {
  // 省份数据
  province: {
    name: '江苏',
    code: '15',
    type: 'province',
    province: '江苏',
    country: '中国',
    countryCode: 'CN',
    enName: 'Jiangsu',
    status: 'active',
  },
  // 城市数据
  city: {
    name: '南通',
    code: '320600',
    type: 'city',
    city: '南通',
    province: '江苏',
    country: '中国',
    countryCode: 'CN',
    enName: 'Nantong',
    pinyin: 'Nantong',
    cityLevel: 4,
    status: 'active',
    remark: '',
  },
  // 机场数据
  airport: {
    name: '兴东国际机场',
    code: 'NTG',
    type: 'airport',
    city: '南通',
    province: '江苏',
    country: '中国',
    countryCode: 'CN',
    enName: 'Xingdong International Airport',
    parentId: null,
    status: 'active',
    remark: JSON.stringify({ airportTypes: [], buildings: [] }),
  },
  // 火车站数据
  station: {
    name: '南通',
    code: 'NUH',
    type: 'station',
    city: '南通',
    province: '江苏',
    country: '中国',
    countryCode: 'CN',
    enName: 'Nantong',
    parentId: null,
    status: 'active',
  },
  // 汽车站数据
  bus: {
    name: '南通东站',
    code: 'nantongdongzhan',
    type: 'bus',
    city: '南通',
    province: '江苏',
    country: '中国',
    countryCode: 'CN',
    pinyin: 'nantongdongzhan',
    parentId: null,
    status: 'active',
  },
};

// 检查数据格式
function checkFormat() {
  console.log('='.repeat(60));
  console.log('检查同步数据格式与数据库模型的匹配情况');
  console.log('='.repeat(60));

  const modelSchema = Location.schema.obj;
  const requiredFields = [];
  const optionalFields = [];
  const enumFields = {};

  // 分析模型结构
  Object.keys(modelSchema).forEach(field => {
    const fieldDef = modelSchema[field];
    if (fieldDef.required) {
      requiredFields.push(field);
    } else {
      optionalFields.push(field);
    }
    if (fieldDef.enum) {
      enumFields[field] = fieldDef.enum;
    }
  });

  console.log('\n数据库模型要求:');
  console.log('必填字段:', requiredFields.join(', '));
  console.log('可选字段:', optionalFields.join(', '));
  console.log('枚举字段:', JSON.stringify(enumFields, null, 2));

  // 检查每种类型的数据
  Object.keys(sampleSyncData).forEach(type => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`检查 ${type} 类型数据:`);
    console.log('='.repeat(60));

    const data = sampleSyncData[type];
    const issues = [];

    // 检查必填字段
    requiredFields.forEach(field => {
      if (!(field in data) || data[field] === undefined || data[field] === null) {
        issues.push(`❌ 缺少必填字段: ${field}`);
      } else {
        console.log(`✓ 必填字段 ${field}: ${data[field]}`);
      }
    });

    // 检查枚举字段
    Object.keys(enumFields).forEach(field => {
      if (data[field] !== undefined && !enumFields[field].includes(data[field])) {
        issues.push(`❌ 字段 ${field} 的值 "${data[field]}" 不在枚举范围内: ${enumFields[field].join(', ')}`);
      } else if (data[field] !== undefined) {
        console.log(`✓ 枚举字段 ${field}: ${data[field]} (有效)`);
      }
    });

    // 检查字段类型
    if (data.code && typeof data.code !== 'string') {
      issues.push(`❌ code 字段应该是字符串类型，当前是: ${typeof data.code}`);
    }

    if (data.parentId !== null && data.parentId !== undefined && typeof data.parentId !== 'string') {
      issues.push(`⚠️  parentId 应该是 ObjectId 字符串或 null，当前是: ${typeof data.parentId}`);
    }

    // 检查缺失的默认字段（虽然可选，但建议提供）
    const recommendedFields = ['coordinates', 'timezone'];
    recommendedFields.forEach(field => {
      if (!(field in data)) {
        console.log(`⚠️  建议添加字段: ${field} (模型有默认值，但建议显式提供)`);
      }
    });

    // 输出问题
    if (issues.length > 0) {
      console.log('\n发现的问题:');
      issues.forEach(issue => console.log(issue));
    } else {
      console.log('\n✓ 数据格式检查通过！');
    }

    // 显示完整数据
    console.log('\n完整数据:');
    console.log(JSON.stringify(data, null, 2));
  });

  console.log('\n' + '='.repeat(60));
  console.log('格式检查完成');
  console.log('='.repeat(60));
}

// 运行检查
checkFormat();

