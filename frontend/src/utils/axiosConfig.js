/**
 * Axios 配置文件
 * 统一管理 API 基础 URL 和请求拦截器
 */
import axios from 'axios';

// 获取 API 基础 URL（支持环境变量和默认值）
const getApiBaseURL = () => {
  // 优先使用环境变量
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // 开发环境使用代理（package.json 中的 proxy）
  if (process.env.NODE_ENV === 'development') {
    return ''; // 空字符串表示使用相对路径，会被 proxy 处理
  }
  
  // 生产环境默认值（应该通过环境变量配置）
  return 'http://localhost:3001'; // 这个需要在实际部署时配置
};

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: getApiBaseURL(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 处理 401 未授权错误
    if (error.response?.status === 401) {
      // 清除 token 并跳转到登录页
      localStorage.removeItem('token');
      // 如果不在登录页，则跳转
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// 导出配置的 axios 实例
export default apiClient;

// 导出 API 基础 URL（用于其他非 axios 请求）
export const API_BASE_URL = getApiBaseURL();

