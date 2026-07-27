import axios from 'axios';
import { isNative } from './auth/platform';
import { getAccessToken, setAccessToken, clearAccessToken } from './auth/tokenStore';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// 환경 변수 확인용 로그
console.log('[AXIOS CONFIG] Base URL:', baseURL);
console.log('[AXIOS CONFIG] VITE_API_URL:', import.meta.env.VITE_API_URL);

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true,
});

// request interceptor - 앱은 Bearer 토큰 부착 (웹은 쿠키 사용)
axiosInstance.interceptors.request.use(
  async (config) => {
    if (isNative()) {
      const token = await getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    console.log('[AXIOS REQUEST]', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // 앱: 서버가 자동 갱신한 access token(x-access-token)을 저장소에 반영
    if (isNative()) {
      const refreshed = response.headers?.['x-access-token'];
      if (refreshed) {
        setAccessToken(refreshed);
      }
    }
    return response;
  },
  (error) => {
    // 앱: 인증 실패(401)면 저장된 토큰 폐기
    if (isNative() && error?.response?.status === 401) {
      clearAccessToken();
    }
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
