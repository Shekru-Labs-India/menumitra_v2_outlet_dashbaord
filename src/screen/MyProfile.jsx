import React, { useState, useEffect } from 'react';
import { api, API_PATHS } from '../config/apiConfig';
import VerticalSidebar from "../components/VerticalSidebar";
import Header from "../components/Header";
import Footer from "../components/Footer";

const MyProfile = () => {
  const [userDetails, setUserDetails] = useState({
    user_id: '',
    name: '',
    role: '',
    dob: null,
    email: null,
    mobile_number: '',
    aadhar_number: '',
    last_login: '',
    created_on: '',
    updated_on: null,
    created_by: '',
    updated_by: null
  });
  
  const [activeSessions, setActiveSessions] = useState([]);
  const [userFunctionalities, setUserFunctionalities] = useState([]);
  const [subscriptionOutlets, setSubscriptionOutlets] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Function to handle API errors
  const handleApiError = (error) => {
    console.error('API Error:', error);
    
    if (error.response) {
      // Handle specific error status codes
      if (error.response.status === 401) {
        console.error('Unauthorized access');
        // You may want to redirect to login page here
      }
      
      return error.response.data?.message || 'An error occurred. Please try again.';
    } else if (error.request) {
      return 'No response from server. Please check your internet connection.';
    } else {
      return 'Error setting up request. Please try again.';
    }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      try {
        const user_id = localStorage.getItem("user_id");
        if (!user_id) {
          setError('User ID not found');
          setLoading(false);
          return;
        }

        // Simplified payload based on the provided API format
        const payload = { 
          user_id: Number(user_id)
        };

        console.log('Sending payload:', payload);
        const response = await api.post(API_PATHS.viewProfileDetail, payload);
        console.log('Profile response:', response.data);

        // Check for successful response based on data structure
        if (response.data && response.data.data) {
          const { user_details, user_active_sessions } = response.data.data;
          
          if (!user_details) {
            setError('User details not found in response');
            setLoading(false);
            return;
          }
          
          // Format the date of birth for display
          const formattedUserData = {
            ...user_details,
            dob: user_details.dob ? formatDateForDisplay(user_details.dob) : 'Not provided'
          };
          
          setUserDetails(formattedUserData);
          setActiveSessions(user_active_sessions || []);
          
          setFormData({
            ...formattedUserData,
            dob: user_details.dob ? formatDateForInput(user_details.dob) : ''
          });
          
          setError(''); // Clear any previous errors
        } else {
          setError(response.data.detail || 'Failed to fetch user profile');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        const errorMessage = handleApiError(error);
        setError(errorMessage || 'Failed to fetch user profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleEditToggle = () => {
    setEditMode(!editMode);
    // Reset form data when entering edit mode
    if (!editMode) {
      // Convert date to input format when entering edit mode
      setFormData({
        ...userDetails,
        dob: userDetails.dob ? formatDateForInput(userDetails.dob) : ''
      });
    }
    // Clear any messages
    setError('');
    setSuccess('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Format date to match API requirement (e.g., "06 oct 1990")
      const formatDateForAPI = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        
        const day = String(date.getDate()).padStart(2, '0');
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        
        return `${day} ${month} ${year}`;
      };

      // Simplified payload based on the provided API format
      const payload = {
        update_user_id: Number(localStorage.getItem("user_id")),
        user_id: Number(localStorage.getItem("user_id")),
        name: formData.name,
        email: formData.email,
        mobile_number: formData.mobile_number,
        dob: formatDateForAPI(formData.dob),
        aadhar_number: formData.aadhar_number
      };

      console.log('Update profile payload:', payload);
      // Use PATCH method for updating profile as specified
      const response = await api.patch(API_PATHS.updateProfileDetail, payload);
      console.log('Update profile response:', response.data);

      if (response.data && response.data.message) {
        // Get current timestamp
        const now = new Date();
        const formattedTimestamp = now.toLocaleString('en-US', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          second: '2-digit'
        });

        // Update state with formatted date and new timestamp
        const updatedUserDetails = {
          ...formData,
          dob: formatDateForDisplay(formData.dob),
          updated_on: formattedTimestamp,
          updated_by: userDetails.role // Using the user's role as the updater
        };

        setUserDetails(updatedUserDetails);
        setSuccess(response.data.message || 'Profile updated successfully!');
        setEditMode(false);
      } else {
        setError(response.data.detail || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      const errorMessage = handleApiError(error);
      setError(errorMessage || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Format date for display in view mode
  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return 'Not provided';
    try {
      // If the date is already in "DD MMM YYYY" format, return it as is
      if (typeof dateStr === 'string' && dateStr.match(/^\d{2} [A-Za-z]{3} \d{4}$/)) {
        return dateStr;
      }
      
      // If it's a date object or ISO string, format it
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Not provided';
      
      const day = String(date.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      
      return `${day} ${month} ${year}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Not provided';
    }
  };

  // Format date for input field
  const formatDateForInput = (dateStr) => {
    if (!dateStr || dateStr === 'Not provided') return '';
    try {
      // If the date is in "DD MMM YYYY" format, convert it to YYYY-MM-DD
      if (typeof dateStr === 'string' && dateStr.match(/^\d{2} [A-Za-z]{3} \d{4}$/)) {
        const [day, month, year] = dateStr.split(' ');
        const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(month);
        if (monthIndex !== -1) {
          // Create date in UTC to avoid timezone offset
          const date = new Date(Date.UTC(parseInt(year), monthIndex, parseInt(day)));
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        }
      }
      
      // If it's a date object or ISO string, format it
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        // Create new UTC date to avoid timezone offset
        const utcDate = new Date(Date.UTC(
          dateObj.getFullYear(),
          dateObj.getMonth(),
          dateObj.getDate()
        ));
        return utcDate.toISOString().split('T')[0];
      }
      return '';
    } catch (error) {
      console.error('Error formatting date for input:', error);
      return '';
    }
  };

  // Create a gradient background based on the role
  const getBannerGradient = () => {
    return 'linear-gradient(135deg, rgb(107, 70, 193) 0%, rgb(159, 122, 234) 50%, rgb(183, 148, 244) 100%)';
  };

  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        <VerticalSidebar />
        <div className="layout-page d-flex flex-column min-vh-100">
          <Header />
          <div className="content-wrapper flex-grow-1">
            <div className="container-xxl flex-grow-1 container-p-y">
              {/* Loading Indicator */}
              {loading && (
                <div className="text-center py-3">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="mt-2 text-muted">Loading profile information...</p>
                </div>
              )}
            
              {/* Error and Success Messages */}
              {error && (
                <div className="alert alert-danger mb-4" role="alert">
                  {error}
                </div>
              )}

              {success && (
                <div className="alert alert-success mb-4" role="alert">
                  {success}
                </div>
              )}

              {/* Profile Card with Banner */}
              <div className="card mb-5">
                {/* Colorful Banner */}
                <div
                  className="card-header p-0"
                  style={{
                    height: "230px",
                    background: getBannerGradient(),
                    borderTopLeftRadius: "inherit",
                    borderTopRightRadius: "inherit",
                  }}
                ></div>

                {/* Profile Info Section */}
                <div className="card-body position-relative pt-4 pb-3 px-4">
                  {/* Profile Image */}
                  <div
                    className="position-absolute"
                    style={{ top: "-75px", left: "35px" }}
                  >
                    <div
                      className="avatar avatar-xl d-flex align-items-center justify-content-center"
                      style={{
                        width: "110px",
                        height: "110px",
                        border: "5px solid white",
                        borderRadius: "8px",
                        background: "white",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                      }}
                    >
                      <i className="far fa-user-circle fa-4x text-gray"></i>
                    </div>
                  </div>

                  {/* Profile Details and Edit Button */}
                  <div className="d-flex justify-content-between align-items-center mt-4 mb-2 ps-2">
                    <div className="ms-5 ">
                      <div className="mt-2 fs-5 fw-bold">
                        {userDetails.name}
                      </div>
                      <small className="text-muted mb-1">
                        {userDetails.role}
                      </small>
                    </div>
                    <button
                      className="btn btn-primary rounded-pill px-4"
                      onClick={handleEditToggle}
                      disabled={loading}
                    >
                      <i
                        className={`fas ${
                          editMode ? "fa-times" : "fa-edit"
                        } me-2`}
                      ></i>
                      {editMode ? "Cancel" : "Update Profile"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Profile Information Section */}
              <div className="row g-4">
                <div className="col-12 col-md-6">
                  <div className="card h-100 shadow-sm">
                    <div className="card-body p-4">
                      <h5 className="card-title text-uppercase mb-4 fw-bold">
                        <i className="fas fa-user-circle me-2 text-primary"></i>
                        ABOUT
                      </h5>

                      {!editMode ? (
                        <div className="ps-2">
                          <div className="mb-4">
                          
                            <div className="fs-5 fw-bold">
                              {userDetails.name}
                            </div>
                            <div className="text-muted small mb-1">Name</div>
                            
                          </div>

                          <div className="mb-4">
                            <div className="fs-5 fw-bold">
                           
                              {userDetails.email || "Not provided"}
                            </div>
                            <div className="text-muted small mb-1">Email</div>
                          
                          </div>

                          <div className="mb-4">
                          
                            <div className="fs-5 fw-bold">
                              {userDetails.mobile_number}
                            </div>
                            <div className="text-muted small mb-1">Mobile</div>
                            
                          </div>

                          <div className="mb-4">
                          
                            <div className="fs-5 fw-bold">
                              {userDetails.aadhar_number}
                            </div>
                            <div className="text-muted small mb-1">Aadhar Number</div>
                           
                          </div>

                          <div className="mb-4">
                          
                            <div className="fs-5 fw-bold">
                              {formatDateForDisplay(userDetails.dob)}
                            </div>
                            <div className="text-muted small mb-1">Date of Birth</div>
                            
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={handleSubmit} className="px-2">
                          <div className="mb-4">
                            <label className="form-label fw-semibold mb-2">Name</label>
                            <input
                              type="text"
                              className="form-control form-control-lg"
                              name="name"
                              value={formData.name || ""}
                              onChange={handleInputChange}
                              placeholder="Enter your name"
                            />
                          </div>

                          <div className="mb-4">
                            <label className="form-label fw-semibold mb-2">Email</label>
                            <input
                              type="email"
                              className="form-control form-control-lg"
                              name="email"
                              value={formData.email || ""}
                              onChange={handleInputChange}
                              placeholder="Enter your email"
                            />
                          </div>

                          <div className="mb-4">
                            <label className="form-label fw-semibold mb-2">Mobile Number</label>
                            <input
                              type="tel"
                              className="form-control form-control-lg"
                              name="mobile_number"
                              value={formData.mobile_number || ""}
                              onChange={handleInputChange}
                              placeholder="Enter mobile number"
                              disabled
                            />
                            <small className="text-danger mt-1 d-block">
                              (Mobile number cannot be changed as it's used for login.)
                            </small>
                          </div>

                          <div className="mb-4">
                            <label className="form-label fw-semibold mb-2">Aadhar Number</label>
                            <input
                              type="text"
                              className="form-control form-control-lg"
                              name="aadhar_number"
                              value={formData.aadhar_number || ""}
                              onChange={handleInputChange}
                              placeholder="Enter your aadhar number"
                            />
                          </div>

                          <div className="mb-4">
                            <label className="form-label fw-semibold mb-2">Date of Birth</label>
                            <div className="position-relative">
                              <input
                                type="date"
                                className="form-control form-control-lg"
                                name="dob"
                                value={formData.dob || ""}
                                onChange={handleInputChange}
                                max={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                          </div>

                          <div className="mt-5">
                            <button
                              type="submit"
                              className="btn btn-primary btn-lg w-100"
                              disabled={loading}
                            >
                              {loading ? (
                                <>
                                  <i className="fas fa-circle-notch fa-spin me-2"></i>
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-save me-2"></i>Save
                                  Changes
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="card shadow-sm mb-4">
                    <div className="card-body p-4">
                      <h5 className="card-title text-uppercase mb-4 fw-bold">
                        <i className="fas fa-store me-2 text-primary"></i>
                        ACCOUNT INFORMATION
                      </h5>
                      <div className="row">
                        <div className="col-12 col-md-6 mb-3">
                          <div className="d-flex flex-column">
                            <span className="fw-bold">
                              {userDetails.created_on || 'Not available'}
                            </span>
                            <small className="text-muted mb-1">
                              Created On
                            </small>
                          </div>
                        </div>
                        <div className="col-12 col-md-6 mb-3">
                          <div className="d-flex flex-column">
                            <span className="fw-bold">
                              {userDetails.created_by || 'System'}
                            </span>
                            <small className="text-muted mb-1">
                              Created By
                            </small>
                          </div>
                        </div>
                        <div className="col-12 col-md-6 mb-3">
                          <div className="d-flex flex-column">
                            <span className="fw-bold">
                              {userDetails.updated_on || 'Not updated'}
                            </span>
                            <small className="text-muted mb-1">
                              Updated On
                            </small>
                          </div>
                        </div>
                        <div className="col-12 col-md-6 mb-3">
                          <div className="d-flex flex-column">
                            <span className="fw-bold">
                              {userDetails.updated_by || 'Not updated'}
                            </span>
                            <small className="text-muted mb-1">
                              Updated By
                            </small>
                          </div>
                        </div>
                        <div className="d-flex flex-column">
                          <span className="fw-bold">
                            {userDetails.last_login || 'Never logged in'}
                          </span>
                          <small className="text-muted mb-1">Last Login</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  {activeSessions && activeSessions.length > 0 && (
                    <div className="card shadow-sm mb-4">
                      <div className="card-body p-4">
                        <h5 className="card-title text-uppercase mb-4 fw-bold">
                          <i className="fas fa-mobile-alt me-2 text-primary"></i>
                          ACTIVE SESSIONS
                        </h5>
                        <div className="table-responsive">
                          <table className="table table-sm table-hover">
                            <thead>
                              <tr>
                                <th>Device</th>
                                <th>Last Activity</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeSessions.slice(0, 5).map((session, index) => (
                                <tr key={index}>
                                  <td>
                                    <i className={`fas ${session.device_model.includes('Windows') ? 'fa-desktop' : 'fa-mobile-alt'} me-2 text-muted`}></i>
                                    {session.device_model}
                                  </td>
                                  <td>{session.last_activity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {activeSessions.length > 5 && (
                          <p className="text-muted small mt-2">
                            +{activeSessions.length - 5} more active sessions not shown
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyProfile;