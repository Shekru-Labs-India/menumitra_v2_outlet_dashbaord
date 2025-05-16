import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, CardContent, Box, CircularProgress, Alert, 
  Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Pagination, Typography
} from '@mui/material';
import VerticalSidebar from '../components/VerticalSidebar';
import Header from '../components/Header';
import debounce from 'lodash/debounce';
import { api, API_PATHS } from '../config/apiConfig';

const MyActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState({
    totalRecords: 0,
    currentPage: 1,
    totalPages: 1,
    recordsPerPage: 10,
    showingRecords: '0 to 0'
  });
  const itemsPerPage = 10;

  useEffect(() => {
    fetchActivityLog(page, searchTerm);
  }, [page, searchTerm]);

  const fetchActivityLog = async (currentPage, search = '') => {
    try {
      setLoading(true);
      setError(null);

      const userId = localStorage.getItem('user_id');
      
      if (!userId) {
        setError('User ID not found. Please check your login.');
        return;
      }

      // Use the simplified payload based on the provided API format
      const response = await api.post(API_PATHS.activitiesLog, {
        user_id: Number(userId)
      });

      console.log('Activity log response:', response.data);

      if (response.data && response.data.activity_logs) {
        // Set activities from the response
        setActivities(response.data.activity_logs || []);
        
        // Calculate pagination info manually since the API might not provide it
        const totalRecords = response.data.activity_logs.length;
        const totalPages = Math.ceil(totalRecords / itemsPerPage);
        
        // Filter activities based on search term if present
        let filteredActivities = response.data.activity_logs;
        if (search) {
          const searchLower = search.toLowerCase();
          filteredActivities = filteredActivities.filter(activity => 
            activity.title.toLowerCase().includes(searchLower) || 
            activity.module.toLowerCase().includes(searchLower) ||
            activity.sub_module.toLowerCase().includes(searchLower)
          );
        }
        
        // Apply pagination to filtered activities
        const startIdx = (currentPage - 1) * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        const paginatedActivities = filteredActivities.slice(startIdx, endIdx);
        
        setActivities(paginatedActivities);
        
        // Update pagination info
        setPaginationInfo({
          totalRecords: filteredActivities.length,
          currentPage: currentPage,
          totalPages: Math.ceil(filteredActivities.length / itemsPerPage),
          recordsPerPage: itemsPerPage,
          showingRecords: `${startIdx + 1} to ${Math.min(endIdx, filteredActivities.length)}`
        });
      } else {
        setActivities([]);
        setPaginationInfo({
          totalRecords: 0,
          currentPage: 1,
          totalPages: 1,
          recordsPerPage: itemsPerPage,
          showingRecords: '0 to 0'
        });
        
        if (response.data.detail && response.data.detail !== "Activity logs retrieved successfully") {
          setError(response.data.detail);
        }
      }
    } catch (error) {
      console.error('Error fetching activity log:', error);
      setError(error.response?.data?.detail || 'Failed to fetch activity log. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((value) => {
      setPage(1);
      fetchActivityLog(1, value);
    }, 500),
    []
  );

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    debouncedSearch(e.target.value);
  };

  const handlePageChange = (event, value) => {
    setPage(value);
  };

  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        <VerticalSidebar />
        <div className="layout-page d-flex flex-column min-vh-100">
          <Header />
          <div className="content-wrapper">
            <div className="container-xxl flex-grow-1 container-p-y">
              <div className="d-flex justify-content-between align-items-center py-3 mb-4">
                <h4 className="fw-bold mb-0">Activity Log</h4>
                <div className="search-container" style={{ maxWidth: '300px', width: '100%' }}>
                  <div className="input-group">
                    <span className="input-group-text" style={{ backgroundColor: 'transparent' }}>
                      <i className="fas fa-search"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Search activities..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      style={{
                        borderLeft: 'none',
                        boxShadow: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {error && (
                <Alert severity="error" className="mb-4">
                  {error}
                </Alert>
              )}
              
              <Card>
                <CardContent>
                  {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" p={3}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <>
                      <TableContainer component={Paper} sx={{ maxHeight: '60vh' }}>
                        <Table stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell style={{ fontWeight: 'bold', fontSize: '16px'}}>Date & Time</TableCell>
                              <TableCell style={{ fontWeight: 'bold', fontSize: '16px'}}>Module</TableCell>
                              <TableCell style={{ fontWeight: 'bold', fontSize: '16px'}}>Sub-Module</TableCell>
                              <TableCell style={{ fontWeight: 'bold', fontSize: '16px'}}>Activity</TableCell>
                              <TableCell style={{ fontWeight: 'bold', fontSize: '16px'}}>Outlet ID</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {activities.length > 0 ? (
                              activities.map((activity) => (
                                <TableRow key={activity.activity_log_id}>
                                  <TableCell>{activity.created_on}</TableCell>
                                  <TableCell>{activity.module}</TableCell>
                                  <TableCell>{activity.sub_module}</TableCell>
                                  <TableCell>{activity.title}</TableCell>
                                  <TableCell>{activity.outlet_id}</TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={5} align="center">
                                  No activities found.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
                        <Typography variant="body2" color="text.secondary">
                          Showing records {paginationInfo.showingRecords} of {paginationInfo.totalRecords} total records
                        </Typography>
                        <Pagination 
                          count={paginationInfo.totalPages} 
                          page={paginationInfo.currentPage} 
                          onChange={handlePageChange}
                          color="primary"
                          size="large"
                        />
                      </Box>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyActivity;