import axios from 'axios';

// Use relative '/api' so it seamlessly proxies through Vite dev server without CORS issues,
// with graceful fallback if accessed outside the proxy.
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
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
