import axios from 'axios';
import { logout } from './authStore'; // Zustand 또는 Redux logout 함수
import { useNavigate } from 'react-router-dom';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // 필요 시
});

// response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    switch (status) {
      case 400:
        alert('잘못된 요청입니다.');
        break;
      case 401:
        alert('로그인이 필요합니다.');
        logout(); // 전역 logout 처리
        window.location.href = '/login'; // 또는 react-router navigate
        break;
      case 403:
        alert('접근 권한이 없습니다.');
        break;
      case 500:
        alert('서버에 문제가 발생했습니다.');
        break;
      default:
        console.error('Unhandled error status:', status);
        break;
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
