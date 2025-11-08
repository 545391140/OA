const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Role = require('../models/Role');
const Position = require('../models/Position');

const router = express.Router();

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { isActive, search, role, position, department } = req.query;
    
    // Build query
    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (role) {
      query.role = role;
    }
    if (position) {
      query.position = position;
    }
    if (department) {
      query.department = department;
    }
    if (search) {
      query.$or = [
        { employeeId: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .populate('manager', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('manager', 'firstName lastName email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if requester is admin or the user themselves
    if (req.user.role !== 'admin' && req.user.id !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this user'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Create new user
// @route   POST /api/users
// @access  Private/Admin
router.post('/', [
  protect,
  authorize('admin'),
  body('employeeId').notEmpty().withMessage('Employee ID is required'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please include a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('department').notEmpty().withMessage('Department is required'),
  body('position').notEmpty().withMessage('Position is required'),
  body('role').notEmpty().withMessage('Role is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      employeeId,
      firstName,
      lastName,
      email,
      password,
      role,
      department,
      position,
      jobLevel,
      manager,
      phone
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { employeeId }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or employee ID already exists'
      });
    }

    // Verify role exists and is active
    if (role) {
      const roleDoc = await Role.findOne({ code: role, isActive: true });
      if (!roleDoc) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive role'
        });
      }
    }

    // Verify position exists and is active
    if (position) {
      const positionDoc = await Position.findOne({ code: position, isActive: true });
      if (!positionDoc) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or inactive position'
        });
      }
    }

    const user = await User.create({
      employeeId,
      firstName,
      lastName,
      email,
      password,
      role,
      department,
      position,
      jobLevel,
      manager: manager || undefined,
      phone
    });

    const userResponse = await User.findById(user._id)
      .select('-password')
      .populate('manager', 'firstName lastName email');

    res.status(201).json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
router.put('/:id', [
  protect,
  authorize('admin'),
  body('email').optional().isEmail().withMessage('Please include a valid email'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updateData = { ...req.body };

    // If email is being changed, check if new email already exists
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await User.findOne({ email: updateData.email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists'
        });
      }
    }

    // If employeeId is being changed, check if new employeeId already exists
    if (updateData.employeeId && updateData.employeeId !== user.employeeId) {
      const existingUser = await User.findOne({ employeeId: updateData.employeeId });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID already exists'
        });
      }
    }

    // Verify role exists and is active (always validate if role is provided)
    if (updateData.role) {
      const roleDoc = await Role.findOne({ code: updateData.role, isActive: true });
      if (!roleDoc) {
        return res.status(400).json({
          success: false,
          message: `Invalid or inactive role: ${updateData.role}`
        });
      }
    }

    // Verify position exists and is active (always validate if position is provided)
    if (updateData.position) {
      const positionDoc = await Position.findOne({ code: updateData.position, isActive: true });
      if (!positionDoc) {
        return res.status(400).json({
          success: false,
          message: `Invalid or inactive position: ${updateData.position}`
        });
      }
    }

    // Don't allow updating password through this endpoint (use separate password reset endpoint)
    delete updateData.password;

    user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .select('-password')
      .populate('manager', 'firstName lastName email');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete: set isActive to false instead of actually deleting
    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// @desc    Toggle user active status
// @route   PATCH /api/users/:id/toggle-active
// @access  Private/Admin
router.patch('/:id/toggle-active', protect, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    const userResponse = await User.findById(user._id)
      .select('-password')
      .populate('manager', 'firstName lastName email');

    res.json({
      success: true,
      data: userResponse
    });
  } catch (error) {
    console.error('Toggle user active error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

module.exports = router;
