const { validationResult } = require('express-validator');
const Location = require('../models/Location');

// @desc    Get all locations
// @route   GET /api/locations
// @access  Private
exports.getLocations = async (req, res) => {
  try {
    const { type, status, search, city, country } = req.query;
    const query = {};
    
    if (type) {
      query.type = type;
    }
    if (status) {
      query.status = status;
    }
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }
    if (country) {
      query.country = { $regex: country, $options: 'i' };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { province: { $regex: search, $options: 'i' } },
        { district: { $regex: search, $options: 'i' } },
        { county: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
        { countryCode: { $regex: search, $options: 'i' } }
      ];
    }

    const locations = await Location.find(query)
      .populate('parentId', 'name code type city province')
      .sort({ type: 1, name: 1 })
      .limit(1000); // Limit to prevent performance issues

    res.json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get location by ID
// @route   GET /api/locations/:id
// @access  Private
exports.getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id)
      .populate('parentId', 'name code type city province');

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get locations by parent (city) - 获取城市下的机场和火车站
// @route   GET /api/locations/parent/:parentId
// @access  Private
exports.getLocationsByParent = async (req, res) => {
  try {
    const locations = await Location.find({ parentId: req.params.parentId })
      .populate('parentId', 'name code type city province')
      .sort({ type: 1, name: 1 });

    res.json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    console.error('Get locations by parent error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create location
// @route   POST /api/locations
// @access  Private (Admin/Finance only)
exports.createLocation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const location = await Location.create({
      ...req.body,
      code: req.body.code ? req.body.code.toUpperCase() : undefined,
      countryCode: req.body.countryCode ? req.body.countryCode.toUpperCase() : undefined
    });

    res.status(201).json({
      success: true,
      message: 'Location created successfully',
      data: location
    });
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update location
// @route   PUT /api/locations/:id
// @access  Private (Admin/Finance only)
exports.updateLocation = async (req, res) => {
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
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }
    if (updateData.countryCode) {
      updateData.countryCode = updateData.countryCode.toUpperCase();
    }

    const location = await Location.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: location
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete location
// @route   DELETE /api/locations/:id
// @access  Private (Admin only)
exports.deleteLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    await location.deleteOne();

    res.json({
      success: true,
      message: 'Location deleted successfully'
    });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Batch create locations
// @route   POST /api/locations/batch
// @access  Private (Admin/Finance only)
exports.batchCreateLocations = async (req, res) => {
  try {
    const { locations } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Locations array is required'
      });
    }

    const locationsToCreate = locations.map(loc => ({
      ...loc,
      code: loc.code ? loc.code.toUpperCase() : undefined,
      countryCode: loc.countryCode ? loc.countryCode.toUpperCase() : undefined
    }));

    const createdLocations = await Location.insertMany(locationsToCreate, {
      ordered: false
    });

    res.status(201).json({
      success: true,
      message: `${createdLocations.length} locations created successfully`,
      data: createdLocations
    });
  } catch (error) {
    console.error('Batch create locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};



// @desc    Get all locations
// @route   GET /api/locations
// @access  Private
exports.getLocations = async (req, res) => {
  try {
    const { type, status, search, city, country } = req.query;
    const query = {};
    
    if (type) {
      query.type = type;
    }
    if (status) {
      query.status = status;
    }
    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }
    if (country) {
      query.country = { $regex: country, $options: 'i' };
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { province: { $regex: search, $options: 'i' } },
        { district: { $regex: search, $options: 'i' } },
        { county: { $regex: search, $options: 'i' } },
        { country: { $regex: search, $options: 'i' } },
        { countryCode: { $regex: search, $options: 'i' } }
      ];
    }

    const locations = await Location.find(query)
      .populate('parentId', 'name code type city province')
      .sort({ type: 1, name: 1 })
      .limit(1000); // Limit to prevent performance issues

    res.json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get location by ID
// @route   GET /api/locations/:id
// @access  Private
exports.getLocationById = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id)
      .populate('parentId', 'name code type city province');

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.json({
      success: true,
      data: location
    });
  } catch (error) {
    console.error('Get location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get locations by parent (city) - 获取城市下的机场和火车站
// @route   GET /api/locations/parent/:parentId
// @access  Private
exports.getLocationsByParent = async (req, res) => {
  try {
    const locations = await Location.find({ parentId: req.params.parentId })
      .populate('parentId', 'name code type city province')
      .sort({ type: 1, name: 1 });

    res.json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    console.error('Get locations by parent error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create location
// @route   POST /api/locations
// @access  Private (Admin/Finance only)
exports.createLocation = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const location = await Location.create({
      ...req.body,
      code: req.body.code ? req.body.code.toUpperCase() : undefined,
      countryCode: req.body.countryCode ? req.body.countryCode.toUpperCase() : undefined
    });

    res.status(201).json({
      success: true,
      message: 'Location created successfully',
      data: location
    });
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update location
// @route   PUT /api/locations/:id
// @access  Private (Admin/Finance only)
exports.updateLocation = async (req, res) => {
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
    if (updateData.code) {
      updateData.code = updateData.code.toUpperCase();
    }
    if (updateData.countryCode) {
      updateData.countryCode = updateData.countryCode.toUpperCase();
    }

    const location = await Location.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true
      }
    );

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: location
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete location
// @route   DELETE /api/locations/:id
// @access  Private (Admin only)
exports.deleteLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    await location.deleteOne();

    res.json({
      success: true,
      message: 'Location deleted successfully'
    });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Batch create locations
// @route   POST /api/locations/batch
// @access  Private (Admin/Finance only)
exports.batchCreateLocations = async (req, res) => {
  try {
    const { locations } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Locations array is required'
      });
    }

    const locationsToCreate = locations.map(loc => ({
      ...loc,
      code: loc.code ? loc.code.toUpperCase() : undefined,
      countryCode: loc.countryCode ? loc.countryCode.toUpperCase() : undefined
    }));

    const createdLocations = await Location.insertMany(locationsToCreate, {
      ordered: false
    });

    res.status(201).json({
      success: true,
      message: `${createdLocations.length} locations created successfully`,
      data: createdLocations
    });
  } catch (error) {
    console.error('Batch create locations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};


