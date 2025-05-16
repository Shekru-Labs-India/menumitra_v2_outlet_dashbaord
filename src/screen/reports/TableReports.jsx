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

const TableReports = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [tableReport, setTableReport] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [selectedSection, setSelectedSection] = useState('');
  const [sections, setSections] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchTableReport();
  }, [filterType, selectedSection]);

  const toggleRow = (tableId) => {
    setExpandedRows(prev => ({
      ...prev,
      [tableId]: !prev[tableId]
    }));
  };

  const fetchTableReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setPermissionDenied(false);

      const params = {
        filter_type: filterType,
        outlet_id: localStorage.getItem('outlet_id'),
        user_id: localStorage.getItem('user_id')
      };

      if (filterType === 'section' && selectedSection) {
        params.section_id = selectedSection;
      }

      const response = await api.post(API_PATHS.tableReport, params);
      setTableData(response.data.detail.tables || []);
      setTableReport(response.data.detail.table_report || null);

      // Extract unique sections from table data
      const uniqueSections = [...new Set(response.data.detail.tables.map(table => ({
        id: table.section_id,
        name: table.section_name
      })))];
      setSections(uniqueSections);
    } catch (err) {
      console.error('Error fetching table report:', err);
      
      if (err.response?.status === 403 || 
          err.response?.data?.detail?.includes('permission') ||
          err.response?.data?.detail?.includes('access')) {
        setPermissionDenied(true);
        setError(err.response?.data?.detail || 'You don\'t have permission to access reports management functionality');
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch table report data');
      }

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
      setSelectedSection('');
    }
  };

  const handleSectionChange = (e) => {
    setSelectedSection(e.target.value);
  };

  const handleRetry = () => {
    fetchTableReport();
  };

  const getTableStatusBadge = (table) => {
    if (table.is_reserved) {
      return <Badge bg="warning">Reserved</Badge>;
    }
    if (table.is_joined && table.current_order) {
      return <Badge bg="danger">Occupied</Badge>;
    }
    return <Badge bg="success">Available</Badge>;
  };

  const getOrderStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'placed':
        return <Badge bg="info">Placed</Badge>;
      case 'cooking':
        return <Badge bg="warning">Cooking</Badge>;
      case 'paid':
        return <Badge bg="success">Paid</Badge>;
      case 'cancelled':
        return <Badge bg="danger">Cancelled</Badge>;
      default:
        return null;
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
                  resourceName="Table Reports"
                  onRetry={handleRetry}
                  onBack={() => navigate(-1)}
                />
              ) : error ? (
                <div className="alert alert-danger mb-4" role="alert">
                  {error}
                </div>
              ) : (
                <>
                  <Card className="mb-4">
                    <CardHeader className="d-flex justify-content-between align-items-center">
                      <CardTitle>Table Reports</CardTitle>
                      <div className="d-flex align-items-center gap-2">
                        <div className="dropdown">
                          <button
                            type="button"
                            className="btn btn-outline-primary dropdown-toggle"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                          >
                            <i className="fas fa-filter me-2"></i>
                            {filterType === 'all' ? 'All Tables' : 'By Section'}
                          </button>
                          <ul className="dropdown-menu dropdown-menu-end">
                            <li>
                              <a href="javascript:void(0);"
                                className="dropdown-item d-flex align-items-center"
                                onClick={() => setFilterType('all')}>
                                All Tables
                              </a>
                            </li>
                            <li>
                              <a href="javascript:void(0);"
                                className="dropdown-item d-flex align-items-center"
                                onClick={() => setFilterType('section')}>
                                By Section
                              </a>
                            </li>
                          </ul>
                        </div>

                        {filterType === 'section' && (
                          <Form.Select
                            value={selectedSection}
                            onChange={handleSectionChange}
                            style={{ width: '200px' }}
                          >
                            <option value="">Select Section</option>
                            {sections.map((section) => (
                              <option key={section.id} value={section.id}>
                                {section.name}
                              </option>
                            ))}
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
                  </Card>

                  {tableReport && (
                    <Row className="mb-4">
                      <Col md={3}>
                        <Card className="h-100">
                          <CardBody>
                            <h6 className="card-title">Total Tables</h6>
                            <h2 className="mb-0">{tableReport.total_tables}</h2>
                          </CardBody>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="h-100">
                          <CardBody>
                            <h6 className="card-title">Occupied Tables</h6>
                            <h2 className="mb-0">{tableReport.occupied_tables}</h2>
                          </CardBody>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="h-100">
                          <CardBody>
                            <h6 className="card-title">Available Tables</h6>
                            <h2 className="mb-0">{tableReport.available_tables}</h2>
                          </CardBody>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="h-100">
                          <CardBody>
                            <h6 className="card-title">Reserved Tables</h6>
                            <h2 className="mb-0">{tableReport.reserved_tables}</h2>
                          </CardBody>
                        </Card>
                      </Col>
                    </Row>
                  )}

                  <Card>
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
                                <th style={{ width: '15%' }}>Table Details</th>
                                <th style={{ width: '15%' }}>Section</th>
                                <th style={{ width: '15%' }}>Status</th>
                                <th style={{ width: '20%' }}>Current Order</th>
                                <th style={{ width: '15%' }}>Order Status</th>
                                <th style={{ width: '15%' }}>Created On</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tableData.map((table) => (
                                <React.Fragment key={table.table_id}>
                                  <tr 
                                    className="cursor-pointer"
                                    onClick={() => toggleRow(table.table_id)}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <td>
                                      <i className={`fas fa-chevron-${expandedRows[table.table_id] ? 'down' : 'right'} transition-all`}></i>
                                    </td>
                                    <td>
                                      <div className="d-flex flex-column">
                                        <span className="fw-semibold">Table #{table.table_number}</span>
                                        <small className="text-muted">{table.capacity} persons</small>
                                      </div>
                                    </td>
                                    <td>
                                      <div className="d-flex flex-column">
                                        <span>{table.section_name}</span>
                                      </div>
                                    </td>
                                    <td>
                                      {getTableStatusBadge(table)}
                                    </td>
                                    <td>
                                      <div className="d-flex flex-column">
                                        {table.current_order ? (
                                          <span className="fw-semibold">Order #{table.current_order.order_number}</span>
                                        ) : (
                                          <span className="text-muted">No active order</span>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      {table.current_order ? (
                                        getOrderStatusBadge(table.current_order.order_status)
                                      ) : (
                                        <span className="text-muted">-</span>
                                      )}
                                    </td>
                                    <td>
                                      {table.current_order?.created_on || '-'}
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colSpan="7" className="p-0">
                                      <div 
                                        className={`collapse ${expandedRows[table.table_id] ? 'show' : ''}`}
                                        style={{
                                          transition: 'all 0.3s ease-in-out',
                                          maxHeight: expandedRows[table.table_id] ? '500px' : '0',
                                          overflow: 'hidden'
                                        }}
                                      >
                                        <div className="p-3 bg-light">
                                          <div className="row">
                                            <div className="col-md-6">
                                              <h6 className="mb-3">Table Information</h6>
                                              <div className="card">
                                                <div className="card-body">
                                                  <div className="d-flex justify-content-between mb-2">
                                                    <span>Table Number:</span>
                                                    <span className="fw-semibold">#{table.table_number}</span>
                                                  </div>
                                                  <div className="d-flex justify-content-between mb-2">
                                                    <span>Section:</span>
                                                    <span className="fw-semibold">{table.section_name}</span>
                                                  </div>
                                                  <div className="d-flex justify-content-between mb-2">
                                                    <span>Capacity:</span>
                                                    <span className="fw-semibold">{table.capacity} persons</span>
                                                  </div>
                                                  <div className="d-flex justify-content-between mb-2">
                                                    <span>Status:</span>
                                                    <span>{getTableStatusBadge(table)}</span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                            <div className="col-md-6">
                                              <h6 className="mb-3">Current Order Details</h6>
                                              <div className="card">
                                                <div className="card-body">
                                                  {table.current_order ? (
                                                    <>
                                                      <div className="d-flex justify-content-between mb-2">
                                                        <span>Order Number:</span>
                                                        <span className="fw-semibold">#{table.current_order.order_number}</span>
                                                      </div>
                                                      <div className="d-flex justify-content-between mb-2">
                                                        <span>Status:</span>
                                                        <span>{getOrderStatusBadge(table.current_order.order_status)}</span>
                                                      </div>
                                                      <div className="d-flex justify-content-between mb-2">
                                                        <span>Created On:</span>
                                                        <span>{table.current_order.created_on}</span>
                                                      </div>
                                                    </>
                                                  ) : (
                                                    <div className="text-center text-muted">
                                                      No active order
                                                    </div>
                                                  )}
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
                          </Table>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </>
              )}
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TableReports; 