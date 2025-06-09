import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Table,
  Badge,
  Button,
  InputGroup,
  FormControl,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import { CSVLink } from 'react-csv';
import { utils, write } from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const RECORDS_PER_PAGE = 15; // Number of records to show initially and on each "Load More" click

const ReportTable = ({
  data,
  columns,
  title,
  filterInfo,
  expandableContent,
  customRowRender,
  customHeaderRender,
  customCellRender,
  initialSortConfig = { key: null, direction: null },
  enableHorizontalScroll = false
}) => {
  const [filteredData, setFilteredData] = useState([]);
  const [displayedData, setDisplayedData] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleRecords, setVisibleRecords] = useState(RECORDS_PER_PAGE);
  const [sortConfig, setSortConfig] = useState(initialSortConfig);
  const [selectedRecords, setSelectedRecords] = useState({});
  
  // Use refs to track previous values and avoid unnecessary re-renders
  const prevDataRef = useRef(data);
  const prevSearchQueryRef = useRef(searchQuery);
  const prevSortConfigRef = useRef(sortConfig);
  const prevFilteredDataRef = useRef(filteredData);
  const prevVisibleRecordsRef = useRef(visibleRecords);

  // Initialize data and selections when data changes
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
      setVisibleRecords(RECORDS_PER_PAGE);
      
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

  // Apply search filter
  useEffect(() => {
    // Skip if search query hasn't changed or data is the same
    if (prevSearchQueryRef.current === searchQuery && prevDataRef.current === data) return;
    prevSearchQueryRef.current = searchQuery;
    
    if (!data || data.length === 0) {
      setFilteredData([]);
      return;
    }
    
    if (searchQuery) {
      const filtered = data.filter(item => {
        return columns.some(col => {
          const value = col.accessor ? item[col.accessor] : null;
          return value && String(value).toLowerCase().includes(searchQuery.toLowerCase());
        });
      });
      setFilteredData(filtered);
    } else {
      setFilteredData(data);
    }
  }, [searchQuery, data, columns]);

  // Update displayed data based on visible records count
  useEffect(() => {
    // Skip if filtered data or visible records haven't changed
    if (
      prevFilteredDataRef.current === filteredData && 
      prevVisibleRecordsRef.current === visibleRecords
    ) return;
    
    prevFilteredDataRef.current = filteredData;
    prevVisibleRecordsRef.current = visibleRecords;
    
    setDisplayedData(filteredData.slice(0, visibleRecords));
  }, [filteredData, visibleRecords]);

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
    setVisibleRecords(RECORDS_PER_PAGE); // Reset visible records when searching
  };

  const handleLoadMore = () => {
    setVisibleRecords(prev => prev + RECORDS_PER_PAGE);
  };

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
        if (column.accessor && column.Header) {
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
    
    // Prepare columns and data for PDF
    const tableColumn = columns
      .filter(col => col.accessor && col.Header && col.includeInExport !== false)
      .map(col => col.Header);
    
    const tableRows = selectedItems.map(item => {
      return columns
        .filter(col => col.accessor && col.Header && col.includeInExport !== false)
        .map(col => {
          if (col.exportFormat) {
            return col.exportFormat(item);
          }
          return item[col.accessor];
        });
    });
    
    // Calculate starting position for the table
    const startY = filterInfo ? (30 + (Object.keys(filterInfo).length * 8)) : 30;
    
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: startY,
      theme: 'grid',
      styles: { fontSize: 10 }
    });
    
    doc.save(`${title || 'report'}.pdf`);
  };

  // CSV data preparation
  const csvData = getSelectedData().map(item => {
    const rowData = {};
    columns.forEach(column => {
      if (column.accessor && column.Header && column.includeInExport !== false) {
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

  // Calculate total width for horizontal scrolling
  const calculateTotalWidth = () => {
    if (!enableHorizontalScroll) return 'auto';
    
    let totalWidth = 0;
    columns.forEach(col => {
      if (col.width) {
        // Extract numeric value from width (e.g. '150px' -> 150)
        const widthValue = parseInt(col.width, 10);
        if (!isNaN(widthValue)) {
          totalWidth += widthValue;
        }
      } else {
        // Default width for columns without specified width
        totalWidth += 120;
      }
    });
    
    // Add width for selection column and expansion column if needed
    totalWidth += 60; // Selection column
    if (expandableContent && !enableHorizontalScroll) {
      totalWidth += 60; // Expansion column
    }
    
    return `${totalWidth}px`;
  };

  return (
    <div className="mt-4">
      {/* Stats and Search Bar */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <span className="text-primary fw-medium">
            <i className="fas fa-table me-1"></i>
            {filteredData.length} Records
          </span>
          <span className="ms-3 text-muted small">
            <i className="fas fa-columns me-1"></i>
            {columns.length} Columns
          </span>
        </div>
        <div>
          <InputGroup size="sm">
            <FormControl
              placeholder="Search..."
              aria-label="Search"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <Button variant="outline-primary">
              <i className="fas fa-search"></i>
            </Button>
          </InputGroup>
        </div>
      </div>
      
      {/* Table Card */}
      <Card className="border shadow-sm">
        <Card.Body className="p-0">
          <div className="table-responsive" style={{ overflowX: enableHorizontalScroll ? 'auto' : 'visible' }}>
            <Table className="table-hover mb-0" size="sm" style={{ width: enableHorizontalScroll ? calculateTotalWidth() : '100%' }}>
              <thead className="bg-light">
                <tr>
                  {/* Expansion column - only show if expandable content is provided and horizontal scroll is not enabled */}
                  {expandableContent && !enableHorizontalScroll && (
                    <th className="text-center align-middle" style={{ width: '40px', ...verticalLineStyle }}></th>
                  )}
                  
                  {/* Selection column */}
                  <th className="text-center align-middle" style={{ width: '40px', ...verticalLineStyle }}>
                    <span className="small text-muted">Incl.</span>
                  </th>
                  
                  {/* Data columns */}
                  {columns.map((column) => (
                    <th 
                      key={column.accessor}
                      className="align-middle user-select-none py-2"
                      style={{ 
                        width: column.width || 'auto', 
                        cursor: column.sortable === false ? 'default' : 'pointer',
                        ...verticalLineStyle,
                        fontSize: '0.85rem',
                        fontWeight: 600
                      }}
                      onClick={() => column.sortable !== false && handleSort(column.accessor)}
                    >
                      {customHeaderRender ? (
                        customHeaderRender(column)
                      ) : (
                        <div className="d-flex justify-content-between align-items-center">
                          <span>{column.Header}</span>
                          {column.sortable !== false && getSortIcon(column.accessor)}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayedData.length > 0 ? (
                  displayedData.map((item) => {
                    const itemId = getIdFromItem(item);
                    
                    return (
                      <React.Fragment key={itemId}>
                        {/* Main row */}
                        <tr 
                          className={`${expandableContent && !enableHorizontalScroll ? 'cursor-pointer' : ''} ${expandedRows[itemId] ? 'table-active' : ''}`}
                          onClick={() => expandableContent && !enableHorizontalScroll && toggleRow(itemId)}
                          style={{ 
                            cursor: (expandableContent && !enableHorizontalScroll) ? 'pointer' : 'default',
                            height: '45px'
                          }}
                        >
                          {/* Expansion column - only show if expandable content is provided and horizontal scroll is not enabled */}
                          {expandableContent && !enableHorizontalScroll && (
                            <td className="text-center align-middle" style={verticalLineStyle}>
                              <i className={`fas fa-chevron-${expandedRows[itemId] ? 'down' : 'right'} transition-all`}></i>
                            </td>
                          )}
                          
                          {/* Selection column */}
                          <td className="text-center align-middle" style={verticalLineStyle}>
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
                              >
                                <i className={`fas fa-eye${selectedRecords[itemId] ? '' : '-slash'} ${selectedRecords[itemId] ? 'text-primary' : 'text-muted'}`} style={{ fontSize: '0.85rem' }}></i>
                              </Button>
                            </OverlayTrigger>
                          </td>
                          
                          {/* Data cells */}
                          {columns.map((column) => (
                            <td 
                              key={`${itemId}-${column.accessor}`} 
                              className={column.cellClassName || "align-middle"}
                              style={verticalLineStyle}
                            >
                              {customCellRender ? (
                                customCellRender(item, column)
                              ) : column.Cell ? (
                                column.Cell(item)
                              ) : (
                                item[column.accessor]
                              )}
                            </td>
                          ))}
                        </tr>
                        
                        {/* Expandable content row - only show if expandable content is provided and horizontal scroll is not enabled */}
                        {expandableContent && !enableHorizontalScroll && (
                          <tr>
                            <td colSpan={columns.length + 2} className="p-0">
                              <div 
                                className={`collapse ${expandedRows[itemId] ? 'show' : ''}`}
                                style={{
                                  transition: 'all 0.3s ease-in-out',
                                  maxHeight: expandedRows[itemId] ? '500px' : '0',
                                  overflow: 'hidden'
                                }}
                              >
                                <div className="p-3 bg-light border-top">
                                  {expandableContent(item)}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={columns.length + (expandableContent && !enableHorizontalScroll ? 2 : 1)} className="text-center py-5">
                      <i className="fas fa-search fa-2x text-muted mb-3"></i>
                      <p className="text-muted">No data found</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
        <Card.Footer className="bg-white py-2">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              {filteredData.length > visibleRecords && (
                <Button 
                  variant="outline-primary"
                  size="sm"
                  onClick={handleLoadMore}
                  className="me-3"
                >
                  <i className="fas fa-sync-alt me-1"></i>
                  Load More ({visibleRecords}/{filteredData.length})
                </Button>
              )}
              {filteredData.length <= visibleRecords && filteredData.length > 0 && (
                <span className="text-muted small me-3">
                  Showing all {filteredData.length} records
                </span>
              )}
              <span className="text-primary small">
                <i className="fas fa-eye me-1"></i>
                {getSelectedData().length} of {displayedData.length} visible records selected for export
              </span>
            </div>
            <div className="d-flex gap-2">
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
          </div>
        </Card.Footer>
      </Card>
    </div>
  );
};

export default ReportTable; 