import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, ThemeProvider } from '@mui/material';
import { useTranslation } from 'react-i18next';
import modernTheme from './theme/modernTheme';

// Context
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Components
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import LoadingSpinner from './components/Common/LoadingSpinner';

// Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import TravelList from './pages/Travel/TravelList';
import TravelForm from './pages/Travel/TravelForm';
import TravelDetail from './pages/Travel/TravelDetail';
import ExpenseList from './pages/Expense/ExpenseList';
import ExpenseForm from './pages/Expense/ExpenseForm';
import ExpenseDetail from './pages/Expense/ExpenseDetail';
import ApprovalList from './pages/Approval/ApprovalList';
import ApprovalWorkflowManagement from './pages/Approval/ApprovalWorkflowManagement';
import ApprovalStatistics from './pages/Approval/ApprovalStatistics';
import ApprovalDetail from './pages/Approval/ApprovalDetail';
import Reports from './pages/Reports/Reports';
import Profile from './pages/Profile/Profile';
import Settings from './pages/Settings/Settings';
import I18nDashboardPage from './pages/I18n/I18nDashboard';
import LocationManagement from './pages/Location/LocationManagement';
import StandardQuery from './pages/TravelStandard/StandardQuery';
import StandardList from './pages/TravelStandard/StandardList';
import StandardForm from './pages/TravelStandard/StandardForm';
import StandardDetail from './pages/TravelStandard/StandardDetail';
import ExpenseItemsManagement from './pages/TravelStandard/ExpenseItemsManagement';
import ExpenseItemsMaintenance from './pages/TravelStandard/ExpenseItemsMaintenance';
import RoleManagement from './pages/Role/RoleManagement';
import PositionManagement from './pages/Position/PositionManagement';
import UserManagement from './pages/User/UserManagement';
import CurrencyManagement from './pages/Currency/CurrencyManagement';
import InvoiceList from './pages/Invoice/InvoiceList';
import InvoiceUpload from './pages/Invoice/InvoiceUpload';
import InvoiceDetail from './pages/Invoice/InvoiceDetail';
import Logs from './pages/Logs/Logs';

function App() {
  const { i18n } = useTranslation();

  return (
    <ThemeProvider theme={modernTheme}>
      <AuthProvider>
        <NotificationProvider>
          <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              
              {/* Travel Routes */}
              <Route path="travel" element={<TravelList />} />
              <Route path="travel/new" element={<TravelForm />} />
              <Route path="travel/:id" element={<TravelDetail />} />
              <Route path="travel/:id/edit" element={<TravelForm />} />
              
              {/* Expense Routes */}
              <Route path="expenses" element={<ExpenseList />} />
              <Route path="expenses/new" element={<ExpenseForm />} />
              <Route path="expenses/:id" element={<ExpenseDetail />} />
              <Route path="expenses/:id/edit" element={<ExpenseForm />} />
              
              {/* Approval Routes */}
              <Route path="approvals" element={<ApprovalList />} />
              <Route path="approvals/:type/:id" element={<ApprovalDetail />} />
              <Route path="approval-workflows" element={<ApprovalWorkflowManagement />} />
              <Route path="approval-statistics" element={<ApprovalStatistics />} />
              
              {/* Reports Routes */}
              <Route path="reports" element={<Reports />} />
              
              {/* Profile & Settings */}
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              
              {/* I18n Dashboard */}
              <Route path="i18n" element={<I18nDashboardPage />} />
              
              {/* Location Management */}
              <Route path="location" element={<LocationManagement />} />
              <Route path="locations" element={<LocationManagement />} />
              
              {/* Travel Standard Routes */}
              <Route path="travel-standards" element={<StandardList />} />
              <Route path="travel-standards/new" element={<StandardForm />} />
              <Route path="travel-standards/query" element={<StandardQuery />} />
              <Route path="travel-standards/:standardId/expense-items" element={<ExpenseItemsManagement />} />
              <Route path="travel-standards/:id/edit" element={<StandardForm />} />
              <Route path="travel-standards/:id" element={<StandardDetail />} />
              
              {/* Expense Items Maintenance */}
              <Route path="expense-items" element={<ExpenseItemsMaintenance />} />
              
              {/* Role Management */}
              <Route path="roles" element={<RoleManagement />} />
              
              {/* Position Management */}
              <Route path="positions" element={<PositionManagement />} />
              
              {/* User Management */}
              <Route path="users" element={<UserManagement />} />
              
              {/* Currency Management */}
              <Route path="currencies" element={<CurrencyManagement />} />
              
              {/* Invoice Routes */}
              <Route path="invoices" element={<InvoiceList />} />
              <Route path="invoices/upload" element={<InvoiceUpload />} />
              <Route path="invoices/:id" element={<InvoiceDetail />} />
              
              {/* Logs Routes */}
              <Route path="logs" element={<Logs />} />
            </Route>
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Box>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
