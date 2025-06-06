import React from 'react';
import { Card, Row, Col, Table, Badge } from 'react-bootstrap';
import VerticalSidebar from "../components/VerticalSidebar";
import Header from "../components/Header";
import Footer from "../components/Footer";

function OutletDetails() {
  // Sample outlet data
  const outletData = {
    name: "MenuMitra Central",
    address: "123 Food Street, Bangalore, Karnataka 560001",
    contactNumber: "+91 9876543210",
    email: "central@menumitra.com",
    operatingHours: "10:00 AM - 11:00 PM",
    manager: "Rahul Sharma",
    status: "Active",
    totalStaff: 24,
    seatingCapacity: 120,
    rating: 4.7
  };

  // Sample performance metrics
  const performanceMetrics = [
    { metric: "Average Daily Revenue", value: "₹45,650", change: "+12%", status: "success" },
    { metric: "Average Orders per Day", value: "128", change: "+8%", status: "success" },
    { metric: "Average Order Value", value: "₹367", change: "-3%", status: "danger" },
    { metric: "Customer Satisfaction", value: "4.7/5", change: "+0.2", status: "success" },
    { metric: "Table Turnover Rate", value: "3.5/day", change: "+0.3", status: "success" },
    { metric: "Average Service Time", value: "24 mins", change: "-2 mins", status: "success" }
  ];

  // Sample staff data
  const staffData = [
    { name: "Rahul Sharma", position: "Manager", performance: "Excellent", attendance: "98%" },
    { name: "Priya Singh", position: "Head Chef", performance: "Good", attendance: "95%" },
    { name: "Amit Kumar", position: "Waiter", performance: "Average", attendance: "90%" },
    { name: "Sneha Patel", position: "Cashier", performance: "Good", attendance: "96%" },
    { name: "Vikram Reddy", position: "Kitchen Staff", performance: "Good", attendance: "92%" }
  ];

  return (
    <div className="layout-wrapper layout-content-navbar">
      <div className="layout-container">
        <VerticalSidebar />
        <div className="layout-page d-flex flex-column min-vh-100">
          <Header />
          <div className="content-wrapper flex-grow-1 p-0">
            <div className="container-xxl flex-grow-1 p-0">
              <Row className="m-0">
                <Col md={12} lg={6} className="p-0 pe-lg-2">
                  <Card className="rounded-0 border-0 shadow-none h-100">
                    <Card.Header>
                      <h5 className="card-title mb-0">Basic Information</h5>
                    </Card.Header>
                    <Card.Body>
                      <div className="d-flex align-items-start mb-3">
                        <div className="flex-shrink-0 me-3">
                          <div className="avatar avatar-lg">
                            <div className="avatar-initial rounded bg-label-primary">
                              <i className="fas fa-store fa-lg"></i>
                            </div>
                          </div>
                        </div>
                        <div className="flex-grow-1">
                          <h5 className="mb-1">{outletData.name}</h5>
                          <Badge bg={outletData.status === "Active" ? "success" : "danger"}>
                            {outletData.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="info-container">
                        <div className="mb-3">
                          <small className="text-muted d-block">Address:</small>
                          <div>{outletData.address}</div>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted d-block">Contact Number:</small>
                          <div>{outletData.contactNumber}</div>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted d-block">Email:</small>
                          <div>{outletData.email}</div>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted d-block">Operating Hours:</small>
                          <div>{outletData.operatingHours}</div>
                        </div>
                        <div className="mb-3">
                          <small className="text-muted d-block">Manager:</small>
                          <div>{outletData.manager}</div>
                        </div>
                        <div className="row">
                          <div className="col-6 mb-3">
                            <small className="text-muted d-block">Total Staff:</small>
                            <div>{outletData.totalStaff}</div>
                          </div>
                          <div className="col-6 mb-3">
                            <small className="text-muted d-block">Seating Capacity:</small>
                            <div>{outletData.seatingCapacity}</div>
                          </div>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={12} lg={6} className="p-0 ps-lg-2 mt-4 mt-lg-0">
                  <Card className="rounded-0 border-0 shadow-none h-100">
                    <Card.Header>
                      <h5 className="card-title mb-0">Performance Metrics</h5>
                    </Card.Header>
                    <Card.Body>
                      <div className="table-responsive">
                        <Table hover>
                          <thead>
                            <tr>
                              <th>Metric</th>
                              <th>Value</th>
                              <th>Change</th>
                            </tr>
                          </thead>
                          <tbody>
                            {performanceMetrics.map((item, index) => (
                              <tr key={index}>
                                <td>{item.metric}</td>
                                <td>{item.value}</td>
                                <td>
                                  <span className={`text-${item.status}`}>
                                    {item.change}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Row className="m-0 mt-4">
                <Col md={12} className="p-0">
                  <Card className="rounded-0 border-0 shadow-none">
                    <Card.Header>
                      <h5 className="card-title mb-0">Staff Information</h5>
                    </Card.Header>
                    <Card.Body className="p-0">
                      <div className="table-responsive">
                        <Table hover className="mb-0">
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Position</th>
                              <th>Performance</th>
                              <th>Attendance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {staffData.map((staff, index) => (
                              <tr key={index}>
                                <td>{staff.name}</td>
                                <td>{staff.position}</td>
                                <td>
                                  <Badge bg={
                                    staff.performance === "Excellent" ? "success" :
                                    staff.performance === "Good" ? "primary" :
                                    "warning"
                                  }>
                                    {staff.performance}
                                  </Badge>
                                </td>
                                <td>{staff.attendance}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </div>
            <Footer />
          </div>
        </div>
      </div>
    </div>
  );
}

export default OutletDetails; 