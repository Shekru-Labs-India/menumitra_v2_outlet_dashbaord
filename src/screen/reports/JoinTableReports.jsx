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

const JoinTableReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [joinHistoryData, setJoinHistoryData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [joinTableReport, setJoinTableReport] = useState(null);
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
    if (joinHistoryData.length > 0) {
      applyFilters();
    }
  }, [filterType, selectedSection, joinHistoryData]);

  const applyFilters = () => {
    let result = [...joinHistoryData];
    
    // Apply filter by section if applicable
    if (filterType === 'section' && selectedSection) {
      const sectionIdNum = parseInt(selectedSection, 10);
      console.log('Filtering by section_id:', sectionIdNum);
      
      // Find the section name for the selected section ID
      const sectionName = sections.find(
        section => parseInt(section.section_id, 10) === sectionIdNum
      )?.section_name || '';
      
      result = result.filter(item => item.section_name === sectionName);
      
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

  const fetchJoinTableReport = async (params) => {
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

      console.log('Fetching join table report with params:', apiParams);
      const response = await api.post(API_PATHS.joinTableReport, apiParams);
      
      // Extract join table data from the response
      let joinHistory = [];
      let reportSummary = null;
      
      if (response.data && response.data.detail) {
        joinHistory = response.data.detail.join_history || [];
        reportSummary = response.data.detail.join_table_report || null;
      }
      
      console.log('API response data:', joinHistory);
      
      // Add unique id to each record for table component
      const processedData = joinHistory.map((item, index) => ({
        ...item,
        id: `join-${index}`
      }));
      
      setJoinHistoryData(processedData);
      setFilteredData(processedData);
      setJoinTableReport(reportSummary);
      setDataFetched(true);
    } catch (err) {
      console.error('Error fetching join table report:', err);
      
      if (err.response?.status === 403 || 
          err.response?.data?.detail?.includes('permission') ||
          err.response?.data?.detail?.includes('access')) {
        setPermissionDenied(true);
        setError(err.response?.data?.detail || 'You don\'t have permission to access join table reports management functionality');
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch join table report data');
      }

      if (err.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchJoinTableReport({});
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
      Header: 'Primary Table',
      accessor: 'primary_table_number',
      width: '15%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          <span className="fw-semibold text-primary">Table #{item.primary_table_number}</span>
        </div>
      ),
      exportFormat: (item) => `Table #${item.primary_table_number}`
    },
    {
      Header: 'Joined Table',
      accessor: 'joined_table_number',
      width: '15%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          <span className="fw-semibold text-secondary">Table #{item.joined_table_number}</span>
        </div>
      ),
      exportFormat: (item) => `Table #${item.joined_table_number}`
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
      accessor: 'status',
      width: '15%',
      Cell: (item) => {
        const status = item.status?.toLowerCase();
        return status === 'joined' ? 
          <Badge bg="success">Joined</Badge> : 
          <Badge bg="danger">Unjoined</Badge>;
      },
      exportFormat: (item) => item.status || '-'
    },
    {
      Header: 'Changed By',
      accessor: 'changed_by',
      width: '15%',
      Cell: (item) => (
        <span>{item.changed_by || '-'}</span>
      ),
      exportFormat: (item) => item.changed_by || '-'
    },
    {
      Header: 'Changed On',
      accessor: 'changed_on',
      width: '25%',
      Cell: (item) => (
        <span>{item.changed_on || '-'}</span>
      ),
      exportFormat: (item) => item.changed_on || '-'
    }
  ];

  // Define expandable content for additional join table details
  const renderJoinTableDetails = (item) => (
    <>
      <h6 className="mb-3 text-primary">
        <i className="fas fa-table me-2"></i>
        Join Table Details
      </h6>
      <div className="row">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Primary Table:</span>
                <span>#{item.primary_table_number}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Joined Table:</span>
                <span>#{item.joined_table_number}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Section:</span>
                <span>{item.section_name}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Status:</span>
                <span>{item.status}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Changed By:</span>
                <span>{item.changed_by}</span>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold">Changed On:</span>
                <span>{item.changed_on}</span>
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
        return 'All Join Tables';
    }
  };

  // Render section breakdown cards if available
  const renderSectionBreakdown = () => {
    if (!joinTableReport || !joinTableReport.section_breakdown) {
      return null;
    }

    const sectionData = joinTableReport.section_breakdown;
    const sectionNames = Object.keys(sectionData);

    return (
      <>
        <h5 className="mt-4 mb-3">Section Breakdown</h5>
        <Row className="mb-4">
          {sectionNames.map((sectionName) => (
            <Col md={4} key={sectionName}>
              <Card className="h-100 mb-3">
                <CardHeader className="bg-light">
                  <h6 className="mb-0">{sectionName}</h6>
                </CardHeader>
                <CardBody>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Joins:</span>
                    <span className="badge bg-success">{sectionData[sectionName].joins}</span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Unjoins:</span>
                    <span className="badge bg-danger">{sectionData[sectionName].unjoins}</span>
                  </div>
                </CardBody>
              </Card>
            </Col>
          ))}
        </Row>
      </>
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
                  resourceName="Join Table Reports"
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
                    <CardTitle className="text-center w-100 mb-0 fw-bold text-primary">Join Table Reports</CardTitle>
                  </CardHeader>

                  <CardBody>
                    {/* Filters Section */}
                    <ReportFilters
                      isLoading={loading}
                      onSubmit={fetchJoinTableReport}
                      defaultDateRange="All Time"
                    >
                      {/* Custom Join Table Report Filters */}
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
                    {joinTableReport && (
                      <Row className="mb-4">
                        <Col md={6}>
                          <Card className="h-100">
                            <CardBody>
                              <h6 className="card-title">Total Joins</h6>
                              <h2 className="mb-0">{joinTableReport.total_joins}</h2>
                            </CardBody>
                          </Card>
                        </Col>
                        <Col md={6}>
                          <Card className="h-100">
                            <CardBody>
                              <h6 className="card-title">Total Unjoins</h6>
                              <h2 className="mb-0">{joinTableReport.total_unjoins}</h2>
                            </CardBody>
                          </Card>
                        </Col>
                      </Row>
                    )}

                    {/* Section Breakdown */}
                    {joinTableReport && renderSectionBreakdown()}

                    {/* Table Section */}
                    {dataFetched && filteredData.length > 0 ? (
                      <ReportTable
                        data={filteredData}
                        columns={columns}
                        title="Join Table History"
                        expandableContent={renderJoinTableDetails}
                        filterInfo={getFilterInfo()}
                      />
                    ) : dataFetched && filteredData.length === 0 ? (
                      <div className="alert alert-info mt-4">
                        <i className="fas fa-info-circle me-2"></i>
                        No join table history found for the selected filters. Please try different filter criteria.
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

export default JoinTableReports; 