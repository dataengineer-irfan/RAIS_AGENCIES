/**
 * RAIS AGENCIES — High-Impact Product Visual Media Mapper
 * Maps SKUs and product titles directly to local product packaging pack-shots
 * stored in `/assets/products/` for instant visual recognition by kitchen operators and counter staff.
 */

// Direct SKU mapping to public asset images
const SKU_IMAGE_MAP = {
  // Spices & Seasonings
  'RAIS-BRD-03': 'vkl_peri_peri_sprinkler.jpg',
  'RAIS-SAU-06': 'big_bell_oregano.jpg',
  'RAIS-BRD-04': 'vkl_crispy_cajun_breading.jpg',
  'RAIS-BRD-05': 'vkl_extra_hs_marinade.jpg',

  // Packaging Boxes
  'RAIS-BOX-01': 'boxes_display_pizza_burger.jpg',
  'RAIS-BOX-02': 'burger_box_printed.jpg',
  'RAIS-BOX-03': 'pizza_boxes_assortment.jpg',
  'RAIS-BOX-04': 'burger_box_printed.jpg',
  'RAIS-BOX-05': 'burger_boxes.jpg',
  'RAIS-BOX-06': 'kfc_bucket.jpg',
  'RAIS-BOX-07': 'tissue_papers_pack.jpg',
  'RAIS-BOX-08': 'butter_paper_pack.jpg',

  // Sauces & Mayonnaise
  'RAIS-SAU-01': 'delmonte_ketchup_bottle.jpg',
  'RAIS-SAU-02': 'delmonte_ketchup_1_1kg.jpg',
  'RAIS-SAU-03': 'delmonte_ketchup_bottle.jpg',
  'RAIS-SAU-04': 'delmonte_tandoori_mayo.jpg',
  'RAIS-SAU-05': 'delmonte_pizza_pasta_sauce.jpg',
  'RAIS-SAU-07': 'ketchup_sachets.jpg',
  'RAIS-SAU-08': 'foodrite_mayo_sachets.jpg',
  'RAIS-SAU-09': 'delmonte_creamy_cheese.jpg',
  'RAIS-SAU-10': 'delmonte_barbeque_sauce.jpg',

  // Dairy & Cheese
  'RAIS-CHS-01': 'milky_mist_mozzarella_1kg.jpg',
  'RAIS-CHS-02': 'milky_mist_mozzarella_2kg.jpg',
  'RAIS-CHS-03': 'milky_mist_cheese_slices.jpg',
  'RAIS-CHS-04': 'paneer_diced_cubes.jpg',

  // French Fries & Snacks
  'RAIS-VEG-01': 'amul_french_fries_6mm.jpg',
  'RAIS-VEG-02': 'amul_french_fries_9mm.jpg',
  'RAIS-VEG-03': 'mccain_smiles.jpg',
  'RAIS-VEG-04': 'sweet_corn_pack.jpg',
  'RAIS-VEG-05': 'chill_fill_veg_patty.jpg',
  'RAIS-VEG-06': 'cheesy_triangle.jpg',

  // Momos & Chicken
  'RAIS-MOM-01': 'triken_chicken_momos.jpg',
  'RAIS-MOM-02': 'veg_momos.jpg',
  'RAIS-CHK-01': 'itc_crunchy_chicken_nuggets.jpg',
  'RAIS-CHK-02': 'chicken_patty.jpg',
  'RAIS-CHK-03': 'chicken_fingers.jpg',

  // Tortillas & Bakery
  'RAIS-BRD-01': 'fresh2go_tortilla_10.jpg',
  'RAIS-BRD-02': 'fresh2go_tortilla_8_5.jpg',
  'RAIS-BAK-01': 'burger_buns.jpg',
  'RAIS-BAK-02': 'pizza_base.jpg',

  // Mojitos & Beverages
  'RAIS-MOJ-01': 'manama_strawberry_mojito.jpg',
  'RAIS-MOJ-02': 'manama_syrups_trio.jpg'
};

// Keyword matcher rules for dynamic recommendations and products
const KEYWORD_RULES = [
  { pattern: /PERI\s*PERI/i, file: 'vkl_peri_peri_sprinkler.jpg', te: 'ఫ్రెంచ్ ఫ్రైస్‌కు పెరి పెరి బెస్ట్ కాంబినేషన్' },
  { pattern: /OREGANO/i, file: 'big_bell_oregano.jpg', te: 'పిజ్జా కోసం ఒరేగానో తాజా స్టాక్' },
  { pattern: /PIZZA\s*BOX/i, file: 'boxes_display_pizza_burger.jpg', te: 'పిజ్జా బాక్సులు డిపోలో సిద్ధంగా ఉన్నాయి' },
  { pattern: /BURGER\s*BOX/i, file: 'burger_box_printed.jpg', te: 'ప్రింటెడ్ బర్గర్ బాక్సులు డిపో స్టాక్' },
  { pattern: /TANDOORI\s*MAYO/i, file: 'delmonte_tandoori_mayo.jpg', te: 'డెల్మోంటే తందూరి మాయో సాస్' },
  { pattern: /MAYO|MAYONNAISE/i, file: 'delmonte_tandoori_mayo.jpg', te: 'రుచికరమైన మాయోనైస్ డిపో స్టాక్' },
  { pattern: /KETCHUP|SAUCE\s*SACHET/i, file: 'delmonte_ketchup_bottle.jpg', te: 'డెల్మోంటే కెచప్ బాటిల్స్ & పౌచ్‌లు' },
  { pattern: /MOZZARELLA|CHEESE/i, file: 'milky_mist_mozzarella_1kg.jpg', te: 'మిల్కీ మిస్ట్ మొజారెల్లా చీజ్' },
  { pattern: /FRIES|FRENCH\s*FRIES/i, file: 'amul_french_fries_6mm.jpg', te: 'అముల్ ఫ్రెంచ్ ఫ్రైస్ క్రిస్పీ స్టాక్' },
  { pattern: /TORTILLA|WRAP/i, file: 'fresh2go_tortilla_10.jpg', te: 'ఫ్రెష్2గో టోర్టిల్లా ర్యాప్స్' },
  { pattern: /MOMO/i, file: 'triken_chicken_momos.jpg', te: 'చికెన్ & వెజ్ మోమోస్ తాజా బ్యాచ్' },
  { pattern: /NUGGET/i, file: 'itc_crunchy_chicken_nuggets.jpg', te: 'ఐటీసీ చికెన్ నగ్గెట్స్' },
  { pattern: /BREADING|CAJUN/i, file: 'vkl_crispy_cajun_breading.jpg', te: 'వికెఎల్ క్రిస్పీ బ్రెడ్డింగ్ మిక్స్' },
  { pattern: /MARINADE/i, file: 'vkl_extra_hs_marinade.jpg', te: 'హాట్ & స్పైసీ చికెన్ మెరినేడ్' },
  { pattern: /SWEET\s*CORN/i, file: 'sweet_corn_pack.jpg', te: 'స్వీట్ కార్న్ ప్యాకెట్లు' },
  { pattern: /BUN/i, file: 'burger_buns.jpg', te: 'సాఫ్ట్ బర్గర్ బన్స్' },
  { pattern: /PIZZA\s*BASE/i, file: 'pizza_base.jpg', te: 'పిజ్జా బేస్‌లు డిపోలో ఉన్నాయి' },
  { pattern: /MOJITO|SYRUP/i, file: 'manama_strawberry_mojito.jpg', te: 'మనమ మొజితో సిరప్‌లు' },
  { pattern: /BOX/i, file: 'boxes_display_pizza_burger.jpg', te: 'పార్సిల్ బాక్సులు డిపోలో సిద్ధం' }
];

/**
 * Resolves the relative image path for a product or suggestion.
 */
export function getProductImageFilename(sku, name = '') {
  const cleanSku = (sku || '').trim().toUpperCase();
  if (cleanSku && SKU_IMAGE_MAP[cleanSku]) {
    return SKU_IMAGE_MAP[cleanSku];
  }

  const text = `${cleanSku} ${name || ''}`.trim();
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(text)) {
      return rule.file;
    }
  }

  // Graceful fallback to general packaging boxes display
  return 'boxes_display_pizza_burger.jpg';
}

/**
 * Returns full URL to the product image asset.
 */
export function getProductImageUrl(productOrSku, maybeName = '') {
  let sku = '';
  let name = '';

  if (typeof productOrSku === 'object' && productOrSku !== null) {
    sku = productOrSku.sku || '';
    name = productOrSku.name || productOrSku.item_description || productOrSku.product_name || '';
  } else if (typeof productOrSku === 'string') {
    sku = productOrSku;
    name = maybeName || '';
  }

  const filename = getProductImageFilename(sku, name);
  return `/assets/products/${filename}`;
}

/**
 * Returns a short Telugu companion phrase for visual marketing banners.
 */
export function getTeluguCompanionPhrase(name = '') {
  for (const rule of KEYWORD_RULES) {
    if (rule.pattern.test(name)) {
      return rule.te;
    }
  }
  return 'రాయచోటి డిపోలో తాజా స్టాక్ సిద్ధంగా ఉంది';
}

/**
 * Preloads an image into an HTMLImageElement with a strict timeout.
 * Guaranteed never to throw; resolves to null on error or timeout.
 */
export function preloadImage(url, timeoutMs = 1200) {
  if (typeof window === 'undefined' || !url) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let resolved = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(null);
      }
    }, timeoutMs);

    img.onload = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(img);
      }
    };

    img.onerror = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(null);
      }
    };

    img.src = url;
  });
}
