import React from 'react';
import { Row, Col } from 'react-bootstrap';
import VerticalSidebar from "../components/VerticalSidebar";
import Header from "../components/Header";
import Footer from "../components/Footer";

function OutletDetails() {
  // Sample outlet data
  const outletData = {
    name: "MenuMitra Central",
    address: "123 Food Street, Bangalore, Karnataka 560001",
    contactNumber: "+91 9876543210",
    email: "central@menumitra.com",
    operatingHours: "10:00 AM - 11:00 PM",
    manager: "Rahul Sharma",
    status: "Active"
  };

  // Menu and Category counts
  const menuCounts = {
    menuItems: { total: 120, active: 105, inactive: 15 },
    categories: { total: 12, active: 10, inactive: 2 },
    sectionsAndTables: { total: 25, active: 22, inactive: 3 }
  };

  // Staff counts
  const staffCounts = {
    total: 24,
    captain: 3,
    manager: 2,
    waiter: 8,
    chef: 5,
    owner: 1,
    other: 5
  };

  // Inventory counts
  const inventoryCounts = {
    suppliers: { total: 15, active: 12, inactive: 3 },
    items: { total: 250, active: 220, inactive: 30 },
    warehouses: { total: 2, active: 2, inactive: 0 },
    itemCategories: { total: 18, active: 18, inactive: 0 },
    itemSubcategories: { total: 32, active: 30, inactive: 2 }
  };

  // Usage statistics
  const usageStats = {
    daysSinceInstallation: 120,
    totalOrders: 5840,
    totalRevenue: "₹23,45,670"
  };

  // Status Badge component
  const StatusBadge = ({ status }) => (
    <span 
      className={`badge bg-${status === "Active" ? "success" : "danger"}`}
      style={{ fontSize: '0.8rem', padding: '0.35em 0.65em' }}
    >
      {status}
    </span>
  );

  // Count display component for total/active/inactive
  const CountDisplay = ({ data, title }) => (
    <div className="p-4 border rounded bg-white mb-4" style={{ boxShadow: 'none' }}>
      <h6 className="text-uppercase fw-semibold text-muted mb-4" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>
        {title}
      </h6>
      <div className="row g-4">
        {Object.keys(data).map((key, index) => {
          const hasStatusBreakdown = 
            data[key] && typeof data[key] === 'object' && 
            'total' in data[key] && 'active' in data[key] && 'inactive' in data[key];
          
          if (hasStatusBreakdown) {
            return (
              <div key={index} className="col-md-4 mb-3">
                <div className="p-3 border rounded">
                  <p className="fw-medium mb-3" style={{ fontSize: '1rem', color: '#495057' }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </p>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>Total</span>
                    <span className="fw-bold fs-5">{data[key].total}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>Active</span>
                    <span className="fw-bold text-success">{data[key].active}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>Inactive</span>
                    <span className="fw-bold text-danger">{data[key].inactive}</span>
                  </div>
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
  const StaffCountDisplay = ({ data }) => (
    <div className="p-4 border rounded bg-white mb-4" style={{ boxShadow: 'none' }}>
      <h6 className="text-uppercase fw-semibold text-muted mb-4" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>
        Staff Count
      </h6>
      
      <div className="d-flex align-items-center mb-4 p-3 border rounded" style={{ borderLeft: '4px solid #696cff' }}>
        <div className="d-flex align-items-center justify-content-center rounded-circle bg-primary" 
             style={{ width: '50px', height: '50px', minWidth: '50px' }}>
          <i className="fas fa-users text-white"></i>
        </div>
        <div className="ms-3">
          <span className="text-muted" style={{ fontSize: '0.9rem' }}>Total Staff</span>
          <h3 className="mb-0 fw-bold">{data.total}</h3>
        </div>
      </div>
      
      <div className="row g-3">
        {['captain', 'manager', 'waiter', 'chef', 'owner', 'other'].map((role, index) => (
          <div key={index} className="col-6 col-md-4">
            <div className="p-3 border rounded">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted text-capitalize" style={{ fontSize: '0.9rem' }}>
                  {role === 'other' ? 'Other Staff' : role}
                </span>
                <span className="fw-bold fs-5">{data[role]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Usage statistics display component
  const UsageStatsDisplay = ({ data }) => (
    <div className="p-4 border rounded bg-white mb-4" style={{ boxShadow: 'none' }}>
      <h6 className="text-uppercase fw-semibold text-muted mb-4" style={{ fontSize: '0.85rem', letterSpacing: '0.5px' }}>
        MenuMitra Usage
      </h6>
      
      <div className="row g-4">
        <div className="col-md-4">
          <div className="p-3 border rounded" style={{ borderTop: '4px solid #03c3ec' }}>
            <div className="d-flex align-items-center mb-2">
              <div className="rounded-circle bg-info p-2 d-flex align-items-center justify-content-center" 
                  style={{ width: '36px', height: '36px', minWidth: '36px' }}>
                <i className="fas fa-calendar-alt text-white"></i>
              </div>
              <span className="ms-2 text-muted" style={{ fontSize: '0.9rem' }}>Days Since Installation</span>
            </div>
            <h3 className="mb-0 fw-bold text-center mt-2">{data.daysSinceInstallation}</h3>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="p-3 border rounded" style={{ borderTop: '4px solid #71dd37' }}>
            <div className="d-flex align-items-center mb-2">
              <div className="rounded-circle bg-success p-2 d-flex align-items-center justify-content-center" 
                  style={{ width: '36px', height: '36px', minWidth: '36px' }}>
                <i className="fas fa-shopping-cart text-white"></i>
              </div>
              <span className="ms-2 text-muted" style={{ fontSize: '0.9rem' }}>Total Orders</span>
            </div>
            <h3 className="mb-0 fw-bold text-center mt-2">{data.totalOrders.toLocaleString()}</h3>
          </div>
        </div>
        
        <div className="col-md-4">
          <div className="p-3 border rounded" style={{ borderTop: '4px solid #696cff' }}>
            <div className="d-flex align-items-center mb-2">
              <div className="rounded-circle bg-primary p-2 d-flex align-items-center justify-content-center" 
                  style={{ width: '36px', height: '36px', minWidth: '36px' }}>
                <i className="fas fa-rupee-sign text-white"></i>
              </div>
              <span className="ms-2 text-muted" style={{ fontSize: '0.9rem' }}>Total Revenue</span>
            </div>
            <h3 className="mb-0 fw-bold text-center mt-2">{data.totalRevenue}</h3>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        <VerticalSidebar />
        <div className="layout-page d-flex flex-column min-vh-100">
          <Header />
          <div className="content-wrapper flex-grow-1">
            <div className="container-fluid flex-grow-1 container-p-y">
              {/* Page Header */}
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-bold mb-0">Outlet Details</h4>
              </div>
              
              {/* Outlet Basic Info */}
              <div className="p-4 border rounded bg-white mb-4" style={{ boxShadow: 'none' }}>
                <div className="d-flex align-items-center mb-4">
                  <div className="d-flex align-items-center justify-content-center rounded-circle bg-primary" 
                      style={{ width: '60px', height: '60px', minWidth: '60px' }}>
                    <i className="fas fa-store fa-lg text-white"></i>
                  </div>
                  <div className="ms-3">
                    <div className="d-flex align-items-center">
                      <h5 className="mb-0 me-2">{outletData.name}</h5>
                      <StatusBadge status={outletData.status} />
                    </div>
                    <p className="text-muted mb-0 mt-1">{outletData.address}</p>
                  </div>
                </div>

                <div className="row g-4">
                  <div className="col-md-3">
                    <div className="p-3 border rounded" style={{ borderLeft: '3px solid #696cff' }}>
                      <span className="d-block text-muted mb-1" style={{ fontSize: '0.85rem' }}>Contact Number</span>
                      <span className="fw-medium">{outletData.contactNumber}</span>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="p-3 border rounded" style={{ borderLeft: '3px solid #696cff' }}>
                      <span className="d-block text-muted mb-1" style={{ fontSize: '0.85rem' }}>Email</span>
                      <span className="fw-medium">{outletData.email}</span>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="p-3 border rounded" style={{ borderLeft: '3px solid #696cff' }}>
                      <span className="d-block text-muted mb-1" style={{ fontSize: '0.85rem' }}>Operating Hours</span>
                      <span className="fw-medium">{outletData.operatingHours}</span>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="p-3 border rounded" style={{ borderLeft: '3px solid #696cff' }}>
                      <span className="d-block text-muted mb-1" style={{ fontSize: '0.85rem' }}>Manager</span>
                      <span className="fw-medium">{outletData.manager}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Counts */}
              <h5 className="fw-bold mb-3">Menu Information</h5>
              <CountDisplay title="Menu & Category Counts" data={menuCounts} />

              {/* Staff Counts */}
              <h5 className="fw-bold mb-3">Staff Information</h5>
              <StaffCountDisplay data={staffCounts} />

              {/* Inventory Counts */}
              <h5 className="fw-bold mb-3">Inventory Information</h5>
              <CountDisplay title="Inventory Counts" data={inventoryCounts} />

              {/* Usage Statistics */}
              <h5 className="fw-bold mb-3">Usage Statistics</h5>
              <UsageStatsDisplay data={usageStats} />
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}

export default OutletDetails; 