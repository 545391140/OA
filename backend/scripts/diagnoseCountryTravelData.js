const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const Travel = require('../models/Travel');
const Location = require('../models/Location');
const User = require('../models/User');
const Role = require('../models/Role');
const { buildDataScopeQuery } = require('../utils/dataScope');

async function diagnoseCountryTravelData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 1. 检查 Travel 数据
    console.log('📊 Step 1: 检查 Travel 数据');
    const totalTravels = await Travel.countDocuments({});
    console.log(`   总差旅数: ${totalTravels}`);

    const travelsWithDestination = await Travel.countDocuments({
      $or: [
        { destination: { $exists: true, $ne: null } },
        { 'outbound.destination': { $exists: true, $ne: null } },
        { 'inbound.destination': { $exists: true, $ne: null } },
        { 'multiCityRoutes.destination': { $exists: true, $ne: null } }
      ]
    });
    console.log(`   有目的地的差旅数: ${travelsWithDestination}`);

    // 检查目的地类型
    const sampleTravels = await Travel.find({
      $or: [
        { destination: { $exists: true, $ne: null } },
        { 'outbound.destination': { $exists: true, $ne: null } }
      ]
    }).limit(5).lean();

    console.log('\n   示例差旅目的地:');
    sampleTravels.forEach((travel, idx) => {
      console.log(`   ${idx + 1}. Travel ${travel._id}:`);
      console.log(`      - destination: ${JSON.stringify(travel.destination)} (type: ${typeof travel.destination})`);
      if (travel.outbound?.destination) {
        console.log(`      - outbound.destination: ${JSON.stringify(travel.outbound.destination)} (type: ${typeof travel.outbound.destination})`);
      }
      if (travel.inbound?.destination) {
        console.log(`      - inbound.destination: ${JSON.stringify(travel.inbound.destination)} (type: ${typeof travel.inbound.destination})`);
      }
    });

    // 2. 检查数据权限查询条件
    console.log('\n📋 Step 2: 检查数据权限查询条件');
    const testUser = await User.findOne().lean();
    if (testUser) {
      const role = await Role.findOne({ code: testUser.role, isActive: true });
      const travelQuery = await buildDataScopeQuery(testUser, role, 'employee');
      console.log('   数据权限查询条件:', JSON.stringify(travelQuery, null, 2));
      
      const travelsWithPermission = await Travel.countDocuments(travelQuery);
      console.log(`   符合权限的差旅数: ${travelsWithPermission}`);
    } else {
      console.log('   ⚠️  未找到测试用户');
    }

    // 3. 检查 Location 表中的国家数据
    console.log('\n🌍 Step 3: 检查 Location 表中的国家数据');
    const countryCount = await Location.countDocuments({ type: 'country' });
    console.log(`   国家类型 Location 数: ${countryCount}`);

    const locationsWithCountry = await Location.countDocuments({
      country: { $exists: true, $ne: null, $ne: '' }
    });
    console.log(`   有 country 字段的 Location 数: ${locationsWithCountry}`);

    const sampleCountries = await Location.find({ type: 'country' }).limit(5).select('name enName country').lean();
    console.log('\n   示例国家数据:');
    sampleCountries.forEach((loc, idx) => {
      console.log(`   ${idx + 1}. ${loc.name} (enName: ${loc.enName || 'N/A'}, country: ${loc.country || 'N/A'})`);
    });

    // 4. 测试字符串目的地的国家提取
    console.log('\n🔍 Step 4: 测试字符串目的地的国家提取');
    const stringDestinations = sampleTravels
      .map(t => [
        t.destination,
        t.outbound?.destination,
        t.inbound?.destination
      ])
      .flat()
      .filter(d => d && typeof d === 'string');

    console.log(`   找到 ${stringDestinations.length} 个字符串目的地`);
    stringDestinations.forEach((dest, idx) => {
      const parts = dest.split(',');
      const country = parts.length >= 2 ? parts[parts.length - 1].trim() : null;
      console.log(`   ${idx + 1}. "${dest}" -> 国家: ${country || '无法提取'}`);
    });

    // 5. 测试聚合查询
    console.log('\n🔬 Step 5: 测试聚合查询');
    const testUser2 = await User.findOne();
    if (testUser2) {
      const role2 = await Role.findOne({ code: testUser2.role, isActive: true });
      const travelQuery2 = await buildDataScopeQuery(testUser2, role2, 'employee');

      // 测试字符串管道
      const stringPipeline = [
        { $match: travelQuery2 },
        {
          $project: {
            destinations: {
              $filter: {
                input: {
                  $concatArrays: [
                    {
                      $cond: [
                        { $and: [{ $ne: ['$destination', null] }, { $eq: [{ $type: '$destination' }, 'string'] }] },
                        ['$destination'],
                        []
                      ]
                    },
                    {
                      $cond: [
                        {
                          $and: [
                            { $ne: ['$outbound', null] },
                            { $ne: ['$outbound.destination', null] },
                            { $eq: [{ $type: '$outbound.destination' }, 'string'] }
                          ]
                        },
                        ['$outbound.destination'],
                        []
                      ]
                    },
                    {
                      $cond: [
                        {
                          $and: [
                            { $ne: ['$inbound', null] },
                            { $ne: ['$inbound.destination', null] },
                            { $eq: [{ $type: '$inbound.destination' }, 'string'] }
                          ]
                        },
                        ['$inbound.destination'],
                        []
                      ]
                    }
                  ]
                },
                as: 'dest',
                cond: { $ne: ['$$dest', null] }
              }
            }
          }
        },
        { $unwind: '$destinations' },
        {
          $project: {
            countryArray: {
              $cond: [
                {
                  $gte: [
                    { $size: { $split: ['$destinations', ','] } },
                    2
                  ]
                },
                { $split: ['$destinations', ','] },
                []
              ]
            }
          }
        },
        {
          $project: {
            country: {
              $cond: [
                { $gt: [{ $size: '$countryArray' }, 0] },
                {
                  $ltrim: {
                    input: {
                      $rtrim: {
                        input: { $arrayElemAt: ['$countryArray', -1] }
                      }
                    }
                  }
                },
                null
              ]
            }
          }
        },
        { $match: { country: { $ne: null, $exists: true } } },
        {
          $group: {
            _id: '$country',
            count: { $sum: 1 }
          }
        }
      ];

      const stringResults = await Travel.aggregate(stringPipeline);
      console.log(`   字符串管道结果数: ${stringResults.length}`);
      if (stringResults.length > 0) {
        console.log('   结果:');
        stringResults.forEach(item => {
          console.log(`     - ${item._id}: ${item.count} 次`);
        });
      } else {
        console.log('   ⚠️  字符串管道未返回任何结果');
        
        // 调试：检查中间步骤
        const debugPipeline = [
          { $match: travelQuery2 },
          {
            $project: {
              destination: 1,
              'outbound.destination': 1,
              'inbound.destination': 1
            }
          }
        ];
        const debugResults = await Travel.aggregate(debugPipeline).limit(3);
        console.log('\n   调试 - 前3条差旅数据:');
        debugResults.forEach((item, idx) => {
          console.log(`   ${idx + 1}. destination: ${JSON.stringify(item.destination)}`);
          console.log(`      outbound.destination: ${JSON.stringify(item.outbound?.destination)}`);
          console.log(`      inbound.destination: ${JSON.stringify(item.inbound?.destination)}`);
        });
      }
    }

    console.log('\n✅ 诊断完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error);
    process.exit(1);
  }
}

diagnoseCountryTravelData();

