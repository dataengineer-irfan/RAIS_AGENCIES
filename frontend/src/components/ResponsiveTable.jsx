import React from 'react';

/**
 * ResponsiveTable Wrapper
 * Automatically renders a clean table on desktop and touch-friendly card list on mobile screens (< 768px).
 */
export const ResponsiveTable = ({ 
  columns = [], 
  data = [], 
  renderMobileCard, 
  keyField = 'id',
  emptyMessage = 'No records found.'
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
        <p className="text-xs font-semibold">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {/* 1. DESKTOP VIEW (md:block hidden) */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/40">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px] bg-slate-900/60">
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  className={`p-3.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {data.map((row, rowIdx) => (
              <tr key={row[keyField] || rowIdx} className="hover:bg-slate-800/40 transition-colors">
                {columns.map((col, colIdx) => (
                  <td 
                    key={colIdx} 
                    className={`p-3.5 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                  >
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 2. MOBILE VIEW (block md:hidden) */}
      <div className="block md:hidden space-y-3">
        {data.map((row, rowIdx) => (
          <div 
            key={row[keyField] || rowIdx} 
            className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md"
          >
            {renderMobileCard ? (
              renderMobileCard(row)
            ) : (
              <div className="space-y-2 text-xs">
                {columns.map((col, colIdx) => (
                  <div key={colIdx} className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">{col.header}:</span>
                    <span className="font-semibold text-white">
                      {col.render ? col.render(row) : row[col.accessor]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
};
