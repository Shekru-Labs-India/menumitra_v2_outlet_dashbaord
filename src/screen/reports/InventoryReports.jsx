import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../../config/apiConfig';
import {
  Form,
  Button,
  Breadcrumb
} from 'react-bootstrap';
import VerticalSidebar from '../../components/VerticalSidebar';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { ForbiddenAccessMessage, ReportTable } from '../../components/common';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const InventoryReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inventoryData, setInventoryData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [supplierId, setSupplierId] = useState('');
  const [inOrOut, setInOrOut] = useState('in');
  
  // Date range filters
  const [dateRange, setDateRange] = useState('All Time');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchSuppliers();
  }, []);

  // Update filtered data when filter type, supplier ID, or in/out status changes
  useEffect(() => {
    if (inventoryData.length > 0) {
      applyFilters();
    }
  }, [filterType, supplierId, inOrOut, inventoryData]);

  const applyFilters = () => {
    let result = [...inventoryData];
    
    // Apply filter by supplier if applicable
    if (filterType === 'supplier' && supplierId) {
      const supplierIdNum = parseInt(supplierId, 10);
      console.log('Filtering by supplier_id:', supplierIdNum);
      
      result = result.filter(item => {
        const itemSupplierId = parseInt(item.supplier.id, 10);
        return itemSupplierId === supplierIdNum;
      });
      
      console.log('Filtered results count:', result.length);
    } else if (filterType === 'in_or_out' && inOrOut) {
      // Apply filter by in/out status
      result = result.filter(item => item.in_or_out === inOrOut);
      console.log('Filtered by in/out status:', inOrOut, 'Results:', result.length);
    }
    
    setFilteredData(result);
  };

  // Handle date range selection
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setShowDatePicker(range === 'Custom Range');
  };

  const fetchSuppliers = async () => {
    try {
      setLoadingSuppliers(true);
      // Using the reportFilterSupplier endpoint with GET request
      const response = await api.get(API_PATHS.reportFilterSupplier);
      
      // The API returns an array of suppliers directly in the detail field
      const validSuppliers = response.data.detail || [];
      console.log('Fetched suppliers:', validSuppliers);
      setSuppliers(validSuppliers);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError('Failed to fetch suppliers');
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const fetchInventoryReport = () => {
    const fetchData = async () => {
      try {
        // If filter type is supplier but no supplier is selected, don't fetch
        if (filterType === 'supplier' && !supplierId) {
          setError('Please select a supplier');
          return;
        }
        
        setLoading(true);
        setError(null);
        setPermissionDenied(false);

        // Set default filter_type if not provided
        const apiParams = {
          filter_type: filterType,
          outlet_id: localStorage.getItem('outlet_id'),
          user_id: localStorage.getItem('user_id')
        };

        if (filterType === 'supplier' && supplierId) {
          apiParams.supplier_id = parseInt(supplierId, 10);
        } else if (filterType === 'in_or_out') {
          apiParams.in_or_out = inOrOut;
        }

        // Add date range parameters if applicable
        if (startDate && endDate && dateRange === 'Custom Range') {
          apiParams.start_date = startDate.toISOString().split('T')[0];
          apiParams.end_date = endDate.toISOString().split('T')[0];
        } else if (dateRange !== 'All Time') {
          apiParams.date_range = dateRange;
        }

        console.log('Fetching inventory report with params:', apiParams);
        const response = await api.post(API_PATHS.inventoryReport, apiParams);
        
        // For inventory reports, the API might return a different structure
        // We need to extract the inventory items from the response
        let data = [];
        if (response.data && response.data.detail) {
          if (response.data.detail.inventory_items) {
            // If the API returns a nested structure with inventory_items
            data = response.data.detail.inventory_items || [];
          } else {
            // If the API directly returns an array of inventory items
            data = response.data.detail || [];
          }
        }
        
        console.log('API response data:', data);
        
        // Add unique id to each record for table component
        const processedData = data.map((item, index) => ({
          ...item,
          id: item.inventory_id || `inventory-${index}`
        }));
        
        setInventoryData(processedData);
        setFilteredData(processedData);
        setDataFetched(true);
      } catch (err) {
        console.error('Error fetching inventory report:', err);
        
        if (err.response?.status === 403 || 
            err.response?.data?.detail?.includes('permission') ||
            err.response?.data?.detail?.includes('access')) {
          setPermissionDenied(true);
          setError(err.response?.data?.detail || 'You don\'t have permission to access inventory reports management functionality');
        } else {
          setError(err.response?.data?.detail || 'Failed to fetch inventory report data');
        }

        if (err.response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  };

  const handleRetry = () => {
    fetchInventoryReport();
  };

  const handleFilterTypeChange = (e) => {
    setFilterType(e.target.value);
    // Reset supplier selection if not filtering by supplier
    if (e.target.value !== 'supplier') {
      setSupplierId('');
    }
    // Reset in/out selection if not filtering by in/out status
    if (e.target.value !== 'in_or_out') {
      setInOrOut('in');
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  // Define table columns
  const columns = [
    {
      Header: 'Item Details',
      accessor: 'name',
      width: '200px',
      Cell: (item) => (
        <div className="text-nowrap">
          <span className="fw-semibold text-primary">{item.name}</span>
          <br />
          <small className="text-muted">{item.description || '-'}</small>
        </div>
      ),
      exportFormat: (item) => `${item.name}${item.description ? ` (${item.description})` : ''}`
    },
    {
      Header: 'Category',
      accessor: 'category',
      width: '120px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.category}
        </div>
      ),
      exportFormat: (item) => item.category
    },
    {
      Header: 'Supplier',
      accessor: 'supplier',
      width: '150px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.supplier?.name || '-'}
        </div>
      ),
      exportFormat: (item) => item.supplier?.name || '-'
    },
    {
      Header: 'Price',
      accessor: 'unit_price',
      width: '100px',
      Cell: (item) => (
        <div className="text-nowrap fw-bold">
          ₹{item.unit_price?.toFixed(2) || '0.00'}
        </div>
      ),
      exportFormat: (item) => `₹${item.unit_price?.toFixed(2) || '0.00'}`,
      sortFunction: (a, b, direction) => {
        const aPrice = parseFloat(a.unit_price || 0);
        const bPrice = parseFloat(b.unit_price || 0);
        return direction === 'asc' ? aPrice - bPrice : bPrice - aPrice;
      }
    },
    {
      Header: 'Quantity',
      accessor: 'quantity',
      width: '120px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.quantity} {item.unit_of_measure}
        </div>
      ),
      exportFormat: (item) => `${item.quantity} ${item.unit_of_measure || ''}`
    },
    {
      Header: 'Status',
      accessor: 'in_or_out',
      width: '120px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.in_or_out === 'in' ? 'In Stock' : 'Out of Stock'}
        </div>
      ),
      exportFormat: (item) => item.in_or_out === 'in' ? 'In Stock' : 'Out of Stock',
      sortFunction: (a, b, direction) => {
        const aValue = a.in_or_out === 'in' ? 1 : 0;
        const bValue = b.in_or_out === 'in' ? 1 : 0;
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
    },
    // {
    //   Header: 'Dates',
    //   accessor: 'created_on',
    //   width: '180px',
    //   Cell: (item) => (
    //     <div className="text-nowrap">
    //       <small><strong>In:</strong> {item.in_date || '-'}</small>
    //       <br />
    //       <small><strong>Out:</strong> {item.out_date || '-'}</small>
    //     </div>
    //   ),
    //   exportFormat: (item) => `In: ${item.in_date || '-'}, Out: ${item.out_date || '-'}`
    // }
  ];

  // Prepare filter info for export
  const getFilterInfo = () => {
    const info = {
      'Filter Type': getFilterTypeLabel(),
      'Date Range': dateRange || 'All Time'
    };

    if (filterType === 'supplier' && supplierId) {
      const selectedSupplier = suppliers.find(sup => parseInt(sup.supplier_id, 10) === parseInt(supplierId, 10));
      if (selectedSupplier) {
        info['Supplier'] = selectedSupplier.name;
      }
    } else if (filterType === 'in_or_out') {
      info['Stock Status'] = inOrOut === 'in' ? 'In Stock' : 'Out of Stock';
    }

    if (startDate && endDate && dateRange === 'Custom Range') {
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      info['Date Range'] = `${formattedStartDate} to ${formattedEndDate}`;
    }

    return info;
  };

  const getFilterTypeLabel = () => {
    switch (filterType) {
      case 'supplier':
        return 'By Supplier';
      case 'in_or_out':
        return 'By Stock Status';
      default:
        return 'All Items';
    }
  };

  // Custom filter controls for the ReportTable
  const renderFilterControls = () => (
    <div className="d-flex align-items-center gap-2">
      {/* Date Range Dropdown */}
      <div className="dropdown">
        <button
          type="button"
          className="btn btn-outline-primary btn-sm dropdown-toggle"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          <i className="fas fa-calendar me-2"></i>
          {dateRange}
        </button>
        <ul className="dropdown-menu">
          {['All Time', 'Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Current Month', 'Last Month'].map((range) => (
            <li key={range}>
              <a href="javascript:void(0);"
                className="dropdown-item d-flex align-items-center"
                onClick={() => handleDateRangeChange(range)}>
                {range}
              </a>
            </li>
          ))}
          <li><hr className="dropdown-divider" /></li>
          <li>
            <a href="javascript:void(0);"
              className="dropdown-item d-flex align-items-center"
              onClick={() => handleDateRangeChange('Custom Range')}>
              Custom Range
            </a>
          </li>
        </ul>
      </div>

      {/* Filter Type Select */}
      <Form.Select 
        value={filterType}
        onChange={handleFilterTypeChange}
        size="sm"
        style={{ width: '150px' }}
      >
        <option value="all">All Items</option>
        <option value="supplier" disabled={suppliers.length === 0}>By Supplier</option>
        <option value="in_or_out">By Stock Status</option>
      </Form.Select>

      {/* Supplier select - only show when filter type is 'supplier' */}
      {filterType === 'supplier' && (
        <Form.Select
          value={supplierId}
          onChange={(e) => setSupplierId(e.target.value)}
          size="sm"
          style={{ width: '200px' }}
          disabled={loadingSuppliers || suppliers.length === 0}
        >
          <option value="">Select a supplier</option>
          {suppliers.map(supplier => (
            <option key={supplier.supplier_id} value={supplier.supplier_id}>
              {supplier.name}
            </option>
          ))}
        </Form.Select>
      )}

      {/* In/Out status select - only show when filter type is 'in_or_out' */}
      {filterType === 'in_or_out' && (
        <Form.Select
          value={inOrOut}
          onChange={(e) => setInOrOut(e.target.value)}
          size="sm"
          style={{ width: '150px' }}
        >
          <option value="in">In Stock</option>
          <option value="out">Out of Stock</option>
        </Form.Select>
      )}

      {/* Date Picker for Custom Range */}
      {showDatePicker && (
        <div className="d-flex align-items-center gap-2">
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            maxDate={new Date()}
            placeholderText="Start Date"
            className="form-control form-control-sm"
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
            className="form-control form-control-sm"
            dateFormat="dd MMM yyyy"
          />
        </div>
      )}

      {/* Submit Button */}
      <Button 
        variant="primary" 
        size="sm"
        onClick={fetchInventoryReport}
        disabled={loading}
        className="px-4"
      >
        {loading ? (
          <>
            <span 
              className="spinner-border spinner-border-sm me-1" 
              role="status" 
              aria-hidden="true"
            ></span>
            Generating...
          </>
        ) : "Generate Report"}
      </Button>
    </div>
  );

  // Custom breadcrumbs component
  const renderBreadcrumbs = () => (
    <Breadcrumb className="mb-0">
      <Breadcrumb.Item href="/">Dashboard</Breadcrumb.Item>
      <Breadcrumb.Item href="/reports">Reports</Breadcrumb.Item>
      <Breadcrumb.Item active>Inventory Reports</Breadcrumb.Item>
    </Breadcrumb>
  );

  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        <VerticalSidebar />
        <div className="layout-page d-flex flex-column min-vh-100">
          <Header />
          <div className="content-wrapper flex-grow-1">
            <div className="container-fluid flex-grow-1 container-p-y">
              {permissionDenied ? (
                <ForbiddenAccessMessage 
                  title="Permission Denied" 
                  message={error}
                  resourceName="Inventory Reports"
                  onRetry={handleRetry}
                  onBack={() => navigate(-1)}
                />
              ) : error ? (
                <div className="alert alert-danger mb-4" role="alert">
                  {error}
                </div>
              ) : (
                <div style={{ backgroundColor: 'transparent', width: '100%', overflowX: 'auto' }}>
                  <ReportTable
                    data={filteredData}
                    columns={columns}
                    title="Inventory Reports"
                    filterInfo={getFilterInfo()}
                    enableHorizontalScroll={true}
                    onBack={handleGoBack}
                    filterControls={renderFilterControls()}
                    dataFetched={dataFetched}
                    breadcrumbs={renderBreadcrumbs()}
                    onRefresh={fetchInventoryReport}
                  />
                </div>
              )}
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryReports;