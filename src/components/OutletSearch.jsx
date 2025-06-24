import React, { useState, useEffect, useRef } from 'react';
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
  const modalRef = useRef(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [outlets, setOutlets] = useState([]);
  const [allOutlets, setAllOutlets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('default'); // 'default', 'asc', 'desc'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'open', 'closed'
  const [activityFilter, setActivityFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [accountTypeFilter, setAccountTypeFilter] = useState('all'); // 'all', 'live', 'test'
  const [selectedOutletId, setSelectedOutletId] = useState(null);

  // Helper function to convert text to title case
  const toTitleCase = (str) => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Helper function to create unique keys for outlet items
  const getUniqueKey = (outlet) => {
    if (!outlet) return Math.random().toString();
    
    // Create a truly unique key by combining outlet_id with other properties
    const baseKey = outlet.outlet_id ? outlet.outlet_id.toString() : '';
    const namePart = outlet.name ? outlet.name.substring(0, 3) : '';
    const codePart = outlet.outlet_code ? outlet.outlet_code.substring(0, 3) : '';
    
    return `outlet-${baseKey}-${namePart}-${codePart}-${Math.random().toString(36).substring(2, 7)}`;
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
          address: outlet.address,
          _uniqueTempKey: `outlet-${outlet.outlet_id}-${Math.random().toString(36).substring(2, 7)}`
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

  // Apply all filters (search term and dropdown filters)
  const applyFilters = () => {
    if (!Array.isArray(allOutlets) || allOutlets.length === 0) {
      console.log("No outlets to filter");
      return;
    }
    
    let filteredOutlets = [...allOutlets];
    
    // Apply search term filter
    if (searchTerm && searchTerm.trim()) {
      const searchTermLower = searchTerm.toLowerCase();
      filteredOutlets = filteredOutlets.filter(outlet => {
        if (!outlet) return false;
        
        const nameMatch = outlet.name && outlet.name.toLowerCase().includes(searchTermLower);
        const codeMatch = outlet.outlet_code && outlet.outlet_code.toLowerCase().includes(searchTermLower);
        const idMatch = outlet.outlet_id && outlet.outlet_id.toString().includes(searchTermLower);
        const ownerMatch = outlet.owner_name && outlet.owner_name.toLowerCase().includes(searchTermLower);
        const addressMatch = outlet.address && outlet.address.toLowerCase().includes(searchTermLower);
        
        return nameMatch || codeMatch || idMatch || ownerMatch || addressMatch;
      });
    }
    
    // Apply status filter (open/closed)
    if (statusFilter !== 'all') {
      filteredOutlets = filteredOutlets.filter(outlet => outlet && outlet.status === statusFilter);
    }
    
    // Apply activity filter (active/inactive)
    if (activityFilter !== 'all') {
      const isActive = activityFilter === 'active';
      filteredOutlets = filteredOutlets.filter(outlet => outlet && outlet.is_active === isActive);
    }
    
    // Apply account type filter (live/test)
    if (accountTypeFilter !== 'all') {
      filteredOutlets = filteredOutlets.filter(outlet => outlet && outlet.account_type === accountTypeFilter);
    }
    
    // Apply sorting - make a new copy to ensure React detects changes
    let sortedOutlets = [...filteredOutlets];
    
    console.log("Before sorting:", sortOrder, sortedOutlets.map(o => o.name).slice(0, 5));
    
    if (sortOrder !== 'default') {
      sortedOutlets.sort((a, b) => {
        if (!a || !a.name) return 1;
        if (!b || !b.name) return -1;
        
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        
        if (sortOrder === 'asc') {
          return nameA.localeCompare(nameB);
        } else { // desc
          return nameB.localeCompare(nameA);
        }
      });
    }
    
    console.log("After sorting:", sortOrder, sortedOutlets.map(o => o.name).slice(0, 5));
    
    // Assign a unique temp key to each outlet for React rendering
    const outletsWithKeys = sortedOutlets.map(outlet => ({
      ...outlet,
      _uniqueTempKey: getUniqueKey(outlet)
    }));
    
    console.log("Filters applied:", { 
      searchTerm, 
      statusFilter, 
      activityFilter, 
      accountTypeFilter,
      sortOrder,
      resultCount: outletsWithKeys.length 
    });
    
    setOutlets(outletsWithKeys);
  };

  // Run applyFilters whenever any filter or sort order changes
  useEffect(() => {
    if (show && allOutlets.length > 0) {
      console.log("Applying filters due to filter/sort change, sortOrder =", sortOrder);
      applyFilters();
    }
  }, [searchTerm, statusFilter, activityFilter, accountTypeFilter, sortOrder, show, allOutlets]);

  // Load outlets when modal is opened
  useEffect(() => {
    if (show) {
      fetchOutlets();
      setSearchTerm('');
      setStatusFilter('all');
      setActivityFilter('all');
      setAccountTypeFilter('all');
      setSortOrder('default');
      setSelectedOutletId(null);
    }
  }, [show]);

  const handleClearSearch = () => {
    setSearchTerm('');
    // Re-apply filters immediately after clearing search
    setTimeout(() => applyFilters(), 0);
  };

  const handleClearFilters = () => {
    setStatusFilter('all');
    setActivityFilter('all');
    setAccountTypeFilter('all');
    // Re-apply filters immediately after clearing filters
    setTimeout(() => applyFilters(), 0);
  };

  // Handle sort button click - cycle through sort orders
  const handleSortToggle = () => {
    console.log("Current sort order:", sortOrder);
    
    // Directly update the sort order to force immediate re-render
    if (sortOrder === 'default') {
      setSortOrder('asc');
    } else if (sortOrder === 'asc') {
      setSortOrder('desc');
    } else {
      setSortOrder('default');
    }
  };

  // Get sorted outlets based on current sort order - this function is no longer needed as sorting is done in applyFilters
  const getSortedOutlets = () => {
    return outlets; // Just return the already sorted outlets
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

  // Handle click outside the modal to close it
  useEffect(() => {
    function handleClickOutside(event) {
      // If the modal is shown and the click is outside of the modal content
      if (show && modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    }

    // Add event listener when the modal is shown
    document.addEventListener('mousedown', handleClickOutside);
    
    // Clean up the event listener
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [show, onClose]);

  // Handle outlet selection
  const handleOutletSelect = (outlet) => {
    setSelectedOutletId(outlet.outlet_id);
    // Call the onSelect callback after a small delay to show the selection
    setTimeout(() => {
      onSelect(outlet);
    }, 150);
  };

  if (!show) return null;

  const sortButtonDetails = getSortButtonDetails();
  const sortedOutlets = outlets; // No need for getSortedOutlets() anymore
  const hasActiveFilters = statusFilter !== 'all' || activityFilter !== 'all' || accountTypeFilter !== 'all';

  return (
    <div className="outlet-modal" onClick={(e) => {
      // Close if clicking on the backdrop (but not on the modal content)
      if (e.target.className === 'outlet-modal') {
        onClose();
      }
    }}>
      <style>
        {`
          .outlet-code {
            font-size: 0.8rem;
            color: #7367f0;
            display: block;
            margin-top: 0.1rem;
            margin-bottom: 0.1rem;
            text-align: right;
          }
          
          .outlet-name {
            font-weight: 600;
            display: block;
            margin-bottom: 0.2rem;
            text-transform: uppercase;
          }
          
          .outlet-location {
            font-size: 0.85rem;
            color: #6e6b7b;
            display: block;
          }
          
          .outlet-item {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 5px;
            padding-left: 8px;
            border-bottom: 1px solid #ebe9f1;
            cursor: pointer;
            transition: background-color 0.15s ease;
          }
          
          .outlet-item:hover {
            background-color: #f8f8f8;
          }
          
          .outlet-item.selected {
            background-color: #f1f4ff;
            border-left: 3px solid #7367f0;
            padding-left: 5px;
          }
          
          .outlet-item.current {
            background-color: #eaf4ff;
            border-left: 3px solid #1a73e8;
            padding-left: 5px;
          }
          
          .outlet-info {
            flex: 1;
            padding-top: 2px;
          }
          
          .outlet-meta {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            min-width: 120px;
            padding-top: 2px;
          }
          
          .outlet-status {
            font-size: 0.75rem;
            padding: 1px 6px;
            border-radius: 4px;
            display: inline-block;
            font-weight: 500;
            text-align: center;
            white-space: nowrap;
          }
          
          .status-active {
            background-color: #e6f7ee;
            color: #28c76f;
          }
          
          .status-inactive {
            background-color: #feefd0;
            color: #ff9f43;
          }
          
          .status-open {
            background-color: #e0f8ff;
            color: #00cfe8;
          }
          
          .status-closed {
            background-color: #ffe0e0;
            color: #ea5455;
          }
          
          .status-live {
            background-color: #e6f7ee;
            color: #28c76f;
          }
          
          .status-test {
            background-color: #e7e6fd;
            color: #7367f0;
          }
          
          .filter-container {
            display: flex;
            gap: 8px;
            margin-bottom: 12px;
            flex-wrap: wrap;
          }
          
          .filter-select {
            flex: 1;
            min-width: 120px;
            padding: 6px 10px;
            border-radius: 4px;
            border: 1px solid #d8d6de;
            background-color: white;
            font-size: 0.9rem;
          }
          
          .filter-actions {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }
          
          .filter-badge {
            display: inline-flex;
            align-items: center;
            background: #f8f8f8;
            border-radius: 4px;
            padding: 2px 8px;
            margin-right: 5px;
            font-size: 0.8rem;
            border: 1px solid #e0e0e0;
          }
          
          .filter-badge .close-badge {
            margin-left: 5px;
            cursor: pointer;
            font-size: 0.7rem;
          }
          
          .clear-filters {
            color: #7367f0;
            background: none;
            border: none;
            font-size: 0.8rem;
            cursor: pointer;
            padding: 2px 5px;
          }
          
          .clear-filters:hover {
            text-decoration: underline;
          }
          
          .outlet-search input {
            width: 100%;
            padding: 8px 16px 8px 35px;
            border: 1px solid #000;
            border-radius: 4px;
            font-size: 0.9rem;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            transition: all 0.2s ease;
          }
          
          .outlet-search input:focus {
            outline: none;
            border-color: #7367f0;
            box-shadow: 0 2px 8px rgba(115, 103, 240, 0.2);
          }
        `}
      </style>
      <div className="outlet-modal-content" ref={modalRef}>
        <div className="outlet-modal-header p-4 pb-1">
          <h5 className="mb-0">{title}</h5>
          <button
            className="btn-close"
            onClick={onClose}
            aria-label="Close"
          ></button>
        </div>
        <div className="outlet-modal-body">
          {/* Search Bar */}
          <div className="outlet-search mb-2">
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

          {/* Filter Dropdowns */}
          <div className="filter-container">
            <select 
              className="filter-select" 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Status: All</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
            
            <select 
              className="filter-select" 
              value={activityFilter} 
              onChange={(e) => setActivityFilter(e.target.value)}
            >
              <option value="all">Activity: All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            
            <select 
              className="filter-select" 
              value={accountTypeFilter} 
              onChange={(e) => setAccountTypeFilter(e.target.value)}
            >
              <option value="all">Account: All</option>
              <option value="live">Live</option>
              <option value="test">Test</option>
            </select>
            
            {/* Sort Button */}
            <button 
              className={`btn ${sortOrder === 'default' ? 'btn-outline-secondary' : 'btn-outline-primary'}`}
              onClick={handleSortToggle}
              title={sortButtonDetails.title}
              style={{ height: 'fit-content', fontSize: '0.9rem', padding: '6px 10px' }}
            >
              <i className={`fas ${sortButtonDetails.icon} me-1`}></i>
              Sort
            </button>
          </div>

          {/* Active Filters & Clear Button */}
          {hasActiveFilters && (
            <div className="filter-actions">
              <div className="active-filters">
                {statusFilter !== 'all' && (
                  <span className="filter-badge">
                    Status: {statusFilter}
                    <i className="fas fa-times close-badge" onClick={() => setStatusFilter('all')}></i>
                  </span>
                )}
                {activityFilter !== 'all' && (
                  <span className="filter-badge">
                    {activityFilter === 'active' ? 'Active' : 'Inactive'}
                    <i className="fas fa-times close-badge" onClick={() => setActivityFilter('all')}></i>
                  </span>
                )}
                {accountTypeFilter !== 'all' && (
                  <span className="filter-badge">
                    {accountTypeFilter === 'live' ? 'Live' : 'Test'}
                    <i className="fas fa-times close-badge" onClick={() => setAccountTypeFilter('all')}></i>
                  </span>
                )}
              </div>
              <button className="clear-filters" onClick={handleClearFilters}>
                <i className="fas fa-filter-circle-xmark me-1"></i>
                Clear all filters
              </button>
            </div>
          )}

          {/* Outlet List */}
          <div className="outlet-list gap-0">
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
                    
                    // Allow the current outlet to be displayed
                    const currentOutletId = localStorage.getItem('outlet_id');
                    
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
                    
                    // In regular mode, show all outlets
                    return true;
                  })
                  .map((outlet) => {
                    // Check if this is the current outlet
                    const currentOutletId = localStorage.getItem('outlet_id');
                    const isCurrentOutlet = currentOutletId && outlet.outlet_id.toString() === currentOutletId.toString();
                    
                    return (
                      <div
                        key={outlet._uniqueTempKey || getUniqueKey(outlet)}
                        className={`outlet-item ${
                          isCurrentOutlet ? 'current' : (selectedOutletId === outlet.outlet_id ? 'selected' : '')
                        }`}
                        onClick={isCurrentOutlet ? undefined : () => handleOutletSelect(outlet)}
                        style={isCurrentOutlet ? { cursor: 'default' } : {}}
                      >
                        <div className="outlet-info">
                          <span className="outlet-name">
                            {outlet.name}
                            {isCurrentOutlet && (
                              <span className="badge bg-primary ms-2" style={{ fontSize: '0.65rem', verticalAlign: 'middle' }}>Selected</span>
                            )}
                          </span>
                          <div className="d-flex justify-content-between align-items-start">
                            {outlet.location && (
                              <span className="outlet-location">
                                <i className="fas fa-map-marker-alt me-1"></i>
                                {toTitleCase(outlet.location)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="outlet-meta">
                          <div className="d-flex flex-wrap gap-1 justify-content-end">
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
                          <div className="d-flex justify-content-end mt-0 pt-0">
                            {outlet.outlet_code && (
                              <span className="outlet-code m-0">
                                <i className="fas fa-hashtag me-1"></i>
                                {outlet.outlet_code}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OutletSearch; 