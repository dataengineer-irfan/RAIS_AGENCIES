import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rais_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401s
api.interceptors.response.use(
  (response) => response,
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
    const res = await api.get('/auth/me');
    return res.data;
  },
  getUsers: async () => {
    const res = await api.get('/auth/users');
    return res.data;
  },
  createUser: async (userData) => {
    const res = await api.post('/auth/users', userData);
    return res.data;
  }
};

export const customerApi = {
  list: async (params = {}) => {
    const res = await api.get('/customers', { params });
    return res.data;
  },
  get: async (id) => {
    const res = await api.get(`/customers/${id}`);
    return res.data;
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
    const res = await api.get(`/customers/${id}/ledger`);
    return res.data;
  }
};

export const catalogueApi = {
  listCategories: async (activeOnly = true) => {
    const res = await api.get('/catalogue/categories', { params: { active_only: activeOnly } });
    return res.data;
  },
  createCategory: async (data) => {
    const res = await api.post('/catalogue/categories', data);
    return res.data;
  },
  listProducts: async (params = {}) => {
    const res = await api.get('/catalogue/products', { params });
    return res.data;
  },
  getProduct: async (id) => {
    const res = await api.get(`/catalogue/products/${id}`);
    return res.data;
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
    const res = await api.get('/invoices', { params });
    return res.data;
  },
  getInvoice: async (id) => {
    const res = await api.get(`/invoices/${id}`);
    return res.data;
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

export const quotationApi = {
  list: async (params = {}) => {
    const res = await api.get('/quotations', { params });
    return res.data;
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
    const res = await api.get('/payments', { params });
    return res.data;
  },
  get: async (id) => {
    const res = await api.get(`/payments/${id}`);
    return res.data;
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
    const res = await api.get('/reports/dashboard');
    return res.data;
  },
  getAging: async () => {
    const res = await api.get('/reports/aging');
    return res.data;
  },
  getCustomerAging: async () => {
    const res = await api.get('/reports/aging/customers');
    return res.data;
  },
  getProductSales: async () => {
    const res = await api.get('/reports/product-sales');
    return res.data;
  }
};

export const aiApi = {
  query: async (query) => {
    const res = await api.post('/ai/query', { query });
    return res.data;
  },
  getKnowledge: async () => {
    const res = await api.get('/ai/knowledge');
    return res.data;
  }
};

export const auditApi = {
  list: async (params = {}) => {
    const res = await api.get('/audit/logs', { params });
    return res.data;
  }
};

export default api;
