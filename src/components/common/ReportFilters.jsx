import React, { useState, useEffect } from 'react';
import {
  Form,
  Button,
  Spinner
} from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const ReportFilters = ({
  isLoading,
  onSubmit,
  defaultDateRange = 'All Time',
  children
}) => {
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Initialize with default date range
  useEffect(() => {
    setDateRange(defaultDateRange);
    setShowDatePicker(defaultDateRange === 'Custom Range');
  }, [defaultDateRange]);

  // Handle date range selection
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setShowDatePicker(range === 'Custom Range');
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prepare date parameters
    let dateParams = {};
    if (startDate && endDate && dateRange === 'Custom Range') {
      dateParams = {
        start_date: startDate,
        end_date: endDate
      };
    } else if (dateRange !== 'All Time') {
      dateParams = {
        date_range: dateRange
      };
    }
    
    // Extract form data from any additional form elements
    const formData = new FormData(e.target);
    const formValues = {};
    
    // Convert FormData to regular object
    for (let [key, value] of formData.entries()) {
      if (value !== undefined && value !== null && value !== '') {
        formValues[key] = value;
      }
    }
    
    // Call the onSubmit handler with all form values and date parameters
    onSubmit({
      ...formValues,
      ...dateParams
    });
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="d-flex justify-content-center align-items-center mb-4 flex-wrap gap-3">
        {/* Date Range Dropdown */}
        <div className="dropdown">
          <button
            type="button"
            className="btn btn-outline-primary dropdown-toggle"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            <i className="fas fa-calendar me-2"></i>
            {dateRange}
          </button>
          <ul className="dropdown-menu">
            {['All Time', 'Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Current Month', 'Last Month'].map((range) => (
              <li key={range}>
                <a href="javascript:void(0);"
                  className="dropdown-item d-flex align-items-center"
                  onClick={() => handleDateRangeChange(range)}>
                  {range}
                </a>
              </li>
            ))}
            <li><hr className="dropdown-divider" /></li>
            <li>
              <a href="javascript:void(0);"
                className="dropdown-item d-flex align-items-center"
                onClick={() => handleDateRangeChange('Custom Range')}>
                Custom Range
              </a>
            </li>
          </ul>
        </div>

        {/* Custom Filter Elements (passed as children) */}
        {children}

        {/* Submit Button */}
        <Button 
          variant="primary" 
          type="submit" 
          disabled={isLoading}
          className="px-4"
        >
          {isLoading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Loading...
            </>
          ) : "Submit"}
        </Button>
      </div>

      {/* Date Picker for Custom Range */}
      {showDatePicker && (
        <div className="d-flex justify-content-center align-items-center gap-2 mb-4">
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            maxDate={new Date()}
            placeholderText="Start Date"
            className="form-control"
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
            placeholderText="End Date"
            className="form-control"
            dateFormat="dd MMM yyyy"
          />
        </div>
      )}
    </Form>
  );
};

export default ReportFilters; 