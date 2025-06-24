import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../../config/apiConfig';
import {
  Form,
  Modal,
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

const OrderReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [orderDetails, setOrderDetails] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  
  // Filter states
  const [dateRange, setDateRange] = useState('All Time');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [orderType, setOrderType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  
  const navigate = useNavigate();

  // Add useEffect to process data when API response is received
  useEffect(() => {
    if (orderData && orderData.orders) {
      // Add unique id to each order for table component
      const processedData = orderData.orders.map((order) => ({
        ...order,
        id: `order-${order.order_id}`
      }));
      
      setOrderDetails(processedData);
      console.log('Order details processed:', processedData);
    }
  }, [orderData]);

  // Handle date range selection
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setShowDatePicker(range === 'Custom Range');
  };

  const fetchOrderReport = () => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setPermissionDenied(false);
  
        // Prepare API parameters with correct filter_type
        const apiParams = {
          outlet_id: localStorage.getItem('outlet_id'),
          user_id: localStorage.getItem('user_id'),
          filter_type: 'all'  // Default filter type
        };
  
        // Handle date range parameters
        if (startDate && endDate && dateRange === 'Custom Range') {
          apiParams.filter_type = 'date_range';
          apiParams.start_date = startDate.toISOString().split('T')[0];
          apiParams.end_date = endDate.toISOString().split('T')[0];
        } else if (dateRange !== 'All Time') {
          apiParams.filter_type = 'date_range';
          apiParams.date_range = dateRange;
        }
  
        // Add order type if specified
        if (orderType && orderType !== 'all') {
          apiParams.order_type = orderType;
        }
  
        console.log('Fetching order report with params:', apiParams);
        
        // Make the actual API call
        const response = await api.post(API_PATHS.orderReport, apiParams);
        
        if (response.data && response.data.detail) {
          // Process the data directly here instead of relying on the useEffect
          const responseData = response.data.detail;
          setOrderData(responseData);
          
          // Add unique id to each order for table component
          if (responseData.orders && Array.isArray(responseData.orders)) {
            const processedData = responseData.orders.map((order) => ({
              ...order,
              id: `order-${order.order_id}`
            }));
            
            setOrderDetails(processedData);
            console.log('Order details processed directly in fetch:', processedData.length);
          }
          
          // Set dataFetched flag after all state updates
          setDataFetched(true);
          console.log('Data fetched successfully:', response.data.detail);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching order report:', err);
        
        if (err.response?.status === 403 || 
            err.response?.data?.detail?.includes('permission') ||
            err.response?.data?.detail?.includes('access')) {
          setPermissionDenied(true);
          setError(err.response?.data?.detail || 'You don\'t have permission to access order reports functionality');
        } else {
          setError(err.response?.data?.detail || 'Failed to fetch order report data');
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
    fetchOrderReport();
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleOrderTypeChange = (e) => {
    setOrderType(e.target.value);
  };

  // Define table columns
  const columns = [
    {
      Header: 'Order No',
      accessor: 'order_number',
      width: '100px',
      Cell: (item) => (
        <div className="text-nowrap">
          <span className="fw-semibold">#{item.order_number}</span>
        </div>
      ),
      exportFormat: (item) => `#${item.order_number} (ID: ${item.order_id})`,
      headerClassName: 'text-nowrap'
    },
    {
      Header: 'Customer',
      accessor: 'customer_name',
      width: '180px',
      Cell: (item) => (
        <div className="text-nowrap">
          <span>{item.customer_name || 'N/A'}</span>
          {item.customer_mobile && <span className="ms-1">({item.customer_mobile})</span>}
        </div>
      ),
      exportFormat: (item) => `${item.customer_name || 'N/A'} (${item.customer_mobile || 'No mobile'})`,
      headerClassName: 'text-nowrap'
    },
    {
      Header: 'Date',
      accessor: 'created_on',
      width: '150px',
      Cell: (item) => <div className="text-nowrap">{item.created_on}</div>,
      exportFormat: (item) => item.created_on,
      headerClassName: 'text-nowrap'
    },
    {
      Header: 'Type',
      accessor: 'order_type',
      width: '100px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.order_type}
        </div>
      ),
      exportFormat: (item) => item.order_type,
      headerClassName: 'text-nowrap'
    },
    {
      Header: 'Status',
      accessor: 'order_status',
      width: '100px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.order_status}
        </div>
      ),
      exportFormat: (item) => item.order_status,
      headerClassName: 'text-nowrap'
    },
    {
      Header: 'Payment',
      accessor: 'payment_method',
      width: '120px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.payment_method || 'N/A'}
        </div>
      ),
      exportFormat: (item) => item.payment_method || 'N/A',
      headerClassName: 'text-nowrap'
    },
    {
      Header: 'Bill Amount',
      accessor: 'total_bill_amount',
      width: '130px',
      Cell: (item) => <div className="text-nowrap">₹{item.total_bill_amount.toFixed(2)}</div>,
      exportFormat: (item) => `₹${item.total_bill_amount.toFixed(2)}`,
      headerClassName: 'text-nowrap'
    },
    {
      Header: 'Discount',
      accessor: 'discount_amount',
      width: '120px',
      Cell: (item) => <div className="text-nowrap">₹{item.discount_amount.toFixed(2)}</div>,
      exportFormat: (item) => `₹${item.discount_amount.toFixed(2)}`,
      headerClassName: 'text-nowrap'
    },
    {
      Header: 'Final Amount',
      accessor: 'final_grand_total',
      width: '140px',
      Cell: (item) => <div className="text-nowrap">₹{item.final_grand_total.toFixed(2)}</div>,
      exportFormat: (item) => `₹${item.final_grand_total.toFixed(2)}`,
      sortFunction: (a, b, direction) => {
        const aAmount = parseFloat(a.final_grand_total);
        const bAmount = parseFloat(b.final_grand_total);
        return direction === 'asc' ? aAmount - bAmount : bAmount - aAmount;
      },
      headerClassName: 'text-nowrap'
    },
    // {
    //   Header: 'Actions',
    //   accessor: 'actions',
    //   width: '80px',
    //   Cell: (item) => (
    //     <Button 
    //       variant="light" 
    //       size="sm" 
    //       className="border"
    //       onClick={() => handleViewDetails(item)}
    //     >
    //       <i className="fas fa-eye"></i>
    //     </Button>
    //   ),
    //   disableSortBy: true,
    //   includeInExport: false,
    //   headerClassName: 'text-nowrap'
    // }
  ];

  // Prepare filter info for export
  const getFilterInfo = () => {
    const info = {
      'Date Range': dateRange || 'All Time',
      'Order Type': orderType === 'all' ? 'All Orders' : orderType
    };

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

      {/* Order Type Filter */}
      <Form.Select 
        value={orderType}
        onChange={handleOrderTypeChange}
        size="sm"
        style={{ width: '150px' }}
      >
        <option value="all">All Orders</option>
        <option value="dine-in">Dine-in</option>
        <option value="parcel">Parcel</option>
        <option value="counter">Counter</option>
        <option value="delivery">Delivery</option>
        <option value="drive-through">Drive-through</option>
      </Form.Select>

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
        onClick={fetchOrderReport}
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
      <Breadcrumb.Item active>Order Reports</Breadcrumb.Item>
    </Breadcrumb>
  );

  // Order Details Modal
  const OrderDetailsModal = () => {
    if (!selectedOrder) return null;
    
    return (
      <Modal show={showModal} onHide={handleCloseModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <span className="me-2">Order #{selectedOrder.order_number}</span>
            <span className="small text-muted">({selectedOrder.order_type} - {selectedOrder.order_status})</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row mb-4">
            <div className="col-md-6">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title border-bottom pb-2 mb-3">Order Information</h6>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="fw-bold">Order Number:</span>
                    <span>#{selectedOrder.order_number}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="fw-bold">Order Type:</span>
                    <span>{selectedOrder.order_type}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="fw-bold">Order Status:</span>
                    <span>{selectedOrder.order_status}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="fw-bold">Created On:</span>
                    <span>{selectedOrder.created_on}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="fw-bold">Payment Method:</span>
                    <span>{selectedOrder.payment_method || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100 border-0 shadow-sm">
                <div className="card-body">
                  <h6 className="card-title border-bottom pb-2 mb-3">Payment Details</h6>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="fw-bold">Bill Amount:</span>
                    <span>₹{selectedOrder.total_bill_amount.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="fw-bold">Discount:</span>
                    <span>₹{selectedOrder.discount_amount.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="fw-bold">Special Discount:</span>
                    <span>₹{selectedOrder.special_discount.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="fw-bold">GST Amount:</span>
                    <span>₹{selectedOrder.gst_amount.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="fw-bold">Service Charges:</span>
                    <span>₹{selectedOrder.service_charges_amount.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold mt-2 pt-2 border-top">
                    <span>Final Amount:</span>
                    <span>₹{selectedOrder.final_grand_total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {selectedOrder.customer_name && (
            <div className="card mb-4 border-0 shadow-sm">
              <div className="card-body">
                <h6 className="card-title border-bottom pb-2 mb-3">Customer Information</h6>
                <div className="row">
                  <div className="col-md-4">
                    <div className="d-flex mb-2">
                      <span className="fw-bold me-2">Name:</span>
                      <span>{selectedOrder.customer_name}</span>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="d-flex mb-2">
                      <span className="fw-bold me-2">Mobile:</span>
                      <span>{selectedOrder.customer_mobile || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="d-flex mb-2">
                      <span className="fw-bold me-2">Address:</span>
                      <span>{selectedOrder.customer_address || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <h6 className="card-title border-bottom pb-2 mb-3">Order Items</h6>
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Item Name</th>
                      <th className="text-center">Quantity</th>
                      <th className="text-end">Price</th>
                      <th className="text-end">Total</th>
                      <th>Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.menu_items && selectedOrder.menu_items.length > 0 ? (
                      selectedOrder.menu_items.map((item, index) => (
                        <tr key={`${selectedOrder.order_id}-${item.menu_id}-${index}`}>
                          <td>{index + 1}</td>
                          <td>{item.menu_name}</td>
                          <td className="text-center">{item.quantity}</td>
                          <td className="text-end">₹{item.price.toFixed(2)}</td>
                          <td className="text-end">₹{(item.quantity * item.price).toFixed(2)}</td>
                          <td>{item.comment || '-'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-center">No items available</td>
                      </tr>
                    )}
                    <tr className="table-light fw-bold">
                      <td colSpan="4" className="text-end">Total:</td>
                      <td className="text-end">₹{selectedOrder.total_bill_amount.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
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
                  resourceName="Order Reports"
                  onRetry={handleRetry}
                  onBack={() => navigate(-1)}
                />
              ) : error ? (
                <div className="alert alert-danger mb-4" role="alert">
                  {error}
                </div>
              ) : (
                <div style={{ backgroundColor: 'transparent', width: '100%', overflowX: 'auto' }}>
                  {/* Order Report Summary Stats */}
                

                  {/* Report Table */}
                  <ReportTable
                    data={orderDetails}
                    columns={columns}
                    title="Order Reports"
                    filterInfo={getFilterInfo()}
                    enableHorizontalScroll={true}
                    onBack={handleGoBack}
                    filterControls={renderFilterControls()}
                    dataFetched={dataFetched}
                    breadcrumbs={renderBreadcrumbs()}
                    onRefresh={fetchOrderReport}
                  />
                </div>
              )}
            </div>
            <Footer />
          </div>
        </div>
      </div>
      
      {/* Order Details Modal */}
      <OrderDetailsModal />
    </div>
  );
};

export default OrderReports; 