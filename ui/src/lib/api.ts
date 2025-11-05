import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:6200/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Hook for refreshing tokens or redirecting to login
    }
    return Promise.reject(error);
  }
);

export default apiClient;
