/**
 * 携程API控制器
 * 提供携程商旅API的代理接口
 */

const ctripApiService = require('../services/ctripApiService');

/**
 * 获取Ticket
 * @route GET /api/ctrip/ticket
 * @access Private (Admin/Finance only)
 */
exports.getTicket = async (req, res) => {
  try {
    const ticket = await ctripApiService.getTicket();
    res.json({
      success: true,
      data: {
        ticket,
        expiresIn: 7200, // 2小时，单位秒
      },
    });
  } catch (error) {
    console.error('获取Ticket失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取Ticket失败',
    });
  }
};

/**
 * 获取全量国家数据
 * @route GET /api/ctrip/countries
 * @access Private
 */
exports.getCountries = async (req, res) => {
  try {
    const { locale = 'zh-CN' } = req.query;
    const countries = await ctripApiService.getAllCountries(locale);
    
    res.json({
      success: true,
      count: countries.length,
      data: countries,
    });
  } catch (error) {
    console.error('获取国家数据失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取国家数据失败',
    });
  }
};

/**
 * 获取全量标准地理信息数据（POI）
 * @route POST /api/ctrip/poi
 * @access Private
 */
exports.getPOIInfo = async (req, res) => {
  try {
    const {
      countryId,
      provinceIds,
      provinceNames,
      prefectureLevelCityIds,
      prefectureLevelCityNames,
      returnDistrict = true,
      returnCounty = true,
      returnAirport = true,
      returnTrainStation = true,
      returnBusStation = true,
      startDate,
    } = req.body;

    if (!countryId) {
      return res.status(400).json({
        success: false,
        message: 'countryId参数必填',
      });
    }

    const poiData = await ctripApiService.getAllPOIInfo({
      countryId,
      provinceIds,
      provinceNames,
      prefectureLevelCityIds,
      prefectureLevelCityNames,
      returnDistrict: returnDistrict !== false,
      returnCounty: returnCounty !== false,
      returnAirport: returnAirport !== false,
      returnTrainStation: returnTrainStation !== false,
      returnBusStation: returnBusStation !== false,
      startDate,
    });

    res.json({
      success: true,
      data: poiData,
    });
  } catch (error) {
    console.error('获取POI数据失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取POI数据失败',
    });
  }
};

/**
 * 获取并转换POI数据为Location格式
 * @route POST /api/ctrip/poi/locations
 * @access Private
 */
exports.getPOIAsLocations = async (req, res) => {
  try {
    const {
      countryId,
      provinceIds,
      provinceNames,
      prefectureLevelCityIds,
      prefectureLevelCityNames,
      returnDistrict = true,
      returnCounty = true,
      returnAirport = true,
      returnTrainStation = true,
      returnBusStation = true,
    } = req.body;

    if (!countryId) {
      return res.status(400).json({
        success: false,
        message: 'countryId参数必填',
      });
    }

    const poiData = await ctripApiService.getAllPOIInfo({
      countryId,
      provinceIds,
      provinceNames,
      prefectureLevelCityIds,
      prefectureLevelCityNames,
      returnDistrict: returnDistrict !== false,
      returnCounty: returnCounty !== false,
      returnAirport: returnAirport !== false,
      returnTrainStation: returnTrainStation !== false,
      returnBusStation: returnBusStation !== false,
    });

    const locations = ctripApiService.convertPOIToLocations(poiData);

    res.json({
      success: true,
      count: locations.length,
      data: locations,
      invalidGeoList: poiData.invalidGeoList || [],
    });
  } catch (error) {
    console.error('获取Location数据失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取Location数据失败',
    });
  }
};

