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
import { ForbiddenAccessMessage, ReportTable, ReportFilters } from '../../components/common';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const OrderReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderData, setOrderData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [orderStatuses, setOrderStatuses] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [filterParams, setFilterParams] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPaymentMethods();
    fetchOrderStatuses();
  }, []);

  // Update filtered data when payment method or order status changes
  useEffect(() => {
    if (orderData.length > 0) {
      applyFilters();
    }
  }, [paymentMethod, orderStatus, orderData]);

  const applyFilters = () => {
    let result = [...orderData];
    
    // Apply payment method filter if selected
    if (paymentMethod) {
      result = result.filter(order => 
        order.payment_method.toLowerCase() === paymentMethod.toLowerCase()
      );
    }
    
    // Apply order status filter if selected
    if (orderStatus) {
      result = result.filter(order => 
        order.status.toLowerCase() === orderStatus.toLowerCase()
      );
    }
    
    setFilteredData(result);
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await api.post(API_PATHS.paymentMethodsList, {
        outlet_id: localStorage.getItem('outlet_id'),
        user_id: localStorage.getItem('user_id')
      });
      
      // Process payment methods
      const methods = response.data.data || [];
      setPaymentMethods(methods);
    } catch (err) {
      console.error('Error fetching payment methods:', err);
    }
  };

  const fetchOrderStatuses = async () => {
    try {
      // This would be the actual API call in a real application
      // For demonstration, we'll use mock data
      const statuses = [
        { id: 'completed', name: 'Completed' },
        { id: 'pending', name: 'Pending' },
        { id: 'cancelled', name: 'Cancelled' },
        { id: 'processing', name: 'Processing' }
      ];
      
      setOrderStatuses(statuses);
    } catch (err) {
      console.error('Error fetching order statuses:', err);
    }
  };

  const fetchOrderReport = async (params) => {
    try {
      setLoading(true);
      setError(null);
      setPermissionDenied(false);
      setFilterParams(params);

      // Prepare API parameters
      const apiParams = {
        outlet_id: localStorage.getItem('outlet_id'),
        user_id: localStorage.getItem('user_id')
      };

      // Add filter parameters
      if (paymentMethod) {
        apiParams.payment_method = paymentMethod;
      }
      
      if (orderStatus) {
        apiParams.order_status = orderStatus;
      }

      // Add date range parameters
      if (params.start_date && params.end_date) {
        apiParams.start_date = params.start_date.toISOString().split('T')[0];
        apiParams.end_date = params.end_date.toISOString().split('T')[0];
      } else if (params.date_range && params.date_range !== 'All Time') {
        apiParams.date_range = params.date_range;
      }

      console.log('Fetching order report with params:', apiParams);
      
      // In a real application, this would be an API call
      // For demonstration, we'll simulate a response
      // const response = await api.post(API_PATHS.orderReport, apiParams);
      
      // Simulate API response
      const mockData = Array.from({ length: 30 }, (_, index) => ({
        id: `order-${index + 1}`,
        order_id: `ORD${100000 + index}`,
        customer_name: `Customer ${index + 1}`,
        order_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: (Math.random() * 1000 + 100).toFixed(2),
        payment_method: ['Cash', 'Credit Card', 'UPI', 'Wallet'][Math.floor(Math.random() * 4)],
        status: ['Completed', 'Pending', 'Cancelled', 'Processing'][Math.floor(Math.random() * 4)],
        items: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, itemIndex) => ({
          id: `item-${index}-${itemIndex}`,
          name: `Item ${itemIndex + 1}`,
          quantity: Math.floor(Math.random() * 5) + 1,
          price: (Math.random() * 200 + 50).toFixed(2)
        }))
      }));
      
      // Add filter information to the data for display in exports
      const processedData = mockData.map(order => ({
        ...order,
        filter_payment_method: paymentMethod || 'All',
        filter_order_status: orderStatus || 'All',
        filter_date_range: params.date_range || 'All Time'
      }));
      
      setOrderData(processedData);
      setFilteredData(processedData);
      setDataFetched(true);
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

  const handleRetry = () => {
    fetchOrderReport({});
  };

  // Define table columns
  const columns = [
    {
      Header: 'Order ID',
      accessor: 'order_id',
      width: '15%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          <span className="fw-semibold text-primary">{item.order_id}</span>
        </div>
      )
    },
    {
      Header: 'Customer',
      accessor: 'customer_name',
      width: '20%'
    },
    {
      Header: 'Date',
      accessor: 'order_date',
      width: '15%',
      sortFunction: (a, b, direction) => {
        const aDate = new Date(a.order_date);
        const bDate = new Date(b.order_date);
        return direction === 'asc' ? aDate - bDate : bDate - aDate;
      }
    },
    {
      Header: 'Amount',
      accessor: 'amount',
      width: '15%',
      Cell: (item) => (
        <span className="fw-bold">₹{item.amount}</span>
      ),
      exportFormat: (item) => `₹${item.amount}`,
      sortFunction: (a, b, direction) => {
        const aAmount = parseFloat(a.amount);
        const bAmount = parseFloat(b.amount);
        return direction === 'asc' ? aAmount - bAmount : bAmount - aAmount;
      }
    },
    {
      Header: 'Payment Method',
      accessor: 'payment_method',
      width: '15%',
      Cell: (item) => (
        <Badge bg="info" className="text-white">
          {item.payment_method}
        </Badge>
      )
    },
    {
      Header: 'Status',
      accessor: 'status',
      width: '15%',
      Cell: (item) => {
        let badgeColor = 'secondary';
        switch (item.status.toLowerCase()) {
          case 'completed':
            badgeColor = 'success';
            break;
          case 'pending':
            badgeColor = 'warning';
            break;
          case 'cancelled':
            badgeColor = 'danger';
            break;
          case 'processing':
            badgeColor = 'primary';
            break;
          default:
            badgeColor = 'secondary';
        }
        
        return (
          <Badge bg={badgeColor} className="px-3 py-2">
            {item.status}
          </Badge>
        );
      }
    }
  ];

  // Define expandable content for order items
  const renderOrderItems = (order) => (
    <>
      <h6 className="mb-3 text-primary">
        <i className="fas fa-shopping-cart me-2"></i>
        Order Items
      </h6>
      <div className="table-responsive">
        <table className="table table-sm table-bordered">
          <thead className="bg-light">
            <tr>
              <th>Item Name</th>
              <th className="text-center">Quantity</th>
              <th className="text-end">Price</th>
              <th className="text-end">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items && order.items.length > 0 ? (
              order.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-end">₹{item.price}</td>
                  <td className="text-end">₹{(item.quantity * parseFloat(item.price)).toFixed(2)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center">No items available</td>
              </tr>
            )}
            <tr className="table-light">
              <td colSpan="3" className="text-end fw-bold">Total:</td>
              <td className="text-end fw-bold">₹{order.amount}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );

  // Prepare filter info for export
  const getFilterInfo = () => {
    if (!filterParams) {
      return {
        'Date Range': 'All Time',
        'Payment Method': paymentMethod || 'All',
        'Order Status': orderStatus || 'All'
      };
    }

    return {
      'Date Range': filterParams.date_range || 'All Time',
      'Payment Method': paymentMethod || 'All',
      'Order Status': orderStatus || 'All'
    };
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
                <Card>
                  <CardHeader className="bg-white">
                    <CardTitle className="text-center w-100 mb-0 fw-bold text-primary">Order Reports</CardTitle>
                  </CardHeader>

                  <CardBody>
                    {/* Filters Section */}
                    <ReportFilters
                      isLoading={loading}
                      onSubmit={fetchOrderReport}
                      defaultDateRange="All Time"
                    >
                      {/* Custom Order Report Filters */}
                      <Form.Select
                        name="payment_method"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        style={{ width: '200px' }}
                      >
                        <option value="">All Payment Methods</option>
                        {paymentMethods.map(method => (
                          <option key={method.id} value={method.name}>
                            {method.name}
                          </option>
                        ))}
                      </Form.Select>

                      <Form.Select
                        name="order_status"
                        value={orderStatus}
                        onChange={(e) => setOrderStatus(e.target.value)}
                        style={{ width: '200px' }}
                      >
                        <option value="">All Statuses</option>
                        {orderStatuses.map(status => (
                          <option key={status.id} value={status.name}>
                            {status.name}
                          </option>
                        ))}
                      </Form.Select>
                    </ReportFilters>

                    {/* Table Section */}
                    {dataFetched && (
                      <ReportTable
                        data={filteredData}
                        columns={columns}
                        title="Order Report"
                        expandableContent={renderOrderItems}
                        filterInfo={getFilterInfo()}
                      />
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

export default OrderReports; 