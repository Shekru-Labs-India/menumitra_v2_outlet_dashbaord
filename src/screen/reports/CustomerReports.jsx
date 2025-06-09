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

function CustomerReports() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [customerDetails, setCustomerDetails] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [filterParams, setFilterParams] = useState(null);
  
  const navigate = useNavigate();

  const fetchCustomerReport = async (params) => {
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
      }

      // Add date range parameters if applicable
      if (params.start_date && params.end_date) {
        apiParams.start_date = params.start_date.toISOString().split('T')[0];
        apiParams.end_date = params.end_date.toISOString().split('T')[0];
      } else if (params.date_range && params.date_range !== 'All Time') {
        apiParams.date_range = params.date_range;
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

  const handleRetry = () => {
    fetchCustomerReport(filterParams || {});
  };

  // Function to check if there's meaningful data to display
  const hasData = () => {
    if (!customerData) return false;
    
    const report = customerData.customer_report;
    return report.total_customers > 0 || 
           report.total_orders > 0 || 
           report.total_revenue > 0;
  };

  // Define table columns
  const columns = [
    {
      Header: 'Customer Info',
      accessor: 'customer_name',
      width: '25%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          <span className="fw-semibold">{item.customer_name}</span>
          <small className="text-muted">Mobile: {item.customer_mobile}</small>
          <small className="text-muted">Address: {item.customer_address || 'N/A'}</small>
        </div>
      ),
      exportFormat: (item) => `${item.customer_name} (${item.customer_mobile})`
    },
    {
      Header: 'Order Summary',
      accessor: 'total_orders',
      width: '20%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          <span>Total Orders: {item.total_orders}</span>
          <span>Total Spent: ₹{item.total_spent.toFixed(2)}</span>
          {customerData && (
            <small className="text-muted">
              Avg: {customerData.customer_report.avg_orders_per_customer.toFixed(1)} orders/customer
            </small>
          )}
        </div>
      ),
      exportFormat: (item) => `Orders: ${item.total_orders}, Spent: ₹${item.total_spent.toFixed(2)}`
    },
    {
      Header: 'First Order',
      accessor: 'first_order_date',
      width: '15%',
      Cell: (item) => <span>{item.first_order_date}</span>,
      exportFormat: (item) => item.first_order_date
    },
    {
      Header: 'Last Order',
      accessor: 'last_order_date',
      width: '15%',
      Cell: (item) => <span>{item.last_order_date}</span>,
      exportFormat: (item) => item.last_order_date
    },
    {
      Header: 'Order Types',
      accessor: 'order_types',
      width: '25%',
      Cell: (item) => (
        <div>
          {Object.entries(item.order_types).map(([type, count]) => (
            <div key={type} className="d-flex justify-content-between align-items-center mb-1">
              <span className="text-capitalize">{type}</span>
              <Badge bg="primary" className="ms-2">{count}</Badge>
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

  // Define expandable content for customer details
  const renderCustomerDetails = (customer) => (
    <>
      <h6 className="mb-3 text-primary">
        <i className="fas fa-user me-2"></i>
        Customer Details
      </h6>
      <div className="row">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Name:</span>
                <span>{customer.customer_name}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Mobile:</span>
                <span>{customer.customer_mobile}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Address:</span>
                <span>{customer.customer_address || 'N/A'}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">First Order:</span>
                <span>{customer.first_order_date}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Last Order:</span>
                <span>{customer.last_order_date}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="mb-3">Order Types</h6>
              {Object.entries(customer.order_types).map(([type, count]) => (
                <div key={type} className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-capitalize">{type}</span>
                  <Badge bg="primary">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="row mt-3">
        <div className="col-12">
          <h6 className="mb-3">Order History</h6>
          <div className="table-responsive">
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((order) => (
                  <tr key={order.order_id}>
                    <td>{order.order_number}</td>
                    <td className="text-capitalize">{order.order_type}</td>
                    <td>
                      <Badge bg={getStatusColor(order.order_status)}>
                        {order.order_status}
                      </Badge>
                    </td>
                    <td>₹{order.final_grand_total.toFixed(2)}</td>
                    <td>{order.created_on}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
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
                resourceName="Customer Reports"
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
                    <CardTitle className="text-center w-100 mb-0 fw-bold text-primary">Customer Reports</CardTitle>
                  </CardHeader>

                  <CardBody>
                    {/* Filters Section */}
                    <ReportFilters
                      isLoading={loading}
                      onSubmit={fetchCustomerReport}
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
                                  <h6 className="card-title">Total Customers</h6>
                                  <h3 className="mb-0">{customerData.customer_report.total_customers}</h3>
                            </CardBody>
                          </Card>
                        </Col>
                        <Col md={3}>
                          <Card className="h-100">
                            <CardBody className="bg-success text-white">
                                  <h6 className="card-title">Total Orders</h6>
                                  <h3 className="mb-0">{customerData.customer_report.total_orders}</h3>
                            </CardBody>
                          </Card>
                        </Col>
                        <Col md={3}>
                          <Card className="h-100">
                            <CardBody className="bg-info text-white">
                                  <h6 className="card-title">Total Revenue</h6>
                                  <h3 className="mb-0">₹{customerData.customer_report.total_revenue.toFixed(2)}</h3>
                            </CardBody>
                          </Card>
                        </Col>
                        <Col md={3}>
                          <Card className="h-100">
                            <CardBody className="bg-warning text-white">
                                  <h6 className="card-title">Avg Order Value</h6>
                                  <h3 className="mb-0">₹{customerData.customer_report.avg_order_value.toFixed(2)}</h3>
                            </CardBody>
                          </Card>
                        </Col>
                      </Row>
                    )}

                    {/* Order Type Breakdown - Only show after data is fetched AND there is meaningful data */}
                    {dataFetched && hasData() && Object.keys(customerData.customer_report.order_type_breakdown).length > 0 && (
                      <Row className="mb-4">
                        <Col md={6}>
                          <Card>
                            <CardHeader>
                                  <h5 className="card-title mb-0">Order Type Breakdown</h5>
                            </CardHeader>
                            <CardBody>
                                  <div className="row">
                                    {Object.entries(customerData.customer_report.order_type_breakdown).map(([type, count]) => (
                                      <div key={type} className="col-md-6 mb-2">
                                        <div className="d-flex justify-content-between align-items-center">
                                          <span className="text-capitalize">{type}</span>
                                      <Badge bg="primary">{count}</Badge>
                                      </div>
                                  </div>
                                ))}
                              </div>
                            </CardBody>
                          </Card>
                        </Col>
                      </Row>
                    )}

                    {/* Table Section - Only show after data is fetched AND there are customer details */}
                    {dataFetched && customerDetails.length > 0 ? (
                      <ReportTable
                        data={customerDetails}
                        columns={columns}
                        title="Customer Details"
                        expandableContent={renderCustomerDetails}
                        filterInfo={getFilterInfo()}
                      />
                    ) : dataFetched ? (
                      <div className="alert alert-info mt-4">
                        <i className="fas fa-info-circle me-2"></i>
                        No customer data found for the selected filters. Please try different filter criteria.
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

export default CustomerReports; 