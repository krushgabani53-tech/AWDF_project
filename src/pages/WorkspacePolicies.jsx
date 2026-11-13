import React from 'react';
import { Package, ShieldCheck, Lock, FileText, CheckCircle2 } from 'lucide-react';

export default function WorkspacePolicies() {
  return (
    <div className="page-container">
      {/* Page Header Card */}
      <div className="page-header-card">
        <div>
          <h1 className="page-title">Workspace Policies & Governance</h1>
          <p className="page-subtitle">
            System rules, non-reversibility protocols, and data security standards.
          </p>
        </div>
        <div className="header-card-actions">
          <span className="chunk-pill">
            <Package size={14} />
            Dynamic Chunk: Policies.chunk.js
          </span>
        </div>
      </div>

      {/* Policies Stack */}
      <div className="policies-stack">
        {/* Policy 1: Protocol 5 */}
        <div className="policy-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Lock size={18} style={{ color: '#0f172a' }} />
            <h2 className="policy-title" style={{ margin: 0 }}>
              Non-Reversible Task Completion (Protocol 5)
            </h2>
          </div>
          <div className="policy-body">
            <p>
              In accordance with enterprise audit standards, once a task is flagged as{' '}
              <strong>Completed</strong>, it is permanently locked in the PostgreSQL database and cannot be transitioned
              back to an ongoing state.
            </p>
            <p>
              Completed tasks cannot be modified, edited, or deleted through normal user operations.
              If additional work is required on a finalized deliverable, the user must create a new follow-up task
              to ensure an uncompromised audit trail.
            </p>
            <p style={{ fontSize: '13px', color: '#15803d', fontWeight: 500 }}>
              ✓ Enforced on both frontend UI and backend API level with HTTP 403 rejection.
            </p>
          </div>
        </div>

        {/* Policy 2: RBAC Architecture */}
        <div className="policy-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <ShieldCheck size={18} style={{ color: '#0f172a' }} />
            <h2 className="policy-title" style={{ margin: 0 }}>
              Role-Based Access Control (RBAC Architecture)
            </h2>
          </div>
          <div className="policy-body">
            <p>
              The workspace enforces strict separation between <strong>Standard User</strong> and{' '}
              <strong>Administrator</strong> privileges:
            </p>

            <table className="sla-table" style={{ margin: '14px 0' }}>
              <thead>
                <tr>
                  <th>Capability / Module</th>
                  <th>Standard User</th>
                  <th>Administrator</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Personal Tasks</strong></td>
                  <td>Manage Own Tasks</td>
                  <td>Manage All Tasks</td>
                </tr>
                <tr>
                  <td><strong>Projects Portfolio</strong></td>
                  <td>View & Permitted Actions</td>
                  <td>Full Management (Create/Edit/Delete)</td>
                </tr>
                <tr>
                  <td><strong>Support Tickets</strong></td>
                  <td>Submit & Track Own Tickets</td>
                  <td>View All Workspace Tickets</td>
                </tr>
                <tr>
                  <td><strong>User Directory & Roles</strong></td>
                  <td>No Access</td>
                  <td>View Users & Promote/Demote Roles</td>
                </tr>
                <tr>
                  <td><strong>Audit Logs & Telemetry</strong></td>
                  <td>No Access</td>
                  <td>Date-Range Filtering & In-Depth Inspection</td>
                </tr>
              </tbody>
            </table>

            <p>
              Public registrations are automatically granted <strong>Standard User</strong> privileges only. Administrator roles can only be conferred by verified administrators.
            </p>
          </div>
        </div>

        {/* Policy 3: Audit Logging */}
        <div className="policy-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <FileText size={18} style={{ color: '#0f172a' }} />
            <h2 className="policy-title" style={{ margin: 0 }}>
              Automated Audit Journaling & Telemetry Retention (Protocol 8)
            </h2>
          </div>
          <div className="policy-body">
            <p>
              All critical actions within the workspace are captured in persistent, timestamped PostgreSQL audit journals:
            </p>
            <ul style={{ paddingLeft: '20px', margin: '8px 0 14px', fontSize: '13.5px', color: '#334155', lineHeight: '1.8' }}>
              <li>User registration, successful logins, failed attempts, and logout sessions.</li>
              <li>Task creations, status transitions (Protocol 5 completion), edits, and deletions.</li>
              <li>Project portfolio additions, velocity updates, and removals.</li>
              <li>Support ticket dispatch and administrative review events.</li>
              <li>User role assignments and privilege alterations.</li>
            </ul>
            <p>
              <strong>Data Minimization Standard:</strong> Audit logs capture user ID, action type, entity identifier, timestamp, and sanitized metadata. Passwords, JWT secrets, SMTP credentials, and full sensitive ticket messages are never recorded in audit journals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
