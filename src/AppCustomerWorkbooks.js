import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { OrderCartProvider } from './contexts/OrderCartContext';
import { TodoProvider } from './contexts/TodoContext';
import LoadingSpinner from './components/common/LoadingSpinner';

import Login from './components/auth/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import DashboardLayout from './components/layout/DashboardLayout';
import Systems from './pages/Systems';
import SystemDetail from './pages/SystemDetail';
import KpiWorkbook from './pages/KpiWorkbook';
import Inventory from './pages/Inventory';
import ChatBot from './pages/ChatBot';
import Profile from './pages/Profile';
import ReportDetail from './pages/ReportDetail';

const CustomerOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.accountType !== 'customer') {
    return <Navigate to="/login" replace />;
  }

  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user?.accountType === 'customer') {
    return <Navigate to="/systems" replace />;
  }

  return children;
};

const DefaultRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user?.accountType === 'customer') {
    return <Navigate to="/systems" replace />;
  }

  return <Navigate to="/login" replace />;
};

function AppCustomerWorkbooks() {
  return (
    <Router>
      <TodoProvider>
        <OrderCartProvider>
          <div className="App">
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PublicRoute>
                    <ForgotPassword />
                  </PublicRoute>
                }
              />
              <Route
                path="/reset-password/:token"
                element={
                  <PublicRoute>
                    <ResetPassword />
                  </PublicRoute>
                }
              />

              <Route
                path="/systems"
                element={
                  <CustomerOnlyRoute>
                    <DashboardLayout>
                      <Systems />
                    </DashboardLayout>
                  </CustomerOnlyRoute>
                }
              />
              <Route
                path="/systems/:id"
                element={
                  <CustomerOnlyRoute>
                    <DashboardLayout>
                      <SystemDetail />
                    </DashboardLayout>
                  </CustomerOnlyRoute>
                }
              />
              <Route
                path="/systems/:id/edit"
                element={
                  <CustomerOnlyRoute>
                    <DashboardLayout>
                      <SystemDetail editMode={true} />
                    </DashboardLayout>
                  </CustomerOnlyRoute>
                }
              />
              <Route
                path="/systems/:id/workbook"
                element={
                  <CustomerOnlyRoute>
                    <DashboardLayout>
                      <KpiWorkbook />
                    </DashboardLayout>
                  </CustomerOnlyRoute>
                }
              />
              <Route
                path="/systems/:id/inventory"
                element={
                  <CustomerOnlyRoute>
                    <DashboardLayout>
                      <Inventory />
                    </DashboardLayout>
                  </CustomerOnlyRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <CustomerOnlyRoute>
                    <DashboardLayout>
                      <ChatBot />
                    </DashboardLayout>
                  </CustomerOnlyRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <CustomerOnlyRoute>
                    <DashboardLayout>
                      <Profile />
                    </DashboardLayout>
                  </CustomerOnlyRoute>
                }
              />
              <Route
                path="/reports/:id"
                element={
                  <CustomerOnlyRoute>
                    <DashboardLayout>
                      <ReportDetail />
                    </DashboardLayout>
                  </CustomerOnlyRoute>
                }
              />

              <Route path="/" element={<DefaultRedirect />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </OrderCartProvider>
      </TodoProvider>
    </Router>
  );
}

export default AppCustomerWorkbooks;
