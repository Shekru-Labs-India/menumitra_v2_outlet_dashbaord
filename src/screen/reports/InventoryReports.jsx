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
  const navigate = useNavigate();

  useEffect(() => {
    fetchInventoryReport();
  }, [filterType, supplierId, inOrOut]);

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
                            <div className="col-md-3">
                              <div className="card bg-primary text-white">
                                <div className="card-body">
                                  <h6 className="card-title">Total Items</h6>
                                  <h3 className="mb-0">{inventoryData.inventory_report.total_items}</h3>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
                              <div className="card bg-success text-white">
                                <div className="card-body">
                                  <h6 className="card-title">Total Inventory Value</h6>
                                  <h3 className="mb-0">₹{inventoryData.inventory_report.total_inventory_value.toFixed(2)}</h3>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-3">
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
                                <table className="table table-bordered">
                                  <thead>
                                    <tr>
                                      <th>Name</th>
                                      <th>Category</th>
                                      <th>Supplier</th>
                                      <th>Unit Price</th>
                                      <th>Quantity</th>
                                      <th>Unit</th>
                                      <th>Reorder Level</th>
                                      <th>Expiration</th>
                                      <th>Brand</th>
                                      <th>Status</th>
                                      <th>Dates</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {inventoryData.inventory_items.map((item) => (
                                      <tr key={item.inventory_id}>
                                        <td>
                                          <div>{item.name}</div>
                                          <small className="text-muted">{item.description}</small>
                                        </td>
                                        <td>{item.category}</td>
                                        <td>
                                          <div>{item.supplier.name}</div>
                                          <small className="text-muted">ID: {item.supplier.id}</small>
                                        </td>
                                        <td>₹{item.unit_price.toFixed(2)}</td>
                                        <td>{item.quantity}</td>
                                        <td>{item.unit_of_measure}</td>
                                        <td>{item.reorder_level}</td>
                                        <td>{item.expiration_date}</td>
                                        <td>{item.brand_name}</td>
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