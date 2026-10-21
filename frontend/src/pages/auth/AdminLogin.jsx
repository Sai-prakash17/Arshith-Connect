import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import BrandLogo from '../../components/common/BrandLogo';
import { authService } from '../../services/authService';
import '../../styles/auth.css';

export default function AdminLogin() {
  const navigate = useNavigate();

  // If already authenticated as admin, redirect directly to admin dashboard
  useEffect(() => {
    const role = localStorage.getItem('arshith_role');
    const user = localStorage.getItem('arshith_user');
    const token = localStorage.getItem('arshith_auth_token');
    if (role === 'admin' && user && token) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  // Admin credentials initialization: default to designated admin email with empty password
  const [formData, setFormData] = useState({
    email: 'admin@arshith.com',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Admin email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (!validate()) return;

    setIsLoading(true);
    setErrors((prev) => ({ ...prev, form: '' }));
    try {
      await authService.adminLogin({
        email: formData.email,
        password: formData.password,
      });
      navigate('/admin/dashboard');
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        form: err.message || 'Invalid administrator credentials',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-container animate-fade-in">
        {/* Top Brand Logo */}
        <div className="auth-header">
          <BrandLogo size="compact" />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <h1 className="auth-card-title" style={{ fontSize: '1.35rem', marginBottom: '2px' }}>
            Admin Login
          </h1>
          <p className="auth-card-desc" style={{ marginBottom: 0 }}>
            Secure administration portal
          </p>
        </div>

        {/* Admin Login Card */}
        <div className="auth-card">
          <form onSubmit={handleSubmit} noValidate>
            {errors.form && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  lineHeight: '1.45',
                  marginBottom: '16px',
                  textAlign: 'center',
                  fontWeight: '500',
                }}
              >
                {errors.form}
              </div>
            )}
            {/* Admin Email Field */}
            <div className="form-group">
              <label className="form-label" htmlFor="admin-email">Admin Email</label>
              <div className="input-wrapper">
                <input
                  id="admin-email"
                  type="email"
                  className={`form-input-auth ${errors.email ? 'form-input-error' : ''}`}
                  placeholder="Enter admin email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email || errors.form) {
                      setErrors((prev) => ({ ...prev, email: '', form: '' }));
                    }
                  }}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              {errors.email && <span className="input-error-msg">{errors.email}</span>}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label className="form-label" htmlFor="admin-password">Password</label>
              <div className="input-wrapper">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input-auth ${errors.password ? 'form-input-error' : ''}`}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (errors.password || errors.form) {
                      setErrors((prev) => ({ ...prev, password: '', form: '' }));
                    }
                  }}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span className="input-error-msg">{errors.password}</span>}
            </div>

            {/* Submit Button */}
            <div className="auth-button-stack" style={{ marginTop: '16px' }}>
              <button
                type="submit"
                className="btn-primary-purple"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>AUTHENTICATING...</span>
                  </>
                ) : (
                  'ADMIN LOGIN'
                )}
              </button>
            </div>
          </form>

          {/* Return to Employee Portal */}
          <div style={{ marginTop: '14px', textAlign: 'center' }}>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.8rem',
                color: '#64748b',
                fontWeight: '600'
              }}
            >
              <ArrowLeft size={14} />
              <span>Back to Employee Login</span>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="auth-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
          <ShieldCheck size={13} color="#64748b" />
          <span>Authorized administrators only</span>
        </footer>
      </div>
    </div>
  );
}
