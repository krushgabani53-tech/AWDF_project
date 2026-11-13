import api from './api';

export const adminService = {
  // 1. Get system metrics and recent activity
  getStats: async () => {
    try {
      const response = await api.get('/admin/stats');
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to fetch admin stats';
      throw new Error(msg);
    }
  },

  // 2. Get user directory
  getUsers: async () => {
    try {
      const response = await api.get('/admin/users');
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to fetch user directory';
      throw new Error(msg);
    }
  },

  // 3. Update a user's role (USER <-> ADMIN)
  updateUserRole: async (userId, role) => {
    try {
      const response = await api.patch(`/admin/users/${userId}/role`, { role });
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to update user role';
      throw new Error(msg);
    }
  },

  // 4. Get audit logs with optional date, action, search filters
  getAuditLogs: async (params = {}) => {
    try {
      const response = await api.get('/admin/audit-logs', { params });
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to fetch audit logs';
      throw new Error(msg);
    }
  },

  // 5. Get all support tickets
  getSupportTickets: async () => {
    try {
      const response = await api.get('/admin/support-tickets');
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to fetch support tickets';
      throw new Error(msg);
    }
  },
};

export default adminService;

