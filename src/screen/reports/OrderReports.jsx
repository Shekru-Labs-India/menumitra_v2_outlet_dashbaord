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
  const [expandedRows, setExpandedRows] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrderReport();
  }, [filterType, startDate, endDate, orderType]);

  const toggleRow = (orderId) => {
    setExpandedRows(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

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

      const response = await api.post(API_PATHS.orderReport, params);
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
                      <div className="d-flex align-items-center gap-2">
                        <div className="dropdown">
                          <button
                            type="button"
                            className="btn btn-outline-primary dropdown-toggle"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                          >
                            <i className="fas fa-calendar me-2"></i>
                            {filterType === 'all' ? 'All Orders' : 'Date Range'}
                          </button>
                          <ul className="dropdown-menu dropdown-menu-end">
                            <li>
                              <a href="javascript:void(0);"
                                className="dropdown-item d-flex align-items-center"
                                onClick={() => setFilterType('all')}>
                                All Orders
                              </a>
                            </li>
                            <li>
                              <a href="javascript:void(0);"
                                className="dropdown-item d-flex align-items-center"
                                onClick={() => setShowDatePicker(true)}>
                                Date Range
                              </a>
                            </li>
                          </ul>
                        </div>

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
                          </>
                        )}

                        <Form.Select
                          value={orderType}
                          onChange={handleOrderTypeChange}
                          style={{ width: '200px' }}
                        >
                          <option value="all">All Types</option>
                          <option value="dine-in">Dine In</option>
                          <option value="parcel">Parcel</option>
                          <option value="counter">Counter</option>
                          <option value="delivery">Delivery</option>
                          <option value="drive-through">Drive Through</option>
                        </Form.Select>

                        <button
                          type="button"
                          className={`btn btn-icon p-0 ${loading ? 'disabled' : ''}`}
                          onClick={handleRetry}
                          disabled={loading}
                          style={{ border: '1px solid var(--bs-primary)' }}
                        >
                          <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                        </button>
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
                        <div className="table-responsive">
                          <Table className="table-hover">
                            <thead>
                              <tr>
                                <th style={{ width: '5%' }}></th>
                                <th style={{ width: '15%' }}>Order Details</th>
                                <th style={{ width: '15%' }}>Customer</th>
                                <th style={{ width: '15%' }}>Status</th>
                                <th style={{ width: '20%' }}>Items</th>
                                <th style={{ width: '15%' }}>Amount</th>
                                <th style={{ width: '15%' }}>Payment</th>
                              </tr>
                            </thead>
                            <tbody>
                              {orderData.map((order) => (
                                <React.Fragment key={order.order_id}>
                                  <tr 
                                    className="cursor-pointer"
                                    onClick={() => toggleRow(order.order_id)}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <td>
                                      <i className={`fas fa-chevron-${expandedRows[order.order_id] ? 'down' : 'right'} transition-all`}></i>
                                    </td>
                                    <td>
                                      <div className="d-flex flex-column">
                                        <span className="fw-semibold">#{order.order_number}</span>
                                        <small className="text-muted">{order.created_on}</small>
                                      </div>
                                    </td>
                                    <td>
                                      <div className="d-flex flex-column">
                                        <span>{order.customer_name}</span>
                                        <small className="text-muted">{order.customer_mobile}</small>
                                      </div>
                                    </td>
                                    <td>
                                      <Badge bg={getStatusBadgeColor(order.order_status)}>
                                        {order.order_status}
                                      </Badge>
                                    </td>
                                    <td>
                                      <div className="d-flex flex-column">
                                        {order.menu_items.slice(0, 2).map((item, index) => (
                                          <span key={index}>
                                            {item.quantity}x {item.menu_name}
                                          </span>
                                        ))}
                                        {order.menu_items.length > 2 && (
                                          <small className="text-muted">
                                            +{order.menu_items.length - 2} more items
                                          </small>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      <div className="d-flex flex-column">
                                        <span className="fw-semibold">{formatCurrency(order.final_grand_total)}</span>
                                        {order.discount_amount > 0 && (
                                          <small className="text-muted">
                                            Discount: {formatCurrency(order.discount_amount)}
                                          </small>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      <div className="d-flex flex-column">
                                        <span>{order.payment_method || 'N/A'}</span>
                                        <Badge bg={order.is_paid === "0" ? 'warning' : 'success'}>
                                          {order.is_paid === "0" ? 'Unpaid' : 'Paid'}
                                        </Badge>
                                      </div>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colSpan="7" className="p-0">
                                      <div 
                                        className={`collapse ${expandedRows[order.order_id] ? 'show' : ''}`}
                                        style={{
                                          transition: 'all 0.3s ease-in-out',
                                          maxHeight: expandedRows[order.order_id] ? '500px' : '0',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        <div className="p-3 bg-light">
                                          <div className="row">
                                            <div className="col-md-8">
                                              <h6 className="mb-3">Order Items</h6>
                                              <div className="table-responsive">
                                                <Table className="table-sm">
                                                  <thead>
                                                    <tr>
                                                      <th>Item</th>
                                                      <th>Quantity</th>
                                                      <th>Price</th>
                                                      <th>Total</th>
                                                      <th>Note</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {order.menu_items.map((item, index) => (
                                                      <tr key={index}>
                                                        <td>{item.menu_name}</td>
                                                        <td>{item.quantity}</td>
                                                        <td>{formatCurrency(item.price)}</td>
                                                        <td>{formatCurrency(item.price * item.quantity)}</td>
                                                        <td>
                                                          <small className="text-muted">
                                                            {item.comment || '-'}
                                                          </small>
                                                        </td>
                                                      </tr>
                                                    ))}
                                                  </tbody>
                                                </Table>
                                              </div>
                                            </div>
                                            <div className="col-md-4">
                                              <h6 className="mb-3">Bill Details</h6>
                                              <div className="card">
                                                <div className="card-body">
                                                  <div className="d-flex justify-content-between mb-2">
                                                    <span>Subtotal:</span>
                                                    <span>{formatCurrency(order.total_bill_amount)}</span>
                                                  </div>
                                                  {order.discount_amount > 0 && (
                                                    <div className="d-flex justify-content-between mb-2">
                                                      <span>Discount:</span>
                                                      <span>-{formatCurrency(order.discount_amount)}</span>
                                                    </div>
                                                  )}
                                                  <div className="d-flex justify-content-between mb-2">
                                                    <span>Service Charges:</span>
                                                    <span>{formatCurrency(order.service_charges_amount)}</span>
                                                  </div>
                                                  <div className="d-flex justify-content-between mb-2">
                                                    <span>GST:</span>
                                                    <span>{formatCurrency(order.gst_amount)}</span>
                                                  </div>
                                                  {order.charges > 0 && (
                                                    <div className="d-flex justify-content-between mb-2">
                                                      <span>Additional Charges:</span>
                                                      <span>{formatCurrency(order.charges)}</span>
                                                    </div>
                                                  )}
                                                  {order.tip > 0 && (
                                                    <div className="d-flex justify-content-between mb-2">
                                                      <span>Tip:</span>
                                                      <span>{formatCurrency(order.tip)}</span>
                                                    </div>
                                                  )}
                                                  <hr />
                                                  <div className="d-flex justify-content-between">
                                                    <strong>Total:</strong>
                                                    <strong>{formatCurrency(order.final_grand_total)}</strong>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                </React.Fragment>
                              ))}
                            </tbody>
                          </Table>
                        </div>
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