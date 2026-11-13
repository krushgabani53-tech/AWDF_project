import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/tasks" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please provide a valid email format (e.g. user@example.com).');
      return;
    }

    if (!password || password.length < 8) {
      setError('Password must contain at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Password and Confirm Password do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      });
      navigate('/tasks', { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-app)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '440px', backgroundColor: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
        
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <div className="brand-icon">
            <Check size={18} strokeWidth={3} />
          </div>
          <span className="brand-title" style={{ fontSize: '20px' }}>Slate Workspace</span>
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '6px' }}>
          Create an Account
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Register for a personal workspace (Standard User Role).
        </p>

        {error && (
          <div className="error-notification" style={{ marginBottom: '18px' }}>
            <span>⚠ {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="task-form-group">
            <label className="form-label">FULL NAME *</label>
            <input
              type="text"
              className="task-input"
              placeholder="e.g. Jane Developer"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="task-form-group">
            <label className="form-label">EMAIL ADDRESS *</label>
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
            <label className="form-label">PASSWORD (MIN 8 CHARS) *</label>
            <input
              type="password"
              className="task-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="task-form-group">
            <label className="form-label">CONFIRM PASSWORD *</label>
            <input
              type="password"
              className="task-input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '20px', fontSize: '12px', color: '#64748b', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            ℹ <strong>Role Notice:</strong> Public registrations are granted <strong>Standard User</strong> privileges. Administrative roles can only be granted by existing administrators.
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', padding: '11px', fontSize: '14px', marginBottom: '18px' }}
            disabled={submitting}
          >
            {submitting ? 'Creating Account...' : 'Register as Standard User'}
          </button>
        </form>

        <div style={{ textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary-navy)', fontWeight: 600, textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
