import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../../config/apiConfig';
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
  Spinner,
  Form,
  Row,
  Col
} from 'react-bootstrap';
import VerticalSidebar from '../../components/VerticalSidebar';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { ForbiddenAccessMessage, ReportTable, ReportFilters } from '../../components/common';
import { useNavigate } from 'react-router-dom';

const OrderStatusReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusHistoryData, setStatusHistoryData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [orderStatusReport, setOrderStatusReport] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [filterParams, setFilterParams] = useState(null);
  
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

  const fetchOrderStatusReport = async (params) => {
    try {
      setLoading(true);
      setError(null);
      setPermissionDenied(false);
      setFilterParams(params); // Store the filter params for potential reuse

      // Set default filter_type if not provided
      const apiParams = {
        filter_type: filterType,
        outlet_id: localStorage.getItem('outlet_id'),
        user_id: localStorage.getItem('user_id')
      };

      // Add date range parameters if applicable
      if (params.start_date && params.end_date) {
        apiParams.filter_type = 'date_range';
        apiParams.start_date = params.start_date.toISOString().split('T')[0];
        apiParams.end_date = params.end_date.toISOString().split('T')[0];
      } else if (params.date_range && params.date_range !== 'All Time') {
        apiParams.date_range = params.date_range;
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

  const handleRetry = () => {
    fetchOrderStatusReport({});
  };

  const handleFilterTypeChange = (e) => {
    setFilterType(e.target.value);
  };

  // Define table columns
  const columns = [
    {
      Header: 'Order Details',
      accessor: 'order_number',
      width: '20%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          <span className="fw-semibold text-primary">Order #{item.order_number}</span>
          <small className="text-muted">ID: {item.order_id}</small>
        </div>
      ),
      exportFormat: (item) => `Order #${item.order_number} (ID: ${item.order_id})`
    },
    {
      Header: 'Order Type',
      accessor: 'order_type',
      width: '15%',
      Cell: (item) => {
        const orderType = item.order_type?.toLowerCase();
        return orderType === 'dine-in' ? 
          <Badge bg="info">Dine-in</Badge> : 
          <Badge bg="warning">Parcel</Badge>;
      },
      exportFormat: (item) => item.order_type || '-'
    },
    {
      Header: 'Status',
      accessor: 'order_status',
      width: '15%',
      Cell: (item) => {
        const status = item.order_status?.toLowerCase();
        let badgeColor = 'secondary';
        
        switch (status) {
          case 'placed':
            badgeColor = 'primary';
            break;
          case 'cooking':
            badgeColor = 'warning';
            break;
          case 'served':
            badgeColor = 'info';
            break;
          case 'paid':
            badgeColor = 'success';
            break;
          case 'cancelled':
            badgeColor = 'danger';
            break;
          case 'udhari_pending':
            badgeColor = 'dark';
            break;
          case 'complementary':
            badgeColor = 'light';
            break;
          default:
            badgeColor = 'secondary';
        }
        
        return <Badge bg={badgeColor}>{item.order_status}</Badge>;
      },
      exportFormat: (item) => item.order_status || '-'
    },
    {
      Header: 'Amount',
      accessor: 'amount',
      width: '15%',
      Cell: (item) => (
        <span>₹{item.amount?.toFixed(2) || '0.00'}</span>
      ),
      exportFormat: (item) => `₹${item.amount?.toFixed(2) || '0.00'}`
    },
    {
      Header: 'Changed By',
      accessor: 'user_name',
      width: '15%',
      Cell: (item) => (
        <span>{item.user_name || '-'}</span>
      ),
      exportFormat: (item) => item.user_name || '-'
    },
    {
      Header: 'Changed On',
      accessor: 'changed_on',
      width: '20%',
      Cell: (item) => (
        <span>{item.changed_on || '-'}</span>
      ),
      exportFormat: (item) => item.changed_on || '-'
    }
  ];

  // Define expandable content for additional order status details
  const renderOrderStatusDetails = (item) => (
    <>
      <h6 className="mb-3 text-primary">
        <i className="fas fa-receipt me-2"></i>
        Order Status Details
      </h6>
      <div className="row">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Order Number:</span>
                <span>#{item.order_number}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Order ID:</span>
                <span>{item.order_id}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Order Type:</span>
                <span>{item.order_type}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Status:</span>
                <span>{item.order_status}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Amount:</span>
                <span>₹{item.amount?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Changed By:</span>
                <span>{item.user_name}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Changed On:</span>
                <span>{item.changed_on}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // Prepare filter info for export
  const getFilterInfo = () => {
    if (!filterParams) {
      return {
        'Filter Type': 'All Orders',
        'Date Range': 'All Time'
      };
    }

    const info = {
      'Filter Type': filterParams.filter_type === 'date_range' ? 'Date Range' : 'All Orders',
      'Date Range': filterParams.date_range || 'All Time'
    };

    if (filterParams.start_date && filterParams.end_date) {
      info['Date Range'] = `${filterParams.start_date} to ${filterParams.end_date}`;
    } else if (filterParams.start_date) {
      info['Date Range'] = `From ${filterParams.start_date}`;
    } else if (filterParams.end_date) {
      info['Date Range'] = `Until ${filterParams.end_date}`;
    }

    return info;
  };

  // Render status breakdown cards
  const renderStatusBreakdown = () => {
    if (!orderStatusReport || !orderStatusReport.status_breakdown) {
      return null;
    }

    const statusData = orderStatusReport.status_breakdown;
    const statusNames = Object.keys(statusData);

    return (
      <>
        <h5 className="mt-4 mb-3">Status Breakdown</h5>
        <Row className="mb-4">
          {statusNames.map((statusName) => (
            <Col md={3} key={statusName}>
              <Card className="h-100 mb-3">
                <CardHeader className="bg-light">
                  <h6 className="mb-0 text-capitalize">{statusName.replace('_', ' ')}</h6>
                </CardHeader>
                <CardBody>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Count:</span>
                    <span className="badge bg-primary">{statusData[statusName].count}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Amount:</span>
                    <span className="fw-bold">₹{statusData[statusName].total_amount.toFixed(2)}</span>
                  </div>
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>
      </>
    );
  };

  // Render order type breakdown cards
  const renderOrderTypeBreakdown = () => {
    if (!orderStatusReport || !orderStatusReport.order_type_breakdown) {
      return null;
    }

    const orderTypeData = orderStatusReport.order_type_breakdown;
    const orderTypes = Object.keys(orderTypeData);

    return (
      <>
        <h5 className="mt-4 mb-3">Order Type Breakdown</h5>
        <Row className="mb-4">
          {orderTypes.map((orderType) => (
            <Col md={6} key={orderType}>
              <Card className="h-100 mb-3">
                <CardHeader className="bg-light">
                  <h6 className="mb-0 text-capitalize">{orderType}</h6>
                </CardHeader>
                <CardBody>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Count:</span>
                    <span className="badge bg-primary">{orderTypeData[orderType].count}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Amount:</span>
                    <span className="fw-bold">₹{orderTypeData[orderType].total_amount.toFixed(2)}</span>
                  </div>
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>
      </>
    );
  };

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
                <Card>
                  <CardHeader className="bg-white">
                    <CardTitle className="text-center w-100 mb-0 fw-bold text-primary">Order Status Change Reports</CardTitle>
                  </CardHeader>

                  <CardBody>
                    {/* Filters Section */}
                    <ReportFilters
                      isLoading={loading}
                      onSubmit={fetchOrderStatusReport}
                      defaultDateRange="All Time"
                      showDateRangeFilter={true}
                    />

                    {/* Summary Card */}
                    {orderStatusReport && (
                      <Row className="mb-4">
                        <Col md={12}>
                          <Card className="h-100">
                            <CardBody>
                              <h6 className="card-title">Total Status Changes</h6>
                              <h2 className="mb-0">{orderStatusReport.total_status_changes}</h2>
                            </CardBody>
                          </Card>
                        </Col>
                      </Row>
                    )}

                    {/* Status Breakdown */}
                    {orderStatusReport && renderStatusBreakdown()}

                    {/* Order Type Breakdown */}
                    {orderStatusReport && renderOrderTypeBreakdown()}

                    {/* Table Section */}
                    {dataFetched && filteredData.length > 0 ? (
                      <ReportTable
                        data={filteredData}
                        columns={columns}
                        title="Order Status History"
                        expandableContent={renderOrderStatusDetails}
                        filterInfo={getFilterInfo()}
                      />
                    ) : dataFetched && filteredData.length === 0 ? (
                      <div className="alert alert-info mt-4">
                        <i className="fas fa-info-circle me-2"></i>
                        No order status history found for the selected filters. Please try different filter criteria.
                      </div>
                    ) : null}
                  </CardBody>
                </Card>
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