/**
 * Mobile Safe Helper Utilities for RAIS Agencies
 * Resilient to Capacitor WebView limitations, missing permissions, and popup blockers.
 */

/**
 * Universal safe copy to clipboard.
 * Works across desktop browsers, mobile WebViews, and restricted environments.
 * Returns true if copied successfully, false otherwise (never throws).
 */
export const copyToClipboard = async (text) => {
  if (text === null || text === undefined) return false;
  const content = typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text);

  // 1. Try modern async Clipboard API if available
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(content);
      return true;
    }
  } catch (err) {
    console.warn('Clipboard writeText failed or permission denied, using textarea fallback:', err);
  }

  // 2. Legacy fallback using invisible textarea + execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = content;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return Boolean(successful);
  } catch (fallbackErr) {
    console.warn('Fallback clipboard copy failed:', fallbackErr);
    return false;
  }
};

/**
 * Universal safe WhatsApp launcher.
 * Handles phone formatting (+91), URI encoding, and WebView popups.
 */
export const openWhatsApp = (phone, text) => {
  try {
    const rawText = text || '';
    const encoded = encodeURIComponent(rawText);
    const cleanPhone = (phone || '').toString().replace(/[^0-9]/g, '');

    let url = `https://api.whatsapp.com/send?text=${encoded}`;
    if (cleanPhone.length >= 10) {
      // If 10 digits (standard Indian mobile), prepend 91
      const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      url = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encoded}`;
    }

    // Try window.open first
    const win = window.open(url, '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      // If popup was blocked or WebView ignores window.open, navigate directly
      window.location.href = url;
    }
  } catch (err) {
    console.error('Error opening WhatsApp:', err);
  }
};

/**
 * Safely opens an external or print URL.
 */
export const openExternalUrl = (url) => {
  if (!url) return;
  try {
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.location.href = url;
    }
  } catch (err) {
    console.warn('openExternalUrl failed, using location.href:', err);
    window.location.href = url;
  }
};
