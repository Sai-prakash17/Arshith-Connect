import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import BrandLogo from '../common/BrandLogo';

export default function AdminNavbar({ onToggleSidebar }) {
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    localStorage.removeItem('arshith_role');
    localStorage.removeItem('arshith_user');
    navigate('/admin/login');
  }, [navigate]);

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('arshith_user')) || null;
    } catch {
      return null;
    }
  })();
  const adminName = storedUser?.name || 'Administrator';
  const adminEmail = storedUser?.email || 'admin@arshith.com';

  return (
    <header className="portal-navbar">
      <div className="portal-nav-left">
        <button
          type="button"
          className="nav-hamburger-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle admin navigation menu"
          title="Toggle Navigation Menu"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </div>

      <div
        style={{ cursor: 'pointer' }}
        onClick={() => navigate('/admin/dashboard')}
        title="Arshith Connect Admin Portal"
      >
        <BrandLogo size="medium" />
      </div>

      <div className="portal-nav-right">
        <div className="user-profile-badge" title={`${adminName} (${adminEmail})`}>
          <div className="user-avatar" style={{ backgroundColor: '#0b3d2b' }}>
            {adminName.charAt(0).toUpperCase()}
          </div>
          <div className="user-info-text">
            <div className="user-name">{adminName}</div>
            <div className="user-role">Admin</div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            padding: '7px 11px',
            borderRadius: '8px',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            fontSize: '0.8rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease'
          }}
          title="Sign out of Administrator session"
        >
          <LogOut size={14} />
          <span className="navbar-logout-text">Logout</span>
        </button>
      </div>
    </header>
  );
}
