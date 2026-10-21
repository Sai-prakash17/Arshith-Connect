import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function AdminManagementCard({
  title,
  description,
  icon: Icon,
  colorScheme = 'green', // 'green' | 'orange' | 'blue'
  onClick
}) {
  return (
    <div
      className="management-nav-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="management-card-content">
        <div className={`mgmt-circle-icon ${colorScheme}`}>
          <Icon size={24} strokeWidth={2.3} />
        </div>
        <div>
          <div className="mgmt-card-title">{title}</div>
          <div className="mgmt-card-desc">{description}</div>
        </div>
      </div>
      <div className="mgmt-card-arrow">
        <ChevronRight size={20} />
      </div>
    </div>
  );
}
