/**
 * Phonetic aliases, spoken number conversions, and domain vocabulary
 * specifically optimized for RAIS Frozen Foods wholesale operations.
 */

export const TELUGU_NUMBER_UNITS = {
  oka: 1, okati: 1,
  rendu: 2,
  moodu: 3, mudu: 3,
  nalugu: 4, naalugu: 4,
  aidu: 5, eidu: 5, aydhu: 5,
  aaru: 6, aru: 6,
  yedu: 7, edu: 7,
  enimidi: 8, enimidhi: 8,
  thommidi: 9, tommidi: 9,
  padi: 10
};

export const TELUGU_NUMBER_TENS = {
  iravai: 20, iruvai: 20,
  muppai: 30,
  nalabhai: 40, nalbhai: 40,
  yaabhai: 50, yabhai: 50,
  aravai: 60,
  debbhai: 70,
  enabhai: 80,
  thombhai: 90
};

export const TELUGU_NUMBER_SCALES = {
  vandha: 100, vanda: 100, vandhalu: 100,
  veyyi: 1000, veyi: 1000
};

// Spoken number words to numeric equivalents
export const NUMBER_UNITS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  ...TELUGU_NUMBER_UNITS
};

export const NUMBER_TENS = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  ...TELUGU_NUMBER_TENS
};

export const NUMBER_SCALES = {
  hundred: 100, thousand: 1000,
  ...TELUGU_NUMBER_SCALES
};

export const NUMBER_WORDS = {
  ...NUMBER_UNITS,
  ...NUMBER_TENS,
  ...NUMBER_SCALES,
  half: 0.5,
  quarter: 0.25,
  dozen: 12,
  'half dozen': 6
};

// Spoken packaging unit mappings
export const UNIT_SYNONYMS = {
  packet: 'PKT',
  packets: 'PKT',
  pkt: 'PKT',
  pkts: 'PKT',
  pack: 'PKT',
  packs: 'PKT',
  box: 'BOX',
  boxes: 'BOX',
  case: 'BOX',
  cases: 'BOX',
  bottle: 'BOTTLE',
  bottles: 'BOTTLE',
  btl: 'BOTTLE',
  piece: 'NOS',
  pieces: 'NOS',
  nos: 'NOS',
  pc: 'NOS',
  pcs: 'NOS',
  kg: 'KG',
  kgs: 'KG',
  kilo: 'KG',
  kilos: 'KG',
  gram: 'GRAMS',
  grams: 'GRAMS',
  gm: 'GRAMS',
  gms: 'GRAMS',
  can: 'CAN',
  cans: 'CAN',
  tin: 'CAN',
  bucket: 'BUCKET',
  buckets: 'BUCKET'
};

// Domain product nicknames & speech-to-text typo corrections
export const VOICE_PRODUCT_SYNONYMS = {
  // Fries
  'french fries': ['french fries', 'fries', 'finger chips'],
  'amul fries': ['amul french fries 6mm', 'amul fries'],
  'hup hup fries': ['hup hup french fries 6mm', 'hup hup fries', 'hup hup'],
  'smiles': ['mccain smiles', 'smiles', 'potato smiles'],
  
  // Patties & Burgers
  'veg patty': ['chilli fill veg burger patty', 'itc crispy veg burger patty', 'veg burger patty'],
  'chilli fill patty': ['chilli fill veg burger patty'],
  'itc patty': ['itc crispy veg burger patty', 'itc paneer patty'],
  'paneer patty': ['itc paneer patty'],
  'chicken patty': ['nutrich chicken burger patty', 'chicken burger patty'],
  'burger bun': ['burger bun', 'buns', 'bun'],
  
  // Chicken items
  'popcorn': ['nutrich chicken popcorn ball', 'chicken popcorn', 'popcorn chicken'],
  'chicken popcorn': ['nutrich chicken popcorn ball', 'chicken popcorn'],
  'nuggets': ['chicken nuggets', 'godrej tandoori paneer nuggets'],
  'chicken nuggets': ['chicken nuggets'],
  'chicken fingers': ['fingers chicken', 'chicken fingers'],
  
  // Momos
  'momos': ['chicken momos', 'i.t.c veg momos'],
  'chicken momos': ['chicken momos'],
  'veg momos': ['i.t.c veg momos', 'itc veg momos'],
  
  // Cheese & Dairy
  'cheese': ['milky mist mozerolla diced cheese', 'milky mist cheese slice'],
  'mozzarella': ['milky mist mozerolla diced cheese'],
  'diced cheese': ['milky mist mozerolla diced cheese (1kg)', 'milky mist mozerolla diced cheese (2kg)'],
  'cheese slice': ['milky mist cheese slice', 'cheese slices'],
  'paneer cubes': ['milky mist paneer (diced cubes)'],
  'paneer': ['milky mist paneer (diced cubes)', 'godrej paneer pops'],
  'paneer pops': ['godrej paneer pops'],
  'butter': ['butter nutrilite'],
  
  // Tortilla & Wraps
  'tortilla': ['signature tortillah 8.5 inches', 'signature tortillah 10 inches'],
  'tortilla 8': ['signature tortillah 8.5 inches', 'tortilla 8.5'],
  'tortilla 10': ['signature tortillah 10 inches'],
  'spring roll': ['veg spring rolls'],
  'veggie balls': ['veggie balls'],
  'pizza base': ['pizza base 8 inch', 'piz base 9 inch'],
  'pizza base 8': ['pizza base 8 inch'],
  'pizza base 9': ['piz base 9 inch'],
  'piz base': ['piz base 9 inch'],
  
  // Sauces & Mayonnaise
  'tomato sauce 8 gram': ['delmonte ketchup (8 gram pkt)'],
  'tomato sauce': ['delmont tomato ketchup 1.1kg', 'foodrite tomato ketchup', 'delmonte ketchup (8 gram pkt)'],
  'sauce 8 gram': ['delmonte ketchup (8 gram pkt)'],
  'ketchup': ['delmonte ketchup (8 gram pkt)', 'delmont tomato ketchup 1.1kg', 'foodrite tomato ketchup', 'mayank gold ketchup (9 gram pkt)', 'kechup fdr 5kg tomato'],
  'tomato ketchup': ['delmont tomato ketchup 1.1kg', 'foodrite tomato ketchup'],
  'small ketchup': ['delmonte ketchup (8 gram pkt)', 'mayank gold ketchup (9 gram pkt)'],
  'mayo': ['foodrite salad mayonnaise', 'foodrite mayonnaise (8 gram pkt)', 'delmont tandoori mayo'],
  'mayonnaise': ['foodrite salad mayonnaise', 'foodrite mayonnaise (8 gram pkt)'],
  'tandoori mayo': ['delmont tandoori mayo'],
  'barbeque sauce': ['barbique sauce dwlmonte', 'bbq sauce'],
  'pizza sauce': ['delmonte pizza pasta sauce', 'pizza pasta sauce'],
  'cheese sauce': ['delmonte creamy cheese sauce'],
  
  // Spices & Seasoning
  'peri peri': ['vkl peri peri powder'],
  'chilly powder': ['chilly powder', 'chilly powder no 1 (pickle)'],
  'turmeric': ['turmeric powder'],
  'coriander': ['coriander powder'],
  'oregano': ['oregano'],
  'chilli flakes': ['chilli flakes vkl'],
  'mushrooms/seasoning': ['vkl extra h & s marinde', 'vkl crispy cajun breading mix'],
  
  // Syrups / Mojitos
  'bluecurco mojito': ['bluecurco'],
  'bluecurco': ['bluecurco'],
  'blue curacao mojito': ['bluecurco'],
  'blue curacao': ['bluecurco', 'blue curacao'],
  'lime and mint mojito': ['lime and mint'],
  'mint mojito': ['lime and mint', 'lime and mint mojito'],
  'strawberry mojito': ['strawberry moji'],
  'mojito': ['lime and mint', 'bluecurco', 'strawberry moji'],
  
  // Packaging
  'burger box': ['burger box 4"x4" printed', 'burger box 5"x5" printed'],
  'pizza box': ['pizza box 8"x8" printed laminated', 'pizza box 99 plain'],
  'kfc bucket': ['kfc bucket', 'bukets'],
  'mayo cups': ['mayonies cups 35 mm', 'mayo cups'],
  'tissue': ['tissue papers', 'tissues']
};

// Stock adjustment reason triggers
export const ADJUSTMENT_REASONS = {
  damage: 'DAMAGED',
  damaged: 'DAMAGED',
  breakage: 'DAMAGED',
  broken: 'DAMAGED',
  spoiled: 'DAMAGED',
  expired: 'EXPIRED',
  expiry: 'EXPIRED',
  date: 'EXPIRED',
  wastage: 'WASTAGE',
  waste: 'WASTAGE',
  loss: 'WASTAGE',
  correction: 'CORRECTION',
  mistake: 'CORRECTION',
  wrong: 'CORRECTION',
  count: 'PHYSICAL_COUNT',
  counting: 'PHYSICAL_COUNT',
  audit: 'PHYSICAL_COUNT'
};
