/**
 * RAIS AGENCIES - Local Date & Timezone Utilities
 * Standardizes local calendar date formatting (YYYY-MM-DD) across all modals and slicers,
 * strictly preventing UTC-offset rollbacks (e.g. UTC shifting 12:00 AM - 5:30 AM IST to yesterday).
 */

export const getLocalDateString = (d = new Date()) => {
  if (!d) return '';
  const dateObj = typeof d === 'string' ? (d.includes('T') ? new Date(d) : new Date(d + 'T00:00:00')) : d;
  if (isNaN(dateObj.getTime())) return '';
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getStartOfWeekString = (d = new Date()) => {
  const dateObj = new Date(d);
  const dayOfWeek = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1; // Monday = 0
  dateObj.setDate(dateObj.getDate() - dayOfWeek);
  return getLocalDateString(dateObj);
};

export const getYesterdayString = (d = new Date()) => {
  const dateObj = new Date(d);
  dateObj.setDate(dateObj.getDate() - 1);
  return getLocalDateString(dateObj);
};

export const getISTDateString = (dateVal) => {
  if (!dateVal) return '';
  let str = String(dateVal);
  if (typeof str === 'string' && str.includes('T') && !str.endsWith('Z') && !str.includes('+') && !str.includes('-0')) {
    str += 'Z';
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

export const formatToIST = (dateVal, options = { dateStyle: 'medium', timeStyle: 'short' }) => {
  if (!dateVal) return '-';
  let str = String(dateVal);
  if (typeof str === 'string' && str.includes('T') && !str.endsWith('Z') && !str.includes('+') && !str.includes('-0')) {
    str += 'Z';
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', ...options });
};
