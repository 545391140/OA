const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('../config/database');
const Travel = require('../models/Travel');
const Expense = require('../models/Expense');
const User = require('../models/User');
const TravelStandard = require('../models/TravelStandard');
const Location = require('../models/Location');

const createTextIndexes = async () => {
  try {
    await connectDB();
    console.log('Connected to database');

    // 创建差旅文本索引
    try {
      await Travel.collection.createIndex({
        title: 'text',
        destination: 'text',
        purpose: 'text',
        description: 'text'
      });
      console.log('✓ Created text index for Travel');
    } catch (error) {
      if (error.code === 85) {
        console.log('⚠ Travel text index already exists');
      } else {
        console.error('✗ Failed to create Travel text index:', error.message);
      }
    }

    // 创建费用文本索引
    try {
      await Expense.collection.createIndex({
        title: 'text',
        description: 'text',
        category: 'text',
        notes: 'text'
      });
      console.log('✓ Created text index for Expense');
    } catch (error) {
      if (error.code === 85) {
        console.log('⚠ Expense text index already exists');
      } else {
        console.error('✗ Failed to create Expense text index:', error.message);
      }
    }

    // 创建用户文本索引
    try {
      await User.collection.createIndex({
        firstName: 'text',
        lastName: 'text',
        email: 'text',
        department: 'text',
        position: 'text'
      });
      console.log('✓ Created text index for User');
    } catch (error) {
      if (error.code === 85) {
        console.log('⚠ User text index already exists');
      } else {
        console.error('✗ Failed to create User text index:', error.message);
      }
    }

    // 创建差旅标准文本索引
    try {
      await TravelStandard.collection.createIndex({
        standardCode: 'text',
        standardName: 'text',
        description: 'text'
      });
      console.log('✓ Created text index for TravelStandard');
    } catch (error) {
      if (error.code === 85) {
        console.log('⚠ TravelStandard text index already exists');
      } else {
        console.error('✗ Failed to create TravelStandard text index:', error.message);
      }
    }

    // 创建地点文本索引
    try {
      await Location.collection.createIndex({
        name: 'text',
        city: 'text',
        province: 'text',
        country: 'text',
        code: 'text'
      });
      console.log('✓ Created text index for Location');
    } catch (error) {
      if (error.code === 85) {
        console.log('⚠ Location text index already exists');
      } else {
        console.error('✗ Failed to create Location text index:', error.message);
      }
    }

    console.log('\n✓ Text indexes creation completed');
    process.exit(0);
  } catch (error) {
    console.error('Error creating text indexes:', error);
    process.exit(1);
  }
};

createTextIndexes();






