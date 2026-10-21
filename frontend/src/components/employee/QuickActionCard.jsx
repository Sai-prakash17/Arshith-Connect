import React from 'react';

export default function QuickActionCard({ title, icon: Icon, iconBg, iconColor, onClick }) {
  return (
    <button
      type="button"
      className="quick-action-card"
      onClick={onClick}
    >
      <div
        className="action-card-icon"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        <Icon size={22} strokeWidth={2.2} />
      </div>
      <span className="action-card-title">{title}</span>
    </button>
  );
}
