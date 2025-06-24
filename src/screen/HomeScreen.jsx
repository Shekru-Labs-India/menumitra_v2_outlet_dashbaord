import React, { useState, useEffect, useRef } from "react";
import VerticalSidebar from "../components/VerticalSidebar";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useNavigate } from 'react-router-dom';
import { useDashboard } from "../context/DashboardContext";
import { UpdateService } from '../config/UpdateService';
import logo from "../assets/img/company/MenuMitra_logo.png";

function HomeScreen() {
  // Get data from context
  const { 
    refreshDashboard
  } = useDashboard();

  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [versionInfo, setVersionInfo] = useState(null);
  const [redirectProgress, setRedirectProgress] = useState(0);
  const [redirectTimer, setRedirectTimer] = useState(null);
  const didInitialLoadRef = useRef(false);
  const postLoginFetchedRef = useRef(false);
  const navigate = useNavigate();

  // Check if user just arrived from login/OTP verification
  const isPostLogin = () => {
    // Get the timestamp of when token was saved (if available)
    const tokenTimestamp = localStorage.getItem('token_timestamp');
    if (!tokenTimestamp) return false;
    
    // Check if token was saved recently (within last 10 seconds)
    const now = Date.now();
    const tokenTime = parseInt(tokenTimestamp, 10);
    return now - tokenTime < 10000; // 10 seconds
  };

  // Check version on component mount
  useEffect(() => {
    const checkVersion = async () => {
      const versionData = await UpdateService.checkForUpdates();
      setVersionInfo(versionData);
      
      if (versionData.hasUpdate) {
        setShowUpdatePopup(true);
        
        // Start progress bar for 5 seconds
        let progress = 0;
        const interval = setInterval(() => {
          progress += 2; // 2% per 100ms = 100% in 5 seconds
          setRedirectProgress(progress);
          
          if (progress >= 100) {
            clearInterval(interval);
            // Redirect to login after 5 seconds
            navigate('/login');
          }
        }, 100);
        
        setRedirectTimer(interval);
      }
    };
    
    checkVersion();
    
    // Cleanup interval on unmount
    return () => {
      if (redirectTimer) {
        clearInterval(redirectTimer);
      }
    };
  }, [navigate]);

  // Check if user is logged in
  useEffect(() => {
    // Don't check credentials on the login page to prevent redirect loops
    if (window.location.pathname.includes('/login')) {
      console.log('On login page, skipping auth check');
      return;
    }
    
    const userId = localStorage.getItem('user_id');
    const accessToken = localStorage.getItem('access_token');
    
    // Log auth status for debugging
    console.log('HomeScreen auth check:', { 
      hasUserId: !!userId,
      hasToken: !!accessToken,
      tokenLength: accessToken ? accessToken.length : 0,
      path: window.location.pathname,
      isPostLogin: isPostLogin(),
      didInitialLoadRef: didInitialLoadRef.current,
      postLoginFetchedRef: postLoginFetchedRef.current
    });
    
    if (!userId || !accessToken) {
      console.warn('Missing credentials in HomeScreen, redirecting to login');
      navigate('/login');
      return;
    }
    
    // Only fetch on initial mount or post-login (one time)
    if (!didInitialLoadRef.current) {
      console.log('First time load, marking initial load done');
      didInitialLoadRef.current = true;
      refreshDashboard();
      return;
    }
    
    // Handle the post-login case, but only once
    const isAfterLogin = isPostLogin();
    if (isAfterLogin && !postLoginFetchedRef.current) {
      console.log('Post-login detected, doing one-time refresh');
      postLoginFetchedRef.current = true;
      refreshDashboard();
    }
  }, [navigate, refreshDashboard]);

  // If update popup is shown, render the update popup
  if (showUpdatePopup) {
    return (
      <div className="layout-wrapper layout-content-navbar">
        <div className="layout-container">
          <div className="layout-page d-flex flex-column min-vh-100">
            <div className="content-wrapper flex-grow-1">
              <div className="container-fluid flex-grow-1 container-p-y">
                <div className="row justify-content-center">
                  <div className="col-md-8 col-lg-6">
                    <div className="card">
                      <div className="card-body p-4">
                        <div className="text-center mb-4">
                          <img
                            src={logo}
                            alt="MenuMitra Logo"
                            style={{
                              width: "150px",
                              height: "auto",
                              marginBottom: "1.5rem"
                            }}
                          />
                          <h3 className="mb-3" style={{ color: '#dc3545' }}>
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            Update Required
                          </h3>
                        </div>

                        <div className="mb-4 text-center">
                          <p className="mb-2 fs-5">Current Version: <strong>{versionInfo?.currentVersion || '1.0.0'}</strong></p>
                          <p className="mb-4 fs-5">Latest Version: <strong>{versionInfo?.serverVersion || '1.3'}</strong></p>
                        </div>

                        <p className="text-danger fs-5">
                          Please update your application to the latest version to continue.
                        </p>

                        <div className="mt-4">
                          <div className="progress mb-2" style={{ height: '10px' }}>
                            <div 
                              className="progress-bar progress-bar-striped progress-bar-animated bg-danger" 
                              role="progressbar" 
                              style={{ width: `${redirectProgress}%` }}
                              aria-valuenow={redirectProgress} 
                              aria-valuemin="0" 
                              aria-valuemax="100"
                            ></div>
                          </div>
                          <p className="text-center text-muted">
                            Redirecting to login in {Math.ceil((100 - redirectProgress) / 2)} seconds...
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
              <div className="row mb-4">
                <div className="col-12">
                  <div className="card">
                    <div className="card-body p-4">
                      <h3 className="mb-4">Welcome to MenuMitra Statistics Dashboard</h3>
                      <p className="mb-4">
                        Please use the navigation buttons below to access different sections of the dashboard.
                      </p>
                      
                      <div className="row mt-5">
                        <div className="col-md-4 mb-3">
                          <div >
                            <div>
                              <h5>
                                <i className="fas fa-chart-bar me-2 text-primary"></i>
                                Statistics
                              </h5>
                              <p className="card-text flex-grow-1">
                                View detailed analytics and reports for your outlets.
                              </p>
                              <button 
                                className="btn btn-primary mt-auto" 
                                onClick={() => navigate('/statistics')}
                              >
                                View Statistics
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="col-md-4 mb-3">
                          <div>
                            <div>
                              <h5>
                                <i className="fas fa-store me-2 text-info"></i>
                                Outlet Details
                              </h5>
                              <p className="card-text flex-grow-1">
                                Access detailed information about your current outlet.
                              </p>
                              <button 
                                className="btn btn-info mt-auto" 
                                onClick={() => navigate('/outlet-details')}
                              >
                                View Outlet Details
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="col-md-4 mb-3">
                          <div>
                            <div>
                              <h5>
                                <i className="fas fa-balance-scale me-2 text-success"></i>
                                Compare Outlets
                              </h5>
                              <p className="card-text flex-grow-1">
                                Compare performance metrics between different outlets.
                              </p>
                              <button 
                                className="btn btn-success mt-auto" 
                                onClick={() => navigate('/compare-outlets')}
                              >
                                Compare Outlets
                              </button>
                            </div>
                          </div>
                        </div>
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
    </div>
  );
}

export default HomeScreen;