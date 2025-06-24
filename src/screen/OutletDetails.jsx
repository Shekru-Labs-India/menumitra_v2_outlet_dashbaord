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
  const [currentOutletId, setCurrentOutletId] = useState(localStorage.getItem('outlet_id'));
  
  // Get cache data functions
  const { 
    fetchData,
    getCachedData
  } = useCacheData();

  // Helper function to check if a value is empty (0, null, undefined, empty string, "N/A")
  const isEmpty = (value) => {
    if (value === null || value === undefined || value === '' || value === 'N/A') return true;
    if (typeof value === 'number' && value === 0) return true;
    if (typeof value === 'string' && value.trim() === '0') return true;
    if (typeof value === 'string' && value.trim().toLowerCase() === 'n/a') return true;
    return false;
  };

  // Helper function to check if an object has any non-empty values
  const hasAnyValue = (obj) => {
    if (!obj || typeof obj !== 'object') return false;
    return Object.values(obj).some(value => {
      if (typeof value === 'object' && value !== null) {
        return hasAnyValue(value);
      }
      return !isEmpty(value);
    });
  };

  // Fetch outlet details on component mount and when outlet changes
  useEffect(() => {
    const storedOutletId = localStorage.getItem('outlet_id');
    
    // Update the current outlet ID state
    if (storedOutletId !== currentOutletId) {
      setCurrentOutletId(storedOutletId);
    }
    
    // First check if we have cached data for this outlet
    const cachedData = getCachedData(API_PATHS.outletDetails);
    if (cachedData) {
      setOutletData({...outletData, ...cachedData});
    }
    
    // Fetch fresh data in background with forceRefresh to ensure latest data
    fetchOutletDetails({ forceRefresh: true });
  }, [currentOutletId]); // Re-run when outlet ID changes

  // Add an event listener for storage changes (in case outlet is changed in another tab)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'outlet_id' && e.newValue !== currentOutletId) {
        setCurrentOutletId(e.newValue);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom event that might be dispatched when outlet changes
    const handleOutletChange = (e) => {
      // Check if the event has detail data with outletId
      const newOutletId = e.detail?.outletId || localStorage.getItem('outlet_id');
      
      if (newOutletId !== currentOutletId) {
        console.log('Outlet changed from event:', newOutletId);
        setCurrentOutletId(newOutletId);
        
        // Immediately fetch new outlet data without waiting for state update
        fetchOutletDetails({ forceRefresh: true });
      }
    };
    
    window.addEventListener('outlet:changed', handleOutletChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('outlet:changed', handleOutletChange);
    };
  }, [currentOutletId]);

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
        // Use a functional update to avoid stale state issues
        setOutletData(prevData => ({...prevData, ...data}));
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

  // Food type icon component
  const FoodTypeIcon = ({ type }) => {
    if (!type) return null;
    
    const normalizedType = type.toLowerCase().trim();
    
    if (normalizedType === 'veg') {
      return (
        <span className="ms-2" title="Vegetarian">
        <i class="fa-solid fa-circle text-success"></i>
        </span>
      );
    }
    
    if (normalizedType === 'non-veg' || normalizedType === 'nonveg') {
      return (
        <span className="ms-2" title="Non-Vegetarian">
        <i class="fa-solid fa-play fa-rotate-270 text-danger"></i>
        </span>
      );
    }
    
    if (normalizedType === 'egg') {
      return (
        <span className="me-2" title="Egg">
          <i className="fas fa-egg text-warning"></i>
        </span>
      );
    }
    
    if (normalizedType === 'vegan') {
      return (
        <span className="me-2" title="Vegan">
          <i className="fas fa-leaf text-success"></i>
        </span>
      );
    }
    
    // Default case - just show the text
    return (
      <span className="text-capitalize">
        {type}
      </span>
    );
  };

  // Status Badge component - updated to return null if status is empty
  const StatusBadge = ({ status }) => {
    if (isEmpty(status)) return null;
    
    return (
      <span 
        className={`badge bg-${status ? "success" : "danger"}`}
        style={{ fontSize: '0.8rem', padding: '0.35em 0.65em' }}
      >
        {status ? "Active" : "Inactive"}
      </span>
    );
  };

  // Count display component for total/active/inactive
  const CountDisplay = ({ data, title }) => {
    // Check if any section has valid data
    const hasValidData = Object.keys(data).some(key => {
      const section = data[key];
      return section && typeof section === 'object' && 
        ((section.total && section.total > 0) || 
         (section.active && section.active > 0) || 
         (section.inactive && section.inactive > 0));
    });
    
    // If no valid data in any section, don't render the component
    if (!hasValidData) return null;
    
    return (
      <div className="p-4 border rounded bg-white mb-4">
        <h6 className="text-uppercase fw-semibold text-muted mb-4" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>
          {title}
        </h6>
        <div className="row g-3">
          {Object.keys(data).map((key, index) => {
            const hasStatusBreakdown = 
              data[key] && typeof data[key] === 'object' && 
              'total' in data[key];
            
            // Check if this section has any non-zero values
            const hasSectionData = hasStatusBreakdown && 
              ((data[key].total && data[key].total > 0) || 
               (data[key].active && data[key].active > 0) || 
               (data[key].inactive && data[key].inactive > 0));
            
            if (hasStatusBreakdown && hasSectionData) {
              return (
                <div key={index} className="col-md-3 mb-3">
                  <div className="p-3 border rounded h-100">
                    <p className="fw-medium mb-3" style={{ fontSize: '0.9rem', color: '#495057', textTransform: 'capitalize' }}>
                      {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                    </p>
                    {!isEmpty(data[key].total) && (
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Total</span>
                        <span className="fw-bold fs-5">{data[key].total}</span>
                      </div>
                    )}
                    {'active' in data[key] && !isEmpty(data[key].active) && (
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="text-muted" style={{ fontSize: '0.85rem' }}>Active</span>
                        <span className="fw-bold text-success">{data[key].active}</span>
                      </div>
                    )}
                    {'inactive' in data[key] && !isEmpty(data[key].inactive) && (
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
  };

  // Staff count display component
  const StaffCountDisplay = ({ data }) => {
    // Calculate total staff
    const totalStaff = 
      (data.waiter_counts?.total || 0) + 
      (data.captain_counts?.total || 0) + 
      (data.manager_counts?.total || 0) + 
      (data.chef_counts?.total || 0);
    
    // If there's no staff data, don't render the component
    if (totalStaff === 0) return null;
    
    // Create an array of roles that have data
    const staffRoles = [
      { key: 'waiter_counts', label: 'Waiters' },
      { key: 'captain_counts', label: 'Captains' },
      { key: 'manager_counts', label: 'Managers' },
      { key: 'chef_counts', label: 'Chefs' }
    ].filter(role => 
      data[role.key]?.total > 0 || 
      data[role.key]?.active > 0 || 
      data[role.key]?.inactive > 0
    );
    
    // If there are no valid roles, don't render
    if (staffRoles.length === 0) return null;
    
    return (
      <div className="p-4 border rounded bg-white mb-4">
        <h6 className="text-uppercase fw-semibold text-muted mb-4" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>
          Staff Information
        </h6>
        
        {totalStaff > 0 && (
          <div className="mb-4 p-3 border rounded" style={{ borderLeft: '4px solid #696cff' }}>
            <div className="d-flex justify-content-between align-items-center">
              <span className="text-muted" style={{ fontSize: '0.9rem' }}>Total Staff Members</span>
              <span className="fw-bold fs-4">{totalStaff}</span>
            </div>
          </div>
        )}
        
        <div className="row g-3">
          {staffRoles.map((role, index) => (
            <div key={index} className="col-md-3 mb-2">
              <div className="p-3 border rounded h-100">
                <p className="fw-medium mb-3" style={{ fontSize: '0.9rem', color: '#495057' }}>
                  {role.label}
                </p>
                {!isEmpty(data[role.key]?.total) && (
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>Total</span>
                    <span className="fw-bold fs-5">{data[role.key]?.total || 0}</span>
                  </div>
                )}
                {!isEmpty(data[role.key]?.active) && (
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>Active</span>
                    <span className="fw-bold text-success">{data[role.key]?.active || 0}</span>
                  </div>
                )}
                {!isEmpty(data[role.key]?.inactive) && (
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>Inactive</span>
                    <span className="fw-bold text-danger">{data[role.key]?.inactive || 0}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Usage statistics display component - updated to check for values
  const UsageStatsDisplay = ({ data }) => {
    // Check if any usage stat has a valid value
    const hasValidData = 
      !isEmpty(data.total_days_since_menumitra_was_installed) ||
      !isEmpty(data.total_orders_since_menumitra_was_installed) ||
      !isEmpty(data.total_revenue) ||
      !isEmpty(data.first_order_date);
    
    // If no valid data, don't render the component
    if (!hasValidData) return null;
    
    return (
      <div className="p-4 border rounded bg-white mb-4">
        <h6 className="text-uppercase fw-semibold text-muted mb-4" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>
          MenuMitra Usage
        </h6>
        
        <div className="row g-4">
          {!isEmpty(data.total_days_since_menumitra_was_installed) && (
            <div className="col-md-3">
              <div className="p-3 border rounded" style={{ borderTop: '4px solid #03c3ec' }}>
                <div className="d-flex align-items-center mb-2">
                  <div className="rounded-circle bg-info p-2 d-flex align-items-center justify-content-center" 
                      style={{ width: '36px', height: '36px', minWidth: '36px' }}>
                    <i className="fas fa-calendar-alt text-white"></i>
                  </div>
                  <span className="ms-2 text-muted" style={{ fontSize: '0.9rem' }}>Days Since Installation</span>
                </div>
                <h3 className="mb-0 fw-bold text-center mt-2">{data.total_days_since_menumitra_was_installed} Days</h3>
              </div>
            </div>
          )}
          
          {!isEmpty(data.total_orders_since_menumitra_was_installed) && (
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
                  {data.total_orders_since_menumitra_was_installed.toLocaleString()}
                </h3>
              </div>
            </div>
          )}
          
          {!isEmpty(data.total_revenue) && (
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
          )}
          
          {!isEmpty(data.first_order_date) && data.first_order_date !== 'N/A' && (
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
                  {data.first_order_date}
                </h3>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

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

  // Convert string to title case
  const toTitleCase = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
                <div className="p-3 bg-white mb-4">
                  {/* Image row if available */}
                  {outletData.image_url && (
                    <div className="text-center mb-3">
                      <img src={outletData.image_url} alt="Outlet" className="img-fluid rounded" 
                          style={{ maxWidth: '120px', maxHeight: '120px', objectFit: 'cover' }} />
                    </div>
                  )}
                  
                  {/* Details in 3 columns */}
                  <div className="row">
                    {/* Outlet name */}
                    <div className="col-md-4 mb-3">
                      <div className="text-uppercase">{(outletData.name || "Outlet Name")}</div>
                      <div className="text-muted" style={{ fontSize: '0.8rem' }}>Outlet Name</div>
                    </div>
                    
                    {/* Outlet status */}
                    <div className="col-md-4 mb-3">
                      <div>
                       
                          {outletData.outlet_status ? "Active" : "Inactive"}

                      </div>
                      <div className="text-muted" style={{ fontSize: '0.8rem' }}>Status</div>
                    </div>
                    
                    {/* Outlet code */}
                    {!isEmpty(outletData.outlet_code) && (
                      <div className="col-md-4 mb-3">
                        <div>{outletData.outlet_code}</div>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>Outlet Code</div>
                      </div>
                    )}
                    
                    {/* Outlet type */}
                    {!isEmpty(outletData.outlet_type) && (
                      <div className="col-md-4 mb-3">
                        <div className="text-capitalize">{outletData.outlet_type}</div>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>Outlet Type</div>
                      </div>
                    )}
                    
                    {/* Food type */}
                    {!isEmpty(outletData.veg_nonveg) && (
                      <div className="col-md-4 mb-3">
                        <div>
                          <span className="text-capitalize">{outletData.veg_nonveg}</span>
                          <FoodTypeIcon type={outletData.veg_nonveg} />
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>Food Type</div>
                      </div>
                    )}
                    
                    {/* Contact Number */}
                    {!isEmpty(outletData.mobile) && (
                      <div className="col-md-4 mb-3">
                        <div>{outletData.mobile}</div>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>Contact Number</div>
                      </div>
                    )}
                    
                    {/* Created On */}
                    {!isEmpty(outletData.created_on) && (
                      <div className="col-md-4 mb-3">
                        <div >{outletData.created_on}</div>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>Created On</div>
                      </div>
                    )}
                    
                    {/* Opening Time */}
                    {!isEmpty(outletData.opening_time) && formatTime(outletData.opening_time) !== 'N/A' && (
                      <div className="col-md-4 mb-3">
                        <div>{formatTime(outletData.opening_time)}</div>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>Opening Time</div>
                      </div>
                    )}
                    
                    {/* Closing Time */}
                    {!isEmpty(outletData.closing_time) && formatTime(outletData.closing_time) !== 'N/A' && (
                      <div className="col-md-4 mb-3">
                        <div>{formatTime(outletData.closing_time)}</div>
                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>Closing Time</div>
                      </div>
                    )}
                  </div>
                  
                  {/* Address at the bottom */}
                  {!isEmpty(outletData.address) && (
                    <div className="mt-2 border-top pt-3">
                      <div className="d-flex align-items-center">
                        <i className="fas fa-map-marker-alt text-primary me-2"></i>
                        <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>{toTitleCase(outletData.address)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Usage Statistics - only shown if there's data */}
                {hasAnyValue(outletData.order_statistics) && (
                  <>
                    <h5 className="fw-bold mb-3">Usage Statistics</h5>
                    <UsageStatsDisplay data={outletData.order_statistics || {}} />
                  </>
                )}

                {/* Menu Counts - only shown if there's data */}
                {(hasAnyValue(outletData.menu_counts) || 
                  hasAnyValue(outletData.menu_category_counts) || 
                  hasAnyValue(outletData.section_counts) || 
                  hasAnyValue(outletData.table_counts)) && (
                  <>
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
                  </>
                )}

                {/* Staff Counts - only shown if there's data */}
                {(hasAnyValue(outletData.waiter_counts) || 
                  hasAnyValue(outletData.captain_counts) || 
                  hasAnyValue(outletData.manager_counts) || 
                  hasAnyValue(outletData.chef_counts)) && (
                  <>
                    <h5 className="fw-bold mb-3">Staff Information</h5>
                    <StaffCountDisplay data={outletData} />
                  </>
                )}

                {/* Inventory Counts - only shown if there's data */}
                {(hasAnyValue(outletData.Inventory_Items_counts) || 
                  hasAnyValue(outletData.Inventory_Category_counts) || 
                  hasAnyValue(outletData.Inventory_Sub_Category_counts) || 
                  hasAnyValue(outletData.supplier_counts)) && (
                  <>
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
                )}
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