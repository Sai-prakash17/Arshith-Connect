import React from 'react';
import { SearchX } from 'lucide-react';

export default function EmptyState({
  title = 'No records found',
  description = 'Try adjusting your search query or filter options to find what you are looking for.',
  action = null
}) {
  return (
    <div
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px dashed #cbd5e1',
        margin: '16px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          backgroundColor: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          marginBottom: '14px'
        }}
      >
        <SearchX size={26} />
      </div>
      <h3 style={{ fontSize: '1.05rem', fontWeight: '600', color: '#1e293b', margin: '0 0 6px 0' }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '420px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
