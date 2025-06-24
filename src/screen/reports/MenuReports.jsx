import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../../config/apiConfig';
import {
  Form,
  Button,
  Dropdown,
  Breadcrumb
} from 'react-bootstrap';
import VerticalSidebar from '../../components/VerticalSidebar';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { ForbiddenAccessMessage, ReportTable } from '../../components/common';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const MenuReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [menuData, setMenuData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  
  // Filter states
  const [dateRange, setDateRange] = useState('All Time');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [categoryId, setCategoryId] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  // Update filtered data when filter type or category changes
  useEffect(() => {
    if (menuData.length > 0) {
      applyFilters();
    }
  }, [filterType, categoryId, menuData]);

  const applyFilters = () => {
    let result = [...menuData];
    
    // Apply filter by category if applicable
    if (filterType === 'category' && categoryId) {
      const categoryIdNum = parseInt(categoryId, 10);
      console.log('Filtering by category_id:', categoryIdNum);
      console.log('Sample data item:', result[0]);
      
      result = result.filter(item => {
        const itemCategoryId = parseInt(item.category_id, 10);
        return itemCategoryId === categoryIdNum;
      });
      
      console.log('Filtered results count:', result.length);
    }
    
    setFilteredData(result);
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      // Using the new reportFilterCategory endpoint with GET request
      const response = await api.get(API_PATHS.reportFilterCategory);
      
      // The API returns an array of categories directly in the detail field
      const validCategories = response.data.detail || [];
      console.log('Fetched categories:', validCategories);
      setCategories(validCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to fetch categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  // Handle date range selection
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setShowDatePicker(range === 'Custom Range');
  };

  const fetchMenuReport = () => {
    const fetchData = async () => {
      try {
        // If filter type is category but no category is selected, don't fetch
        if (filterType === 'category' && !categoryId) {
          setError('Please select a category');
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

        if (filterType === 'category' && categoryId) {
          apiParams.category_id = parseInt(categoryId, 10);
        }

        // Add date range parameters if applicable
        if (startDate && endDate && dateRange === 'Custom Range') {
          apiParams.start_date = startDate.toISOString().split('T')[0];
          apiParams.end_date = endDate.toISOString().split('T')[0];
        } else if (dateRange !== 'All Time') {
          apiParams.date_range = dateRange;
        }

        console.log('Fetching menu report with params:', apiParams);
        const response = await api.post(API_PATHS.menuReport, apiParams);
        const data = response.data.detail || [];
        console.log('API response data:', data);
        
        // Add unique id to each record for table component
        const processedData = data.map((item, index) => ({
          ...item,
          id: item.menu_id || `menu-${index}`,
          // Add formatted portion information
          portion_details: item.portions && item.portions.length > 0 
            ? item.portions.map(p => `${p.portion_name} (₹${p.price})`).join(', ')
            : 'No portions'
        }));
        
        setMenuData(processedData);
        setFilteredData(processedData);
        setDataFetched(true);
      } catch (err) {
        console.error('Error fetching menu report:', err);
        
        if (err.response?.status === 403 || 
            err.response?.data?.detail?.includes('permission') ||
            err.response?.data?.detail?.includes('access')) {
          setPermissionDenied(true);
          setError(err.response?.data?.detail || 'You don\'t have permission to access reports management functionality');
        } else {
          setError(err.response?.data?.detail || 'Failed to fetch menu report data');
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
    fetchMenuReport();
  };

  const handleFilterTypeChange = (e) => {
    setFilterType(e.target.value);
    // Reset category selection if not filtering by category
    if (e.target.value !== 'category') {
      setCategoryId('');
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  // Define table columns with fixed widths to ensure proper display
  const columns = [
    {
      Header: 'Menu Name',
      accessor: 'menu_name',
      width: '250px',
      Cell: (item) => (
        <div className="text-nowrap">
          <span className="fw-semibold">{item.menu_name}</span>
        </div>
      ),
      headerClassName: 'text-nowrap'
    },
    {
      Header: 'Category',
      accessor: 'category_name',
      width: '200px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.category_name}
        </div>
      ),
      exportFormat: (item) => item.category_name,
      headerClassName: 'text-nowrap'
    },
    {
      Header: 'Description',
      accessor: 'description',
      width: '300px',
      Cell: (item) => (
        <div className="text-wrap" style={{ maxWidth: '300px' }}>
          {item.description || '-'}
        </div>
      ),
      headerClassName: 'text-nowrap'
    },
    {
      Header: 'Status',
      accessor: 'is_available',
      width: '150px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.is_available ? 'Available' : 'Unavailable'}
        </div>
      ),
      exportFormat: (item) => item.is_available ? 'Available' : 'Unavailable',
      sortFunction: (a, b, direction) => {
        const aValue = a.is_available ? 1 : 0;
        const bValue = b.is_available ? 1 : 0;
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      },
      headerClassName: 'text-nowrap'
    },
    {
      Header: 'Portions',
      accessor: 'portions',
      width: '450px',
      Cell: (item) => {
        if (!item.portions || item.portions.length === 0) {
          return <span className="text-nowrap">No portions</span>;
        }
        
        return (
          <div className="text-wrap" style={{ maxWidth: '450px' }}>
            {item.portions.map((portion, index) => (
              <span key={portion.portion_id}>
                {portion.portion_name}: ₹{portion.price}
                {portion.is_available ? ' (Available)' : ' (Unavailable)'}
                {index < item.portions.length - 1 ? ' | ' : ''}
              </span>
            ))}
          </div>
        );
      },
      exportFormat: (item) => {
        if (!item.portions || item.portions.length === 0) return 'No portions';
        return item.portions.map(p => `${p.portion_name} (₹${p.price})`).join(', ');
      },
      headerClassName: 'text-nowrap'
    }
  ];

  // Prepare filter info for export
  const getFilterInfo = () => {
    const info = {
      'Filter Type': filterType === 'category' ? 'By Category' : 'All Items',
      'Date Range': dateRange || 'All Time'
    };

    if (filterType === 'category' && categoryId) {
      const selectedCategory = categories.find(cat => parseInt(cat.category_id, 10) === parseInt(categoryId, 10));
      if (selectedCategory) {
        info['Category'] = selectedCategory.category_name;
      }
    }

    return info;
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

      {/* Custom Filter Elements */}
      <Form.Select 
        value={filterType}
        onChange={handleFilterTypeChange}
        size="sm"
        style={{ width: '150px' }}
      >
        <option value="all">All Items</option>
        <option value="category" disabled={categories.length === 0}>By Category</option>
      </Form.Select>

      {filterType === 'category' && (
        <Form.Select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          size="sm"
          style={{ width: '150px' }}
          disabled={loadingCategories || categories.length === 0}
        >
          <option value="">Select a category</option>
          {categories.map(category => (
            <option key={category.category_id} value={category.category_id}>
              {category.category_name}
            </option>
          ))}
        </Form.Select>
      )}

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
        onClick={fetchMenuReport}
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
            Loading...
          </>
        ) : "Submit"}
      </Button>
    </div>
  );

  // Custom breadcrumbs component
  const renderBreadcrumbs = () => (
    <Breadcrumb className="mb-0">
      <Breadcrumb.Item href="/">Dashboard</Breadcrumb.Item>
      <Breadcrumb.Item href="/reports">Reports</Breadcrumb.Item>
      <Breadcrumb.Item active>Menu Reports</Breadcrumb.Item>
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
                  resourceName="Menu Reports"
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
                    title="Menu Reports"
                    filterInfo={getFilterInfo()}
                    enableHorizontalScroll={true}
                    onBack={handleGoBack}
                    filterControls={renderFilterControls()}
                    dataFetched={dataFetched}
                    breadcrumbs={renderBreadcrumbs()}
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

export default MenuReports; 