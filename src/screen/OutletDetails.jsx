import React, { useState, useEffect } from 'react';
import { Row, Col } from 'react-bootstrap';
import VerticalSidebar from "../components/VerticalSidebar";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useCacheData } from '../context/CacheDataContext';
import { API_PATHS } from '../config/apiConfig';

function OutletDetails() {
  const [outletData, setOutletData] = useState({
    name: "",
    address: "",
    outlet_status: false,
    mobile: "",
    outlet_type: "",
    veg_nonveg: "",
    created_on: "",
    opening_time: "",
    closing_time: "",
    outlet_code: "",
    owner_id: "",
    menu_counts: { total: 0, active: 0, inactive: 0 },
    menu_category_counts: { total: 0, active: 0, inactive: 0 },
    section_counts: { total: 0, active: 0, inactive: 0 },
    table_counts: { total: 0, active: 0, inactive: 0 },
    waiter_counts: { total: 0, active: 0, inactive: 0 },
    captain_counts: { total: 0, active: 0, inactive: 0 },
    manager_counts: { total: 0, active: 0, inactive: 0 },
    chef_counts: { total: 0, active: 0, inactive: 0 },
    Inventory_Items_counts: { total: 0, active: 0, inactive: 0 },
    Inventory_Category_counts: { total: 0, active: 0, inactive: 0 },
    Inventory_Sub_Category_counts: { total: 0, active: 0, inactive: 0 },
    supplier_counts: { total: 0, active: 0, inactive: 0 },
    order_statistics: {
      total_days_since_menumitra_was_installed: 0,
      total_orders_since_menumitra_was_installed: 0,
      total_revenue: 0,
      first_order_date: ""
    }
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Get cache data functions
  const { 
    fetchData,
    getCachedData
  } = useCacheData();

  // Fetch outlet details on component mount
  useEffect(() => {
    // First check if we have cached data
    const cachedData = getCachedData(API_PATHS.outletDetails);
    if (cachedData) {
      setOutletData({...outletData, ...cachedData});
    }
    
    // Fetch fresh data in background
    fetchOutletDetails();
  }, []);

  // Function to fetch outlet details
  const fetchOutletDetails = async (options = {}) => {
    setIsLoading(true);
    try {
      // Get user and outlet IDs
      const userId = localStorage.getItem('user_id');
      const outletId = localStorage.getItem('outlet_id');
      
      if (!userId || !outletId) {
        setError('User ID or outlet ID not found');
        setIsLoading(false);
        return;
      }
      
      // Fetch data
      const data = await fetchData(API_PATHS.outletDetails, {
        user_id: Number(userId),
        outlet_id: Number(outletId)
      }, {
        forceRefresh: options.forceRefresh || false,
        transformResponse: (response) => response?.detail || response
      });
      
      if (data) {
        setOutletData({...outletData, ...data});
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching outlet details:', err);
      setError('Failed to load outlet details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Format currency in Indian format
  const formatIndianCurrency = (amount) => {
    if (!amount) return '₹0';
    
    const num = parseFloat(amount);
    if (isNaN(num)) return '₹0';
    
    const formatter = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    
    return formatter.format(num);
  };

  // Status Badge component
  const StatusBadge = ({ status }) => (
    <span 
      className={`badge bg-${status ? "success" : "danger"}`}
      style={{ fontSize: '0.8rem', padding: '0.35em 0.65em' }}
    >
      {status ? "Active" : "Inactive"}
    </span>
  );

  // Count display component for total/active/inactive
  const CountDisplay = ({ data, title }) => (
    <div className="p-4 border rounded bg-white mb-4">
      <h6 className="text-uppercase fw-semibold text-muted mb-4" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>
        {title}
      </h6>
      <div className="row g-3">
        {Object.keys(data).map((key, index) => {
          const hasStatusBreakdown = 
            data[key] && typeof data[key] === 'object' && 
            'total' in data[key];
          
          if (hasStatusBreakdown) {
            return (
              <div key={index} className="col-md-3 mb-3">
                <div className="p-3 border rounded h-100">
                  <p className="fw-medium mb-3" style={{ fontSize: '0.9rem', color: '#495057', textTransform: 'capitalize' }}>
                    {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                  </p>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>Total</span>
                    <span className="fw-bold fs-5">{data[key].total}</span>
                  </div>
                  {'active' in data[key] && (
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Active</span>
                      <span className="fw-bold text-success">{data[key].active}</span>
                    </div>
                  )}
                  {'inactive' in data[key] && (
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Inactive</span>
                      <span className="fw-bold text-danger">{data[key].inactive}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          } else {
            return null;
          }
        })}
      </div>
    </div>
  );

  // Staff count display component
  const StaffCountDisplay = ({ data }) => {
    // Calculate total staff
    const totalStaff = 
      (data.waiter_counts?.total || 0) + 
      (data.captain_counts?.total || 0) + 
      (data.manager_counts?.total || 0) + 
      (data.chef_counts?.total || 0);
    
    return (
      <div className="p-4 border rounded bg-white mb-4">
        <h6 className="text-uppercase fw-semibold text-muted mb-4" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>
          Staff Information
        </h6>
        
        <div className="mb-4 p-3 border rounded" style={{ borderLeft: '4px solid #696cff' }}>
          <div className="d-flex justify-content-between align-items-center">
            <span className="text-muted" style={{ fontSize: '0.9rem' }}>Total Staff Members</span>
            <span className="fw-bold fs-4">{totalStaff}</span>
          </div>
        </div>
        
        <div className="row g-3">
          {[
            { key: 'waiter_counts', label: 'Waiters' },
            { key: 'captain_counts', label: 'Captains' },
            { key: 'manager_counts', label: 'Managers' },
            { key: 'chef_counts', label: 'Chefs' }
          ].map((role, index) => (
            <div key={index} className="col-md-3 mb-2">
              <div className="p-3 border rounded h-100">
                <p className="fw-medium mb-3" style={{ fontSize: '0.9rem', color: '#495057' }}>
                  {role.label}
                </p>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>Total</span>
                  <span className="fw-bold fs-5">{data[role.key]?.total || 0}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>Active</span>
                  <span className="fw-bold text-success">{data[role.key]?.active || 0}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>Inactive</span>
                  <span className="fw-bold text-danger">{data[role.key]?.inactive || 0}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Usage statistics display component
  const UsageStatsDisplay = ({ data }) => (
    <div className="p-4 border rounded bg-white mb-4">
      <h6 className="text-uppercase fw-semibold text-muted mb-4" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>
        MenuMitra Usage
      </h6>
      
      <div className="row g-4">
        <div className="col-md-3">
          <div className="p-3 border rounded" style={{ borderTop: '4px solid #03c3ec' }}>
            <div className="d-flex align-items-center mb-2">
              <div className="rounded-circle bg-info p-2 d-flex align-items-center justify-content-center" 
                  style={{ width: '36px', height: '36px', minWidth: '36px' }}>
                <i className="fas fa-calendar-alt text-white"></i>
              </div>
              <span className="ms-2 text-muted" style={{ fontSize: '0.9rem' }}>Days Since Installation</span>
            </div>
            <h3 className="mb-0 fw-bold text-center mt-2">{data.total_days_since_menumitra_was_installed || 0} Days</h3>
          </div>
        </div>
        
        <div className="col-md-3">
          <div className="p-3 border rounded" style={{ borderTop: '4px solid #71dd37' }}>
            <div className="d-flex align-items-center mb-2">
              <div className="rounded-circle bg-success p-2 d-flex align-items-center justify-content-center" 
                  style={{ width: '36px', height: '36px', minWidth: '36px' }}>
                <i className="fas fa-shopping-cart text-white"></i>
              </div>
              <span className="ms-2 text-muted" style={{ fontSize: '0.9rem' }}>Total Orders</span>
            </div>
            <h3 className="mb-0 fw-bold text-center mt-2">
              {(data.total_orders_since_menumitra_was_installed || 0).toLocaleString()}
            </h3>
          </div>
        </div>
        
        <div className="col-md-3">
          <div className="p-3 border rounded" style={{ borderTop: '4px solid #696cff' }}>
            <div className="d-flex align-items-center mb-2">
              <div className="rounded-circle bg-primary p-2 d-flex align-items-center justify-content-center" 
                  style={{ width: '36px', height: '36px', minWidth: '36px' }}>
                <i className="fas fa-rupee-sign text-white"></i>
              </div>
              <span className="ms-2 text-muted" style={{ fontSize: '0.9rem' }}>Total Revenue</span>
            </div>
            <h3 className="mb-0 fw-bold text-center mt-2">
              {formatIndianCurrency(data.total_revenue)}
            </h3>
          </div>
        </div>
        
        <div className="col-md-3">
          <div className="p-3 border rounded" style={{ borderTop: '4px solid #ffab00' }}>
            <div className="d-flex align-items-center mb-2">
              <div className="rounded-circle bg-warning p-2 d-flex align-items-center justify-content-center" 
                  style={{ width: '36px', height: '36px', minWidth: '36px' }}>
                <i className="fas fa-clock text-white"></i>
              </div>
              <span className="ms-2 text-muted" style={{ fontSize: '0.9rem' }}>First Order Date</span>
            </div>
            <h3 className="mb-0 fw-bold text-center mt-2">
              {data.first_order_date || 'N/A'}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );

  // Format time from datetime string
  const formatTime = (datetimeStr) => {
    if (!datetimeStr) return 'N/A';
    
    try {
      // Extract time part (assuming format is "YYYY-MM-DD HH:MM:SS")
      const timePart = datetimeStr.split(' ')[1];
      if (!timePart) return 'N/A';
      
      // Convert to 12-hour format
      const [hours, minutes] = timePart.split(':');
      const h = parseInt(hours, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour12 = h % 12 || 12;
      
      return `${hour12}:${minutes} ${ampm}`;
    } catch (e) {
      return datetimeStr;
    }
  };

  // Handle refresh button click
  const handleRefresh = () => {
    fetchOutletDetails({ forceRefresh: true });
  };

  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        <VerticalSidebar />
        <div className="layout-page d-flex flex-column min-vh-100">
          <Header />
          <div className="content-wrapper flex-grow-1">
            <div className="container-fluid flex-grow-1 container-p-y">
              {/* Page Header */}
              {/* <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-bold mb-0">Outlet Details</h4>
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-sync-alt'} me-1`}></i>
                  {isLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div> */}
              
              {/* Error state */}
              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}
              
              {/* Content - Always render UI */}
              <>
                {/* Outlet Basic Info */}
                <div className="p-4 border rounded bg-white mb-4">
                  <div className="d-flex align-items-center mb-4">
                    <div className="d-flex align-items-center justify-content-center rounded-circle bg-primary" 
                        style={{ width: '60px', height: '60px', minWidth: '60px' }}>
                      <i className="fas fa-store fa-lg text-white"></i>
                    </div>
                    <div className="ms-3">
                      <div className="d-flex align-items-center">
                        <h5 className="mb-0 me-2">{outletData.name || "Outlet Name"}</h5>
                        <StatusBadge status={outletData.outlet_status} />
                      </div>
                      <p className="text-muted mb-0 mt-1">{outletData.address || "Address"}</p>
                    </div>
                  </div>

                  <Row className="g-3">
                    <Col md={3}>
                      <div className="p-3" >
                        <span className="fw-medium d-block mb-1">{outletData.outlet_code || 'N/A'}</span>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Outlet Code</span>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="p-3" >
                        <span className="fw-medium d-block mb-1">{outletData.mobile || 'N/A'}</span>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Contact Number</span>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="p-3" >
                        <span className="fw-medium text-capitalize d-block mb-1">{outletData.outlet_type || 'N/A'}</span>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Outlet Type</span>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="p-3" >
                        <span className="fw-medium text-capitalize d-block mb-1">{outletData.veg_nonveg || 'N/A'}</span>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Food Type</span>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="p-3" >
                        <span className="fw-medium d-block mb-1">{outletData.created_on || 'N/A'}</span>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Created On</span>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="p-3" >
                        <span className="fw-medium d-block mb-1">{formatTime(outletData.opening_time)}</span>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Opening Time</span>
                      </div>
                    </Col>
                    <Col md={3}>
                      <div className="p-3" >
                        <span className="fw-medium d-block mb-1">{formatTime(outletData.closing_time)}</span>
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Closing Time</span>
                      </div>
                    </Col>
                  </Row>
                </div>

                {/* Usage Statistics */}
                <h5 className="fw-bold mb-3">Usage Statistics</h5>
                <UsageStatsDisplay data={outletData.order_statistics || {}} />

                {/* Menu Counts */}
                <h5 className="fw-bold mb-3">Menu Information</h5>
                <CountDisplay 
                  title="Menu & Category Details" 
                  data={{
                    menu: outletData.menu_counts || {},
                    categories: outletData.menu_category_counts || {},
                    sections: outletData.section_counts || {},
                    tables: outletData.table_counts || {}
                  }} 
                />

                {/* Staff Counts */}
                <h5 className="fw-bold mb-3">Staff Information</h5>
                <StaffCountDisplay data={outletData} />

                {/* Inventory Counts */}
                <h5 className="fw-bold mb-3">Inventory Information</h5>
                <CountDisplay 
                  title="Inventory Details" 
                  data={{
                    items: outletData.Inventory_Items_counts || {},
                    categories: outletData.Inventory_Category_counts || {},
                    subcategories: outletData.Inventory_Sub_Category_counts || {},
                    suppliers: outletData.supplier_counts || {}
                  }} 
                />
              </>
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}

export default OutletDetails; 