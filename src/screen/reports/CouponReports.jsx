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

function CouponReports() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [couponData, setCouponData] = useState(null);
  const [couponDetails, setCouponDetails] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [orderType, setOrderType] = useState('all');
  const [dataFetched, setDataFetched] = useState(false);
  
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

  const fetchCouponReport = () => {
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
        const response = await api.post(API_PATHS.couponReport, apiParams);
        
        if (response.data && response.data.detail) {
          setCouponData(response.data.detail);
          
          // Add unique id to each record for table component
          const processedData = response.data.detail.coupon_details.map((item, index) => ({
            ...item,
            id: `coupon-${index}`
          }));
          
          setCouponDetails(processedData);
          setDataFetched(true);
          console.log('Data fetched successfully:', response.data.detail);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching coupon report:', err);
        
        if (err.response?.status === 403 || 
            err.response?.data?.detail?.includes('permission') ||
            err.response?.data?.detail?.includes('access')) {
          setPermissionDenied(true);
          setError(err.response?.data?.detail || 'You don\'t have permission to access reports management functionality');
        } else {
          setError(err.response?.data?.detail || 'Failed to fetch coupon report data');
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
    fetchCouponReport();
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleOrderTypeChange = (e) => {
    setOrderType(e.target.value);
  };

  // Define table columns
  const columns = [
    {
      Header: 'Order Number',
      accessor: 'order_number',
      width: '130px',
      Cell: (item) => (
        <div className="text-nowrap">
          <span className="fw-semibold">#{item.order_number}</span>
        </div>
      ),
      exportFormat: (item) => `#${item.order_number}`
    },
    {
      Header: 'Type',
      accessor: 'order_type',
      width: '100px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.order_type}
        </div>
      ),
      exportFormat: (item) => item.order_type
    },
    {
      Header: 'Status',
      accessor: 'order_status',
      width: '120px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.order_status}
        </div>
      ),
      exportFormat: (item) => item.order_status
    },
    // {
    //   Header: 'Date',
    //   accessor: 'created_on',
    //   width: '150px',
    //   Cell: (item) => (
    //     <div className="text-nowrap">
    //       {item.created_on}
    //     </div>
    //   ),
    //   exportFormat: (item) => item.created_on
    // },
    {
      Header: 'Coupon Code',
      accessor: 'coupon_code',
      width: '150px',
      Cell: (item) => (
        <div className="text-nowrap fw-bold">
          {item.coupon_code}
        </div>
      ),
      exportFormat: (item) => item.coupon_code
    },
    {
      Header: 'Coupon Type',
      accessor: 'coupon_type',
      width: '120px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.coupon_type}
        </div>
      ),
      exportFormat: (item) => item.coupon_type
    },
    {
      Header: 'Discount',
      accessor: 'discount_amount',
      width: '120px',
      Cell: (item) => (
        <div className="text-nowrap">
          ₹{item.discount_amount.toFixed(2)}
        </div>
      ),
      exportFormat: (item) => `₹${item.discount_amount.toFixed(2)}`
    },
    {
      Header: 'Bill Amount',
      accessor: 'total_bill_amount',
      width: '130px',
      Cell: (item) => (
        <div className="text-nowrap">
          ₹{item.total_bill_amount.toFixed(2)}
        </div>
      ),
      exportFormat: (item) => `₹${item.total_bill_amount.toFixed(2)}`
    },
    {
      Header: 'Final Amount',
      accessor: 'final_grand_total',
      width: '130px',
      Cell: (item) => (
        <div className="text-nowrap fw-bold">
          ₹{item.final_grand_total.toFixed(2)}
        </div>
      ),
      exportFormat: (item) => `₹${item.final_grand_total.toFixed(2)}`
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
        onClick={fetchCouponReport}
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
      <Breadcrumb.Item active>Coupon Reports</Breadcrumb.Item>
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
                  resourceName="Coupon Reports"
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
                    data={couponDetails}
                    columns={columns}
                    title="Coupon Reports"
                    filterInfo={getFilterInfo()}
                    enableHorizontalScroll={true}
                    onBack={handleGoBack}
                    filterControls={renderFilterControls()}
                    dataFetched={dataFetched}
                    breadcrumbs={renderBreadcrumbs()}
                    onRefresh={fetchCouponReport}
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

export default CouponReports; 