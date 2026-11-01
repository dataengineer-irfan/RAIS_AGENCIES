import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';

const StoreContext = createContext(null);

export const SAMPLE_PILOT_OUTLETS = [
  { 
    id: 'CUST-0001', 
    name: 'CHICKEN EMPIRE ALEEM', 
    contact: 'Aleem Bhai', 
    phone: '9848011223', 
    type: 'QSR Fried Chicken', 
    route: 'Rayachoty Main Road',
    distance: '0.8 km'
  },
  { 
    id: 'CUST-0002', 
    name: 'PARADAISE PIZZA', 
    contact: 'Riyaz', 
    phone: '9573211445', 
    type: 'Pizzeria & Cafe', 
    route: 'Madanapalle Bypass',
    distance: '1.4 km'
  },
  { 
    id: 'CUST-0003', 
    name: 'PIZZA TIME', 
    contact: 'Sharif', 
    phone: '9440122334', 
    type: 'Pizza & Fast Food', 
    route: 'Rayachoty Clock Tower',
    distance: '0.5 km'
  },
  { 
    id: 'CUST-0004', 
    name: 'KIM CAFE & SNACKS', 
    contact: 'Imran', 
    phone: '9398144556', 
    type: 'Bakery & Snacks', 
    route: 'Kadapa Road',
    distance: '1.2 km'
  },
  { 
    id: 'CUST-0005', 
    name: 'BITE N SIP FAST FOOD', 
    contact: 'Fayaz', 
    phone: '9123455678', 
    type: 'Burgers & Wraps', 
    route: 'Sundupalli Road',
    distance: '2.1 km'
  },
  { 
    id: 'CUST-RETAIL-01', 
    name: 'NEW ROYAL KIRANA & MART', 
    contact: 'Mahesh', 
    phone: '9849099887', 
    type: 'Retail Store', 
    route: 'Old Bazaar Rayachoty',
    distance: '0.3 km'
  },
];

export const StoreProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('rais_pwa_cart');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('rais_pwa_lang') || 'en';
  });

  const [selectedOutlet, setSelectedOutlet] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const shopParam = params.get('shop') || params.get('outlet');
    if (shopParam) {
      const match = SAMPLE_PILOT_OUTLETS.find(o => 
        o.name.toLowerCase().includes(shopParam.toLowerCase()) || 
        o.id.toLowerCase() === shopParam.toLowerCase()
      );
      if (match) return match;
    }
    return SAMPLE_PILOT_OUTLETS[0];
  });

  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [upsellProduct, setUpsellProduct] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [lastBookedOrder, setLastBookedOrder] = useState(null);
  const [flyingParticles, setFlyingParticles] = useState([]);

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('rais_pwa_cart', JSON.stringify(cart));
    } catch (e) {
      console.warn('Storage sync error', e);
    }
  }, [cart]);

  // Sync language to localStorage
  useEffect(() => {
    localStorage.setItem('rais_pwa_lang', language);
  }, [language]);

  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {
        // Haptics optional
      }
    }
  };

  const triggerFlyEffect = (clientX, clientY) => {
    const id = Date.now() + Math.random();
    setFlyingParticles(prev => [...prev, { id, x: clientX, y: clientY }]);
    setTimeout(() => {
      setFlyingParticles(prev => prev.filter(p => p.id !== id));
    }, 800);
  };

  const addToCart = (product, delta = 1, triggerUpsell = true, event = null) => {
    triggerHaptic();
    if (event && event.clientX && event.clientY) {
      triggerFlyEffect(event.clientX, event.clientY);
    }

    setCart(prev => {
      const existing = prev[product.id];
      const newQty = Math.max(0, (existing ? existing.quantity : 0) + delta);
      if (newQty === 0) {
        const next = { ...prev };
        delete next[product.id];
        return next;
      }
      return {
        ...prev,
        [product.id]: {
          product,
          quantity: newQty
        }
      };
    });

    // Smart Upsell Trigger: Suggest High-Affinity SKUs
    if (triggerUpsell && delta > 0) {
      const sku = (product.sku || '').toUpperCase();
      const name = (product.name || '').toUpperCase();

      if (sku.includes('VEG') || name.includes('FRIES')) {
        setUpsellProduct({
          name: "VKL CHEF'S ART PERI-PERI SHAKER (1 KG)",
          reason: "Customers love Peri-Peri dusting with fries! Adds ₹15 margin per serve.",
          sku: "RAIS-BRD-03",
          price: 340.00,
          unit: "1 KG PKT",
          image: "/assets/products/vkl_peri_peri_sprinkler.jpg"
        });
      } else if (sku.includes('BRD') || name.includes('BREADING') || name.includes('CHICKEN')) {
        setUpsellProduct({
          name: "BROASTED CHICKEN BUCKET 1000ML WITH LID (100 NOS)",
          reason: "Deliver crispy fried chicken without soggy crusts using steam-vent lids.",
          sku: "RAIS-BOX-08",
          price: 850.00,
          unit: "100 NOS",
          image: "/assets/products/kfc_bucket.jpg"
        });
      }
    }
  };

  const updateQuantity = (productId, qty) => {
    triggerHaptic();
    setCart(prev => {
      if (qty <= 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          quantity: qty
        }
      };
    });
  };

  const removeFromCart = (productId) => {
    triggerHaptic();
    setCart(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const clearCart = () => {
    setCart({});
  };

  const toggleLanguage = () => {
    triggerHaptic();
    setLanguage(prev => prev === 'en' ? 'te' : 'en');
  };

  const cartItemsArray = useMemo(() => Object.values(cart), [cart]);

  const cartCount = useMemo(() => {
    return cartItemsArray.reduce((sum, itm) => sum + itm.quantity, 0);
  }, [cartItemsArray]);

  const cartTotal = useMemo(() => {
    return cartItemsArray.reduce((sum, itm) => {
      const price = parseFloat(itm.product.base_price || 0);
      return sum + (price * itm.quantity);
    }, 0);
  }, [cartItemsArray]);

  return (
    <StoreContext.Provider value={{
      cart,
      cartItemsArray,
      cartCount,
      cartTotal,
      selectedOutlet,
      setSelectedOutlet,
      activeCategory,
      setActiveCategory,
      searchQuery,
      setSearchQuery,
      upsellProduct,
      setUpsellProduct,
      isCheckoutOpen,
      setIsCheckoutOpen,
      lastBookedOrder,
      setLastBookedOrder,
      language,
      toggleLanguage,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      flyingParticles,
      triggerFlyEffect
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
