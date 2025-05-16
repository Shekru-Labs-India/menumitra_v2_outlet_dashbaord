import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../../config/apiConfig';
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Table,
  Badge,
  Spinner,
  Form,
  Row,
  Col,
  Button
} from 'react-bootstrap';
import VerticalSidebar from '../../components/VerticalSidebar';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { ForbiddenAccessMessage } from '../../components/common';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const MenuReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuData, setMenuData] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [dateRange, setDateRange] = useState('All Time');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchMenuReport();
  }, [filterType, selectedCategory, dateRange, startDate, endDate]);

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await api.post(API_PATHS.menuCategoryList, {
        outlet_id: localStorage.getItem('outlet_id'),
        user_id: localStorage.getItem('user_id')
      });
      
      // Filter out null categories and inactive ones
      const validCategories = response.data.data.menucat_details.filter(
        cat => cat.menu_cat_id && cat.is_active
      );
      setCategories(validCategories);
      
      // If we have categories and filter type is category but no category selected,
      // automatically select the first category
      if (validCategories.length > 0 && filterType === 'category' && !selectedCategory) {
        setSelectedCategory(validCategories[0].menu_cat_id.toString());
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to fetch categories');
    } finally {
      setLoadingCategories(false);
    }
  };

  const toggleRow = (menuId) => {
    setExpandedRows(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const fetchMenuReport = async () => {
    try {
      // If filter type is category but no category is selected, don't fetch
      if (filterType === 'category' && !selectedCategory) {
        // If we have categories, select the first one
        if (categories.length > 0) {
          setSelectedCategory(categories[0].menu_cat_id.toString());
          return; // Return early, we'll fetch when selectedCategory changes
        } else if (!loadingCategories) {
          // If no categories available and not currently loading, switch to 'all' filter
          setFilterType('all');
          return; // Return early, we'll fetch when filterType changes
        } else {
          // If still loading categories, don't fetch yet
          return;
        }
      }
      
      setLoading(true);
      setError(null);
      setPermissionDenied(false);

      const params = {
        filter_type: filterType,
        outlet_id: localStorage.getItem('outlet_id'),
        user_id: localStorage.getItem('user_id')
      };

      if (filterType === 'category') {
        params.category_id = selectedCategory;
      }

      const response = await api.post(API_PATHS.menuReport, params);
      setMenuData(response.data.detail || []);
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

  const handleFilterChange = (e) => {
    const newFilterType = e.target.value;
    setFilterType(newFilterType);
    if (newFilterType === 'all') {
      setSelectedCategory('');
    } else if (newFilterType === 'category') {
      // When switching to category filter, select first category if available
      if (!selectedCategory && categories.length > 0) {
        setSelectedCategory(categories[0].menu_cat_id.toString());
      }
    }
  };

  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  const handleRetry = () => {
    fetchMenuReport();
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
                  <CardHeader className="d-flex justify-content-between align-items-center">
                    <CardTitle>Menu Reports</CardTitle>
                    <div className="d-flex align-items-center gap-2">
                      <div className="dropdown">
                        <button
                          type="button"
                          className="btn btn-outline-primary dropdown-toggle"
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                        >
                          <i className="fas fa-calendar me-2"></i>
                          {dateRange}
                        </button>
                        <ul className="dropdown-menu dropdown-menu-end">
                          {['All Time', 'Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Current Month', 'Last Month'].map((range) => (
                            <li key={range}>
                              <a href="javascript:void(0);"
                                className="dropdown-item d-flex align-items-center"
                                onClick={() => setDateRange(range)}>
                                {range}
                              </a>
                            </li>
                          ))}
                          <li><hr className="dropdown-divider" /></li>
                          <li>
                            <a href="javascript:void(0);"
                              className="dropdown-item d-flex align-items-center"
                              onClick={() => setShowDatePicker(true)}>
                              Custom Range
                            </a>
                          </li>
                        </ul>
                      </div>

                      <Form.Select
                        value={filterType}
                        onChange={handleFilterChange}
                        style={{ width: '200px' }}
                      >
                        <option value="all">All Items</option>
                        <option value="category" disabled={categories.length === 0}>By Category</option>
                      </Form.Select>

                      {filterType === 'category' && (
                        <Form.Select
                          value={selectedCategory}
                          onChange={handleCategoryChange}
                          style={{ width: '200px' }}
                          disabled={loadingCategories || categories.length === 0}
                        >
                          {loadingCategories ? (
                            <option>Loading categories...</option>
                          ) : categories.length === 0 ? (
                            <option>No categories available</option>
                          ) : (
                            <>
                              {categories.map((category) => (
                                <option key={category.menu_cat_id} value={category.menu_cat_id}>
                                  {category.category_name}
                                </option>
                              ))}
                            </>
                          )}
                        </Form.Select>
                      )}

                      <button
                        type="button"
                        className={`btn btn-icon p-0 ${loading ? 'disabled' : ''}`}
                        onClick={handleRetry}
                        disabled={loading}
                        style={{ border: '1px solid var(--bs-primary)' }}
                      >
                        <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                      </button>
                    </div>
                  </CardHeader>

                  {showDatePicker && (
                    <CardBody>
                      <div className="d-flex flex-column gap-2">
                        <label>Select Date Range:</label>
                        <div className="d-flex gap-2">
                          <DatePicker
                            selected={startDate}
                            onChange={(date) => setStartDate(date)}
                            selectsStart
                            startDate={startDate}
                            endDate={endDate}
                            maxDate={new Date()}
                            placeholderText="DD MMM YYYY"
                            className="form-control"
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
                            placeholderText="DD MMM YYYY"
                            className="form-control"
                            dateFormat="dd MMM yyyy"
                          />
                        </div>
                        <button 
                          className="btn btn-primary mt-2" 
                          onClick={() => setShowDatePicker(false)} 
                          disabled={!startDate || !endDate}
                        >
                          Apply
                        </button>
                      </div>
                    </CardBody>
                  )}

                  <CardBody>
                    {loading ? (
                      <div className="text-center py-5">
                        <Spinner animation="border" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </Spinner>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <Table className="table-hover">
                          <thead>
                            <tr>
                              <th style={{ width: '5%' }}></th>
                              <th style={{ width: '20%' }}>Menu Details</th>
                              <th style={{ width: '15%' }}>Category</th>
                              <th style={{ width: '25%' }}>Description</th>
                              <th style={{ width: '10%' }}>Status</th>
                              <th style={{ width: '15%' }}>Dates</th>
                            </tr>
                          </thead>
                          <tbody>
                            {menuData.map((menu) => (
                              <React.Fragment key={menu.menu_id}>
                                <tr 
                                  className="cursor-pointer"
                                  onClick={() => toggleRow(menu.menu_id)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <td>
                                    <i className={`fas fa-chevron-${expandedRows[menu.menu_id] ? 'down' : 'right'} transition-all`}></i>
                                  </td>
                                  <td>
                                    <div className="d-flex flex-column">
                                      <span className="fw-semibold">{menu.menu_name}</span>
                                     
                                    </div>
                                  </td>
                                  <td>
                                    <Badge bg="info" className="text-white">
                                      {menu.category_name}
                                    </Badge>
                                  </td>
                                  <td>
                                    <p className="mb-0 text-wrap" style={{ maxWidth: '300px' }}>
                                      {menu.description}
                                    </p>
                                  </td>
                                  <td>
                                    <Badge bg={menu.is_available ? 'success' : 'danger'}>
                                      {menu.is_available ? 'Available' : 'Unavailable'}
                                    </Badge>
                                  </td>
                                  <td>
                                    <div className="d-flex flex-column">
                                      <small className="text-muted">Created: {menu.created_on}</small>
                                      <small className="text-muted">Updated: {menu.updated_on || '-'}</small>
                                    </div>
                                  </td>
                                </tr>
                                <tr>
                                  <td colSpan="6" className="p-0">
                                    <div 
                                      className={`collapse ${expandedRows[menu.menu_id] ? 'show' : ''}`}
                                      style={{
                                        transition: 'all 0.3s ease-in-out',
                                        maxHeight: expandedRows[menu.menu_id] ? '500px' : '0',
                                        overflow: 'hidden'
                                      }}
                                    >
                                      <div className="p-3 bg-light">
                                        <h6 className="mb-3">Portions</h6>
                                        <div className="row g-3">
                                          {menu.portions.map((portion) => (
                                            <div key={portion.portion_id} className="col-md-4">
                                              <div className="card h-100">
                                                <div className="card-body">
                                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <h6 className="card-title mb-0">{portion.portion_name}</h6>
                                                    <Badge bg="primary">₹{portion.price}</Badge>
                                                  </div>
                                                  <div className="d-flex justify-content-between align-items-center">
                                                    <small className="text-muted">Created: {portion.created_on}</small>
                                                    <Badge bg={portion.is_available ? 'success' : 'danger'}>
                                                      {portion.is_available ? 'Available' : 'Unavailable'}
                                                    </Badge>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              </React.Fragment>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    )}
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