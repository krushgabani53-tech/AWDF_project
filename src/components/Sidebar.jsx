import React from 'react';
import { NavLink } from 'react-router-dom';
import { ClipboardList, Rocket, Mail, Info, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ tasksCount = 0 }) {
  const { isAdmin } = useAuth();

  return (
    <aside className="app-sidebar">
      <div className="sidebar-nav-section">
        <div className="sidebar-heading">NAVIGATION (CODE-SPLIT)</div>
        <nav>
          <NavLink
            to="/tasks"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar-icon-wrap">
              <ClipboardList size={18} />
            </span>
            <span className="sidebar-text">My Tasks ({tasksCount})</span>
          </NavLink>

          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar-icon-wrap">
              <Rocket size={18} />
            </span>
            <span className="sidebar-text">Projects Portfolio</span>
          </NavLink>

          <NavLink
            to="/support"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar-icon-wrap">
              <Mail size={18} />
            </span>
            <span className="sidebar-text">Support & Contact</span>
          </NavLink>
        </nav>

        {isAdmin && (
          <>
            <div className="sidebar-heading" style={{ marginTop: '20px' }}>ADMINISTRATION</div>
            <nav>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
              >
                <span className="sidebar-icon-wrap">
                  <Shield size={18} />
                </span>
                <span className="sidebar-text">Admin Dashboard</span>
              </NavLink>
            </nav>
          </>
        )}

        <div className="sidebar-heading" style={{ marginTop: '20px' }}>SYSTEM</div>
        <nav>
          <NavLink
            to="/policies"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <span className="sidebar-icon-wrap">
              <span className="info-icon-box">
                <Info size={13} strokeWidth={2.8} />
              </span>
            </span>
            <span className="sidebar-text">Workspace Policies</span>
          </NavLink>
        </nav>
      </div>

      <div className="sidebar-bottom-widget">
        <div className="sidebar-widget-label">ADMIN EMAIL TARGET</div>
        <div className="sidebar-widget-value">krushgabani53@gmail.com</div>
      </div>
    </aside>
  );
}

