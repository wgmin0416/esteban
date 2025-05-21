import axios from 'axios';

const apiRequest = async (method, url, data, options) => {
  try {
    if (!url) throw new Error('URL is required');
    url = `${import.meta.env.VITE_API_URL}${url}`;

    if (method === 'get') {
      url = buildQueryString(url, data);
      const response = await axios.get(url, options);
      return response.data;
    } else if (method === 'post') {
      const response = await axios.post(url, data, options);
      return response.data;
    } else if (method === 'put') {
      const response = await axios.put(url, data, options);
      return response.data;
    } else if (method === 'delete') {
      url = buildQueryString(url, data);
      const response = await axios.delete(url, { ...options, data: data });
      return response.data;
    }
    throw new Error('Invalid method');
  } catch (error) {
    console.log(method, url, data, options);
    console.error(error);

    if (error.response) {
      const status = error.response.status;

      switch (status) {
        case 400:
          alert('잘못된 요청입니다. 입력값을 확인해주세요.');
          break;
        case 401:
          alert('로그인이 필요합니다.');
          // 상태관리 로그아웃 예시
          useAuthStore.getState().logout();
          window.location.href = '/login';
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
  if (!data || Object.keys(data).length === 0) {
    return url;
  }
  const query = Object.entries(data)
    .filter(([_, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return query ? `${url}?${query}` : url;
};

export default apiRequest;
