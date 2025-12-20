/**
 * 航班过滤和排序栏组件
 * 提供直飞、中转、航空公司、时间、机场、舱位等筛选和排序功能
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Checkbox,
  FormControlLabel,
  Button,
  Menu,
  MenuItem,
  Divider,
  Typography,
  Chip,
} from '@mui/material';
import {
  KeyboardArrowDown as KeyboardArrowDownIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { getAirlineInfo } from '../../utils/flightUtils';

const FlightFilterBar = ({ flights, onFilterChange, onSortChange }) => {
  const { t } = useTranslation();

  // 过滤状态
  const [directOnly, setDirectOnly] = useState(false);
  const [transferAnchorEl, setTransferAnchorEl] = useState(null);
  const [airlineAnchorEl, setAirlineAnchorEl] = useState(null);
  const [timeAnchorEl, setTimeAnchorEl] = useState(null);
  const [airportAnchorEl, setAirportAnchorEl] = useState(null);
  const [cabinAnchorEl, setCabinAnchorEl] = useState(null);
  const [moreAnchorEl, setMoreAnchorEl] = useState(null);
  
  // 排序状态
  const [sortAnchorEl, setSortAnchorEl] = useState(null);
  const [currentSort, setCurrentSort] = useState('price-low'); // 默认低价优先

  // 选中的过滤条件
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [selectedAirlines, setSelectedAirlines] = useState([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState(null);
  const [selectedAirport, setSelectedAirport] = useState(null);
  const [selectedCabin, setSelectedCabin] = useState(null);

  // 从航班数据中提取可用的航空公司列表
  const availableAirlines = useMemo(() => {
    const airlineSet = new Set();
    flights.forEach(flight => {
      flight.itineraries?.forEach(itinerary => {
        itinerary.segments?.forEach(segment => {
          if (segment.carrierCode) {
            airlineSet.add(segment.carrierCode);
          }
        });
      });
    });
    return Array.from(airlineSet).map(code => ({
      code,
      name: getAirlineInfo(code).name || code,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [flights]);

  // 从航班数据中提取可用的机场列表
  const availableAirports = useMemo(() => {
    const airportSet = new Set();
    flights.forEach(flight => {
      flight.itineraries?.forEach(itinerary => {
        itinerary.segments?.forEach(segment => {
          if (segment.departure?.iataCode) {
            airportSet.add(segment.departure.iataCode);
          }
          if (segment.arrival?.iataCode) {
            airportSet.add(segment.arrival.iataCode);
          }
        });
      });
    });
    return Array.from(airportSet).sort();
  }, [flights]);

  // 处理直飞筛选
  const handleDirectChange = (event) => {
    const checked = event.target.checked;
    setDirectOnly(checked);
    onFilterChange({
      directOnly: checked,
      transfer: selectedTransfer,
      airlines: selectedAirlines,
      timeRange: selectedTimeRange,
      airport: selectedAirport,
      cabin: selectedCabin,
    });
  };

  // 处理中转筛选
  const handleTransferSelect = (value) => {
    setSelectedTransfer(value);
    setTransferAnchorEl(null);
    onFilterChange({
      directOnly,
      transfer: value,
      airlines: selectedAirlines,
      timeRange: selectedTimeRange,
      airport: selectedAirport,
      cabin: selectedCabin,
    });
  };

  // 处理航空公司筛选
  const handleAirlineToggle = (airlineCode) => {
    const newSelected = selectedAirlines.includes(airlineCode)
      ? selectedAirlines.filter(code => code !== airlineCode)
      : [...selectedAirlines, airlineCode];
    setSelectedAirlines(newSelected);
    onFilterChange({
      directOnly,
      transfer: selectedTransfer,
      airlines: newSelected,
      timeRange: selectedTimeRange,
      airport: selectedAirport,
      cabin: selectedCabin,
    });
  };

  // 处理时间范围筛选
  const handleTimeRangeSelect = (range) => {
    setSelectedTimeRange(range);
    setTimeAnchorEl(null);
    onFilterChange({
      directOnly,
      transfer: selectedTransfer,
      airlines: selectedAirlines,
      timeRange: range,
      airport: selectedAirport,
      cabin: selectedCabin,
    });
  };

  // 处理机场筛选
  const handleAirportSelect = (airport) => {
    setSelectedAirport(airport);
    setAirportAnchorEl(null);
    onFilterChange({
      directOnly,
      transfer: selectedTransfer,
      airlines: selectedAirlines,
      timeRange: selectedTimeRange,
      airport,
      cabin: selectedCabin,
    });
  };

  // 处理舱位筛选
  const handleCabinSelect = (cabin) => {
    setSelectedCabin(cabin);
    setCabinAnchorEl(null);
    onFilterChange({
      directOnly,
      transfer: selectedTransfer,
      airlines: selectedAirlines,
      timeRange: selectedTimeRange,
      airport: selectedAirport,
      cabin,
    });
  };

  // 处理排序
  const handleSortSelect = (sortType) => {
    setCurrentSort(sortType);
    setSortAnchorEl(null);
    onSortChange(sortType);
  };

  // 清除所有筛选
  const handleClearFilters = () => {
    setDirectOnly(false);
    setSelectedTransfer(null);
    setSelectedAirlines([]);
    setSelectedTimeRange(null);
    setSelectedAirport(null);
    setSelectedCabin(null);
    onFilterChange({
      directOnly: false,
      transfer: null,
      airlines: [],
      timeRange: null,
      airport: null,
      cabin: null,
    });
  };

  // 时间范围选项
  const timeRanges = [
    { value: 'morning', label: '06:00-12:00', start: 6, end: 12 },
    { value: 'afternoon', label: '12:00-18:00', start: 12, end: 18 },
    { value: 'evening', label: '18:00-24:00', start: 18, end: 24 },
    { value: 'night', label: '00:00-06:00', start: 0, end: 6 },
  ];

  // 舱位选项
  const cabinOptions = [
    { value: 'ECONOMY', label: '经济舱' },
    { value: 'PREMIUM_ECONOMY', label: '超级经济舱' },
    { value: 'BUSINESS', label: '商务舱' },
    { value: 'FIRST', label: '头等舱' },
  ];

  // 排序选项
  const sortOptions = [
    { value: 'price-low', label: '低价优先' },
    { value: 'price-high', label: '高价优先' },
    { value: 'departure-early', label: '起飞时间早晚' },
    { value: 'departure-late', label: '起飞时间晚早' },
    { value: 'arrival-early', label: '到达时间早晚' },
    { value: 'arrival-late', label: '到达时间晚早' },
    { value: 'duration-short', label: '飞行时长短-长' },
    { value: 'duration-long', label: '飞行时长长-短' },
  ];

  const hasActiveFilters = directOnly || selectedTransfer || selectedAirlines.length > 0 || 
    selectedTimeRange || selectedAirport || selectedCabin;

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 2, 
        mb: 2, 
        borderBottom: '1px solid #e5e7eb',
        borderRadius: 2, // 8px，与卡片保持一致
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        {/* 直飞/经停复选框 */}
        <FormControlLabel
          control={
            <Checkbox
              checked={directOnly}
              onChange={handleDirectChange}
              size="small"
            />
          }
          label="直飞/经停"
          sx={{ mr: 2 }}
        />

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

        {/* 中转筛选 */}
        <Button
          variant="outlined"
          size="small"
          endIcon={<KeyboardArrowDownIcon />}
          onClick={(e) => setTransferAnchorEl(e.currentTarget)}
          sx={{
            bgcolor: selectedTransfer ? 'primary.light' : 'transparent',
            color: selectedTransfer ? 'primary.main' : 'text.primary',
            borderColor: '#d1d5db',
            '&:hover': {
              borderColor: '#9ca3af',
              bgcolor: 'action.hover',
            },
          }}
        >
          {selectedTransfer === 'direct' ? '直飞' : selectedTransfer === 'transfer' ? '中转' : '中转'}
        </Button>
        <Menu
          anchorEl={transferAnchorEl}
          open={Boolean(transferAnchorEl)}
          onClose={() => setTransferAnchorEl(null)}
        >
          <MenuItem onClick={() => handleTransferSelect('direct')}>直飞</MenuItem>
          <MenuItem onClick={() => handleTransferSelect('transfer')}>中转</MenuItem>
          <MenuItem onClick={() => handleTransferSelect(null)}>不限</MenuItem>
        </Menu>

        {/* 航空公司筛选 */}
        <Button
          variant="outlined"
          size="small"
          endIcon={<KeyboardArrowDownIcon />}
          onClick={(e) => setAirlineAnchorEl(e.currentTarget)}
          sx={{
            bgcolor: selectedAirlines.length > 0 ? 'primary.light' : 'transparent',
            color: selectedAirlines.length > 0 ? 'primary.main' : 'text.primary',
            borderColor: '#d1d5db',
            '&:hover': {
              borderColor: '#9ca3af',
              bgcolor: 'action.hover',
            },
          }}
        >
          航空公司{selectedAirlines.length > 0 ? ` (${selectedAirlines.length})` : ''}
        </Button>
        <Menu
          anchorEl={airlineAnchorEl}
          open={Boolean(airlineAnchorEl)}
          onClose={() => setAirlineAnchorEl(null)}
          PaperProps={{
            sx: { maxHeight: 300, width: 250 }
          }}
        >
          {availableAirlines.map((airline) => (
            <MenuItem
              key={airline.code}
              onClick={() => handleAirlineToggle(airline.code)}
              selected={selectedAirlines.includes(airline.code)}
            >
              <Checkbox
                checked={selectedAirlines.includes(airline.code)}
                size="small"
                sx={{ mr: 1 }}
              />
              {airline.name}
            </MenuItem>
          ))}
        </Menu>

        {/* 起抵时间筛选 */}
        <Button
          variant="outlined"
          size="small"
          endIcon={<KeyboardArrowDownIcon />}
          onClick={(e) => setTimeAnchorEl(e.currentTarget)}
          sx={{
            bgcolor: selectedTimeRange ? 'primary.light' : 'transparent',
            color: selectedTimeRange ? 'primary.main' : 'text.primary',
            borderColor: '#d1d5db',
            '&:hover': {
              borderColor: '#9ca3af',
              bgcolor: 'action.hover',
            },
          }}
        >
          {selectedTimeRange ? timeRanges.find(r => r.value === selectedTimeRange)?.label : '起抵时间'}
        </Button>
        <Menu
          anchorEl={timeAnchorEl}
          open={Boolean(timeAnchorEl)}
          onClose={() => setTimeAnchorEl(null)}
        >
          {timeRanges.map((range) => (
            <MenuItem
              key={range.value}
              onClick={() => handleTimeRangeSelect(range.value)}
              selected={selectedTimeRange === range.value}
            >
              {range.label}
            </MenuItem>
          ))}
          <MenuItem onClick={() => handleTimeRangeSelect(null)}>不限</MenuItem>
        </Menu>

        {/* 机场筛选 */}
        <Button
          variant="outlined"
          size="small"
          endIcon={<KeyboardArrowDownIcon />}
          onClick={(e) => setAirportAnchorEl(e.currentTarget)}
          sx={{
            bgcolor: selectedAirport ? 'primary.light' : 'transparent',
            color: selectedAirport ? 'primary.main' : 'text.primary',
            borderColor: '#d1d5db',
            '&:hover': {
              borderColor: '#9ca3af',
              bgcolor: 'action.hover',
            },
          }}
        >
          {selectedAirport || '机场'}
        </Button>
        <Menu
          anchorEl={airportAnchorEl}
          open={Boolean(airportAnchorEl)}
          onClose={() => setAirportAnchorEl(null)}
          PaperProps={{
            sx: { maxHeight: 300, width: 200 }
          }}
        >
          {availableAirports.map((airport) => (
            <MenuItem
              key={airport}
              onClick={() => handleAirportSelect(airport)}
              selected={selectedAirport === airport}
            >
              {airport}
            </MenuItem>
          ))}
          <MenuItem onClick={() => handleAirportSelect(null)}>不限</MenuItem>
        </Menu>

        {/* 舱位筛选 */}
        <Button
          variant="outlined"
          size="small"
          endIcon={<KeyboardArrowDownIcon />}
          onClick={(e) => setCabinAnchorEl(e.currentTarget)}
          sx={{
            bgcolor: selectedCabin ? 'primary.light' : 'transparent',
            color: selectedCabin ? 'primary.main' : 'text.primary',
            borderColor: '#d1d5db',
            '&:hover': {
              borderColor: '#9ca3af',
              bgcolor: 'action.hover',
            },
          }}
        >
          {selectedCabin ? cabinOptions.find(c => c.value === selectedCabin)?.label : '舱位'}
        </Button>
        <Menu
          anchorEl={cabinAnchorEl}
          open={Boolean(cabinAnchorEl)}
          onClose={() => setCabinAnchorEl(null)}
        >
          {cabinOptions.map((cabin) => (
            <MenuItem
              key={cabin.value}
              onClick={() => handleCabinSelect(cabin.value)}
              selected={selectedCabin === cabin.value}
            >
              {cabin.label}
            </MenuItem>
          ))}
          <MenuItem onClick={() => handleCabinSelect(null)}>不限</MenuItem>
        </Menu>

        {/* 更多筛选（占位） */}
        <Button
          variant="outlined"
          size="small"
          endIcon={<KeyboardArrowDownIcon />}
          disabled
          sx={{
            borderColor: '#d1d5db',
            color: 'text.disabled',
          }}
        >
          更多
        </Button>

        {/* 分隔线 */}
        <Box sx={{ flex: 1 }} />

        {/* 排序选项 */}
        <Button
          variant="text"
          size="small"
          onClick={(e) => setSortAnchorEl(e.currentTarget)}
          sx={{
            color: 'primary.main',
            fontWeight: 600,
            minWidth: 'auto',
            px: 1,
          }}
        >
          {sortOptions.find(s => s.value === currentSort)?.label || '排序'}
        </Button>
        <Menu
          anchorEl={sortAnchorEl}
          open={Boolean(sortAnchorEl)}
          onClose={() => setSortAnchorEl(null)}
        >
          {sortOptions.map((option) => (
            <MenuItem
              key={option.value}
              onClick={() => handleSortSelect(option.value)}
              selected={currentSort === option.value}
            >
              {option.label}
            </MenuItem>
          ))}
        </Menu>

        {/* 清除筛选按钮 */}
        {hasActiveFilters && (
          <Button
            variant="text"
            size="small"
            onClick={handleClearFilters}
            sx={{ color: 'text.secondary', minWidth: 'auto', px: 1 }}
          >
            清除
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default FlightFilterBar;

