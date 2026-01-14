import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// 환경 변수 확인용 로그
console.log('[AXIOS CONFIG] Base URL:', baseURL);
console.log('[AXIOS CONFIG] VITE_API_URL:', import.meta.env.VITE_API_URL);

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

// request interceptor - 요청 URL 확인용
axiosInstance.interceptors.request.use(
  (config) => {
    console.log('[AXIOS REQUEST]', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = error?.message;
    const config = error?.config;
    
    console.error('[AXIOS ERROR]', {
      status: status ?? 'No response',
      message,
      url: config?.url,
      baseURL: config?.baseURL,
      fullURL: config ? `${config.baseURL}${config.url}` : 'unknown',
    });
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
