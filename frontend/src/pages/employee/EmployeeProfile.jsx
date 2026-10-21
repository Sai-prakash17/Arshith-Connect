import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Building2, Briefcase, Calendar, Shield, MapPin, CheckCircle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { employeeService } from '../../services/employeeService';

export default function EmployeeProfile() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const data = await employeeService.getProfile('me');
        if (data) setProfile(data);
      } catch (err) {
        console.warn('Failed to fetch personal profile', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('arshith_user')) || null;
    } catch {
      return null;
    }
  })();

  const employeeName = profile?.name || profile?.fullName || storedUser?.name || 'Employee';
  const employeeEmail = profile?.email || storedUser?.email || 'employee@arshith.com';
  const employeeId = profile?.id || profile?.employeeId || storedUser?.employeeId || 'AFI-001';
  const designation = profile?.designation || profile?.role || 'Operations Associate';
  const department = profile?.department || profile?.dept || 'Operations & Attendance';
  const phone = profile?.phone || '+91 98765 43210';
  const joiningDate = profile?.joining || 'April 10, 2024';
  const location = profile?.location || 'HQ Office • Hybrid Mode';
  const status = profile?.status || 'Active';

  return (
    <div className="employee-profile-view animate-fade-in">
      <PageHeader
        title="My Profile"
        subtitle="Personal records, employment credentials, and organizational mapping"
        breadcrumb={[{ label: 'Employee', path: '/employee/dashboard' }, { label: 'Profile' }]}
      />

      {/* Main Profile Header Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            backgroundColor: '#0b3d2b',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            fontWeight: '800',
          }}
        >
          {employeeName.charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0b3d2b', margin: 0 }}>
              {employeeName}
            </h2>
            <span
              style={{
                backgroundColor: '#ecfdf5',
                color: '#047857',
                fontSize: '0.75rem',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '6px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCircle size={12} />
              <span>Active Staff</span>
            </span>
          </div>

          <div style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '4px' }}>
            Staff ID: <strong style={{ color: '#0b3d2b' }}>{employeeId}</strong> &bull; {designation}
          </div>
        </div>
      </div>

      {/* Profile Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '18px' }}>
        {/* Employment Information */}
        <div className="management-page-card">
          <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0b3d2b', marginBottom: '16px' }}>
            Employment Details
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Briefcase size={16} style={{ color: '#0b3d2b' }} />
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Designation</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>{designation}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Building2 size={16} style={{ color: '#0b3d2b' }} />
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Department</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>{department}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={16} style={{ color: '#0b3d2b' }} />
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Joining Date</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>{joiningDate}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <MapPin size={16} style={{ color: '#0b3d2b' }} />
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Work Location</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>{location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact & Security */}
        <div className="management-page-card">
          <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0b3d2b', marginBottom: '16px' }}>
            Contact &amp; Security
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Mail size={16} style={{ color: '#0b3d2b' }} />
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Official Email</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>{employeeEmail}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Phone size={16} style={{ color: '#0b3d2b' }} />
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Contact Phone</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>{phone}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={16} style={{ color: '#0b3d2b' }} />
              <div>
                <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem' }}>Role Permission</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>Standard Employee Access</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
