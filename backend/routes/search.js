const express = require('express');
const router = express.Router();
const Travel = require('../models/Travel');
const Expense = require('../models/Expense');
const User = require('../models/User');
const TravelStandard = require('../models/TravelStandard');
const Location = require('../models/Location');
const auth = require('../middleware/auth');

/**
 * @route   GET /api/search/global
 * @desc    全局搜索 - 搜索所有模块
 * @access  Private
 */
router.get('/global', auth, async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({
        success: true,
        data: {
          travels: [],
          expenses: [],
          users: [],
          standards: [],
          locations: []
        }
      });
    }

    const searchRegex = new RegExp(q.trim(), 'i');
    const limitNum = parseInt(limit);

    // 并行搜索所有模块
    const [travels, expenses, users, standards, locations] = await Promise.all([
      // 搜索差旅
      Travel.find({
        $or: [
          { title: searchRegex },
          { destination: searchRegex },
          { purpose: searchRegex }
        ]
      })
        .limit(limitNum)
        .select('title destination startDate endDate status purpose')
        .sort({ createdAt: -1 })
        .lean(),

      // 搜索费用
      Expense.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { category: searchRegex }
        ]
      })
        .limit(limitNum)
        .select('title description amount category date status')
        .sort({ createdAt: -1 })
        .lean(),

      // 搜索用户
      User.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex },
          { department: searchRegex }
        ]
      })
        .limit(limitNum)
        .select('firstName lastName email department role status')
        .sort({ createdAt: -1 })
        .lean(),

      // 搜索差旅标准
      TravelStandard.find({
        $or: [
          { standardCode: searchRegex },
          { standardName: searchRegex },
          { description: searchRegex }
        ]
      })
        .limit(limitNum)
        .select('standardCode standardName status priority')
        .sort({ priority: -1 })
        .lean(),

      // 搜索地点
      Location.find({
        $or: [
          { name: searchRegex },
          { city: searchRegex },
          { country: searchRegex },
          { code: searchRegex }
        ]
      })
        .limit(limitNum)
        .select('name city country code type status')
        .sort({ createdAt: -1 })
        .lean()
    ]);

    res.json({
      success: true,
      data: {
        travels,
        expenses,
        users,
        standards,
        locations
      },
      total: travels.length + expenses.length + users.length + standards.length + locations.length
    });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({
      success: false,
      message: '搜索失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/search/advanced
 * @desc    高级搜索 - 支持多条件组合搜索
 * @access  Private
 */
router.post('/advanced', auth, async (req, res) => {
  try {
    const {
      type = 'all', // travel, expense, user, standard, location
      keyword,
      status,
      dateFrom,
      dateTo,
      travelType,
      destination,
      purpose,
      category,
      amountMin,
      amountMax,
      department,
      role,
      page = 1,
      limit = 20
    } = req.body;

    const skip = (page - 1) * limit;
    let results = {};

    // 构建搜索条件
    const buildQuery = (baseConditions = []) => {
      const conditions = [...baseConditions];

      if (keyword && keyword.trim()) {
        const keywordRegex = new RegExp(keyword.trim(), 'i');
        conditions.push({
          $or: [
            { title: keywordRegex },
            { name: keywordRegex },
            { description: keywordRegex }
          ]
        });
      }

      if (status && status !== 'all') {
        conditions.push({ status });
      }

      if (dateFrom || dateTo) {
        const dateCondition = {};
        if (dateFrom) dateCondition.$gte = new Date(dateFrom);
        if (dateTo) dateCondition.$lte = new Date(dateTo);
        conditions.push({ createdAt: dateCondition });
      }

      return conditions.length > 0 ? { $and: conditions } : {};
    };

    // 搜索差旅
    if (type === 'all' || type === 'travel') {
      const travelConditions = [];
      if (travelType && travelType !== 'all') {
        travelConditions.push({ travelType });
      }
      if (destination) {
        travelConditions.push({ destination: new RegExp(destination, 'i') });
      }
      if (purpose) {
        travelConditions.push({ purpose: new RegExp(purpose, 'i') });
      }

      const travelQuery = buildQuery(travelConditions);
      const [travels, travelCount] = await Promise.all([
        Travel.find(travelQuery)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(),
        Travel.countDocuments(travelQuery)
      ]);

      results.travels = { data: travels, total: travelCount };
    }

    // 搜索费用
    if (type === 'all' || type === 'expense') {
      const expenseConditions = [];
      if (category && category !== 'all') {
        expenseConditions.push({ category });
      }
      if (amountMin || amountMax) {
        const amountCondition = {};
        if (amountMin) amountCondition.$gte = parseFloat(amountMin);
        if (amountMax) amountCondition.$lte = parseFloat(amountMax);
        expenseConditions.push({ amount: amountCondition });
      }

      const expenseQuery = buildQuery(expenseConditions);
      const [expenses, expenseCount] = await Promise.all([
        Expense.find(expenseQuery)
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 })
          .lean(),
        Expense.countDocuments(expenseQuery)
      ]);

      results.expenses = { data: expenses, total: expenseCount };
    }

    // 搜索用户
    if (type === 'all' || type === 'user') {
      const userConditions = [];
      if (department && department !== 'all') {
        userConditions.push({ department: new RegExp(department, 'i') });
      }
      if (role && role !== 'all') {
        userConditions.push({ role });
      }

      const userQuery = buildQuery(userConditions);
      const [users, userCount] = await Promise.all([
        User.find(userQuery)
          .skip(skip)
          .limit(limit)
          .select('-password')
          .sort({ createdAt: -1 })
          .lean(),
        User.countDocuments(userQuery)
      ]);

      results.users = { data: users, total: userCount };
    }

    res.json({
      success: true,
      data: results,
      page,
      limit
    });
  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      success: false,
      message: '高级搜索失败',
      error: error.message
    });
  }
});

module.exports = router;

