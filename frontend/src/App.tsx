import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { Navbar } from './components/Navbar';

// Pages
import { LoginPage } from './pages/LoginPage';
import { StudentExamLandingPage } from './pages/StudentExamLandingPage';
import { StudentExamWorkspacePage } from './pages/StudentExamWorkspacePage';
import { StudentResultPage } from './pages/StudentResultPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { AdminExamsPage } from './pages/AdminExamsPage';
import { AdminQuestionsPage } from './pages/AdminQuestionsPage';
import { AdminStudentsPage } from './pages/AdminStudentsPage';
import { AdminMonitoringPage } from './pages/AdminMonitoringPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const isWorkspace = location.pathname.includes('/workspace');
  const isLogin = location.pathname === '/login';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {!isWorkspace && !isLogin && <Navbar />}
      <main className="flex-1">
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Student Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <StudentExamLandingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/:examId/workspace"
            element={
              <ProtectedRoute>
                <StudentExamWorkspacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/:examId/result"
            element={
              <ProtectedRoute>
                <StudentResultPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/:examId/leaderboard"
            element={
              <ProtectedRoute>
                <LeaderboardPage />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/exams"
            element={
              <ProtectedRoute adminOnly>
                <AdminExamsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/questions"
            element={
              <ProtectedRoute adminOnly>
                <AdminQuestionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute adminOnly>
                <AdminStudentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/exams/:examId/monitoring"
            element={
              <ProtectedRoute adminOnly>
                <AdminMonitoringPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}
