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

const OrderReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [orderDetails, setOrderDetails] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [filterParams, setFilterParams] = useState(null);
  const [orderType, setOrderType] = useState('');
  
  const navigate = useNavigate();

  const fetchOrderReport = async (params) => {
    try {
      setLoading(true);
      setError(null);
      setPermissionDenied(false);
      setFilterParams(params);

      // Store order type from params for filtering
      if (params.order_type && params.order_type !== 'all') {
        setOrderType(params.order_type);
      } else {
        setOrderType('');
      }

      // Prepare API parameters with correct filter_type
      const apiParams = {
        outlet_id: localStorage.getItem('outlet_id'),
        user_id: localStorage.getItem('user_id'),
        filter_type: 'all'  // Default filter type
      };

      // Handle date range parameters
      if (params.start_date && params.end_date) {
        apiParams.filter_type = 'date_range';
        apiParams.start_date = params.start_date.toISOString().split('T')[0];
        apiParams.end_date = params.end_date.toISOString().split('T')[0];
      } else if (params.date_range && params.date_range !== 'All Time') {
        apiParams.filter_type = 'date_range';
        apiParams.date_range = params.date_range;
      }

      // Add order type if specified
      if (params.order_type && params.order_type !== 'all') {
        apiParams.order_type = params.order_type;
      }

      console.log('Fetching order report with params:', apiParams);
      
      // Make the actual API call
      const response = await api.post(API_PATHS.orderReport, apiParams);
      
      if (response.data && response.data.detail) {
        setOrderData(response.data.detail);
        
        // Add unique id to each order for table component
        const processedData = response.data.detail.orders.map((order) => ({
          ...order,
          id: `order-${order.order_id}`
        }));
        
        setOrderDetails(processedData);
        setDataFetched(true);
        console.log('Data fetched successfully:', response.data.detail);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching order report:', err);
      
      if (err.response?.status === 403 || 
          err.response?.data?.detail?.includes('permission') ||
          err.response?.data?.detail?.includes('access')) {
        setPermissionDenied(true);
        setError(err.response?.data?.detail || 'You don\'t have permission to access order reports functionality');
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch order report data');
      }

      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchOrderReport(filterParams || {});
  };

  // Function to check if there's meaningful data to display
  const hasData = () => {
    if (!orderData) return false;
    
    const report = orderData.order_report;
    return report.total_orders > 0 || 
           report.total_revenue > 0;
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
      Header: 'Customer',
      accessor: 'customer_name',
      width: '15%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          <span>{item.customer_name || 'N/A'}</span>
          {item.customer_mobile && <small className="text-muted">{item.customer_mobile}</small>}
        </div>
      ),
      exportFormat: (item) => `${item.customer_name || 'N/A'} (${item.customer_mobile || 'No mobile'})`
    },
    {
      Header: 'Date',
      accessor: 'created_on',
      width: '10%',
      Cell: (item) => <span>{item.created_on}</span>,
      exportFormat: (item) => item.created_on
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
      Header: 'Payment',
      accessor: 'payment_method',
      width: '10%',
      Cell: (item) => (
        <span>{item.payment_method || 'N/A'}</span>
      ),
      exportFormat: (item) => item.payment_method || 'N/A'
    },
    {
      Header: 'Bill Amount',
      accessor: 'total_bill_amount',
      width: '10%',
      Cell: (item) => <span>₹{item.total_bill_amount.toFixed(2)}</span>,
      exportFormat: (item) => `₹${item.total_bill_amount.toFixed(2)}`
    },
    {
      Header: 'Discount',
      accessor: 'discount_amount',
      width: '10%',
      Cell: (item) => <span>₹{item.discount_amount.toFixed(2)}</span>,
      exportFormat: (item) => `₹${item.discount_amount.toFixed(2)}`
    },
    {
      Header: 'Final Amount',
      accessor: 'final_grand_total',
      width: '15%',
      Cell: (item) => <span className="fw-bold">₹{item.final_grand_total.toFixed(2)}</span>,
      exportFormat: (item) => `₹${item.final_grand_total.toFixed(2)}`,
      sortFunction: (a, b, direction) => {
        const aAmount = parseFloat(a.final_grand_total);
        const bAmount = parseFloat(b.final_grand_total);
        return direction === 'asc' ? aAmount - bAmount : bAmount - aAmount;
      }
    }
  ];

  // Define expandable content for order items
  const renderOrderItems = (order) => (
    <>
      <h6 className="mb-3 text-primary">
        <i className="fas fa-shopping-cart me-2"></i>
        Order Details
      </h6>
      <div className="row">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Order Number:</span>
                <span>#{order.order_number}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Order Type:</span>
                <span>{order.order_type}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Order Status:</span>
                <span>{order.order_status}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Created On:</span>
                <span>{order.created_on}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Payment Method:</span>
                <span>{order.payment_method || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Bill Amount:</span>
                <span>₹{order.total_bill_amount.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Discount:</span>
                <span>₹{order.discount_amount.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Special Discount:</span>
                <span>₹{order.special_discount.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">GST Amount:</span>
                <span>₹{order.gst_amount.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Service Charges:</span>
                <span>₹{order.service_charges_amount.toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Final Amount:</span>
                <span className="fw-bold">₹{order.final_grand_total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {order.customer_name && (
        <div className="row mt-3">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Customer Information</h6>
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">Name:</span>
                  <span>{order.customer_name}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">Mobile:</span>
                  <span>{order.customer_mobile || 'N/A'}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">Address:</span>
                  <span>{order.customer_address || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="row mt-3">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Order Items</h6>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-sm table-bordered">
                  <thead className="bg-light">
                    <tr>
                      <th>Item Name</th>
                      <th className="text-center">Quantity</th>
                      <th className="text-end">Price</th>
                      <th className="text-end">Total</th>
                      <th>Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.menu_items && order.menu_items.length > 0 ? (
                      order.menu_items.map((item) => (
                        <tr key={item.menu_id}>
                          <td>{item.menu_name}</td>
                          <td className="text-center">{item.quantity}</td>
                          <td className="text-end">₹{item.price.toFixed(2)}</td>
                          <td className="text-end">₹{(item.quantity * item.price).toFixed(2)}</td>
                          <td>{item.comment || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center">No items available</td>
                      </tr>
                    )}
                    <tr className="table-light">
                      <td colSpan="3" className="text-end fw-bold">Total:</td>
                      <td className="text-end fw-bold">₹{order.total_bill_amount.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
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
        'Date Range': 'All Time',
        'Order Type': orderType || 'All'
      };
    }

    const info = {
      'Date Range': 'All Time',
      'Order Type': orderType || 'All'
    };

    if (filterParams.date_range && filterParams.date_range !== 'All Time') {
      info['Date Range'] = filterParams.date_range;
    } else if (filterParams.start_date && filterParams.end_date) {
      info['Date Range'] = `${filterParams.start_date.toLocaleDateString()} to ${filterParams.end_date.toLocaleDateString()}`;
    }

    return info;
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
                  resourceName="Order Reports"
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
                    <CardTitle className="text-center w-100 mb-0 fw-bold text-primary">Order Reports</CardTitle>
                  </CardHeader>

                  <CardBody>
                    {/* Filters Section */}
                    <ReportFilters
                      isLoading={loading}
                      onSubmit={fetchOrderReport}
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
                        <Col md={4}>
                          <Card className="h-100">
                            <CardBody className="bg-primary text-white">
                              <h6 className="card-title">Total Orders</h6>
                              <h3 className="mb-0">{orderData.order_report.total_orders}</h3>
                            </CardBody>
                          </Card>
                        </Col>
                        <Col md={4}>
                          <Card className="h-100">
                            <CardBody className="bg-success text-white">
                              <h6 className="card-title">Total Revenue</h6>
                              <h3 className="mb-0">₹{orderData.order_report.total_revenue.toFixed(2)}</h3>
                            </CardBody>
                          </Card>
                        </Col>
                        <Col md={4}>
                          <Card className="h-100">
                            <CardBody className="bg-info text-white">
                              <h6 className="card-title">Avg. Order Value</h6>
                              <h3 className="mb-0">₹{orderData.order_report.average_order_value.toFixed(2)}</h3>
                            </CardBody>
                          </Card>
                        </Col>
                      </Row>
                    )}

                    {/* Table Section - Only show after data is fetched AND there are order details */}
                    {dataFetched && orderDetails.length > 0 ? (
                      <ReportTable
                        data={orderDetails}
                        columns={columns}
                        title="Order Details"
                        expandableContent={renderOrderItems}
                        filterInfo={getFilterInfo()}
                      />
                    ) : dataFetched ? (
                      <div className="alert alert-info mt-4">
                        <i className="fas fa-info-circle me-2"></i>
                        No order data found for the selected filters. Please try different filter criteria.
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

function getStatusColor(status) {
  switch (status?.toLowerCase()) {
    case 'paid':
      return 'success';
    case 'cancelled':
      return 'danger';
    case 'cooking':
      return 'warning';
    case 'placed':
      return 'primary';
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

export default OrderReports; 