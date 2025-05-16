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
  const navigate = useNavigate();

  useEffect(() => {
    fetchTableReport();
  }, [filterType, selectedSection]);

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
                      <div className="d-flex gap-3">
                        <Form.Select
                          value={filterType}
                          onChange={handleFilterChange}
                          style={{ width: '200px' }}
                        >
                          <option value="all">All Tables</option>
                          <option value="section">By Section</option>
                        </Form.Select>
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
                        <Button
                          variant="outline-primary"
                          onClick={handleRetry}
                          disabled={loading}
                        >
                          <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                        </Button>
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
                        <Table responsive hover>
                          <thead>
                            <tr>
                              <th>Table #</th>
                              <th>Section</th>
                              <th>Capacity</th>
                              <th>Status</th>
                              <th>Current Order</th>
                              <th>Order Status</th>
                              <th>Created On</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tableData.map((table) => (
                              <tr key={table.table_id}>
                                <td>{table.table_number}</td>
                                <td>{table.section_name}</td>
                                <td>{table.capacity} persons</td>
                                <td>{getTableStatusBadge(table)}</td>
                                <td>
                                  {table.current_order ? (
                                    <span>Order #{table.current_order.order_number}</span>
                                  ) : (
                                    <span className="text-muted">No active order</span>
                                  )}
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
                            ))}
                          </tbody>
                        </Table>
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