import React, { useState } from 'react';
import { api, API_PATHS } from '../../config/apiConfig';
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
  Row,
  Col
} from 'react-bootstrap';
import VerticalSidebar from '../../components/VerticalSidebar';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { ForbiddenAccessMessage, ReportTable, ReportFilters } from '../../components/common';
import { useNavigate } from 'react-router-dom';

function CouponReports() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [couponData, setCouponData] = useState(null);
  const [couponDetails, setCouponDetails] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [orderType, setOrderType] = useState('all');
  const [dataFetched, setDataFetched] = useState(false);
  const [filterParams, setFilterParams] = useState(null);
  
  const navigate = useNavigate();

  const fetchCouponReport = async (params) => {
    try {
      setLoading(true);
      setError(null);
      setPermissionDenied(false);
      setFilterParams(params);

      const apiParams = {
        outlet_id: localStorage.getItem('outlet_id'),
        user_id: localStorage.getItem('user_id'),
        filter_type: 'all'
      };

      // Set order type if specified
      if (params.order_type && params.order_type !== 'all') {
        apiParams.filter_type = 'order_type';
        apiParams.order_type = params.order_type;
        setOrderType(params.order_type);
      } else {
        setOrderType('all');
      }

      // Add date range parameters if applicable
      if (params.start_date && params.end_date) {
        apiParams.start_date = params.start_date.toISOString().split('T')[0];
        apiParams.end_date = params.end_date.toISOString().split('T')[0];
      } else if (params.date_range && params.date_range !== 'All Time') {
        apiParams.date_range = params.date_range;
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

  const handleRetry = () => {
    fetchCouponReport(filterParams || {});
  };

  // Function to check if there's meaningful data to display
  const hasData = () => {
    if (!couponData) return false;
    
    const report = couponData.coupon_report;
    return report.total_coupons_used > 0 || 
           report.total_discount_given > 0 || 
           report.total_revenue > 0 || 
           report.average_discount_per_order > 0;
  };

  // Define table columns
  const columns = [
    {
      Header: 'Order #',
      accessor: 'order_number',
      width: '10%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          <span className="fw-semibold text-primary">#{item.order_number}</span>
          <small className="text-muted">ID: {item.order_id}</small>
        </div>
      ),
      exportFormat: (item) => `#${item.order_number} (ID: ${item.order_id})`
    },
    {
      Header: 'Type',
      accessor: 'order_type',
      width: '10%',
      Cell: (item) => (
        <Badge bg={getOrderTypeColor(item.order_type)}>
          {item.order_type}
        </Badge>
      ),
      exportFormat: (item) => item.order_type
    },
    {
      Header: 'Status',
      accessor: 'order_status',
      width: '10%',
      Cell: (item) => (
        <Badge bg={getStatusColor(item.order_status)}>
          {item.order_status}
        </Badge>
      ),
      exportFormat: (item) => item.order_status
    },
    {
      Header: 'Date',
      accessor: 'created_on',
      width: '10%',
      Cell: (item) => <span>{item.created_on}</span>,
      exportFormat: (item) => item.created_on
    },
    {
      Header: 'Coupon Code',
      accessor: 'coupon_code',
      width: '10%',
      Cell: (item) => <span className="fw-bold">{item.coupon_code}</span>,
      exportFormat: (item) => item.coupon_code
    },
    {
      Header: 'Coupon Type',
      accessor: 'coupon_type',
      width: '10%',
      Cell: (item) => (
        <Badge bg={item.coupon_type === 'amount' ? 'success' : 'warning'}>
          {item.coupon_type}
        </Badge>
      ),
      exportFormat: (item) => item.coupon_type
    },
    {
      Header: 'Discount',
      accessor: 'discount_amount',
      width: '10%',
      Cell: (item) => <span>₹{item.discount_amount.toFixed(2)}</span>,
      exportFormat: (item) => `₹${item.discount_amount.toFixed(2)}`
    },
    {
      Header: 'Bill Amount',
      accessor: 'total_bill_amount',
      width: '10%',
      Cell: (item) => <span>₹{item.total_bill_amount.toFixed(2)}</span>,
      exportFormat: (item) => `₹${item.total_bill_amount.toFixed(2)}`
    },
    {
      Header: 'Final Amount',
      accessor: 'final_grand_total',
      width: '10%',
      Cell: (item) => <span className="fw-bold">₹{item.final_grand_total.toFixed(2)}</span>,
      exportFormat: (item) => `₹${item.final_grand_total.toFixed(2)}`
    }
  ];

  // Define expandable content for additional coupon details
  const renderCouponDetails = (item) => (
    <>
      <h6 className="mb-3 text-primary">
        <i className="fas fa-ticket me-2"></i>
        Coupon Details
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
                <span className="fw-bold">Order Type:</span>
                <span>{item.order_type}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Order Status:</span>
                <span>{item.order_status}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Created On:</span>
                <span>{item.created_on}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Coupon Code:</span>
                <span>{item.coupon_code}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Coupon Type:</span>
                <span>{item.coupon_type}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Discount Amount:</span>
                <span>₹{item.discount_amount.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Special Discount:</span>
                <span>₹{item.special_discount.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Bill Amount:</span>
                <span>₹{item.total_bill_amount.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Final Amount:</span>
                <span>₹{item.final_grand_total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {item.customer_name && (
        <div className="row mt-3">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Customer Information</h6>
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">Name:</span>
                  <span>{item.customer_name}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">Mobile:</span>
                  <span>{item.customer_mobile}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Prepare filter info for export
  const getFilterInfo = () => {
    if (!filterParams) {
      return {
        'Order Type': 'All Orders',
        'Date Range': 'All Time'
      };
    }

    const info = {
      'Order Type': filterParams.order_type ? filterParams.order_type : 'All Orders',
      'Date Range': filterParams.date_range || 'All Time'
    };

    if (filterParams.start_date && filterParams.end_date) {
      info['Date Range'] = `${filterParams.start_date.toLocaleDateString()} to ${filterParams.end_date.toLocaleDateString()}`;
    }

    return info;
  };

  if (permissionDenied) {
    return (
      <div className="layout-wrapper layout-content-navbar">
        <div className="layout-container">
          <VerticalSidebar />
          <div className="layout-page d-flex flex-column min-vh-100">
            <Header />
            <div className="content-wrapper flex-grow-1">
              <ForbiddenAccessMessage 
                title="Permission Denied" 
                message={error}
                resourceName="Coupon Reports"
                onRetry={handleRetry}
                onBack={() => navigate(-1)}
              />
            </div>
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        <VerticalSidebar />
        <div className="layout-page d-flex flex-column min-vh-100">
          <Header />
          <div className="content-wrapper flex-grow-1">
            <div className="container-fluid flex-grow-1 container-p-y">
              {error ? (
                <div className="alert alert-danger mb-4" role="alert">
                  {error}
                </div>
              ) : (
                <Card>
                  <CardHeader className="bg-white">
                    <CardTitle className="text-center w-100 mb-0 fw-bold text-primary">Coupon Reports</CardTitle>
                  </CardHeader>

                  <CardBody>
                    {/* Filters Section */}
                    <ReportFilters
                      isLoading={loading}
                      onSubmit={fetchCouponReport}
                      defaultDateRange="All Time"
                    >
                      {/* Order Type Filter */}
                      <select 
                        className="form-select"
                        name="order_type"
                        defaultValue="all"
                        style={{ width: '200px' }}
                      >
                        <option value="all">All Orders</option>
                        <option value="dine-in">Dine-in</option>
                        <option value="parcel">Parcel</option>
                        <option value="counter">Counter</option>
                        <option value="delivery">Delivery</option>
                        <option value="drive-through">Drive-through</option>
                      </select>
                    </ReportFilters>

                    {/* Summary Cards - Only show after data is fetched AND there is meaningful data */}
                    {dataFetched && hasData() && (
                      <Row className="mb-4">
                        <Col md={3}>
                          <Card className="h-100">
                            <CardBody className="bg-primary text-white">
                              <h6 className="card-title">Total Coupons Used</h6>
                              <h3 className="mb-0">{couponData.coupon_report.total_coupons_used}</h3>
                            </CardBody>
                          </Card>
                        </Col>
                        <Col md={3}>
                          <Card className="h-100">
                            <CardBody className="bg-success text-white">
                              <h6 className="card-title">Total Revenue</h6>
                              <h3 className="mb-0">₹{couponData.coupon_report.total_revenue.toFixed(2)}</h3>
                            </CardBody>
                          </Card>
                        </Col>
                        <Col md={3}>
                          <Card className="h-100">
                            <CardBody className="bg-warning text-white">
                              <h6 className="card-title">Total Discount Given</h6>
                              <h3 className="mb-0">₹{couponData.coupon_report.total_discount_given.toFixed(2)}</h3>
                            </CardBody>
                          </Card>
                        </Col>
                        <Col md={3}>
                          <Card className="h-100">
                            <CardBody className="bg-info text-white">
                              <h6 className="card-title">Avg. Discount/Order</h6>
                              <h3 className="mb-0">₹{couponData.coupon_report.average_discount_per_order.toFixed(2)}</h3>
                            </CardBody>
                          </Card>
                        </Col>
                      </Row>
                    )}

                    {/* Coupon Type Breakdown - Only show after data is fetched AND there is meaningful data */}
                    {dataFetched && hasData() && Object.keys(couponData.coupon_report.coupon_type_breakdown).length > 0 && (
                      <Row className="mb-4">
                        <Col md={6}>
                          <Card>
                            <CardHeader>
                              <h5 className="card-title mb-0">Coupon Type Breakdown</h5>
                            </CardHeader>
                            <CardBody>
                              <div className="table-responsive">
                                <table className="table table-bordered">
                                  <thead>
                                    <tr>
                                      <th>Type</th>
                                      <th>Count</th>
                                      <th>Total Discount</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr>
                                      <td>Amount Based</td>
                                      <td>{couponData.coupon_report.coupon_type_breakdown.amount?.count || 0}</td>
                                      <td>₹{(couponData.coupon_report.coupon_type_breakdown.amount?.total_discount || 0).toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                      <td>Percentage Based</td>
                                      <td>{couponData.coupon_report.coupon_type_breakdown.percent?.count || 0}</td>
                                      <td>₹{(couponData.coupon_report.coupon_type_breakdown.percent?.total_discount || 0).toFixed(2)}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </CardBody>
                          </Card>
                        </Col>
                      </Row>
                    )}

                    {/* Table Section - Only show after data is fetched AND there are coupon details */}
                    {dataFetched && couponDetails.length > 0 ? (
                      <ReportTable
                        data={couponDetails}
                        columns={columns}
                        title="Coupon Details"
                        expandableContent={renderCouponDetails}
                        filterInfo={getFilterInfo()}
                      />
                    ) : dataFetched ? (
                      <div className="alert alert-info mt-4">
                        <i className="fas fa-info-circle me-2"></i>
                        No coupon data found for the selected filters. Please try different filter criteria.
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
}

function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'paid':
      return 'success';
    case 'cancelled':
      return 'danger';
    case 'cooking':
      return 'warning';
    default:
      return 'secondary';
  }
}

function getOrderTypeColor(type) {
  switch (type?.toLowerCase()) {
    case 'dine-in':
      return 'primary';
    case 'parcel':
      return 'info';
    case 'counter':
      return 'success';
    case 'delivery':
      return 'warning';
    case 'drive-through':
      return 'danger';
    default:
      return 'secondary';
  }
}

export default CouponReports; 