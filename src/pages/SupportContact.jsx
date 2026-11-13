import React, { useState, useEffect } from 'react';
import { Package, Mail, ShieldAlert, Clock, Search, CheckCircle2, AlertCircle, Server } from 'lucide-react';
import supportService from '../services/supportService';

export default function SupportContact() {
  // Ticket Form State
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    category: 'Technical Issue',
    message: '',
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(null);
  const [submissionError, setSubmissionError] = useState('');

  // SMTP Status State
  const [smtpStatus, setSmtpStatus] = useState({
    configured: false,
    status: 'Checking...',
    message: 'Verifying SMTP service...',
  });

  // Ticket Lookup State
  const [lookupRef, setLookupRef] = useState('');
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');

  // Fetch SMTP status on mount
  useEffect(() => {
    const fetchSmtpStatus = async () => {
      try {
        const response = await supportService.getSupportStatus();
        if (response && response.success && response.smtp) {
          setSmtpStatus(response.smtp);
        }
      } catch (err) {
        setSmtpStatus({
          configured: false,
          status: 'Disconnected',
          message: 'Unable to query SMTP service status from backend.',
        });
      }
    };

    fetchSmtpStatus();
  }, []);

  // Form Validation
  const validateForm = () => {
    const errors = {};
    if (!formData.full_name.trim()) {
      errors.full_name = 'Full Name is required.';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email Address is required.';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Please provide a valid email format (e.g. name@example.com).';
      }
    }

    if (!formData.category.trim()) {
      errors.category = 'Please select a category.';
    }

    if (!formData.message.trim()) {
      errors.message = 'Message description is required.';
    } else if (formData.message.trim().length < 10) {
      errors.message = 'Message description must contain at least 10 characters.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Ticket Handler
  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    setSubmissionError('');
    setSubmissionSuccess(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await supportService.createSupportTicket({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        category: formData.category,
        message: formData.message.trim(),
      });

      if (response && response.success) {
        setSubmissionSuccess(response.data);
        setFormData({
          full_name: '',
          email: '',
          category: 'Technical Issue',
          message: '',
        });
        setValidationErrors({});
      }
    } catch (err) {
      setSubmissionError(err.message || 'Failed to submit support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  // Lookup Ticket Handler
  const handleLookupTicket = async (e) => {
    e.preventDefault();
    setLookupError('');
    setLookupResult(null);

    if (!lookupRef.trim()) {
      setLookupError('Ticket reference number is required.');
      return;
    }
    if (!lookupEmail.trim()) {
      setLookupError('Verified email address is required.');
      return;
    }

    setLookupLoading(true);
    try {
      const response = await supportService.getSupportTicket(lookupRef.trim(), lookupEmail.trim());
      if (response && response.success) {
        setLookupResult(response.data);
      }
    } catch (err) {
      setLookupError(err.message || 'Ticket not found or email verification failed.');
    } finally {
      setLookupLoading(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header Card */}
      <div className="page-header-card">
        <div>
          <h1 className="page-title">Support & Contact</h1>
          <p className="page-subtitle">
            Direct communication channel to the engineering governance, technical support, and administrative team.
          </p>
        </div>
        <div className="header-card-actions">
          <span className="chunk-pill">
            <Package size={14} />
            Dynamic Chunk: Contact.chunk.js
          </span>
          <span className="status-pill">
            <span
              className={`status-dot ${
                smtpStatus.status === 'Connected'
                  ? 'dot-connected'
                  : smtpStatus.status === 'Checking...'
                  ? 'dot-checking'
                  : 'dot-disconnected'
              }`}
            ></span>
            SMTP: {smtpStatus.status}
          </span>
        </div>
      </div>

      {/* Main Grid: Left (Form + Tracker) & Right (Contacts + SLA + SMTP) */}
      <div className="support-grid">
        {/* Left Column */}
        <div>
          {/* Submission Success Confirmation Card */}
          {submissionSuccess && (
            <div className="ticket-confirmation-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#15803d', marginBottom: '8px' }}>
                <CheckCircle2 size={20} />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>
                  Support Ticket Dispatched & Logged
                </h3>
              </div>
              <p style={{ fontSize: '13.5px', color: '#166534', margin: '4px 0 10px' }}>
                Your ticket has been recorded in the workspace PostgreSQL database. You can track its progress anytime using your reference number and email.
              </p>

              <div>
                <span className="ticket-ref-badge">{submissionSuccess.ticket_reference}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', color: '#334155' }}>
                <div>Status: <strong style={{ color: '#15803d' }}>{submissionSuccess.status}</strong></div>
                <div>Priority: <strong>{submissionSuccess.priority}</strong></div>
                <div>Category: <strong>{submissionSuccess.category}</strong></div>
                <div>
                  Submitted: <strong>{new Date(submissionSuccess.created_at).toLocaleString()}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Ticket Submission Form Card */}
          <div className="support-form-card">
            <h2 className="card-heading" style={{ marginBottom: '4px' }}>
              Submit Administrative Ticket
            </h2>
            <p className="page-subtitle" style={{ marginBottom: '22px' }}>
              Please provide complete details. Public inquiries default to Standard priority.
            </p>

            {submissionError && (
              <div className="error-notification" style={{ marginBottom: '16px' }}>
                <span>⚠ {submissionError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitTicket}>
              <div className="form-row-2col">
                <div>
                  <label className="form-label">FULL NAME *</label>
                  <input
                    type="text"
                    className="contact-input"
                    placeholder="e.g. Krush Gabani"
                    value={formData.full_name}
                    onChange={(e) => {
                      setFormData({ ...formData, full_name: e.target.value });
                      if (validationErrors.full_name) {
                        setValidationErrors({ ...validationErrors, full_name: '' });
                      }
                    }}
                  />
                  {validationErrors.full_name && (
                    <div className="form-error-text">{validationErrors.full_name}</div>
                  )}
                </div>

                <div>
                  <label className="form-label">EMAIL ADDRESS *</label>
                  <input
                    type="email"
                    className="contact-input"
                    placeholder="user@example.com"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (validationErrors.email) {
                        setValidationErrors({ ...validationErrors, email: '' });
                      }
                    }}
                  />
                  {validationErrors.email && (
                    <div className="form-error-text">{validationErrors.email}</div>
                  )}
                </div>
              </div>

              <div className="form-group-spaced">
                <label className="form-label">CATEGORY *</label>
                <select
                  className="contact-select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="Technical Issue">Technical Issue</option>
                  <option value="Account & Access">Account & Access</option>
                  <option value="Bug Report">Bug Report</option>
                  <option value="Feature Request">Feature Request</option>
                  <option value="General Inquiry">General Inquiry</option>
                </select>
                {validationErrors.category && (
                  <div className="form-error-text">{validationErrors.category}</div>
                )}
              </div>

              <div className="form-group-spaced">
                <label className="form-label">MESSAGE DESCRIPTION (MIN 10 CHARS) *</label>
                <textarea
                  className="contact-textarea"
                  rows={5}
                  placeholder="Provide detailed description of your request or issue..."
                  value={formData.message}
                  onChange={(e) => {
                    setFormData({ ...formData, message: e.target.value });
                    if (validationErrors.message) {
                      setValidationErrors({ ...validationErrors, message: '' });
                    }
                  }}
                />
                {validationErrors.message && (
                  <div className="form-error-text">{validationErrors.message}</div>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                disabled={submitting}
              >
                {submitting ? 'Submitting Ticket...' : 'Submit Ticket'}
              </button>
            </form>
          </div>

          {/* Ticket Lookup / Search Section */}
          <div className="ticket-lookup-card">
            <h2 className="card-heading" style={{ marginBottom: '4px' }}>
              Track Existing Ticket
            </h2>
            <p className="page-subtitle" style={{ marginBottom: '18px' }}>
              Check ticket status by providing your ticket reference number and verified email address.
            </p>

            <form onSubmit={handleLookupTicket}>
              <div className="form-row-2col">
                <div>
                  <label className="form-label">TICKET REFERENCE</label>
                  <input
                    type="text"
                    className="contact-input"
                    placeholder="e.g. TKT-2026-123456"
                    value={lookupRef}
                    onChange={(e) => setLookupRef(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">YOUR EMAIL ADDRESS</label>
                  <input
                    type="email"
                    className="contact-input"
                    placeholder="email used when submitting"
                    value={lookupEmail}
                    onChange={(e) => setLookupEmail(e.target.value)}
                  />
                </div>
              </div>

              {lookupError && (
                <div className="form-error-text" style={{ marginBottom: '14px' }}>
                  ⚠ {lookupError}
                </div>
              )}

              <button
                type="submit"
                className="btn-secondary"
                style={{ width: '100%', padding: '10px', fontSize: '13.5px', justifyContent: 'center' }}
                disabled={lookupLoading}
              >
                <Search size={14} />
                {lookupLoading ? 'Checking Database...' : 'Track Ticket'}
              </button>
            </form>

            {lookupResult && (
              <div style={{ marginTop: '18px', padding: '16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span className="project-id-badge">{lookupResult.ticket_reference}</span>
                  <span className={lookupResult.status === 'Open' ? 'project-status-active' : 'project-status-completed'}>
                    {lookupResult.status}
                  </span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                  Category: {lookupResult.category}
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '10px' }}>
                  Priority: {lookupResult.priority} | Submitted: {new Date(lookupResult.created_at).toLocaleString()}
                </div>
                <p style={{ fontSize: '13.5px', color: '#334155', background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  {lookupResult.message}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Contact Info, SMTP Status & SLA */}
        <div>
          {/* Support Contact Information */}
          <div className="executive-contacts-card">
            <h2 className="card-heading" style={{ marginBottom: '6px' }}>
              Support Contact Channels
            </h2>
            <p className="page-subtitle" style={{ marginBottom: '18px', fontSize: '12.5px' }}>
              Standard enterprise communication channels.
            </p>

            <div className="contact-item">
              <div className="contact-item-icon-box">
                <Mail size={18} />
              </div>
              <div>
                <div className="contact-item-label">SUPPORT EMAIL</div>
                <div className="contact-item-val">support@example.com</div>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-item-icon-box">
                <Mail size={18} />
              </div>
              <div>
                <div className="contact-item-label">TECHNICAL SUPPORT</div>
                <div className="contact-item-val">technical@example.com</div>
              </div>
            </div>

            <div className="contact-item">
              <div className="contact-item-icon-box">
                <Mail size={18} />
              </div>
              <div>
                <div className="contact-item-label">GENERAL INQUIRIES</div>
                <div className="contact-item-val">contact@example.com</div>
              </div>
            </div>

            <p className="placeholder-note">
              * Note: These are placeholder addresses and must be replaced with real company email addresses before production.
            </p>
          </div>

          {/* SMTP Service Status Card */}
          <div className="executive-contacts-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <h2 className="card-heading" style={{ margin: 0 }}>
                SMTP Service Status
              </h2>
              <span
                className={`status-dot ${
                  smtpStatus.status === 'Connected'
                    ? 'dot-connected'
                    : smtpStatus.status === 'Checking...'
                    ? 'dot-checking'
                    : 'dot-disconnected'
                }`}
              ></span>
            </div>

            <div style={{ marginTop: '10px', fontSize: '13px', color: '#334155' }}>
              Status: <strong>{smtpStatus.status}</strong>
            </div>
            <p style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>
              {smtpStatus.message}
            </p>
          </div>

          {/* Response SLA Information Card */}
          <div className="sla-card">
            <h2 className="card-heading" style={{ marginBottom: '4px' }}>
              Support SLA Targets
            </h2>
            <p className="page-subtitle" style={{ fontSize: '12.5px', marginBottom: '8px' }}>
              Response-time benchmarks by severity level.
            </p>

            <table className="sla-table">
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Response Target</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>P1 (Critical)</strong></td>
                  <td>Under 30 minutes</td>
                </tr>
                <tr>
                  <td><strong>P2 (Elevated)</strong></td>
                  <td>Under 2 hours</td>
                </tr>
                <tr>
                  <td><strong>Standard</strong></td>
                  <td>Same business day</td>
                </tr>
              </tbody>
            </table>

            <p className="placeholder-note">
              * Note: These are response targets, not guaranteed resolution times. All new public inquiries default to Standard priority.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
