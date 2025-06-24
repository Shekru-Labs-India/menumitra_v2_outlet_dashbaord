import React, { useState } from 'react';
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

function CustomerReports() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [customerDetails, setCustomerDetails] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [orderType, setOrderType] = useState('all');
  
  // Date range filters
  const [dateRange, setDateRange] = useState('All Time');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const navigate = useNavigate();

  // Handle date range selection
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setShowDatePicker(range === 'Custom Range');
  };

  const handleOrderTypeChange = (e) => {
    setOrderType(e.target.value);
  };

  const fetchCustomerReport = () => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setPermissionDenied(false);

        const apiParams = {
          outlet_id: localStorage.getItem('outlet_id'),
          user_id: localStorage.getItem('user_id'),
          filter_type: 'all'
        };

        // Set order type if specified
        if (orderType && orderType !== 'all') {
          apiParams.filter_type = 'order_type';
          apiParams.order_type = orderType;
        }

        // Add date range parameters if applicable
        if (startDate && endDate && dateRange === 'Custom Range') {
          apiParams.start_date = startDate.toISOString().split('T')[0];
          apiParams.end_date = endDate.toISOString().split('T')[0];
        } else if (dateRange !== 'All Time') {
          apiParams.date_range = dateRange;
        }

        console.log('Making API call with params:', apiParams);
        const response = await api.post(API_PATHS.customerReport, apiParams);
        
        if (response.data && response.data.detail) {
          setCustomerData(response.data.detail);
          
          // Add unique id to each customer for table component
          const processedData = response.data.detail.customers.map((customer, index) => ({
            ...customer,
            id: `customer-${index}`
          }));
          
          setCustomerDetails(processedData);
          setDataFetched(true);
          console.log('Data fetched successfully:', response.data.detail);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching customer report:', err);
        
        if (err.response?.status === 403 || 
            err.response?.data?.detail?.includes('permission') ||
            err.response?.data?.detail?.includes('access')) {
          setPermissionDenied(true);
          setError(err.response?.data?.detail || 'You don\'t have permission to access reports management functionality');
        } else {
          setError(err.response?.data?.detail || 'Failed to fetch customer report data');
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
    fetchCustomerReport();
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  // Define table columns
  const columns = [
    {
      Header: 'Customer Info',
      accessor: 'customer_name',
      width: '200px',
      Cell: (item) => (
        <div className="text-nowrap">
          <span className="fw-semibold">{item.customer_name}</span>
          <br />
          <small className="text-muted">Mobile: {item.customer_mobile}</small>
          <br />
          <small className="text-muted">Address: {item.customer_address || 'N/A'}</small>
        </div>
      ),
      exportFormat: (item) => `${item.customer_name} (${item.customer_mobile})`
    },
    {
      Header: 'Order Summary',
      accessor: 'total_orders',
      width: '180px',
      Cell: (item) => (
        <div className="text-nowrap">
          <span>Total Orders: {item.total_orders}</span>
          <br />
          <span>Total Spent: ₹{item.total_spent.toFixed(2)}</span>
        </div>
      ),
      exportFormat: (item) => `Orders: ${item.total_orders}, Spent: ₹${item.total_spent.toFixed(2)}`
    },
    {
      Header: 'First Order',
      accessor: 'first_order_date',
      width: '150px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.first_order_date}
        </div>
      ),
      exportFormat: (item) => item.first_order_date
    },
    {
      Header: 'Last Order',
      accessor: 'last_order_date',
      width: '150px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.last_order_date}
        </div>
      ),
      exportFormat: (item) => item.last_order_date
    },
    {
      Header: 'Order Types',
      accessor: 'order_types',
      width: '180px',
      Cell: (item) => (
        <div className="text-nowrap">
          {Object.entries(item.order_types).map(([type, count]) => (
            <div key={type} className="d-flex justify-content-between mb-1">
              <span className="text-capitalize">{type}:</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
      ),
      exportFormat: (item) => 
        Object.entries(item.order_types)
          .map(([type, count]) => `${type}: ${count}`)
          .join(', ')
    }
  ];

  // Prepare filter info for export
  const getFilterInfo = () => {
    const info = {
      'Order Type': orderType === 'all' ? 'All Orders' : orderType,
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

      {/* Order Type Select */}
      <Form.Select 
        value={orderType}
        onChange={handleOrderTypeChange}
        size="sm"
        style={{ width: '150px' }}
      >
        <option value="all">All Orders</option>
        <option value="dine-in">Dine-in</option>
        <option value="parcel">Parcel</option>
        <option value="counter">Counter</option>
        <option value="delivery">Delivery</option>
        <option value="drive-through">Drive-through</option>
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
        onClick={fetchCustomerReport}
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
      <Breadcrumb.Item active>Customer Reports</Breadcrumb.Item>
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
                  resourceName="Customer Reports"
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
                    data={customerDetails}
                    columns={columns}
                    title="Customer Reports"
                    filterInfo={getFilterInfo()}
                    enableHorizontalScroll={true}
                    onBack={handleGoBack}
                    filterControls={renderFilterControls()}
                    dataFetched={dataFetched}
                    breadcrumbs={renderBreadcrumbs()}
                    onRefresh={fetchCustomerReport}
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
}

export default CustomerReports; 