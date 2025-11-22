const mongoose = require('mongoose');

const SearchHistorySchema = new mongoose.Schema({
  // 用户ID
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  // 搜索关键词
  query: {
    type: String,
    required: true,
    trim: true
  },
  // 搜索类型（all, travel, expense, user等）
  type: {
    type: String,
    default: 'all',
    enum: ['all', 'travel', 'expense', 'user', 'standard', 'location']
  },
  // 搜索结果数量
  resultCount: {
    type: Number,
    default: 0
  },
  // 搜索条件（高级搜索的完整条件）
  criteria: {
    type: mongoose.Schema.Types.Mixed
  },
  // 是否保存的搜索（用户手动保存）
  isSaved: {
    type: Boolean,
    default: false
  },
  // 保存的搜索名称（如果isSaved为true）
  savedName: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// 索引
SearchHistorySchema.index({ user: 1, createdAt: -1 });
SearchHistorySchema.index({ user: 1, query: 1 });
SearchHistorySchema.index({ user: 1, isSaved: 1 });

// 静态方法：获取用户搜索历史
SearchHistorySchema.statics.getUserHistory = async function(userId, { limit = 10, savedOnly = false } = {}) {
  const query = { user: userId };
  if (savedOnly) {
    query.isSaved = true;
  }
  
  return await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// 静态方法：获取热门搜索
SearchHistorySchema.statics.getPopularSearches = async function({ limit = 10, days = 7 } = {}) {
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - days);
  
  const results = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: dateFrom }
      }
    },
    {
      $group: {
        _id: '$query',
        count: { $sum: 1 },
        lastSearched: { $max: '$createdAt' }
      }
    },
    {
      $sort: { count: -1, lastSearched: -1 }
    },
    {
      $limit: limit
    }
  ]);
  
  return results.map(item => ({
    query: item._id,
    count: item.count,
    lastSearched: item.lastSearched
  }));
};

module.exports = mongoose.model('SearchHistory', SearchHistorySchema);






