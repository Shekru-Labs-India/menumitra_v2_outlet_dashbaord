import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import VerticalSidebar from '../components/VerticalSidebar'
import { Table } from 'react-bootstrap'
import { api, API_PATHS } from '../config/apiConfig'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import OutletSearch from '../components/OutletSearch'

const CompareOutlets = () => {
  
  const MAX_COMPARE_OUTLETS = 3;
  
  const [selectedOutlets, setSelectedOutlets] = useState([]);
  const [showOutletModal, setShowOutletModal] = useState(false);
  const [currentSelectIndex, setCurrentSelectIndex] = useState(null);
  const [outlets, setOutlets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // Current outlet state
  const [currentOutlet, setCurrentOutlet] = useState({
    name: "Current Outlet",
    location: "Location details",
    id: localStorage.getItem('outlet_id') || "N/A",
    address: "",
    installation_statistics: {
      total_orders: 0,
      days_since_installation: 0,
      first_order_date: ""
    },
    revenue_statistics: {
      total_revenue: 0
    },
    payment_statistics: {
      upi: 0,
      card: 0,
      cash: 0,
      complementary: 0,
      udhari: 0
    },
    order_status_statistics: {
      success: 0,
      cancelled: 0,
      kot_orders: 0,
      complementary_orders: 0,
      udhari_orders: 0
    },
    order_type_statistics: {
      dine_in: 0,
      parcel: 0,
      drive_through: 0,
      counter: 0
    },
    udhari_statistics: {
      pending: 0,
      settled: 0
    },
    advance_payment_statistics: {
      settled: 0,
      partial_payment: 0
    }
  });
  
  // Function to format currency in Indian format
  const formatIndianCurrency = (amount) => {
    if (amount === undefined || amount === null) return '₹0';
    return `₹${Number(amount).toLocaleString('en-IN')}`;
  };
  
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
  
  // Fetch current outlet details
  const fetchCurrentOutletDetails = async () => {
    try {
      setIsLoading(true);
      
      const userId = localStorage.getItem('user_id');
      const outletId = localStorage.getItem('outlet_id');
      
      if (!userId || !outletId) {
        setError('Authentication failed. Please login again.');
        return;
      }
      
      // First get basic outlet details
      const outletResponse = await api.post(API_PATHS.outletDetails, {
        user_id: parseInt(userId),
        outlet_id: parseInt(outletId)
      });
      
      if (outletResponse.status !== 200) {
        throw new Error(`HTTP error! status: ${outletResponse.status}`);
      }
      
      const outletData = outletResponse.data;
      
      // Then get outlet comparison details
      const compareResponse = await api.post(API_PATHS.outletCompareDetails, {
        user_id: parseInt(userId),
        outlet_id: parseInt(outletId)
      });
      
      if (compareResponse.status !== 200) {
        throw new Error(`HTTP error! status: ${compareResponse.status}`);
      }
      
      const compareData = compareResponse.data;
      
      // Combine the data
      setCurrentOutlet({
        name: outletData.detail?.name || "Current Outlet",
        location: outletData.detail?.address || "Location details",
        address: outletData.detail?.address || "",
        id: outletId,
        ...compareData.detail
      });
      
    } catch (err) {
      console.error('Error fetching current outlet details:', err);
      setError('Failed to fetch outlet details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch outlets from API
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
  
  // Fetch outlet comparison details
  const fetchOutletCompareDetails = async (outletId) => {
    try {
      const userId = localStorage.getItem('user_id');
      
      if (!userId || !outletId) {
        console.error('Missing user ID or outlet ID');
        return null;
      }
      
      const response = await api.post(API_PATHS.outletCompareDetails, {
        user_id: parseInt(userId),
        outlet_id: parseInt(outletId)
      });
      
      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.data.detail || null;
    } catch (err) {
      console.error(`Error fetching comparison details for outlet ${outletId}:`, err);
      showToast(`Failed to fetch details for outlet ID ${outletId}`, 'error');
      return null;
    }
  };
  
  useEffect(() => {
    // Fetch outlets and current outlet details when component mounts
    fetchOutlets();
    fetchCurrentOutletDetails();
  }, []);

  // Open modal to select/change outlet at specific index
  const handleOpenSelectModal = (index) => {
    setCurrentSelectIndex(index);
    setShowOutletModal(true);
  };

  // Handle outlet selection from modal
  const handleOutletSelect = async (outlet) => {
    try {
      setIsLoading(true);
      
      // Fetch outlet comparison details
      const compareDetails = await fetchOutletCompareDetails(outlet.outlet_id);
      
      if (!compareDetails) {
        showToast(`Failed to fetch comparison data for ${outlet.name}`, 'error');
        setIsLoading(false);
        return;
      }
      
      // Create outlet object with comparison data
    const outletWithData = {
      ...outlet,
        ...compareDetails
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
      showToast(`Added ${outlet.name} for comparison`, 'success');
      
    } catch (err) {
      console.error('Error selecting outlet:', err);
      showToast('Failed to select outlet for comparison', 'error');
    } finally {
      setIsLoading(false);
    }
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
    
    // Add headers for selected outlets with change/remove buttons
    selectedOutlets.forEach((outlet, index) => {
      headers.push(
        <th key={`outlet-${index}`}>
          <div className="d-flex align-items-center justify-content-between">
            <span>{outlet.name}</span>
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
        </th>
      );
    });
    
    // Add one more header for the "Select Outlet" button if we haven't reached the max
    if (selectedOutlets.length < MAX_COMPARE_OUTLETS) {
      headers.push(
        <th key="add-outlet">
          <button 
            className="btn btn-primary"
            onClick={() => handleOpenSelectModal(selectedOutlets.length)}
          >
            <i className="fas fa-plus me-2"></i>
            Select Outlet
          </button>
        </th>
      );
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
    
    // Add cells for selected outlets without buttons
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
          </div>
        </td>
      );
    });
    
    // Add one more cell for the "Select Outlet" button if we haven't reached the max
    if (selectedOutlets.length < MAX_COMPARE_OUTLETS) {
      cells.push(<td key="add-outlet"></td>);
    }
    
    return cells;
  };

  // Generate a metric row with nested path support
  const renderMetricRow = (label, path) => {
    // Helper function to get value from nested path
    const getNestedValue = (obj, path) => {
      const keys = path.split('.');
      return keys.reduce((o, key) => (o && o[key] !== undefined) ? o[key] : null, obj);
    };
    
    // Format value based on type
    const formatValue = (value, path) => {
      if (value === null || value === undefined) return 'N/A';
      
      // Format currency values
      if (path.includes('revenue') || path.includes('payment') || 
          path.includes('udhari') || path.includes('advance_payment')) {
        return formatIndianCurrency(value);
      }
      
      // Format dates
      if (path.includes('date')) {
        return value;
      }
      
      // Default number formatting
      return value.toLocaleString();
    };
    
    const cells = [
      <th key="label">{label}</th>,
      <td key="current">
        <span className="fw-bold">{formatValue(getNestedValue(currentOutlet, path), path)}</span>
      </td>
    ];
    
    // Add cells for selected outlets
    selectedOutlets.forEach((outlet, index) => {
      cells.push(
        <td key={`outlet-${index}`}>
          <span className="fw-bold">{formatValue(getNestedValue(outlet, path), path)}</span>
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
                        
                        {/* Installation Statistics - removed header row */}
                        <tr>
                          {renderMetricRow('Total Orders', 'installation_statistics.total_orders')}
                        </tr>
                        <tr>
                          {renderMetricRow('Days Since Installation', 'installation_statistics.days_since_installation')}
                        </tr>
                        <tr>
                          {renderMetricRow('First Order Date', 'installation_statistics.first_order_date')}
                        </tr>
                        
                        {/* Revenue Statistics - removed header row */}
                        <tr>
                          {renderMetricRow('Total Revenue', 'revenue_statistics.total_revenue')}
                        </tr>
                        
                        {/* Payment Statistics - removed header row */}
                        <tr>
                          {renderMetricRow('UPI Payments', 'payment_statistics.upi')}
                        </tr>
                        <tr>
                          {renderMetricRow('Card Payments', 'payment_statistics.card')}
                        </tr>
                        <tr>
                          {renderMetricRow('Cash Payments', 'payment_statistics.cash')}
                        </tr>
                        <tr>
                          {renderMetricRow('Complementary', 'payment_statistics.complementary')}
                        </tr>
                        <tr>
                          {renderMetricRow('Udhari', 'payment_statistics.udhari')}
                        </tr>
                        
                        {/* Order Status Statistics - removed header row */}
                        <tr>
                          {renderMetricRow('Successful Orders', 'order_status_statistics.success')}
                        </tr>
                        <tr>
                          {renderMetricRow('Cancelled Orders', 'order_status_statistics.cancelled')}
                        </tr>
                        <tr>
                          {renderMetricRow('KOT Orders', 'order_status_statistics.kot_orders')}
                        </tr>
                        <tr>
                          {renderMetricRow('Complementary Orders', 'order_status_statistics.complementary_orders')}
                        </tr>
                        <tr>
                          {renderMetricRow('Udhari Orders', 'order_status_statistics.udhari_orders')}
                        </tr>
                        
                        {/* Order Type Statistics - removed header row */}
                        <tr>
                          {renderMetricRow('Dine In', 'order_type_statistics.dine_in')}
                        </tr>
                        <tr>
                          {renderMetricRow('Parcel', 'order_type_statistics.parcel')}
                        </tr>
                        <tr>
                          {renderMetricRow('Drive Through', 'order_type_statistics.drive_through')}
                        </tr>
                        <tr>
                          {renderMetricRow('Counter', 'order_type_statistics.counter')}
                        </tr>
                        
                        {/* Udhari Statistics - removed header row */}
                        <tr>
                          {renderMetricRow('Pending', 'udhari_statistics.pending')}
                        </tr>
                        <tr>
                          {renderMetricRow('Settled', 'udhari_statistics.settled')}
                        </tr>
                        
                        {/* Advance Payment Statistics - removed header row */}
                        <tr>
                          {renderMetricRow('Settled', 'advance_payment_statistics.settled')}
                        </tr>
                        <tr>
                          {renderMetricRow('Partial Payment', 'advance_payment_statistics.partial_payment')}
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
      
      {/* Replace the inline outlet modal with the OutletSearch component */}
      <OutletSearch
        show={showOutletModal}
        onClose={() => setShowOutletModal(false)}
        onSelect={handleOutletSelect}
        currentSelectIndex={currentSelectIndex}
        selectedOutlets={selectedOutlets}
        isCompareMode={true}
        title="Select Outlet to Compare"
      />
      
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
          
          .status-active {
            background-color: #7367f01a;
            color: #7367f0;
            margin-right: 4px;
          }
          
          .status-inactive {
            background-color: #82868b1a;
            color: #82868b;
            margin-right: 4px;
          }
          
          .status-live {
            background-color: #00cfe81a;
            color: #00cfe8;
            margin-right: 4px;
          }
          
          .status-test {
            background-color: #ff9f431a;
            color: #ff9f43;
            margin-right: 4px;
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
          
          /* Remove grey background from header rows */
          .table-light {
            background-color: white !important;
          }
          
          /* Clean table styling */
          .table {
            border-color: #e9ecef;
          }

          .table>:not(caption)>*>* {
            padding: 0.75rem 1rem;
            background-color: transparent;
            border-bottom-width: 1px;
            box-shadow: none;
          }

          /* Remove background from section headers */
          .table .table-light {
            background-color: transparent !important;
          }

          /* Fix section headers styling */
          .table .table-light th {
            padding: 0.75rem 1rem;
            font-size: 0.95rem;
            font-weight: 600;
            color: #566a7f;
            border-bottom: 1px solid #e9ecef;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          /* Style for metric rows */
          tbody tr th {
            font-weight: 500;
            color: #566a7f;
            background-color: white !important;
            padding: 0.75rem 1rem;
          }
          
          /* Style for value cells */
          tbody tr td .fw-bold {
            color: #566a7f;
          }
        `}
      </style>
    </div>
  )
}

export default CompareOutlets