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

const PaymentSettleReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentSettleHistoryData, setPaymentSettleHistoryData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [paymentSettleReport, setPaymentSettleReport] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [filterParams, setFilterParams] = useState(null);
  
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

  const fetchPaymentSettleReport = async (params) => {
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

  const handleRetry = () => {
    fetchPaymentSettleReport({});
  };

  const handleFilterTypeChange = (e) => {
    setFilterType(e.target.value);
  };

  // Define table columns
  const columns = [
    {
      Header: 'Order Details',
      accessor: 'order_number',
      width: '15%',
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
      width: '10%',
      Cell: (item) => {
        const orderType = item.order_type?.toLowerCase();
        return orderType === 'dine-in' ? 
          <Badge bg="info">Dine-in</Badge> : 
          <Badge bg="warning">Parcel</Badge>;
      },
      exportFormat: (item) => item.order_type || '-'
    },
    {
      Header: 'Previous Settle Type',
      accessor: 'previous_settle_type',
      width: '15%',
      Cell: (item) => {
        const settleType = item.previous_settle_type?.toLowerCase();
        
        if (!settleType || settleType === 'null') {
          return <span className="text-muted">None</span>;
        }
        
        let badgeColor = 'secondary';
        switch (settleType) {
          case 'paid':
            badgeColor = 'success';
            break;
          case 'complementary':
            badgeColor = 'info';
            break;
          case 'udhari':
            badgeColor = 'warning';
            break;
          default:
            badgeColor = 'secondary';
        }
        
        return <Badge bg={badgeColor}>{item.previous_settle_type}</Badge>;
      },
      exportFormat: (item) => item.previous_settle_type === 'null' ? 'None' : (item.previous_settle_type || 'None')
    },
    {
      Header: 'New Settle Type',
      accessor: 'new_settle_type',
      width: '15%',
      Cell: (item) => {
        const settleType = item.new_settle_type?.toLowerCase();
        let badgeColor = 'secondary';
        
        switch (settleType) {
          case 'paid':
            badgeColor = 'success';
            break;
          case 'complementary':
            badgeColor = 'info';
            break;
          case 'udhari':
            badgeColor = 'warning';
            break;
          default:
            badgeColor = 'secondary';
        }
        
        return <Badge bg={badgeColor}>{item.new_settle_type}</Badge>;
      },
      exportFormat: (item) => item.new_settle_type || '-'
    },
    {
      Header: 'Amount',
      accessor: 'amount',
      width: '10%',
      Cell: (item) => (
        <span>₹{item.amount?.toFixed(2) || '0.00'}</span>
      ),
      exportFormat: (item) => `₹${item.amount?.toFixed(2) || '0.00'}`
    },
    {
      Header: 'Changed By',
      accessor: 'changed_by',
      width: '15%',
      Cell: (item) => (
        <span>{item.changed_by || '-'}</span>
      ),
      exportFormat: (item) => item.changed_by || '-'
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

  // Define expandable content for additional payment settle details
  const renderPaymentSettleDetails = (item) => (
    <>
      <h6 className="mb-3 text-primary">
        <i className="fas fa-money-bill-wave me-2"></i>
        Payment Settlement Details
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
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Amount:</span>
                <span>₹{item.amount?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Previous Settle Type:</span>
                <span>{item.previous_settle_type === 'null' ? 'None' : item.previous_settle_type}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">New Settle Type:</span>
                <span>{item.new_settle_type}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Changed By:</span>
                <span>{item.changed_by}</span>
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

  // Render payment type breakdown cards
  const renderPaymentTypeBreakdown = () => {
    if (!paymentSettleReport || !paymentSettleReport.payment_type_breakdown) {
      return null;
    }

    const paymentTypeData = paymentSettleReport.payment_type_breakdown;
    const paymentTypes = Object.keys(paymentTypeData);

    return (
      <>
        <h5 className="mt-4 mb-3">Payment Type Breakdown</h5>
        <Row className="mb-4">
          {paymentTypes.map((paymentType) => (
            <Col md={4} key={paymentType}>
              <Card className="h-100 mb-3">
                <CardHeader className="bg-light">
                  <h6 className="mb-0 text-capitalize">{paymentType}</h6>
                </CardHeader>
                <CardBody>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Count:</span>
                    <span className="badge bg-primary">{paymentTypeData[paymentType].count}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Amount:</span>
                    <span className="fw-bold">₹{paymentTypeData[paymentType].total_amount.toFixed(2)}</span>
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
    if (!paymentSettleReport || !paymentSettleReport.order_type_breakdown) {
      return null;
    }

    const orderTypeData = paymentSettleReport.order_type_breakdown;
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
                  resourceName="Payment Settle Reports"
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
                    <CardTitle className="text-center w-100 mb-0 fw-bold text-primary">Payment Settlement Reports</CardTitle>
                  </CardHeader>

                  <CardBody>
                    {/* Filters Section */}
                    <ReportFilters
                      isLoading={loading}
                      onSubmit={fetchPaymentSettleReport}
                      defaultDateRange="All Time"
                      showDateRangeFilter={true}
                    />

                    {/* Summary Card */}
                    {paymentSettleReport && (
                      <Row className="mb-4">
                        <Col md={12}>
                          <Card className="h-100">
                            <CardBody>
                              <h6 className="card-title">Total Payment Settlement Changes</h6>
                              <h2 className="mb-0">{paymentSettleReport.total_changes}</h2>
                            </CardBody>
                          </Card>
                        </Col>
                      </Row>
                    )}

                    {/* Payment Type Breakdown */}
                    {paymentSettleReport && renderPaymentTypeBreakdown()}

                    {/* Order Type Breakdown */}
                    {paymentSettleReport && renderOrderTypeBreakdown()}

                    {/* Table Section */}
                    {dataFetched && filteredData.length > 0 ? (
                      <ReportTable
                        data={filteredData}
                        columns={columns}
                        title="Payment Settlement History"
                        expandableContent={renderPaymentSettleDetails}
                        filterInfo={getFilterInfo()}
                      />
                    ) : dataFetched && filteredData.length === 0 ? (
                      <div className="alert alert-info mt-4">
                        <i className="fas fa-info-circle me-2"></i>
                        No payment settlement history found for the selected filters. Please try different filter criteria.
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

export default PaymentSettleReports; 