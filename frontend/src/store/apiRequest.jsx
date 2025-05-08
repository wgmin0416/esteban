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
    console.error(error);
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
