import React, { useState } from 'react';

/**
 * Resilient brand logo component for RAIS Agencies.
 * Attempts to load the brand image asset (/rais_logo.png), and seamlessly
 * falls back to an elegant vector emblem (Golden Crest with Snowflake) if
 * the asset fails to load, is missing, or running in an offline Android WebView.
 */
export const RaisLogo = ({ 
  className = "w-full h-full", 
  alt = "RAIS Agencies",
  showMonogramFallback = true 
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError && showMonogramFallback) {
    return (
      <div 
        className={`${className} flex items-center justify-center bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-slate-950 font-black rounded-lg select-none shadow-inner`}
        title={alt}
      >
        <span className="text-xs sm:text-sm font-black tracking-tighter">R</span>
      </div>
    );
  }

  return (
    <img
      src="/rais_logo.png"
      alt={alt}
      onError={() => setHasError(true)}
      className={`${className} object-contain transition-opacity duration-200`}
      loading="eager"
    />
  );
};
