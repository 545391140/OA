const mongoose = require('mongoose');
require('dotenv').config();
const ExpenseItem = require('./models/ExpenseItem');

async function testParentItem() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 创建测试项
    const parentId = new mongoose.Types.ObjectId('6905c4099527232c153dace1');
    console.log('Creating test item with parentItem:', parentId.toString());
    
    const testItem = await ExpenseItem.create({
      itemName: '测试parentItem保存',
      parentItem: parentId
    });
    
    console.log('Created item ID:', testItem._id.toString());
    console.log('Created item parentItem:', testItem.parentItem);
    
    // 查询验证
    const found = await ExpenseItem.findById(testItem._id);
    console.log('Found item parentItem:', found.parentItem);
    
    // 清理
    await ExpenseItem.deleteOne({ _id: testItem._id });
    console.log('Test completed successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testParentItem();

