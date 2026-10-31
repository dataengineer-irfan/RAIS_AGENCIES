import axios from 'axios';

const BACKEND_BASE = 'https://rais-backend.onrender.com';

const apiClient = axios.create({
  baseURL: `${BACKEND_BASE}/api/v1`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Fallback high-frequency wholesale SKUs for offline/low-network resilience
export const FALLBACK_PRODUCTS = [
  {
    id: "prod-veg-01",
    sku: "RAIS-VEG-01",
    name: "AMUL FRENCH FRIES 6MM",
    brand: "Amul",
    category_id: "cat-veg",
    category_name: "Frozen Veg & Fries",
    packaging_unit: "2.5 KG PKT",
    base_price: 480.00,
    image_url: "assets/products/french_fries_6mm.jpg",
    current_stock: 45,
    is_retail: true,
    is_bestseller: true,
    description: "Crispy 6mm shoestring french fries, deep frozen at -18°C. Ideal for fast food cafes & retail packs."
  },
  {
    id: "prod-veg-02",
    sku: "RAIS-VEG-02",
    name: "AMUL FRENCH FRIES 9MM",
    brand: "Amul",
    category_id: "cat-veg",
    category_name: "Frozen Veg & Fries",
    packaging_unit: "2.5 KG PKT",
    base_price: 460.00,
    image_url: "assets/products/french_fries_9mm.jpg",
    current_stock: 32,
    is_retail: true,
    is_bestseller: true,
    description: "Thick cut 9mm pub-style fries with golden exterior and fluffy potato center."
  },
  {
    id: "prod-brd-01",
    sku: "RAIS-BRD-01",
    name: "VKL HOT & CRISPY CHICKEN BREADING",
    brand: "VKL Spices",
    category_id: "cat-spices",
    category_name: "Spices & Marinades",
    packaging_unit: "1 KG PKT",
    base_price: 380.00,
    image_url: "assets/products/breading_powder.jpg",
    current_stock: 28,
    is_retail: true,
    is_bestseller: true,
    description: "Commercial grade crispy fried chicken coating for AFC-style broasted chicken counters."
  },
  {
    id: "prod-sau-04",
    sku: "RAIS-SAU-04",
    name: "DELMONTE TANDOORI MAYO",
    brand: "Del Monte",
    category_id: "cat-sauces",
    category_name: "Sauces & Condiments",
    packaging_unit: "1 KG PKT",
    base_price: 290.00,
    image_url: "assets/products/tandoori_mayo_1kg.jpg",
    current_stock: 50,
    is_retail: true,
    is_bestseller: true,
    description: "Thick creamy tandoori flavored mayonnaise for shawarma rolls, burgers, and frankies."
  },
  {
    id: "prod-sau-01",
    sku: "RAIS-SAU-01",
    name: "DELMONTE TOMATO KETCHUP (8G SACHETS)",
    brand: "Del Monte",
    category_id: "cat-sauces",
    category_name: "Sauces & Condiments",
    packaging_unit: "1000 SACHETS",
    base_price: 650.00,
    image_url: "assets/products/ketchup_sachets.jpg",
    current_stock: 20,
    is_retail: false,
    is_bestseller: true,
    description: "Single-serve 8g tamper-evident ketchup sachets for parcel takeaways and home deliveries."
  },
  {
    id: "prod-box-08",
    sku: "RAIS-BOX-08",
    name: "BROASTED CHICKEN BUCKET 1000ML WITH LID",
    brand: "Packaging Solutions",
    category_id: "cat-packaging",
    category_name: "Boxes & Packaging",
    packaging_unit: "100 NOS",
    base_price: 850.00,
    image_url: "assets/products/kfc_bucket.jpg",
    current_stock: 35,
    is_retail: false,
    is_bestseller: true,
    description: "Leak-proof kraft paper bucket with ventilated steam-release lid. Keeps fried chicken crispy during delivery."
  },
  {
    id: "prod-pkg-01",
    sku: "RAIS-PKG-01",
    name: "PRINTED GREASEPROOF BUTTER PAPER",
    brand: "Packaging Solutions",
    category_id: "cat-packaging",
    category_name: "Boxes & Packaging",
    packaging_unit: "1000 SHEETS",
    base_price: 480.00,
    image_url: "assets/products/butter_paper_pack.jpg",
    current_stock: 40,
    is_retail: false,
    is_bestseller: true,
    description: "Greaseproof oil-barrier 10x12 wrapping sheets for shawarma wraps, rolls, and burger baskets."
  },
  {
    id: "prod-chs-01",
    sku: "RAIS-CHS-01",
    name: "MILKY MIST MOZZARELLA PIZZA CHEESE",
    brand: "Milky Mist",
    category_id: "cat-cheese",
    category_name: "Cheese & Dairy",
    packaging_unit: "1 KG BLOCK",
    base_price: 460.00,
    image_url: "assets/products/mozzarella_cheese_1kg.jpg",
    current_stock: 25,
    is_retail: true,
    is_bestseller: true,
    description: "High-stretch shredded/block pizza mozzarella cheese with golden melt properties."
  }
];

export const FALLBACK_CATEGORIES = [
  { id: "ALL", name: "All Items", name_te: "అన్నీ", icon: "✨" },
  { id: "cat-veg", name: "Frozen Veg & Fries", name_te: "ఫ్రోజెన్ ఫ్రైస్", icon: "🍟" },
  { id: "cat-spices", name: "Spices & Marinades", name_te: "మసాలాలు & కోటింగ్", icon: "🧂" },
  { id: "cat-sauces", name: "Sauces & Condiments", name_te: "సాస్ & మేయో", icon: "🥫" },
  { id: "cat-packaging", name: "Boxes & Packaging", name_te: "బాక్స్‌లు & ప్యాకేజింగ్", icon: "📦" },
  { id: "cat-cheese", name: "Cheese & Dairy", name_te: "చీజ్ & పాల ఉత్పత్తులు", icon: "🧀" },
  { id: "RETAIL", name: "Retail Ready", name_te: "రిటైల్ ప్యాక్‌లు", icon: "🏪" }
];

export const FALLBACK_PROMOS = [
  {
    id: "promo-1",
    badge: "DEPOT SPECIAL COMBO",
    title: "Order 10 KG Amul Fries, Get 1 KG Peri-Peri Seasoning Sample!",
    subtitle: "Boost your snack margins by 35% with our signature spice dusting.",
    image: "assets/products/french_fries_6mm.jpg",
    theme: "from-amber-600/90 to-amber-900/90",
    border: "border-amber-500/40"
  },
  {
    id: "promo-2",
    badge: "NEW ARRIVAL",
    title: "1000ml Broasted Chicken Buckets with Steam Lids In Stock",
    subtitle: "Stops crust sogginess during bike parcel deliveries. 100 pcs case pack.",
    image: "assets/products/kfc_bucket.jpg",
    theme: "from-rose-600/90 to-red-950/90",
    border: "border-rose-500/40"
  },
  {
    id: "promo-3",
    badge: "FUTURE LAUNCH PRE-BOOK",
    title: "Chef's Art Premium Chipotle & Peri-Peri Retail Shakers Coming Soon",
    subtitle: "Pre-book a trial carton for your retail counter shelves before stock lands.",
    image: "assets/products/breading_powder.jpg",
    theme: "from-emerald-600/90 to-teal-950/90",
    border: "border-emerald-500/40"
  }
];

export const storeApi = {
  getProducts: async () => {
    try {
      const res = await apiClient.get('/catalogue/products', { params: { limit: 250 } });
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      if (items.length > 0) {
        return items.map(p => ({
          ...p,
          base_price: parseFloat(p.base_price || 0),
          image_url: p.image_url || `assets/products/${p.sku?.toLowerCase()}.jpg`,
          is_retail: p.is_retail ?? (p.packaging_unit?.includes('PKT') || p.packaging_unit?.includes('BOTTLE')),
          is_bestseller: p.is_bestseller ?? true
        }));
      }
      return FALLBACK_PRODUCTS;
    } catch (err) {
      console.warn('Backend unavailable, using cached product catalogue:', err.message);
      return FALLBACK_PRODUCTS;
    }
  },

  getCategories: async () => {
    try {
      const res = await apiClient.get('/catalogue/categories', { params: { is_active: true } });
      const items = Array.isArray(res.data) ? res.data : (res.data?.items || []);
      if (items.length > 0) {
        return [
          { id: "ALL", name: "All Items", name_te: "అన్నీ", icon: "✨" },
          ...items.map(c => ({
            id: c.id,
            name: c.name,
            name_te: c.name,
            icon: c.code?.includes('VEG') ? '🍟' : c.code?.includes('PKG') ? '📦' : c.code?.includes('SAU') ? '🥫' : '🏷️'
          })),
          { id: "RETAIL", name: "Retail Ready", name_te: "రిటైల్ ప్యాక్‌లు", icon: "🏪" }
        ];
      }
      return FALLBACK_CATEGORIES;
    } catch {
      return FALLBACK_CATEGORIES;
    }
  },

  submitBooking: async (bookingPayload) => {
    // Submits order booking directly into RAIS FastAPI backend (Orders Hub)
    const res = await apiClient.post('/orders', bookingPayload);
    return res.data;
  }
};
