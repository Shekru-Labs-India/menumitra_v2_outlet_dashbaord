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

const PaymentSettleReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentSettleHistoryData, setPaymentSettleHistoryData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [paymentSettleReport, setPaymentSettleReport] = useState(null);
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
    if (paymentSettleHistoryData.length > 0) {
      applyFilters();
    }
  }, [filterType, paymentSettleHistoryData]);

  const applyFilters = () => {
    let result = [...paymentSettleHistoryData];
    setFilteredData(result);
  };

  // Handle date range selection
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setShowDatePicker(range === 'Custom Range');
  };

  const fetchPaymentSettleReport = () => {
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

        console.log('Fetching payment settle report with params:', apiParams);
        const response = await api.post(API_PATHS.paymentSettleReport, apiParams);
        
        // Extract payment settle data from the response
        let paymentSettleHistory = [];
        let reportSummary = null;
        
        if (response.data && response.data.detail) {
          paymentSettleHistory = response.data.detail.payment_settle_history || [];
          reportSummary = response.data.detail.payment_settle_type_report || null;
        }
        
        console.log('API response data:', paymentSettleHistory);
        
        // Add unique id to each record for table component
        const processedData = paymentSettleHistory.map((item, index) => ({
          ...item,
          id: `payment-${index}`
        }));
        
        setPaymentSettleHistoryData(processedData);
        setFilteredData(processedData);
        setPaymentSettleReport(reportSummary);
        setDataFetched(true);
      } catch (err) {
        console.error('Error fetching payment settle report:', err);
        
        if (err.response?.status === 403 || 
            err.response?.data?.detail?.includes('permission') ||
            err.response?.data?.detail?.includes('access')) {
          setPermissionDenied(true);
          setError(err.response?.data?.detail || 'You don\'t have permission to access payment settle reports management functionality');
        } else {
          setError(err.response?.data?.detail || 'Failed to fetch payment settle report data');
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
    fetchPaymentSettleReport();
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
      Header: 'Previous Settle Type',
      accessor: 'previous_settle_type',
      width: '170px',
      Cell: (item) => {
        const settleType = item.previous_settle_type?.toLowerCase();
        return (
          <div className="text-nowrap">
            {settleType === 'null' ? 'None' : (item.previous_settle_type || 'None')}
          </div>
        );
      },
      exportFormat: (item) => item.previous_settle_type === 'null' ? 'None' : (item.previous_settle_type || 'None')
    },
    {
      Header: 'New Settle Type',
      accessor: 'new_settle_type',
      width: '150px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.new_settle_type || '-'}
        </div>
      ),
      exportFormat: (item) => item.new_settle_type || '-'
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
      accessor: 'changed_by',
      width: '150px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.changed_by || '-'}
        </div>
      ),
      exportFormat: (item) => item.changed_by || '-'
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
        onClick={fetchPaymentSettleReport}
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
      <Breadcrumb.Item active>Payment Settle Reports</Breadcrumb.Item>
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
                  resourceName="Payment Settle Reports"
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
                    title="Payment Settle Reports"
                    filterInfo={getFilterInfo()}
                    enableHorizontalScroll={true}
                    onBack={handleGoBack}
                    filterControls={renderFilterControls()}
                    dataFetched={dataFetched}
                    breadcrumbs={renderBreadcrumbs()}
                    onRefresh={fetchPaymentSettleReport}
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

export default PaymentSettleReports; 