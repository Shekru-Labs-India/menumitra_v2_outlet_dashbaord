import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../../config/apiConfig';
import VerticalSidebar from '../../components/VerticalSidebar';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { ForbiddenAccessMessage } from '../../components/common';
import { useNavigate } from 'react-router-dom';

function CustomerReports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [orderType, setOrderType] = useState('dine-in');
  const [expandedRows, setExpandedRows] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchCustomerReport();
  }, [filterType, orderType]);

  const toggleRow = (customerId) => {
    setExpandedRows(prev => ({
      ...prev,
      [customerId]: !prev[customerId]
    }));
  };

  const fetchCustomerReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setPermissionDenied(false);

      const params = {
        outlet_id: localStorage.getItem('outlet_id'),
        user_id: localStorage.getItem('user_id'),
        filter_type: filterType
      };

      if (filterType === 'order_type') {
        params.order_type = orderType;
      }

      console.log('Debug - Making API call to:', API_PATHS.customerReport);
      console.log('Debug - With params:', params);

      const response = await api.post(API_PATHS.customerReport, params);
      console.log('Debug - API Response:', response.data);
      
      if (response.data && response.data.detail) {
        setCustomerData(response.data.detail);
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
    fetchCustomerReport();
  };

  if (permissionDenied) {
    return (
      <div className="layout-wrapper layout-content-navbar">
        <div className="layout-container">
          <VerticalSidebar />
          <div className="layout-page">
            <Header />
            <div className="content-wrapper">
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
        <div className="layout-page">
          <Header />
          <div className="content-wrapper">
            <div className="container-xxl flex-grow-1 container-p-y">
              <div className="row">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">Customer Reports</h5>
                      <div className="d-flex gap-2">
                        <select 
                          className="form-select"
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value)}
                        >
                          <option value="all">All Customers</option>
                          <option value="order_type">By Order Type</option>
                        </select>

                        {filterType === 'order_type' && (
                          <select 
                            className="form-select"
                            value={orderType}
                            onChange={(e) => setOrderType(e.target.value)}
                          >
                            <option value="dine-in">Dine-in</option>
                            <option value="parcel">Parcel</option>
                          </select>
                        )}

                        <button 
                          className="btn btn-primary"
                          onClick={handleRetry}
                          disabled={loading}
                        >
                          {loading ? (
                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                          ) : (
                            <i className="fas fa-sync-alt me-1"></i>
                          )}
                          Refresh
                        </button>
                      </div>
                    </div>
                    <div className="card-body">
                      {loading ? (
                        <div className="text-center py-5">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        </div>
                      ) : error ? (
                        <div className="alert alert-danger" role="alert">
                          {error}
                        </div>
                      ) : customerData && (
                        <>
                          <div className="row mb-4">
                            <div className="col-md-3">
                              <div className="card bg-primary text-white">
                                <div className="card-body">
                                  <h6 className="card-title">Total Customers</h6>
                                  <h3 className="mb-0">{customerData.customer_report.total_customers}</h3>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card bg-success text-white">
                                <div className="card-body">
                                  <h6 className="card-title">Total Orders</h6>
                                  <h3 className="mb-0">{customerData.customer_report.total_orders}</h3>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card bg-info text-white">
                                <div className="card-body">
                                  <h6 className="card-title">Total Revenue</h6>
                                  <h3 className="mb-0">₹{customerData.customer_report.total_revenue.toFixed(2)}</h3>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card bg-warning text-white">
                                <div className="card-body">
                                  <h6 className="card-title">Avg Order Value</h6>
                                  <h3 className="mb-0">₹{customerData.customer_report.avg_order_value.toFixed(2)}</h3>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="row mb-4">
                            <div className="col-md-6">
                              <div className="card">
                                <div className="card-header">
                                  <h5 className="card-title mb-0">Order Type Breakdown</h5>
                                </div>
                                <div className="card-body">
                                  <div className="row">
                                    {Object.entries(customerData.customer_report.order_type_breakdown).map(([type, count]) => (
                                      <div key={type} className="col-md-6 mb-2">
                                        <div className="d-flex justify-content-between align-items-center">
                                          <span className="text-capitalize">{type}</span>
                                          <span className="badge bg-label-primary">{count}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="card">
                            <div className="card-header">
                              <h5 className="card-title mb-0">Customer Details</h5>
                            </div>
                            <div className="card-body">
                              <div className="table-responsive">
                                <table className="table table-hover">
                                  <thead>
                                    <tr>
                                      <th style={{ width: '5%' }}></th>
                                      <th style={{ width: '25%' }}>Customer Info</th>
                                      <th style={{ width: '20%' }}>Order Summary</th>
                                      <th style={{ width: '20%' }}>Order Types</th>
                                      <th style={{ width: '30%' }}>Recent Orders</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {customerData.customers.map((customer, index) => (
                                      <React.Fragment key={index}>
                                        <tr 
                                          className="cursor-pointer"
                                          onClick={() => toggleRow(index)}
                                          style={{ cursor: 'pointer' }}
                                        >
                                          <td>
                                            <i className={`fas fa-chevron-${expandedRows[index] ? 'down' : 'right'} transition-all`}></i>
                                          </td>
                                          <td>
                                            <div className="d-flex flex-column">
                                              <span className="fw-semibold">{customer.customer_name}</span>
                                              <small className="text-muted">Mobile: {customer.customer_mobile}</small>
                                              <small className="text-muted">Address: {customer.customer_address}</small>
                                            </div>
                                          </td>
                                          <td>
                                            <div className="d-flex flex-column">
                                              <span>Total Orders: {customer.total_orders}</span>
                                              <span>Total Spent: ₹{customer.total_spent.toFixed(2)}</span>
                                              <small className="text-muted">Avg: {customerData.customer_report.avg_orders_per_customer.toFixed(1)} orders/customer</small>
                                            </div>
                                          </td>
                                          <td>
                                            {Object.entries(customer.order_types).map(([type, count]) => (
                                              <div key={type} className="d-flex justify-content-between align-items-center mb-1">
                                                <span className="text-capitalize">{type}</span>
                                                <span className="badge bg-label-primary">{count}</span>
                                              </div>
                                            ))}
                                          </td>
                                          <td>
                                            <div className="table-responsive">
                                              <table className="table table-sm">
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
                                                  {customer.orders.slice(0, 3).map((order) => (
                                                    <tr key={order.order_id}>
                                                      <td>{order.order_number}</td>
                                                      <td className="text-capitalize">{order.order_type}</td>
                                                      <td>
                                                        <span className={`badge bg-${order.order_status === 'paid' ? 'success' : 'warning'}`}>
                                                          {order.order_status}
                                                        </span>
                                                      </td>
                                                      <td>₹{order.final_grand_total.toFixed(2)}</td>
                                                      <td>{order.created_on}</td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          </td>
                                        </tr>
                                        <tr>
                                          <td colSpan="5" className="p-0">
                                            <div 
                                              className={`collapse ${expandedRows[index] ? 'show' : ''}`}
                                              style={{
                                                transition: 'all 0.3s ease-in-out',
                                                maxHeight: expandedRows[index] ? '500px' : '0',
                                                overflow: 'hidden'
                                              }}
                                            >
                                              <div className="p-3 bg-light">
                                                <div className="row">
                                                  <div className="col-md-6">
                                                    <h6 className="mb-3">Customer Information</h6>
                                                    <div className="card">
                                                      <div className="card-body">
                                                        <div className="d-flex justify-content-between mb-2">
                                                          <span>Name:</span>
                                                          <span className="fw-semibold">{customer.customer_name}</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between mb-2">
                                                          <span>Mobile:</span>
                                                          <span>{customer.customer_mobile}</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between mb-2">
                                                          <span>Address:</span>
                                                          <span>{customer.customer_address}</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between mb-2">
                                                          <span>First Order:</span>
                                                          <span>{customer.first_order_date}</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between mb-2">
                                                          <span>Last Order:</span>
                                                          <span>{customer.last_order_date}</span>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <div className="col-md-6">
                                                    <h6 className="mb-3">Order History</h6>
                                                    <div className="card">
                                                      <div className="card-body">
                                                        <div className="table-responsive">
                                                          <table className="table table-sm">
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
                                                                    <span className={`badge bg-${order.order_status === 'paid' ? 'success' : 'warning'}`}>
                                                                      {order.order_status}
                                                                    </span>
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
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      </React.Fragment>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default CustomerReports; 