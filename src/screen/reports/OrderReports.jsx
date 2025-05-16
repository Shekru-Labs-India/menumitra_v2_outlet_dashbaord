import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../../config/apiConfig';
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Table,
  Badge,
  Spinner,
  Form,
  Row,
  Col,
  Button
} from 'react-bootstrap';
import VerticalSidebar from '../../components/VerticalSidebar';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { ForbiddenAccessMessage } from '../../components/common';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const OrderReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderData, setOrderData] = useState([]);
  const [orderReport, setOrderReport] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [orderType, setOrderType] = useState('all');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrderReport();
  }, [filterType, startDate, endDate, orderType]);

  const fetchOrderReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setPermissionDenied(false);

      const params = {
        filter_type: filterType,
        outlet_id: localStorage.getItem('outlet_id'),
        user_id: localStorage.getItem('user_id')
      };

      if (filterType === 'date_range') {
        if (startDate && endDate) {
          params.start_date = startDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
          params.end_date = endDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });
        }
        if (orderType !== 'all') {
          params.order_type = orderType;
        }
      }

      const response = await api.post(API_PATHS.outletStatistics + '/order_report', params);
      setOrderData(response.data.detail.orders || []);
      setOrderReport(response.data.detail.order_report || null);
    } catch (err) {
      console.error('Error fetching order report:', err);
      
      if (err.response?.status === 403 || 
          err.response?.data?.detail?.includes('permission') ||
          err.response?.data?.detail?.includes('access')) {
        setPermissionDenied(true);
        setError(err.response?.data?.detail || 'You don\'t have permission to access reports management functionality');
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

  const handleFilterChange = (e) => {
    setFilterType(e.target.value);
    if (e.target.value === 'all') {
      setStartDate(null);
      setEndDate(null);
      setOrderType('all');
    }
  };

  const handleOrderTypeChange = (e) => {
    setOrderType(e.target.value);
  };

  const handleRetry = () => {
    fetchOrderReport();
  };

  const getStatusBadgeColor = (status) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'success';
      case 'cooking':
        return 'warning';
      case 'placed':
        return 'info';
      case 'cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
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
                <>
                  <Card className="mb-4">
                    <CardHeader className="d-flex justify-content-between align-items-center">
                      <CardTitle>Order Reports</CardTitle>
                      <div className="d-flex gap-3">
                        <Form.Select
                          value={filterType}
                          onChange={handleFilterChange}
                          style={{ width: '200px' }}
                        >
                          <option value="all">All Orders</option>
                          <option value="date_range">Date Range</option>
                        </Form.Select>
                        {filterType === 'date_range' && (
                          <>
                            <DatePicker
                              selected={startDate}
                              onChange={date => setStartDate(date)}
                              selectsStart
                              startDate={startDate}
                              endDate={endDate}
                              placeholderText="Start Date"
                              className="form-control"
                              dateFormat="dd MMM yyyy"
                            />
                            <DatePicker
                              selected={endDate}
                              onChange={date => setEndDate(date)}
                              selectsEnd
                              startDate={startDate}
                              endDate={endDate}
                              minDate={startDate}
                              placeholderText="End Date"
                              className="form-control"
                              dateFormat="dd MMM yyyy"
                            />
                            <Form.Select
                              value={orderType}
                              onChange={handleOrderTypeChange}
                              style={{ width: '200px' }}
                            >
                              <option value="all">All Types</option>
                              <option value="dine-in">Dine In</option>
                              <option value="parcel">Parcel</option>
                            </Form.Select>
                          </>
                        )}
                        <Button
                          variant="outline-primary"
                          onClick={handleRetry}
                          disabled={loading}
                        >
                          <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>

                  {orderReport && (
                    <Row className="mb-4">
                      <Col md={4}>
                        <Card className="h-100">
                          <CardBody>
                            <h6 className="card-title">Total Orders</h6>
                            <h2 className="mb-0">{orderReport.total_orders}</h2>
                          </CardBody>
                        </Card>
                      </Col>
                      <Col md={4}>
                        <Card className="h-100">
                          <CardBody>
                            <h6 className="card-title">Total Revenue</h6>
                            <h2 className="mb-0">{formatCurrency(orderReport.total_revenue)}</h2>
                          </CardBody>
                        </Card>
                      </Col>
                      <Col md={4}>
                        <Card className="h-100">
                          <CardBody>
                            <h6 className="card-title">Average Order Value</h6>
                            <h2 className="mb-0">{formatCurrency(orderReport.average_order_value)}</h2>
                          </CardBody>
                        </Card>
                      </Col>
                    </Row>
                  )}

                  <Card>
                    <CardBody>
                      {loading ? (
                        <div className="text-center py-5">
                          <Spinner animation="border" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </Spinner>
                        </div>
                      ) : (
                        <Table responsive hover>
                          <thead>
                            <tr>
                              <th>Order #</th>
                              <th>Type</th>
                              <th>Status</th>
                              <th>Customer</th>
                              <th>Items</th>
                              <th>Total Amount</th>
                              <th>Payment</th>
                              <th>Created On</th>
                            </tr>
                          </thead>
                          <tbody>
                            {orderData.map((order) => (
                              <tr key={order.order_id}>
                                <td>{order.order_number}</td>
                                <td>
                                  <Badge bg={order.order_type === 'dine-in' ? 'primary' : 'info'}>
                                    {order.order_type}
                                  </Badge>
                                </td>
                                <td>
                                  <Badge bg={getStatusBadgeColor(order.order_status)}>
                                    {order.order_status}
                                  </Badge>
                                </td>
                                <td>
                                  <div>{order.customer_name}</div>
                                  <small className="text-muted">{order.customer_mobile}</small>
                                </td>
                                <td>
                                  <ul className="list-unstyled mb-0">
                                    {order.menu_items.map((item, index) => (
                                      <li key={index}>
                                        {item.quantity}x {item.menu_name}
                                        {item.comment && (
                                          <small className="text-muted d-block">
                                            Note: {item.comment}
                                          </small>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </td>
                                <td>
                                  <div>{formatCurrency(order.final_grand_total)}</div>
                                  {order.discount_amount > 0 && (
                                    <small className="text-muted">
                                      Discount: {formatCurrency(order.discount_amount)}
                                    </small>
                                  )}
                                </td>
                                <td>
                                  <div>{order.payment_method || 'N/A'}</div>
                                  <Badge bg={order.is_paid === "0" ? 'warning' : 'success'}>
                                    {order.is_paid === "0" ? 'Unpaid' : 'Paid'}
                                  </Badge>
                                </td>
                                <td>{order.created_on}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      )}
                    </CardBody>
                  </Card>
                </>
              )}
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderReports; 