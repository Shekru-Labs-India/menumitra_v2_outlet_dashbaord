import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../../config/apiConfig';
import {
  Form,
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
  
  // Date range filters
  const [dateRange, setDateRange] = useState('All Time');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
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

  // Handle date range selection
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setShowDatePicker(range === 'Custom Range');
  };

  const fetchJoinTableReport = () => {
    const fetchData = async () => {
      try {
        // If filter type is section but no section is selected, don't fetch
        if (filterType === 'section' && !selectedSection) {
          setError('Please select a section');
          return;
        }
        
        setLoading(true);
        setError(null);
        setPermissionDenied(false);

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
        if (startDate && endDate && dateRange === 'Custom Range') {
          apiParams.start_date = startDate.toISOString().split('T')[0];
          apiParams.end_date = endDate.toISOString().split('T')[0];
        } else if (dateRange !== 'All Time') {
          apiParams.date_range = dateRange;
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

    fetchData();
  };

  const handleRetry = () => {
    fetchJoinTableReport();
  };

  const handleFilterTypeChange = (e) => {
    setFilterType(e.target.value);
    // Reset section selection if not filtering by section
    if (e.target.value !== 'section') {
      setSelectedSection('');
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  // Define table columns
  const columns = [
    {
      Header: 'Primary Table',
      accessor: 'primary_table_number',
      width: '130px',
      Cell: (item) => (
        <div className="text-nowrap">
          <span className="fw-semibold">#{item.primary_table_number}</span>
        </div>
      ),
      exportFormat: (item) => `Table #${item.primary_table_number}`
    },
    {
      Header: 'Joined Table',
      accessor: 'joined_table_number',
      width: '130px',
      Cell: (item) => (
        <div className="text-nowrap">
          <span className="fw-semibold">#{item.joined_table_number}</span>
        </div>
      ),
      exportFormat: (item) => `Table #${item.joined_table_number}`
    },
    {
      Header: 'Section',
      accessor: 'section_name',
      width: '150px',
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
      width: '120px',
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
      width: '150px',
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
      width: '180px',
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
    const info = {
      'Filter Type': getFilterTypeLabel(),
      'Date Range': dateRange || 'All Time'
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

      {/* Filter Type Select */}
      <Form.Select 
        value={filterType}
        onChange={handleFilterTypeChange}
        size="sm"
        style={{ width: '150px' }}
      >
        <option value="all">All Tables</option>
        <option value="section" disabled={sections.length === 0}>By Section</option>
      </Form.Select>

      {/* Section Select - Only show if filter type is section */}
      {filterType === 'section' && (
        <Form.Select
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          size="sm"
          style={{ width: '150px' }}
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

      {/* Date Picker for Custom Range */}
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
        onClick={fetchJoinTableReport}
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
      <Breadcrumb.Item active>Join Table Reports</Breadcrumb.Item>
    </Breadcrumb>
  );

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
                <div style={{ backgroundColor: 'transparent', width: '100%', overflowX: 'auto' }}>
                  <ReportTable
                    data={filteredData}
                    columns={columns}
                    title="Join Table Reports"
                    filterInfo={getFilterInfo()}
                    enableHorizontalScroll={true}
                    onBack={handleGoBack}
                    filterControls={renderFilterControls()}
                    dataFetched={dataFetched}
                    breadcrumbs={renderBreadcrumbs()}
                    onRefresh={fetchJoinTableReport}
                  />
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