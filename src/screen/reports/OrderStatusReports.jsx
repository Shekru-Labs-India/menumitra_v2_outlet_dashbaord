import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../../config/apiConfig';
import {
  Form,
  Button,
  Breadcrumb
} from 'react-bootstrap';
import VerticalSidebar from '../../components/VerticalSidebar';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { ForbiddenAccessMessage, ReportTable } from '../../components/common';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const OrderStatusReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusHistoryData, setStatusHistoryData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [orderStatusReport, setOrderStatusReport] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  
  // Date range filters
  const [dateRange, setDateRange] = useState('All Time');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const navigate = useNavigate();

  // Update filtered data when filter changes
  useEffect(() => {
    if (statusHistoryData.length > 0) {
      applyFilters();
    }
  }, [filterType, statusHistoryData]);

  const applyFilters = () => {
    let result = [...statusHistoryData];
    setFilteredData(result);
  };

  // Handle date range selection
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setShowDatePicker(range === 'Custom Range');
  };

  const fetchOrderStatusReport = () => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setPermissionDenied(false);

        // Set default filter_type if not provided
        const apiParams = {
          filter_type: filterType,
          outlet_id: localStorage.getItem('outlet_id'),
          user_id: localStorage.getItem('user_id')
        };

        // Add date range parameters if applicable
        if (startDate && endDate && dateRange === 'Custom Range') {
          apiParams.filter_type = 'date_range';
          apiParams.start_date = startDate.toISOString().split('T')[0];
          apiParams.end_date = endDate.toISOString().split('T')[0];
        } else if (dateRange !== 'All Time') {
          apiParams.date_range = dateRange;
        }

        console.log('Fetching order status report with params:', apiParams);
        const response = await api.post(API_PATHS.orderStatusReport, apiParams);
        
        // Extract order status data from the response
        let statusHistory = [];
        let reportSummary = null;
        
        if (response.data && response.data.detail) {
          statusHistory = response.data.detail.status_history || [];
          reportSummary = response.data.detail.order_status_report || null;
        }
        
        console.log('API response data:', statusHistory);
        
        // Add unique id to each record for table component
        const processedData = statusHistory.map((item, index) => ({
          ...item,
          id: `status-${index}`
        }));
        
        setStatusHistoryData(processedData);
        setFilteredData(processedData);
        setOrderStatusReport(reportSummary);
        setDataFetched(true);
      } catch (err) {
        console.error('Error fetching order status report:', err);
        
        if (err.response?.status === 403 || 
            err.response?.data?.detail?.includes('permission') ||
            err.response?.data?.detail?.includes('access')) {
          setPermissionDenied(true);
          setError(err.response?.data?.detail || 'You don\'t have permission to access order status reports management functionality');
        } else {
          setError(err.response?.data?.detail || 'Failed to fetch order status report data');
        }

        if (err.response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  };

  const handleRetry = () => {
    fetchOrderStatusReport();
  };

  const handleFilterTypeChange = (e) => {
    setFilterType(e.target.value);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  // Define table columns
  const columns = [
    {
      Header: 'Order Number',
      accessor: 'order_number',
      width: '150px',
      Cell: (item) => (
        <div className="text-nowrap">
          <span className="fw-semibold">#{item.order_number}</span>
         
        </div>
      ),
      exportFormat: (item) => `Order #${item.order_number}`
    },
    {
      Header: 'Order Type',
      accessor: 'order_type',
      width: '120px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.order_type || '-'}
        </div>
      ),
      exportFormat: (item) => item.order_type || '-'
    },
    {
      Header: 'Status',
      accessor: 'order_status',
      width: '120px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.order_status || '-'}
        </div>
      ),
      exportFormat: (item) => item.order_status || '-'
    },
    {
      Header: 'Amount',
      accessor: 'amount',
      width: '120px',
      Cell: (item) => (
        <div className="text-nowrap">
          ₹{item.amount?.toFixed(2) || '0.00'}
        </div>
      ),
      exportFormat: (item) => `₹${item.amount?.toFixed(2) || '0.00'}`
    },
    {
      Header: 'Changed By',
      accessor: 'user_name',
      width: '150px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.user_name || '-'}
        </div>
      ),
      exportFormat: (item) => item.user_name || '-'
    },
    {
      Header: 'Changed On',
      accessor: 'changed_on',
      width: '180px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.changed_on || '-'}
        </div>
      ),
      exportFormat: (item) => item.changed_on || '-'
    }
  ];

  // Prepare filter info for export
  const getFilterInfo = () => {
    const info = {
      'Filter Type': 'All Orders',
      'Date Range': dateRange || 'All Time'
    };

    if (startDate && endDate && dateRange === 'Custom Range') {
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      info['Date Range'] = `${formattedStartDate} to ${formattedEndDate}`;
    }

    return info;
  };

  // Custom filter controls for the ReportTable
  const renderFilterControls = () => (
    <div className="d-flex align-items-center gap-2">
      {/* Date Range Dropdown */}
      <div className="dropdown">
        <button
          type="button"
          className="btn btn-outline-primary btn-sm dropdown-toggle"
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

      {/* Filter Type Select */}
      <Form.Select 
        value={filterType}
        onChange={handleFilterTypeChange}
        size="sm"
        style={{ width: '150px' }}
      >
        <option value="all">All Orders</option>
      </Form.Select>

      {/* Date Picker for Custom Range */}
      {showDatePicker && (
        <div className="d-flex align-items-center gap-2">
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            maxDate={new Date()}
            placeholderText="Start Date"
            className="form-control form-control-sm"
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
            className="form-control form-control-sm"
            dateFormat="dd MMM yyyy"
          />
        </div>
      )}

      {/* Submit Button */}
      <Button 
        variant="primary" 
        size="sm"
        onClick={fetchOrderStatusReport}
        disabled={loading}
        className="px-4"
      >
        {loading ? (
          <>
            <span 
              className="spinner-border spinner-border-sm me-1" 
              role="status" 
              aria-hidden="true"
            ></span>
            Generating...
          </>
        ) : "Generate Report"}
      </Button>
    </div>
  );

  // Custom breadcrumbs component
  const renderBreadcrumbs = () => (
    <Breadcrumb className="mb-0">
      <Breadcrumb.Item href="/">Dashboard</Breadcrumb.Item>
      <Breadcrumb.Item href="/reports">Reports</Breadcrumb.Item>
      <Breadcrumb.Item active>Order Status Reports</Breadcrumb.Item>
    </Breadcrumb>
  );

  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        <VerticalSidebar />
        <div className="layout-page d-flex flex-column min-vh-100">
          <Header />
          <div className="content-wrapper flex-grow-1">
            <div className="container-fluid flex-grow-1 container-p-y">
              {permissionDenied ? (
                <ForbiddenAccessMessage 
                  title="Permission Denied" 
                  message={error}
                  resourceName="Order Status Reports"
                  onRetry={handleRetry}
                  onBack={() => navigate(-1)}
                />
              ) : error ? (
                <div className="alert alert-danger mb-4" role="alert">
                  {error}
                </div>
              ) : (
                <div style={{ backgroundColor: 'transparent', width: '100%', overflowX: 'auto' }}>
                  <ReportTable
                    data={filteredData}
                    columns={columns}
                    title="Order Status Reports"
                    filterInfo={getFilterInfo()}
                    enableHorizontalScroll={true}
                    onBack={handleGoBack}
                    filterControls={renderFilterControls()}
                    dataFetched={dataFetched}
                    breadcrumbs={renderBreadcrumbs()}
                    onRefresh={fetchOrderStatusReport}
                  />
                </div>
              )}
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderStatusReports; 