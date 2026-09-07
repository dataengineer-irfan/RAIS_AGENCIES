/**
 * Utility functions for SKU display, company name subtraction,
 * and smart tokenized/typo-tolerant search.
 */

// Known commercial brand prefixes/tokens to subtract from product names
const BRAND_PREFIXES = [
  /^HUP\s*HUP\s*/i,
  /^AMUL\s*/i,
  /^I\.?T\.?C\.?\s+(MASTER\s+CHEF\s+)?/i,
  /^ITC\s+(MASTER\s+CHEF\s+)?/i,
  /^DEL\s*MONT[E]?\s*/i,
  /^FOOD\s*RITE\s*/i,
  /^MILKY\s*MIST\s*/i,
  /^NUTRICH\s*/i,
  /^CHILLI\s*FILL\s*/i,
  /^GODREJ\s*/i,
  /^SIGNATURE\s*/i,
  /^TRIKEN\s*/i,
  /^VKL\s*/i,
  /^MAYANK\s*GOLD\s*/i,
  /^RAIS\s*(MASTER|SELECT|BEVERAGES|FRESH|SPICES)?\s*/i,
  /^PACKAGING\s*SOLUTIONS\s*/i,
];

// Common typo aliases in wholesale mobile ordering
const COMMON_ALIASES = {
  fires: 'fries',
  fres: 'fries',
  fry: 'fries',
  chiken: 'chicken',
  chkn: 'chicken',
  burgr: 'burger',
  bgr: 'burger',
  paty: 'patty',
  patties: 'patty',
  chese: 'cheese',
  chez: 'cheese',
  nugts: 'nuggets',
  nugets: 'nuggets',
  nugget: 'nuggets',
  momo: 'momos',
  piza: 'pizza',
  piz: 'pizza',
  sauce: 'ketchup',
  kchup: 'ketchup',
  ketcup: 'ketchup',
  mayo: 'mayonnaise',
  mayoneis: 'mayonnaise',
  mayonies: 'mayonnaise',
  mozerella: 'mozerolla',
  mozzarella: 'mozerolla',
};

/**
 * Strips brand / company prefix to yield clean generic item name
 * e.g., "HUP HUP FRENCH FRIES 6MM" -> "FRENCH FRIES 6MM"
 *       "MILKY MIST MOZEROLLA DICED CHEESE (1KG)" -> "MOZEROLLA DICED CHEESE (1KG)"
 *       "ITC CHEESY CORN TRIANGLE" -> "CHEESY CORN TRIANGLE"
 */
export function cleanProductName(fullName, brand = '') {
  if (!fullName) return '';
  let cleaned = fullName.trim();

  // Try standard regex prefixes
  for (const regex of BRAND_PREFIXES) {
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, '').trim();
      break;
    }
  }

  // Also strip dynamic brand if provided and still present at start
  if (brand && brand.trim()) {
    const bTrim = brand.trim();
    const brandRegex = new RegExp(`^${bTrim.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i');
    cleaned = cleaned.replace(brandRegex, '').trim();
  }

  // Clean leading dashes, colons, bullets, or dots without arbitrary brackets
  const leadingChars = ['-', ':', '\u2022', '.', ' '];
  while (cleaned.length > 0 && leadingChars.includes(cleaned[0])) {
    cleaned = cleaned.slice(1).trim();
  }

  // If cleaning resulted in empty (e.g. product was literally named the brand), fallback to original
  return cleaned.length > 1 ? cleaned : fullName;
}

/**
 * Returns formatted product display metadata
 */
export function formatProductDisplay(product) {
  if (!product) return { cleanName: '', brandName: '', displayName: '', fullTitle: '', selectOptionText: '' };
  
  const rawName = product.name || '';
  const brand = product.brand || '';
  const cleanName = cleanProductName(rawName, brand);
  
  // Format brand cleanly
  const brandName = brand && !brand.toLowerCase().startsWith('rais') ? brand : (brand || '');
  
  const displayName = brandName 
    ? `${cleanName} • [${brandName}]`
    : cleanName;

  const selectOptionText = brandName
    ? `${cleanName} (${brandName}) • ${product.packaging_unit || 'PKT'} — ₹${parseFloat(product.base_price || 0).toFixed(2)}`
    : `${cleanName} • ${product.packaging_unit || 'PKT'} — ₹${parseFloat(product.base_price || 0).toFixed(2)}`;

  return {
    cleanName,
    brandName,
    displayName,
    selectOptionText,
    originalName: rawName
  };
}

/**
 * Smart multi-keyword & typo-tolerant product matcher
 */
export function smartProductMatch(product, searchInput) {
  if (!searchInput || !searchInput.trim()) return true;
  if (!product) return false;

  const rawSearch = searchInput.trim().toLowerCase();
  const searchTokens = rawSearch.split(/\s+/).filter(Boolean);

  const cleanName = cleanProductName(product.name || '', product.brand || '').toLowerCase();
  const rawName = (product.name || '').toLowerCase();
  const brand = (product.brand || '').toLowerCase();
  const sku = (product.sku || '').toLowerCase();
  const category = (
    product.category_name || 
    (typeof product.category === 'string' ? product.category : product.category?.name) || 
    ''
  ).toLowerCase();
  const unit = (product.packaging_unit || '').toLowerCase();

  const searchableCorpus = `${cleanName} ${rawName} ${brand} ${sku} ${category} ${unit}`;

  // Every token entered by user must match either directly or via alias
  return searchTokens.every(token => {
    // Direct match
    if (searchableCorpus.includes(token)) return true;

    // Check alias / typo mapping
    const alias = COMMON_ALIASES[token];
    if (alias && searchableCorpus.includes(alias)) return true;

    return false;
  });
}

/**
 * Sort array of products alphabetically by clean generic item name
 */
export function sortProductsByCleanName(products = []) {
  return [...products].sort((a, b) => {
    const nameA = cleanProductName(a.name || '', a.brand || '').toUpperCase();
    const nameB = cleanProductName(b.name || '', b.brand || '').toUpperCase();
    return nameA.localeCompare(nameB);
  });
}
