import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../config/apiConfig';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ForbiddenAccessMessage } from './common';

function OutletStats() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [outletData, setOutletData] = useState(null);
  const [allStatsData, setAllStatsData] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    fetchOutletStats();
    fetchAllStats();
  }, [startDate, endDate]);

  const fetchOutletStats = async () => {
    try {
      setLoading(true);
      setError(null);
      setPermissionDenied(false);

      const params = {
        outlet_id: localStorage.getItem('outlet_id'),
        start_date: formatDate(startDate),
        end_date: formatDate(endDate)
      };

      const response = await api.post(API_PATHS.getOutletStats, params);
      
      if (response.data && response.data.detail) {
        setOutletData(response.data.detail);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching outlet stats:', err);
      if (err.response?.status === 403) {
        setPermissionDenied(true);
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch outlet statistics');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStats = async () => {
    try {
      const params = {
        user_id: localStorage.getItem('user_id'),
        outlet_id: localStorage.getItem('outlet_id')
      };

      const response = await api.post(API_PATHS.getAllStatsWithoutFilter, params);
      
      if (response.data && response.data.detail) {
        setAllStatsData(response.data.detail);
      }
    } catch (err) {
      console.error('Error fetching all stats:', err);
      if (err.response?.status === 403) {
        setPermissionDenied(true);
      }
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatIndianCurrency = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num) || num === 0) return '₹0.00';
    
    const [integerPart, decimalPart = '00'] = num.toFixed(2).split('.');
    if (integerPart.length <= 3) {
      return `₹${integerPart}.${decimalPart}`;
    }
    
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return `₹${formatted},${lastThree}.${decimalPart}`;
  };

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <ForbiddenAccessMessage 
        title="Permission Denied" 
        message="You don't have permission to access outlet statistics."
        resourceName="Outlet Statistics"
        onRetry={() => {
          setPermissionDenied(false);
          fetchOutletStats();
          fetchAllStats();
        }}
      />
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">Outlet Statistics</h5>
        <div className="d-flex gap-2">
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            maxDate={new Date()}
            placeholderText="Start Date"
            className="form-control"
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
            className="form-control"
            dateFormat="dd MMM yyyy"
          />
        </div>
      </div>
      <div className="card-body">
        {outletData?.outlets?.map((outlet) => (
          <div key={outlet.id} className="mb-4">
            <h4 className="mb-4">{outlet.name}</h4>
            
            <div className="row g-4">
              {/* Staff Stats */}
              <div className="col-md-6 col-lg-3">
                <div className="card bg-label-primary">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-1">Waiters</h6>
                        <h3 className="mb-0">{outlet.statistics.waiters_count}</h3>
                      </div>
                      <div className="avatar">
                        <span className="avatar-initial rounded bg-primary">
                          <i className="fas fa-users"></i>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekly Orders */}
              <div className="col-md-6 col-lg-3">
                <div className="card bg-label-success">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-1">Avg Orders/Week</h6>
                        <h3 className="mb-0">{outlet.statistics.avg_order_per_week}</h3>
                      </div>
                      <div className="avatar">
                        <span className="avatar-initial rounded bg-success">
                          <i className="fas fa-chart-line"></i>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Popular Items */}
              <div className="col-md-6 col-lg-3">
                <div className="card bg-label-info">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-1">Most Popular</h6>
                        <h3 className="mb-0">{outlet.statistics.most_popular_item.name}</h3>
                        <small className="text-muted">{outlet.statistics.most_popular_item.orders} orders</small>
                      </div>
                      <div className="avatar">
                        <span className="avatar-initial rounded bg-info">
                          <i className="fas fa-star"></i>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Least Popular Items */}
              <div className="col-md-6 col-lg-3">
                <div className="card bg-label-warning">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-1">Least Popular</h6>
                        <h3 className="mb-0">{outlet.statistics.least_popular_item.name}</h3>
                        <small className="text-muted">{outlet.statistics.least_popular_item.orders} orders</small>
                      </div>
                      <div className="avatar">
                        <span className="avatar-initial rounded bg-warning">
                          <i className="fas fa-arrow-down"></i>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Stats from All Stats API */}
            {allStatsData && (
              <div className="row mt-4">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header">
                      <h5 className="card-title mb-0">Detailed Statistics</h5>
                    </div>
                    <div className="card-body">
                      <div className="row g-4">
                        <div className="col-md-6">
                          <h6 className="mb-3">Order Analytics</h6>
                          <div className="table-responsive">
                            <table className="table table-sm">
                              <tbody>
                                <tr>
                                  <td>First Order Time</td>
                                  <td>{allStatsData.order_analytics.first_order_time}</td>
                                </tr>
                                <tr>
                                  <td>Last Order Time</td>
                                  <td>{allStatsData.order_analytics.last_order_time}</td>
                                </tr>
                                <tr>
                                  <td>Average Order Time</td>
                                  <td>{allStatsData.order_analytics.average_order_time}</td>
                                </tr>
                                <tr>
                                  <td>Average Cooking Time</td>
                                  <td>{allStatsData.order_analytics.average_cooking_time}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <h6 className="mb-3">Order Statistics</h6>
                          <div className="table-responsive">
                            <table className="table table-sm">
                              <tbody>
                                <tr>
                                  <td>Success Orders</td>
                                  <td>{allStatsData.order_statistics.success_orders}</td>
                                </tr>
                                <tr>
                                  <td>Cancelled Orders</td>
                                  <td>{allStatsData.order_statistics.cancelled_orders}</td>
                                </tr>
                                <tr>
                                  <td>Complementary Orders</td>
                                  <td>{allStatsData.order_statistics.complementary_orders}</td>
                                </tr>
                                <tr>
                                  <td>KOT Orders</td>
                                  <td>{allStatsData.order_statistics.KOT_orders}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default OutletStats; 