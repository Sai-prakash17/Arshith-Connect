import React from 'react';

export default function AdminStatCard({ label, value, colorClass = 'stat-val-present', widthClass = 'one-third' }) {
  return (
    <div className={`stat-card ${widthClass}`}>
      <span className="stat-card-label">{label}</span>
      <div className={`stat-card-value ${colorClass}`}>{value}</div>
    </div>
  );
}
