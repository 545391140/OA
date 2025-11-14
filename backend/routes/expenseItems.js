const express = require('express');
const { body } = require('express-validator');
const {
  // 通用费用项（简化模型）
  getExpenseItems,
  createExpenseItem,
  updateExpenseItem,
  deleteExpenseItem,
  enableExpenseItem,
  disableExpenseItem,
  // 交通标准
  getTransportStandards,
  createTransportStandard,
  updateTransportStandard,
  deleteTransportStandard,
  // 住宿标准
  getAccommodationStandards,
  createAccommodationStandard,
  updateAccommodationStandard,
  deleteAccommodationStandard,
  // 餐饮标准
  getMealStandards,
  createMealStandard,
  updateMealStandard,
  deleteMealStandard,
  // 津贴标准
  getAllowanceStandards,
  createAllowanceStandard,
  updateAllowanceStandard,
  deleteAllowanceStandard,
  // 其他费用标准
  getOtherExpenseStandards,
  getOtherExpenseTypes,
  createOtherExpenseStandard,
  updateOtherExpenseStandard,
  deleteOtherExpenseStandard
} = require('../controllers/expenseItemController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// ==================== 交通标准路由 ====================
// 注意：这些路由需要放在通用路由之前，避免路由冲突
router.get('/:standardId/transport', getTransportStandards);
router.post(
  '/:standardId/transport',
  [
    authorize('admin', 'finance'),
    body('jobLevelCode').notEmpty().withMessage('Job level code is required'),
    body('transportType').isIn(['flight', 'train', 'bus', 'car', 'other']).withMessage('Invalid transport type'),
    body('seatClass').notEmpty().withMessage('Seat class is required'),
    body('maxAmount').isFloat({ min: 0 }).withMessage('Max amount must be a positive number')
  ],
  createTransportStandard
);
router.put(
  '/transport/:id',
  [
    authorize('admin', 'finance'),
    body('maxAmount').optional().isFloat({ min: 0 }).withMessage('Max amount must be a positive number')
  ],
  updateTransportStandard
);
router.delete('/transport/:id', authorize('admin'), deleteTransportStandard);

// ==================== 住宿标准路由 ====================
router.get('/:standardId/accommodation', getAccommodationStandards);
router.post(
  '/:standardId/accommodation',
  [
    authorize('admin', 'finance'),
    body('jobLevelCode').notEmpty().withMessage('Job level code is required'),
    body('cityLevel').isInt({ min: 1, max: 4 }).withMessage('City level must be between 1 and 4'),
    body('maxAmountPerNight').isFloat({ min: 0 }).withMessage('Max amount per night must be a positive number')
  ],
  createAccommodationStandard
);
router.put(
  '/accommodation/:id',
  [
    authorize('admin', 'finance'),
    body('maxAmountPerNight').optional().isFloat({ min: 0 }).withMessage('Max amount per night must be a positive number')
  ],
  updateAccommodationStandard
);
router.delete('/accommodation/:id', authorize('admin'), deleteAccommodationStandard);

// ==================== 餐饮标准路由 ====================
router.get('/:standardId/meal', getMealStandards);
router.post(
  '/:standardId/meal',
  [
    authorize('admin', 'finance'),
    body('jobLevelCode').notEmpty().withMessage('Job level code is required'),
    body('cityLevel').isInt({ min: 1, max: 4 }).withMessage('City level must be between 1 and 4'),
    body('dailyTotal').isFloat({ min: 0 }).withMessage('Daily total must be a positive number')
  ],
  createMealStandard
);
router.put(
  '/meal/:id',
  [
    authorize('admin', 'finance'),
    body('dailyTotal').optional().isFloat({ min: 0 }).withMessage('Daily total must be a positive number')
  ],
  updateMealStandard
);
router.delete('/meal/:id', authorize('admin'), deleteMealStandard);

// ==================== 津贴标准路由 ====================
router.get('/:standardId/allowance', getAllowanceStandards);
router.post(
  '/:standardId/allowance',
  [
    authorize('admin', 'finance'),
    body('jobLevelCode').notEmpty().withMessage('Job level code is required'),
    body('allowanceType').notEmpty().withMessage('Allowance type is required'),
    body('amountType').isIn(['daily', 'per_trip', 'fixed']).withMessage('Invalid amount type'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number')
  ],
  createAllowanceStandard
);
router.put(
  '/allowance/:id',
  [
    authorize('admin', 'finance'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number')
  ],
  updateAllowanceStandard
);
router.delete('/allowance/:id', authorize('admin'), deleteAllowanceStandard);

// ==================== 其他费用标准路由 ====================
router.get('/:standardId/other/types', getOtherExpenseTypes);
router.get('/:standardId/other', getOtherExpenseStandards);
router.post(
  '/:standardId/other',
  [
    authorize('admin', 'finance'),
    body('expenseType').isIn(['entertainment', 'communication', 'office_supplies', 'training', 'parking', 'toll', 'insurance', 'visa', 'other']).withMessage('Invalid expense type'),
    body('expenseTypeName').notEmpty().withMessage('Expense type name is required'),
    body('jobLevelCode').notEmpty().withMessage('Job level code is required'),
    body('amountType').isIn(['daily', 'per_trip', 'per_item', 'percentage', 'fixed']).withMessage('Invalid amount type'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number')
  ],
  createOtherExpenseStandard
);
router.put(
  '/other/:id',
  [
    authorize('admin', 'finance'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number')
  ],
  updateOtherExpenseStandard
);
router.delete('/other/:id', authorize('admin'), deleteOtherExpenseStandard);

// ==================== 通用费用项路由（简化模型） ====================
// 注意：路由顺序很重要，POST必须在GET之前，具体路由在通用路由之前
router.post(
  '/',
  [
    authorize('admin', 'finance'),
    body('itemName').notEmpty().withMessage('Expense item name is required'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number')
    // standardId 和 amount 都是可选的
  ],
  createExpenseItem
);
router.get('/all', getExpenseItems); // 获取所有费用项（别名，放在/:standardId之前）
router.get('/', getExpenseItems); // 获取所有费用项
router.get('/:standardId', getExpenseItems); // 获取指定标准的费用项（放在最后）
// 注意：启用/禁用路由必须在 /item/:id 之前，避免路由冲突
router.put('/item/:id/enable', authorize('admin', 'finance'), enableExpenseItem);
router.put('/item/:id/disable', authorize('admin', 'finance'), disableExpenseItem);
router.put(
  '/item/:id',
  [
    authorize('admin', 'finance'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be a positive number if provided')
  ],
  updateExpenseItem
);
router.delete('/item/:id', authorize('admin'), deleteExpenseItem);

module.exports = router;
