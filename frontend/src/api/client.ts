import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import env from '@/config/env';
import { demoAdapter } from '@/demo/mockAdapter';

const TOKEN_STORAGE_KEY = 'auth_token';
const PUBLIC_AUTH_PATHS = ['/api/v1/auth/login', '/api/v1/auth/register'];
const IS_DEMO_BUILD = import.meta.env.VITE_DEMO === 'true';
// 데모 빌드는 HashRouter + GitHub Pages 하위 경로라 로그인 주소가 다르다
const LOGIN_URL = IS_DEMO_BUILD ? `${import.meta.env.BASE_URL}#/login` : '/login';

const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  // 데모 빌드에서만 실제 HTTP 대신 브라우저 안의 가짜 API로 처리
  adapter: IS_DEMO_BUILD ? demoAdapter : undefined,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    const requestUrl = error.config?.url ?? '';
    const isPublicAuthRequest = PUBLIC_AUTH_PATHS.some((path) => requestUrl.includes(path));

    if (error.response?.status === 401 && !isPublicAuthRequest) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem('auth_user');
      window.location.href = LOGIN_URL;
    }
    return Promise.reject(error);
  },
);

export default apiClient;
export { TOKEN_STORAGE_KEY };
