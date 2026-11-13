import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Check, Lock, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/tasks';

  if (isAuthenticated) {
    return <Navigate to="/tasks" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please provide both email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password, rememberMe);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '420px', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
        
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div className="brand-icon">
            <Check size={18} strokeWidth={3} />
          </div>
          <span className="brand-title" style={{ fontSize: '20px' }}>Slate Workspace</span>
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '6px' }}>
          Welcome back
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Sign in to your enterprise workspace account.
        </p>

        {error && (
          <div className="error-notification" style={{ marginBottom: '18px' }}>
            <span>⚠ {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="task-form-group">
            <label className="form-label">EMAIL ADDRESS</label>
            <input
              type="email"
              className="task-input"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="task-form-group">
            <label className="form-label">PASSWORD</label>
            <input
              type="password"
              className="task-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', fontSize: '13px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#334155' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
            <span style={{ color: '#64748b', fontSize: '12.5px' }}>Standard / Admin Access</span>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '11px', fontSize: '14px', marginBottom: '18px' }}
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--primary-navy)', fontWeight: 600, textDecoration: 'none' }}>
            Register as Standard User
          </Link>
        </div>
      </div>
    </div>
  );
}
