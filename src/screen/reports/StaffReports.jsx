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

const StaffReports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [staffData, setStaffData] = useState(null);
  const [operationalStaff, setOperationalStaff] = useState([]);
  const [nonOperationalStaff, setNonOperationalStaff] = useState([]);
  const [filteredOperationalStaff, setFilteredOperationalStaff] = useState([]);
  const [filteredNonOperationalStaff, setFilteredNonOperationalStaff] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [dataFetched, setDataFetched] = useState(false);
  
  // Date range filters
  const [dateRange, setDateRange] = useState('All Time');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const navigate = useNavigate();

  // Update filtered data when filter type changes or staff data changes
  useEffect(() => {
    if (operationalStaff.length > 0 || nonOperationalStaff.length > 0) {
      applyFilters();
    }
  }, [filterType, operationalStaff, nonOperationalStaff]);

  // Apply filters to staff data
  const applyFilters = () => {
    console.log('Applying filters with filter type:', filterType);
    console.log('Operational staff data:', operationalStaff.length);
    console.log('Non-operational staff data:', nonOperationalStaff.length);
    
    // For operational staff
    if (filterType === 'operational' || filterType === 'all') {
      setFilteredOperationalStaff([...operationalStaff]);
    } else {
      setFilteredOperationalStaff([]);
    }
    
    // For non-operational staff
    if (filterType === 'non-operational' || filterType === 'all') {
      setFilteredNonOperationalStaff([...nonOperationalStaff]);
    } else {
      setFilteredNonOperationalStaff([]);
    }
    
    console.log('Filters applied. Filter type:', filterType);
    console.log('Filtered operational staff:', 
      (filterType === 'all' || filterType === 'operational') ? operationalStaff.length : 0);
    console.log('Filtered non-operational staff:', 
      (filterType === 'all' || filterType === 'non-operational') ? nonOperationalStaff.length : 0);
  };

  // Handle date range selection
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setShowDatePicker(range === 'Custom Range');
  };

  const handleFilterTypeChange = (e) => {
    const newFilterType = e.target.value;
    setFilterType(newFilterType);
    console.log('Filter type changed to:', newFilterType);
    
    // Force immediate filter application
    setTimeout(() => {
      if (operationalStaff.length > 0 || nonOperationalStaff.length > 0) {
        // Use the new filter type directly instead of relying on the state update
        if (newFilterType === 'operational' || newFilterType === 'all') {
          setFilteredOperationalStaff([...operationalStaff]);
        } else {
          setFilteredOperationalStaff([]);
        }
        
        if (newFilterType === 'non-operational' || newFilterType === 'all') {
          setFilteredNonOperationalStaff([...nonOperationalStaff]);
        } else {
          setFilteredNonOperationalStaff([]);
        }
        
        console.log('Filters applied immediately after type change');
      }
    }, 0);
  };

  const fetchStaffReport = () => {
    const fetchData = async () => {
      try {
        console.log("Fetching staff report");
        setLoading(true);
        setError(null);
        setPermissionDenied(false);

        const apiParams = {
          outlet_id: localStorage.getItem('outlet_id'),
          user_id: localStorage.getItem('user_id'),
          filter_type: filterType
        };

        // Add date range parameters if applicable
        if (startDate && endDate && dateRange === 'Custom Range') {
          apiParams.start_date = startDate.toISOString().split('T')[0];
          apiParams.end_date = endDate.toISOString().split('T')[0];
        } else if (dateRange !== 'All Time') {
          apiParams.date_range = dateRange;
        }

        console.log('Making API call with params:', apiParams);
        const response = await api.post(API_PATHS.staffReport, apiParams);
        
        console.log('API Response:', response.data);
        
        if (response.data && response.data.detail) {
          const data = response.data.detail;
          console.log('Staff data received:', data);
          setStaffData(data);
          
          // Process operational staff data
          let processedOperational = [];
          if (data.operational_staff && Array.isArray(data.operational_staff)) {
            console.log('Processing operational staff:', data.operational_staff);
            processedOperational = data.operational_staff.map((item, index) => ({
              ...item,
              id: `op-staff-${item.staff_id || index}`
            }));
            console.log('Processed operational staff:', processedOperational);
            setOperationalStaff(processedOperational);
          }
          
          // Process non-operational staff data
          let processedNonOperational = [];
          if (data.non_operational_staff && Array.isArray(data.non_operational_staff)) {
            console.log('Processing non-operational staff:', data.non_operational_staff);
            processedNonOperational = data.non_operational_staff.map((item, index) => ({
              ...item,
              id: `non-op-staff-${item.staff_id || index}`
            }));
            console.log('Processed non-operational staff:', processedNonOperational);
            setNonOperationalStaff(processedNonOperational);
          }
          
          // Directly set filtered data based on current filter type
          console.log('Setting filtered data with filter type:', filterType);
          if (filterType === 'operational' || filterType === 'all') {
            setFilteredOperationalStaff(processedOperational);
            console.log('Set filtered operational staff:', processedOperational.length);
          } else {
            setFilteredOperationalStaff([]);
            console.log('Cleared filtered operational staff');
          }
          
          if (filterType === 'non-operational' || filterType === 'all') {
            setFilteredNonOperationalStaff(processedNonOperational);
            console.log('Set filtered non-operational staff:', processedNonOperational.length);
          } else {
            setFilteredNonOperationalStaff([]);
            console.log('Cleared filtered non-operational staff');
          }
          
          setDataFetched(true);
          console.log('Data fetched and processed successfully');
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('Error fetching staff report:', err);
        
        if (err.response?.status === 403 || 
            err.response?.data?.detail?.includes('permission') ||
            err.response?.data?.detail?.includes('access')) {
          setPermissionDenied(true);
          setError(err.response?.data?.detail || 'You don\'t have permission to access reports management functionality');
        } else {
          setError(err.response?.data?.detail || 'Failed to fetch staff report data');
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
    fetchStaffReport();
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  // Define table columns for operational staff
  const operationalStaffColumns = [
    {
      Header: 'Name',
      accessor: 'name',
      width: '150px',
      Cell: (item) => (
        <div className="text-nowrap">
          <span className="fw-semibold">{item.name}</span>
        </div>
      ),
      exportFormat: (item) => item.name
    },
    {
      Header: 'Role',
      accessor: 'role',
      width: '120px',
      Cell: (item) => (
        <div className="text-nowrap text-capitalize">
          {item.role || 'N/A'}
        </div>
      ),
      exportFormat: (item) => item.role || 'N/A'
    },
    {
      Header: 'Mobile',
      accessor: 'mobile',
      width: '130px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.mobile}
        </div>
      ),
      exportFormat: (item) => item.mobile
    },
    {
      Header: 'Email',
      accessor: 'email',
      width: '150px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.email || 'N/A'}
        </div>
      ),
      exportFormat: (item) => item.email || 'N/A'
    },
    {
      Header: 'Address',
      accessor: 'address',
      width: '180px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.address || 'N/A'}
        </div>
      ),
      exportFormat: (item) => item.address || 'N/A'
    },
    {
      Header: 'Status',
      accessor: 'is_active',
      width: '100px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.is_active ? 'Active' : 'Inactive'}
        </div>
      ),
      exportFormat: (item) => item.is_active ? 'Active' : 'Inactive'
    },
    // {
    //   Header: 'Created On',
    //   accessor: 'created_on',
    //   width: '120px',
    //   Cell: (item) => (
    //     <div className="text-nowrap">
    //       {item.created_on}
    //     </div>
    //   ),
    //   exportFormat: (item) => item.created_on
    // },
    {
      Header: 'Last Login',
      accessor: 'last_login',
      width: '120px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.last_login || 'N/A'}
        </div>
      ),
      exportFormat: (item) => item.last_login || 'N/A'
    }
  ];

  // Define table columns for non-operational staff
  const nonOperationalStaffColumns = [
    {
      Header: 'Name',
      accessor: 'name',
      width: '150px',
      Cell: (item) => (
        <div className="text-nowrap">
          <span className="fw-semibold">{item.name}</span>
        </div>
      ),
      exportFormat: (item) => item.name
    },
    {
      Header: 'Role',
      accessor: 'role',
      width: '120px',
      Cell: (item) => (
        <div className="text-nowrap text-capitalize">
          {item.role || 'N/A'}
        </div>
      ),
      exportFormat: (item) => item.role || 'N/A'
    },
    {
      Header: 'Mobile',
      accessor: 'mobile',
      width: '130px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.mobile}
        </div>
      ),
      exportFormat: (item) => item.mobile
    },
    {
      Header: 'Address',
      accessor: 'address',
      width: '180px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.address || 'N/A'}
        </div>
      ),
      exportFormat: (item) => item.address || 'N/A'
    },
    {
      Header: 'Aadhar Number',
      accessor: 'aadhar_number',
      width: '150px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.aadhar_number || 'N/A'}
        </div>
      ),
      exportFormat: (item) => item.aadhar_number || 'N/A'
    },
    {
      Header: 'DOB',
      accessor: 'dob',
      width: '120px',
      Cell: (item) => (
        <div className="text-nowrap">
          {item.dob || 'N/A'}
        </div>
      ),
      exportFormat: (item) => item.dob || 'N/A'
    },
    // {
    //   Header: 'Created On',
    //   accessor: 'created_on',
    //   width: '120px',
    //   Cell: (item) => (
    //     <div className="text-nowrap">
    //       {item.created_on}
    //     </div>
    //   ),
    //   exportFormat: (item) => item.created_on
    // }
  ];

  // Prepare filter info for export
  const getFilterInfo = () => {
    const info = {
      'Staff Type': filterType === 'operational' ? 'Operational Staff' : 
                  filterType === 'non-operational' ? 'Non-Operational Staff' : 'All Staff',
      'Date Range': dateRange || 'All Time'
    };
    
    // Add date range info if custom dates are selected
    if (startDate && endDate && dateRange === 'Custom Range') {
      const formattedStartDate = startDate.toISOString().split('T')[0];
      const formattedEndDate = endDate.toISOString().split('T')[0];
      info['Date Range'] = `${formattedStartDate} to ${formattedEndDate}`;
    }
    
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

      {/* Staff Type Filter */}
      <Form.Select 
        value={filterType}
        onChange={handleFilterTypeChange}
        size="sm"
        style={{ width: '180px' }}
      >
        <option value="all">All Staff</option>
        <option value="operational">Operational Staff</option>
        <option value="non-operational">Non-Operational Staff</option>
      </Form.Select>

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
        onClick={fetchStaffReport}
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
      <Breadcrumb.Item active>Staff Reports</Breadcrumb.Item>
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
                  resourceName="Staff Reports"
                  onRetry={handleRetry}
                  onBack={() => navigate(-1)}
                />
              ) : error ? (
                <div className="alert alert-danger mb-4" role="alert">
                  {error}
                </div>
              ) : (
                <div>
                  {/* Operational Staff Table */}
                  {(filterType === 'all' || filterType === 'operational') && (
                    <div className="mb-4" style={{ backgroundColor: 'transparent', width: '100%', overflowX: 'auto' }}>
                      {filteredOperationalStaff && filteredOperationalStaff.length > 0 ? (
                        <ReportTable
                          data={filteredOperationalStaff}
                          columns={operationalStaffColumns}
                          title="Operational Staff Reports"
                          filterInfo={getFilterInfo()}
                          enableHorizontalScroll={true}
                          onBack={handleGoBack}
                          filterControls={renderFilterControls()}
                          dataFetched={dataFetched}
                          breadcrumbs={renderBreadcrumbs()}
                          onRefresh={fetchStaffReport}
                        />
                      ) : dataFetched ? (
                        <div className="alert alert-info mt-4">
                          <i className="fas fa-info-circle me-2"></i>
                          No operational staff data found.
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Non-Operational Staff Table */}
                  {(filterType === 'all' || filterType === 'non-operational') && (
                    <div className="mt-4" style={{ backgroundColor: 'transparent', width: '100%', overflowX: 'auto' }}>
                      {filteredNonOperationalStaff && filteredNonOperationalStaff.length > 0 ? (
                        <ReportTable
                          data={filteredNonOperationalStaff}
                          columns={nonOperationalStaffColumns}
                          title="Non-Operational Staff Reports"
                          filterInfo={getFilterInfo()}
                          enableHorizontalScroll={true}
                          onBack={handleGoBack}
                          filterControls={renderFilterControls()}
                          dataFetched={dataFetched}
                          breadcrumbs={renderBreadcrumbs()}
                          onRefresh={fetchStaffReport}
                        />
                      ) : dataFetched ? (
                        <div className="alert alert-info mt-4">
                          <i className="fas fa-info-circle me-2"></i>
                          No non-operational staff data found.
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Show filters initially if no data is fetched yet */}
                  {!dataFetched && (
                    <div style={{ backgroundColor: 'transparent', width: '100%', overflowX: 'auto' }}>
                      <ReportTable
                        data={[]}
                        columns={operationalStaffColumns}
                        title="Staff Reports"
                        filterInfo={getFilterInfo()}
                        enableHorizontalScroll={true}
                        onBack={handleGoBack}
                        filterControls={renderFilterControls()}
                        dataFetched={false}
                        breadcrumbs={renderBreadcrumbs()}
                        onRefresh={fetchStaffReport}
                      />
                    </div>
                  )}
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

export default StaffReports;
