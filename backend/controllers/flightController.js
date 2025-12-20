const mongoose = require('mongoose');
const logger = require('../utils/logger');
const FlightBooking = require('../models/FlightBooking');
const Travel = require('../models/Travel');
const { checkResourceAccess } = require('../middleware/dataAccess');
const { ErrorFactory } = require('../utils/AppError');
const amadeusApiService = require('../services/amadeus');
const notificationService = require('../services/notificationService');

/**
 * 搜索航班
 * @route POST /api/flights/search
 * @access Private
 */
exports.searchFlights = async (req, res) => {
  try {
    const {
      originLocationCode,
      destinationLocationCode,
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
    if (!originLocationCode || !destinationLocationCode || !departureDate) {
      return res.status(400).json({
        success: false,
        message: '缺少必填参数：originLocationCode, destinationLocationCode, departureDate',
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
      originLocationCode,
      destinationLocationCode,
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
    const { flightOffer } = req.body;

    if (!flightOffer || !flightOffer.id) {
      return res.status(400).json({
        success: false,
        message: 'flightOffer参数无效：必须包含完整的航班报价对象',
      });
    }

    // 调用 Amadeus API 确认价格
    const result = await amadeusApiService.confirmFlightPrice(flightOffer);

    res.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    logger.error('确认航班价格失败:', error);
    res.status(500).json({
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { travelId, flightOffer, travelers } = req.body;

    // 1. 验证 travelId 必填
    if (!travelId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'travelId参数必填：机票预订必须关联差旅申请',
      });
    }

    // 2. 验证差旅申请存在且属于当前用户
    const travel = await Travel.findById(travelId).session(session);
    if (!travel) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: '差旅申请不存在',
      });
    }

    // 3. 数据权限检查
    const hasAccess = await checkResourceAccess(req, travel, 'travel', 'employee');
    if (!hasAccess) {
      await session.abortTransaction();
      throw ErrorFactory.forbidden('无权访问该差旅申请');
    }

    // 4. 验证差旅申请状态允许添加预订
    if (!['draft', 'approved'].includes(travel.status)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: '当前差旅申请状态不允许添加预订',
      });
    }

    // 5. 调用 Amadeus API 创建预订
    const bookingResult = await amadeusApiService.createFlightOrder({
      flightOffer,
      travelers,
    });

    // 6. 保存预订记录到数据库
    const flightBooking = await FlightBooking.create([{
      travelId,
      employee: req.user.id,
      bookingReference: bookingResult.data.associatedRecords?.airline?.reference,
      amadeusOrderId: bookingResult.data.id,
      flightOffer: bookingResult.data.flightOffers[0],
      travelers: bookingResult.data.travelers,
      status: 'confirmed',
      price: {
        total: bookingResult.data.price?.total,
        currency: bookingResult.data.price?.currency,
        base: bookingResult.data.price?.base,
        fees: bookingResult.data.price?.fees || [],
      },
    }], { session });

    // 7. 更新差旅申请（在同一事务中）
    const bookingCost = parseFloat(bookingResult.data.price?.total || 0);
    
    travel.bookings.push({
      type: 'flight',
      provider: 'Amadeus',
      bookingReference: bookingResult.data.associatedRecords?.airline?.reference,
      amadeusOrderId: bookingResult.data.id,
      flightBookingId: flightBooking[0]._id,
      cost: bookingCost,
      currency: bookingResult.data.price?.currency || 'USD',
      status: 'confirmed',
      details: {
        origin: flightOffer.itineraries[0]?.segments[0]?.departure?.iataCode,
        destination: flightOffer.itineraries[0]?.segments[flightOffer.itineraries[0].segments.length - 1]?.arrival?.iataCode,
        departureDate: flightOffer.itineraries[0]?.segments[0]?.departure?.at,
        returnDate: flightOffer.itineraries[1]?.segments[0]?.departure?.at,
        travelers: travelers.length,
      },
    });

    travel.estimatedCost = (travel.estimatedCost || 0) + bookingCost;
    await travel.save({ session });

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
    await session.abortTransaction();
    logger.error('创建机票预订失败:', error);
    
    // 处理 AppError
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || '创建机票预订失败',
    });
  } finally {
    session.endSession();
  }
};

/**
 * 获取预订列表（支持按差旅申请筛选）
 * @route GET /api/flights/bookings
 * @access Private
 */
exports.getBookings = async (req, res) => {
  try {
    const { travelId, status } = req.query;
    
    let query = {};
    query.employee = req.user.id; // 数据权限：只能查看自己的预订
    
    if (travelId) {
      query.travelId = travelId; // 按差旅申请筛选
    }
    
    if (status) {
      query.status = status;
    }
    
    const bookings = await FlightBooking.find(query)
      .populate('travelId', 'travelNumber title status')
      .populate('employee', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
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
    if (booking.employee.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
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

