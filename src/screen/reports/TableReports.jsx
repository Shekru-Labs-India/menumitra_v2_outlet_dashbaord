import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../../config/apiConfig';
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
  Spinner,
  Form,
  Row,
  Col
} from 'react-bootstrap';
import VerticalSidebar from '../../components/VerticalSidebar';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { ForbiddenAccessMessage, ReportTable, ReportFilters } from '../../components/common';
import { useNavigate } from 'react-router-dom';

const TableReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [tableReport, setTableReport] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [selectedSection, setSelectedSection] = useState('');
  const [sections, setSections] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [filterParams, setFilterParams] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch section list on initial load
    fetchSections();
  }, []);

  // Update filtered data when filter type or section ID changes
  useEffect(() => {
    if (tableData.length > 0) {
      applyFilters();
    }
  }, [filterType, selectedSection, tableData]);

  const applyFilters = () => {
    let result = [...tableData];
    
    // Apply filter by section if applicable
    if (filterType === 'section' && selectedSection) {
      const sectionIdNum = parseInt(selectedSection, 10);
      console.log('Filtering by section_id:', sectionIdNum);
      
      result = result.filter(item => {
        const itemSectionId = parseInt(item.section_id, 10);
        return itemSectionId === sectionIdNum;
      });
      
      console.log('Filtered results count:', result.length);
    }
    
    setFilteredData(result);
  };

  const fetchSections = async () => {
    try {
      setLoadingSections(true);
      // Using the reportFilterSection endpoint with GET request
      const response = await api.get(API_PATHS.reportFilterSection);
      
      // The API returns an array of sections in the detail field
      const validSections = response.data.detail || [];
      console.log('Fetched sections:', validSections);
      setSections(validSections);
    } catch (err) {
      console.error('Error fetching sections:', err);
      setError('Failed to fetch sections');
    } finally {
      setLoadingSections(false);
    }
  };

  const fetchTableReport = async (params) => {
    try {
      // If filter type is section but no section is selected, don't fetch
      if (filterType === 'section' && !selectedSection) {
        setError('Please select a section');
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

      if (filterType === 'section' && selectedSection) {
        apiParams.section_id = parseInt(selectedSection, 10);
      }

      // Add date range parameters if applicable
      if (params.start_date && params.end_date) {
        apiParams.start_date = params.start_date.toISOString().split('T')[0];
        apiParams.end_date = params.end_date.toISOString().split('T')[0];
      } else if (params.date_range && params.date_range !== 'All Time') {
        apiParams.date_range = params.date_range;
      }

      console.log('Fetching table report with params:', apiParams);
      const response = await api.post(API_PATHS.tableReport, apiParams);
      
      // Extract table data from the response
      let tables = [];
      let reportSummary = null;
      
      if (response.data && response.data.detail) {
        tables = response.data.detail.tables || [];
        reportSummary = response.data.detail.table_report || null;
      }
      
      console.log('API response data:', tables);
      
      // Add unique id to each record for table component
      const processedData = tables.map((item, index) => ({
        ...item,
        id: item.table_id || `table-${index}`
      }));
      
      setTableData(processedData);
      setFilteredData(processedData);
      setTableReport(reportSummary);
      setDataFetched(true);
    } catch (err) {
      console.error('Error fetching table report:', err);
      
      if (err.response?.status === 403 || 
          err.response?.data?.detail?.includes('permission') ||
          err.response?.data?.detail?.includes('access')) {
        setPermissionDenied(true);
        setError(err.response?.data?.detail || 'You don\'t have permission to access table reports management functionality');
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

  const handleRetry = () => {
    fetchTableReport({});
  };

  const handleFilterTypeChange = (e) => {
    setFilterType(e.target.value);
    // Reset section selection if not filtering by section
    if (e.target.value !== 'section') {
      setSelectedSection('');
    }
  };

  // Define table columns
  const columns = [
    {
      Header: 'Table Details',
      accessor: 'table_number',
      width: '20%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          <span className="fw-semibold text-primary">Table #{item.table_number}</span>
          <small className="text-muted">{item.capacity || 0} persons</small>
        </div>
      ),
      exportFormat: (item) => `Table #${item.table_number} (${item.capacity || 0} persons)`
    },
    {
      Header: 'Section',
      accessor: 'section_name',
      width: '15%',
      Cell: (item) => (
        <Badge bg="info" className="text-white">
          {item.section_name || 'No Section'}
        </Badge>
      ),
      exportFormat: (item) => item.section_name || 'No Section'
    },
    {
      Header: 'Status',
      accessor: 'is_reserved',
      width: '15%',
      Cell: (item) => {
        if (item.is_reserved) {
          return <Badge bg="warning">Reserved</Badge>;
        }
        if (item.is_joined && item.current_order) {
          return <Badge bg="danger">Occupied</Badge>;
        }
        return <Badge bg="success">Available</Badge>;
      },
      exportFormat: (item) => {
        if (item.is_reserved) return 'Reserved';
        if (item.is_joined && item.current_order) return 'Occupied';
        return 'Available';
      },
      sortFunction: (a, b, direction) => {
        // Sort order: Occupied (1), Reserved (2), Available (3)
        const getStatusValue = (item) => {
          if (item.is_joined && item.current_order) return 1;
          if (item.is_reserved) return 2;
          return 3;
        };
        
        const aValue = getStatusValue(a);
        const bValue = getStatusValue(b);
        
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
    },
    {
      Header: 'Current Order',
      accessor: 'current_order',
      width: '20%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          {item.current_order ? (
            <span className="fw-semibold">Order #{item.current_order.order_number}</span>
          ) : (
            <span className="text-muted">No active order</span>
          )}
        </div>
      ),
      exportFormat: (item) => item.current_order ? `Order #${item.current_order.order_number}` : 'No active order'
    },
    {
      Header: 'Order Status',
      accessor: 'current_order.order_status',
      width: '15%',
      Cell: (item) => {
        if (!item.current_order) return <span className="text-muted">-</span>;
        
        const status = item.current_order.order_status?.toLowerCase();
        switch (status) {
          case 'placed':
            return <Badge bg="info">Placed</Badge>;
          case 'cooking':
            return <Badge bg="warning">Cooking</Badge>;
          case 'paid':
            return <Badge bg="success">Paid</Badge>;
          case 'cancelled':
            return <Badge bg="danger">Cancelled</Badge>;
          default:
            return <span className="text-muted">{status || '-'}</span>;
        }
      },
      exportFormat: (item) => item.current_order?.order_status || '-'
    },
    {
      Header: 'Created On',
      accessor: 'current_order.created_on',
      width: '15%',
      Cell: (item) => (
        <span>{item.current_order?.created_on || '-'}</span>
      ),
      exportFormat: (item) => item.current_order?.created_on || '-'
    }
  ];

  // Define expandable content for additional table details
  const renderTableDetails = (item) => (
    <>
      <h6 className="mb-3 text-primary">
        <i className="fas fa-table me-2"></i>
        Table Information
      </h6>
      <div className="row">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Table Number:</span>
                <span>#{item.table_number}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Section:</span>
                <span>{item.section_name}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Capacity:</span>
                <span>{item.capacity || 0} persons</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="fw-bold">Status:</span>
                <span>
                  {item.is_reserved ? 'Reserved' : 
                   (item.is_joined && item.current_order) ? 'Occupied' : 'Available'}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              {item.current_order ? (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold">Order Number:</span>
                    <span>#{item.current_order.order_number}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold">Status:</span>
                    <span>{item.current_order.order_status}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold">Created On:</span>
                    <span>{item.current_order.created_on}</span>
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

    if (filterType === 'section' && selectedSection) {
      const selectedSectionObj = sections.find(sec => parseInt(sec.section_id, 10) === parseInt(selectedSection, 10));
      if (selectedSectionObj) {
        info['Section'] = selectedSectionObj.section_name;
      }
    }

    return info;
  };

  const getFilterTypeLabel = () => {
    switch (filterType) {
      case 'section':
        return 'By Section';
      default:
        return 'All Tables';
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
                <Card>
                  <CardHeader className="bg-white">
                    <CardTitle className="text-center w-100 mb-0 fw-bold text-primary">Table Reports</CardTitle>
                  </CardHeader>

                  <CardBody>
                    {/* Filters Section */}
                    <ReportFilters
                      isLoading={loading}
                      onSubmit={fetchTableReport}
                      defaultDateRange="All Time"
                    >
                      {/* Custom Table Report Filters */}
                      <Form.Select 
                        value={filterType}
                        onChange={handleFilterTypeChange}
                        style={{ width: '200px' }}
                      >
                        <option value="all">All Tables</option>
                        <option value="section" disabled={sections.length === 0}>By Section</option>
                      </Form.Select>

                      {filterType === 'section' && (
                        <Form.Select
                          value={selectedSection}
                          onChange={(e) => setSelectedSection(e.target.value)}
                          style={{ width: '200px' }}
                          disabled={loadingSections || sections.length === 0}
                        >
                          <option value="">Select a section</option>
                          {sections.map(section => (
                            <option key={section.section_id} value={section.section_id}>
                              {section.section_name}
                            </option>
                          ))}
                        </Form.Select>
                      )}
                    </ReportFilters>

                    {/* Summary Cards */}
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

                    {/* Table Section */}
                    {dataFetched && filteredData.length > 0 ? (
                      <ReportTable
                        data={filteredData}
                        columns={columns}
                        title="Table Report"
                        expandableContent={renderTableDetails}
                        filterInfo={getFilterInfo()}
                      />
                    ) : dataFetched && filteredData.length === 0 ? (
                      <div className="alert alert-info mt-4">
                        <i className="fas fa-info-circle me-2"></i>
                        No tables found for the selected filters. Please try different filter criteria.
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

export default TableReports; 