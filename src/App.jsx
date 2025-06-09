import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import "./assets/css/demo.css";
import "./assets/css/core.css";
import "./assets/css/theme-default.css";
import "./assets/css/menu.css";
import HomeScreen from './screen/HomeScreen'
import LoginScreen from './screen/LoginScreen'
import MyProfile from './screen/MyProfile'
import CompareOutlets from './screen/CompareOutlets'
import Statistics from './screen/Statistics'
import OutletDetails from './screen/OutletDetails'
import { ThemeProvider } from './components/ThemeContext'
import { DashboardProvider } from './context/DashboardContext'
import { CacheDataProvider } from './context/CacheDataContext'
import { RefreshManagerProvider } from './context/RefreshManager'
import MenuReports from './screen/reports/MenuReports'
import OrderReports from './screen/reports/OrderReports'
import TableReports from './screen/reports/TableReports'
import CouponReports from './screen/reports/CouponReports'
import InventoryReports from './screen/reports/InventoryReports'
import StaffReports from './screen/reports/StaffReports'
import CustomerReports from './screen/reports/CustomerReports'
import JoinTableReports from './screen/reports/JoinTableReports'
import SplitTableReports from './screen/reports/SplitTableReports'
import OrderStatusReports from './screen/reports/OrderStatusReports'
import PaymentSettleReports from './screen/reports/PaymentSettleReports'


import Settings from './screen/Settings';
import MyActivity from './screen/MyActivity';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <DashboardProvider>
          <CacheDataProvider>
            <RefreshManagerProvider>
              <div className="layout-wrapper layout-content-navbar">
                <div className="layout-container">
                  {/* Routes */}
                  <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={<LoginScreen />} />
                    
                    {/* Protected routes */}
                    <Route path="/dashboard" element={<HomeScreen />} />
                    <Route path="/profile" element={<MyProfile />} />
                    <Route path="/settings" element={<Settings />} /> 
                    <Route path="/compare-outlets" element={<CompareOutlets />} /> 
                    <Route path="/statistics" element={<Statistics />} />
                    <Route path="/outlet-details" element={<OutletDetails />} />
                    <Route path="/reports/menu" element={<MenuReports />} />
                    <Route path="/reports/orders" element={<OrderReports />} />
                    <Route path="/reports/tables" element={<TableReports />} />
                    <Route path="/reports/join-tables" element={<JoinTableReports />} />
                    <Route path="/reports/split-tables" element={<SplitTableReports />} />
                    <Route path="/reports/order-status" element={<OrderStatusReports />} />
                    <Route path="/reports/payment-settle" element={<PaymentSettleReports />} />
                    <Route path="/reports/coupons" element={<CouponReports />} />
                    <Route path="/reports/inventory" element={<InventoryReports />} />
                    <Route path="/reports/staff" element={<StaffReports />} />
                    <Route path="/reports/customers" element={<CustomerReports />} />
                    <Route path="/my-activity" element={<MyActivity />} />
                    
                    {/* Default redirect to login */}
                    <Route path="/" element={<Navigate to="/login" replace />} />
                
                    {/* 404 - Not Found */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                  </Routes>
                </div>
              </div>
            </RefreshManagerProvider>
          </CacheDataProvider>
        </DashboardProvider>
      </ThemeProvider>
    </Router>
  )
}

export default App
