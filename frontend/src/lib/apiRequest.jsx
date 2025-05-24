import axiosInstance from './axiosInstance';
import { logout } from '../store/useAuthStore';

const apiRequest = async (method, url, data = {}, options = {}) => {
  try {
    if (!url) {
      throw new Error('URL is required');
    }
    const config = {
      method,
      url,
      ...options,
    };
    if (['get', 'delete'].includes(method.toLowerCase())) {
      config.url = buildQueryString(url, data);
    } else {
      config.data = data;
    }
    const response = await axiosInstance.request(config);
    return response.data;
  } catch (error) {
    const status = error?.response?.status;
    console.error('[API ERROR]', status, error);

    if (status) {
      switch (status) {
        case 400:
          alert('잘못된 요청입니다.');
          break;
        case 401:
          await logout();
          break;
        case 403:
          alert('권한이 없습니다.');
          break;
        case 500:
          alert('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
          break;
        default:
          alert(`예기치 않은 오류가 발생했습니다. 상태 코드: ${status}`);
      }
    } else {
      alert('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.');
    }

    throw error;
  }
};

const buildQueryString = (url, data) => {
  if (!data || Object.keys(data).length === 0) return url;
  const query = Object.entries(data)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `${url}?${query}`;
};

export default apiRequest;
