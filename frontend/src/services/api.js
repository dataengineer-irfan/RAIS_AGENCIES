import axios from 'axios';

const PROD_API_HOST = 'https://rais-backend.onrender.com';
let rawApiUrl = (import.meta.env.VITE_API_URL || '').trim();

// Detect native Capacitor Android/iOS WebView
const isNativePlatform = typeof window !== 'undefined' && (
  window.Capacitor?.isNativePlatform?.() || 
  window.location.protocol === 'capacitor:' || 
  (window.location.hostname === 'localhost' && !import.meta.env.DEV)
);

// Safety validation guard: Staging builds must never point to production
const isStagingMode = Boolean(
  import.meta.env.VITE_STAGING_MODE === 'true' || 
  import.meta.env.VITE_STAGING_MODE === true || 
  import.meta.env.MODE === 'staging'
);

// Validate API endpoint and prevent accidental production usage
if (rawApiUrl) {
  if (!rawApiUrl.startsWith('http://') && !rawApiUrl.startsWith('https://')) {
    rawApiUrl = `https://${rawApiUrl}`;
  }
  try {
    const parsedUrl = new URL(rawApiUrl);
    if (isStagingMode && (parsedUrl.hostname === 'rais-backend.onrender.com' || parsedUrl.hostname.endsWith('rais-backend.onrender.com'))) {
      throw new Error('[FATAL SAFETY GUARD] Staging build is pointing to production API host (rais-backend.onrender.com). Build blocked.');
    }
  } catch (err) {
    if (err.message.includes('FATAL SAFETY GUARD')) throw err;
    throw new Error(`[FATAL API SAFETY ERROR] Malformed VITE_API_URL: ${rawApiUrl}`);
  }
}

// In native shell, missing VITE_API_URL must fail closed rather than silently falling back to production
if (!rawApiUrl) {
  if (isNativePlatform) {
    throw new Error('[FATAL API SAFETY ERROR] Native shell requires an explicit API endpoint. Missing VITE_API_URL.');
  } else if (isStagingMode) {
    throw new Error('[FATAL API SAFETY ERROR] Staging mode requires an explicit staging API URL. Missing VITE_API_URL.');
  } else {
    // Web browser local development proxies /api to local backend
    rawApiUrl = '';
  }
}

export const API_BASE_URL = rawApiUrl 
  ? `${rawApiUrl.replace(/\/$/, '')}/api` 
  : '/api';

export const getInvoicePrintUrl = (id) => `${API_BASE_URL}/invoices/${id}/print-html`;

// 45-second timeout ensures tolerance for Render Free Tier cold boots (which take ~30-50s)
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── HIGH-PERFORMANCE PERSISTENT CLIENT TELEMETRY & RESPONSE CACHE ───
const _CLIENT_CACHE = new Map();
const CACHE_TTL_MS = 60000; // 60-second in-memory client cache
const LOCAL_STORAGE_CACHE_PREFIX = 'rais_telemetry_cache_v1_';

export const getLocalCachedSnapshot = (key) => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const item = JSON.parse(raw);
    return item?.data ?? null;
  } catch (err) {
    return null;
  }
};

export const setLocalCachedSnapshot = (key, data) => {
  if (typeof window === 'undefined' || !window.localStorage || !data) return;
  try {
    localStorage.setItem(`${LOCAL_STORAGE_CACHE_PREFIX}${key}`, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (err) {
    // LocalStorage quota or private mode guard
  }
};

export const clearApiCache = () => {
  _CLIENT_CACHE.clear();
};

const getCacheKey = (url, params) => {
  return `${url}_${JSON.stringify(params || {})}`;
};

const getPersistentKeyForUrl = (url, params) => {
  if (url === '/reports/dashboard') return 'dashboard_kpis';
  if (url === '/customers' && (!params || Object.keys(params).length === 0 || params.limit === 100)) return 'customers_list';
  if (url === '/catalogue/categories') return 'categories_list';
  if (url === '/reports/aging') return 'reports_aging';
  if (url === '/reports/aging/customers') return 'reports_customer_aging';
  if (url === '/invoices' && params?.limit === 500) return 'invoices_list';
  return null;
};

export const cachedGet = async (url, config = {}) => {
  const key = getCacheKey(url, config.params);
  const now = Date.now();
  const persistentKey = getPersistentKeyForUrl(url, config.params);

  // 1. Check in-memory RAM cache first (fastest, 60s TTL)
  if (_CLIENT_CACHE.has(key)) {
    const cached = _CLIENT_CACHE.get(key);
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  try {
    const res = await api.get(url, config);
    _CLIENT_CACHE.set(key, { timestamp: now, data: res.data });
    if (persistentKey && res.data) {
      setLocalCachedSnapshot(persistentKey, res.data);
    }
    return res.data;
  } catch (err) {
    // 2. If network request timed out or failed, fall back to persistent local snapshot
    if (persistentKey) {
      const fallback = getLocalCachedSnapshot(persistentKey);
      if (fallback) {
        console.warn(`[ColdBoot/Network] Utilizing persistent local cache fallback for ${url}:`, err?.message || err);
        return fallback;
      }
    }
    throw err;
  }
};

// Attach JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rais_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401s, Invalidate Cache on Mutations, and Auto-Retry on Cold-Boot Timeouts
api.interceptors.response.use(
  (response) => {
    const method = response.config.method?.toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method)) {
      clearApiCache();
    }
    return response;
  },
  async (error) => {
    const config = error.config;

    // Handle 401 Unauthorized
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('rais_token');
      localStorage.removeItem('rais_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Auto-Retry for cold boot on idempotent GET queries
    // Catches timeout (ECONNABORTED) or Render spinning up 502/503/504 gateway errors
    if (config && config.method?.toLowerCase() === 'get') {
      config.__retryCount = config.__retryCount || 0;
      const isTimeout = error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'));
      const isGatewayError = error.response && [502, 503, 504].includes(error.response.status);
      const isNetworkDown = !error.response && Boolean(error.message);

      if ((isTimeout || isGatewayError || isNetworkDown) && config.__retryCount < 2) {
        config.__retryCount += 1;
        const delayMs = config.__retryCount * 2500;
        console.warn(`[API] Cold-start delay on ${config.url}. Auto-retrying attempt ${config.__retryCount}/2 in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return api(config);
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
    clearApiCache();
    const res = await api.post('/customers', data);
    return res.data;
  },
  update: async (id, data) => {
    clearApiCache();
    const res = await api.put(`/customers/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    clearApiCache();
    const res = await api.delete(`/customers/${id}`);
    return res.data;
  },
  getLedger: async (id) => {
    return cachedGet(`/customers/${id}/ledger`);
  },
  getReorderAlerts: async (daysThreshold = 5) => {
    try {
      const res = await cachedGet('/customers/reorder-alerts', { 
        params: { days_threshold: daysThreshold } 
      });
      if (Array.isArray(res) && res.length >= 0) return res;
    } catch (err) {
      console.warn('Backend /customers/reorder-alerts unavailable, activating resilient client telemetry fallback:', err?.message || err);
    }

    // ─── ZERO-DOWNTIME CLIENT TELEMETRY FALLBACK ───
    // Computes inactive outlets directly from loaded customer accounts & billing invoices
    try {
      const [customers, invoices] = await Promise.all([
        cachedGet('/customers', { params: { limit: 500 } }).catch(() => []),
        cachedGet('/invoices', { params: { limit: 500 } }).catch(() => [])
      ]);

      const custList = Array.isArray(customers) ? customers : (customers?.items || customers?.data || []);
      const invList = Array.isArray(invoices) ? invoices : (invoices?.items || invoices?.data || []);
      const now = new Date();

      const latestInvoiceMap = {};
      invList.forEach(inv => {
        if (!inv.customer_id || inv.status === 'CANCELLED') return;
        const invDate = new Date(inv.invoice_date || inv.created_at);
        if (!isNaN(invDate.getTime())) {
          if (!latestInvoiceMap[inv.customer_id] || invDate > latestInvoiceMap[inv.customer_id]) {
            latestInvoiceMap[inv.customer_id] = invDate;
          }
        }
      });

      const alerts = [];
      custList.forEach(cust => {
        if (cust.status && cust.status !== 'ACTIVE') return;

        const lastActivity = latestInvoiceMap[cust.id] || (cust.created_at ? new Date(cust.created_at) : now);
        const diffMs = now.getTime() - lastActivity.getTime();
        const daysInactive = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        if (daysInactive >= daysThreshold) {
          const formattedDate = lastActivity.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });

          alerts.push({
            customer_id: cust.id,
            customer_code: cust.customer_code || 'CUST',
            business_name: cust.business_name || cust.contact_person || 'Customer',
            contact_person: cust.contact_person || '',
            phone: cust.phone || '',
            city: cust.city || 'Rayachoty',
            days_inactive: daysInactive,
            last_activity_date: lastActivity.toISOString().slice(0, 10),
            last_activity_str: `${daysInactive} days ago (${formattedDate})`,
            outstanding_balance: parseFloat(cust.outstanding_balance || 0)
          });
        }
      });

      alerts.sort((a, b) => b.days_inactive - a.days_inactive);
      return alerts;
    } catch (fallbackErr) {
      console.error('Failed to compute inactive customer fallback:', fallbackErr);
      return [];
    }
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
  deleteInvoice: async (id) => {
    const res = await api.delete(`/invoices/${id}`);
    return res.data;
  },
  updateInvoice: async (id, data) => {
    const res = await api.put(`/invoices/${id}`, data);
    return res.data;
  },
  getPrintHtmlUrl: (id) => `${API_BASE_URL}/invoices/${id}/print-html`
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
  batchReceiveStock: async (data) => {
    const res = await api.post('/inventory/batch-receive', data);
    return res.data;
  },
  adjustStock: async (data) => {
    const res = await api.post('/inventory/adjust', data);
    return res.data;
  },
  getMovements: async (params = {}) => {
    return cachedGet('/inventory/movements', { params });
  },
  parseSupplierInvoice: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/inventory/parse-supplier-invoice', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return res.data;
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
  getSummary: async () => {
    return cachedGet('/payments/summary');
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
  },
  update: async (id, data) => {
    const res = await api.put(`/payments/${id}`, data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/payments/${id}`);
    return res.data;
  },
  reconcileFifo: async (customerId = null) => {
    clearApiCache();
    const res = await api.post('/payments/reconcile-fifo', null, {
      params: customerId ? { customer_id: customerId } : {}
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

export const backupApi = {
  getStatus: async () => {
    return cachedGet('/backup/status');
  },
  downloadExport: async () => {
    const token = localStorage.getItem('rais_token') || '';
    
    const exportUrl = `${API_BASE_URL}/backup/export?token=${encodeURIComponent(token)}`;

    // Fetch the backup data
    const response = await api.get('/backup/export', {
      responseType: 'blob'
    });
    
    // Extract filename from Content-Disposition header if available
    const disposition = response.headers['content-disposition'] || '';
    let filename = `rais_backup_${new Date().toISOString().slice(0, 10)}.json.gz`;
    const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1];
    }
    
    const blob = new Blob([response.data], { type: 'application/gzip' });

    // 1. Mobile Android / Capacitor: Try Native Share Sheet first
    // This allows the user to immediately tap "Save to device" (Downloads folder), "Google Drive", or "WhatsApp"
    if (typeof navigator !== 'undefined' && navigator.canShare && typeof File !== 'undefined') {
      try {
        const file = new File([blob], filename, { type: 'application/gzip' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'RAIS Database Backup',
            text: `RAIS Agencies Live Database Backup (${filename})`,
            files: [file]
          });
          return {
            success: true,
            filename,
            totalRecords: response.headers['x-total-records'] || 'all',
            method: 'share'
          };
        }
      } catch (shareErr) {
        if (shareErr.name === 'AbortError') {
          return { success: true, filename: 'cancelled', totalRecords: 0 };
        }
        console.warn('Native file share failed/cancelled, falling back to direct download:', shareErr);
      }
    }

    // 2. If in native Capacitor APK or share not supported, trigger direct HTTPS download.
    // In Android APK, MainActivity's DownloadListener catches this and enqueues to Android DownloadManager,
    // which saves directly into /storage/emulated/0/Download with system notification!
    if (isNativePlatform) {
      try {
        window.location.href = exportUrl;
      } catch {
        window.open(exportUrl, '_system');
      }
      return {
        success: true,
        filename,
        totalRecords: response.headers['x-total-records'] || 'all',
        method: 'download_manager'
      };
    }

    // 3. Desktop browser fallback: Blob URL + <a> download click
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);

    return {
      success: true,
      filename,
      totalRecords: response.headers['x-total-records'] || 'all',
      method: 'blob'
    };
  }
};


export default api;
