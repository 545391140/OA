const mongoose = require('mongoose');
const { ReadPreference } = require('mongodb');
const logger = require('../utils/logger');
const FlightBooking = require('../models/FlightBooking');
const Travel = require('../models/Travel');
const Location = require('../models/Location');
const { checkResourceAccess } = require('../middleware/dataAccess');
const { ErrorFactory } = require('../utils/AppError');
const amadeusApiService = require('../services/amadeus');
const notificationService = require('../services/notificationService');

/**
 * 深度清理函数：递归删除所有 price.fees 字段，避免格式错误
 * @param {*} obj - 要清理的对象
 * @returns {*} 清理后的对象
 */
function deepCleanPriceFees(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  // 如果是数组，递归处理每个元素
  if (Array.isArray(obj)) {
    return obj.map(item => deepCleanPriceFees(item));
  }
  
  // 如果是对象，递归处理每个属性
  const cleaned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // 如果是 price 对象，特殊处理
      if (key === 'price' && obj[key] && typeof obj[key] === 'object') {
        cleaned[key] = {};
        // 只保留安全的字段，完全跳过 fees 字段
        if (obj[key].total) cleaned[key].total = obj[key].total;
        if (obj[key].currency) cleaned[key].currency = obj[key].currency;
        if (obj[key].base) cleaned[key].base = obj[key].base;
        if (obj[key].grandTotal) cleaned[key].grandTotal = obj[key].grandTotal;
        // 不复制 fees 字段
      } else {
        cleaned[key] = deepCleanPriceFees(obj[key]);
      }
    }
  }
  return cleaned;
}

/**
 * 将位置（城市或机场）转换为机场代码
 * @param {String|Object} location - 位置ID或位置对象
 * @returns {Promise<String>} 机场代码（3位）
 */
async function getAirportCode(location) {
  // 如果已经是机场代码（3位大写字母），直接返回
  if (typeof location === 'string' && /^[A-Z]{3}$/.test(location)) {
    return location;
  }

  // 如果是位置对象
  let locationObj = null;
  if (typeof location === 'object' && location !== null) {
    locationObj = location;
  } else if (typeof location === 'string') {
    // 如果是位置ID，查询位置信息
    try {
      locationObj = await Location.findById(location);
      if (!locationObj) {
        throw new Error(`位置ID ${location} 不存在`);
      }
    } catch (error) {
      // 如果不是有效的ObjectId，可能是机场代码
      if (error.name === 'CastError' && /^[A-Z]{3}$/i.test(location)) {
        return location.toUpperCase();
      }
      throw error;
    }
  } else {
    throw new Error('无效的位置参数');
  }

  // 如果选择的是机场，直接返回机场代码
  if (locationObj.type === 'airport') {
    if (!locationObj.code || locationObj.code.length !== 3) {
      throw new Error(`机场 ${locationObj.name} 的代码无效: ${locationObj.code}`);
    }
    return locationObj.code.toUpperCase();
  }

  // 如果选择的是城市，查找该城市的主要机场
  if (locationObj.type === 'city') {
    // 检查城市是否有机场标识
    if (locationObj.noAirport) {
      throw new Error(`城市 ${locationObj.name} 没有机场`);
    }

    // 查找该城市下的机场
    const cityId = locationObj._id || locationObj.id;
    const airports = await Location.find({
      type: 'airport',
      parentId: cityId,
      status: 'active',
    })
      .sort({ name: 1 }) // 按名称排序，选择第一个
      .limit(1)
      .lean();

    if (!airports || airports.length === 0) {
      // 如果没有找到机场，尝试通过城市名称查找
      const airportsByName = await Location.find({
        type: 'airport',
        city: locationObj.name,
        status: 'active',
      })
        .sort({ name: 1 })
        .limit(1)
        .lean();

      if (!airportsByName || airportsByName.length === 0) {
        throw new Error(`城市 ${locationObj.name} 没有找到机场`);
      }

      const airport = airportsByName[0];
      if (!airport.code || airport.code.length !== 3) {
        throw new Error(`城市 ${locationObj.name} 的机场代码无效`);
      }
      return airport.code.toUpperCase();
    }

    const airport = airports[0];
    if (!airport.code || airport.code.length !== 3) {
      throw new Error(`城市 ${locationObj.name} 的机场代码无效`);
    }
    return airport.code.toUpperCase();
  }

  throw new Error(`不支持的位置类型: ${locationObj.type}`);
}

/**
 * 搜索航班
 * @route POST /api/flights/search
 * @access Private
 */
exports.searchFlights = async (req, res) => {
  try {
    const {
      originLocation, // 可以是位置ID、位置对象或机场代码
      destinationLocation, // 可以是位置ID、位置对象或机场代码
      originLocationCode, // 兼容旧接口：直接传机场代码
      destinationLocationCode, // 兼容旧接口：直接传机场代码
      departureDate,
      returnDate,
      adults = 1,
      children = 0,
      infants = 0,
      travelClass = 'ECONOMY',
      max = 250,
      currencyCode = 'USD',
      nonStop = false,
    } = req.body;

    // 参数验证
    if (!departureDate) {
      return res.status(400).json({
        success: false,
        message: '缺少必填参数：departureDate',
      });
    }

    // 获取出发地机场代码
    let originCode;
    if (originLocation) {
      originCode = await getAirportCode(originLocation);
    } else if (originLocationCode) {
      originCode = await getAirportCode(originLocationCode);
    } else {
      return res.status(400).json({
        success: false,
        message: '缺少必填参数：originLocation 或 originLocationCode',
      });
    }

    // 获取目的地机场代码
    let destinationCode;
    if (destinationLocation) {
      destinationCode = await getAirportCode(destinationLocation);
    } else if (destinationLocationCode) {
      destinationCode = await getAirportCode(destinationLocationCode);
    } else {
      return res.status(400).json({
        success: false,
        message: '缺少必填参数：destinationLocation 或 destinationLocationCode',
      });
    }

    if (adults < 1 || adults > 9) {
      return res.status(400).json({
        success: false,
        message: '成人数量必须在1-9之间',
      });
    }

    // 调用 Amadeus API 搜索航班
    const result = await amadeusApiService.searchFlightOffers({
      originLocationCode: originCode,
      destinationLocationCode: destinationCode,
      departureDate,
      returnDate,
      adults,
      children,
      infants,
      travelClass,
      max,
      currencyCode,
      nonStop,
    });

    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
      count: result.data.length,
    });
  } catch (error) {
    logger.error('搜索航班失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '搜索航班失败',
    });
  }
};

/**
 * 确认航班价格
 * @route POST /api/flights/confirm-price
 * @access Private
 */
exports.confirmPrice = async (req, res) => {
  try {
    const { flightOffer, travelers } = req.body;

    if (!flightOffer || !flightOffer.id) {
      return res.status(400).json({
        success: false,
        message: 'flightOffer参数无效：必须包含完整的航班报价对象',
      });
    }

    // 调用 Amadeus API 确认价格
    const result = await amadeusApiService.confirmFlightPrice(flightOffer);

    // 如果提供了 travelers 信息，更新 travelerPricings 中的 travelerId 格式
    // 确保与提交的 travelers ID 格式一致（TRAVELER_1, TRAVELER_2...）
    if (travelers && Array.isArray(travelers) && travelers.length > 0 && result.data && result.data.travelerPricings) {
      // 将数字ID（1, 2, 3...）转换为 TRAVELER_X 格式
      result.data.travelerPricings = result.data.travelerPricings.map((tp, index) => {
        // 如果 travelerId 是数字格式，转换为 TRAVELER_X 格式
        if (/^\d+$/.test(tp.travelerId)) {
          tp.travelerId = `TRAVELER_${tp.travelerId}`;
        }
        return tp;
      });
      
      // 同时更新 flightOffer 中的 travelerPricings（如果存在）
      if (result.data.flightOffers && result.data.flightOffers[0] && result.data.flightOffers[0].travelerPricings) {
        result.data.flightOffers[0].travelerPricings = result.data.flightOffers[0].travelerPricings.map((tp, index) => {
          if (/^\d+$/.test(tp.travelerId)) {
            tp.travelerId = `TRAVELER_${tp.travelerId}`;
          }
          return tp;
        });
      }
    }

    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    logger.error('确认航班价格失败:', error);
    const status = error.statusCode || error.response?.status || 500;
    res.status(status).json({
      success: false,
      message: error.message || '确认航班价格失败',
    });
  }
};

/**
 * 创建预订（必须关联差旅申请）
 * @route POST /api/flights/bookings
 * @access Private
 */
exports.createBooking = async (req, res) => {
  let session = null; // 在函数开始处声明，确保在所有块中都可以访问
  try {
    const { travelId, flightOffer, travelers } = req.body;

    // ========== 数据验证：确保前端提交的数据结构与后端期望一致 ==========
    
    // 1. 验证 travelId 必填
    if (!travelId) {
      return res.status(400).json({
        success: false,
        message: 'travelId参数必填：机票预订必须关联差旅申请',
      });
    }

    // 2. 验证 flightOffer 必填且结构正确
    if (!flightOffer) {
      return res.status(400).json({
        success: false,
        message: 'flightOffer参数必填：航班报价信息不能为空',
      });
    }
    if (!flightOffer.id) {
      return res.status(400).json({
        success: false,
        message: 'flightOffer.id必填：航班报价ID不能为空',
      });
    }
    if (!flightOffer.itineraries || !Array.isArray(flightOffer.itineraries) || flightOffer.itineraries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'flightOffer.itineraries必填：航班行程信息不能为空',
      });
    }
    if (!flightOffer.price || !flightOffer.price.total) {
      return res.status(400).json({
        success: false,
        message: 'flightOffer.price.total必填：航班价格不能为空',
      });
    }

    // 3. 验证 travelers 必填且结构正确
    if (!travelers || !Array.isArray(travelers) || travelers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'travelers参数必填：至少需要一个乘客信息',
      });
    }

    // 验证每个乘客信息的完整性
    travelers.forEach((traveler, index) => {
      if (!traveler.id) {
        throw ErrorFactory.badRequest(`乘客${index + 1}的id必填`);
      }
      if (!traveler.dateOfBirth) {
        throw ErrorFactory.badRequest(`乘客${index + 1}的出生日期必填`);
      }
      // 验证日期格式 YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(traveler.dateOfBirth)) {
        throw ErrorFactory.badRequest(`乘客${index + 1}的出生日期格式无效，应为 YYYY-MM-DD 格式`);
      }
      if (!traveler.name) {
        throw ErrorFactory.badRequest(`乘客${index + 1}的姓名信息必填`);
      }
      if (!traveler.name.firstName || typeof traveler.name.firstName !== 'string' || !traveler.name.firstName.trim()) {
        throw ErrorFactory.badRequest(`乘客${index + 1}的名字必填`);
      }
      if (!traveler.name.lastName || typeof traveler.name.lastName !== 'string' || !traveler.name.lastName.trim()) {
        throw ErrorFactory.badRequest(`乘客${index + 1}的姓氏必填`);
      }
      if (!traveler.contact) {
        throw ErrorFactory.badRequest(`乘客${index + 1}的联系方式必填`);
      }
      if (!traveler.contact.emailAddress || typeof traveler.contact.emailAddress !== 'string' || !traveler.contact.emailAddress.trim()) {
        throw ErrorFactory.badRequest(`乘客${index + 1}的邮箱地址必填`);
      }
      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(traveler.contact.emailAddress)) {
        throw ErrorFactory.badRequest(`乘客${index + 1}的邮箱格式无效`);
      }
      if (!traveler.contact.phones || !Array.isArray(traveler.contact.phones) || traveler.contact.phones.length === 0) {
        throw ErrorFactory.badRequest(`乘客${index + 1}的电话号码必填`);
      }
      // 验证电话号码
      traveler.contact.phones.forEach((phone, phoneIndex) => {
        if (!phone.deviceType || !['MOBILE', 'LANDLINE'].includes(phone.deviceType)) {
          throw ErrorFactory.badRequest(`乘客${index + 1}的电话${phoneIndex + 1}类型无效，应为 MOBILE 或 LANDLINE`);
        }
        if (!phone.countryCallingCode || typeof phone.countryCallingCode !== 'string' || !phone.countryCallingCode.trim()) {
          throw ErrorFactory.badRequest(`乘客${index + 1}的电话${phoneIndex + 1}国家代码必填`);
        }
        // 验证国家代码格式（可以是 +86 或 86，但最终会转换为纯数字）
        let countryCode = phone.countryCallingCode.trim();
        if (countryCode.startsWith('+')) {
          countryCode = countryCode.substring(1);
        }
        if (!/^\d+$/.test(countryCode)) {
          throw ErrorFactory.badRequest(`乘客${index + 1}的电话${phoneIndex + 1}国家代码格式无效，应为数字（如：86）或带+号的数字（如：+86）`);
        }
        if (!phone.number || typeof phone.number !== 'string' || !phone.number.trim()) {
          throw ErrorFactory.badRequest(`乘客${index + 1}的电话${phoneIndex + 1}号码必填`);
        }
      });
    });

    // ========== 验证 travelers 与 flightOffer.travelerPricings 的匹配性 ==========
    
    // 检查 flightOffer 中是否有 travelerPricings
    if (!flightOffer.travelerPricings || !Array.isArray(flightOffer.travelerPricings) || flightOffer.travelerPricings.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'flightOffer.travelerPricings必填：航班报价必须包含乘客定价信息',
      });
    }

    // 获取 flightOffer 中的所有 travelerId
    const offerTravelerIds = flightOffer.travelerPricings.map(tp => tp.travelerId).filter(Boolean);
    
    // 获取提交的 travelers 的所有 ID
    const submittedTravelerIds = travelers.map(t => t.id).filter(Boolean);
    
    // 验证数量匹配
    if (submittedTravelerIds.length !== offerTravelerIds.length) {
      return res.status(400).json({
        success: false,
        message: `乘客数量不匹配：提交了 ${submittedTravelerIds.length} 名乘客，但航班报价包含 ${offerTravelerIds.length} 名乘客的定价信息`,
      });
    }

    // 验证每个 traveler 的 ID 都在 flightOffer.travelerPricings 中存在
    // 注意：Amadeus API 可能返回数字ID（1, 2, 3...）或 TRAVELER_1 格式
    // 需要同时支持两种格式
    const missingTravelerIds = submittedTravelerIds.filter(id => {
      // 检查是否直接匹配
      if (offerTravelerIds.includes(id)) {
        return false;
      }
      // 检查是否是 TRAVELER_X 格式，尝试转换为数字
      const travelerMatch = id.match(/^TRAVELER_(\d+)$/);
      if (travelerMatch) {
        const travelerNum = travelerMatch[1];
        // 检查数字格式是否匹配
        if (offerTravelerIds.includes(travelerNum) || offerTravelerIds.includes(parseInt(travelerNum).toString())) {
          return false;
        }
      }
      // 检查是否是数字格式，尝试转换为 TRAVELER_X
      if (/^\d+$/.test(id)) {
        const travelerId = `TRAVELER_${id}`;
        if (offerTravelerIds.includes(travelerId)) {
          return false;
        }
      }
      return true;
    });
    
    if (missingTravelerIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `乘客ID不匹配：以下乘客ID在航班报价中不存在：${missingTravelerIds.join(', ')}。航班报价中的乘客ID：${offerTravelerIds.join(', ')}。提示：请确保在确认价格时已填写乘客信息。`,
      });
    }
    
    // 创建 ID 映射：将提交的 traveler ID 映射到 flightOffer 中的 travelerId
    const travelerIdMap = new Map();
    submittedTravelerIds.forEach(submittedId => {
      // 直接匹配
      if (offerTravelerIds.includes(submittedId)) {
        travelerIdMap.set(submittedId, submittedId);
        return;
      }
      // TRAVELER_X 格式转换为数字
      const travelerMatch = submittedId.match(/^TRAVELER_(\d+)$/);
      if (travelerMatch) {
        const travelerNum = travelerMatch[1];
        if (offerTravelerIds.includes(travelerNum) || offerTravelerIds.includes(parseInt(travelerNum).toString())) {
          travelerIdMap.set(submittedId, travelerNum);
          return;
        }
      }
      // 数字格式转换为 TRAVELER_X
      if (/^\d+$/.test(submittedId)) {
        const travelerId = `TRAVELER_${submittedId}`;
        if (offerTravelerIds.includes(travelerId)) {
          travelerIdMap.set(submittedId, travelerId);
          return;
        }
      }
      // 如果都不匹配，使用原始ID（会在后续验证中失败）
      travelerIdMap.set(submittedId, submittedId);
    });

    // ========== 数据规范化：确保数据格式符合 Amadeus API 要求 ==========
    
    // Amadeus 要求姓名为英文字母（建议使用拼音），不接受中文/特殊符号
    const normalizeName = (value, label) => {
      if (!value || typeof value !== 'string') {
        throw ErrorFactory.badRequest(`${label}必填`);
      }
      const sanitized = value.trim().replace(/[^A-Za-z\\-\\s']/g, '');
      if (!sanitized) {
        throw ErrorFactory.badRequest(`${label}格式无效，请使用英文字母（建议拼音）`);
      }
      return sanitized.toUpperCase();
    };

    // 规范化乘客姓名和联系方式
    // 按照 flightOffer.travelerPricings 的顺序排序，确保 ID 匹配
    const normalizedTravelers = offerTravelerIds.map((offerTravelerId, idx) => {
      // 查找匹配的 traveler（支持多种ID格式）
      let traveler = travelers.find(t => {
        // 直接匹配
        if (t.id === offerTravelerId) return true;
        // TRAVELER_X 格式匹配数字
        const travelerMatch = t.id.match(/^TRAVELER_(\d+)$/);
        if (travelerMatch && travelerMatch[1] === offerTravelerId) return true;
        // 数字格式匹配 TRAVELER_X
        if (/^\d+$/.test(offerTravelerId) && t.id === `TRAVELER_${offerTravelerId}`) return true;
        return false;
      });
      
      if (!traveler) {
        throw ErrorFactory.badRequest(`找不到ID为 ${offerTravelerId} 的乘客信息。提交的乘客ID：${submittedTravelerIds.join(', ')}`);
      }
      
      return {
        id: offerTravelerId, // 使用 flightOffer 中的 travelerId，确保完全匹配
        dateOfBirth: traveler.dateOfBirth, // 已经是 YYYY-MM-DD 格式
        name: {
          firstName: normalizeName(traveler.name?.firstName, `乘客${idx + 1} 名字`),
          lastName: normalizeName(traveler.name?.lastName, `乘客${idx + 1} 姓氏`),
        },
        contact: {
          emailAddress: traveler.contact.emailAddress.trim().toLowerCase(),
          phones: traveler.contact.phones.map(phone => {
            // Amadeus API 要求 countryCallingCode 为纯数字格式，不包含 + 号
            let countryCode = phone.countryCallingCode.trim();
            // 移除 + 号（如果存在）
            if (countryCode.startsWith('+')) {
              countryCode = countryCode.substring(1);
            }
            // 确保只包含数字
            countryCode = countryCode.replace(/[^\d]/g, '');
            
            return {
              deviceType: phone.deviceType,
              countryCallingCode: countryCode,
              number: phone.number.trim(),
            };
          }),
        },
      };
    });

    // ========== 继续原有的业务逻辑 ==========

    // 2. 在事务开始前，先验证差旅申请存在（不使用事务）
    const travel = await Travel.findById(travelId);
    if (!travel) {
      return res.status(404).json({
        success: false,
        message: '差旅申请不存在',
      });
    }

    // 3. 在事务开始前进行权限检查（避免在事务中执行数据库查询）
    // 确保角色已加载
    if (!req.role && req.user?.role) {
      const Role = require('../models/Role');
      // 明确设置 session 为 null，确保不使用任何事务上下文
      req.role = await Role.findOne({ code: req.user.role, isActive: true })
        .session(null)
        .lean();
      if (!req.role) {
        return res.status(403).json({
          success: false,
          message: `Role ${req.user.role} not found or inactive`
        });
      }
    }
    
    // 进行权限检查
    const hasAccess = await checkResourceAccess(req, travel, 'travel', 'employee');
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: '无权访问该差旅申请',
      });
    }

    // 4. 验证差旅申请状态允许添加预订
    if (!['draft', 'approved'].includes(travel.status)) {
      return res.status(400).json({
        success: false,
        message: '当前差旅申请状态不允许添加预订',
      });
    }

    // 5. 现在开始事务（所有需要查询的操作都在事务外完成）
    // 事务必须使用 primary 读取偏好
    session = await mongoose.connection.startSession();
    session.startTransaction({
      readPreference: ReadPreference.PRIMARY,
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
    });

    // 6. 重新在事务中加载差旅申请（使用session）
    const travelInSession = await Travel.findById(travelId).session(session);
    if (!travelInSession) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: '差旅申请不存在',
      });
    }

    // 7. 调用 Amadeus API 创建预订（使用规范化后的乘客信息）
    const bookingResult = await amadeusApiService.createFlightOrder({
      flightOffer,
      travelers: normalizedTravelers,
    });

    // 调试：记录 Amadeus API 响应结构
    logger.debug('Amadeus 预订响应结构:', {
      hasData: !!bookingResult.data,
      hasPrice: !!bookingResult.data?.price,
      hasFlightOffers: !!bookingResult.data?.flightOffers,
      priceLocation: bookingResult.data?.price ? 'data.price' : 
                     (bookingResult.data?.flightOffers?.[0]?.price ? 'flightOffers[0].price' : 'not found'),
      responseKeys: bookingResult.data ? Object.keys(bookingResult.data) : [],
    });

    // 从多个可能的位置获取价格信息（Amadeus API 响应结构可能不同）
    let priceData = null;
    
    // 位置1: bookingResult.data.price（标准位置）
    if (bookingResult.data?.price?.total) {
      priceData = bookingResult.data.price;
    }
    // 位置2: bookingResult.data.flightOffers[0].price（备用位置）
    else if (bookingResult.data?.flightOffers?.[0]?.price?.total) {
      priceData = bookingResult.data.flightOffers[0].price;
      logger.debug('价格信息从 flightOffers[0].price 获取');
    }
    // 位置3: 使用提交的 flightOffer 中的价格（最后备用）
    else if (flightOffer?.price?.total) {
      priceData = flightOffer.price;
      logger.warn('使用提交的 flightOffer 中的价格信息（Amadeus 响应中未找到价格）');
    }
    // 如果都找不到，抛出错误
    else {
      logger.error('无法找到价格信息，响应结构:', JSON.stringify(bookingResult.data, null, 2));
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: '预订成功，但无法获取价格信息。请稍后查看预订详情。',
        error: 'Price information not found in API response'
      });
    }

    // 验证价格数据完整性
    if (!priceData.total) {
      logger.error('价格数据不完整:', JSON.stringify(priceData, null, 2));
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: '预订成功，但价格信息不完整。请稍后查看预订详情。',
        error: 'Price total is missing'
      });
    }

    // 处理 fees 字段：Amadeus API 可能返回字符串或数组，确保最终为对象数组
    let feesArray = [];
    if (priceData.fees) {
      // 调试：记录原始 fees 数据
      logger.debug('原始 priceData.fees:', {
        type: typeof priceData.fees,
        value: priceData.fees,
        isArray: Array.isArray(priceData.fees),
        stringValue: typeof priceData.fees === 'string' ? priceData.fees.substring(0, 200) : 'N/A',
      });
      
      const parseFeesString = (str) => {
        // 尝试严格 JSON
        try {
          const parsed = JSON.parse(str);
          return Array.isArray(parsed) ? parsed : null;
        } catch (_) {}
        // 宽松处理：替换单引号、给未加引号的键加引号
        try {
          const normalized = str
            .replace(/'/g, '"')
            .replace(/(\w+)\s*:/g, '"$1":');
          const parsed = JSON.parse(normalized);
          return Array.isArray(parsed) ? parsed : null;
        } catch (_) {
          return null;
        }
      };

      if (Array.isArray(priceData.fees)) {
        // 已经是数组，直接使用
        feesArray = priceData.fees;
      } else if (typeof priceData.fees === 'string') {
        const parsed = parseFeesString(priceData.fees);
        if (parsed) {
          feesArray = parsed;
          logger.debug('fees 字符串已解析为数组');
        } else {
          feesArray = [];
          logger.warn('fees 字符串无法解析，使用空数组');
        }
      } else {
        // 其他类型，使用空数组
        logger.warn('fees 类型不支持:', typeof priceData.fees, priceData.fees);
        feesArray = [];
      }
      
      // 验证 fees 数组中的每个元素结构
      const sanitizeFee = (fee) => {
        // 如果 fee 是字符串，尝试解析单个对象（宽松处理常见的单引号/非JSON格式）
        if (typeof fee === 'string') {
          // 先尝试标准 JSON
          try {
            const parsed = JSON.parse(fee);
            fee = parsed;
          } catch {
            // 尝试将单引号替换为双引号后再解析
            try {
              const normalized = fee.replace(/'/g, '"');
              fee = JSON.parse(normalized);
            } catch {
              logger.warn('fees 元素为字符串且无法解析，已跳过:', fee);
              return null;
            }
          }
        }
        if (!fee || typeof fee !== 'object') {
          return null;
        }
        const amount = typeof fee.amount === 'string' ? fee.amount : String(fee.amount ?? '');
        const type = typeof fee.type === 'string' ? fee.type : String(fee.type ?? '');
        if (!amount || !type) {
          logger.warn('fees 数组元素结构不正确，已过滤:', fee);
          return null;
        }
        return { amount, type };
      };
      
      feesArray = feesArray
        .map(sanitizeFee)
        .filter(Boolean);
    }

    // 记录 fees 处理结果
    logger.debug('fees 处理结果:', {
      originalType: typeof priceData.fees,
      originalValue: typeof priceData.fees === 'string' ? priceData.fees.substring(0, 100) : priceData.fees,
      processedCount: feesArray.length,
      processedFees: feesArray,
      feesArrayType: typeof feesArray,
      isArray: Array.isArray(feesArray),
    });
    
    // 验证 feesArray 确实是数组
    if (!Array.isArray(feesArray)) {
      logger.error('feesArray 不是数组！类型:', typeof feesArray, '值:', feesArray);
      feesArray = [];
    }

    // 6. 保存预订记录到数据库
    // 重要：确保 flightOffer 对象中的 price.fees 不会影响 price.fees
    // Mongoose Mixed 类型可能会深度合并对象，需要深度克隆并清理
    let flightOfferToSave = bookingResult.data.flightOffers?.[0] || flightOffer;
    
    // 深度克隆 flightOffer，避免引用问题
    flightOfferToSave = JSON.parse(JSON.stringify(flightOfferToSave));
    
    // 使用深度清理函数，递归删除所有 price.fees 字段
    flightOfferToSave = deepCleanPriceFees(flightOfferToSave);
    logger.debug('已使用深度清理函数处理 flightOffer，删除所有 price.fees 字段');
    
    // 最终验证：确保 fees 是数组
    const finalFees = Array.isArray(feesArray) ? feesArray : [];
    
    // 构建要创建的文档对象
    // 方案4：重建 flightOffer，只保留必要字段，避免任何潜在的格式问题
    const cleanFlightOffer = {
      id: flightOfferToSave.id,
      type: flightOfferToSave.type,
      source: flightOfferToSave.source,
      instantTicketingRequired: flightOfferToSave.instantTicketingRequired,
      nonHomogeneous: flightOfferToSave.nonHomogeneous,
      oneWay: flightOfferToSave.oneWay,
      lastTicketingDate: flightOfferToSave.lastTicketingDate,
      lastTicketingDateTime: flightOfferToSave.lastTicketingDateTime,
      numberOfBookableSeats: flightOfferToSave.numberOfBookableSeats,
      itineraries: flightOfferToSave.itineraries,
      validatingAirlineCodes: flightOfferToSave.validatingAirlineCodes,
      travelerPricings: flightOfferToSave.travelerPricings,
      // 完全不包含 price 字段，避免任何格式问题
    };
    
    logger.debug('已重建 cleanFlightOffer，只保留必要字段，不包含 price');
    
    const bookingDoc = {
      travelId,
      employee: req.user.id,
      bookingReference: bookingResult.data.associatedRecords?.airline?.reference,
      amadeusOrderId: bookingResult.data.id,
      flightOffer: cleanFlightOffer, // 使用重建的清洁对象
      travelers: bookingResult.data.travelers || normalizedTravelers, // 使用响应中的 travelers，如果没有则使用提交的
      status: 'confirmed',
      price: {
        total: String(priceData.total), // 确保是字符串
        currency: String(priceData.currency || 'USD'), // 确保是字符串
        base: priceData.base ? String(priceData.base) : undefined,
        fees: finalFees.map(fee => ({
          amount: String(fee.amount || '0.00'),
          type: String(fee.type || 'UNKNOWN'),
        })), // 确保 fees 是数组，且每个元素都是对象
      },
    };
    
    // 记录最终创建的数据（在创建前）
    logger.debug('创建 FlightBooking 前的最终数据:', {
      feesType: typeof bookingDoc.price.fees,
      feesIsArray: Array.isArray(bookingDoc.price.fees),
      feesValue: JSON.stringify(bookingDoc.price.fees),
      feesLength: Array.isArray(bookingDoc.price.fees) ? bookingDoc.price.fees.length : 0,
      flightOfferHasPrice: !!(bookingDoc.flightOffer && bookingDoc.flightOffer.price),
      cleanFlightOfferKeys: Object.keys(bookingDoc.flightOffer || {}),
    });
    
    // 最终验证：确保 price.fees 是数组
    if (!Array.isArray(bookingDoc.price.fees)) {
      logger.error('❌ 创建前验证失败：price.fees 不是数组！', {
        type: typeof bookingDoc.price.fees,
        value: bookingDoc.price.fees,
      });
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: '数据验证失败：fees 字段格式错误',
        error: 'Fees must be an array'
      });
    }
    
    const flightBooking = await FlightBooking.create([bookingDoc], { session });

    // 7. 更新差旅申请（在同一事务中）
    const bookingCost = parseFloat(priceData.total || 0);
    
    travelInSession.bookings.push({
      type: 'flight',
      provider: 'Amadeus',
      bookingReference: bookingResult.data.associatedRecords?.airline?.reference,
      amadeusOrderId: bookingResult.data.id,
      flightBookingId: flightBooking[0]._id,
      cost: bookingCost,
      currency: priceData.currency || 'USD',
      status: 'confirmed',
      details: {
        origin: flightOffer.itineraries[0]?.segments[0]?.departure?.iataCode,
        destination: flightOffer.itineraries[0]?.segments[flightOffer.itineraries[0].segments.length - 1]?.arrival?.iataCode,
        departureDate: flightOffer.itineraries[0]?.segments[0]?.departure?.at,
        returnDate: flightOffer.itineraries[1]?.segments[0]?.departure?.at,
        travelers: travelers.length,
      },
    });

    travelInSession.estimatedCost = (travelInSession.estimatedCost || 0) + bookingCost;
    await travelInSession.save({ session });

    // 8. 提交事务
    await session.commitTransaction();

    // 9. 发送通知（可选，如果 notificationService 有该方法）
    try {
      if (notificationService && typeof notificationService.sendBookingConfirmation === 'function') {
        await notificationService.sendBookingConfirmation(req.user.id, flightBooking[0]);
      }
    } catch (notifError) {
      logger.warn('发送预订确认通知失败:', notifError);
      // 不影响主流程
    }

    res.json({
      success: true,
      data: flightBooking[0],
      message: '机票预订成功',
    });
  } catch (error) {
    // 如果事务已开始，回滚事务
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    logger.error('创建机票预订失败:', error);
    logger.error('错误堆栈:', error.stack);
    
    // 处理 AppError
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || '创建机票预订失败',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    // 确保 session 正确关闭
    if (session) {
      await session.endSession();
    }
  }
};

/**
 * 获取预订列表（支持按差旅申请筛选、分页和搜索）
 * @route GET /api/flights/bookings
 * @access Private
 */
exports.getBookings = async (req, res) => {
  try {
    const { travelId, status, page = 1, limit = 20, search } = req.query;
    
    let query = {};
    query.employee = req.user.id; // 数据权限：只能查看自己的预订
    
    if (travelId) {
      query.travelId = travelId; // 按差旅申请筛选
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // 搜索功能：支持按预订参考号搜索
    // 如果搜索差旅单号，需要先查找对应的 Travel 文档
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const searchRegex = { $regex: searchTerm, $options: 'i' };
      
      // 如果搜索差旅单号，先查找对应的 Travel 文档
      const Travel = require('../models/Travel');
      const matchingTravels = await Travel.find({
        travelNumber: searchRegex,
        employee: req.user.id // 确保只能搜索自己的差旅申请
      }).select('_id').lean();
      
      const travelIds = matchingTravels.map(t => t._id);
      
      query.$or = [
        { bookingReference: searchRegex },
        ...(travelIds.length > 0 ? [{ travelId: { $in: travelIds } }] : [])
      ];
    }
    
    // 分页参数
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;
    
    // 获取总数
    const total = await FlightBooking.countDocuments(query);
    
    // 获取数据
    const bookings = await FlightBooking.find(query)
      .populate('travelId', 'travelNumber title status')
      .populate('employee', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();
    
    res.json({
      success: true,
      data: bookings,
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    logger.error('获取预订列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取预订列表失败',
    });
  }
};

/**
 * 获取差旅申请的机票预订
 * @route GET /api/travel/:id/flights
 * @access Private
 */
exports.getTravelFlights = async (req, res) => {
  try {
    const travelId = req.params.id;
    
    const travel = await Travel.findById(travelId);
    if (!travel) {
      return res.status(404).json({
        success: false,
        message: '差旅申请不存在',
      });
    }
    
    const hasAccess = await checkResourceAccess(req, travel, 'travel', 'employee');
    if (!hasAccess) {
      throw ErrorFactory.forbidden('无权访问该差旅申请');
    }
    
    const bookings = await FlightBooking.find({ travelId })
      .sort({ createdAt: -1 })
      .lean();
    
    const stats = {
      total: bookings.length,
      confirmed: bookings.filter(b => b.status === 'confirmed').length,
      pending: bookings.filter(b => b.status === 'pending').length,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      totalCost: bookings
        .filter(b => b.status !== 'cancelled')
        .reduce((sum, b) => sum + parseFloat(b.price?.total || 0), 0),
    };
    
    res.json({
      success: true,
      data: bookings,
      stats,
    });
  } catch (error) {
    logger.error('获取差旅申请机票预订失败:', error);
    
    // 处理 AppError
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || '获取机票预订失败',
    });
  }
};

/**
 * 根据差旅单号查询机票预订及费用（用于核销）
 * @route GET /api/flights/bookings/by-travel-number/:travelNumber
 * @access Private
 */
exports.getBookingsByTravelNumber = async (req, res) => {
  try {
    const { travelNumber } = req.params;
    
    if (!travelNumber) {
      return res.status(400).json({
        success: false,
        message: '差旅单号不能为空',
      });
    }
    
    // 1. 根据差旅单号查找差旅申请
    const travel = await Travel.findOne({ travelNumber })
      .populate('employee', 'firstName lastName email');
    
    if (!travel) {
      return res.status(404).json({
        success: false,
        message: `差旅单号 ${travelNumber} 不存在`,
      });
    }
    
    // 2. 数据权限检查
    const hasAccess = await checkResourceAccess(req, travel, 'travel', 'employee');
    if (!hasAccess) {
      throw ErrorFactory.forbidden('无权访问该差旅申请');
    }
    
    // 3. 查询该差旅申请关联的所有机票预订
    const bookings = await FlightBooking.find({ travelId: travel._id })
      .sort({ createdAt: -1 })
      .lean();
    
    // 4. 计算费用汇总
    const expenseSummary = {
      // 预订统计
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
      pendingBookings: bookings.filter(b => b.status === 'pending').length,
      cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
      
      // 费用统计（只统计已确认且未取消的预订）
      totalAmount: 0,
      totalAmountByCurrency: {}, // 按货币分类统计
      
      // 可核销费用（已确认且未取消的预订）
      reimbursableAmount: 0,
      reimbursableBookings: [],
    };
    
    bookings.forEach(booking => {
      if (booking.status === 'confirmed' && booking.status !== 'cancelled') {
        const amount = parseFloat(booking.price?.total || 0);
        const currency = booking.price?.currency || 'USD';
        
        expenseSummary.totalAmount += amount;
        
        // 按货币分类统计
        if (!expenseSummary.totalAmountByCurrency[currency]) {
          expenseSummary.totalAmountByCurrency[currency] = 0;
        }
        expenseSummary.totalAmountByCurrency[currency] += amount;
        
        // 可核销费用
        expenseSummary.reimbursableAmount += amount;
        expenseSummary.reimbursableBookings.push({
          bookingId: booking._id,
          bookingReference: booking.bookingReference,
          amadeusOrderId: booking.amadeusOrderId,
          amount,
          currency,
          departureDate: booking.flightOffer?.itineraries?.[0]?.segments?.[0]?.departure?.at,
          arrivalDate: booking.flightOffer?.itineraries?.[0]?.segments?.[booking.flightOffer.itineraries[0].segments.length - 1]?.arrival?.at,
          origin: booking.flightOffer?.itineraries?.[0]?.segments?.[0]?.departure?.iataCode,
          destination: booking.flightOffer?.itineraries?.[0]?.segments?.[booking.flightOffer.itineraries[0].segments.length - 1]?.arrival?.iataCode,
          travelers: booking.travelers?.length || 0,
          status: booking.status,
        });
      }
    });
    
    // 5. 返回结果
    res.json({
      success: true,
      data: {
        travel: {
          _id: travel._id,
          travelNumber: travel.travelNumber,
          title: travel.title,
          status: travel.status,
          employee: travel.employee,
          startDate: travel.startDate,
          endDate: travel.endDate,
        },
        bookings: bookings.map(booking => ({
          _id: booking._id,
          bookingReference: booking.bookingReference,
          amadeusOrderId: booking.amadeusOrderId,
          status: booking.status,
          price: booking.price,
          flightOffer: {
            itineraries: booking.flightOffer?.itineraries || [],
            price: booking.flightOffer?.price,
          },
          travelers: booking.travelers || [],
          createdAt: booking.createdAt,
          cancelledAt: booking.cancelledAt,
        })),
        expenseSummary,
      },
    });
  } catch (error) {
    logger.error('根据差旅单号查询机票预订失败:', error);
    
    // 处理 AppError
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || '查询机票预订失败',
    });
  }
};

/**
 * 获取预订详情
 * @route GET /api/flights/bookings/:id
 * @access Private
 */
exports.getBooking = async (req, res) => {
  try {
    const booking = await FlightBooking.findById(req.params.id)
      .populate('travelId', 'travelNumber title status')
      .populate('employee', 'firstName lastName email');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: '预订记录不存在',
      });
    }
    
    // 数据权限检查
    // booking.employee 已经被 populate，需要使用 _id 或 id 来比较
    const employeeId = booking.employee._id || booking.employee.id || booking.employee;
    const isOwner = employeeId.toString() === req.user.id.toString();
    
    // 检查是否是管理员角色（系统管理员或其他管理角色）
    const Role = require('../models/Role');
    const userRole = await Role.findOne({ code: req.user.role, isActive: true }).lean();
    const isAdmin = userRole && (userRole.code === 'ADMIN' || userRole.permissions?.includes('flights:manage:all'));
    
    if (!isOwner && !isAdmin) {
      logger.warn('权限检查失败:', {
        bookingId: req.params.id,
        bookingEmployeeId: employeeId.toString(),
        currentUserId: req.user.id.toString(),
        userRole: req.user.role,
        isAdmin,
      });
      throw ErrorFactory.forbidden('无权访问该预订');
    }
    
    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    logger.error('获取预订详情失败:', error);
    
    // 处理 AppError
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || '获取预订详情失败',
    });
  }
};

/**
 * 取消预订（同步更新差旅申请）
 * @route DELETE /api/flights/bookings/:id
 * @access Private
 */
exports.cancelBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const booking = await FlightBooking.findById(id).session(session);
    if (!booking) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: '预订记录不存在',
      });
    }
    
    // 数据权限检查
    const isOwner = booking.employee.toString() === req.user.id.toString();
    
    // 检查是否是管理员角色
    const Role = require('../models/Role');
    const userRole = await Role.findOne({ code: req.user.role, isActive: true }).session(null).lean();
    const isAdmin = userRole && (userRole.code === 'ADMIN' || userRole.permissions?.includes('flights:manage:all'));
    
    if (!isOwner && !isAdmin) {
      await session.abortTransaction();
      logger.warn('取消预订权限检查失败:', {
        bookingId: id,
        bookingEmployeeId: booking.employee.toString(),
        currentUserId: req.user.id.toString(),
        userRole: req.user.role,
        isAdmin,
      });
      throw ErrorFactory.forbidden('无权取消该预订');
    }
    
    if (booking.status === 'cancelled') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: '预订已取消',
      });
    }
    
    // 调用 Amadeus API 取消订单
    if (booking.amadeusOrderId) {
      try {
        await amadeusApiService.cancelFlightOrder(booking.amadeusOrderId);
      } catch (error) {
        logger.error('Amadeus 取消订单失败:', error);
        // 如果 Amadeus API 取消失败，仍然更新本地状态
        // 但记录错误以便后续处理
      }
    }
    
    // 更新预订记录
    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.cancelledAt = new Date();
    await booking.save({ session });
    
    // 更新关联的差旅申请
    if (booking.travelId) {
      const travel = await Travel.findById(booking.travelId).session(session);
      if (travel) {
        const bookingIndex = travel.bookings.findIndex(
          b => b.flightBookingId && b.flightBookingId.toString() === booking._id.toString()
        );
        
        if (bookingIndex !== -1) {
          travel.bookings[bookingIndex].status = 'cancelled';
        }
        
        // 如果预订是已确认状态，需要从 estimatedCost 中扣除费用
        if (booking.status === 'confirmed') {
          const bookingCost = parseFloat(booking.price?.total || 0);
          travel.estimatedCost = Math.max(0, (travel.estimatedCost || 0) - bookingCost);
        }
        
        await travel.save({ session });
      }
    }
    
    await session.commitTransaction();
    
    // 发送通知（可选）
    try {
      if (notificationService && typeof notificationService.sendBookingCancellation === 'function') {
        await notificationService.sendBookingCancellation(req.user.id, booking, reason);
      }
    } catch (notifError) {
      logger.warn('发送取消预订通知失败:', notifError);
      // 不影响主流程
    }
    
    res.json({
      success: true,
      message: '预订已取消',
      data: booking,
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error('取消预订失败:', error);
    
    // 处理 AppError
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || '取消预订失败',
    });
  } finally {
    session.endSession();
  }
};

