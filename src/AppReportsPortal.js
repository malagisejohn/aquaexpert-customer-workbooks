import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoadingSpinner from './components/common/LoadingSpinner';

import Login from './components/auth/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import DashboardLayout from './components/layout/DashboardLayout';
import DecisionMakerReports from './pages/DecisionMakerReports';

const CustomerPortalRoute = ({ children }) => {
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
    return <Navigate to="/CRB-service-reports" replace />;
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
    return <Navigate to="/CRB-service-reports" replace />;
  }

  return <Navigate to="/login" replace />;
};

function AppReportsPortal() {
  return (
    <Router>
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
            path="/CRB-service-reports"
            element={
              <CustomerPortalRoute>
                <DashboardLayout forceReportsPortal>
                  <DecisionMakerReports />
                </DashboardLayout>
              </CustomerPortalRoute>
            }
          />

          <Route path="/" element={<DefaultRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default AppReportsPortal;
