const mongoose = require('mongoose');
const { ReadPreference } = require('mongodb');
const logger = require('../utils/logger');
const HotelBooking = require('../models/HotelBooking');
const Travel = require('../models/Travel');
const User = require('../models/User');
const Role = require('../models/Role');
const { checkResourceAccess } = require('../middleware/dataAccess');
const { buildDataScopeQuery } = require('../utils/dataScope');
const { ErrorFactory } = require('../utils/AppError');
const amadeusApiService = require('../services/amadeus');
const notificationService = require('../services/notificationService');

/**
 * 搜索酒店（通过地理坐标）
 * @route POST /api/hotels/search-by-geocode
 * @access Private
 */
exports.searchHotelsByGeocode = async (req, res) => {
  try {
    const { latitude, longitude, radius = 5, hotelSource = 'ALL' } = req.body;

    // 参数验证
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: '缺少必填参数：latitude 和 longitude',
      });
    }

    // 调用 SDK 服务
    const result = await amadeusApiService.searchHotelsByGeocode({
      latitude,
      longitude,
      radius,
      hotelSource,
    });

    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
      count: result.data ? result.data.length : 0,
    });
  } catch (error) {
    logger.error('通过地理坐标搜索酒店失败:', error);
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || '搜索酒店失败',
    });
  }
};

/**
 * 搜索酒店（通过城市）
 * @route POST /api/hotels/search-by-city
 * @access Private
 */
exports.searchHotelsByCity = async (req, res) => {
  try {
    const { cityCode, hotelSource = 'ALL' } = req.body;

    // 参数验证
    if (!cityCode) {
      return res.status(400).json({
        success: false,
        message: '缺少必填参数：cityCode',
      });
    }

    // 调用 SDK 服务
    const result = await amadeusApiService.searchHotelsByCity({
      cityCode,
      hotelSource,
    });

    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
      count: result.data ? result.data.length : 0,
    });
  } catch (error) {
    logger.error('通过城市搜索酒店失败:', error);
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || '搜索酒店失败',
    });
  }
};

/**
 * 搜索酒店（通过酒店ID）
 * @route POST /api/hotels/search-by-hotels
 * @access Private
 */
exports.searchHotelsByHotels = async (req, res) => {
  try {
    const { hotelIds } = req.body;

    // 参数验证
    if (!hotelIds) {
      return res.status(400).json({
        success: false,
        message: '缺少必填参数：hotelIds',
      });
    }

    // 调用 SDK 服务
    const result = await amadeusApiService.searchHotelsByHotels({
      hotelIds,
    });

    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
      count: result.data ? result.data.length : 0,
    });
  } catch (error) {
    logger.error('通过酒店ID搜索酒店失败:', error);
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || '搜索酒店失败',
    });
  }
};

/**
 * 搜索酒店报价
 * @route POST /api/hotels/search-offers
 * @access Private
 */
exports.searchHotelOffers = async (req, res) => {
  try {
    const {
      hotelIds,
      checkInDate,
      checkOutDate,
      adults = 1,
      roomQuantity = 1,
      currencyCode = 'USD',
    } = req.body;

    // 参数验证
    if (!hotelIds) {
      return res.status(400).json({
        success: false,
        message: '缺少必填参数：hotelIds',
      });
    }
    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({
        success: false,
        message: '缺少必填参数：checkInDate 和 checkOutDate',
      });
    }

    // 调用 SDK 服务
    const result = await amadeusApiService.searchHotelOffersByHotel({
      hotelIds,
      checkInDate,
      checkOutDate,
      adults,
      roomQuantity,
      currencyCode,
    });

    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
      count: result.data ? result.data.length : 0,
    });
  } catch (error) {
    logger.error('搜索酒店报价失败:', {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
      stack: error.stack,
      hotelIds: Array.isArray(hotelIds) ? `${hotelIds.length}个酒店` : hotelIds,
      error: error,
    });
    
    const status = error.statusCode || 500;
    const message = error.message || '搜索酒店报价失败';
    
    res.status(status).json({
      success: false,
      message,
      ...(process.env.NODE_ENV === 'development' && {
        error: error.name,
        code: error.code,
      }),
    });
  }
};

/**
 * 确认酒店价格
 * @route POST /api/hotels/confirm-price
 * @access Private
 */
exports.confirmPrice = async (req, res) => {
  try {
    const { offerId } = req.body;

    if (!offerId) {
      return res.status(400).json({
        success: false,
        message: 'offerId参数必填',
      });
    }

    // 调用 SDK 服务
    const result = await amadeusApiService.confirmHotelPrice(offerId);

    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    logger.error('确认酒店价格失败:', error);
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || '确认酒店价格失败',
    });
  }
};

/**
 * 获取酒店评分
 * @route GET /api/hotels/ratings
 * @access Private
 */
exports.getHotelRatings = async (req, res) => {
  try {
    const { hotelIds } = req.query;

    if (!hotelIds) {
      return res.status(400).json({
        success: false,
        message: '缺少必填参数：hotelIds',
      });
    }

    // 调用 SDK 服务
    const result = await amadeusApiService.getHotelRatings({ hotelIds });

    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
      count: result.data ? result.data.length : 0,
    });
  } catch (error) {
    logger.error('获取酒店评分失败:', error);
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || '获取酒店评分失败',
    });
  }
};

/**
 * 创建预订（必须关联差旅申请）
 * @route POST /api/hotels/bookings
 * @access Private
 */
exports.createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction({
    readPreference: ReadPreference.PRIMARY,
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' },
  });

  try {
    const { travelId, offerId, hotelOffer, guests, payments, rooms, specialRequests } = req.body;

    // 调试：记录接收到的 hotelOffer 信息
    logger.debug('接收到的 hotelOffer 数据结构:', {
      hasHotelOffer: !!hotelOffer,
      hotelOfferType: hotelOffer?.type,
      hasHotel: !!hotelOffer?.hotel,
      hotelId: hotelOffer?.hotel?.hotelId,
      hotelName: hotelOffer?.hotel?.name,
      hasAddress: !!hotelOffer?.hotel?.address,
      address: hotelOffer?.hotel?.address,
      cityCode: hotelOffer?.hotel?.cityCode,
      cityName: hotelOffer?.hotel?.address?.cityName,
      countryCode: hotelOffer?.hotel?.address?.countryCode,
      hotelOfferKeys: hotelOffer ? Object.keys(hotelOffer) : [],
      hotelKeys: hotelOffer?.hotel ? Object.keys(hotelOffer.hotel) : [],
    });

    // 1. 验证 travelId 必填
    if (!travelId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'travelId参数必填：酒店预订必须关联差旅申请',
      });
    }

    // 2. 验证 offerId 和 hotelOffer 必填
    if (!offerId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'offerId参数必填',
      });
    }
    if (!hotelOffer) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'hotelOffer参数必填：酒店报价信息不能为空',
      });
    }

    // 3. 验证 guests 必填
    if (!guests || !Array.isArray(guests) || guests.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'guests参数必填：至少需要一个客人信息',
      });
    }

    // 4. 验证差旅申请存在且属于当前用户
    const travel = await Travel.findById(travelId).session(session);
    if (!travel) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: '差旅申请不存在',
      });
    }

    // 5. 数据权限检查
    const hasAccess = await checkResourceAccess(req, travel, 'travel', 'employee');
    if (!hasAccess) {
      await session.abortTransaction();
      throw ErrorFactory.forbidden('无权访问该差旅申请');
    }

    // 6. 验证差旅申请状态允许添加预订
    if (!['draft', 'approved'].includes(travel.status)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: '当前差旅申请状态不允许添加预订',
      });
    }

    // 7. 构建 payment 参数（v2 API 要求）
    // 如果前端没有提供 payment，使用默认测试支付信息
    let payment = null;
    if (payments && payments.length > 0) {
      // 使用第一个支付信息，转换为 v2 API 格式
      const firstPayment = payments[0];
      payment = {
        method: firstPayment.method || 'CREDIT_CARD',
        paymentCard: {
          paymentCardInfo: {
            vendorCode: firstPayment.vendorCode || 'VI', // VI=Visa, MC=MasterCard, AX=American Express
            cardNumber: firstPayment.cardNumber || '',
            expiryDate: firstPayment.expiryDate || '', // YYYY-MM 格式
            holderName: firstPayment.holderName || '',
          },
        },
      };
    } else {
      // 如果没有提供支付信息，使用默认测试支付信息（仅用于测试环境）
      // 注意：生产环境应该要求前端提供支付信息
      if (process.env.NODE_ENV === 'production') {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'payment参数必填：生产环境必须提供支付信息',
        });
      }
      // 测试环境使用默认测试卡号
      const guestName = guests[0]?.name;
      const holderName = guestName 
        ? `${guestName.firstName.toUpperCase()} ${guestName.lastName.toUpperCase()}`
        : 'TEST USER';
      
      payment = {
        method: 'CREDIT_CARD',
        paymentCard: {
          paymentCardInfo: {
            vendorCode: 'VI', // Visa
            cardNumber: '4151289722471370', // 测试卡号
            expiryDate: '2026-08', // YYYY-MM 格式
            holderName: holderName,
          },
        },
      };
    }

    // 8. 调用 Amadeus API 创建预订
    const bookingResult = await amadeusApiService.createHotelBooking({
      offerId,
      guests,
      payment, // v2 API 要求 payment（单数）
      travelAgentEmail: req.user.email, // 使用当前用户的邮箱作为旅行社邮箱
    });

    if (!bookingResult.success || !bookingResult.data) {
      await session.abortTransaction();
      return res.status(500).json({
        success: false,
        message: 'Amadeus API 创建预订失败',
      });
    }

    // 9. 提取预订信息
    const bookingData = bookingResult.data;
    const hotelInfo = hotelOffer.hotel || {};
    const priceInfo = bookingData.price || hotelOffer.offers?.[0]?.price || {};
    const offerInfo = hotelOffer.offers?.[0] || {};

    // 10. 构建预订文档
    // 确保地址信息完整：优先使用 hotelOffer.hotel.address，如果不存在则尝试从其他字段提取
    // 注意：hotelOffer 可能来自不同的API响应，需要检查多个可能的路径
    const hotelAddress = hotelInfo.address || 
                        hotelOffer.hotel?.address || 
                        (hotelOffer.type === 'hotel-offers' ? hotelOffer.hotel?.address : null) ||
                        {};
    
    // 记录调试信息
    logger.debug('保存酒店预订 - 地址信息检查:', {
      hasHotelInfoAddress: !!hotelInfo.address,
      hasHotelOfferHotelAddress: !!hotelOffer.hotel?.address,
      hotelInfoAddress: hotelInfo.address,
      hotelOfferHotelAddress: hotelOffer.hotel?.address,
      hotelOfferType: hotelOffer.type,
      cityCode: hotelInfo.cityCode,
      cityName: hotelAddress.cityName || hotelInfo.address?.cityName,
      countryCode: hotelAddress.countryCode || hotelInfo.address?.countryCode,
      fullHotelOffer: JSON.stringify(hotelOffer, null, 2).substring(0, 500), // 只记录前500字符
    });

    const bookingDoc = {
      travelId,
      employee: req.user.id,
      bookingReference: bookingData.associatedRecords?.reference,
      amadeusBookingId: bookingData.id,
      hotelOffer: hotelOffer, // 存储完整的报价信息
      hotel: {
        hotelId: hotelInfo.hotelId,
        name: hotelInfo.name || '',
        chainCode: hotelInfo.chainCode,
        iataCode: hotelInfo.iataCode,
        cityCode: hotelInfo.cityCode,
        geoCode: hotelInfo.geoCode || hotelInfo.latitude ? {
          latitude: hotelInfo.latitude,
          longitude: hotelInfo.longitude,
        } : undefined,
        // 确保地址对象完整，包含所有可能的字段
        // 优先使用 hotelInfo.address，如果不存在则使用 hotelOffer.hotel.address
        address: hotelAddress && Object.keys(hotelAddress).length > 0 ? {
          countryCode: hotelAddress.countryCode || hotelInfo.countryCode,
          postalCode: hotelAddress.postalCode,
          stateCode: hotelAddress.stateCode,
          cityName: hotelAddress.cityName || hotelInfo.cityName,
          lines: Array.isArray(hotelAddress.lines) ? hotelAddress.lines : (hotelAddress.lines ? [hotelAddress.lines] : (hotelAddress.lines ? [String(hotelAddress.lines)] : [])),
          region: hotelAddress.region,
        } : undefined, // 如果没有地址信息，设置为 undefined 而不是空对象
      },
      checkIn: new Date(offerInfo.checkInDate || hotelOffer.checkInDate),
      checkOut: new Date(offerInfo.checkOutDate || hotelOffer.checkOutDate),
      // 转换 guests 格式：v2 API 返回的格式需要转换为模型期望的格式
      // v2 API 格式: { tid, title, firstName, lastName, phone, email }
      // 模型格式: { id, name: { firstName, lastName }, contact: { emailAddress, phones } }
      guests: (bookingData.guests && Array.isArray(bookingData.guests)) 
        ? bookingData.guests.map((guest, index) => ({
            id: guest.id || `GUEST_${index + 1}`,
            name: {
              firstName: guest.firstName || '',
              lastName: guest.lastName || '',
            },
            contact: {
              emailAddress: guest.email || '',
              phones: guest.phone ? [{
                deviceType: 'MOBILE',
                countryCallingCode: guest.phone.match(/^\+(\d+)/)?.[1] || '',
                number: guest.phone.replace(/^\+\d+/, '') || guest.phone,
              }] : [],
            },
          }))
        : guests.map((guest, index) => ({
            id: guest.id || `GUEST_${index + 1}`,
            name: {
              firstName: guest.name?.firstName || '',
              lastName: guest.name?.lastName || '',
            },
            contact: {
              emailAddress: guest.contact?.emailAddress || '',
              phones: guest.contact?.phones || [],
            },
          })),
      adults: offerInfo.guests?.adults || guests.length,
      children: offerInfo.guests?.children || 0,
      rooms: bookingData.rooms || rooms || [{
        type: offerInfo.room?.type,
        typeEstimated: offerInfo.room?.typeEstimated,
        description: offerInfo.room?.description,
        guests: offerInfo.guests?.adults || 1,
      }],
      roomQuantity: rooms?.length || 1,
      price: {
        total: priceInfo.total || '0',
        currency: priceInfo.currency || 'USD',
        base: priceInfo.base,
        // 确保 taxes 是正确的对象数组格式
        // 处理各种可能的格式：数组、字符串化的数组、字符串等
        taxes: (() => {
          let taxesValue = priceInfo.taxes;
          
          // 如果是字符串，尝试解析
          if (typeof taxesValue === 'string') {
            try {
              // 尝试解析 JSON
              taxesValue = JSON.parse(taxesValue);
            } catch (e) {
              // 如果解析失败，尝试替换单引号为双引号后再解析
              try {
                const normalized = taxesValue.replace(/'/g, '"');
                taxesValue = JSON.parse(normalized);
              } catch (e2) {
                // 如果还是失败，返回空数组
                logger.warn('无法解析 taxes 字符串，返回空数组:', taxesValue);
                return [];
              }
            }
          }
          
          // 确保是数组
          if (!Array.isArray(taxesValue)) {
            return [];
          }
          
          // 转换每个 tax 对象
          return taxesValue.map(tax => {
            // 如果 tax 是字符串，跳过
            if (typeof tax === 'string') {
              return null;
            }
            // 如果是对象，提取字段
            if (tax && typeof tax === 'object') {
              return {
                amount: String(tax.amount || tax.value || '0'),
                code: tax.code || tax.type || undefined,
                type: tax.type || tax.code || undefined,
              };
            }
            return null;
          }).filter(Boolean); // 过滤掉 null 值
        })(),
        variations: priceInfo.variations,
      },
      priceAmount: parseFloat(priceInfo.total || 0),
      offerId,
      rateCode: offerInfo.rateCode,
      cancellationPolicy: {
        cancellations: offerInfo.policies?.cancellations || [],
        paymentType: offerInfo.policies?.paymentType,
        refundable: offerInfo.policies?.refundable,
      },
      status: 'confirmed',
      statusHistory: [{
        status: 'confirmed',
        changedAt: new Date(),
        changedBy: req.user.id,
      }],
      confirmation: {
        confirmationNumber: bookingData.associatedRecords?.reference,
        confirmationCode: bookingData.id,
        confirmationUrl: bookingData.self,
      },
      specialRequests,
      syncStatus: 'synced',
      lastSyncedAt: new Date(),
    };

    // 11. 保存预订记录到数据库
    const hotelBooking = await HotelBooking.create([bookingDoc], { session });

    // 12. 更新差旅申请（在同一事务中）
    const bookingCost = parseFloat(priceInfo.total || 0);
    
    travel.bookings.push({
      type: 'hotel',
      provider: 'Amadeus',
      bookingReference: bookingData.associatedRecords?.reference,
      amadeusBookingId: bookingData.id,
      hotelBookingId: hotelBooking[0]._id,
      cost: bookingCost,
      currency: priceInfo.currency || 'USD',
      status: 'confirmed',
      details: {
        hotelName: hotelInfo.name || '',
        checkIn: bookingDoc.checkIn,
        checkOut: bookingDoc.checkOut,
        guests: guests.length,
        rooms: rooms?.length || 1,
      },
    });

    travel.estimatedCost = (travel.estimatedCost || 0) + bookingCost;
    await travel.save({ session });

    // 13. 提交事务
    await session.commitTransaction();

    // 14. 发送通知
    try {
      if (notificationService && typeof notificationService.sendBookingConfirmation === 'function') {
        await notificationService.sendBookingConfirmation(req.user.id, hotelBooking[0]);
      }
    } catch (notifError) {
      logger.warn('发送预订确认通知失败:', notifError);
      // 不影响主流程
    }

    res.json({
      success: true,
      data: hotelBooking[0],
      message: '酒店预订成功',
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error(`创建酒店预订失败: ${error.message}`);
    logger.error(`错误堆栈: ${error.stack}`);
    
    // 处理 AppError（但不使用 401，避免前端跳转到登录页）
    if (error.statusCode && error.statusCode !== 401) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    
    // 对于 401 或其他错误，统一返回 500
    res.status(500).json({
      success: false,
      message: error.message || '创建酒店预订失败',
    });
  } finally {
    session.endSession();
  }
};

/**
 * 获取预订列表（支持按差旅申请筛选、分页和搜索）
 * @route GET /api/hotels/bookings
 * @access Private
 */
exports.getBookings = async (req, res) => {
  try {
    const { travelId, status, page = 1, limit = 20, search } = req.query;
    
    // 获取用户和角色信息
    const [user, role] = await Promise.all([
      User.findById(req.user.id),
      Role.findOne({ code: req.user.role, isActive: true }).lean(),
    ]);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      });
    }
    
    // 检查功能权限：是否有查看酒店预订的权限
    const hasPermission = role && (
      role.code === 'ADMIN' || 
      role.permissions?.includes('hotel.booking.view') ||
      role.permissions?.includes('hotels:manage:all')
    );
    
    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: '无权查看酒店预订列表',
      });
    }
    
    // 使用统一的数据权限管理构建查询条件
    const dataScopeQuery = await buildDataScopeQuery(user, role, 'employee');
    
    // 合并查询条件
    let query = { ...dataScopeQuery };
    
    if (travelId) {
      query.travelId = travelId; // 按差旅申请筛选
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // 搜索功能：支持按预订参考号、差旅单号搜索
    // 如果搜索差旅单号，需要先查找对应的 Travel 文档
    if (search && search.trim()) {
      const searchTerm = search.trim();
      const searchRegex = { $regex: searchTerm, $options: 'i' };
      
      // 如果搜索差旅单号，先查找对应的 Travel 文档
      // 使用统一的数据权限管理构建差旅申请查询条件
      const travelDataScopeQuery = await buildDataScopeQuery(user, role, 'employee');
      const travelQuery = {
        ...travelDataScopeQuery,
        travelNumber: searchRegex,
      };
      
      const matchingTravels = await Travel.find(travelQuery).select('_id').lean();
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
    const total = await HotelBooking.countDocuments(query);
    
    // 获取数据
    const bookings = await HotelBooking.find(query)
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
 * 获取差旅申请的酒店预订
 * @route GET /api/travel/:id/hotels
 * @access Private
 */
exports.getTravelHotels = async (req, res) => {
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
    
    const bookings = await HotelBooking.find({ travelId })
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
    logger.error('获取差旅申请酒店预订失败:', error);
    
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || '获取酒店预订失败',
    });
  }
};

/**
 * 根据差旅单号查询酒店预订及费用（用于核销）
 * @route GET /api/hotels/bookings/by-travel-number/:travelNumber
 * @access Private
 * 
 * 用途：在费用核销时，根据差旅单号查询该差旅申请关联的所有酒店预订及费用汇总
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
    
    // 3. 查询该差旅申请关联的所有酒店预订
    const bookings = await HotelBooking.find({ travelId: travel._id })
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
          amadeusBookingId: booking.amadeusBookingId,
          amount,
          currency,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          hotelName: booking.hotel?.name,
          guests: booking.guests?.length || 0,
          rooms: booking.rooms?.length || 1,
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
          amadeusBookingId: booking.amadeusBookingId,
          status: booking.status,
          price: booking.price,
          hotel: booking.hotel,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          guests: booking.guests || [],
          rooms: booking.rooms || [],
          createdAt: booking.createdAt,
          cancelledAt: booking.cancelledAt,
        })),
        expenseSummary,
      },
    });
  } catch (error) {
    logger.error('根据差旅单号查询酒店预订失败:', error);
    
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || '查询酒店预订失败',
    });
  }
};

/**
 * 获取预订详情
 * @route GET /api/hotels/bookings/:id
 * @access Private
 */
exports.getBooking = async (req, res) => {
  try {
    const booking = await HotelBooking.findById(req.params.id)
      .populate('travelId', 'travelNumber title status')
      .populate('employee', 'firstName lastName email');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: '预订记录不存在',
      });
    }
    
    // 数据权限检查
    if (booking.employee.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      throw ErrorFactory.forbidden('无权访问该预订');
    }
    
    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    logger.error('获取预订详情失败:', error);
    
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
 * @route DELETE /api/hotels/bookings/:id
 * @access Private
 */
exports.cancelBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction({
    readPreference: ReadPreference.PRIMARY,
    readConcern: { level: 'snapshot' },
    writeConcern: { w: 'majority' },
  });

  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const booking = await HotelBooking.findById(id).session(session);
    if (!booking) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: '预订记录不存在',
      });
    }
    
    if (booking.employee.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
      await session.abortTransaction();
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
    if (booking.amadeusBookingId) {
      try {
        await amadeusApiService.cancelHotelBooking(booking.amadeusBookingId);
      } catch (error) {
        logger.error('Amadeus 取消订单失败:', error);
        // 即使 Amadeus API 失败，也继续更新本地状态
      }
    }
    
    // 更新预订记录
    booking.status = 'cancelled';
    booking.cancellationReason = reason;
    booking.cancelledAt = new Date();
    booking.cancelledBy = req.user.id;
    booking.statusHistory.push({
      status: 'cancelled',
      changedAt: new Date(),
      changedBy: req.user.id,
      reason,
    });
    await booking.save({ session });
    
    // 更新关联的差旅申请
    if (booking.travelId) {
      const travel = await Travel.findById(booking.travelId).session(session);
      if (travel) {
        const bookingIndex = travel.bookings.findIndex(
          b => b.hotelBookingId && b.hotelBookingId.toString() === booking._id.toString()
        );
        
        if (bookingIndex !== -1) {
          travel.bookings[bookingIndex].status = 'cancelled';
        }
        
        if (booking.status === 'confirmed') {
          const bookingCost = parseFloat(booking.price?.total || 0);
          travel.estimatedCost = Math.max(0, (travel.estimatedCost || 0) - bookingCost);
        }
        
        await travel.save({ session });
      }
    }
    
    await session.commitTransaction();
    
    // 发送通知
    try {
      if (notificationService && typeof notificationService.sendBookingCancellation === 'function') {
        await notificationService.sendBookingCancellation(req.user.id, booking, reason);
      }
    } catch (notifError) {
      logger.warn('发送取消通知失败:', notifError);
      // 不影响主流程
    }
    
    res.json({
      success: true,
      message: '预订已取消',
      data: booking,
    });
  } catch (error) {
    await session.abortTransaction();
    logger.error(`取消预订失败: ${error.message}`);
    logger.error(`错误堆栈: ${error.stack}`);
    
    // 处理 AppError（但不使用 401，避免前端跳转到登录页）
    if (error.statusCode && error.statusCode !== 401) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    
    // 对于 401 或其他错误，统一返回 500
    res.status(500).json({
      success: false,
      message: error.message || '取消预订失败',
    });
  } finally {
    session.endSession();
  }
};

