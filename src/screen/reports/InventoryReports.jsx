import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../../config/apiConfig';
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
  Spinner,
  Form
} from 'react-bootstrap';
import VerticalSidebar from '../../components/VerticalSidebar';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { ForbiddenAccessMessage, ReportTable, ReportFilters } from '../../components/common';
import { useNavigate } from 'react-router-dom';

const InventoryReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inventoryData, setInventoryData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [filterParams, setFilterParams] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [supplierId, setSupplierId] = useState('');
  const [inOrOut, setInOrOut] = useState('in');
  
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

  const fetchInventoryReport = async (params) => {
    try {
      // If filter type is supplier but no supplier is selected, don't fetch
      if (filterType === 'supplier' && !supplierId) {
        setError('Please select a supplier');
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

      if (filterType === 'supplier' && supplierId) {
        apiParams.supplier_id = parseInt(supplierId, 10);
      } else if (filterType === 'in_or_out') {
        apiParams.in_or_out = inOrOut;
      }

      // Add date range parameters if applicable
      if (params.start_date && params.end_date) {
        apiParams.start_date = params.start_date.toISOString().split('T')[0];
        apiParams.end_date = params.end_date.toISOString().split('T')[0];
      } else if (params.date_range && params.date_range !== 'All Time') {
        apiParams.date_range = params.date_range;
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

  const handleRetry = () => {
    fetchInventoryReport({});
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

  // Define table columns
  const columns = [
    {
      Header: 'Item Details',
      accessor: 'name',
      width: '20%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          <span className="fw-semibold text-primary">{item.name}</span>
          <small className="text-muted">{item.description || '-'}</small>
        </div>
      )
    },
    {
      Header: 'Category',
      accessor: 'category',
      width: '15%',
      Cell: (item) => (
        <Badge bg="info" className="text-white">
          {item.category}
        </Badge>
      ),
      exportFormat: (item) => item.category
    },
    {
      Header: 'Supplier',
      accessor: 'supplier',
      width: '15%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          <span>{item.supplier?.name || '-'}</span>
        </div>
      ),
      exportFormat: (item) => item.supplier?.name || '-'
    },
    {
      Header: 'Price',
      accessor: 'unit_price',
      width: '10%',
      Cell: (item) => (
        <span className="fw-bold">₹{item.unit_price?.toFixed(2) || '0.00'}</span>
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
      width: '10%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          <span>{item.quantity}</span>
          <small className="text-muted">{item.unit_of_measure}</small>
        </div>
      ),
      exportFormat: (item) => `${item.quantity} ${item.unit_of_measure || ''}`
    },
    {
      Header: 'Status',
      accessor: 'in_or_out',
      width: '10%',
      Cell: (item) => (
        <Badge 
          bg={item.in_or_out === 'in' ? 'success' : 'danger'} 
          className="px-3 py-2"
        >
          {item.in_or_out === 'in' ? 'In Stock' : 'Out of Stock'}
        </Badge>
      ),
      exportFormat: (item) => item.in_or_out === 'in' ? 'In Stock' : 'Out of Stock',
      sortFunction: (a, b, direction) => {
        const aValue = a.in_or_out === 'in' ? 1 : 0;
        const bValue = b.in_or_out === 'in' ? 1 : 0;
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
    },
    {
      Header: 'Dates',
      accessor: 'created_on',
      width: '15%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          <small className="text-muted"><strong>In:</strong> {item.in_date || '-'}</small>
          <small className="text-muted"><strong>Out:</strong> {item.out_date || '-'}</small>
        </div>
      ),
      exportFormat: (item) => `In: ${item.in_date || '-'}, Out: ${item.out_date || '-'}`
    }
  ];

  // Define expandable content for additional inventory details
  const renderInventoryDetails = (item) => (
    <>
      <h6 className="mb-3 text-primary">
        <i className="fas fa-boxes me-2"></i>
        Item Information
      </h6>
      <div className="row">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Brand:</span>
                <span>{item.brand_name || '-'}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Reorder Level:</span>
                <span>{item.reorder_level || '-'}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Tax Rate:</span>
                <span>{item.tax_rate ? `${(item.tax_rate * 100).toFixed(0)}%` : '-'}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold">Expiration:</span>
                <span>{item.expiration_date || '-'}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Created On:</span>
                <span>{item.created_on || '-'}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Updated On:</span>
                <span>{item.updated_on || '-'}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold">Entry By:</span>
                <span>{item.entry_by || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  // Prepare filter info for export
  const getFilterInfo = () => {
    if (!filterParams) {
      return {
        'Filter Type': getFilterTypeLabel(),
        'Date Range': 'All Time'
      };
    }

    const info = {
      'Filter Type': getFilterTypeLabel(),
      'Date Range': filterParams.date_range || 'All Time'
    };

    if (filterType === 'supplier' && supplierId) {
      const selectedSupplier = suppliers.find(sup => parseInt(sup.supplier_id, 10) === parseInt(supplierId, 10));
      if (selectedSupplier) {
        info['Supplier'] = selectedSupplier.name;
      }
    } else if (filterType === 'in_or_out') {
      info['Stock Status'] = inOrOut === 'in' ? 'In Stock' : 'Out of Stock';
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
                <Card>
                  <CardHeader className="bg-white">
                    <CardTitle className="text-center w-100 mb-0 fw-bold text-primary">Inventory Reports</CardTitle>
                  </CardHeader>

                  <CardBody>
                    {/* Filters Section */}
                    <ReportFilters
                      isLoading={loading}
                      onSubmit={fetchInventoryReport}
                      defaultDateRange="All Time"
                    >
                      {/* Custom Inventory Report Filters */}
                      <Form.Select 
                        value={filterType}
                        onChange={handleFilterTypeChange}
                        style={{ width: '200px' }}
                      >
                        <option value="all">All Items</option>
                        <option value="supplier" disabled={suppliers.length === 0}>By Supplier</option>
                        <option value="in_or_out">By Stock Status</option>
                      </Form.Select>

                      {filterType === 'supplier' && (
                        <Form.Select
                          value={supplierId}
                          onChange={(e) => setSupplierId(e.target.value)}
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

                      {filterType === 'in_or_out' && (
                        <Form.Select
                          value={inOrOut}
                          onChange={(e) => setInOrOut(e.target.value)}
                          style={{ width: '200px' }}
                        >
                          <option value="in">In Stock</option>
                          <option value="out">Out of Stock</option>
                        </Form.Select>
                      )}
                    </ReportFilters>

                    {/* Table Section */}
                    {dataFetched && filteredData.length > 0 ? (
                      <ReportTable
                        data={filteredData}
                        columns={columns}
                        title="Inventory Report"
                        expandableContent={renderInventoryDetails}
                        filterInfo={getFilterInfo()}
                      />
                    ) : dataFetched && filteredData.length === 0 ? (
                      <div className="alert alert-info mt-4">
                        <i className="fas fa-info-circle me-2"></i>
                        No inventory items found for the selected filters. Please try different filter criteria.
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

export default InventoryReports; 