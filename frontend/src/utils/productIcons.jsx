import React from 'react';

// Returns a vibrant, specialized visual food icon matching the flyer's categories and product types
export const getProductVisualIcon = (product, className = "w-8 h-8") => {
  const name = (product?.name || '').toLowerCase();
  const sku = (product?.sku || '').toLowerCase();
  const cat = (product?.category_name || '').toLowerCase();

  // 1. Packaging & Pizza / Burger Boxes (Check before burger/food)
  if (name.includes('box') || name.includes('pizza box') || name.includes('burger box') || sku.includes('box') || cat.includes('box')) {
    return (
      <div className={`rounded-xl bg-amber-700/20 border border-amber-700/35 flex items-center justify-center text-amber-500 p-1.5 shadow-sm ${className}`}>
        <span className="text-lg select-none">📦</span>
      </div>
    );
  }

  // 2. Mojitos & Syrups
  if (name.includes('bluecurco') || name.includes('blue curacao') || sku.includes('moj-02')) {
    return (
      <div className={`rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 p-1.5 shadow-sm shadow-cyan-500/10 ${className}`}>
        <span className="text-lg select-none">🍸</span>
      </div>
    );
  }
  if (name.includes('lime') || name.includes('mint') || sku.includes('moj-01') || cat.includes('mojito')) {
    return (
      <div className={`rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 p-1.5 shadow-sm shadow-emerald-500/10 ${className}`}>
        <span className="text-lg select-none">🍹</span>
      </div>
    );
  }

  // 3. Momos
  if (name.includes('momo')) {
    return (
      <div className={`rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 p-1.5 shadow-sm shadow-amber-500/10 ${className}`}>
        <span className="text-lg select-none">🥟</span>
      </div>
    );
  }

  // 4. French Fries
  if (name.includes('fries') || name.includes('french fries') || sku.includes('veg-01') || sku.includes('veg-02')) {
    return (
      <div className={`rounded-xl bg-amber-500/20 border border-amber-500/35 flex items-center justify-center text-amber-400 p-1.5 shadow-sm shadow-amber-500/10 ${className}`}>
        <span className="text-lg select-none">🍟</span>
      </div>
    );
  }

  // 5. Burger Patties & Burgers
  if (name.includes('patty') || name.includes('burger')) {
    return (
      <div className={`rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 p-1.5 shadow-sm shadow-orange-500/10 ${className}`}>
        <span className="text-lg select-none">🍔</span>
      </div>
    );
  }

  // 5. Nuggets & Popcorn
  if (name.includes('nugget') || name.includes('popcorn') || name.includes('fried chicken') || name.includes('pops')) {
    return (
      <div className={`rounded-xl bg-amber-600/20 border border-amber-600/35 flex items-center justify-center text-amber-400 p-1.5 shadow-sm shadow-amber-600/10 ${className}`}>
        <span className="text-lg select-none">🍗</span>
      </div>
    );
  }

  // 6. Cheese & Slices & Paneer
  if (name.includes('cheese') || name.includes('paneer') || name.includes('mozerolla') || cat.includes('cheese')) {
    return (
      <div className={`rounded-xl bg-yellow-500/20 border border-yellow-500/35 flex items-center justify-center text-yellow-300 p-1.5 shadow-sm shadow-yellow-500/10 ${className}`}>
        <span className="text-lg select-none">🧀</span>
      </div>
    );
  }

  // 7. Ketchup & Sauces & Mayonnaise
  if (name.includes('ketchup') || name.includes('sauce') || name.includes('mayo') || name.includes('mayonnaise') || cat.includes('ketchup')) {
    if (name.includes('mayo') || name.includes('mayonnaise')) {
      return (
        <div className={`rounded-xl bg-orange-400/15 border border-orange-400/30 flex items-center justify-center text-orange-300 p-1.5 shadow-sm ${className}`}>
          <span className="text-lg select-none">🥣</span>
        </div>
      );
    }
    return (
      <div className={`rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 p-1.5 shadow-sm shadow-rose-500/10 ${className}`}>
        <span className="text-lg select-none">🥫</span>
      </div>
    );
  }

  // 8. Packaging & Pizza / Burger Boxes
  if (name.includes('box') || name.includes('pizza box') || name.includes('burger box') || cat.includes('box')) {
    return (
      <div className={`rounded-xl bg-amber-700/20 border border-amber-700/35 flex items-center justify-center text-amber-500 p-1.5 shadow-sm ${className}`}>
        <span className="text-lg select-none">📦</span>
      </div>
    );
  }

  // 9. Spices & Seasonings
  if (name.includes('powder') || name.includes('chilly') || name.includes('turmeric') || name.includes('coriander') || name.includes('peri peri') || name.includes('oregano') || cat.includes('spice')) {
    return (
      <div className={`rounded-xl bg-red-600/20 border border-red-600/35 flex items-center justify-center text-red-400 p-1.5 shadow-sm shadow-red-600/10 ${className}`}>
        <span className="text-lg select-none">🌶️</span>
      </div>
    );
  }

  // 10. Tortilla & Wraps
  if (name.includes('tortilla') || name.includes('tortillah') || name.includes('wrap')) {
    return (
      <div className={`rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 p-1.5 shadow-sm ${className}`}>
        <span className="text-lg select-none">🌯</span>
      </div>
    );
  }

  // 11. Bread Mix & Powders
  if (name.includes('bread') || name.includes('marinde') || name.includes('cajun') || cat.includes('bread')) {
    return (
      <div className={`rounded-xl bg-orange-600/15 border border-orange-600/30 flex items-center justify-center text-orange-300 p-1.5 shadow-sm ${className}`}>
        <span className="text-lg select-none">🍞</span>
      </div>
    );
  }

  // Default General Food Icon
  return (
    <div className={`rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 p-1.5 shadow-sm ${className}`}>
      <span className="text-lg select-none">🍱</span>
    </div>
  );
};

// Category Hero Cards definitions matching the top row of the flyer
export const CATEGORY_HERO_ITEMS = [
  { id: 'all', code: 'ALL', name: 'All Products', icon: '❄️', subtitle: 'Master Catalogue', gradient: 'from-amber-500/20 to-orange-500/10' },
  { id: 'cat-fries', code: 'VEG', name: 'French Fries', icon: '🍟', subtitle: '6mm & 9mm Hup Hup', gradient: 'from-yellow-500/20 to-amber-500/10' },
  { id: 'cat-nuggets', code: 'CHK', name: 'Nuggets & Pops', icon: '🍗', subtitle: 'ITC & Nutrich', gradient: 'from-orange-500/20 to-amber-600/10' },
  { id: 'cat-momos', code: 'MOM', name: 'Momos & Wraps', icon: '🥟', subtitle: 'Steamed & Fried ITC', gradient: 'from-amber-500/20 to-yellow-600/10' },
  { id: 'cat-burgers', code: 'BRG', name: 'Burger Patties', icon: '🍔', subtitle: 'Veg & Chicken', gradient: 'from-amber-600/20 to-red-600/10' },
  { id: 'cat-cheese', code: 'CHS', name: 'Cheese & Dairy', icon: '🧀', subtitle: 'Milky Mist Mozzarella', gradient: 'from-yellow-400/20 to-amber-500/10' },
  { id: 'cat-sauces', code: 'SAU', name: 'Mayo & Sauces', icon: '🥫', subtitle: 'Del Monte & Foodrite', gradient: 'from-rose-500/20 to-red-600/10' },
  { id: 'cat-boxes', code: 'BOX', name: 'Packaging Boxes', icon: '📦', subtitle: 'Pizza & Burger Kraft', gradient: 'from-amber-700/20 to-orange-700/10' },
  { id: 'cat-mojitos', code: 'MOJ', name: 'Mojitos & Syrups', icon: '🍸', subtitle: 'Bluecurco & Lime Mint', gradient: 'from-cyan-500/20 to-blue-600/10' },
  { id: 'cat-spices', code: 'SPC', name: 'Spices & Marinade', icon: '🌶️', subtitle: 'VKL, Chilly & Peri-Peri', gradient: 'from-red-600/20 to-orange-600/10' }
];

// Official partner brand logos from the brochure footer
export const PARTNER_BRANDS = [
  { name: 'McCain', tag: 'Global Frozen Specialist', badge: '🍟 Potato & Fries' },
  { name: 'ITC Master Chef', tag: 'Authorized Super Stockist', badge: '🥟 Momos & Patty' },
  { name: 'Milky Mist', tag: 'Premium Dairy & Mozzarella', badge: '🧀 Diced Cheese' },
  { name: 'Ayamas', tag: 'Chicken Specialities', badge: '🍗 Frozen Meats' },
  { name: 'Venky\'s', tag: 'Quality Poultry Products', badge: '🍗 Nuggets & Bites' },
  { name: 'Cremica', tag: 'Mrs. Bector\'s Condiments', badge: '🥫 Sauces & Mayo' },
  { name: 'Dr. Oetker FunFoods', tag: 'Dips, Sauces & Dressings', badge: '🥣 Mayonnaise' },
  { name: 'Wingreens Farms', tag: 'Gourmet Dips & Seasonings', badge: '🌿 Dips & Herbs' }
];
