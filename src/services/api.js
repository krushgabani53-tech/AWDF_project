import axios from 'axios';

// Detect whether running locally or in cloud production (e.g. Vercel)
const isLocalhost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1');

const api = axios.create({
  // baseURL: isLocalhost ? '/api' : 'https://awdf-project.onrender.com/api',
  baseURL: 'https://awdf-project.onrender.com/api',
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Authorization header if JWT token exists in localStorage (dual cookie + token support)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('slate_auth_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

export const checkBackendHealth = async () => {
  try {
    const response = await api.get('/health');
    if (response.data && response.data.success) {
      return {
        status: 'Connected',
        data: response.data,
      };
    }
    return {
      status: 'Disconnected',
      error: 'Unexpected response from server',
    };
  } catch (error) {
    return {
      status: 'Disconnected',
      error: error.message || 'Server unreachable',
    };
  }
};

export default api;
