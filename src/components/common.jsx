import React, { useState, useEffect, useRef } from 'react';
import {
  Form,
  Button,
  Spinner,
  Card,
  Table,
  Badge,
  InputGroup,
  FormControl,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { CSVLink } from 'react-csv';
import { utils, write } from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Global table styling variables
const tableFontSize = '0.75rem'; // 12px equivalent
const tableHeaderFontSize = '0.8rem'; // Slightly larger for headers

/**
 * A reusable component to display a message when no data is available
 * @param {Object} props - Component props
 * @param {string} props.message - Optional custom message to display
 * @param {function} props.onRefresh - Optional refresh function to call
 * @param {string} props.icon - Optional custom icon class
 * @param {boolean} props.hideLoading - Hide loading indicator when refreshing
 */
export const NoDataMessage = ({ 
  message = "No data available for the selected time period", 
  onRefresh = null,
  icon = "fas fa-chart-bar",
  hideLoading = false
}) => {
  return (
    <div className="card border rounded-3 text-center p-4">
      <div className="card-body">
        <i className={`${icon} fa-3x text-muted mb-3`}></i>
        <h4 className="mt-3">{message}</h4>
        {onRefresh && (
          <button 
            className="btn btn-primary mt-3" 
            onClick={onRefresh}
          >
            <i className="fas fa-sync-alt me-2"></i> Refresh Data
          </button>
        )}
      </div>
    </div>
  );
}; 

/**
 * A reusable component to display a message when user does not have permission to access a feature
 * @param {Object} props - Component props
 * @param {string} props.message - Optional custom message to display
 * @param {function} props.onRetry - Optional retry function to call
 */
export const ForbiddenAccessMessage = ({ 
  message = "You don't have permission to access this feature", 
  onRetry = null
}) => {
  return (
    <div className="card border rounded-3 text-center p-4">
      <div className="card-body">
        <i className="fas fa-lock fa-3x text-danger mb-3"></i>
        <h4 className="mt-3">{message}</h4>
        <p className="text-muted">Please contact your administrator if you believe this is an error.</p>
        {onRetry && (
          <button 
            className="btn btn-outline-primary mt-3" 
            onClick={onRetry}
          >
            <i className="fas fa-redo me-2"></i> Try Again
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * A reusable table component for displaying and exporting report data
 */
export const ReportTable = ({
  data,
  columns,
  title,
  filterInfo,
  expandableContent,
  customRowRender,
  customHeaderRender,
  customCellRender,
  initialSortConfig = { key: null, direction: null },
  enableHorizontalScroll = false,
  onBack,
  filterControls,
  dataFetched = false,
  breadcrumbs = null
}) => {
  const PAGE_SIZE_OPTIONS = [50, 100, 200, 500]; // Added 100 as an option
  const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0]; // Default to first option (50)
  
  const [filteredData, setFilteredData] = useState([]);
  const [displayedData, setDisplayedData] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [columnSearchQueries, setColumnSearchQueries] = useState({});
  const [visibleRecords, setVisibleRecords] = useState(DEFAULT_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortConfig, setSortConfig] = useState(initialSortConfig);
  const [selectedRecords, setSelectedRecords] = useState({});
  const [selectedColumns, setSelectedColumns] = useState({});
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  
  // Use refs to track previous values and avoid unnecessary re-renders
  const prevDataRef = useRef(data);
  const prevSearchQueryRef = useRef(searchQuery);
  const prevColumnSearchQueriesRef = useRef(columnSearchQueries);
  const prevSortConfigRef = useRef(sortConfig);
  const prevFilteredDataRef = useRef(filteredData);
  const prevVisibleRecordsRef = useRef(visibleRecords);
  const prevCurrentPageRef = useRef(currentPage);
  const prevPageSizeRef = useRef(pageSize);
  const prevColumnsRef = useRef(columns);

  // Initialize data, selections, and columns when data changes
  useEffect(() => {
    // Skip if data hasn't changed
    if (prevDataRef.current === data) return;
    console.log('ReportTable: Data changed, updating component state', data);
    prevDataRef.current = data;
    
    if (data && data.length > 0) {
      console.log('ReportTable: Processing data items:', data.length);
      // Initialize all records as selected by default
      const initialSelectedState = {};
      data.forEach(item => {
        initialSelectedState[item.id] = true;
      });
      setSelectedRecords(initialSelectedState);
      
      // Reset visible records when data changes
      setVisibleRecords(DEFAULT_PAGE_SIZE);
      
      // Reset sort config when data changes
      setSortConfig(initialSortConfig);
      
      // Set filtered data directly from data
      setFilteredData(data);
      console.log('ReportTable: Filtered data updated with', data.length, 'items');
    } else {
      console.log('ReportTable: No data or empty data array');
      setFilteredData([]);
    }
  }, [data, initialSortConfig]);
  
  // Initialize column selections when columns change
  useEffect(() => {
    // Skip if columns haven't changed
    if (prevColumnsRef.current === columns) return;
    prevColumnsRef.current = columns;
    
    if (columns && columns.length > 0) {
      // Initialize all columns as selected by default
      const initialColumnState = {};
      // Initialize column search queries to empty
      const initialColumnSearchState = {};
      
      columns.forEach(column => {
        initialColumnState[column.accessor] = true;
        initialColumnSearchState[column.accessor] = '';
      });
      
      setSelectedColumns(initialColumnState);
      setColumnSearchQueries(initialColumnSearchState);
    }
  }, [columns]);

  // Apply global search filter
  useEffect(() => {
    // Skip if search query hasn't changed or data is the same
    if (prevSearchQueryRef.current === searchQuery && 
        prevDataRef.current === data &&
        prevColumnSearchQueriesRef.current === columnSearchQueries) return;
    
    prevSearchQueryRef.current = searchQuery;
    prevColumnSearchQueriesRef.current = columnSearchQueries;
    
    if (!data || data.length === 0) {
      setFilteredData([]);
      return;
    }
    
    let filtered = [...data];
    
    // Apply global search if query exists
    if (searchQuery) {
      filtered = filtered.filter(item => {
        return columns.some(col => {
          const value = col.accessor ? item[col.accessor] : null;
          return value && String(value).toLowerCase().includes(searchQuery.toLowerCase());
        });
      });
    }
    
    // Apply column-specific searches
    const hasColumnSearches = Object.values(columnSearchQueries).some(query => query !== '');
    
    if (hasColumnSearches) {
      filtered = filtered.filter(item => {
        return Object.entries(columnSearchQueries).every(([accessor, query]) => {
          if (!query) return true; // Skip empty queries
          
          const value = item[accessor];
          if (value === undefined || value === null) return false;
          
          return String(value).toLowerCase().includes(query.toLowerCase());
        });
      });
    }
    
    setFilteredData(filtered);
  }, [searchQuery, data, columns, columnSearchQueries]);

  // Update displayed data based on pagination
  useEffect(() => {
    // Skip if filtered data, current page, or page size haven't changed
    if (
      prevFilteredDataRef.current === filteredData && 
      prevCurrentPageRef.current === currentPage &&
      prevPageSizeRef.current === pageSize
    ) return;
    
    prevFilteredDataRef.current = filteredData;
    prevCurrentPageRef.current = currentPage;
    prevPageSizeRef.current = pageSize;
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    setDisplayedData(filteredData.slice(startIndex, endIndex));
  }, [filteredData, currentPage, pageSize]);

  // Apply sorting to filtered data
  useEffect(() => {
    // Skip if sort config hasn't changed or it's the initial render
    if (
      prevSortConfigRef.current.key === sortConfig.key && 
      prevSortConfigRef.current.direction === sortConfig.direction
    ) return;
    
    prevSortConfigRef.current = sortConfig;
    
    // Skip if no data or no sort key/direction
    if (!data || data.length === 0 || !sortConfig.key || !sortConfig.direction) return;
    
    const sortedData = [...data].sort((a, b) => {
      // Find the column configuration for this key
      const column = columns.find(col => col.accessor === sortConfig.key);
      
      // Use the sortFunction if provided, otherwise do default comparison
      if (column && column.sortFunction) {
        return column.sortFunction(a, b, sortConfig.direction);
      }
      
      // Default sorting logic
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      // Handle string case-insensitive comparison
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
      }
      if (typeof bValue === 'string') {
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    
    setFilteredData(sortedData);
  }, [sortConfig, data, columns]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const clearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };
  
  const handleColumnSearchChange = (accessor, value) => {
    setColumnSearchQueries(prev => ({
      ...prev,
      [accessor]: value
    }));
    setCurrentPage(1); // Reset to first page when searching
  };
  
  const clearColumnSearch = (accessor) => {
    setColumnSearchQueries(prev => ({
      ...prev,
      [accessor]: ''
    }));
  };
  
  const clearAllColumnSearches = () => {
    const clearedSearches = {};
    Object.keys(columnSearchQueries).forEach(key => {
      clearedSearches[key] = '';
    });
    setColumnSearchQueries(clearedSearches);
    setCurrentPage(1);
  };

  const handleLoadMore = () => {
    if (currentPage * pageSize < filteredData.length) {
      setCurrentPage(prev => prev + 1);
    }
  };
  
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };
  
  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const totalPages = Math.ceil(filteredData.length / pageSize);

  const toggleRow = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleRecordSelection = (e, id) => {
    e.stopPropagation(); // Prevent row expansion when clicking the eye icon
    setSelectedRecords(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  const toggleColumnSelection = (e, accessor) => {
    e.stopPropagation(); // Prevent sorting when clicking the eye icon
    setSelectedColumns(prev => ({
      ...prev,
      [accessor]: !prev[accessor]
    }));
  };

  // Sort handler
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      }
    }
    
    if (direction === null) {
      // If resetting to default order, restore the original data order
      setSortConfig({ key: null, direction: null });
      setFilteredData([...data]);
    } else {
      setSortConfig({ key, direction });
    }
  };

  // Get sort icon based on current sort state
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <i className="fas fa-sort text-muted ms-1" style={{ fontSize: '0.75rem' }}></i>;
    }
    if (sortConfig.direction === 'asc') {
      return <i className="fas fa-sort-up ms-1 text-primary"></i>;
    }
    if (sortConfig.direction === 'desc') {
      return <i className="fas fa-sort-down ms-1 text-primary"></i>;
    }
    return <i className="fas fa-sort text-muted ms-1" style={{ fontSize: '0.75rem' }}></i>;
  };

  // Export functions
  const getSelectedData = () => {
    // Only include records that are both selected AND currently displayed
    return displayedData.filter(item => selectedRecords[item.id]);
  };

  const getAllSelectedData = () => {
    return filteredData.filter(item => selectedRecords[item.id]);
  };

  const exportToExcel = () => {
    const selectedItems = getSelectedData();
    
    // Prepare data for Excel
    const excelData = selectedItems.map(item => {
      const rowData = {};
      columns.forEach(column => {
        // Only include selected columns
        if (column.accessor && column.Header && selectedColumns[column.accessor]) {
          // Handle special rendering for export
          if (column.exportFormat) {
            rowData[column.Header] = column.exportFormat(item);
          } else {
            rowData[column.Header] = item[column.accessor];
          }
        }
      });
      return rowData;
    });
    
    const ws = utils.json_to_sheet(excelData);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, title || 'Report');
    const excelBuffer = write(wb, { bookType: 'xlsx', type: 'array' });
    
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title || 'report'}.xlsx`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const selectedItems = getSelectedData();
    const doc = new jsPDF();
    
    // Add title and filter info
    doc.setFontSize(18);
    doc.text(title || 'Report', 14, 22);
    
    // Add filter information if provided
    if (filterInfo) {
      doc.setFontSize(12);
      let yPosition = 30;
      
      Object.entries(filterInfo).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 14, yPosition);
        yPosition += 8;
      });
    }
    
    // Prepare columns and data for PDF - only include selected columns
    const tableColumn = columns
      .filter(col => col.accessor && col.Header && selectedColumns[col.accessor] && col.includeInExport !== false)
      .map(col => col.Header);
    
    const tableRows = selectedItems.map(item => {
      return columns
        .filter(col => col.accessor && col.Header && selectedColumns[col.accessor] && col.includeInExport !== false)
        .map(col => {
          if (col.exportFormat) {
            return col.exportFormat(item);
          }
          return item[col.accessor];
        });
    });
    
    // Calculate starting position for the table
    const startY = filterInfo ? (30 + (Object.keys(filterInfo).length * 8)) : 30;
    
    // Use autoTable directly as a function
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: startY,
      theme: 'grid',
      styles: { fontSize: 10 }
    });
    
    doc.save(`${title || 'report'}.pdf`);
  };

  // CSV data preparation - only include selected columns
  const csvData = getSelectedData().map(item => {
    const rowData = {};
    columns.forEach(column => {
      if (column.accessor && column.Header && selectedColumns[column.accessor] && column.includeInExport !== false) {
        if (column.exportFormat) {
          rowData[column.Header] = column.exportFormat(item);
        } else {
          rowData[column.Header] = item[column.accessor];
        }
      }
    });
    return rowData;
  });

  // Custom CSS for vertical lines in table
  const verticalLineStyle = {
    borderRight: '1px solid #dee2e6'
  };

  const getIdFromItem = (item) => {
    // Try to find an id field, fallback to first property if not found
    return item.id || item.menu_id || item[Object.keys(item)[0]];
  };

  // Modify the calculateTotalWidth function to ensure it returns a proper width
  const calculateTotalWidth = () => {
    if (!enableHorizontalScroll) return '100%';
    
    let totalWidth = 0;
    columns.forEach(col => {
      if (col.width) {
        // Extract numeric value from width (e.g. '150px' -> 150)
        const widthValue = parseInt(col.width, 10);
        if (!isNaN(widthValue)) {
          totalWidth += widthValue;
        } else {
          // Default width for columns with non-numeric width
          totalWidth += 150;
        }
      } else {
        // Default width for columns without specified width
        totalWidth += 150;
      }
    });
    
    // Add width for selection column and expansion column if needed
    totalWidth += 60; // Selection column
    if (expandableContent) {
      totalWidth += 60; // Expansion column
    }
    
    // Add some extra space to ensure all content is visible
    totalWidth += 50;
    
    return `${totalWidth}px`;
  };

  return (
    <div className="mt-4 px-3">
      {/* Breadcrumbs - Outside the card */}
      {breadcrumbs && (
        <div className="mb-3 d-flex align-items-center">
          {breadcrumbs}
        </div>
      )}
      
      {/* Top Controls Section - Always visible */}
      <Card className="mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              {onBack && (
                <button 
                  className="btn btn-sm btn-icon btn-outline-secondary me-3" 
                  onClick={onBack}
                  title="Back"
                >
                  <i className="fas fa-arrow-left"></i>
                </button>
              )}
              
              {/* Advanced Controls Button - Moved up to filters line */}
              {dataFetched && (
                <OverlayTrigger
                  placement="top"
                  overlay={
                    <Tooltip id="tooltip-advanced-controls">
                      {showAdvancedControls ? 'Hide advanced controls' : 'Show advanced controls'}
                    </Tooltip>
                  }
                >
                  <Button 
                    variant="link" 
                    className={`p-1 me-3 ${showAdvancedControls ? 'text-primary' : 'text-muted'}`}
                    onClick={() => setShowAdvancedControls(!showAdvancedControls)}
                  >
                    <i className="fas fa-gear" style={{ fontSize: '1.1rem' }}></i>
                  </Button>
                </OverlayTrigger>
              )}
            </div>
            
            <div className="d-flex justify-content-center align-items-center">
              {filterControls && (
                <div className="d-flex align-items-center">
                  {filterControls}
                </div>
              )}
            </div>
            
            <div style={{ width: '75px' }}></div> {/* Empty div to balance the layout */}
          </div>
        </Card.Body>
        
        {/* Only show the table content if data has been fetched */}
        {dataFetched && (
          <>
            <Card.Body className="border-top">
              {/* Stats and Search Bar */}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center">
                  <span className="text-primary fw-medium">
                    <i className="fas fa-table me-1"></i>
                    {filteredData.length} Records
                  </span>
                  
                  <span className="ms-3 text-muted small">
                    <i className="fas fa-columns me-1"></i>
                    {columns.filter(col => selectedColumns[col.accessor]).length} of {columns.length} Columns
                  </span>
                </div>
                
                <div className="d-flex align-items-center">
                  <div className="d-flex gap-2 me-3">
                    <CSVLink 
                      data={csvData} 
                      filename={`${title || 'report'}.csv`}
                      className="btn btn-outline-primary btn-sm"
                      target="_blank"
                    >
                      <i className="fas fa-file-csv me-1"></i>
                      CSV
                    </CSVLink>
                    <Button variant="outline-success" size="sm" onClick={exportToExcel}>
                      <i className="fas fa-file-excel me-1"></i>
                      Excel
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={exportToPDF}>
                      <i className="fas fa-file-pdf me-1"></i>
                      PDF
                    </Button>
                  </div>
                  
                  <InputGroup size="sm">
                    <FormControl
                      placeholder="Search..."
                      aria-label="Search"
                      value={searchQuery}
                      onChange={handleSearchChange}
                    />
                    {searchQuery && (
                      <Button variant="outline-secondary" onClick={clearSearch}>
                        <i className="fas fa-times"></i>
                      </Button>
                    )}
                    <Button variant="outline-primary">
                      <i className="fas fa-search"></i>
                    </Button>
                  </InputGroup>
                </div>
              </div>
              
              {/* Table Content - Fix alignment issues */}
              {data.length > 0 ? (
                <div className="table-responsive" style={{ 
                  position: 'relative', 
                  maxHeight: '600px', 
                  overflowY: 'auto',
                  overflowX: 'auto',
                  border: '1px solid #dee2e6',
                  borderRadius: '0.25rem'
                }}>
                  <style>
                    {`
                      .custom-table thead tr:not(.header-row) {
                        background-color: #ffffff !important;
                      }
                      .custom-table thead tr.header-row {
                        background-color: #f8f9fa !important;
                      }
                      .custom-table thead tr:not(.header-row) th {
                        background-color: #ffffff !important;
                      }
                      .custom-table thead tr.header-row th {
                        background-color: #f8f9fa !important;
                      }
                    `}
                  </style>
                  <Table className={`custom-table ${enableHorizontalScroll ? "" : "table-hover mb-0"}`} size="sm" style={{ 
                    width: calculateTotalWidth(), 
                    tableLayout: enableHorizontalScroll ? 'fixed' : 'auto'
                  }}>
                    <colgroup>
                      {/* Expansion column */}
                      {expandableContent && !enableHorizontalScroll && (
                        <col style={{ width: '40px' }} />
                      )}
                      
                      {/* S.No. column */}
                      {showAdvancedControls && (
                        <col style={{ width: '60px' }} />
                      )}
                      
                      {/* Selection column */}
                      {showAdvancedControls && (
                        <col style={{ width: '40px' }} />
                      )}
                      
                      {/* Data columns */}
                      {columns.map((column) => (
                        <col key={`col-${column.accessor}`} style={{ width: column.width || '150px' }} />
                      ))}
                    </colgroup>
                    <thead>
                      {/* Advanced controls section - conditionally visible */}
                      {showAdvancedControls && (
                        <>
                          {/* Row 1: Eye icons for column selection - white background */}
                          <tr style={{ height: '15px' }}>
                            {/* Expansion column - only show if expandable content is provided and horizontal scroll is not enabled */}
                            {expandableContent && !enableHorizontalScroll && (
                              <th className="text-center align-middle" style={{ width: '40px', ...verticalLineStyle, padding: '0.3rem 0.5rem', backgroundColor: '#ffffff' }}></th>
                            )}
                            
                            {/* S.No. column */}
                            <th className="text-center align-middle" style={{ width: '60px', ...verticalLineStyle, padding: '0.3rem 0.5rem', backgroundColor: '#ffffff' }}>
                              <span className="small text-muted">S.No.</span>
                            </th>
                            
                            {/* Selection column */}
                            <th className="text-center align-middle" style={{ width: '40px', ...verticalLineStyle, padding: '0.3rem 0.5rem', backgroundColor: '#ffffff' }}>
                              <span className="small text-muted">Incl.</span>
                            </th>
                            
                            {/* Data columns */}
                            {columns.map((column) => (
                              <th 
                                key={column.accessor}
                                className="text-center align-middle"
                                style={{ 
                                  width: column.width || 'auto', 
                                  ...verticalLineStyle,
                                  padding: '0.3rem 0.5rem',
                                  backgroundColor: '#ffffff'
                                }}
                              >
                                <OverlayTrigger
                                  placement="top"
                                  overlay={
                                    <Tooltip id={`tooltip-col-${column.accessor}`}>
                                      {selectedColumns[column.accessor] ? 'Click to exclude column from export' : 'Click to include column in export'}
                                    </Tooltip>
                                  }
                                >
                                  <Button 
                                    variant="link" 
                                    className="p-0 text-decoration-none" 
                                    onClick={(e) => toggleColumnSelection(e, column.accessor)}
                                    style={{ display: 'flex', justifyContent: 'center' }}
                                  >
                                    <i className={`fas fa-eye${selectedColumns[column.accessor] ? '' : '-slash'} ${selectedColumns[column.accessor] ? 'text-primary' : 'text-muted'}`} style={{ fontSize: '0.85rem' }}></i>
                                  </Button>
                                </OverlayTrigger>
                              </th>
                            ))}
                          </tr>
                          
                          {/* Divider after eye buttons row */}
                          <tr>
                            <th colSpan={columns.length + (expandableContent && !enableHorizontalScroll ? 3 : 2)} style={{ padding: 0, backgroundColor: '#ffffff !important' }}>
                              <hr style={{ margin: '0.1rem 0', borderTop: '1px solid #dee2e6' }} />
                            </th>
                          </tr>
                        </>
                      )}
                      
                      {/* Row 2: Column headers - keep bg-light */}
                      <tr className="header-row" style={{ height: '15px' }}>
                        {/* Expansion column - only show if expandable content is provided and horizontal scroll is not enabled */}
                        {expandableContent && !enableHorizontalScroll && (
                          <th className="text-center align-middle" style={{ width: '40px', ...verticalLineStyle, padding: '0.3rem 0.5rem', backgroundColor: '#f8f9fa !important' }}></th>
                        )}
                        
                        {/* S.No. column - Only visible when advanced controls are enabled */}
                        {showAdvancedControls && (
                          <th className="text-center align-middle" style={{ width: '60px', ...verticalLineStyle, padding: '0.3rem 0.5rem', backgroundColor: '#f8f9fa !important' }}></th>
                        )}
                        
                        {/* Selection column - Only visible when advanced controls are enabled */}
                        {showAdvancedControls && (
                          <th className="text-center align-middle" style={{ width: '40px', ...verticalLineStyle, padding: '0.3rem 0.5rem', backgroundColor: '#f8f9fa !important' }}></th>
                        )}
                        
                        {/* Data columns */}
                        {columns.map((column) => (
                          <th 
                            key={column.accessor}
                            style={{ 
                              width: column.width || 'auto',
                              borderRight: '1px solid #dee2e6',
                              cursor: column.sortable === false ? 'default' : 'pointer',
                              padding: '0.25rem 0.5rem',
                              fontSize: tableHeaderFontSize,
                              textAlign: 'center',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              backgroundColor: '#f8f9fa',
                              height: '15px',
                              lineHeight: '1.5'
                            }}
                            onClick={() => column.sortable !== false && handleSort(column.accessor)}
                          >
                            <div className="d-flex align-items-center justify-content-center position-relative">
                              <span className="text-truncate px-2">{column.Header}</span>
                              {column.sortable !== false && (
                                <span className="position-absolute" style={{ right: '0' }}>
                                  {getSortIcon(column.accessor)}
                                </span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                      
                      {/* Divider after column headers row */}
                      <tr>
                        <th colSpan={columns.length + (expandableContent && !enableHorizontalScroll ? (showAdvancedControls ? 3 : 1) : (showAdvancedControls ? 2 : 0))} style={{ padding: 0, backgroundColor: '#ffffff !important' }}>
                          <hr style={{ margin: '0.1rem 0', borderTop: '1px solid #dee2e6' }} />
                        </th>
                      </tr>
                      
                      {/* Advanced controls section - conditionally visible */}
                      {showAdvancedControls && (
                        <>
                          {/* Row 3: Column search inputs */}
                          <tr style={{ height: '15px' }}>
                            {/* Expansion column - only show if expandable content is provided and horizontal scroll is not enabled */}
                            {expandableContent && !enableHorizontalScroll && (
                              <th className="text-center align-middle" style={{ width: '40px', ...verticalLineStyle, padding: '0.3rem 0.5rem', backgroundColor: '#ffffff !important' }}></th>
                            )}
                            
                            {/* S.No. column */}
                            <th className="text-center align-middle" style={{ width: '60px', ...verticalLineStyle, padding: '0.3rem 0.5rem', backgroundColor: '#ffffff !important' }}>
                            </th>
                            
                            {/* Selection column */}
                            <th className="text-center align-middle" style={{ width: '40px', ...verticalLineStyle, padding: '0.3rem 0.5rem', backgroundColor: '#ffffff' }}>
                              <OverlayTrigger
                                placement="top"
                                overlay={
                                  <Tooltip id="tooltip-clear-all-filters">
                                    Clear all column filters
                                  </Tooltip>
                                }
                              >
                                <Button 
                                  variant="link" 
                                  className="p-0 text-decoration-none" 
                                  onClick={clearAllColumnSearches}
                                  disabled={!Object.values(columnSearchQueries).some(q => q !== '')}
                                  style={{ display: 'flex', justifyContent: 'center' }}
                                >
                                  <i className="fas fa-filter-circle-xmark text-muted" style={{ fontSize: '0.85rem' }}></i>
                                </Button>
                              </OverlayTrigger>
                            </th>
                            
                            {/* Data columns search inputs */}
                            {columns.map((column) => (
                              <th 
                                key={`search-${column.accessor}`}
                                style={{ 
                                  width: column.width || 'auto', 
                                  ...verticalLineStyle,
                                  padding: '0.3rem 0.5rem',
                                  backgroundColor: '#ffffff',
                                  height: '15px',
                                  lineHeight: '1.5'
                                }}
                              >
                                <InputGroup size="sm">
                                  <FormControl
                                    placeholder={`Search ${column.Header}...`}
                                    size="sm"
                                    value={columnSearchQueries[column.accessor] || ''}
                                    onChange={(e) => handleColumnSearchChange(column.accessor, e.target.value)}
                                    style={{ height: '28px', fontSize: tableFontSize }}
                                  />
                                  {columnSearchQueries[column.accessor] && (
                                    <Button 
                                      variant="outline-secondary" 
                                      size="sm" 
                                      onClick={() => clearColumnSearch(column.accessor)}
                                      style={{ height: '28px', padding: '0 0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                      <i className="fas fa-times" style={{ fontSize: '0.75rem' }}></i>
                                    </Button>
                                  )}
                                </InputGroup>
                              </th>
                            ))}
                          </tr>
                          
                          {/* Divider after search inputs row */}
                          <tr>
                            <th colSpan={columns.length + (expandableContent && !enableHorizontalScroll ? 3 : 2)} style={{ padding: 0, backgroundColor: '#ffffff !important' }}>
                              <hr style={{ margin: '0.1rem 0', borderTop: '1px solid #dee2e6' }} />
                            </th>
                          </tr>
                        </>
                      )}
                    </thead>
                    <tbody>
                      {displayedData.length > 0 ? (
                        displayedData.map((item, index) => {
                          const itemId = getIdFromItem(item);
                          // Calculate the actual index based on the current page and page size
                          const actualIndex = (currentPage - 1) * pageSize + index + 1;
                          
                          return (
                            <React.Fragment key={itemId}>
                              {/* Main row */}
                              <tr 
                                className={`${expandableContent && !enableHorizontalScroll ? 'cursor-pointer' : ''} ${expandedRows[itemId] ? 'table-active' : ''}`}
                                onClick={() => expandableContent && !enableHorizontalScroll && toggleRow(itemId)}
                                style={{ 
                                  cursor: (expandableContent && !enableHorizontalScroll) ? 'pointer' : 'default',
                                  height: '15px'
                                }}
                              >
                                {/* Expansion column - only show if expandable content is provided and horizontal scroll is not enabled */}
                                {expandableContent && !enableHorizontalScroll && (
                                  <td className="text-center align-middle" style={{ width: '40px', ...verticalLineStyle }}>
                                    <i className={`fas fa-chevron-${expandedRows[itemId] ? 'down' : 'right'} transition-all`}></i>
                                  </td>
                                )}
                                
                                {/* S.No. column - Only visible when advanced controls are enabled */}
                                {showAdvancedControls && (
                                  <td className="text-center align-middle" style={{ width: '60px', ...verticalLineStyle }}>
                                    <span className="text-muted">{actualIndex}</span>
                                  </td>
                                )}
                                
                                {/* Selection column - Only visible when advanced controls are enabled */}
                                {showAdvancedControls && (
                                  <td className="text-center align-middle" style={{ width: '40px', ...verticalLineStyle }}>
                                    <OverlayTrigger
                                      placement="top"
                                      overlay={
                                        <Tooltip id={`tooltip-${itemId}`}>
                                          {selectedRecords[itemId] ? 'Click to exclude from export' : 'Click to include in export'}
                                        </Tooltip>
                                      }
                                    >
                                      <Button 
                                        variant="link" 
                                        className="p-0 text-decoration-none" 
                                        onClick={(e) => toggleRecordSelection(e, itemId)}
                                        style={{ display: 'flex', justifyContent: 'center' }}
                                      >
                                        <i className={`fas fa-eye${selectedRecords[itemId] ? '' : '-slash'} ${selectedRecords[itemId] ? 'text-primary' : 'text-muted'}`} style={{ fontSize: '0.85rem' }}></i>
                                      </Button>
                                    </OverlayTrigger>
                                  </td>
                                )}
                                
                                {/* Data cells */}
                                {columns.map((column) => (
                                  <td 
                                    key={`${itemId}-${column.accessor}`} 
                                    className={column.cellClassName || "align-middle"}
                                    style={{
                                      width: column.width || 'auto',
                                      ...verticalLineStyle,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      textAlign: column.cellAlign || 'center',
                                      padding: '0.25rem 0.5rem',
                                      fontSize: tableFontSize,
                                      height: '15px',
                                      lineHeight: '1.5'
                                    }}
                                  >
                                    <div className="text-truncate">
                                      {customCellRender ? (
                                        customCellRender(item, column)
                                      ) : column.Cell ? (
                                        column.Cell(item)
                                      ) : (
                                        item[column.accessor]
                                      )}
                                    </div>
                                  </td>
                                ))}
                              </tr>
                              
                              {/* Expandable content row - only show if expandable content is provided and horizontal scroll is not enabled */}
                              {expandableContent && !enableHorizontalScroll && expandedRows[itemId] && (
                                <tr>
                                  <td colSpan={columns.length + (showAdvancedControls ? 3 : 1)} className="p-0">
                                    <div className="p-3 bg-light border-top">
                                      {expandableContent(item)}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={columns.length + (expandableContent && !enableHorizontalScroll ? (showAdvancedControls ? 3 : 1) : (showAdvancedControls ? 2 : 0))} className="text-center py-5">
                            <i className="fas fa-search fa-2x text-muted mb-3"></i>
                            <p className="text-muted">No data found</p>
                            {(searchQuery || Object.values(columnSearchQueries).some(q => q !== '')) && (
                              <div className="mt-2">
                                <Button 
                                  variant="outline-secondary" 
                                  size="sm" 
                                  onClick={() => {
                                    clearSearch();
                                    clearAllColumnSearches();
                                  }}
                                >
                                  <i className="fas fa-times me-1"></i>
                                  Clear Search Filters
                                </Button>
                                {!showAdvancedControls && Object.values(columnSearchQueries).some(q => q !== '') && (
                                  <div className="mt-2 small text-muted">
                                    <i className="fas fa-info-circle me-1"></i>
                                    Column filters are active. Click the <i className="fas fa-gear mx-1"></i> icon to show and modify them.
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <div className="alert alert-info mb-0">
                  <i className="fas fa-info-circle me-2"></i>
                  No data found for the selected filters. Please try different filter criteria.
                </div>
              )}
            </Card.Body>
            <Card.Footer className="bg-white py-2">
              <div className="d-flex justify-content-between align-items-center flex-nowrap">
                <div className="d-flex align-items-center flex-nowrap">
                  {/* Pagination Controls */}
                  <div className="d-flex align-items-center me-3 flex-nowrap">
                    <span className="text-muted small me-2">Page Size:</span>
                    
                    {/* Replace button group with dropdown */}
                    <div className="dropdown me-3">
                      <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        className="dropdown-toggle px-3 py-1" 
                        id="pageSizeDropdown"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                      >
                        {pageSize}
                      </Button>
                      <ul className="dropdown-menu" aria-labelledby="pageSizeDropdown">
                        {PAGE_SIZE_OPTIONS.map(size => (
                          <li key={`page-size-${size}`}>
                            <a 
                              className={`dropdown-item ${pageSize === size ? 'active' : ''}`} 
                              href="#" 
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageSizeChange(size);
                              }}
                            >
                              {size}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {totalPages > 1 && (
                      <div className="d-flex align-items-center flex-nowrap">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => handlePageChange(1)}
                          disabled={currentPage === 1}
                          className="me-1 px-2 py-1"
                        >
                          <i className="fas fa-angle-double-left"></i>
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="me-1 px-2 py-1"
                        >
                          <i className="fas fa-angle-left"></i>
                        </Button>
                        <span className="mx-2">
                          <span className="fw-bold">{currentPage}</span>/<span className="fw-bold">{totalPages}</span>
                        </span>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="me-1 px-2 py-1"
                        >
                          <i className="fas fa-angle-right"></i>
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => handlePageChange(totalPages)}
                          disabled={currentPage === totalPages}
                          className="px-2 py-1"
                        >
                          <i className="fas fa-angle-double-right"></i>
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  {/* Records Info */}
                  <span className="text-muted small me-3 d-none d-md-inline">
                    {displayedData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length}
                  </span>
                  
                  {/* Advanced Controls Info */}
                  {showAdvancedControls && (
                    <div className="d-flex align-items-center flex-nowrap">
                      <span className="text-primary small me-3 d-none d-lg-inline">
                        <i className="fas fa-eye me-1"></i>
                        {getSelectedData().length} of {displayedData.length} records selected
                      </span>
                      <span className="text-primary small me-3 d-none d-lg-inline">
                        <i className="fas fa-columns me-1"></i>
                        {columns.filter(col => selectedColumns[col.accessor]).length} of {columns.length} columns selected
                      </span>
                    </div>
                  )}
                </div>
                <div className="d-flex gap-2 flex-nowrap">
                  <CSVLink 
                    data={csvData} 
                    filename={`${title || 'report'}.csv`}
                    className="btn btn-outline-primary btn-sm py-1 px-3"
                    target="_blank"
                  >
                    <i className="fas fa-file-csv me-1"></i>
                    CSV
                  </CSVLink>
                  <Button variant="outline-success" size="sm" onClick={exportToExcel} className="py-1 px-3">
                    <i className="fas fa-file-excel me-1"></i>
                    Excel
                  </Button>
                  <Button variant="outline-danger" size="sm" onClick={exportToPDF} className="py-1 px-3">
                    <i className="fas fa-file-pdf me-1"></i>
                    PDF
                  </Button>
                </div>
              </div>
            </Card.Footer>
          </>
        )}
      </Card>
    </div>
  );
};

/**
 * Report filters component for filtering data by date range and other criteria
 */
export const ReportFilters = ({
  isLoading,
  onSubmit,
  defaultDateRange = 'All Time',
  children
}) => {
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Initialize with default date range
  useEffect(() => {
    setDateRange(defaultDateRange);
    setShowDatePicker(defaultDateRange === 'Custom Range');
  }, [defaultDateRange]);

  // Handle date range selection
  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setShowDatePicker(range === 'Custom Range');
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Prepare date parameters
    let dateParams = {};
    if (startDate && endDate && dateRange === 'Custom Range') {
      dateParams = {
        start_date: startDate,
        end_date: endDate
      };
    } else if (dateRange !== 'All Time') {
      dateParams = {
        date_range: dateRange
      };
    }
    
    // Extract form data from any additional form elements
    const formData = new FormData(e.target);
    const formValues = {};
    
    // Convert FormData to regular object
    for (let [key, value] of formData.entries()) {
      if (value !== undefined && value !== null && value !== '') {
        formValues[key] = value;
      }
    }
    
    // Call the onSubmit handler with all form values and date parameters
    onSubmit({
      ...formValues,
      ...dateParams
    });
  };

  return (
    <Form onSubmit={handleSubmit}>
      <div className="d-flex justify-content-center align-items-center mb-4 flex-wrap gap-3">
        {/* Date Range Dropdown */}
        <div className="dropdown">
          <button
            type="button"
            className="btn btn-outline-primary dropdown-toggle"
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

        {/* Custom Filter Elements (passed as children) */}
        {children}

        {/* Submit Button */}
        <Button 
          variant="primary" 
          type="submit" 
          disabled={isLoading}
          className="px-4"
        >
          {isLoading ? (
            <>
              <Spinner
                as="span"
                animation="border"
                size="sm"
                role="status"
                aria-hidden="true"
                className="me-2"
              />
              Loading...
            </>
          ) : "Submit"}
        </Button>
      </div>

      {/* Date Picker for Custom Range */}
      {showDatePicker && (
        <div className="d-flex justify-content-center align-items-center gap-2 mb-4">
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            maxDate={new Date()}
            placeholderText="Start Date"
            className="form-control"
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
            className="form-control"
            dateFormat="dd MMM yyyy"
          />
        </div>
      )}
    </Form>
  ); 
}; 