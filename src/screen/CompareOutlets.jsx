import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import VerticalSidebar from '../components/VerticalSidebar'
import { Table } from 'react-bootstrap'
import { api, API_PATHS } from '../config/apiConfig'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const CompareOutlets = () => {
  
  const MAX_COMPARE_OUTLETS = 2;
  
  const [selectedOutlets, setSelectedOutlets] = useState([]);
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [currentSelectIndex, setCurrentSelectIndex] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // Get current outlet from localStorage
  const [currentOutlet, setCurrentOutlet] = useState({
    name: "Current Outlet",
    location: "Location details",
    id: localStorage.getItem('outlet_id') || "N/A",
    menus: 12,
    categories: 8,
    items: 86,
    tables: 24,
    staff: 15,
    avgRevenue: "₹45,650",
    avgOrders: 128
  });
  
  // Function to show toast notifications
  const showToast = (message, type = 'error') => {
    const options = {
      position: "top-right",
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "colored",
      className: "materio-toast",
      style: {
        borderRadius: '0.5rem',
        boxShadow: '0 0.25rem 1rem rgba(161, 172, 184, 0.45)'
      }
    };

    switch(type) {
      case 'success':
        toast.success(message, options);
        break;
      case 'warning':
        toast.warning(message, options);
        break;
      case 'info':
        toast.info(message, options);
        break;
      case 'error':
      default:
        toast.error(message, options);
        break;
    }
  };
  
  // Utility function to truncate text
  const truncateText = (text, maxLength, maxWords = 3) => {
    if (!text) return '';
    const words = text.split(' ');
    if (words.length <= maxWords) return text; // No truncation for maxWords or fewer words
    let truncated = '';
    for (let word of words) {
      if ((truncated + word).length > maxLength) break;
      truncated += word + ' ';
    }
    return truncated.trim() + '...';
  };
  
  // Fetch outlets from API - using the same function as in Header component
  const fetchOutlets = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userId = localStorage.getItem('user_id');
      const accessToken = localStorage.getItem('access_token');
      
      if (!userId || !accessToken) {
        setError('Authentication failed. Please login again.');
        return;
      }

      // Use the simplified payload format as provided
      const response = await api.post(`${API_PATHS.common}/get_outlet_list`, {
        owner_id: parseInt(userId)
      });

      if (response.status !== 200) {
        if (response.status === 401) {
          setError('Session expired. Please login again.');
          navigate('/login');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = response.data;
      
      // Check for success response based on the presence of outlets array
      if (data.outlets && Array.isArray(data.outlets)) {
        const transformedOutlets = data.outlets.map(outlet => ({
          name: outlet.name,
          location: outlet.address,
          status: outlet.is_open ? 'open' : 'closed',
          outlet_id: outlet.outlet_id,
          outlet_status: outlet.outlet_status,
          address: outlet.address
        }));
        
        setOutlets(transformedOutlets);
        
        // If there's a stored outlet_id, update current outlet data
        const storedOutletId = localStorage.getItem('outlet_id');
        if (storedOutletId) {
          const matchingOutlet = transformedOutlets.find(o => o.outlet_id.toString() === storedOutletId);
          if (matchingOutlet) {
            setCurrentOutlet({
              name: matchingOutlet.name,
              location: matchingOutlet.address,
              id: matchingOutlet.outlet_id,
              menus: 12, // Mock data for now
              categories: 8,
              items: 86,
              tables: 24,
              staff: 15,
              avgRevenue: "₹45,650",
              avgOrders: 128
            });
          }
        }
      } else {
        setError(data.detail || 'Failed to fetch outlets');
      }
    } catch (err) {
      console.error('Error fetching outlets:', err);
      setError('Failed to connect to server. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // Fetch outlets when component mounts
    fetchOutlets();
  }, []);

  // Open modal to select/change outlet at specific index
  const handleOpenSelectModal = (index) => {
    setCurrentSelectIndex(index);
    setShowOutletModal(true);
  };

  // Handle outlet selection from modal
  const handleOutletSelect = (outlet) => {
    // Create mock data for the selected outlet
    const outletWithData = {
      ...outlet,
      menus: 10 + Math.floor(Math.random() * 5), // Mock data with some variation
      categories: 6 + Math.floor(Math.random() * 4),
      items: 70 + Math.floor(Math.random() * 20),
      tables: 15 + Math.floor(Math.random() * 10),
      staff: 10 + Math.floor(Math.random() * 8),
      avgRevenue: `₹${(35000 + Math.floor(Math.random() * 15000)).toLocaleString('en-IN')}`,
      avgOrders: 100 + Math.floor(Math.random() * 30)
    };
    
    // If we're editing an existing selection
    if (currentSelectIndex !== null && currentSelectIndex < selectedOutlets.length) {
      const updatedOutlets = [...selectedOutlets];
      updatedOutlets[currentSelectIndex] = outletWithData;
      setSelectedOutlets(updatedOutlets);
    } else {
      // We're adding a new outlet
      setSelectedOutlets([...selectedOutlets, outletWithData]);
    }
    
    setShowOutletModal(false);
    setCurrentSelectIndex(null);
  };

  // Remove an outlet from comparison
  const handleRemoveOutlet = (index) => {
    const updatedOutlets = [...selectedOutlets];
    updatedOutlets.splice(index, 1);
    setSelectedOutlets(updatedOutlets);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  // Generate table headers based on selected outlets
  const renderTableHeaders = () => {
    const headers = [
      <th key="metrics" style={{width: "200px"}}>Metrics</th>,
      <th key="current">Current Outlet</th>
    ];
    
    // Add headers for selected outlets
    selectedOutlets.forEach((outlet, index) => {
      headers.push(
        <th key={`outlet-${index}`}>{outlet.name}</th>
      );
    });
    
    // Add one more header for the "Select Outlet" button if we haven't reached the max
    if (selectedOutlets.length < MAX_COMPARE_OUTLETS) {
      headers.push(<th key="add-outlet">Add Outlet</th>);
    }
    
    return headers;
  };

  // Generate outlet details row
  const renderOutletDetailsRow = () => {
    const cells = [
      <th key="details">Outlet Details</th>,
      <td key="current">
        <div className="d-flex align-items-center">
          <div className="avatar-sm me-2">
            <span className="avatar-initial rounded-circle bg-label-primary">
              <i className="fas fa-store"></i>
            </span>
          </div>
          <div>
            <h6 className="mb-0">{currentOutlet.name}</h6>
            <small className="text-muted">{currentOutlet.location}</small>
          </div>
        </div>
      </td>
    ];
    
    // Add cells for selected outlets
    selectedOutlets.forEach((outlet, index) => {
      cells.push(
        <td key={`outlet-${index}`}>
          <div className="d-flex align-items-center">
            <div className="avatar-sm me-2">
              <span className="avatar-initial rounded-circle bg-label-success">
                <i className="fas fa-store"></i>
              </span>
            </div>
            <div className="flex-grow-1">
              <h6 className="mb-0">{outlet.name}</h6>
              <small className="text-muted">{outlet.address}</small>
            </div>
            <div>
              <button 
                className="btn btn-sm btn-outline-primary"
                onClick={() => handleOpenSelectModal(index)}
                title="Change outlet"
              >
                <i className="fas fa-exchange-alt"></i>
              </button>
              <button 
                className="btn btn-sm btn-outline-danger ms-2"
                onClick={() => handleRemoveOutlet(index)}
                title="Remove outlet"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        </td>
      );
    });
    
    // Add one more cell for the "Select Outlet" button if we haven't reached the max
    if (selectedOutlets.length < MAX_COMPARE_OUTLETS) {
      cells.push(
        <td key="add-outlet">
          <button 
            className="btn btn-primary"
            onClick={() => handleOpenSelectModal(selectedOutlets.length)}
          >
            <i className="fas fa-plus me-2"></i>
            Select Outlet
          </button>
        </td>
      );
    }
    
    return cells;
  };

  // Generate a metric row
  const renderMetricRow = (label, key) => {
    const cells = [
      <th key="label">{label}</th>,
      <td key="current">
        <span className="fw-bold">{currentOutlet[key]}</span>
      </td>
    ];
    
    // Add cells for selected outlets
    selectedOutlets.forEach((outlet, index) => {
      cells.push(
        <td key={`outlet-${index}`}>
          <span className="fw-bold">{outlet[key]}</span>
        </td>
      );
    });
    
    // Add empty cell if we haven't reached the max
    if (selectedOutlets.length < MAX_COMPARE_OUTLETS) {
      cells.push(<td key="empty"></td>);
    }
    
    return cells;
  };

  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        <VerticalSidebar />
        <div className="layout-page d-flex flex-column min-vh-100">
          <Header />
          
          <div className="content-wrapper flex-grow-1 p-0">
            <div className="container-xxl flex-grow-1 p-0">
              <div className="card border-0 rounded-0 shadow-none">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="card-title mb-0">Outlet Comparison</h5>
                  <div>
                    <small className="text-muted me-2">Maximum {MAX_COMPARE_OUTLETS} outlets can be compared</small>
                    <span className="badge bg-primary">{selectedOutlets.length} of {MAX_COMPARE_OUTLETS}</span>
                  </div>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <Table bordered hover className="mb-0">
                      <thead>
                        <tr className="table-light">
                          {renderTableHeaders()}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Outlet Details Row */}
                        <tr>
                          {renderOutletDetailsRow()}
                        </tr>
                        
                        {/* Menus Row */}
                        <tr>
                          {renderMetricRow('Menus', 'menus')}
                        </tr>
                        
                        {/* Categories Row */}
                        <tr>
                          {renderMetricRow('Categories', 'categories')}
                        </tr>
                        
                        {/* Items Row */}
                        <tr>
                          {renderMetricRow('Menu Items', 'items')}
                        </tr>
                        
                        {/* Tables Row */}
                        <tr>
                          {renderMetricRow('Tables', 'tables')}
                        </tr>
                        
                        {/* Staff Row */}
                        <tr>
                          {renderMetricRow('Staff', 'staff')}
                        </tr>
                        
                        {/* Average Revenue Row */}
                        <tr>
                          {renderMetricRow('Average Daily Revenue', 'avgRevenue')}
                        </tr>
                        
                        {/* Average Orders Row */}
                        <tr>
                          {renderMetricRow('Average Orders per Day', 'avgOrders')}
                        </tr>
                      </tbody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
            <Footer />
          </div>
        </div>
      </div>
      
      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      
      {/* Outlet Selection Modal - Similar to the one in Header component */}
      {showOutletModal && (
        <div className="outlet-modal">
          <div className="outlet-modal-content">
            <div className="outlet-modal-header">
              <h5 className="mb-0">Select Outlet to Compare</h5>
              <button
                className="btn-close"
                onClick={() => setShowOutletModal(false)}
                aria-label="Close"
              ></button>
            </div>
            <div className="outlet-modal-body">
              {/* Search Bar */}
              <div className="outlet-search">
                <i className="fas fa-search"></i>
                <input
                  type="text"
                  placeholder="Search outlets"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button className="clear-btn" onClick={handleClearSearch}>
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>

              {/* Outlet List */}
              <div className="outlet-list">
                {isLoading ? (
                  <div className="text-center py-3">Loading outlets...</div>
                ) : error ? (
                  <div className="text-center py-3 text-danger">{error}</div>
                ) : (
                  outlets
                    .filter((outlet) => {
                      // Filter out current outlet and already selected outlets
                      const currentOutletId = localStorage.getItem('outlet_id');
                      const isCurrentOutlet = outlet.outlet_id.toString() === currentOutletId;
                      
                      // Check if this outlet is already selected (excluding the one being edited)
                      const isAlreadySelected = selectedOutlets.some(
                        (selectedOutlet, index) => 
                          index !== currentSelectIndex && 
                          selectedOutlet.outlet_id === outlet.outlet_id
                      );
                      
                      // Apply search filter
                      const search = searchTerm.toLowerCase();
                      const matchesSearch = outlet.name.toLowerCase().includes(search) ||
                        outlet.outlet_id.toString().includes(search) ||
                        (outlet.address && outlet.address.toLowerCase().includes(search));
                      
                      // Only show outlets that match search and are not current/already selected
                      return matchesSearch && !isCurrentOutlet && !isAlreadySelected;
                    })
                    .map((outlet) => (
                      <div
                        key={outlet.outlet_id}
                        className="outlet-item"
                        onClick={() => handleOutletSelect(outlet)}
                      >
                        <i
                          className={`fas ${
                            outlet.outlet_status ? "fa-store" : "fa-store-slash"
                          } outlet-icon`}
                        ></i>
                        <div className="outlet-info">
                          <span className="outlet-name">{outlet.name}</span>
                          {outlet.address && (
                            <span className="outlet-location">
                              <i className="fas fa-map-marker-alt me-1"></i>
                              {outlet.address}
                            </span>
                          )}
                        </div>
                        <div className="outlet-meta">
                          <span className="outlet-id">
                            [ID: {outlet.outlet_id}]
                          </span>
                          <span
                            className={`outlet-status ${
                              outlet.status === "open" ? "status-open" : "status-closed"
                            }`}
                          >
                            {outlet.status === "open" ? "Open" : "Closed"}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* CSS for outlet modal - similar to Header component */}
      <style>
        {`
          .outlet-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1050;
            padding: 1rem;
          }
          
          .outlet-modal-content {
            background: white;
            border-radius: 8px;
            width: 90%;
            max-width: 600px;
            max-height: 90vh;
            overflow-y: auto;
            position: relative;
            animation: modalFadeIn 0.3s ease-out;
          }
          
          @keyframes modalFadeIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          .outlet-modal-header {
            padding: 1.5rem;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            background: white;
            z-index: 1;
          }
          
          .outlet-modal-body {
            padding: 1.5rem;
          }
          
          .outlet-search {
            position: relative;
            margin-bottom: 1rem;
            position: sticky;
            top: 72px;
            background: white;
            z-index: 1;
            padding: 0.5rem 0;
          }
          
          .outlet-search input {
            width: 100%;
            padding: 0.75rem 1rem 0.75rem 2.5rem;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            font-size: 1rem;
          }
          
          .outlet-search i {
            position: absolute;
            left: 1rem;
            top: 50%;
            transform: translateY(-50%);
            color: #566a7f;
          }
          
          .outlet-search .clear-btn {
            position: absolute;
            right: 1rem;
            top: 50%;
            transform: translateY(-50%);
            border: none;
            background: none;
            color: #566a7f;
            cursor: pointer;
            padding: 0.25rem 0.5rem;
          }
          
          .outlet-list {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .outlet-item {
            padding: 1rem;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            align-items: center;
            cursor: pointer;
            gap: 1rem;
            transition: background-color 0.2s ease;
          }
          
          .outlet-item:hover {
            background: #f8f9fa;
          }
          
          .outlet-icon {
            color: #566a7f;
            flex-shrink: 0;
            font-size: 1.2rem;
          }

          .outlet-info {
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            min-width: 0;
          }

          .outlet-name {
            font-weight: 500;
            color: #566a7f;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .outlet-location {
            font-size: 0.875rem;
            color: #999;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .outlet-meta {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-left: auto;
            flex-shrink: 0;
          }
          
          .outlet-id {
            color: #999;
            font-size: 0.875rem;
          }

          .outlet-status {
            font-size: 0.75rem;
            padding: 0.25rem 0.5rem;
            border-radius: 1rem;
            font-weight: 500;
          }

          .status-open {
            background-color: #28c76f1a;
            color: #28c76f;
          }

          .status-closed {
            background-color: #ea54551a;
            color: #ea5455;
          }
          
          .avatar-sm {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
          }
          
          .avatar-initial {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          }
          
          .bg-label-primary {
            background-color: rgba(105, 108, 255, 0.16) !important;
            color: #696cff !important;
          }
          
          .bg-label-success {
            background-color: rgba(40, 199, 111, 0.16) !important;
            color: #28c76f !important;
          }
        `}
      </style>
    </div>
  )
}

export default CompareOutlets