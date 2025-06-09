import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../../config/apiConfig';
import {
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
  Row,
  Col,
  Form
} from 'react-bootstrap';
import VerticalSidebar from '../../components/VerticalSidebar';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { ForbiddenAccessMessage, ReportTable, ReportFilters } from '../../components/common';
import { useNavigate } from 'react-router-dom';

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
  const [filterParams, setFilterParams] = useState(null);
  
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

  const fetchStaffReport = async (params = {}) => {
    try {
      console.log("Fetching staff report with params:", params);
      setLoading(true);
      setError(null);
      setPermissionDenied(false);

      // Update filter type if provided in params
      const currentFilterType = params.staff_type || filterType;
      if (params.staff_type) {
        setFilterType(currentFilterType);
      }

      const apiParams = {
        outlet_id: localStorage.getItem('outlet_id'),
        user_id: localStorage.getItem('user_id'),
        filter_type: currentFilterType
      };

      // Add date range parameters if applicable
      if (params.start_date && params.end_date) {
        apiParams.start_date = params.start_date.toISOString().split('T')[0];
        apiParams.end_date = params.end_date.toISOString().split('T')[0];
      } else if (params.date_range && params.date_range !== 'All Time') {
        apiParams.date_range = params.date_range;
      }

      // Store filter params for export info
      setFilterParams(params);

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
        console.log('Setting filtered data with filter type:', currentFilterType);
        if (currentFilterType === 'operational' || currentFilterType === 'all') {
          setFilteredOperationalStaff(processedOperational);
          console.log('Set filtered operational staff:', processedOperational.length);
        } else {
          setFilteredOperationalStaff([]);
          console.log('Cleared filtered operational staff');
        }
        
        if (currentFilterType === 'non-operational' || currentFilterType === 'all') {
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

  const handleRetry = () => {
    fetchStaffReport(filterParams || {});
  };

  // Define table columns for operational staff
  const operationalStaffColumns = [
    {
      Header: 'Name',
      accessor: 'name',
      width: '20%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          <span className="fw-semibold">{item.name}</span>
        </div>
      ),
      exportFormat: (item) => item.name
    },
    {
      Header: 'Role',
      accessor: 'role',
      width: '15%',
      Cell: (item) => (
        <Badge bg="primary" className="text-capitalize">
          {item.role || 'N/A'}
        </Badge>
      ),
      exportFormat: (item) => item.role || 'N/A'
    },
    {
      Header: 'Contact',
      accessor: 'mobile',
      width: '20%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          <span>{item.mobile}</span>
          {item.email && <small className="text-muted">{item.email}</small>}
        </div>
      ),
      exportFormat: (item) => `${item.mobile}${item.email ? ` / ${item.email}` : ''}`
    },
    {
      Header: 'Status',
      accessor: 'is_active',
      width: '15%',
      Cell: (item) => (
        <Badge bg={item.is_active ? 'success' : 'danger'}>
          {item.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
      exportFormat: (item) => item.is_active ? 'Active' : 'Inactive'
    },
    {
      Header: 'Dates',
      accessor: 'created_on',
      width: '25%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          <small>Created: {item.created_on}</small>
          {item.last_login && <small>Last Login: {item.last_login}</small>}
        </div>
      ),
      exportFormat: (item) => `Created: ${item.created_on}${item.last_login ? `, Last Login: ${item.last_login}` : ''}`
    }
  ];

  // Define table columns for non-operational staff
  const nonOperationalStaffColumns = [
    {
      Header: 'Name',
      accessor: 'name',
      width: '20%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          <span className="fw-semibold">{item.name}</span>
        </div>
      ),
      exportFormat: (item) => item.name
    },
    {
      Header: 'Role',
      accessor: 'role',
      width: '15%',
      Cell: (item) => (
        <Badge bg="primary" className="text-capitalize">
          {item.role || 'N/A'}
        </Badge>
      ),
      exportFormat: (item) => item.role || 'N/A'
    },
    {
      Header: 'Contact',
      accessor: 'mobile',
      width: '20%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          <span>{item.mobile}</span>
        </div>
      ),
      exportFormat: (item) => item.mobile
    },
    {
      Header: 'Additional Info',
      accessor: 'aadhar_number',
      width: '20%',
      Cell: (item) => (
        <div className="d-flex flex-column">
          {item.aadhar_number && <small>Aadhar: {item.aadhar_number}</small>}
          {item.dob && <small>DOB: {item.dob}</small>}
        </div>
      ),
      exportFormat: (item) => {
        let info = [];
        if (item.aadhar_number) info.push(`Aadhar: ${item.aadhar_number}`);
        if (item.dob) info.push(`DOB: ${item.dob}`);
        return info.join(', ') || '-';
      }
    },
    {
      Header: 'Created On',
      accessor: 'created_on',
      width: '20%',
      Cell: (item) => <span>{item.created_on}</span>,
      exportFormat: (item) => item.created_on
    }
  ];

  // Define expandable content for operational staff
  const renderOperationalStaffDetails = (item) => {
    console.log('Rendering operational staff details for:', item);
    return (
      <>
        <h6 className="mb-3 text-primary">
          <i className="fas fa-user me-2"></i>
          Staff Details
        </h6>
        <div className="row">
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">Name:</span>
                  <span>{item.name}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">Role:</span>
                  <span className="text-capitalize">{item.role}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">Status:</span>
                  <span className={`badge bg-${item.is_active ? 'success' : 'danger'}`}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">Address:</span>
                  <span>{item.address || 'Not provided'}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">Mobile:</span>
                  <span>{item.mobile}</span>
                </div>
                {item.email && (
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold">Email:</span>
                    <span>{item.email}</span>
                  </div>
                )}
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">Created On:</span>
                  <span>{item.created_on}</span>
                </div>
                {item.last_login && (
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold">Last Login:</span>
                    <span>{item.last_login}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Define expandable content for non-operational staff
  const renderNonOperationalStaffDetails = (item) => {
    console.log('Rendering non-operational staff details for:', item);
    return (
      <>
        <h6 className="mb-3 text-primary">
          <i className="fas fa-user me-2"></i>
          Staff Details
        </h6>
        <div className="row">
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">Name:</span>
                  <span>{item.name}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">Role:</span>
                  <span className="text-capitalize">{item.role}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">Address:</span>
                  <span>{item.address || 'Not provided'}</span>
                </div>
                {item.aadhar_number && (
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold">Aadhar Number:</span>
                    <span>{item.aadhar_number}</span>
                  </div>
                )}
                {item.dob && (
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold">Date of Birth:</span>
                    <span>{item.dob}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">Mobile:</span>
                  <span>{item.mobile}</span>
                </div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold">Created On:</span>
                  <span>{item.created_on}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Prepare filter info for export
  const getFilterInfo = () => {
    const info = {
      'Staff Type': filterType === 'operational' ? 'Operational Staff' : 
                  filterType === 'non-operational' ? 'Non-Operational Staff' : 'All Staff'
    };
    
    // Add date range info if available
    if (filterParams) {
      if (filterParams.start_date && filterParams.end_date) {
        info['Date Range'] = `${filterParams.start_date.toLocaleDateString()} - ${filterParams.end_date.toLocaleDateString()}`;
      } else if (filterParams.date_range && filterParams.date_range !== 'All Time') {
        info['Date Range'] = filterParams.date_range;
      }
    }
    
    return info;
  };

  if (permissionDenied) {
    return (
      <div className="layout-wrapper layout-content-navbar">
        <div className="layout-container">
          <VerticalSidebar />
          <div className="layout-page d-flex flex-column min-vh-100">
            <Header />
            <div className="content-wrapper flex-grow-1">
              <ForbiddenAccessMessage 
                title="Permission Denied" 
                message={error}
                resourceName="Staff Reports"
                onRetry={handleRetry}
                onBack={() => navigate(-1)}
              />
            </div>
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        <VerticalSidebar />
        <div className="layout-page d-flex flex-column min-vh-100">
          <Header />
          <div className="content-wrapper flex-grow-1">
            <div className="container-fluid flex-grow-1 container-p-y">
              {error ? (
                <div className="alert alert-danger mb-4" role="alert">
                  {error}
                </div>
              ) : (
                <Card>
                  <CardHeader className="bg-white">
                    <CardTitle className="text-center w-100 mb-0 fw-bold text-primary">Staff Reports</CardTitle>
                  </CardHeader>

                  <CardBody>
                    {/* Filters Section */}
                    <ReportFilters
                      isLoading={loading}
                      onSubmit={fetchStaffReport}
                      defaultDateRange="All Time"
                    >
                      {/* Staff Type Filter */}
                      <Form.Select 
                        name="staff_type"
                        value={filterType}
                        onChange={handleFilterTypeChange}
                        style={{ width: '200px' }}
                      >
                        <option value="all">All Staff</option>
                        <option value="operational">Operational Staff</option>
                        <option value="non-operational">Non-Operational Staff</option>
                      </Form.Select>
                    </ReportFilters>

                    {/* Loading Indicator */}
                    {loading && (
                      <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <p className="mt-2">Loading staff data...</p>
                      </div>
                    )}

                    {/* Summary Cards */}
                    {!loading && dataFetched && staffData && (
                      <Row className="mb-4">
                        <Col md={3}>
                          <Card className="h-100">
                            <CardBody className="bg-primary text-white">
                              <h6 className="card-title">Total Staff</h6>
                              <h3 className="mb-0">{staffData.staff_report.total_staff}</h3>
                            </CardBody>
                          </Card>
                        </Col>
                        <Col md={9}>
                          <Card className="h-100">
                            <CardBody>
                              <h6 className="card-title mb-3">Role Breakdown</h6>
                              <Row>
                                {Object.entries(staffData.staff_report.role_breakdown).map(([role, count]) => (
                                  <Col key={role} md={4} className="mb-2">
                                    <div className="d-flex justify-content-between align-items-center">
                                      <span className="text-capitalize">{role}</span>
                                      <Badge bg="primary">{count}</Badge>
                                    </div>
                                  </Col>
                                ))}
                              </Row>
                            </CardBody>
                          </Card>
                        </Col>
                      </Row>
                    )}

                    {/* Operational Staff Table */}
                    {!loading && dataFetched && (filterType === 'all' || filterType === 'operational') && (
                      <div className="mb-4">
                        {filteredOperationalStaff && filteredOperationalStaff.length > 0 ? (
                          <ReportTable
                            data={filteredOperationalStaff}
                            columns={operationalStaffColumns}
                            title="Operational Staff"
                            expandableContent={renderOperationalStaffDetails}
                            filterInfo={getFilterInfo()}
                          />
                        ) : (
                          <div className="alert alert-info mt-4">
                            <i className="fas fa-info-circle me-2"></i>
                            No operational staff data found.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Non-Operational Staff Table */}
                    {!loading && dataFetched && (filterType === 'all' || filterType === 'non-operational') && (
                      <div className="mt-4">
                        {filteredNonOperationalStaff && filteredNonOperationalStaff.length > 0 ? (
                          <ReportTable
                            data={filteredNonOperationalStaff}
                            columns={nonOperationalStaffColumns}
                            title="Non-Operational Staff"
                            expandableContent={renderNonOperationalStaffDetails}
                            filterInfo={getFilterInfo()}
                          />
                        ) : (
                          <div className="alert alert-info mt-4">
                            <i className="fas fa-info-circle me-2"></i>
                            No non-operational staff data found.
                          </div>
                        )}
                      </div>
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

export default StaffReports;
