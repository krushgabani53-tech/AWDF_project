import axios from 'axios';

// Globally fixed Backend API URL
export const BACKEND_API_URL = 'https://awdf-project.onrender.com/api';

const api = axios.create({
  baseURL: BACKEND_API_URL,
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
