import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Layouts
import { DashboardLayout } from './layouts/DashboardLayout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { UploadPage } from './pages/UploadPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { AnalysisResultsPage } from './pages/AnalysisResultsPage';
import { SmartSuggestionsPage } from './pages/SmartSuggestionsPage';
import { ReviewsPage } from './pages/ReviewsPage';
import { ContentHistoryPage } from './pages/ContentHistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { SettingsPage } from './pages/SettingsPage';

// Protected Route Guard
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F6FF] flex items-center justify-center text-xs font-semibold text-[#77718A]">
        Authenticating session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Authenticated Dashboard Pages */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/analysis" element={<AnalysisPage />} />
              <Route path="/analysis/results/:id" element={<AnalysisResultsPage />} />
              <Route path="/suggestions/:contentId" element={<SmartSuggestionsPage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/history" element={<ContentHistoryPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/users" element={<UserManagementPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Catch-all Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
