import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import Header from './components/Header';
import Sidebar from './components/Sidebar';

// Route-based code splitting / lazy loading
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const MyTasks = lazy(() => import('./pages/MyTasks'));
const ProjectsPortfolio = lazy(() => import('./pages/ProjectsPortfolio'));
const SupportContact = lazy(() => import('./pages/SupportContact'));
const WorkspacePolicies = lazy(() => import('./pages/WorkspacePolicies'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// Dashboard layout wrapping authenticated views
function AppLayout({ tasksCount }) {
  return (
    <div className="app-container">
      <Header />
      <div className="app-body">
        <Sidebar tasksCount={tasksCount} />
        <main style={{ flex: 1, backgroundColor: 'var(--bg-app)', minHeight: 'calc(100vh - 64px)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [tasksCount, setTasksCount] = useState(0);

  return (
    <Router>
      <AuthProvider>
        <Suspense
          fallback={
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
              Loading workspace chunk...
            </div>
          }
        >
          <Routes>
            {/* Public Authentication Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Workspace Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout tasksCount={tasksCount} />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/tasks" replace />} />
              <Route
                path="/tasks"
                element={<MyTasks onTasksCountChange={(count) => setTasksCount(count)} />}
              />
              <Route path="/projects" element={<ProjectsPortfolio />} />
              <Route path="/support" element={<SupportContact />} />
              <Route path="/policies" element={<WorkspacePolicies />} />
              <Route
                path="/admin"
                element={
                  <RoleProtectedRoute requiredRole="ADMIN">
                    <AdminDashboard />
                  </RoleProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/tasks" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
}
