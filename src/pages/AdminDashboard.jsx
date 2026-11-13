import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Users, CheckSquare, Layers, MessageSquare, Clock, Filter, RotateCw, AlertTriangle, Search, CheckCircle2 } from 'lucide-react';
import adminService from '../services/adminService';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // overview, users, tickets, audits
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // User Directory State
  const [usersList, setUsersList] = useState([]);
  const [userLoading, setUserLoading] = useState(false);

  // Support Tickets State
  const [ticketsList, setTicketsList] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditFilters, setAuditFilters] = useState({
    startDate: '',
    endDate: '',
    action: 'ALL',
    search: '',
  });

  // Load Overview Stats
  const loadStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getStats();
      if (res && res.success) {
        setStats(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load administrator statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load User Directory
  const loadUsers = useCallback(async () => {
    setUserLoading(true);
    try {
      const res = await adminService.getUsers();
      if (res && res.success) {
        setUsersList(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load users list.');
    } finally {
      setUserLoading(false);
    }
  }, []);

  // Load All Support Tickets
  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const res = await adminService.getSupportTickets();
      if (res && res.success) {
        setTicketsList(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load support tickets.');
    } finally {
      setTicketsLoading(false);
    }
  }, []);

  // Load Audit Logs
  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await adminService.getAuditLogs(auditFilters);
      if (res && res.success) {
        setAuditLogs(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setAuditLoading(false);
    }
  }, [auditFilters]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'tickets') loadTickets();
    if (activeTab === 'audits') loadAuditLogs();
  }, [activeTab, loadUsers, loadTickets, loadAuditLogs]);

  // Handle Role Change
  const handleToggleRole = async (targetUser) => {
    const newRole = targetUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
    const confirmMsg = `Are you sure you want to change the role of "${targetUser.name || targetUser.email}" to ${newRole}?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      const res = await adminService.updateUserRole(targetUser.id, newRole);
      if (res && res.success) {
        setSuccess(`User "${targetUser.email}" role changed to ${newRole}.`);
        setTimeout(() => setSuccess(''), 3500);
        await loadUsers();
        await loadStats();
      }
    } catch (err) {
      setError(err.message || 'Failed to change user role.');
    }
  };

  return (
    <div className="page-container">
      {/* Admin Header Card */}
      <div className="page-header-card">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>
              ENTERPRISE RBAC
            </span>
            <h1 className="page-title" style={{ margin: 0 }}>Administrator Control Desk</h1>
          </div>
          <p className="page-subtitle">
            Centralized governance, audit trail verification, user permissions, and enterprise telemetry.
          </p>
        </div>
        <div className="header-card-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              loadStats();
              if (activeTab === 'users') loadUsers();
              if (activeTab === 'tickets') loadTickets();
              if (activeTab === 'audits') loadAuditLogs();
            }}
          >
            <RotateCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="error-notification" style={{ marginBottom: '18px' }}>
          <span>⚠ {error}</span>
          <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}>×</button>
        </div>
      )}

      {success && (
        <div className="form-notification" style={{ marginBottom: '18px' }}>
          ✓ {success}
        </div>
      )}

      {/* Summary KPI Cards Grid */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
              <span>REGISTERED USERS</span>
              <Users size={16} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
              {stats.total_users}
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
              <span>TOTAL TASKS</span>
              <CheckSquare size={16} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
              {stats.total_tasks}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
              {stats.ongoing_tasks} ongoing · {stats.completed_tasks} done
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
              <span>PROJECTS PORTFOLIO</span>
              <Layers size={16} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
              {stats.total_projects}
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>
              <span>SUPPORT TICKETS</span>
              <MessageSquare size={16} />
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginTop: '6px' }}>
              {stats.total_support_tickets}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="category-tabs-row" style={{ marginBottom: '20px' }}>
        <button
          type="button"
          className={`category-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Recent Activity
        </button>
        <button
          type="button"
          className={`category-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          User Directory ({usersList.length || stats?.total_users || 0})
        </button>
        <button
          type="button"
          className={`category-tab-btn ${activeTab === 'tickets' ? 'active' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          Support Tickets ({stats?.total_support_tickets || 0})
        </button>
        <button
          type="button"
          className={`category-tab-btn ${activeTab === 'audits' ? 'active' : ''}`}
          onClick={() => setActiveTab('audits')}
        >
          Audit Logs
        </button>
      </div>

      {/* TAB 1: Recent Activity Stream */}
      {activeTab === 'overview' && stats && (
        <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '24px' }}>
          <h2 className="card-heading" style={{ marginBottom: '16px' }}>Recent Workspace Activity</h2>
          {stats.recent_activity.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '14px' }}>No recent activity recorded.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.recent_activity.map((act) => (
                <div
                  key={act.id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13.5px' }}
                >
                  <div>
                    <strong style={{ color: '#0f172a' }}>{act.action}</strong>
                    <span style={{ color: '#64748b', marginLeft: '10px' }}>
                      Entity: {act.entity_type} {act.entity_id ? `(#${act.entity_id})` : ''}
                    </span>
                    {act.user_email && (
                      <span style={{ marginLeft: '12px', fontSize: '12px', color: '#1e40af' }}>
                        by {act.user_email}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                    {new Date(act.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: User Directory */}
      {activeTab === 'users' && (
        <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <h2 className="card-heading" style={{ margin: 0 }}>Enterprise User Directory</h2>
              <p className="page-subtitle" style={{ marginTop: '4px' }}>
                Manage workspace permissions and assign administrator roles.
              </p>
            </div>
          </div>

          {userLoading ? (
            <p style={{ color: '#64748b' }}>Loading directory...</p>
          ) : (
            <table className="sla-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Full Name</th>
                  <th>Email Address</th>
                  <th>Role</th>
                  <th>Registered Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((u) => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td><strong>{u.full_name || u.name}</strong></td>
                    <td>{u.email}</td>
                    <td>
                      <span className={u.role === 'ADMIN' ? 'user-role-badge' : 'badge badge-low'}>
                        {u.role}
                      </span>
                    </td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => handleToggleRole(u)}
                        disabled={u.id === user?.id && u.role === 'ADMIN'}
                        title={u.id === user?.id ? "Cannot remove own admin role" : "Toggle Role"}
                      >
                        {u.role === 'ADMIN' ? 'Demote to Standard' : 'Promote to Admin'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 3: Support Tickets */}
      {activeTab === 'tickets' && (
        <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '24px' }}>
          <h2 className="card-heading" style={{ marginBottom: '16px' }}>Workspace Support Tickets</h2>
          {ticketsLoading ? (
            <p style={{ color: '#64748b' }}>Loading tickets...</p>
          ) : ticketsList.length === 0 ? (
            <p style={{ color: '#64748b' }}>No support tickets submitted yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ticketsList.map((t) => (
                <div key={t.id} className="task-card">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span className="project-id-badge">{t.ticket_reference}</span>
                      <strong style={{ fontSize: '14.5px' }}>{t.full_name || t.name}</strong>
                      <span style={{ color: '#64748b', fontSize: '13px' }}>&lt;{t.email}&gt;</span>
                      <span className="badge badge-ongoing">{t.category}</span>
                      <span className="badge badge-medium">{t.priority}</span>
                      <span className="badge badge-completed">{t.status}</span>
                    </div>
                    <p style={{ fontSize: '13.5px', color: '#334155', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0', margin: '8px 0' }}>
                      {t.message}
                    </p>
                    <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                      Submitted: {new Date(t.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Audit Logs */}
      {activeTab === 'audits' && (
        <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '24px' }}>
          <h2 className="card-heading" style={{ marginBottom: '14px' }}>Immutable Security Audit Logs</h2>

          {/* Audit Filters */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', marginBottom: '18px', padding: '12px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '2px' }}>START DATE</label>
              <input
                type="date"
                className="task-input"
                style={{ padding: '6px 10px', fontSize: '12.5px' }}
                value={auditFilters.startDate}
                onChange={(e) => setAuditFilters({ ...auditFilters, startDate: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '2px' }}>END DATE</label>
              <input
                type="date"
                className="task-input"
                style={{ padding: '6px 10px', fontSize: '12.5px' }}
                value={auditFilters.endDate}
                onChange={(e) => setAuditFilters({ ...auditFilters, endDate: e.target.value })}
              />
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '2px' }}>ACTION TYPE</label>
              <select
                className="contact-select"
                style={{ padding: '6px 10px', fontSize: '12.5px', minWidth: '150px' }}
                value={auditFilters.action}
                onChange={(e) => setAuditFilters({ ...auditFilters, action: e.target.value })}
              >
                <option value="ALL">All Actions</option>
                <option value="USER_REGISTER">USER_REGISTER</option>
                <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
                <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                <option value="TASK_CREATE">TASK_CREATE</option>
                <option value="TASK_COMPLETE">TASK_COMPLETE</option>
                <option value="PROJECT_CREATE">PROJECT_CREATE</option>
                <option value="PROJECT_UPDATE">PROJECT_UPDATE</option>
                <option value="ROLE_CHANGE">ROLE_CHANGE</option>
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '2px' }}>SEARCH</label>
              <input
                type="text"
                className="task-input"
                style={{ padding: '6px 10px', fontSize: '12.5px' }}
                placeholder="Search user, action, entity..."
                value={auditFilters.search}
                onChange={(e) => setAuditFilters({ ...auditFilters, search: e.target.value })}
              />
            </div>

            <button
              type="button"
              className="btn-secondary"
              style={{ alignSelf: 'flex-end', padding: '7px 12px', fontSize: '12px' }}
              onClick={() => setAuditFilters({ startDate: '', endDate: '', action: 'ALL', search: '' })}
            >
              Reset
            </button>
          </div>

          {auditLoading ? (
            <p style={{ color: '#64748b' }}>Querying audit journal...</p>
          ) : auditLogs.length === 0 ? (
            <p style={{ color: '#64748b' }}>No audit records found matching your filter criteria.</p>
          ) : (
            <table className="sla-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Entity</th>
                  <th>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '12px', color: '#64748b' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td>
                      <strong style={{ color: '#0f172a' }}>{log.action}</strong>
                    </td>
                    <td>{log.user_email || 'System'}</td>
                    <td>{log.entity_type} {log.entity_id ? `(#${log.entity_id})` : ''}</td>
                    <td style={{ fontSize: '12px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>
                      {typeof log.metadata === 'object' ? JSON.stringify(log.metadata) : log.metadata}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

