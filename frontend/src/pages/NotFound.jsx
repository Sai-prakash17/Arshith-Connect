import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft, Home } from 'lucide-react';
import BrandLogo from '../components/common/BrandLogo';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        backgroundColor: '#f6f7fb',
        textAlign: 'center'
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <BrandLogo size="medium" />
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '40px 32px',
          maxWidth: '440px',
          width: '100%',
          boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0'
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: '#ecfdf5',
            color: '#047857',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}
        >
          <Compass size={32} />
        </div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0b3d2b', margin: '0 0 6px 0' }}>
          404
        </h1>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>
          Page Not Found
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '24px' }}>
          The page or portal route you requested does not exist or has been relocated.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            className="btn-primary-purple"
            style={{ width: '100%', height: '44px' }}
            onClick={() => navigate('/login')}
          >
            <Home size={16} />
            <span>Go to Employee Portal</span>
          </button>
          <button
            type="button"
            className="btn-secondary-gray"
            style={{ width: '100%', height: '44px' }}
            onClick={() => navigate('/admin/login')}
          >
            <span>Go to Admin Portal</span>
          </button>
        </div>
      </div>
    </div>
  );
}
