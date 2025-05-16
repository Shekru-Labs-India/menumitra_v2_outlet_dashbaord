import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../../config/apiConfig';
import VerticalSidebar from '../../components/VerticalSidebar';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { ForbiddenAccessMessage } from '../../components/common';
import { useNavigate } from 'react-router-dom';

function CouponReports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [couponData, setCouponData] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [orderType, setOrderType] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCouponReport();
  }, [orderType]);

  const fetchCouponReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setPermissionDenied(false);

      const params = {
        outlet_id: localStorage.getItem('outlet_id'),
        user_id: localStorage.getItem('user_id')
      };

      if (orderType !== 'all') {
        params.order_type = orderType;
      }

      console.log('Debug - Making API call to:', API_PATHS.couponReport);
      console.log('Debug - With params:', params);

      const response = await api.post(API_PATHS.couponReport, params);
      console.log('Debug - API Response:', response.data);
      
      if (response.data && response.data.detail) {
        setCouponData(response.data.detail);
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
    fetchCouponReport();
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
        <div className="layout-page">
          <Header />
          <div className="content-wrapper">
            <div className="container-xxl flex-grow-1 container-p-y">
              <div className="row">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">Coupon Reports</h5>
                      <div className="d-flex gap-2">
                        <select 
                          className="form-select"
                          value={orderType}
                          onChange={(e) => setOrderType(e.target.value)}
                        >
                          <option value="all">All Orders</option>
                          <option value="dine-in">Dine-in</option>
                          <option value="parcel">Parcel</option>
                        </select>
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
                      ) : couponData && (
                        <>
                          <div className="row mb-4">
                            <div className="col-md-3">
                              <div className="card bg-primary text-white">
                                <div className="card-body">
                                  <h6 className="card-title">Total Coupons Used</h6>
                                  <h3 className="mb-0">{couponData.coupon_report.total_coupons_used}</h3>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card bg-success text-white">
                                <div className="card-body">
                                  <h6 className="card-title">Total Revenue</h6>
                                  <h3 className="mb-0">₹{couponData.coupon_report.total_revenue.toFixed(2)}</h3>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card bg-warning text-white">
                                <div className="card-body">
                                  <h6 className="card-title">Total Discount Given</h6>
                                  <h3 className="mb-0">₹{couponData.coupon_report.total_discount_given.toFixed(2)}</h3>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card bg-info text-white">
                                <div className="card-body">
                                  <h6 className="card-title">Avg. Discount/Order</h6>
                                  <h3 className="mb-0">₹{couponData.coupon_report.average_discount_per_order.toFixed(2)}</h3>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="row mb-4">
                            <div className="col-md-6">
                              <div className="card">
                                <div className="card-header">
                                  <h5 className="card-title mb-0">Coupon Type Breakdown</h5>
                                </div>
                                <div className="card-body">
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
                                          <td>{couponData.coupon_report.coupon_type_breakdown.amount.count}</td>
                                          <td>₹{couponData.coupon_report.coupon_type_breakdown.amount.total_discount.toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                          <td>Percentage Based</td>
                                          <td>{couponData.coupon_report.coupon_type_breakdown.percent.count}</td>
                                          <td>₹{couponData.coupon_report.coupon_type_breakdown.percent.total_discount.toFixed(2)}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="card">
                            <div className="card-header">
                              <h5 className="card-title mb-0">Coupon Details</h5>
                            </div>
                            <div className="card-body">
                              <div className="table-responsive">
                                <table className="table table-bordered">
                                  <thead>
                                    <tr>
                                      <th>Order #</th>
                                      <th>Type</th>
                                      <th>Status</th>
                                      <th>Date</th>
                                      <th>Coupon Code</th>
                                      <th>Coupon Type</th>
                                      <th>Discount</th>
                                      <th>Special Discount</th>
                                      <th>Bill Amount</th>
                                      <th>Final Amount</th>
                                      <th>Customer</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {couponData.coupon_details.map((coupon) => (
                                      <tr key={coupon.order_id}>
                                        <td>{coupon.order_number}</td>
                                        <td>
                                          <span className={`badge bg-${coupon.order_type === 'dine-in' ? 'primary' : 'info'}`}>
                                            {coupon.order_type}
                                          </span>
                                        </td>
                                        <td>
                                          <span className={`badge bg-${getStatusColor(coupon.order_status)}`}>
                                            {coupon.order_status}
                                          </span>
                                        </td>
                                        <td>{coupon.created_on}</td>
                                        <td>{coupon.coupon_code}</td>
                                        <td>
                                          <span className={`badge bg-${coupon.coupon_type === 'amount' ? 'success' : 'warning'}`}>
                                            {coupon.coupon_type}
                                          </span>
                                        </td>
                                        <td>₹{coupon.discount_amount.toFixed(2)}</td>
                                        <td>₹{coupon.special_discount.toFixed(2)}</td>
                                        <td>₹{coupon.total_bill_amount.toFixed(2)}</td>
                                        <td>₹{coupon.final_grand_total.toFixed(2)}</td>
                                        <td>
                                          <div>{coupon.customer_name}</div>
                                          <small className="text-muted">{coupon.customer_mobile}</small>
                                        </td>
                                      </tr>
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

function getStatusColor(status) {
  switch (status.toLowerCase()) {
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

export default CouponReports; 