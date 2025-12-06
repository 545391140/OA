const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const JobLevel = require('../models/JobLevel');

// @desc    Get all job levels
// @route   GET /api/job-levels
// @access  Private
exports.getJobLevels = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    
    if (status) {
      query.status = status;
    }

    const jobLevels = await JobLevel.find(query).sort({ levelOrder: 1 });

    res.json({
      success: true,
      count: jobLevels.length,
      data: jobLevels
    });
  } catch (error) {
    logger.error('Get job levels error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get job level by ID
// @route   GET /api/job-levels/:id
// @access  Private
exports.getJobLevelById = async (req, res) => {
  try {
    const jobLevel = await JobLevel.findById(req.params.id);

    if (!jobLevel) {
      return res.status(404).json({
        success: false,
        message: 'Job level not found'
      });
    }

    res.json({
      success: true,
      data: jobLevel
    });
  } catch (error) {
    logger.error('Get job level error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create job level
// @route   POST /api/job-levels
// @access  Private (Admin/Finance only)
exports.createJobLevel = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const jobLevel = await JobLevel.create({
      ...req.body,
      levelCode: req.body.levelCode.toUpperCase()
    });

    res.status(201).json({
      success: true,
      message: 'Job level created successfully',
      data: jobLevel
    });
  } catch (error) {
    logger.error('Create job level error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Job level code already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update job level
// @route   PUT /api/job-levels/:id
// @access  Private (Admin/Finance only)
exports.updateJobLevel = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const updateData = { ...req.body };
    if (updateData.levelCode) {
      updateData.levelCode = updateData.levelCode.toUpperCase();
    }

    const jobLevel = await JobLevel.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!jobLevel) {
      return res.status(404).json({
        success: false,
        message: 'Job level not found'
      });
    }

    res.json({
      success: true,
      message: 'Job level updated successfully',
      data: jobLevel
    });
  } catch (error) {
    logger.error('Update job level error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete job level
// @route   DELETE /api/job-levels/:id
// @access  Private (Admin only)
exports.deleteJobLevel = async (req, res) => {
  try {
    const jobLevel = await JobLevel.findById(req.params.id);

    if (!jobLevel) {
      return res.status(404).json({
        success: false,
        message: 'Job level not found'
      });
    }

    await jobLevel.deleteOne();

    res.json({
      success: true,
      message: 'Job level deleted successfully'
    });
  } catch (error) {
    logger.error('Delete job level error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

