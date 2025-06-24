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
      Header: 'Table #',
      accessor: 'table_number',
      width: '7%',
      Cell: (item) => (
        <div className="text-nowrap">
          <span className="fw-semibold">#{item.table_number}</span>
        </div>
      ),
      exportFormat: (item) => `Table #${item.table_number}`
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
      Header: 'Capacity',
      accessor: 'capacity',
      width: '10%',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.capacity || 0} persons
        </div>
      ),
      exportFormat: (item) => `${item.capacity || 0} persons`
    },
    {
      Header: 'Status',
      accessor: 'is_reserved',
      width: '15%',
      Cell: (item) => {
        if (item.is_reserved) {
          return <div className="text-nowrap">Reserved</div>;
        }
        if (item.is_joined && item.current_order) {
          return <div className="text-nowrap">Occupied</div>;
        }
        return <div className="text-nowrap">Available</div>;
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
      width: '18%',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.current_order ? (
            <>Order #{item.current_order.order_number}</>
          ) : (
            <>No active order</>
          )}
        </div>
      ),
      exportFormat: (item) => item.current_order ? `Order #${item.current_order.order_number}` : 'No active order'
    },
    {
      Header: 'Order Status',
      accessor: 'current_order.order_status',
      width: '15%',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.current_order ? item.current_order.order_status : '-'}
        </div>
      ),
      exportFormat: (item) => item.current_order?.order_status || '-'
    },
    {
      Header: 'Created On',
      accessor: 'current_order.created_on',
      width: '20%',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.current_order?.created_on || '-'}
        </div>
      ),
      exportFormat: (item) => item.current_order?.created_on || '-'
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
                <div>
                  <div className="mb-4">
                    <h2 className="text-center mb-0 fw-bold text-primary">Table Reports</h2>
                  </div>

                  <div>
                    {/* Filters Section */}
                    <div className="mb-4">
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
                    </div>

                    {/* Summary Stats - Simple Text Version */}
                    {tableReport && (
                      <div className="mb-4 d-flex justify-content-around">
                        <div className="text-center">
                          <div className="fw-bold">Total Tables</div>
                          <div className="h4">{tableReport.total_tables}</div>
                        </div>
                        <div className="text-center">
                          <div className="fw-bold">Occupied Tables</div>
                          <div className="h4">{tableReport.occupied_tables}</div>
                        </div>
                        <div className="text-center">
                          <div className="fw-bold">Available Tables</div>
                          <div className="h4">{tableReport.available_tables}</div>
                        </div>
                        <div className="text-center">
                          <div className="fw-bold">Reserved Tables</div>
                          <div className="h4">{tableReport.reserved_tables}</div>
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
                            title="Table Report"
                            filterInfo={getFilterInfo()}
                          />
                        </div>
                      </div>
                    ) : dataFetched && filteredData.length === 0 ? (
                      <div className="alert alert-info mt-4">
                        <i className="fas fa-info-circle me-2"></i>
                        No tables found for the selected filters. Please try different filter criteria.
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

export default TableReports; 