import React from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * ManagementCard - Reusable Dashboard Module Navigation Card
 * Displays module icon with colored badge, title, subtitle, and navigation chevron.
 */
export default function ManagementCard({
  title,
  description,
  icon: Icon,
  colorScheme = 'green',
  onClick,
  badgeText,
}) {
  return (
    <div
      className="management-card"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick && onClick();
        }
      }}
      aria-label={`Open ${title}`}
    >
      <div className={`management-card-icon icon-${colorScheme}`}>
        {Icon && <Icon size={20} />}
      </div>

      <div className="management-card-content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="management-card-title">{title}</h3>
          {badgeText && (
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: '700',
                padding: '2px 7px',
                borderRadius: '999px',
                backgroundColor: '#ecfdf5',
                color: '#047857',
              }}
            >
              {badgeText}
            </span>
          )}
        </div>
        <p className="management-card-desc">{description}</p>
      </div>

      <ChevronRight size={18} className="management-card-arrow" />
    </div>
  );
}
