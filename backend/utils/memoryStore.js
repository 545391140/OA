// 开发模式的内存存储（无需数据库）
class MemoryStore {
  constructor() {
    this.data = {
      travelStandards: [],
      cityLevels: [],
      jobLevels: []
    };
    this.counters = {
      travelStandards: 0
    };
  }

  // 生成ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Travel Standards 操作
  async createTravelStandard(data) {
    const standard = {
      _id: this.generateId(),
      id: this.generateId(),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      __v: 0
    };
    this.data.travelStandards.push(standard);
    return standard;
  }

  async findTravelStandards(query = {}) {
    let results = [...this.data.travelStandards];

    // 简单查询支持
    if (query.status) {
      results = results.filter(s => s.status === query.status);
    }
    if (query.effectiveDate) {
      results = results.filter(s => new Date(s.effectiveDate) <= new Date(query.effectiveDate.$lte));
    }

    // 排序
    results.sort((a, b) => {
      if (b.effectiveDate !== a.effectiveDate) {
        return new Date(b.effectiveDate) - new Date(a.effectiveDate);
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return results;
  }

  async findTravelStandardById(id) {
    return this.data.travelStandards.find(s => s._id === id || s.id === id);
  }

  async updateTravelStandard(id, data) {
    const index = this.data.travelStandards.findIndex(s => s._id === id || s.id === id);
    if (index === -1) return null;

    this.data.travelStandards[index] = {
      ...this.data.travelStandards[index],
      ...data,
      updatedAt: new Date()
    };
    return this.data.travelStandards[index];
  }

  async deleteTravelStandard(id) {
    const index = this.data.travelStandards.findIndex(s => s._id === id || s.id === id);
    if (index === -1) return false;
    this.data.travelStandards.splice(index, 1);
    return true;
  }

  async findTravelStandardByCode(code) {
    return this.data.travelStandards.find(s => s.standardCode === code);
  }
}

// 单例模式
const memoryStore = new MemoryStore();

module.exports = memoryStore;
