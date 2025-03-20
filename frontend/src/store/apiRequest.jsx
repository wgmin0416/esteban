import axios from "axios";

const apiRequest = async (method, url, data) => {
  try {
    if (url) {
      url = `${import.meta.env.VITE_API_URL}${url}`;
    } else {
      throw new Error("URL is required");
    }
    console.log("method", method);
    console.log("url", url);
    console.log("data", data);
    if (method === "get") {
      const response = await axios.get(url, data);
      return response.data;
    } else if (method === "post") {
      const response = await axios.post(url, data);
      return response.data;
    } else if (method === "put") {
      const response = await axios.put(url, data);
      return response.data;
    } else if (method === "delete") {
      const response = await axios.delete(`url`, data);
      return response.data;
    }
  } catch (error) {
    console.error(error);
  }
};

export default apiRequest;
