import { 
  NUMBER_UNITS, 
  NUMBER_TENS, 
  NUMBER_SCALES, 
  NUMBER_WORDS, 
  UNIT_SYNONYMS, 
  VOICE_PRODUCT_SYNONYMS, 
  ADJUSTMENT_REASONS 
} from './voiceAliases.js';
import { cleanProductName } from '../../utils/productHelpers.js';

/**
 * Deterministic, zero-cost voice parsing and entity resolution engine
 * for RAIS Frozen Foods operations.
 */

// ─── 0. PRIVACY-SAFE IN-MEMORY VOICE TELEMETRY COLLECTOR ───
const _voiceTelemetry = {
  totalInvocations: 0,
  intentCounts: {
    INVOICE: 0,
    CUSTOMER: 0,
    ADJUST_STOCK: 0,
    RECEIVE_STOCK: 0,
    CANCEL: 0,
    UNKNOWN: 0
  },
  resolvedItemsCount: 0,
  ambiguousItemsCount: 0,
  totalParseDurationMs: 0
};

export function getVoiceTelemetryMetrics() {
  const avgLatency = _voiceTelemetry.totalInvocations > 0
    ? Number((_voiceTelemetry.totalParseDurationMs / _voiceTelemetry.totalInvocations).toFixed(2))
    : 0;
  return {
    ..._voiceTelemetry,
    intentCounts: { ..._voiceTelemetry.intentCounts },
    averageParseLatencyMs: avgLatency
  };
}

export function resetVoiceTelemetryMetrics() {
  _voiceTelemetry.totalInvocations = 0;
  _voiceTelemetry.intentCounts = {
    INVOICE: 0,
    CUSTOMER: 0,
    ADJUST_STOCK: 0,
    RECEIVE_STOCK: 0,
    CANCEL: 0,
    UNKNOWN: 0
  };
  _voiceTelemetry.resolvedItemsCount = 0;
  _voiceTelemetry.ambiguousItemsCount = 0;
  _voiceTelemetry.totalParseDurationMs = 0;
}

function recordTelemetryInvocation(intent, durationMs, resolvedItems = 0, ambiguousItems = 0) {
  _voiceTelemetry.totalInvocations++;
  const key = _voiceTelemetry.intentCounts[intent] !== undefined ? intent : 'UNKNOWN';
  _voiceTelemetry.intentCounts[key] = (_voiceTelemetry.intentCounts[key] || 0) + 1;
  _voiceTelemetry.totalParseDurationMs += durationMs;
  _voiceTelemetry.resolvedItemsCount += resolvedItems;
  _voiceTelemetry.ambiguousItemsCount += ambiguousItems;
}

// ─── 1. STRING SIMILARITY & LEVENSHTEIN UTILITIES ───

export function levenshteinDistance(s1 = '', s2 = '') {
  const a = s1.toLowerCase().trim();
  const b = s2.toLowerCase().trim();
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = [];
  for (let i = 0; i <= b.length; i++) row[i] = i;

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      let val;
      if (a[i - 1] === b[j - 1]) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

export function stringSimilarity(s1 = '', s2 = '') {
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return Math.max(0, 1 - dist / maxLen);
}

// ─── 2. COMPOUND NUMBER LEXER & SPOKEN TEXT NORMALIZATION ───

function parseSingleNumberWord(words, startIdx) {
  let idx = startIdx;
  let total = 0;
  let current = 0;
  let matched = false;

  while (idx < words.length) {
    const w = words[idx].toLowerCase().replace(/[.,!?:;]/g, '');

    if (w === 'hundred' || NUMBER_SCALES[w] === 100) {
      current = (current === 0 ? 1 : current) * 100;
      matched = true;
      idx++;
      // Handle "hundred and five", "hundred and twenty"
      if (idx < words.length && words[idx].toLowerCase().replace(/[.,!?:;]/g, '') === 'and') {
        const nextIdx = idx + 1;
        if (nextIdx < words.length) {
          const nextW = words[nextIdx].toLowerCase().replace(/[.,!?:;]/g, '');
          if (NUMBER_UNITS[nextW] !== undefined || NUMBER_TENS[nextW] !== undefined || nextW === 'half' || nextW === 'quarter') {
            idx++; // consume 'and'
          }
        }
      }
    } else if (w === 'thousand' || NUMBER_SCALES[w] === 1000) {
      current = (current === 0 ? 1 : current) * 1000;
      total += current;
      current = 0;
      matched = true;
      idx++;
      // Handle "thousand and five", "thousand and twenty"
      if (idx < words.length && words[idx].toLowerCase().replace(/[.,!?:;]/g, '') === 'and') {
        const nextIdx = idx + 1;
        if (nextIdx < words.length) {
          const nextW = words[nextIdx].toLowerCase().replace(/[.,!?:;]/g, '');
          if (NUMBER_UNITS[nextW] !== undefined || NUMBER_TENS[nextW] !== undefined || nextW === 'hundred' || nextW === 'half' || nextW === 'quarter') {
            idx++; // consume 'and'
          }
        }
      }
    } else if (NUMBER_TENS[w] !== undefined) {
      if (current % 100 >= 20 || (current % 100 >= 10 && current % 100 <= 19)) {
        break; // Start of next number
      }
      current += NUMBER_TENS[w];
      matched = true;
      idx++;
      if (idx < words.length) {
        const nextW = words[idx].toLowerCase().replace(/[.,!?:;]/g, '');
        if (NUMBER_UNITS[nextW] !== undefined && NUMBER_UNITS[nextW] >= 1 && NUMBER_UNITS[nextW] <= 9) {
          current += NUMBER_UNITS[nextW];
          idx++;
        }
      }
      if (idx < words.length && !NUMBER_SCALES[words[idx].toLowerCase().replace(/[.,!?:;]/g, '')]) {
        break;
      }
    } else if (NUMBER_UNITS[w] !== undefined) {
      if (current % 100 !== 0) {
        break; // Cannot append unit if tens already added
      }
      current += NUMBER_UNITS[w];
      matched = true;
      idx++;
      if (idx < words.length && !NUMBER_SCALES[words[idx].toLowerCase().replace(/[.,!?:;]/g, '')]) {
        break;
      }
    } else if (w === 'dozen') {
      current = (current === 0 ? 1 : current) * 12;
      matched = true;
      idx++;
      break;
    } else if (w === 'half') {
      current += 0.5;
      matched = true;
      idx++;
      break;
    } else if (w === 'quarter') {
      current += 0.25;
      matched = true;
      idx++;
      break;
    } else {
      break;
    }
  }

  if (!matched) return null;

  // Handle spoken decimals e.g. "twenty point five", "two point five"
  if (idx < words.length && words[idx].toLowerCase().replace(/[.,!?:;]/g, '') === 'point') {
    if (idx + 1 < words.length) {
      const decW = words[idx + 1].toLowerCase().replace(/[.,!?:;]/g, '');
      let decVal = null;
      if (NUMBER_UNITS[decW] !== undefined) {
        decVal = NUMBER_UNITS[decW];
      } else if (/^\d+$/.test(decW)) {
        decVal = parseFloat(decW);
      }
      if (decVal !== null) {
        current += parseFloat(`0.${decVal}`);
        idx += 2;
      }
    }
  }

  return { value: total + current, nextIdx: idx };
}

export function normalizeSpokenText(raw = '') {
  if (!raw) return '';
  let text = raw.toLowerCase().trim();

  // Pre-normalize spoken fractions and units
  text = text.replace(/\b(?:half a dozen|half dozen)\b/gi, '6');
  text = text.replace(/\b(?:a dozen)\b/gi, '12');
  text = text.replace(/\b(rupees|rupee|rs|inr)\b/gi, 'rupees');
  text = text.replace(/(\d+)\s+point\s+(\d+)/gi, '$1.$2');
  text = text.replace(/\b(\d+)\s+(?:and\s+)?(?:a\s+)?half\b/gi, (m, d) => `${parseFloat(d) + 0.5}`);
  text = text.replace(/\b(\d+)\s+(?:and\s+)?(?:a\s+)?quarter\b/gi, (m, d) => `${parseFloat(d) + 0.25}`);

  const words = text.split(/\s+/);
  const out = [];
  let i = 0;

  while (i < words.length) {
    const parsed = parseSingleNumberWord(words, i);
    if (parsed) {
      out.push(String(parsed.value));
      i = parsed.nextIdx;
    } else {
      out.push(words[i]);
      i++;
    }
  }

  let normalized = out.join(' ');

  // Post-normalization for spoken fractions combining with parsed digit numbers (e.g. "2 and a half" or "2 and a 0.5" -> 2.5)
  normalized = normalized.replace(/\b(\d+(?:\.\d+)?)\s+(?:and\s+)?(?:a\s+)?(?:half|0\.5)\b/gi, (m, d) => `${parseFloat(d) + 0.5}`);
  normalized = normalized.replace(/\b(\d+(?:\.\d+)?)\s+(?:and\s+)?(?:a\s+)?(?:quarter|0\.25)\b/gi, (m, d) => `${parseFloat(d) + 0.25}`);

  // Group arbitrary sequences of spoken digits or 2-digit pairs summing to 10 digits (Indian mobile)
  normalized = normalized.replace(/\b([6-9]\d{0,4}(?:\s+\d{1,5}){1,9})\b/g, (match) => {
    const digits = match.replace(/\s+/g, '');
    if (digits.length === 10) return digits;
    return match;
  });

  return normalized;
}

// ─── 3. INTENT DETECTION ───

export function detectIntent(normalizedText = '') {
  const t = normalizedText.toLowerCase();

  // Double negation guard: "do not cancel", "don't stop" means DO NOT cancel!
  const isDoubleNegation = /\b(?:do not|don't|dont|never)\s+(?:cancel|abort|discard|stop)\b/i.test(t);

  if (!isDoubleNegation) {
    // Direct cancellation / rejection directives
    if (/\b(?:cancel|stop|abort|discard|reject|forget it)\b/i.test(t)) {
      return 'UNKNOWN';
    }
    // Negated directives across billing, inventory and stock adjustments
    if (/\b(?:don't|dont|do not|never)\s+(?:create|save|proceed|add|process|bill|invoice|record|submit|damage|adjust|receive)\b/i.test(t)) {
      return 'UNKNOWN';
    }
  }

  // Stock adjustments
  if (/\b(damage|damaged|breakage|expired|expiry|wastage|waste|adjust stock|correction|physical count|count)\b/i.test(t)) {
    return 'STOCK_ADJUSTMENT';
  }

  // Stock receipts
  if (/\b(received|receive stock|inward|truck delivery|supplier delivery|stock arrival)\b/i.test(t)) {
    return 'STOCK_RECEIPT';
  }

  // Customer onboarding
  if (/\b(new customer|add customer|register customer|create customer|new outlet|onboard)\b/i.test(t)) {
    return 'CUSTOMER_ONBOARDING';
  }

  // Default to Invoice creation (the primary daily high-frequency operation)
  return 'INVOICE';
}

// ─── 4. CUSTOMER EXTRACTION ───

export function extractCustomer(text = '', customers = []) {
  if (!customers || customers.length === 0) return { customer: null, confidence: 0, matchedSnippet: '' };

  const rawText = text.toLowerCase();
  // Strip punctuation for matching
  const cleanText = rawText.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  let bestCust = null;
  let bestScore = 0;
  let matchedSnippet = '';

  for (const c of customers) {
    const bNameRaw = (c.business_name || '').toLowerCase().trim();
    const bNameClean = bNameRaw.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const cPerson = (c.contact_person || '').toLowerCase().trim();
    const cPersonClean = cPerson.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const cCode = (c.customer_code || '').toLowerCase().trim();
    const cCity = (c.city || '').toLowerCase().trim();

    // 1. Exact or whole-phrase match
    if (bNameClean.length > 2 && (cleanText.includes(bNameClean) || rawText.includes(bNameRaw))) {
      const score = 0.98;
      if (score > bestScore) {
        bestScore = score;
        bestCust = c;
        matchedSnippet = bNameRaw;
      }
      continue;
    }

    // 2. Customer Code Match
    if (cCode.length > 3 && rawText.includes(cCode)) {
      const score = 0.99;
      if (score > bestScore) {
        bestScore = score;
        bestCust = c;
        matchedSnippet = cCode;
      }
      continue;
    }

    // 3. Acronym / Brand + Area Matching (e.g. "KFC Kalakada" matches "KFC - KALAKADA AFROSE")
    const bTokens = bNameClean.split(/\s+/).filter(t => t.length >= 2);
    if (bTokens.length >= 2) {
      const acronym = bTokens[0]; // e.g. "kfc", "yfc", "al", "hot"
      const nonAcronymTokens = bTokens.slice(1);
      const matchedNonAcronyms = nonAcronymTokens.filter(t => cleanText.includes(t));

      if (cleanText.includes(acronym) && matchedNonAcronyms.length >= 1) {
        const score = 0.92;
        if (score > bestScore) {
          bestScore = score;
          bestCust = c;
          matchedSnippet = `${acronym} ${matchedNonAcronyms.join(' ')}`;
        }
        continue;
      }

      if (cCity.length > 2 && cleanText.includes(acronym) && cleanText.includes(cCity)) {
        const score = 0.90;
        if (score > bestScore) {
          bestScore = score;
          bestCust = c;
          matchedSnippet = `${acronym} ${cCity}`;
        }
        continue;
      }
    }

    // 3b. Collapsed acronym matching (e.g. "J F C" matches spoken "jfc")
    const collapsedBName = bNameClean.replace(/\s+/g, '');
    if (collapsedBName.length >= 2) {
      const cleanTokens = cleanText.split(/\s+/);
      if (cleanTokens.includes(collapsedBName)) {
        const score = 0.96;
        if (score > bestScore) {
          bestScore = score;
          bestCust = c;
          matchedSnippet = collapsedBName;
        }
        continue;
      }
    }

    // 3c. Distinctive City / Town / Branch match (e.g. "Kalakada store" -> customer in Kalakada)
    if (cCity.length >= 4 && cCity !== 'rayachoty' && cleanText.includes(cCity)) {
      const score = cleanText.includes(`${cCity} store`) || cleanText.includes(`${cCity} branch`) ? 0.92 : 0.88;
      if (score > bestScore) {
        bestScore = score;
        bestCust = c;
        matchedSnippet = cleanText.includes(`${cCity} store`) ? `${cCity} store` : (cleanText.includes(`${cCity} branch`) ? `${cCity} branch` : cCity);
      }
      continue;
    }

    // 4. Token overlap score
    if (bTokens.length > 0) {
      const matchedTokens = bTokens.filter(t => cleanText.includes(t));
      const overlapRatio = matchedTokens.length / bTokens.length;
      if (overlapRatio >= 0.60) {
        const score = 0.85 + (overlapRatio * 0.10);
        if (score > bestScore) {
          bestScore = score;
          bestCust = c;
          matchedSnippet = matchedTokens.join(' ');
        }
        continue;
      }
    }

    // 5. Contact person match
    if (cPersonClean.length > 3 && cleanText.includes(cPersonClean)) {
      const score = 0.80;
      if (score > bestScore) {
        bestScore = score;
        bestCust = c;
        matchedSnippet = cPerson;
      }
    }
  }

  // If score is high enough, return matched customer
  if (bestCust && bestScore >= 0.70) {
    return {
      customer: bestCust,
      confidence: bestScore,
      matchedSnippet
    };
  }

  return { customer: null, confidence: 0, matchedSnippet: '' };
}

// ─── 5. PRODUCT & LINE ITEM MATCHING ───

export function matchProductToCatalogue(query = '', products = []) {
  if (!query || !products || products.length === 0) return { product: null, score: 0, alternatives: [] };

  const q = query.toLowerCase().trim();

  // Helper to score a candidate query string against all products
  function scoreCatalogue(targetQ) {
    let bestP = null;
    let bestS = 0;
    const list = [];

    for (const p of products) {
      const rawName = (p.name || '').toLowerCase();
      const cleanName = cleanProductName(p.name || '', p.brand || '').toLowerCase();
      const sku = (p.sku || '').toLowerCase();
      const brand = (p.brand || '').toLowerCase();

      let score = 0;

      // Exact raw name, SKU, or clean name match
      if (rawName === targetQ || sku === targetQ) {
        score = 1.0;
      } else if (cleanName === targetQ) {
        score = 0.95;
      } else {
        // Token overlap + sequence similarity
        const qTokens = targetQ.split(/\s+/).filter(t => t.length > 1);
        const nameTokens = rawName.split(/\s+/).filter(t => t.length > 1);
        const cleanTokens = cleanName.split(/\s+/).filter(t => t.length > 1);
        const allProdTokens = new Set([...nameTokens, ...cleanTokens]);

        const overlap = qTokens.filter(t => allProdTokens.has(t) || rawName.includes(t));
        const overlapRatio = qTokens.length > 0 ? overlap.length / qTokens.length : 0;
        const sim = Math.max(stringSimilarity(targetQ, rawName), stringSimilarity(targetQ, cleanName));

        score = (overlapRatio * 0.70) + (sim * 0.30);

        // Brand matching
        if (brand && brand.length > 2) {
          if (targetQ.includes(brand)) {
            score += 0.25;
          } else {
            for (const otherBrand of ['amul', 'hup hup', 'itc', 'triken', 'godrej', 'delmonte', 'foodrite', 'signature', 'nutrich']) {
              if (otherBrand !== brand && targetQ.includes(otherBrand)) {
                score -= 0.40;
                break;
              }
            }
          }
        }

        // Weight & dimension matching (normalized for inch quotes e.g. 8"x8" -> 8inch)
        const weightMatch = targetQ.match(/\b(1kg|2kg|5kg|1\.1kg|6mm|9mm|8\.5\s*inch(?:es)?|10\s*inch(?:es)?|8\s*inch(?:es)?|9\s*inch(?:es)?|4\s*inch(?:es)?)\b/i);
        if (weightMatch) {
          const wt = weightMatch[1].toLowerCase().replace(/\s+/g, '').replace(/es$/, '');
          const normRaw = rawName.replace(/(\d+)"\s*x\s*\1"/g, '$1 inch').replace(/(\d+)"/g, '$1 inch').toLowerCase().replace(/\s+/g, '');
          const normClean = cleanName.replace(/(\d+)"\s*x\s*\1"/g, '$1 inch').replace(/(\d+)"/g, '$1 inch').toLowerCase().replace(/\s+/g, '');
          const prodHasWt = normRaw.includes(wt) || normClean.includes(wt);
          if (prodHasWt) {
            score += 0.30;
          } else {
            score -= 0.35;
          }
        }

        // Mutually exclusive product discriminator adjustments
        if (/\bbox\b/i.test(targetQ)) {
          if (/\bbox\b/i.test(rawName)) score += 0.25;
          if (/\bbase\b/i.test(rawName)) score -= 0.40;
        } else if (/\bbase\b/i.test(targetQ)) {
          if (/\bbase\b/i.test(rawName)) score += 0.25;
          if (/\bbox\b/i.test(rawName)) score -= 0.40;
        }

        if (/\bplain\b/i.test(targetQ)) {
          if (/\bplain\b/i.test(rawName)) score += 0.20;
          if (/\bprinted\b/i.test(rawName)) score -= 0.35;
        } else if (/\bprinted\b/i.test(targetQ)) {
          if (/\bprinted\b/i.test(rawName)) score += 0.20;
          if (/\bplain\b/i.test(rawName)) score -= 0.35;
        }
      }

      score = Math.min(1.0, Math.max(0.0, score));
      list.push({ product: p, score: Math.round(score * 100) / 100 });
      if (score > bestS) {
        bestS = score;
        bestP = p;
      }
    }

    return { bestProd: bestP, bestScore: bestS, scoredList: list };
  }

  // 1. Direct catalogue matching against user utterance
  let { bestProd, bestScore, scoredList } = scoreCatalogue(q);

  // 2. If direct match is insufficient (< 0.70), fall back to longest matching synonym target
  if (bestScore < 0.70) {
    const matchingSynKeys = Object.keys(VOICE_PRODUCT_SYNONYMS)
      .filter(k => q.includes(k))
      .sort((a, b) => b.length - a.length);

    if (matchingSynKeys.length > 0) {
      const bestSynKey = matchingSynKeys[0];
      const synTarget = VOICE_PRODUCT_SYNONYMS[bestSynKey][0];
      const synRes = scoreCatalogue(synTarget);
      if (synRes.bestScore > bestScore) {
        bestProd = synRes.bestProd;
        bestScore = synRes.bestScore;
        scoredList = synRes.scoredList;
      }
    }
  }

  // Filter scored list to find close alternatives (potential ambiguity)
  scoredList.sort((a, b) => b.score - a.score);
  
  let isAmbiguous = false;
  const alternatives = [];

  if (scoredList.length > 1 && scoredList[1].score >= 0.65) {
    const delta = bestScore - scoredList[1].score;
    if (delta <= 0.15) {
      const nameA = scoredList[0].product.name.toLowerCase();
      const nameB = scoredList[1].product.name.toLowerCase();
      const commonWords = nameA.split(/\s+/).filter(w => nameB.includes(w) && w.length > 3);
      if (commonWords.length >= 1) {
        isAmbiguous = true;
        for (let k = 1; k < Math.min(4, scoredList.length); k++) {
          if (bestScore - scoredList[k].score <= 0.20) {
            alternatives.push(scoredList[k].product);
          }
        }
      }
    }
  }

  // Fallback for generic category terms without explicit variants
  const GENERIC_CATEGORY_TERMS = [
    'burger patty', 'patty', 'french fries', 'fries', 'cheese', 'momos', 'mozzarella',
    'pizza base', 'pizza box', 'burger box', 'tortillah', 'tortilla', 'ketchup', 'tomato ketchup', 'tomato sauce'
  ];
  const isGeneric = GENERIC_CATEGORY_TERMS.some(t => q === t || q.endsWith(' ' + t) || q.startsWith(t + ' '));
  if (isGeneric) {
    const hasDifferentiator = /\b(6mm|9mm|8\.5|10|8\s*inch|9\s*inch|4\s*inch|1kg|2kg|1\.1kg|8\s*gram|8\s*gm|veg|chicken|slice|amul|hup hup|itc|triken|plain|printed)\b/i.test(q);
    if (!hasDifferentiator) {
      isAmbiguous = true;
    }
  }

  // Fallback for generic alternatives
  if (!isAmbiguous) {
    const rawAlts = scoredList
      .slice(1, 4)
      .filter(item => item.score >= 0.50 && bestScore - item.score <= 0.20)
      .map(i => i.product);
    if (rawAlts.length > 0 && bestScore < 0.90) {
      isAmbiguous = true;
      alternatives.push(...rawAlts);
    }
  }

  return {
    product: bestScore >= 0.45 ? bestProd : null,
    score: bestScore,
    isAmbiguous,
    alternatives
  };
}

// ─── 6. WORKFLOW 1: INVOICE UTTERANCE PARSER (WITH PROTECTED CONJUNCTIONS & NEGATION) ───

export function parseInvoiceUtterance(rawUtterance = '', customers = [], products = []) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const text = normalizeSpokenText(rawUtterance);
  const intent = detectIntent(text);

  // Cancellation / Negation Guard
  if (intent === 'UNKNOWN' || intent === 'CANCEL') {
    const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
    recordTelemetryInvocation(intent, duration, 0, 0);
    return {
      rawUtterance,
      normalizedText: text,
      intent: 'UNKNOWN',
      cancelled: true,
      customer: null,
      customerConfidence: 0,
      discountAmount: 0,
      items: [],
      hasItems: false,
      message: 'Invoice creation cancelled by user negation directive.'
    };
  }

  // 1. Extract Customer
  const custRes = extractCustomer(text, customers);

  // 2. Extract Invoice-Level Discount (Prefix or Suffix notation)
  let discountAmount = 0;
  let discountSnippet = '';
  const discountMatch1 = text.match(/(?:discount|minus|less|off)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*(?:rupees|rs)?/i);
  const discountMatch2 = text.match(/\b(\d+(?:\.\d+)?)\s*(?:rupees|rs)?\s*(?:discount|less|off)\b/i);

  if (discountMatch1) {
    discountAmount = parseFloat(discountMatch1[1]) || 0;
    discountSnippet = discountMatch1[0];
  } else if (discountMatch2) {
    discountAmount = parseFloat(discountMatch2[1]) || 0;
    discountSnippet = discountMatch2[0];
  }

  // 3. Shield non-item entities and remove metadata
  let itemsPhrase = text;

  // Shield phone numbers (e.g. "phone 8686862343" or raw 10-digit phone)
  const phoneMatch = itemsPhrase.match(/\b(?:phone|mobile|call|number)?\s*([6-9]\d{9})\b/i);
  if (phoneMatch) {
    itemsPhrase = itemsPhrase.replace(phoneMatch[0], ' ');
  }

  // Shield credit limit & opening balance
  itemsPhrase = itemsPhrase.replace(/\b(?:credit limit|credit|limit)\s*(?:of\s*)?\d+(?:\.\d+)?\b/gi, ' ');
  itemsPhrase = itemsPhrase.replace(/\b(?:opening balance|old balance|balance|due)\s*(?:of\s*)?\d+(?:\.\d+)?\b/gi, ' ');

  // Remove customer snippet and tokens
  if (custRes.matchedSnippet) {
    itemsPhrase = itemsPhrase.replace(new RegExp(custRes.matchedSnippet.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'), ' ');
    for (const tok of custRes.matchedSnippet.split(/\s+/)) {
      if (tok.length >= 2) {
        itemsPhrase = itemsPhrase.replace(new RegExp(`\\b${tok}\\b`, 'gi'), ' ');
      }
    }
  }
  if (custRes.customer) {
    const cTokens = `${custRes.customer.business_name || ''} ${custRes.customer.city || ''} ${custRes.customer.contact_person || ''}`
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length >= 2);
    for (const tok of cTokens) {
      if (!['pizza', 'burger', 'chicken', 'french', 'fries', 'delight', 'box'].includes(tok)) {
        itemsPhrase = itemsPhrase.replace(new RegExp(`\\b${tok}\\b`, 'gi'), ' ');
      }
    }
  }

  // Remove discount snippet
  if (discountSnippet) {
    itemsPhrase = itemsPhrase.replace(discountSnippet, ' ');
  }

  // Remove double negation directives (e.g. "do not cancel the invoice for ...")
  itemsPhrase = itemsPhrase.replace(/\b(?:do not|don't|dont|never)\s+(?:cancel|abort|discard|stop)\s*(?:the|this|an|a)?\b/gi, ' ');

  // Filter spoken corrections: e.g. "10 packets veg momos no wait make it 5" -> "5 packets veg momos"
  itemsPhrase = itemsPhrase.replace(/(\d+(?:\.\d+)?)\s+((?:packets?|boxes?|bottles?|kgs?|pcs|pieces)?\s*[a-z\s]+?)\s+(?:no wait|wait|sorry|actually)\s+(?:make it|make that|change to|make)\s+(\d+(?:\.\d+)?)/gi, (m, oldQty, itemPart, newQty) => `${newQty} ${itemPart}`);

  // Filter corrections: remove "not <qty>" or "instead of <qty>"
  itemsPhrase = itemsPhrase.replace(/\b(?:not|instead of|rather than|and not)\s+\d+(?:\.\d+)?(?:\s*[a-z]+)?\b/gi, ' ');

  // Remove Telugu action verbs & postposition particles
  itemsPhrase = itemsPhrase.replace(/\b(bill cheyyi|bill chey|bill kottu|bill pettu|invoice cheyyi|invoice chey|ivvali|kavali|kavale|pettandi|veymandi|vei|kosam|gari|ki|ku)\b/gi, ' ');

  // Remove invoice action verbs
  itemsPhrase = itemsPhrase.replace(/\b(create bill|create invoice|bill for|invoice for|bill to|bill|invoice|for|please|to|add|the)\b/gi, ' ');

  // 4. Protect multi-word catalogue products that contain 'and' or '&'
  const protectedMap = [];
  let maskedPhrase = itemsPhrase;

  if (Array.isArray(products)) {
    for (const p of products) {
      const pName = (p.name || '').toLowerCase();
      if (/\b(?:and|&)\b/i.test(pName)) {
        const targetPhrase = pName.includes('lime and mint') ? 'lime and mint' : pName;
        if (maskedPhrase.toLowerCase().includes(targetPhrase)) {
          const placeholder = `__PROTECTED_PROD_${protectedMap.length}__`;
          protectedMap.push({ placeholder, original: targetPhrase });
          maskedPhrase = maskedPhrase.replace(new RegExp(targetPhrase, 'gi'), placeholder);
        }
      }
    }
  }

  // Also protect generic 'lime and mint'
  if (maskedPhrase.toLowerCase().includes('lime and mint')) {
    const placeholder = `__PROTECTED_PROD_${protectedMap.length}__`;
    protectedMap.push({ placeholder, original: 'lime and mint' });
    maskedPhrase = maskedPhrase.replace(/lime and mint/gi, placeholder);
  }

  // Split items by conjunctions ("and", "also", "plus", ",")
  const rawSegments = maskedPhrase.split(/\b(?:and|also|plus|,)\b/gi).map(s => s.trim()).filter(Boolean);

  const parsedItems = [];

  for (let seg of rawSegments) {
    // Restore protected products
    for (const prot of protectedMap) {
      seg = seg.replace(new RegExp(prot.placeholder, 'gi'), prot.original);
    }

    // Extract price qualifier per item (e.g. "at 100 rupees" or "rate 100")
    let customPrice = null;
    const priceMatch = seg.match(/\b(?:at|@|rate|price|rs|rupees)\s+(\d+(?:\.\d+)?)\s*(?:rupees|rs)?\b/i) 
      || seg.match(/\b(\d+(?:\.\d+)?)\s*(?:rupees|rs)\b/i);
    if (priceMatch) {
      customPrice = parseFloat(priceMatch[1]);
      seg = seg.replace(priceMatch[0], ' ');
    }

    let qty = 1;
    let unit = 'PKT';
    let prodQuery = seg;
    let invalidQuantity = false;

    // Pattern A: Leading count [quantity] [unit]? [product name]
    // Guard: ignore dimension units like mm, cm, inch, gram, ml from being captured as count units
    const qtyMatch = seg.match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?\s+(.*)$/i);
    const countUnitMatch = seg.match(/(?:^|\b)(\d+(?:\.\d+)?)\s*(packet|packets|pkt|pkts|box|boxes|bottle|bottles|kg|kgs|kilo|kilos|piece|pieces|pcs|nos|plate|plates|carton|cartons)\b\s*(.*)$/i);

    if (qtyMatch && !['mm', 'cm', 'inch', 'inches', 'gram', 'grams', 'gm', 'g', 'ml'].includes((qtyMatch[2] || '').toLowerCase())) {
      const parsedQ = parseFloat(qtyMatch[1]);
      if (isNaN(parsedQ) || parsedQ <= 0) {
        qty = 0;
        invalidQuantity = true;
      } else {
        qty = parsedQ;
      }
      const possibleUnit = (qtyMatch[2] || '').toLowerCase();
      if (UNIT_SYNONYMS[possibleUnit]) {
        unit = UNIT_SYNONYMS[possibleUnit];
        prodQuery = qtyMatch[3].trim();
      } else {
        prodQuery = `${qtyMatch[2] || ''} ${qtyMatch[3] || ''}`.trim();
      }
    } else if (countUnitMatch) {
      // Pattern B: Count unit anywhere in segment (handles unstripped leading customer remnants or filler words)
      const parsedQ = parseFloat(countUnitMatch[1]);
      if (isNaN(parsedQ) || parsedQ <= 0) {
        qty = 0;
        invalidQuantity = true;
      } else {
        qty = parsedQ;
      }
      const possibleUnit = (countUnitMatch[2] || '').toLowerCase();
      if (UNIT_SYNONYMS[possibleUnit]) {
        unit = UNIT_SYNONYMS[possibleUnit];
      }
      prodQuery = countUnitMatch[3].trim();
    } else {
      // Pattern C: Trailing quantity [product name] [quantity]
      const trailingQtyMatch = seg.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s*([a-z]+)?$/i);
      if (trailingQtyMatch && !['mm', 'cm', 'inch', 'inches', 'gram', 'grams', 'gm', 'g', 'ml'].includes((trailingQtyMatch[3] || '').toLowerCase())) {
        prodQuery = trailingQtyMatch[1].trim();
        const parsedQ = parseFloat(trailingQtyMatch[2]);
        if (isNaN(parsedQ) || parsedQ <= 0) {
          qty = 0;
          invalidQuantity = true;
        } else {
          qty = parsedQ;
        }
        const possibleUnit = (trailingQtyMatch[3] || '').toLowerCase();
        if (UNIT_SYNONYMS[possibleUnit]) {
          unit = UNIT_SYNONYMS[possibleUnit];
        }
      }
    }

    if (prodQuery.length >= 2) {
      const matchRes = matchProductToCatalogue(prodQuery, products);
      const basePrice = parseFloat(matchRes.product?.base_price || 0);
      const finalPrice = (customPrice !== null && customPrice > 0) ? customPrice : basePrice;

      if (matchRes.product) {
        parsedItems.push({
          rawSegment: seg,
          query: prodQuery,
          product_id: matchRes.product.id,
          product_name: matchRes.product.name,
          brand: matchRes.product.brand,
          sku: matchRes.product.sku,
          packaging_unit: matchRes.product.packaging_unit || unit,
          unit_price: finalPrice,
          isPriceOverridden: customPrice !== null && customPrice > 0,
          quantity: qty,
          invalidQuantity: invalidQuantity || qty <= 0,
          discount_rate: 0,
          confidence: matchRes.score,
          isAmbiguous: matchRes.isAmbiguous,
          alternatives: matchRes.alternatives
        });
      } else {
        parsedItems.push({
          rawSegment: seg,
          query: prodQuery,
          product_id: '',
          product_name: `[Unmatched: "${prodQuery}"]`,
          quantity: qty,
          invalidQuantity: invalidQuantity || qty <= 0,
          unit_price: finalPrice,
          isPriceOverridden: customPrice !== null && customPrice > 0,
          discount_rate: 0,
          confidence: 0,
          isAmbiguous: false,
          alternatives: []
        });
      }
    }
  }

  const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
  const resolvedCount = parsedItems.filter(i => Boolean(i.product_id) && !i.isAmbiguous).length;
  const ambiguousCount = parsedItems.filter(i => Boolean(i.isAmbiguous)).length;
  recordTelemetryInvocation('INVOICE', duration, resolvedCount, ambiguousCount);

  return {
    rawUtterance,
    normalizedText: text,
    intent: 'INVOICE',
    customer: custRes.customer,
    customerConfidence: custRes.confidence,
    discountAmount,
    items: parsedItems,
    hasItems: parsedItems.length > 0,
    hasInvalidQuantity: parsedItems.some(i => i.invalidQuantity)
  };
}

// ─── 7. WORKFLOW 2: CUSTOMER ONBOARDING PARSER ───

export function parseCustomerUtterance(rawUtterance = '') {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const text = normalizeSpokenText(rawUtterance);
  const intent = detectIntent(text);

  if (intent === 'UNKNOWN' || intent === 'CANCEL') {
    const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
    recordTelemetryInvocation(intent, duration, 0, 0);
    return {
      rawUtterance,
      normalizedText: text,
      intent: 'UNKNOWN',
      cancelled: true,
      business_name: '',
      contact_person: '',
      phone: '',
      message: 'Customer onboarding cancelled by user negation directive.'
    };
  }

  // Phone extraction: supports contiguous 10 digits or spaced digit groups
  let phone = '';
  const phoneGroupMatch = text.match(/(?:phone|mobile|number)?\s*([6-9][\d\s-]{8,18}\d)/i);
  if (phoneGroupMatch) {
    const stripped = phoneGroupMatch[1].replace(/[\s-]+/g, '');
    if (stripped.length === 10 && /^[6-9]\d{9}$/.test(stripped)) {
      phone = stripped;
    }
  }
  if (!phone) {
    const rawMatch = text.match(/\b([6-9]\d{9})\b/);
    if (rawMatch) phone = rawMatch[1];
  }

  let creditLimit = '25000';
  const creditMatch = text.match(/(?:credit limit|credit|limit)\s*(?:of\s*)?(\d+)/i);
  if (creditMatch) {
    creditLimit = creditMatch[1];
  }

  let openingBalance = '0';
  const balanceMatch = text.match(/(?:opening balance|old balance|balance|due)\s*(?:of\s*)?(\d+)/i);
  if (balanceMatch) {
    openingBalance = balanceMatch[1];
  }

  let city = 'Rayachoty';
  const cityMatch = text.match(/(?:city|town|at|in)\s+([a-z\s]+?)(?=\s+(?:credit|limit|phone|contact|balance|$))/i);
  if (cityMatch) {
    const candidateCity = cityMatch[1].trim();
    if (candidateCity.length > 2) {
      city = candidateCity.charAt(0).toUpperCase() + candidateCity.slice(1);
    }
  }

  let contactPerson = '';
  const contactMatch = text.match(/(?:contact person|contact|owner|manager|mr|shaik)\s+(?:is\s+)?([a-z\s]+?)(?=\s+(?:phone|mobile|city|credit|limit|balance|$))/i);
  if (contactMatch) {
    contactPerson = contactMatch[1].trim();
  }

  let businessName = '';
  let bNameSnippet = text;
  if (phoneGroupMatch) bNameSnippet = bNameSnippet.replace(phoneGroupMatch[0], '');
  if (creditMatch) bNameSnippet = bNameSnippet.replace(creditMatch[0], '');
  if (balanceMatch) bNameSnippet = bNameSnippet.replace(balanceMatch[0], '');
  if (cityMatch) bNameSnippet = bNameSnippet.replace(cityMatch[0], '');
  if (contactMatch) bNameSnippet = bNameSnippet.replace(contactMatch[0], '');
  
  bNameSnippet = bNameSnippet.replace(/\b(new customer|add customer|register customer|create customer|customer|onboard)\b/gi, '').trim();

  const bTokens = bNameSnippet.split(/\s+/).filter(Boolean);
  if (bTokens.length > 0) {
    businessName = bTokens.map(w => 
      w.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('-')
    ).join(' ');
  }

  const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
  recordTelemetryInvocation('CUSTOMER', duration, businessName ? 1 : 0, 0);

  return {
    rawUtterance,
    normalizedText: text,
    business_name: businessName,
    contact_person: contactPerson ? contactPerson.charAt(0).toUpperCase() + contactPerson.slice(1) : businessName,
    phone,
    city,
    state: 'Andhra Pradesh',
    pincode: '516269',
    credit_limit: creditLimit,
    opening_balance: openingBalance,
    address_line1: `${city}, Rayachoty`
  };
}

// ─── 8. WORKFLOW 3: INVENTORY OPERATIONS PARSER ───

export function parseInventoryUtterance(rawUtterance = '', products = []) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const text = normalizeSpokenText(rawUtterance);
  const intent = detectIntent(text);

  if (intent === 'UNKNOWN' || intent === 'CANCEL') {
    const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
    recordTelemetryInvocation(intent, duration, 0, 0);
    return {
      rawUtterance,
      normalizedText: text,
      intent: 'UNKNOWN',
      cancelled: true,
      product: null,
      quantity: 0,
      message: 'Inventory operation cancelled by user negation instruction.'
    };
  }

  // Extract quantity with count unit priority
  let quantity = 1;
  let invalidQuantity = false;
  let matchedQtySubstring = '';
  const qtyUnitMatch = text.match(/\b(\d+(?:\.\d+)?)\s*(packet|packets|pkt|box|boxes|can|cans|kg|nos|piece|pieces|unit|units)\b/i);
  if (qtyUnitMatch) {
    const parsedQ = parseFloat(qtyUnitMatch[1]);
    if (isNaN(parsedQ) || parsedQ <= 0) {
      quantity = 0;
      invalidQuantity = true;
    } else {
      quantity = parsedQ;
    }
    matchedQtySubstring = qtyUnitMatch[0];
  } else {
    const genericQtyMatch = text.match(/\b(\d+(?:\.\d+)?)(?!\s*(?:mm|cm|inch|inches|"|gm|g))\b/i);
    if (genericQtyMatch) {
      const parsedQ = parseFloat(genericQtyMatch[1]);
      if (isNaN(parsedQ) || parsedQ <= 0) {
        quantity = 0;
        invalidQuantity = true;
      } else {
        quantity = parsedQ;
      }
      matchedQtySubstring = genericQtyMatch[0];
    }
  }

  let reason = 'DAMAGED';
  for (const [key, val] of Object.entries(ADJUSTMENT_REASONS)) {
    if (text.includes(key)) {
      reason = val;
      break;
    }
  }

  let purchaseCost = null;
  const costMatch = text.match(/(?:cost|rate|purchase cost|price)\s*(?:is\s*)?(\d+(?:\.\d+)?)/i);
  if (costMatch) {
    purchaseCost = parseFloat(costMatch[1]) || null;
  }

  let supplier = null;
  const suppMatch = text.match(/(?:from|supplier|vendor)\s+([a-z\s]+?)(?=\s+(?:cost|rate|quantity|lot|$))/i);
  if (suppMatch) {
    supplier = suppMatch[1].trim().toUpperCase();
  }

  let prodQuery = text
    .replace(/\b(damage|damaged|breakage|expired|expiry|wastage|adjust stock|received|inward|receive stock)\b/gi, '')
    .replace(/\b(from\s+[a-z\s]+)\b/gi, '');

  if (costMatch) {
    prodQuery = prodQuery.replace(costMatch[0], '');
  }
  if (matchedQtySubstring) {
    prodQuery = prodQuery.replace(matchedQtySubstring, '');
  }
  prodQuery = prodQuery.trim();

  const matchRes = matchProductToCatalogue(prodQuery, products);

  const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
  const isResolved = Boolean(matchRes.product) && !matchRes.isAmbiguous;
  recordTelemetryInvocation(intent, duration, isResolved ? 1 : 0, matchRes.isAmbiguous ? 1 : 0);

  return {
    rawUtterance,
    intent,
    product: matchRes.product,
    productConfidence: matchRes.score,
    isAmbiguous: matchRes.isAmbiguous,
    alternatives: matchRes.alternatives,
    quantity,
    invalidQuantity,
    reason,
    purchaseCost,
    supplier: supplier || 'SUPPLIER',
    notes: `Voice recorded: "${rawUtterance}"`
  };
}
