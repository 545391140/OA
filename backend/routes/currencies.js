const express = require('express');
const { body } = require('express-validator');
const {
  getCurrencies,
  getActiveCurrencies,
  getCurrencyById,
  getCurrencyByCode,
  createCurrency,
  updateCurrency,
  deleteCurrency,
  getExchangeRates
} = require('../controllers/currencyController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @desc    Get exchange rates (for currency converter)
// @route   GET /api/currencies/exchange-rates
// @access  Private
router.get('/exchange-rates', getExchangeRates);

// @desc    Get active currencies only
// @route   GET /api/currencies/active
// @access  Private
router.get('/active', getActiveCurrencies);

// @desc    Get all currencies
// @route   GET /api/currencies
// @access  Private
router.get('/', getCurrencies);

// @desc    Get currency by code
// @route   GET /api/currencies/code/:code
// @access  Private
router.get('/code/:code', getCurrencyByCode);

// @desc    Get currency by ID
// @route   GET /api/currencies/:id
// @access  Private
router.get('/:id', getCurrencyById);

// @desc    Create currency
// @route   POST /api/currencies
// @access  Private (Admin/Finance only)
router.post(
  '/',
  [
    authorize('admin', 'finance'),
    body('code').notEmpty().withMessage('Currency code is required'),
    body('name').notEmpty().withMessage('Currency name is required'),
    body('exchangeRate').isFloat({ min: 0 }).withMessage('Exchange rate must be a positive number')
  ],
  createCurrency
);

// @desc    Update currency
// @route   PUT /api/currencies/:id
// @access  Private (Admin/Finance only)
router.put(
  '/:id',
  [
    authorize('admin', 'finance'),
    body('exchangeRate').optional().isFloat({ min: 0 }).withMessage('Exchange rate must be a positive number')
  ],
  updateCurrency
);

// @desc    Delete currency
// @route   DELETE /api/currencies/:id
// @access  Private (Admin only)
router.delete('/:id', authorize('admin'), deleteCurrency);

module.exports = router;

