const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const Travel = require('../models/Travel');

async function testCountryTravelQuery() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const travelQuery = {};
    
    console.log('🔬 测试字符串管道（简化版）...');
    const startTime = Date.now();
    
    const stringPipeline = [
      { $match: travelQuery },
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
                $trim: {
                  input: { $arrayElemAt: ['$countryArray', -1] }
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

    console.log('执行聚合查询...');
    const results = await Travel.aggregate(stringPipeline);
    const queryTime = Date.now() - startTime;
    
    console.log(`✅ 查询完成，耗时: ${queryTime}ms`);
    console.log(`结果数量: ${results.length}`);
    if (results.length > 0) {
      console.log('前5个结果:');
      results.slice(0, 5).forEach(item => {
        console.log(`  - ${item._id}: ${item.count} 次`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 错误:', error.message);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

testCountryTravelQuery();

