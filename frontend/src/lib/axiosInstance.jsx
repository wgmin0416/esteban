import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    console.error('[AXIOS ERROR]', status ?? 'No respnose');
    return Promise.reject(error);
  }
);

export default axiosInstance;
