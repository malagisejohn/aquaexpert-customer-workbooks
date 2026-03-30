import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { OrderCartProvider } from './contexts/OrderCartContext';
import { TodoProvider } from './contexts/TodoContext';
import LoadingSpinner from './components/common/LoadingSpinner';

// Auth components
import Login from './components/auth/Login';
import Register from './components/auth/Register';

// Main app components
import DashboardLayout from './components/layout/DashboardLayout';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import OperatorSetup from './pages/OperatorSetup';
import Systems from './pages/Systems';
import SystemDetail from './pages/SystemDetail';
import KpiWorkbook from './pages/KpiWorkbook';
import Inventory from './pages/Inventory';
import WallchemSettings from './pages/WallchemSettings';
import ReportDetail from './pages/ReportDetail';
import ChatBot from './pages/ChatBot';
import Help from './pages/Help';
import Profile from './pages/Profile';
import Subscription from './pages/Subscription';
import AdminPanel from './pages/AdminPanel';
import PlaceOrder from './pages/PlaceOrder';
import ServiceReports from './pages/ServiceReports';
import DecisionMakerReports from './pages/DecisionMakerReports';
import { isReportsPortalHost } from './utils/portalHost';
import Todos from './pages/Todos';

// Protected route component
const ProtectedRoute = ({ children }) => {
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

  if (user.accountType === 'customer' && isReportsPortalHost()) {
    const path = window.location.pathname;
    const allowedInPortal = ['/CRB-service-reports'];
    if (!allowedInPortal.some((allowed) => path.startsWith(allowed))) {
      return <Navigate to="/CRB-service-reports" replace />;
    }
  }
  
  return children;
};

// Admin route component
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

// Route that blocks operator accounts (redirects them to /systems)
const NonOperatorRoute = ({ children }) => {
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
  
  // Redirect operator accounts to systems
  if (user.accountType === 'customer') {
    return <Navigate to="/systems" replace />;
  }
  
  return children;
};

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
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const EnterpriseFeatureRoute = ({ children }) => {
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

  const isEnterprise = user.accountType !== 'customer' && user.subscription?.plan === 'enterprise';
  if (!isEnterprise) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Default redirect based on user type
const DefaultRedirect = () => {
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
  
  // Customer accounts can be routed to the report portal on a dedicated host.
  const redirectPath = user.accountType === 'customer'
    ? (isReportsPortalHost() ? '/CRB-service-reports' : '/systems')
    : '/dashboard';
  return <Navigate to={redirectPath} replace />;
};

// Public route component (redirect to dashboard/systems if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (user) {
    // Customer accounts can be routed to the report portal on a dedicated host.
    const redirectPath = user.accountType === 'customer'
      ? (isReportsPortalHost() ? '/CRB-service-reports' : '/systems')
      : '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <TodoProvider>
      <OrderCartProvider>
      <div className="App">
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
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
          
          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <NonOperatorRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </NonOperatorRoute>
            }
          />
          
          <Route
            path="/customers"
            element={
              <NonOperatorRoute>
                <DashboardLayout>
                  <Customers />
                </DashboardLayout>
              </NonOperatorRoute>
            }
          />
          
          <Route
            path="/customers/:id"
            element={
              <NonOperatorRoute>
                <DashboardLayout>
                  <CustomerDetail />
                </DashboardLayout>
              </NonOperatorRoute>
            }
          />
          
          <Route
            path="/customers/:id/edit"
            element={
              <NonOperatorRoute>
                <DashboardLayout>
                  <CustomerDetail editMode={true} />
                </DashboardLayout>
              </NonOperatorRoute>
            }
          />
          
          <Route
            path="/customers/:id/operator-setup"
            element={
              <NonOperatorRoute>
                <DashboardLayout>
                  <OperatorSetup />
                </DashboardLayout>
              </NonOperatorRoute>
            }
          />
          
          <Route
            path="/customers/:customerId/systems"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Systems />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/systems"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Systems />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/systems/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SystemDetail />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/systems/:id/edit"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SystemDetail editMode={true} />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/systems/:id/workbook"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <KpiWorkbook />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/systems/:id/inventory"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Inventory />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/walchem-reports"
            element={
              <NonOperatorRoute>
                <DashboardLayout>
                  <WallchemSettings />
                </DashboardLayout>
              </NonOperatorRoute>
            }
          />
          
          <Route
            path="/walchem-settings"
            element={<Navigate to="/walchem-reports" replace />}
          />
          
          <Route
            path="/place-order"
            element={
              <NonOperatorRoute>
                <DashboardLayout>
                  <PlaceOrder />
                </DashboardLayout>
              </NonOperatorRoute>
            }
          />
          
          <Route
            path="/service-reports"
            element={
              <NonOperatorRoute>
                <DashboardLayout>
                  <ServiceReports />
                </DashboardLayout>
              </NonOperatorRoute>
            }
          />

          <Route
            path="/CRB-service-reports"
            element={
              <CustomerOnlyRoute>
                <DashboardLayout>
                  <DecisionMakerReports />
                </DashboardLayout>
              </CustomerOnlyRoute>
            }
          />
          
          <Route
            path="/reports/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ReportDetail />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ChatBot />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/help"
            element={
              <NonOperatorRoute>
                <DashboardLayout>
                  <Help />
                </DashboardLayout>
              </NonOperatorRoute>
            }
          />
          
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Profile />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/subscription"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Subscription />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Todos route */}
          <Route
            path="/todos"
            element={
              <EnterpriseFeatureRoute>
                <DashboardLayout>
                  <Todos />
                </DashboardLayout>
              </EnterpriseFeatureRoute>
            }
          />
          
          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <DashboardLayout>
                  <AdminPanel />
                </DashboardLayout>
              </AdminRoute>
            }
          />
          
          {/* Default redirect */}
          <Route path="/" element={<DefaultRedirect />} />
          
          {/* 404 fallback */}
          <Route
            path="*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-lg text-gray-600 mb-8">Page not found</p>
                  <a
                    href="/dashboard"
                    className="btn-primary"
                  >
                    Go to Dashboard
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
      </div>
      </OrderCartProvider>
      </TodoProvider>
    </Router>
  );
}

export default App;
