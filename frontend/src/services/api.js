import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
  : '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── HIGH-PERFORMANCE IN-MEMORY CLIENT RESPONSE CACHE ───
const _CLIENT_CACHE = new Map();
const CACHE_TTL_MS = 60000; // 60-second in-memory client cache

export const clearApiCache = () => {
  _CLIENT_CACHE.clear();
};

const getCacheKey = (url, params) => {
  return `${url}_${JSON.stringify(params || {})}`;
};

export const cachedGet = async (url, config = {}) => {
  const key = getCacheKey(url, config.params);
  const now = Date.now();
  if (_CLIENT_CACHE.has(key)) {
    const cached = _CLIENT_CACHE.get(key);
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const res = await api.get(url, config);
  _CLIENT_CACHE.set(key, { timestamp: now, data: res.data });
  return res.data;
};

// Attach JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rais_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401s and Invalidate Cache on Mutations (POST, PUT, DELETE, PATCH)
api.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      clearApiCache();
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('rais_token');
      localStorage.removeItem('rais_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (username, password) => {
    const res = await api.post('/auth/login-json', { username, password });
    return res.data;
  },
  getMe: async () => {
    return cachedGet('/auth/me');
  },
  getUsers: async () => {
    return cachedGet('/auth/users');
  },
  createUser: async (userData) => {
    const res = await api.post('/auth/users', userData);
    return res.data;
  }
};

export const customerApi = {
  list: async (params = {}) => {
    return cachedGet('/customers', { params });
  },
  get: async (id) => {
    return cachedGet(`/customers/${id}`);
  },
  create: async (data) => {
    const res = await api.post('/customers', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put(`/customers/${id}`, data);
    return res.data;
  },
  getLedger: async (id) => {
    return cachedGet(`/customers/${id}/ledger`);
  }
};

export const catalogueApi = {
  listCategories: async (activeOnly = true) => {
    return cachedGet('/catalogue/categories', { params: { active_only: activeOnly } });
  },
  createCategory: async (data) => {
    const res = await api.post('/catalogue/categories', data);
    return res.data;
  },
  listProducts: async (params = {}) => {
    return cachedGet('/catalogue/products', { params });
  },
  getProduct: async (id) => {
    return cachedGet(`/catalogue/products/${id}`);
  },
  createProduct: async (data) => {
    const res = await api.post('/catalogue/products', data);
    return res.data;
  },
  updateProduct: async (id, data) => {
    const res = await api.put(`/catalogue/products/${id}`, data);
    return res.data;
  }
};

export const billingApi = {
  listInvoices: async (params = {}) => {
    return cachedGet('/invoices', { params });
  },
  getInvoice: async (id) => {
    return cachedGet(`/invoices/${id}`);
  },
  createInvoice: async (data) => {
    const res = await api.post('/invoices', data);
    return res.data;
  },
  issueInvoice: async (id) => {
    const res = await api.post(`/invoices/${id}/issue`);
    return res.data;
  },
  updateStatus: async (id, status, reason = '') => {
    const res = await api.post(`/invoices/${id}/status`, { status, reason });
    return res.data;
  },
  getPrintHtmlUrl: (id) => `/api/invoices/${id}/print-html`
};

export const orderApi = {
  list: async (params = {}) => {
    return cachedGet('/orders', { params });
  },
  get: async (id) => {
    return cachedGet(`/orders/${id}`);
  },
  create: async (data) => {
    const res = await api.post('/orders', data);
    return res.data;
  },
  convertToInvoice: async (id) => {
    const res = await api.post(`/orders/${id}/convert-to-invoice`);
    return res.data;
  }
};

export const inventoryApi = {
  getOverview: async (params = {}) => {
    return cachedGet('/inventory/overview', { params });
  },
  receiveStock: async (data) => {
    const res = await api.post('/inventory/receive', data);
    return res.data;
  },
  adjustStock: async (data) => {
    const res = await api.post('/inventory/adjust', data);
    return res.data;
  },
  getMovements: async (params = {}) => {
    return cachedGet('/inventory/movements', { params });
  }
};

export const quotationApi = {
  list: async (params = {}) => {
    return cachedGet('/quotations', { params });
  },
  create: async (data) => {
    const res = await api.post('/quotations', data);
    return res.data;
  },
  convertToInvoice: async (id) => {
    const res = await api.post(`/quotations/${id}/convert-to-invoice`);
    return res.data;
  }
};

export const paymentApi = {
  list: async (params = {}) => {
    return cachedGet('/payments', { params });
  },
  get: async (id) => {
    return cachedGet(`/payments/${id}`);
  },
  record: async (data) => {
    const res = await api.post('/payments', data);
    return res.data;
  },
  allocate: async (paymentId, invoiceId, amount) => {
    const res = await api.post(`/payments/${paymentId}/allocate`, {
      invoice_id: invoiceId,
      amount: parseFloat(amount)
    });
    return res.data;
  }
};

export const reportApi = {
  getDashboard: async () => {
    return cachedGet('/reports/dashboard');
  },
  getAging: async () => {
    return cachedGet('/reports/aging');
  },
  getCustomerAging: async () => {
    return cachedGet('/reports/aging/customers');
  },
  getProductSales: async () => {
    return cachedGet('/reports/product-sales');
  }
};

export const aiApi = {
  query: async (query) => {
    const res = await api.post('/ai/query', { query });
    return res.data;
  },
  getKnowledge: async () => {
    return cachedGet('/ai/knowledge');
  }
};

export const auditApi = {
  list: async (params = {}) => {
    return cachedGet('/audit/logs', { params });
  }
};

export const analyticsApi = {
  getProductMatrix: async () => {
    return cachedGet('/analytics/product-matrix');
  },
  getCustomerHealth: async () => {
    return cachedGet('/analytics/customer-health');
  },
  getForecast: async () => {
    return cachedGet('/analytics/forecast');
  },
  setMonthlyTarget: async (yearMonth, targetAmount) => {
    const res = await api.post('/analytics/targets', { year_month: yearMonth, target_amount: targetAmount });
    return res.data;
  },
  getThermalReceipt: async (invoiceId, paperWidth = 58) => {
    return cachedGet(`/analytics/receipt/${invoiceId}`, { params: { paper_width: paperWidth } });
  },
  getDrilldown: async (metric = 'revenue', level = 'category', categoryId = null) => {
    return cachedGet('/analytics/drilldown', {
      params: { metric, level, category_id: categoryId }
    });
  }
};

export default api;
