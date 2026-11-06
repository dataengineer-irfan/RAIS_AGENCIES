/**
 * Global Real-Time Event Bus for RAIS Agencies Telemetry & Live Updates.
 * Allows instant, cross-component reactive updates whenever an invoice, payment,
 * customer, or inventory transaction takes place.
 */

export const emitDataUpdated = (type = 'generic', detail = {}) => {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('rais:data-updated', {
          detail: {
            type,
            timestamp: Date.now(),
            ...detail
          }
        })
      );
    } catch (e) {
      // Guard against non-browser environments
    }
  }
};
