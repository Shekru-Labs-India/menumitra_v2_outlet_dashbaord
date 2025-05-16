import React, { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';

const MyProfile = () => {
  const [userDetails, setUserDetails] = useState({
    user_name: '',
    user_id: '',
    owner_id: '',
    outlet_id: '',
    mobile_number: '',
    role: '',
    email: '',
    address: ''
  });
  
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    // Get user details from localStorage
    const userData = {
      user_name: localStorage.getItem('user_name') || '',
      user_id: localStorage.getItem('user_id') || '',
      owner_id: localStorage.getItem('owner_id') || '',
      outlet_id: localStorage.getItem('outlet_id') || '',
      mobile_number: localStorage.getItem('mobile_number') || '',
      role: localStorage.getItem('role') || 'owner',
      email: localStorage.getItem('email') || '',
      address: localStorage.getItem('address') || ''
    };
    
    setUserDetails(userData);
    setFormData(userData);
  }, []);

  const handleEditToggle = () => {
    setEditMode(!editMode);
    // Reset form data when entering edit mode
    if (!editMode) {
      setFormData({ ...userDetails });
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
      // Example API call to update user profile
      // This should be replaced with your actual API endpoint
      // const response = await axios.post(`${apiEndpoint}update_profile`, formData);
      
      // For now, we'll just simulate a successful update
      // and update localStorage with the new values
      
      // Update localStorage
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          localStorage.setItem(key, formData[key]);
        }
      });

      // Update state
      setUserDetails(formData);
      setSuccess('Profile updated successfully!');
      setEditMode(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderInfoItem = (icon, label, value) => (
    <div className="d-flex align-items-center mb-3">
      <div className="me-3" style={{ width: '2rem', textAlign: 'center' }}>
        <i className={`fas ${icon} fs-4`}></i>
      </div>
      <div>
        <div className="text-muted small">{label}</div>
        <div className="fw-medium">{value || 'Not provided'}</div>
      </div>
    </div>
  );

  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        <div className="layout-page w-100">
          <Header />
          <div className="content-wrapper flex-grow-1">
            <div className="container-xxl flex-grow-1 container-p-y">
              <h4 className="fw-bold py-3 mb-4">
                <span className="text-muted fw-light">Account /</span> My Profile
              </h4>
              
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="alert alert-success" role="alert">
                  {success}
                </div>
              )}

              <div className="row">
                <div className="col-12">
                  <div className="card mb-4">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <h5 className="mb-0">Profile Details</h5>
                      <button 
                        className={`btn btn-${editMode ? "outline-secondary" : "primary"} btn-sm`}
                        onClick={handleEditToggle}
                      >
                        {editMode ? (
                          <>
                            <i className="fas fa-times me-2"></i>
                            Cancel
                          </>
                        ) : (
                          <>
                            <i className="fas fa-edit me-2"></i>
                            Edit Profile
                          </>
                        )}
                      </button>
                    </div>
                    
                    <div className="card-body">
                      {!editMode ? (
                        <div className="row">
                          <div className="col-md-6">
                            {renderInfoItem("fa-user text-primary", "User Name", userDetails.user_name)}
                            {renderInfoItem("fa-id-card text-success", "User ID", userDetails.user_id)}
                            {renderInfoItem("fa-mobile text-warning", "Mobile Number", userDetails.mobile_number)}
                          </div>
                          <div className="col-md-6">
                            {renderInfoItem("fa-store text-info", "Outlet ID", userDetails.outlet_id)}
                            {renderInfoItem("fa-user-tag text-danger", "Role", userDetails.role?.toUpperCase())}
                            {renderInfoItem("fa-id-badge text-secondary", "Owner ID", userDetails.owner_id)}
                          </div>
                        </div>
                      ) : (
                        <form onSubmit={handleSubmit}>
                          <div className="row g-3">
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">User Name</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  name="user_name"
                                  value={formData.user_name || ''}
                                  onChange={handleInputChange}
                                  placeholder="Enter your name"
                                />
                              </div>
                              
                              <div className="mb-3">
                                <label className="form-label">Mobile Number</label>
                                <input
                                  type="tel"
                                  className="form-control"
                                  name="mobile_number"
                                  value={formData.mobile_number || ''}
                                  onChange={handleInputChange}
                                  placeholder="Enter mobile number"
                                  disabled
                                />
                                <small className="text-muted">
                                  Mobile number cannot be changed as it's used for login.
                                </small>
                              </div>
                              
                              <div className="mb-3">
                                <label className="form-label">Email (Optional)</label>
                                <input
                                  type="email"
                                  className="form-control"
                                  name="email"
                                  value={formData.email || ''}
                                  onChange={handleInputChange}
                                  placeholder="Enter your email"
                                />
                              </div>
                            </div>
                            
                            <div className="col-md-6">
                              <div className="mb-3">
                                <label className="form-label">Role</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={formData.role?.toUpperCase() || 'OWNER'}
                                  disabled
                                />
                                <small className="text-muted">
                                  Role cannot be changed. Contact support for role changes.
                                </small>
                              </div>
                              
                              <div className="mb-3">
                                <label className="form-label">Address (Optional)</label>
                                <textarea
                                  className="form-control"
                                  name="address"
                                  value={formData.address || ''}
                                  onChange={handleInputChange}
                                  rows={3}
                                  placeholder="Enter your address"
                                ></textarea>
                              </div>
                            </div>
                            
                            <div className="col-12 mt-4">
                              <div className="d-flex justify-content-end gap-2">
                                <button 
                                  type="button"
                                  className="btn btn-outline-secondary" 
                                  onClick={handleEditToggle}
                                  disabled={loading}
                                >
                                  Cancel
                                </button>
                                <button 
                                  type="submit"
                                  className="btn btn-primary" 
                                  disabled={loading}
                                >
                                  {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
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