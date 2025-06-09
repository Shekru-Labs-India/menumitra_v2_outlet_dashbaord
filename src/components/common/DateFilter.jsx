import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DateFilter = ({
  dateRange = 'All Time',
  onDateRangeChange,
  onCustomDateSelect
}) => {
  const [selectedDateRange, setSelectedDateRange] = useState(dateRange);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Initialize with default date range
  useEffect(() => {
    setSelectedDateRange(dateRange);
    setShowDatePicker(dateRange === 'Custom Range');
  }, [dateRange]);

  // Handle date range selection
  const handleDateRangeChange = (range) => {
    setSelectedDateRange(range);
    
    if (range === 'Custom Range') {
      // Only show date picker, don't reset dates
      setShowDatePicker(true);
    } else {
      // For non-custom ranges, reset dates and notify parent
      setShowDatePicker(false);
      setStartDate(null);
      setEndDate(null);
      onDateRangeChange(range);
    }
  };

  // Handle custom date selection
  const handleCustomDateSelect = () => {
    if (startDate && endDate) {
      const formatDate = (date) => {
        if (!date) return '';
        const day = date.getDate().toString().padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day} ${month} ${year}`;
      };
      
      const formattedRange = `${formatDate(startDate)} - ${formatDate(endDate)}`;
      setSelectedDateRange(formattedRange);
      setShowDatePicker(false);
      
      // Pass dates to parent component
      onCustomDateSelect(startDate, endDate, formattedRange);
    }
  };

  return (
    <>
      <div className="dropdown">
        <button
          type="button"
          className="btn btn-outline-primary dropdown-toggle"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          <i className="fas fa-calendar me-2"></i>
          {selectedDateRange}
        </button>
        <ul className="dropdown-menu dropdown-menu-end">
          {['All Time', 'Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Current Month', 'Last Month'].map((range) => (
            <li key={range}>
              <a
                href="javascript:void(0);"
                className="dropdown-item d-flex align-items-center"
                onClick={() => handleDateRangeChange(range)}
              >
                {range}
              </a>
            </li>
          ))}
          <li><hr className="dropdown-divider" /></li>
          <li>
            <a
              href="javascript:void(0);"
              className="dropdown-item d-flex align-items-center"
              onClick={() => handleDateRangeChange('Custom Range')}
            >
              Custom Range
            </a>
          </li>
        </ul>
      </div>

      {/* Date Picker for Custom Range */}
      {showDatePicker && (
        <div className="mt-3">
          <div className="d-flex flex-column gap-2">
            <label>Select Date Range:</label>
            <div className="d-flex flex-column flex-md-row gap-2">
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                maxDate={new Date()}
                placeholderText="DD MMM YYYY"
                className="btn btn-outline-secondary"
                dateFormat="dd MMM yyyy"
              />
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                maxDate={new Date()}
                placeholderText="DD MMM YYYY"
                className="btn btn-outline-secondary"
                dateFormat="dd MMM yyyy"
              />
            </div>
            <button
              className="btn btn-primary mt-2"
              onClick={handleCustomDateSelect}
              disabled={!startDate || !endDate}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default DateFilter; 