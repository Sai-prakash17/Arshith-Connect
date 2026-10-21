import React from 'react';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PageHeader({ title, subtitle, breadcrumb = [], showBack = false, actionButton = null }) {
  const navigate = useNavigate();

  return (
    <div className="page-header" style={{ marginBottom: '24px' }}>
      {breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b', marginBottom: '8px' }}>
          {breadcrumb.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {crumb.path ? (
                <button
                  type="button"
                  onClick={() => navigate(crumb.path)}
                  style={{ color: '#0b3d2b', fontWeight: '500', textDecoration: 'none', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                >
                  {crumb.label}
                </button>
              ) : (
                <span style={{ color: '#94a3b8' }}>{crumb.label}</span>
              )}
              {idx < breadcrumb.length - 1 && <ChevronRight size={13} style={{ color: '#94a3b8' }} />}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {showBack && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1e293b',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
              title="Go back"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '700', color: '#0b3d2b', margin: 0, letterSpacing: '-0.3px' }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '2px', margin: 0 }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actionButton && <div>{actionButton}</div>}
      </div>
    </div>
  );
}
