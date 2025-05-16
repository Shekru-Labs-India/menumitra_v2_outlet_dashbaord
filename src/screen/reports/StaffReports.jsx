import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../../config/apiConfig';
import VerticalSidebar from '../../components/VerticalSidebar';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { ForbiddenAccessMessage } from '../../components/common';
import { useNavigate } from 'react-router-dom';

function StaffReports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [staffData, setStaffData] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [expandedRows, setExpandedRows] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchStaffReport();
  }, [filterType]);

  const toggleRow = (staffId) => {
    setExpandedRows(prev => ({
      ...prev,
      [staffId]: !prev[staffId]
    }));
  };

  const fetchStaffReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setPermissionDenied(false);

      const params = {
        outlet_id: localStorage.getItem('outlet_id'),
        user_id: localStorage.getItem('user_id'),
        filter_type: filterType
      };

      console.log('Debug - Making API call to:', API_PATHS.staffReport);
      console.log('Debug - With params:', params);

      const response = await api.post(API_PATHS.staffReport, params);
      console.log('Debug - API Response:', response.data);
      
      if (response.data && response.data.detail) {
        setStaffData(response.data.detail);
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

  const handleRetry = () => {
    fetchStaffReport();
  };

  if (permissionDenied) {
    return (
      <div className="layout-wrapper layout-content-navbar">
        <div className="layout-container">
          <VerticalSidebar />
          <div className="layout-page">
            <Header />
            <div className="content-wrapper">
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
        <div className="layout-page">
          <Header />
          <div className="content-wrapper">
            <div className="container-xxl flex-grow-1 container-p-y">
              <div className="row">
                <div className="col-12">
                  <div className="card">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">Staff Reports</h5>
                      <div className="d-flex gap-2">
                        <select 
                          className="form-select"
                          value={filterType}
                          onChange={(e) => setFilterType(e.target.value)}
                        >
                          <option value="all">All Staff</option>
                          <option value="operational">Operational Staff</option>
                          <option value="non-operational">Non-Operational Staff</option>
                        </select>

                        <button 
                          className="btn btn-primary"
                          onClick={handleRetry}
                          disabled={loading}
                        >
                          {loading ? (
                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                          ) : (
                            <i className="fas fa-sync-alt me-1"></i>
                          )}
                          Refresh
                        </button>
                      </div>
                    </div>
                    <div className="card-body">
                      {loading ? (
                        <div className="text-center py-5">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                          </div>
                        </div>
                      ) : error ? (
                        <div className="alert alert-danger" role="alert">
                          {error}
                        </div>
                      ) : staffData && (
                        <>
                          <div className="row mb-4">
                            <div className="col-md-3">
                              <div className="card bg-primary text-white">
                                <div className="card-body">
                                  <h6 className="card-title">Total Staff</h6>
                                  <h3 className="mb-0">{staffData.staff_report.total_staff}</h3>
                                </div>
                              </div>
                            </div>
                            <div className="col-md-9">
                              <div className="card">
                                <div className="card-body">
                                  <h6 className="card-title mb-3">Role Breakdown</h6>
                                  <div className="row">
                                    {Object.entries(staffData.staff_report.role_breakdown).map(([role, count]) => (
                                      <div key={role} className="col-md-4 mb-2">
                                        <div className="d-flex justify-content-between align-items-center">
                                          <span className="text-capitalize">{role}</span>
                                          <span className="badge bg-label-primary">{count}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {filterType === 'all' || filterType === 'operational' ? (
                            <div className="card mb-4">
                              <div className="card-header">
                                <h5 className="card-title mb-0">Operational Staff</h5>
                              </div>
                              <div className="card-body">
                                <div className="table-responsive">
                                  <table className="table table-hover">
                                    <thead>
                                      <tr>
                                        <th style={{ width: '5%' }}></th>
                                        <th style={{ width: '20%' }}>Name</th>
                                        <th style={{ width: '15%' }}>Role</th>
                                        <th style={{ width: '20%' }}>Contact</th>
                                        <th style={{ width: '15%' }}>Status</th>
                                        <th style={{ width: '25%' }}>Dates</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {staffData.operational_staff.map((staff) => (
                                        <React.Fragment key={staff.staff_id}>
                                          <tr 
                                            className="cursor-pointer"
                                            onClick={() => toggleRow(staff.staff_id)}
                                            style={{ cursor: 'pointer' }}
                                          >
                                            <td>
                                              <i className={`fas fa-chevron-${expandedRows[staff.staff_id] ? 'down' : 'right'} transition-all`}></i>
                                            </td>
                                            <td>
                                              <div className="d-flex flex-column">
                                                <span className="fw-semibold">{staff.name}</span>
                                               
                                              </div>
                                            </td>
                                            <td>
                                              <span className="badge bg-label-primary text-capitalize">{staff.role}</span>
                                            </td>
                                            <td>
                                              <div className="d-flex flex-column">
                                                <span>{staff.mobile}</span>
                                                {staff.email && <small className="text-muted">{staff.email}</small>}
                                              </div>
                                            </td>
                                            <td>
                                              <span className={`badge bg-${staff.is_active ? 'success' : 'danger'}`}>
                                                {staff.is_active ? 'Active' : 'Inactive'}
                                              </span>
                                            </td>
                                            <td>
                                              <div className="d-flex flex-column">
                                                <small>Created: {staff.created_on}</small>
                                                {staff.last_login && <small>Last Login: {staff.last_login}</small>}
                                              </div>
                                            </td>
                                          </tr>
                                          <tr>
                                            <td colSpan="6" className="p-0">
                                              <div 
                                                className={`collapse ${expandedRows[staff.staff_id] ? 'show' : ''}`}
                                                style={{
                                                  transition: 'all 0.3s ease-in-out',
                                                  maxHeight: expandedRows[staff.staff_id] ? '500px' : '0',
                                                  overflow: 'hidden'
                                                }}
                                              >
                                                <div className="p-3 bg-light">
                                                  <div className="row">
                                                    <div className="col-md-6">
                                                      <h6 className="mb-3">Staff Information</h6>
                                                      <div className="card">
                                                        <div className="card-body">
                                                          <div className="d-flex justify-content-between mb-2">
                                                            <span>Address:</span>
                                                            <span className="fw-semibold">{staff.address}</span>
                                                          </div>
                                                          <div className="d-flex justify-content-between mb-2">
                                                            <span>Role:</span>
                                                            <span className="fw-semibold text-capitalize">{staff.role}</span>
                                                          </div>
                                                          <div className="d-flex justify-content-between mb-2">
                                                            <span>Status:</span>
                                                            <span className={`badge bg-${staff.is_active ? 'success' : 'danger'}`}>
                                                              {staff.is_active ? 'Active' : 'Inactive'}
                                                            </span>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                      <h6 className="mb-3">Contact Details</h6>
                                                      <div className="card">
                                                        <div className="card-body">
                                                          <div className="d-flex justify-content-between mb-2">
                                                            <span>Mobile:</span>
                                                            <span>{staff.mobile}</span>
                                                          </div>
                                                          {staff.email && (
                                                            <div className="d-flex justify-content-between mb-2">
                                                              <span>Email:</span>
                                                              <span>{staff.email}</span>
                                                            </div>
                                                          )}
                                                          <div className="d-flex justify-content-between mb-2">
                                                            <span>Created On:</span>
                                                            <span>{staff.created_on}</span>
                                                          </div>
                                                          {staff.last_login && (
                                                            <div className="d-flex justify-content-between mb-2">
                                                              <span>Last Login:</span>
                                                              <span>{staff.last_login}</span>
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
                                  </table>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {filterType === 'all' || filterType === 'non-operational' ? (
                            <div className="card">
                              <div className="card-header">
                                <h5 className="card-title mb-0">Non-Operational Staff</h5>
                              </div>
                              <div className="card-body">
                                <div className="table-responsive">
                                  <table className="table table-hover">
                                    <thead>
                                      <tr>
                                        <th style={{ width: '5%' }}></th>
                                        <th style={{ width: '20%' }}>Name</th>
                                        <th style={{ width: '15%' }}>Role</th>
                                        <th style={{ width: '20%' }}>Contact</th>
                                        <th style={{ width: '20%' }}>Additional Info</th>
                                        <th style={{ width: '20%' }}>Created On</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {staffData.non_operational_staff.map((staff) => (
                                        <React.Fragment key={staff.staff_id}>
                                          <tr 
                                            className="cursor-pointer"
                                            onClick={() => toggleRow(staff.staff_id)}
                                            style={{ cursor: 'pointer' }}
                                          >
                                            <td>
                                              <i className={`fas fa-chevron-${expandedRows[staff.staff_id] ? 'down' : 'right'} transition-all`}></i>
                                            </td>
                                            <td>
                                              <div className="d-flex flex-column">
                                                <span className="fw-semibold">{staff.name}</span>
                                               
                                              </div>
                                            </td>
                                            <td>
                                              <span className="badge bg-label-primary text-capitalize">{staff.role}</span>
                                            </td>
                                            <td>
                                              <div className="d-flex flex-column">
                                                <span>{staff.mobile}</span>
                                                {staff.email && <small className="text-muted">{staff.email}</small>}
                                              </div>
                                            </td>
                                            <td>
                                              <div className="d-flex flex-column">
                                                {staff.aadhar_number && <small>Aadhar: {staff.aadhar_number}</small>}
                                                {staff.dob && <small>DOB: {staff.dob}</small>}
                                              </div>
                                            </td>
                                            <td>{staff.created_on}</td>
                                          </tr>
                                          <tr>
                                            <td colSpan="6" className="p-0">
                                              <div 
                                                className={`collapse ${expandedRows[staff.staff_id] ? 'show' : ''}`}
                                                style={{
                                                  transition: 'all 0.3s ease-in-out',
                                                  maxHeight: expandedRows[staff.staff_id] ? '500px' : '0',
                                                  overflow: 'hidden'
                                                }}
                                              >
                                                <div className="p-3 bg-light">
                                                  <div className="row">
                                                    <div className="col-md-6">
                                                      <h6 className="mb-3">Staff Information</h6>
                                                      <div className="card">
                                                        <div className="card-body">
                                                          <div className="d-flex justify-content-between mb-2">
                                                            <span>Address:</span>
                                                            <span className="fw-semibold">{staff.address}</span>
                                                          </div>
                                                          <div className="d-flex justify-content-between mb-2">
                                                            <span>Role:</span>
                                                            <span className="fw-semibold text-capitalize">{staff.role}</span>
                                                          </div>
                                                          {staff.aadhar_number && (
                                                            <div className="d-flex justify-content-between mb-2">
                                                              <span>Aadhar Number:</span>
                                                              <span>{staff.aadhar_number}</span>
                                                            </div>
                                                          )}
                                                          {staff.dob && (
                                                            <div className="d-flex justify-content-between mb-2">
                                                              <span>Date of Birth:</span>
                                                              <span>{staff.dob}</span>
                                                            </div>
                                                          )}
                                                        </div>
                                                      </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                      <h6 className="mb-3">Contact Details</h6>
                                                      <div className="card">
                                                        <div className="card-body">
                                                          <div className="d-flex justify-content-between mb-2">
                                                            <span>Mobile:</span>
                                                            <span>{staff.mobile}</span>
                                                          </div>
                                                          {staff.email && (
                                                            <div className="d-flex justify-content-between mb-2">
                                                              <span>Email:</span>
                                                              <span>{staff.email}</span>
                                                            </div>
                                                          )}
                                                          <div className="d-flex justify-content-between mb-2">
                                                            <span>Created On:</span>
                                                            <span>{staff.created_on}</span>
                                                          </div>
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
                                  </table>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}

export default StaffReports; 