
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
    return '/api'; // 开发环境也使用 /api 前缀，proxy 会转发到后端
  }
  
  // 生产环境：前后端在同一服务器，使用相对路径
  // 如果前后端分离部署，可以通过环境变量 REACT_APP_API_URL 配置完整URL
  // 例如：REACT_APP_API_URL=http://your-api-server:3001/api
  // 不再显示警告，直接返回相对路径
  return '/api'; // 相对路径，指向同一服务器的 /api 路由
};

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: getApiBaseURL(),
  timeout: 120000, // OCR识别可能需要更长时间，设置为120秒（2分钟）
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
    // 处理 429 请求频率过高错误
    if (error.response?.status === 429) {
      // 429 错误由具体页面处理，这里不统一处理，避免干扰用户
      // 但可以记录日志
      console.warn('[API] Rate limit exceeded:', error.config?.url);
    }
    return Promise.reject(error);
  }
);

// 导出配置的 axios 实例
export default apiClient;

// 导出 API 基础 URL（用于其他非 axios 请求）
export const API_BASE_URL = getApiBaseURL();

