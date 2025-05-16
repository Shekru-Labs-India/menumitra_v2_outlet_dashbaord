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

const MenuReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuData, setMenuData] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMenuReport();
  }, [filterType, selectedCategory]);

  const fetchMenuReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setPermissionDenied(false);

      const params = {
        filter_type: filterType,
        outlet_id: localStorage.getItem('outlet_id'),
        user_id: localStorage.getItem('user_id')
      };

      if (filterType === 'category' && selectedCategory) {
        params.category_id = selectedCategory;
      }

      const response = await api.post(API_PATHS.menuReport, params);
      setMenuData(response.data.detail || []);
    } catch (err) {
      console.error('Error fetching menu report:', err);
      
      // Check for permission denied error
      if (err.response?.status === 403 || 
          err.response?.data?.detail?.includes('permission') ||
          err.response?.data?.detail?.includes('access')) {
        setPermissionDenied(true);
        setError(err.response?.data?.detail || 'You don\'t have permission to access reports management functionality');
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch menu report data');
      }

      // Handle authentication errors
      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilterType(e.target.value);
    if (e.target.value === 'all') {
      setSelectedCategory('');
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
                    <div className="d-flex gap-3">
                      <Form.Select
                        value={filterType}
                        onChange={handleFilterChange}
                        style={{ width: '200px' }}
                      >
                        <option value="all">All Items</option>
                        <option value="category">By Category</option>
                      </Form.Select>
                      {filterType === 'category' && (
                        <Form.Select
                          value={selectedCategory}
                          onChange={handleCategoryChange}
                          style={{ width: '200px' }}
                        >
                          <option value="">Select Category</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </Form.Select>
                      )}
                      <Button
                        variant="outline-primary"
                        onClick={handleRetry}
                        disabled={loading}
                      >
                        <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardBody>
                    {loading ? (
                      <div className="text-center py-5">
                        <Spinner animation="border" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </Spinner>
                      </div>
                    ) : (
                      <Table responsive hover>
                        <thead>
                          <tr>
                            <th>Menu Name</th>
                            <th>Category</th>
                            <th>Description</th>
                            <th>Status</th>
                            <th>Portions</th>
                            <th>Created On</th>
                            <th>Updated On</th>
                          </tr>
                        </thead>
                        <tbody>
                          {menuData.map((menu) => (
                            <tr key={menu.menu_id}>
                              <td>{menu.menu_name}</td>
                              <td>{menu.category_name}</td>
                              <td>{menu.description}</td>
                              <td>
                                <Badge bg={menu.is_available ? 'success' : 'danger'}>
                                  {menu.is_available ? 'Available' : 'Unavailable'}
                                </Badge>
                              </td>
                              <td>
                                <ul className="list-unstyled mb-0">
                                  {menu.portions.map((portion) => (
                                    <li key={portion.portion_id}>
                                      {portion.portion_name} - ₹{portion.price}
                                      <Badge
                                        bg={portion.is_available ? 'success' : 'danger'}
                                        className="ms-2"
                                      >
                                        {portion.is_available ? 'Available' : 'Unavailable'}
                                      </Badge>
                                    </li>
                                  ))}
                                </ul>
                              </td>
                              <td>{menu.created_on}</td>
                              <td>{menu.updated_on || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
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