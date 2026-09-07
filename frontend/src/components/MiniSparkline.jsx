import React from 'react';

/**
 * MiniSparkline - Zero-dependency SVG micro-trendline for enterprise dashboards.
 * Renders a smooth 7-point trend line with optional subtle gradient fill.
 */
export const MiniSparkline = ({ 
  data = [40, 45, 38, 55, 62, 58, 70], 
  color = 'amber', 
  width = 68, 
  height = 22,
  className = '' 
}) => {
  const points = (data && data.length > 0) ? data : [10, 10];
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min === 0 ? 1 : max - min;

  const colorMap = {
    amber: {
      stroke: '#fbbf24', // amber-400
      fill: 'rgba(251, 191, 36, 0.15)',
      gradientId: 'grad-amber'
    },
    emerald: {
      stroke: '#34d399', // emerald-400
      fill: 'rgba(52, 211, 153, 0.15)',
      gradientId: 'grad-emerald'
    },
    rose: {
      stroke: '#fb7185', // rose-400
      fill: 'rgba(251, 113, 133, 0.15)',
      gradientId: 'grad-rose'
    },
    blue: {
      stroke: '#60a5fa', // blue-400
      fill: 'rgba(96, 165, 250, 0.15)',
      gradientId: 'grad-blue'
    }
  };

  const scheme = colorMap[color] || colorMap.amber;

  const padding = 2;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  const coords = points.map((val, idx) => {
    const x = padding + (idx / Math.max(1, points.length - 1)) * usableWidth;
    const y = height - padding - ((val - min) / range) * usableHeight;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  const linePath = coords.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  const lastPt = coords[coords.length - 1] || { x: usableWidth, y: usableHeight };
  const firstPt = coords[0] || { x: padding, y: usableHeight };
  const areaPath = `${linePath} L ${lastPt.x},${height - padding} L ${firstPt.x},${height - padding} Z`;

  return (
    <svg 
      width={width} 
      height={height} 
      className={`overflow-visible shrink-0 ${className}`}
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        <linearGradient id={scheme.gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={scheme.stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={scheme.stroke} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path 
        d={areaPath} 
        fill={`url(#${scheme.gradientId})`} 
      />
      <path 
        d={linePath} 
        fill="none" 
        stroke={scheme.stroke} 
        strokeWidth="1.75" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {coords.length > 0 && (
        <circle 
          cx={coords[coords.length - 1].x} 
          cy={coords[coords.length - 1].y} 
          r="2" 
          fill={scheme.stroke} 
        />
      )}
    </svg>
  );
};
