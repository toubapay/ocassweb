import axios from "axios";
import Cookies from "js-cookie";

export const TOKEN_COOKIE = "ocass-token";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5000/api",
});

apiClient.interceptors.request.use((config) => {
  const token = Cookies.get(TOKEN_COOKIE);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove(TOKEN_COOKIE);
    }
    return Promise.reject(error);
  }
);

export default apiClient;
