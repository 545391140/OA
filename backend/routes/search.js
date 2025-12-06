const express = require('express');
const logger = require('../utils/logger');
const router = express.Router();
const Travel = require('../models/Travel');
const Expense = require('../models/Expense');
const User = require('../models/User');
const TravelStandard = require('../models/TravelStandard');
const Location = require('../models/Location');
const SearchHistory = require('../models/SearchHistory');
const { protect } = require('../middleware/auth');

/**
 * @route   GET /api/search/global
 * @desc    全局搜索 - 搜索所有模块
 * @access  Private
 */
router.get('/global', protect, async (req, res) => {
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
          { purpose: searchRegex },
          { travelNumber: searchRegex }
        ]
      })
        .limit(limitNum)
        .select('title destination startDate endDate status purpose travelNumber')
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

    const total = travels.length + expenses.length + users.length + standards.length + locations.length;
    
    // 保存搜索历史
    if (req.user && q && q.trim()) {
      try {
        await saveSearchHistory(req.user.id, q.trim(), 'all', total);
      } catch (historyError) {
        logger.error('Save search history error:', historyError);
      }
    }

    res.json({
      success: true,
      data: {
        travels,
        expenses,
        users,
        standards,
        locations
      },
      total
    });
  } catch (error) {
    logger.error('Global search error:', error);
    res.status(500).json({
      success: false,
      message: '搜索失败',
      error: error.message
    });
  }
});

// 保存搜索历史的辅助函数
const saveSearchHistory = async (userId, query, type, resultCount) => {
  try {
    await SearchHistory.create({
      user: userId,
      query,
      type,
      resultCount
    });
  } catch (error) {
    logger.error('Save search history error:', error);
  }
};

/**
 * @route   POST /api/search/advanced
 * @desc    高级搜索 - 支持多条件组合搜索
 * @access  Private
 */
router.post('/advanced', protect, async (req, res) => {
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

    // 保存搜索历史
    if (req.user && keyword && keyword.trim()) {
      try {
        await SearchHistory.create({
          user: req.user.id,
          query: keyword.trim(),
          type: type || 'all',
          resultCount: Object.values(results).reduce((sum, r) => sum + (r.total || 0), 0),
          criteria: req.body
        });
      } catch (historyError) {
        logger.error('Save search history error:', historyError);
      }
    }

    res.json({
      success: true,
      data: results,
      page,
      limit
    });
  } catch (error) {
    logger.error('Advanced search error:', error);
    res.status(500).json({
      success: false,
      message: '高级搜索失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/search/history
 * @desc    获取用户搜索历史
 * @access  Private
 */
router.get('/history', protect, async (req, res) => {
  try {
    const { limit = 10, savedOnly = false } = req.query;
    
    const history = await SearchHistory.getUserHistory(req.user.id, {
      limit: parseInt(limit),
      savedOnly: savedOnly === 'true'
    });

    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    logger.error('Get search history error:', error);
    res.status(500).json({
      success: false,
      message: '获取搜索历史失败',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/search/history/:id
 * @desc    删除搜索历史
 * @access  Private
 */
router.delete('/history/:id', protect, async (req, res) => {
  try {
    const history = await SearchHistory.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!history) {
      return res.status(404).json({
        success: false,
        message: '搜索历史不存在'
      });
    }

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    logger.error('Delete search history error:', error);
    res.status(500).json({
      success: false,
      message: '删除搜索历史失败',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/search/history
 * @desc    清空用户搜索历史
 * @access  Private
 */
router.delete('/history', protect, async (req, res) => {
  try {
    await SearchHistory.deleteMany({ user: req.user.id });
    
    res.json({
      success: true,
      message: '清空成功'
    });
  } catch (error) {
    logger.error('Clear search history error:', error);
    res.status(500).json({
      success: false,
      message: '清空搜索历史失败',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/search/history/save
 * @desc    保存搜索条件
 * @access  Private
 */
router.post('/history/save', protect, async (req, res) => {
  try {
    const { query, type, criteria, savedName } = req.body;

    if (!query || !savedName) {
      return res.status(400).json({
        success: false,
        message: '搜索关键词和保存名称不能为空'
      });
    }

    const savedSearch = await SearchHistory.create({
      user: req.user.id,
      query,
      type: type || 'all',
      criteria,
      isSaved: true,
      savedName
    });

    res.json({
      success: true,
      data: savedSearch
    });
  } catch (error) {
    logger.error('Save search error:', error);
    res.status(500).json({
      success: false,
      message: '保存搜索失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/search/suggestions
 * @desc    获取搜索建议（自动完成）
 * @access  Private
 */
router.get('/suggestions', protect, async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q || q.trim().length === 0) {
      // 返回热门搜索
      const popular = await SearchHistory.getPopularSearches({ limit: parseInt(limit) });
      return res.json({
        success: true,
        data: popular.map(item => ({
          query: item.query,
          type: 'popular',
          count: item.count
        }))
      });
    }

    const searchRegex = new RegExp(q.trim(), 'i');
    const limitNum = parseInt(limit);

    // 从搜索历史中获取建议
    const historySuggestions = await SearchHistory.find({
      user: req.user.id,
      query: searchRegex
    })
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .select('query type')
      .lean();

    // 从各个模型中获取建议
    const [travelTitles, expenseTitles, userNames, locationNames] = await Promise.all([
      Travel.find({ title: searchRegex })
        .limit(limitNum)
        .select('title')
        .lean(),
      Expense.find({ title: searchRegex })
        .limit(limitNum)
        .select('title')
        .lean(),
      User.find({
        $or: [
          { firstName: searchRegex },
          { lastName: searchRegex },
          { email: searchRegex }
        ]
      })
        .limit(limitNum)
        .select('firstName lastName email')
        .lean(),
      Location.find({
        $or: [
          { name: searchRegex },
          { city: searchRegex },
          { country: searchRegex }
        ]
      })
        .limit(limitNum)
        .select('name city country')
        .lean()
    ]);

    const suggestions = [
      ...historySuggestions.map(h => ({
        query: h.query,
        type: h.type || 'all',
        source: 'history'
      })),
      ...travelTitles.map(t => ({
        query: t.title,
        type: 'travel',
        source: 'travel'
      })),
      ...expenseTitles.map(e => ({
        query: e.title,
        type: 'expense',
        source: 'expense'
      })),
      ...userNames.map(u => ({
        query: `${u.firstName} ${u.lastName}`,
        type: 'user',
        source: 'user'
      })),
      ...locationNames.map(l => ({
        query: l.name || l.city || l.country,
        type: 'location',
        source: 'location'
      }))
    ];

    // 去重并限制数量
    const uniqueSuggestions = suggestions
      .filter((s, index, self) => 
        index === self.findIndex(t => t.query === s.query && t.type === s.type)
      )
      .slice(0, limitNum);

    res.json({
      success: true,
      data: uniqueSuggestions
    });
  } catch (error) {
    logger.error('Get search suggestions error:', error);
    res.status(500).json({
      success: false,
      message: '获取搜索建议失败',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/search/fulltext
 * @desc    全文搜索（使用MongoDB文本索引）
 * @access  Private
 */
router.get('/fulltext', protect, async (req, res) => {
  try {
    const { q, type = 'all', limit = 20 } = req.query;

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

    const searchTerm = q.trim();
    const limitNum = parseInt(limit);
    const results = {};

    // 使用MongoDB文本搜索（需要先创建文本索引）
    // 如果文本索引不存在，回退到正则表达式搜索
    try {
      // 搜索差旅
      if (type === 'all' || type === 'travel') {
        const travelResults = await Travel.find({
          $text: { $search: searchTerm }
        })
          .limit(limitNum)
          .select('title destination startDate endDate status purpose')
          .sort({ score: { $meta: 'textScore' } })
          .lean();
        
        results.travels = travelResults.length > 0 ? travelResults : await Travel.find({
          $or: [
            { title: new RegExp(searchTerm, 'i') },
            { destination: new RegExp(searchTerm, 'i') },
            { purpose: new RegExp(searchTerm, 'i') }
          ]
        })
          .limit(limitNum)
          .select('title destination startDate endDate status purpose')
          .sort({ createdAt: -1 })
          .lean();
      }

      // 搜索费用
      if (type === 'all' || type === 'expense') {
        const expenseResults = await Expense.find({
          $text: { $search: searchTerm }
        })
          .limit(limitNum)
          .select('title description amount category date status')
          .sort({ score: { $meta: 'textScore' } })
          .lean();
        
        results.expenses = expenseResults.length > 0 ? expenseResults : await Expense.find({
          $or: [
            { title: new RegExp(searchTerm, 'i') },
            { description: new RegExp(searchTerm, 'i') },
            { category: new RegExp(searchTerm, 'i') }
          ]
        })
          .limit(limitNum)
          .select('title description amount category date status')
          .sort({ createdAt: -1 })
          .lean();
      }

      // 搜索用户
      if (type === 'all' || type === 'user') {
        const userResults = await User.find({
          $text: { $search: searchTerm }
        })
          .limit(limitNum)
          .select('firstName lastName email department role')
          .sort({ score: { $meta: 'textScore' } })
          .lean();
        
        results.users = userResults.length > 0 ? userResults : await User.find({
          $or: [
            { firstName: new RegExp(searchTerm, 'i') },
            { lastName: new RegExp(searchTerm, 'i') },
            { email: new RegExp(searchTerm, 'i') },
            { department: new RegExp(searchTerm, 'i') }
          ]
        })
          .limit(limitNum)
          .select('firstName lastName email department role')
          .sort({ createdAt: -1 })
          .lean();
      }
    } catch (textSearchError) {
      // 如果文本搜索失败，使用正则表达式搜索
      logger.warn('Text search not available, using regex search:', textSearchError.message);
      
      if (type === 'all' || type === 'travel') {
        results.travels = await Travel.find({
          $or: [
            { title: new RegExp(searchTerm, 'i') },
            { destination: new RegExp(searchTerm, 'i') },
            { purpose: new RegExp(searchTerm, 'i') }
          ]
        })
          .limit(limitNum)
          .select('title destination startDate endDate status purpose')
          .sort({ createdAt: -1 })
          .lean();
      }

      if (type === 'all' || type === 'expense') {
        results.expenses = await Expense.find({
          $or: [
            { title: new RegExp(searchTerm, 'i') },
            { description: new RegExp(searchTerm, 'i') },
            { category: new RegExp(searchTerm, 'i') }
          ]
        })
          .limit(limitNum)
          .select('title description amount category date status')
          .sort({ createdAt: -1 })
          .lean();
      }

      if (type === 'all' || type === 'user') {
        results.users = await User.find({
          $or: [
            { firstName: new RegExp(searchTerm, 'i') },
            { lastName: new RegExp(searchTerm, 'i') },
            { email: new RegExp(searchTerm, 'i') },
            { department: new RegExp(searchTerm, 'i') }
          ]
        })
          .limit(limitNum)
          .select('firstName lastName email department role')
          .sort({ createdAt: -1 })
          .lean();
      }
    }

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Fulltext search error:', error);
    res.status(500).json({
      success: false,
      message: '全文搜索失败',
      error: error.message
    });
  }
});

module.exports = router;

