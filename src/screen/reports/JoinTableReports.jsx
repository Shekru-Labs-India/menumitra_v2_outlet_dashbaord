import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../../config/apiConfig';
import {
  Form
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
        <div className="text-nowrap">
          <span className="fw-semibold">Table #{item.primary_table_number}</span>
        </div>
      ),
      exportFormat: (item) => `Table #${item.primary_table_number}`
    },
    {
      Header: 'Joined Table',
      accessor: 'joined_table_number',
      width: '15%',
      Cell: (item) => (
        <div className="text-nowrap">
          <span className="fw-semibold">Table #{item.joined_table_number}</span>
        </div>
      ),
      exportFormat: (item) => `Table #${item.joined_table_number}`
    },
    {
      Header: 'Section',
      accessor: 'section_name',
      width: '15%',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.section_name || 'No Section'}
        </div>
      ),
      exportFormat: (item) => item.section_name || 'No Section'
    },
    {
      Header: 'Status',
      accessor: 'status',
      width: '15%',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.status || '-'}
        </div>
      ),
      exportFormat: (item) => item.status || '-'
    },
    {
      Header: 'Changed By',
      accessor: 'changed_by',
      width: '15%',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.changed_by || '-'}
        </div>
      ),
      exportFormat: (item) => item.changed_by || '-'
    },
    {
      Header: 'Changed On',
      accessor: 'changed_on',
      width: '25%',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.changed_on || '-'}
        </div>
      ),
      exportFormat: (item) => item.changed_on || '-'
    }
  ];

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
                <div>
                  <div className="mb-4">
                    <h2 className="text-center mb-0 fw-bold text-primary">Join Table Reports</h2>
                  </div>

                  <div>
                    {/* Filters Section */}
                    <div className="mb-4">
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
                    </div>

                    {/* Summary Stats - Simple Text Version */}
                    {joinTableReport && (
                      <div className="mb-4 d-flex justify-content-around">
                        <div className="text-center">
                          <div className="fw-bold">Total Joins</div>
                          <div className="h4">{joinTableReport.total_joins}</div>
                        </div>
                        <div className="text-center">
                          <div className="fw-bold">Total Unjoins</div>
                          <div className="h4">{joinTableReport.total_unjoins}</div>
                        </div>
                      </div>
                    )}

                    {/* Table Section */}
                    {dataFetched && filteredData.length > 0 ? (
                      <div style={{ backgroundColor: 'transparent' }}>
                        <div className="bg-white rounded p-3">
                          <ReportTable
                            data={filteredData}
                            columns={columns}
                            title="Join Table History"
                            filterInfo={getFilterInfo()}
                          />
                        </div>
                      </div>
                    ) : dataFetched && filteredData.length === 0 ? (
                      <div className="alert alert-info mt-4">
                        <i className="fas fa-info-circle me-2"></i>
                        No join table history found for the selected filters. Please try different filter criteria.
                      </div>
                    ) : null}
                  </div>
                </div>
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