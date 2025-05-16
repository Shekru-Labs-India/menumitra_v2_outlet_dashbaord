import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../../config/apiConfig';
import VerticalSidebar from '../../components/VerticalSidebar';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { ForbiddenAccessMessage } from '../../components/common';
import { useNavigate } from 'react-router-dom';

function InventoryReports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [supplierId, setSupplierId] = useState('');
  const [inOrOut, setInOrOut] = useState('in');
  const [expandedRows, setExpandedRows] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchInventoryReport();
  }, [filterType, supplierId, inOrOut]);

  const toggleRow = (inventoryId) => {
    setExpandedRows(prev => ({
      ...prev,
      [inventoryId]: !prev[inventoryId]
    }));
  };

  const fetchInventoryReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setPermissionDenied(false);

      const params = {
        outlet_id: localStorage.getItem('outlet_id'),
        user_id: localStorage.getItem('user_id'),
        filter_type: filterType
      };

      if (filterType === 'supplier' && supplierId) {
        params.supplier_id = supplierId;
      } else if (filterType === 'in_or_out') {
        params.in_or_out = inOrOut;
      }

      console.log('Debug - Making API call to:', API_PATHS.inventoryReport);
      console.log('Debug - With params:', params);

      const response = await api.post(API_PATHS.inventoryReport, params);
      console.log('Debug - API Response:', response.data);
      
      if (response.data && response.data.detail) {
        setInventoryData(response.data.detail);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      console.error('Error fetching inventory report:', err);
      
      if (err.response?.status === 403 || 
          err.response?.data?.detail?.includes('permission') ||
          err.response?.data?.detail?.includes('access')) {
        setPermissionDenied(true);
        setError(err.response?.data?.detail || 'You don\'t have permission to access reports management functionality');
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

  const handleRetry = () => {
    fetchInventoryReport();
  };

  if (permissionDenied) {
    return (
      <div className="layout-wrapper layout-content-navbar">
        <div className="layout-container">
          <VerticalSidebar />
          <div className="layout-page">
            <Header />
            <div className="content-wrapper">
              <ForbiddenAccessMessage 
                title="Permission Denied" 
                message={error}
                resourceName="Inventory Reports"
                onRetry={handleRetry}
                onBack={() => navigate(-1)}
              />
            </div>
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        <VerticalSidebar />
        <div className="layout-page">
          <Header />
          <div className="content-wrapper">
            <div className="container-xxl flex-grow-1 container-p-y">
              <div className="row">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">Inventory Reports</h5>
                      <div className="d-flex gap-2">
                        <select 
                          className="form-select"
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value)}
                        >
                          <option value="all">All Items</option>
                          <option value="supplier">By Supplier</option>
                          <option value="in_or_out">In/Out Status</option>
                        </select>

                        {filterType === 'supplier' && (
                          <input
                            type="number"
                            className="form-control"
                            placeholder="Supplier ID"
                            value={supplierId}
                            onChange={(e) => setSupplierId(e.target.value)}
                          />
                        )}

                        {filterType === 'in_or_out' && (
                          <select 
                            className="form-select"
                            value={inOrOut}
                            onChange={(e) => setInOrOut(e.target.value)}
                          >
                            <option value="in">In Stock</option>
                            <option value="out">Out of Stock</option>
                          </select>
                        )}

                        <button 
                          className="btn btn-primary"
                          onClick={handleRetry}
                          disabled={loading}
                        >
                          {loading ? (
                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                          ) : (
                            <i className="fas fa-sync-alt me-1"></i>
                          )}
                          Refresh
                        </button>
                      </div>
                    </div>
                    <div className="card-body">
                      {loading ? (
                        <div className="text-center py-5">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        </div>
                      ) : error ? (
                        <div className="alert alert-danger" role="alert">
                          {error}
                        </div>
                      ) : inventoryData && (
                        <>
                          <div className="row mb-4">
                            <div className="col-md-4">
                              <div className="card bg-primary text-white">
                                <div className="card-body">
                                  <h6 className="card-title">Total Items</h6>
                                  <h3 className="mb-0">{inventoryData.inventory_report.total_items}</h3>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="card bg-success text-white">
                                <div className="card-body">
                                  <h6 className="card-title">Total Inventory Value</h6>
                                  <h3 className="mb-0">₹{inventoryData.inventory_report.total_inventory_value.toFixed(2)}</h3>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-4">
                              <div className="card bg-warning text-white">
                                <div className="card-body">
                                  <h6 className="card-title">Items Below Reorder Level</h6>
                                  <h3 className="mb-0">{inventoryData.inventory_report.items_below_reorder_level}</h3>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="row mb-4">
                            <div className="col-md-6">
                              <div className="card">
                                <div className="card-header">
                                  <h5 className="card-title mb-0">Category Breakdown</h5>
                                </div>
                                <div className="card-body">
                                  <div className="table-responsive">
                                    <table className="table table-bordered">
                                      <thead>
                                        <tr>
                                          <th>Category</th>
                                          <th>Count</th>
                                          <th>Total Value</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {Object.entries(inventoryData.inventory_report.category_breakdown).map(([category, data]) => (
                                          <tr key={category}>
                                            <td>{category}</td>
                                            <td>{data.count}</td>
                                            <td>₹{data.total_value.toFixed(2)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="card">
                            <div className="card-header">
                              <h5 className="card-title mb-0">Inventory Details</h5>
                            </div>
                            <div className="card-body">
                              <div className="table-responsive">
                                <table className="table table-hover">
                                  <thead>
                                    <tr>
                                      <th style={{ width: '5%' }}></th>
                                      <th style={{ width: '20%' }}>Item Details</th>
                                      <th style={{ width: '15%' }}>Category</th>
                                      <th style={{ width: '15%' }}>Supplier</th>
                                      <th style={{ width: '10%' }}>Price</th>
                                      <th style={{ width: '10%' }}>Quantity</th>
                                      <th style={{ width: '10%' }}>Status</th>
                                      <th style={{ width: '15%' }}>Dates</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {inventoryData.inventory_items.map((item) => (
                                      <React.Fragment key={item.inventory_id}>
                                        <tr 
                                          className="cursor-pointer"
                                          onClick={() => toggleRow(item.inventory_id)}
                                          style={{ cursor: 'pointer' }}
                                        >
                                          <td>
                                            <i className={`fas fa-chevron-${expandedRows[item.inventory_id] ? 'down' : 'right'} transition-all`}></i>
                                          </td>
                                          <td>
                                            <div className="d-flex flex-column">
                                              <span className="fw-semibold">{item.name}</span>
                                              <small className="text-muted">{item.description}</small>
                                            </div>
                                          </td>
                                          <td>{item.category}</td>
                                          <td>
                                            <div className="d-flex flex-column">
                                              <span>{item.supplier.name}</span>
                                             
                                            </div>
                                          </td>
                                          <td>₹{item.unit_price.toFixed(2)}</td>
                                          <td>
                                            <div className="d-flex flex-column">
                                              <span>{item.quantity}</span>
                                              <small className="text-muted">{item.unit_of_measure}</small>
                                            </div>
                                          </td>
                                          <td>
                                            <span className={`badge bg-${item.in_or_out === 'in' ? 'success' : 'danger'}`}>
                                              {item.in_or_out === 'in' ? 'In Stock' : 'Out of Stock'}
                                            </span>
                                          </td>
                                          <td>
                                            <div>In: {item.in_date || '-'}</div>
                                            <div>Out: {item.out_date || '-'}</div>
                                          </td>
                                        </tr>
                                        <tr>
                                          <td colSpan="8" className="p-0">
                                            <div 
                                              className={`collapse ${expandedRows[item.inventory_id] ? 'show' : ''}`}
                                              style={{
                                                transition: 'all 0.3s ease-in-out',
                                                maxHeight: expandedRows[item.inventory_id] ? '500px' : '0',
                                                overflow: 'hidden'
                                              }}
                                            >
                                              <div className="p-3 bg-light">
                                                <div className="row">
                                                  <div className="col-md-6">
                                                    <h6 className="mb-3">Item Information</h6>
                                                    <div className="card">
                                                      <div className="card-body">
                                                        <div className="d-flex justify-content-between mb-2">
                                                          <span>Brand:</span>
                                                          <span className="fw-semibold">{item.brand_name}</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between mb-2">
                                                          <span>Reorder Level:</span>
                                                          <span className="fw-semibold">{item.reorder_level}</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between mb-2">
                                                          <span>Tax Rate:</span>
                                                          <span className="fw-semibold">{(item.tax_rate * 100).toFixed(0)}%</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between mb-2">
                                                          <span>Expiration:</span>
                                                          <span className="fw-semibold">{item.expiration_date}</span>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <div className="col-md-6">
                                                    <h6 className="mb-3">Additional Details</h6>
                                                    <div className="card">
                                                      <div className="card-body">
                                                        <div className="d-flex justify-content-between mb-2">
                                                          <span>Created On:</span>
                                                          <span>{item.created_on}</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between mb-2">
                                                          <span>Updated On:</span>
                                                          <span>{item.updated_on || '-'}</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between mb-2">
                                                          <span>Entry By:</span>
                                                          <span>{item.entry_by || '-'}</span>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      </React.Fragment>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default InventoryReports; 