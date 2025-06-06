import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../config/apiConfig';

/**
 * OutletSearch component - Reusable component for outlet search functionality
 * 
 * @param {Object} props
 * @param {boolean} props.show - Whether to show the modal
 * @param {function} props.onClose - Function to call when closing the modal
 * @param {function} props.onSelect - Function to call when an outlet is selected
 * @param {number|null} props.currentSelectIndex - Current index being edited (for CompareOutlets)
 * @param {Array} props.selectedOutlets - Array of already selected outlets (for CompareOutlets)
 * @param {boolean} props.isCompareMode - Whether the component is used in compare mode
 * @param {string} props.title - Modal title
 */
const OutletSearch = ({
  show,
  onClose,
  onSelect,
  currentSelectIndex = null,
  selectedOutlets = [],
  isCompareMode = false,
  title = "Select Outlet"
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [outlets, setOutlets] = useState([]);
  const [allOutlets, setAllOutlets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('default'); // 'default', 'asc', 'desc'

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

      const response = await api.post(`${API_PATHS.common}/get_outlet_list`, {
        owner_id: parseInt(userId)
      });

      if (response.status !== 200) {
        if (response.status === 401) {
          setError('Session expired. Please login again.');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = response.data;
      
      if (data.outlets && Array.isArray(data.outlets)) {
        const transformedOutlets = data.outlets.map(outlet => ({
          name: outlet.name,
          location: outlet.address,
          status: outlet.is_open ? 'open' : 'closed',
          outlet_id: outlet.outlet_id,
          outlet_code: outlet.outlet_code || '',
          owner_name: outlet.owner_name || '',
          outlet_status: outlet.outlet_status,
          account_type: outlet.account_type || '',
          is_active: outlet.outlet_status,
          address: outlet.address
        }));
        
        console.log('Transformed outlets:', transformedOutlets);
        setOutlets(transformedOutlets);
        setAllOutlets(transformedOutlets);
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

  // Filter outlets based on search term
  const filterOutlets = () => {
    if (!searchTerm.trim()) {
      setOutlets(allOutlets);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = allOutlets.filter(outlet => {
      // For debugging: check which field matches
      const nameMatch = outlet.name && outlet.name.toLowerCase().includes(searchTermLower);
      const codeMatch = outlet.outlet_code && outlet.outlet_code.toLowerCase().includes(searchTermLower);
      const idMatch = outlet.outlet_id && outlet.outlet_id.toString().includes(searchTermLower);
      const ownerMatch = outlet.owner_name && outlet.owner_name.toLowerCase().includes(searchTermLower);
      const addressMatch = outlet.address && outlet.address.toLowerCase().includes(searchTermLower);
      
      const isMatch = nameMatch || codeMatch || idMatch || ownerMatch || addressMatch;
      
      // Log detailed match info for debugging
      if (isMatch) {
        console.log(`Match found for "${searchTermLower}" in outlet:`, {
          id: outlet.outlet_id,
          name: outlet.name,
          code: outlet.outlet_code,
          matches: {
            name: nameMatch,
            code: codeMatch,
            id: idMatch,
            owner: ownerMatch,
            address: addressMatch
          }
        });
      }
      
      return isMatch;
    });

    console.log(`Search term: "${searchTermLower}" - Found ${filtered.length} outlets`);
    setOutlets(filtered);
  };

  // Handle search term change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (show) {
        filterOutlets();
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm, show, allOutlets]);

  // Load outlets when modal is opened
  useEffect(() => {
    if (show) {
      fetchOutlets();
      setSearchTerm('');
    }
  }, [show]);

  const handleClearSearch = () => {
    setSearchTerm('');
    setOutlets(allOutlets);
  };

  // Handle sort button click - cycle through sort orders
  const handleSortToggle = () => {
    if (sortOrder === 'default') {
      setSortOrder('asc');
    } else if (sortOrder === 'asc') {
      setSortOrder('desc');
    } else {
      setSortOrder('default');
    }
  };

  // Get sorted outlets based on current sort order
  const getSortedOutlets = () => {
    if (sortOrder === 'default') {
      return outlets;
    }
    
    return [...outlets].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.name.localeCompare(b.name);
      } else {
        return b.name.localeCompare(a.name);
      }
    });
  };

  // Get sort button icon and title based on current sort order
  const getSortButtonDetails = () => {
    switch (sortOrder) {
      case 'asc':
        return { icon: 'fa-sort-alpha-down', title: 'Sorted A-Z' };
      case 'desc':
        return { icon: 'fa-sort-alpha-down-alt', title: 'Sorted Z-A' };
      default:
        return { icon: 'fa-sort', title: 'Sort by name' };
    }
  };

  if (!show) return null;

  const sortButtonDetails = getSortButtonDetails();
  const sortedOutlets = getSortedOutlets();

  return (
    <div className="outlet-modal">
      <style>
        {`
          .outlet-code {
            font-size: 0.8rem;
            color: #7367f0;
            display: block;
            margin-top: 0.1rem;
            margin-bottom: 0.1rem;
          }
        `}
      </style>
      <div className="outlet-modal-content">
        <div className="outlet-modal-header">
          <h5 className="mb-0">{title}</h5>
          <button
            className="btn-close"
            onClick={onClose}
            aria-label="Close"
          ></button>
        </div>
        <div className="outlet-modal-body">
          {/* Search Bar */}
          <div className="outlet-search">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search by outlet name, code, owner or location"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button className="clear-btn" onClick={handleClearSearch}>
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>

          {/* All Outlets Section with Sort Button */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            {!isCompareMode && (
              <div className="outlet-list">
                <div 
                  className="outlet-item"
                  onClick={() => onSelect({ name: 'All Outlets', outlet_id: 'all' })}
                >
                  <i className="fas fa-store outlet-icon"></i>
                  <span>All Outlet</span>
                </div>
              </div>
            )}
            
            {/* Sort Button */}
            <button 
              className={`btn btn-sm ${sortOrder === 'default' ? 'btn-outline-secondary' : 'btn-outline-primary'}`}
              onClick={handleSortToggle}
              title={sortButtonDetails.title}
              style={{ height: 'fit-content' }}
            >
              <i className={`fas ${sortButtonDetails.icon} me-1`}></i>
              Sort
            </button>
          </div>

          {/* Outlet List */}
          <div className="outlet-list">
            {isLoading ? (
              <div className="text-center py-3">Loading outlets...</div>
            ) : error ? (
              <div className="text-center py-3 text-danger">{error}</div>
            ) : sortedOutlets.length === 0 ? (
              <div className="text-center py-3 text-muted">No outlets found</div>
            ) : (
              <>
                {sortedOutlets
                  .filter((outlet) => {
                    // Skip filtering if outlet is invalid
                    if (!outlet || !outlet.outlet_id) {
                      return false;
                    }
                    
                    // Always filter out the current outlet
                    const currentOutletId = localStorage.getItem('outlet_id');
                    if (currentOutletId && outlet.outlet_id.toString() === currentOutletId.toString()) {
                      console.log(`Filtering out current outlet: ${outlet.name} (ID: ${outlet.outlet_id})`);
                      return false;
                    }
                    
                    // In compare mode, filter out already selected outlets
                    if (isCompareMode) {
                      // Check if this outlet is already selected (excluding the one being edited)
                      const isAlreadySelected = selectedOutlets.some(
                        (selectedOutlet, index) => 
                          index !== currentSelectIndex && 
                          selectedOutlet && selectedOutlet.outlet_id && 
                          selectedOutlet.outlet_id.toString() === outlet.outlet_id.toString()
                      );
                      
                      // In compare mode, we want outlets that are NOT already selected
                      return !isAlreadySelected;
                    }
                    
                    // In regular mode, show all outlets except the current one
                    return true;
                  })
                  .map((outlet) => (
                    <div
                      key={outlet.outlet_id || Math.random().toString()}
                      className="outlet-item"
                      onClick={() => onSelect(outlet)}
                    >
                      <i
                        className={`fas ${
                          outlet.outlet_status ? "fa-store" : "fa-store-slash"
                        } outlet-icon`}
                      ></i>
                      <div className="outlet-info">
                        <span className="outlet-name">{outlet.name}</span>
                        {outlet.outlet_code && (
                          <span className="outlet-code">
                            <i className="fas fa-hashtag me-1"></i>
                            {outlet.outlet_code}
                          </span>
                        )}
                        {outlet.location && (
                          <span className="outlet-location">
                            <i className="fas fa-map-marker-alt me-1"></i>
                            {outlet.location}
                          </span>
                        )}
                      </div>
                      <div className="outlet-meta">
                        <div className="d-flex flex-wrap gap-1">
                          <span
                            className={`outlet-status ${
                              outlet.is_active ? "status-active" : "status-inactive"
                            }`}
                          >
                            {outlet.is_active ? "Active" : "Inactive"}
                          </span>
                          <span
                            className={`outlet-status ${
                              outlet.account_type === "test" ? "status-test" : "status-live"
                            }`}
                          >
                            {outlet.account_type === "test" ? "Test" : "Live"}
                          </span>
                          <span
                            className={`outlet-status ${
                              outlet.status === "open"
                                ? "status-open"
                                : "status-closed"
                            }`}
                          >
                            {outlet.status === "open" ? "Open" : "Closed"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutletSearch; 