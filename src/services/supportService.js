import api from './api';

export const supportService = {
  // 1. Submit a support ticket
  createSupportTicket: async (ticketData) => {
    try {
      const response = await api.post('/support/tickets', ticketData);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to submit support ticket';
      throw new Error(msg);
    }
  },

  // 2. Retrieve ticket by reference and verified email
  getSupportTicket: async (reference, email) => {
    try {
      const response = await api.get(`/support/tickets/${encodeURIComponent(reference)}`, {
        params: { email: email ? email.trim() : '' },
      });
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to retrieve support ticket';
      throw new Error(msg);
    }
  },

  // 3. Get SMTP service configuration & verification status
  getSupportStatus: async () => {
    try {
      const response = await api.get('/support/status');
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to get support status';
      throw new Error(msg);
    }
  },
};

export default supportService;

