import api from './api';

export const authService = {
  // 1. Register a new Standard User
  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Registration failed';
      throw new Error(msg);
    }
  },

  // 2. Login
  login: async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Login failed';
      throw new Error(msg);
    }
  },

  // 3. Logout
  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Logout failed';
      throw new Error(msg);
    }
  },

  // 4. Get Current Authenticated User (Session Verification)
  getMe: async () => {
    try {
      const response = await api.get('/auth/me');
      return response.data;
    } catch (error) {
      // Return null rather than throwing so callers can handle gracefully
      return null;
    }
  },
};

export default authService;

