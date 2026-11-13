import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, User, Shield } from 'lucide-react';
import { checkBackendHealth } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const [backendStatus, setBackendStatus] = useState('Checking...');
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const verifyBackend = async () => {
      const res = await checkBackendHealth();
      if (isMounted) {
        setBackendStatus(res.status);
      }
    };

    verifyBackend();
    const interval = setInterval(verifyBackend, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand-icon">
          <Check size={18} strokeWidth={3} />
        </div>
        <span className="brand-title">Slate Workspace</span>
        <span className="version-pill">V2.1 (LAZY LOADED)</span>
      </div>

      <div className="header-right">
        <div className="status-pill" title={`Backend Server: ${backendStatus}`}>
          <span
            className={`status-dot ${
              backendStatus === 'Connected'
                ? 'dot-connected'
                : backendStatus === 'Checking...'
                ? 'dot-checking'
                : 'dot-disconnected'
            }`}
          ></span>
          <span>Backend: {backendStatus}</span>
        </div>

        <div className="status-pill">
          <span className="status-dot"></span>
          <span>SMTP: avenixfintech13@gmail.com</span>
        </div>

        <div className="user-pill">
          <span>{user?.email || 'krushgabani53@gmail.com'}</span>
          <span
            className="user-role-badge"
            style={{
              backgroundColor: user?.role === 'ADMIN' ? '#dbeafe' : '#e0e7ff',
              color: user?.role === 'ADMIN' ? '#1d4ed8' : '#3730a3',
            }}
          >
            {user?.role === 'ADMIN' ? (
              <Shield size={12} strokeWidth={2.5} />
            ) : (
              <User size={12} strokeWidth={2.5} />
            )}
            {user?.role || 'USER'}
          </span>
        </div>

        {isAuthenticated ? (
          <button 
            className="signout-btn" 
            onClick={handleSignOut}
            type="button"
          >
            Sign Out
          </button>
        ) : (
          <button
            className="signout-btn"
            onClick={() => navigate('/login')}
            type="button"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}

