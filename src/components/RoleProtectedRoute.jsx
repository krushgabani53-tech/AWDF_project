import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RoleProtectedRoute({ children, requiredRole = 'ADMIN' }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: '#64748b' }}>
        Verifying role authorization...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== requiredRole) {
    return (
      <div className="page-container">
        <div className="empty-state-card" style={{ maxWidth: '600px', margin: '40px auto' }}>
          <div style={{ color: '#b91c1c', marginBottom: '12px' }}>
            <ShieldAlert size={48} style={{ margin: '0 auto' }} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Access Denied: Administrator Role Required
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>
            In accordance with the Workspace Role-Based Access Control (RBAC) policy, the requested administrative module is restricted to verified administrators.
          </p>
          <Link to="/tasks" className="btn-primary">
            Return to Personal Workspace
          </Link>
        </div>
      </div>
    );
  }

  return children;
}

