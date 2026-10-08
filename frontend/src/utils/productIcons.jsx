import React from 'react';

/**
 * Returns icon metadata (emoji, category label, background color, border color, text color)
 * based on product name, sku, category, and brand.
 */
export function getProductIconInfo(product) {
  const name = (product?.name || product?.product_name || (typeof product === 'string' ? product : '')).toLowerCase();
  const sku = (product?.sku || '').toLowerCase();
  const cat = (product?.category_name || (typeof product?.category === 'object' ? product?.category?.name : product?.category) || '').toLowerCase();

  // 1. Packaging Boxes (Pizza & Burger Kraft boxes)
  if (name.includes('box') || sku.includes('box') || cat.includes('box')) {
    return {
      emoji: '📦',
      label: 'Packaging Box',
      bg: 'bg-amber-700/20',
      border: 'border-amber-700/35',
      text: 'text-amber-500'
    };
  }

  // 2. Mojitos & Syrups
  if (name.includes('bluecurco') || name.includes('blue curacao') || sku.includes('moj-02')) {
    return {
      emoji: '🍸',
      label: 'Blue Curacao',
      bg: 'bg-cyan-500/15',
      border: 'border-cyan-500/30',
      text: 'text-cyan-400'
    };
  }
  if (name.includes('lime') || name.includes('mint') || sku.includes('moj') || cat.includes('mojito')) {
    return {
      emoji: '🍹',
      label: 'Mojito & Syrup',
      bg: 'bg-emerald-500/15',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400'
    };
  }

  // 3. French Fries
  if (name.includes('fries') || name.includes('french fries') || sku.includes('veg-01') || sku.includes('veg-02')) {
    return {
      emoji: '🍟',
      label: 'French Fries',
      bg: 'bg-amber-500/20',
      border: 'border-amber-500/35',
      text: 'text-amber-400'
    };
  }

  // 4. Momos
  if (name.includes('momo') || sku.includes('mom')) {
    return {
      emoji: '🥟',
      label: 'Momos',
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/30',
      text: 'text-amber-300'
    };
  }

  // 5. Burgers & Patties
  if (name.includes('burger') || name.includes('patty') || sku.includes('brg')) {
    return {
      emoji: '🍔',
      label: 'Burger Patty',
      bg: 'bg-orange-500/15',
      border: 'border-orange-500/30',
      text: 'text-orange-400'
    };
  }

  // 6. Tortilla & Wraps
  if (name.includes('tortilla') || name.includes('tortillah') || name.includes('wrap')) {
    return {
      emoji: '🌯',
      label: 'Tortilla Wrap',
      bg: 'bg-amber-500/15',
      border: 'border-amber-500/30',
      text: 'text-amber-300'
    };
  }

  // 7. Sweet Corn & Triangles
  if (name.includes('sweet corn') || name.includes('corn triangle')) {
    return {
      emoji: '🌽',
      label: 'Sweet Corn',
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/35',
      text: 'text-yellow-400'
    };
  }

  // 8. Mayonnaise
  if (name.includes('mayo') || name.includes('mayonnaise')) {
    return {
      emoji: '🥣',
      label: 'Mayonnaise',
      bg: 'bg-orange-400/15',
      border: 'border-orange-400/30',
      text: 'text-orange-300'
    };
  }

  // 9. Ketchup & Sauces
  if (name.includes('ketchup') || name.includes('sauce') || sku.includes('sau') || cat.includes('ketchup') || cat.includes('sauce')) {
    return {
      emoji: '🥫',
      label: 'Ketchup & Sauce',
      bg: 'bg-rose-500/15',
      border: 'border-rose-500/30',
      text: 'text-rose-400'
    };
  }

  // 10. Cheese & Slices & Paneer
  if (name.includes('cheese') || name.includes('paneer') || name.includes('mozerolla') || name.includes('mozzarella') || sku.includes('chs') || cat.includes('cheese')) {
    return {
      emoji: '🧀',
      label: 'Cheese & Dairy',
      bg: 'bg-yellow-500/20',
      border: 'border-yellow-500/35',
      text: 'text-yellow-300'
    };
  }

  // 11. Chicken Items, Nuggets & Pops
  if (name.includes('nugget') || name.includes('popcorn') || name.includes('pops') || name.includes('chicken') || sku.includes('chk') || cat.includes('chicken')) {
    return {
      emoji: '🍗',
      label: 'Chicken & Nuggets',
      bg: 'bg-amber-600/20',
      border: 'border-amber-600/35',
      text: 'text-amber-400'
    };
  }

  // 12. Oregano & Herbs
  if (name.includes('oregano') || name.includes('herb')) {
    return {
      emoji: '🌿',
      label: 'Oregano & Herbs',
      bg: 'bg-emerald-600/20',
      border: 'border-emerald-600/35',
      text: 'text-emerald-400'
    };
  }

  // 13. Spices & Seasonings
  if (name.includes('powder') || name.includes('chilly') || name.includes('turmeric') || name.includes('coriander') || name.includes('peri peri') || sku.includes('spc') || cat.includes('spice')) {
    return {
      emoji: '🌶️',
      label: 'Spices & Seasoning',
      bg: 'bg-red-600/20',
      border: 'border-red-600/35',
      text: 'text-red-400'
    };
  }

  // 14. Bread Mix & Marinades
  if (name.includes('bread') || name.includes('marinde') || name.includes('cajun') || sku.includes('brd') || cat.includes('bread')) {
    return {
      emoji: '🍞',
      label: 'Bread Mix & Marinade',
      bg: 'bg-orange-600/15',
      border: 'border-orange-600/30',
      text: 'text-orange-300'
    };
  }

  // 15. Default Food Badge
  return {
    emoji: '🍱',
    label: 'Wholesale Food Item',
    bg: 'bg-slate-800',
    border: 'border-slate-700',
    text: 'text-amber-400'
  };
}

/**
 * Modern, mobile-safe visual badge component with consistent sizing and zero overflow
 */
export const ProductVisualBadge = ({ product, size = 'sm', className = '' }) => {
  const info = getProductIconInfo(product);

  const sizeClasses = {
    xs: 'w-5 h-5 min-w-[20px] rounded text-[11px]',
    sm: 'w-7 h-7 min-w-[28px] rounded-lg text-xs',
    md: 'w-8 h-8 min-w-[32px] rounded-xl text-sm',
    lg: 'w-10 h-10 min-w-[40px] rounded-xl text-base'
  }[size] || 'w-7 h-7 min-w-[28px] rounded-lg text-xs';

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 border select-none shadow-sm ${info.bg} ${info.border} ${sizeClasses} ${className}`}
      title={info.label}
      aria-label={info.label}
    >
      <span className="leading-none">{info.emoji}</span>
    </div>
  );
};

/**
 * Returns a visual JSX element, backwards compatible with {visual.icon}
 */
export const getProductVisualIcon = (product, className = "w-8 h-8") => {
  const info = getProductIconInfo(product);

  return {
    icon: info.emoji,
    emoji: info.emoji,
    label: info.label,
    info: info,
    className: className,
    badge: (
      <div className={`rounded-xl ${info.bg} border ${info.border} flex items-center justify-center ${info.text} p-1.5 shadow-sm shrink-0 ${className}`}>
        <span className="text-base select-none leading-none">{info.emoji}</span>
      </div>
    )
  };
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
