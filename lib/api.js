/**
 * lib/api.js
 *
 * Central Axios instance for all API calls.
 *
 * What it does automatically:
 *  1. Adds `Authorization: Bearer <token>` to every request
 *  2. On a 401 response with code TOKEN_EXPIRED -> calls POST /auth/refresh silently
 *  3. Retries the original request once with the new token
 *  4. If refresh also fails -> clears token and redirects to /login
 *
 * Usage in any component:
 *   import api from '../lib/api';
 *   const { data } = await api.get('/customers');
 *   const { data } = await api.post('/auth/login', { email, password });
 */
import axios from 'axios';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,   // send httpOnly refresh cookie on every request
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});
// -- Token management ---------------------------------------------------------
// We keep the access token in module-level state (memory only).
// AuthContext calls setApiToken() after login/refresh.
// This never touches localStorage -- XSS-safe.
let _accessToken = null;
let _refreshing   = null;   // Promise lock -- prevents parallel refresh calls
export const setApiToken   = (token) => { _accessToken = token; };
export const clearApiToken = ()      => { _accessToken = null;  };
// -- Request interceptor: attach Bearer token ---------------------------------
api.interceptors.request.use(
  (config) => {
    if (_accessToken) {
      config.headers['Authorization'] = `Bearer ${_accessToken}`;
    }
    // FormData uploads: delete Content-Type so the browser sets it
    // with the correct multipart boundary -- multer requires this.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);
// -- Response interceptor: silent token refresh on 401 TOKEN_EXPIRED ----------
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    // Handle account suspension -- clear state, set flag, redirect to login
    const reqUrl = error.config?.url || '';
    if (error.response?.status === 403 &&
        error.response?.data?.error === 'Account suspended.' &&
        !reqUrl.includes('auth/')) {
      clearApiToken();
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('rb_suspended', '1');
        window.location.href = '/login?reason=suspended';
      }
      return Promise.reject(error);
    }
    // Only attempt refresh if:
    // 1. We got a 401
    // 2. The backend told us it's specifically an expired token
    // 3. We haven't already retried this request
    const isExpired =
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !original._retried;
    if (!isExpired) {
      return Promise.reject(error);
    }
    original._retried = true;
    try {
      // Prevent multiple simultaneous refreshes
      if (!_refreshing) {
        _refreshing = api.post('/auth/refresh').finally(() => { _refreshing = null; });
      }
      const { data } = await _refreshing;
      setApiToken(data.token);
      original.headers['Authorization'] = `Bearer ${data.token}`;
      return api(original);
    } catch (refreshError) {
      clearApiToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(refreshError);
    }
  }
);
export default api;