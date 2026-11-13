const { pool } = require('../config/database');

/**
 * Log an audit action to PostgreSQL
 * @param {Object} options
 * @param {number|null} options.userId
 * @param {string} options.action
 * @param {string} options.entityType
 * @param {string|number|null} options.entityId
 * @param {Object} [options.metadata={}]
 */
async function logAudit({ userId = null, action, entityType = 'WORKSPACE', entityId = null, metadata = {} }) {
  try {
    // Sanitize metadata to never include sensitive credentials
    const cleanMeta = { ...metadata };
    delete cleanMeta.password;
    delete cleanMeta.password_hash;
    delete cleanMeta.token;
    delete cleanMeta.jwt;
    delete cleanMeta.secret;
    delete cleanMeta.message; // Never store full ticket messages in audit logs

    const query = `
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP);
    `;
    const values = [userId, action, entityType, entityId ? entityId.toString() : null, JSON.stringify(cleanMeta)];
    await pool.query(query, values);
  } catch (err) {
    // Do not fail the main request if audit logging encounters an issue
    console.error(`[AUDIT_LOG_ERROR] Failed to record action "${action}":`, err.message);
  }
}

module.exports = {
  logAudit,
};

