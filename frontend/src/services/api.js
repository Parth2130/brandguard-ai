import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach Authorization header automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('brandguard_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Global response error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or invalid
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register') && window.location.pathname !== '/') {
        localStorage.removeItem('brandguard_token');
        localStorage.removeItem('brandguard_user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getActivity: () => api.get('/dashboard/activity')
};

export const brandsAPI = {
  getOverview: () => api.get('/brands'),
  updateCompany: (data) => api.put('/brands/company', data),
  getRules: (type) => api.get('/brands/rules', { params: { type } }),
  createRule: (data) => api.post('/brands/rules', data),
  updateRule: (id, data) => api.put(`/brands/rules/${id}`, data),
  deleteRule: (id) => api.delete(`/brands/rules/${id}`),
  getAssets: () => api.get('/brands/assets'),
  uploadAsset: (formData) => api.post('/brands/assets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  toggleAssetActive: (id) => api.post(`/brands/assets/${id}/toggle-active`),
  deleteAsset: (id) => api.delete(`/brands/assets/${id}`),
  getProducts: () => api.get('/brands/products'),
  createProduct: (data) => api.post('/brands/products', data),
  updateProduct: (id, data) => api.put(`/brands/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/brands/products/${id}`),
  getGuidelines: () => api.get('/brands/guidelines'),
  createGuideline: (formData) => api.post('/brands/guidelines', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteGuideline: (id) => api.delete(`/brands/guidelines/${id}`)
};

export const contentAPI = {
  upload: (formData) => api.post('/content/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  list: (params) => api.get('/content', { params }),
  get: (id) => api.get(`/content/${id}`),
  delete: (id) => api.delete(`/content/${id}`),
  updateText: (id, data) => api.put(`/content/${id}/update-text`, data)
};

export const analysisAPI = {
  run: (contentId, data) => api.post(`/analysis/${contentId}`, data || {}),
  get: (id) => api.get(`/analysis/${id}`),
  getIssues: (id, params) => api.get(`/analysis/${id}/issues`, { params })
};

export const correctionsAPI = {
  accept: (id) => api.post(`/suggestions/${id}/accept`),
  reject: (id) => api.post(`/suggestions/${id}/reject`),
  edit: (id, data) => api.post(`/suggestions/${id}/edit`, data),
  applyAll: (contentId) => api.post(`/suggestions/content/${contentId}/apply-all`),
  reanalyze: (contentId) => api.post(`/suggestions/content/${contentId}/reanalyze`)
};

export const reviewsAPI = {
  list: (params) => api.get('/reviews', { params }),
  get: (id) => api.get(`/reviews/${id}`),
  getReviewers: () => api.get('/reviews/reviewers'),
  submit: (data) => api.post('/reviews/submit', data),
  approve: (id, data) => api.post(`/reviews/${id}/approve`, data || {}),
  reject: (id, data) => api.post(`/reviews/${id}/reject`, data || {}),
  requestChanges: (id, data) => api.post(`/reviews/${id}/request-changes`, data || {}),
  getComments: (id) => api.get(`/reviews/${id}/comments`),
  addComment: (id, data) => api.post(`/reviews/${id}/comments`, data)
};

export const claimsAPI = {
  getProducts: () => api.get('/claims/products'),
  verify: (data) => api.post('/claims/verify', data),
  getContentClaims: (contentId) => api.get(`/claims/content/${contentId}`),
  override: (claimId, data) => api.post(`/claims/${claimId}/override`, data)
};

export const visualAuditAPI = {
  get: (contentId) => api.get(`/visual-audit/${contentId}`),
  recolor: (contentId, data) => api.post(`/visual-audit/${contentId}/recolor`, data)
};

export const analyticsAPI = {
  getOverview: () => api.get('/analytics/overview'),
  getViolations: () => api.get('/analytics/violations'),
  getTrends: () => api.get('/analytics/trends'),
  exportUrl: '/api/analytics/export'
};

export const usersAPI = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  updateAI: (data) => api.post('/settings/ai-config', data),
  seedDemo: () => api.post('/settings/seed-demo'),
  resetDemo: () => api.post('/settings/reset-demo')
};

export default api;
