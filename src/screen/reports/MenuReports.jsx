import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../../config/apiConfig';
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
  Form
} from 'react-bootstrap';
import VerticalSidebar from '../../components/VerticalSidebar';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { ForbiddenAccessMessage, ReportTable, ReportFilters } from '../../components/common';
import { useNavigate } from 'react-router-dom';

const MenuReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [menuData, setMenuData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [categories, setCategories] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [filterParams, setFilterParams] = useState(null);
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

  const fetchMenuReport = async (params) => {
    try {
      // If filter type is category but no category is selected, don't fetch
      if (filterType === 'category' && !categoryId) {
        setError('Please select a category');
        return;
      }
      
      setLoading(true);
      setError(null);
      setPermissionDenied(false);
      setFilterParams(params); // Store the filter params for potential reuse

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
      if (params.start_date && params.end_date) {
        apiParams.start_date = params.start_date.toISOString().split('T')[0];
        apiParams.end_date = params.end_date.toISOString().split('T')[0];
      } else if (params.date_range && params.date_range !== 'All Time') {
        apiParams.date_range = params.date_range;
      }

      console.log('Fetching menu report with params:', apiParams);
      const response = await api.post(API_PATHS.menuReport, apiParams);
      const data = response.data.detail || [];
      console.log('API response data:', data);
      
      // Add unique id to each record for table component
      const processedData = data.map((item, index) => ({
        ...item,
        id: item.menu_id || `menu-${index}`,
        sr_no: index + 1, // Add serial number
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

  const handleRetry = () => {
    fetchMenuReport({});
  };

  const handleFilterTypeChange = (e) => {
    setFilterType(e.target.value);
    // Reset category selection if not filtering by category
    if (e.target.value !== 'category') {
      setCategoryId('');
    }
  };

  // Define table columns
  const columns = [
    {
      Header: '#',
      accessor: 'sr_no',
      width: '50px',
      Cell: (item) => (
        <span className="text-muted">{item.sr_no}</span>
      )
    },
    {
      Header: 'Menu Name',
      accessor: 'menu_name',
      width: '140px',
      Cell: (item) => (
        <div className="d-flex align-items-center">
          <span className="fw-semibold text-primary">{item.menu_name}</span>
        </div>
      )
    },
    {
      Header: 'Category',
      accessor: 'category_name',
      width: '100px',
      Cell: (item) => (
        <Badge bg="info" pill className="text-white px-2 py-1">
          {item.category_name}
        </Badge>
      ),
      exportFormat: (item) => item.category_name
    },
    {
      Header: 'Description',
      accessor: 'description',
      width: '180px',
      Cell: (item) => (
        <div className="text-truncate" style={{ maxWidth: '180px' }} title={item.description || '-'}>
          {item.description || '-'}
        </div>
      )
    },
    {
      Header: 'Status',
      accessor: 'is_available',
      width: '90px',
      Cell: (item) => (
        <Badge 
          bg={item.is_available ? 'success' : 'danger'} 
          pill
          className="px-2 py-1"
        >
          {item.is_available ? 'Available' : 'Unavailable'}
        </Badge>
      ),
      exportFormat: (item) => item.is_available ? 'Available' : 'Unavailable',
      sortFunction: (a, b, direction) => {
        const aValue = a.is_available ? 1 : 0;
        const bValue = b.is_available ? 1 : 0;
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
    },
    {
      Header: 'Created',
      accessor: 'created_on',
      width: '100px',
      Cell: (item) => (
        <div className="small text-muted">
          {item.created_on || '-'}
        </div>
      )
    },
    {
      Header: 'Updated',
      accessor: 'updated_on',
      width: '100px',
      Cell: (item) => (
        <div className="small text-muted">
          {item.updated_on || '-'}
        </div>
      )
    },
    {
      Header: 'Portions',
      accessor: 'portions',
      width: '240px',
      Cell: (item) => {
        if (!item.portions || item.portions.length === 0) {
          return <span className="text-muted small">No portions</span>;
        }
        
        return (
          <div className="d-flex flex-wrap gap-1">
            {item.portions.map(portion => (
              <div 
                key={portion.portion_id} 
                className="border rounded px-2 py-1 d-flex align-items-center" 
                style={{ 
                  fontSize: '0.8rem',
                  backgroundColor: portion.is_available ? '#f8f9fa' : '#f5f5f5'
                }}
              >
                <div className="d-flex flex-column">
                  <div className="d-flex align-items-center">
                    <span className="fw-medium">{portion.portion_name}</span>
                    <Badge bg="primary" pill className="ms-1" style={{ fontSize: '0.7rem' }}>₹{portion.price}</Badge>
                  </div>
                  <div className="d-flex align-items-center" style={{ fontSize: '0.7rem' }}>
                    <span className={`${portion.is_available ? 'text-success' : 'text-danger'}`}>
                      <i className={`fas fa-circle me-1`} style={{ fontSize: '0.5rem' }}></i>
                      {portion.is_available ? 'Available' : 'Unavailable'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      },
      exportFormat: (item) => {
        if (!item.portions || item.portions.length === 0) return 'No portions';
        return item.portions.map(p => `${p.portion_name} (₹${p.price})`).join(', ');
      }
    }
  ];

  // Prepare filter info for export
  const getFilterInfo = () => {
    if (!filterParams) {
      return {
        'Filter Type': filterType === 'category' ? 'By Category' : 'All Items',
        'Date Range': 'All Time'
      };
    }

    const info = {
      'Filter Type': filterType === 'category' ? 'By Category' : 'All Items',
      'Date Range': filterParams.date_range || 'All Time'
    };

    if (filterType === 'category' && categoryId) {
      const selectedCategory = categories.find(cat => parseInt(cat.category_id, 10) === parseInt(categoryId, 10));
      if (selectedCategory) {
        info['Category'] = selectedCategory.category_name;
      }
    }

    return info;
  };

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
                <Card>
                  <CardHeader className="bg-white">
                    <CardTitle className="text-center w-100 mb-0 fw-bold text-primary">Menu Reports</CardTitle>
                  </CardHeader>

                  <CardBody>
                    {/* Filters Section */}
                    <ReportFilters
                      isLoading={loading}
                      onSubmit={fetchMenuReport}
                      defaultDateRange="All Time"
                    >
                      {/* Custom Menu Report Filters */}
                      <Form.Select 
                        value={filterType}
                        onChange={handleFilterTypeChange}
                        style={{ width: '200px' }}
                      >
                        <option value="all">All Items</option>
                        <option value="category" disabled={categories.length === 0}>By Category</option>
                      </Form.Select>

                      {filterType === 'category' && (
                        <Form.Select
                          value={categoryId}
                          onChange={(e) => setCategoryId(e.target.value)}
                          style={{ width: '200px' }}
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
                    </ReportFilters>

                    {/* Table Section */}
                    {dataFetched && filteredData.length > 0 ? (
                      <ReportTable
                        data={filteredData}
                        columns={columns}
                        title="Menu Report"
                        filterInfo={getFilterInfo()}
                        enableHorizontalScroll={true}
                      />
                    ) : dataFetched && filteredData.length === 0 ? (
                      <div className="alert alert-info mt-4">
                        <i className="fas fa-info-circle me-2"></i>
                        No menu items found for the selected filters. Please try different filter criteria.
                      </div>
                    ) : null}
                  </CardBody>
                </Card>
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