import axios from 'axios';

const apiRequest = async (method, url, data) => {
  try {
    if (url) {
      url = `${import.meta.env.VITE_API_URL}${url}`;
    } else {
      throw new Error('URL is required');
    }
    if (method === 'get') {
      url = await buildQueryString(url, data);
      const response = await axios.get(url, data);
      return response.data;
    } else if (method === 'post') {
      const response = await axios.post(url, data);
      return response.data;
    } else if (method === 'put') {
      const response = await axios.put(url, data);
      return response.data;
    } else if (method === 'delete') {
      url = await buildQueryString(url, data);
      const response = await axios.delete(url, data);
      return response.data;
    }
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

const buildQueryString = async (url, data) => {
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
