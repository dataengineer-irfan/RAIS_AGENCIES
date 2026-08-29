import React from 'react';

export const StatusBadge = ({ status, type = 'invoice' }) => {
  const s = (status || '').toUpperCase();
  
  let colorClass = 'bg-slate-800 text-slate-300 border-slate-700';

  if (['PAID', 'ACTIVE', 'ACCEPTED', 'DELIVERED', 'SUCCESS'].includes(s)) {
    colorClass = 'bg-emerald-950/70 text-emerald-400 border-emerald-800/80';
  } else if (['PARTIALLY_PAID', 'PENDING', 'CONFIRMED'].includes(s)) {
    colorClass = 'bg-amber-950/70 text-amber-400 border-amber-800/80';
  } else if (['ISSUED'].includes(s)) {
    colorClass = 'bg-blue-950/70 text-blue-400 border-blue-800/80';
  } else if (['OVERDUE', 'REJECTED', 'CANCELLED', 'VOID', 'SUSPENDED'].includes(s)) {
    colorClass = 'bg-rose-950/70 text-rose-400 border-rose-800/80';
  } else if (['DRAFT'].includes(s)) {
    colorClass = 'bg-slate-800/90 text-slate-400 border-slate-700';
  }

  const formatText = (str) => str.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${colorClass}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80"></span>
      {formatText(s)}
    </span>
  );
};
