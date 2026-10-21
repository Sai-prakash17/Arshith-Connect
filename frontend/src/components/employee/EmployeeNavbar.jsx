import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import BrandLogo from '../common/BrandLogo';

/**
 * EmployeeNavbar - Top application header for the Employee Portal
 * Matches the reference design in Screenshot 4.
 */
export default function EmployeeNavbar({ onOpenDrawer }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('arshith_role');
    localStorage.removeItem('arshith_user');
    localStorage.removeItem('arshith_auth_token');
    navigate('/login', { replace: true });
  };

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('arshith_user')) || null;
    } catch {
      return null;
    }
  })();
  const employeeName = storedUser?.name || 'Employee';
  const employeeId = storedUser?.employeeId || 'AFI-001';

  return (
    <header className="employee-top-navbar portal-navbar">
      {/* Left: Stepped Mint Hamburger Toggle Button matching Screenshot 4 */}
      <div className="portal-nav-left">
        <button
          type="button"
          className="employee-hamburger-btn"
          onClick={onOpenDrawer}
          aria-label="Open employee navigation menu"
          title="Open Menu"
        >
          <span className="employee-hamburger-line line-1" />
          <span className="employee-hamburger-line line-2" />
          <span className="employee-hamburger-line line-3" />
        </button>
      </div>

      {/* Center: ARSHITH Connect Logo matching Screenshot 4 */}
      <div
        className="employee-navbar-logo"
        style={{ cursor: 'pointer' }}
        onClick={() => navigate('/employee/dashboard')}
        title="Arshith Connect Employee Portal"
      >
        <BrandLogo size="medium" />
      </div>

      {/* Right: User Avatar & Logout Button matching Screenshot 4 */}
      <div className="portal-nav-right">
        <div
          className="user-profile-badge"
          onClick={() => navigate('/employee/profile')}
          style={{ cursor: 'pointer' }}
          title={`${employeeName} (${employeeId}) - View Profile`}
        >
          <div className="user-avatar" style={{ backgroundColor: '#0b3d2b' }}>
            {employeeName.charAt(0).toUpperCase()}
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="employee-logout-btn"
          title="Sign out of employee session"
          aria-label="Log Out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
