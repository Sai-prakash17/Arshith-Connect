import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ArrowLeft, RefreshCw, PlusCircle, CheckCircle2 } from 'lucide-react';
import EmptyState from '../../components/common/EmptyState';
import { employeeService } from '../../services/employeeService';

export default function AdminEmployees() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState('');

  const loadRegisteredEmployees = useCallback(async () => {
    setIsLoading(true);
    try {
      const records = await employeeService.getEmployees();
      const valid = records.filter(
        (e) => e && e.name && e.name.trim().toLowerCase() !== 'unnamed employee'
      );
      setEmployees(valid);
    } catch (err) {
      console.error('Failed to load registered employees', err);
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRegisteredEmployees();
  }, [loadRegisteredEmployees]);

  const handleRefresh = () => {
    loadRegisteredEmployees();
    setFeedback('Employee list refreshed');
    setTimeout(() => setFeedback(''), 2500);
  };

  return (
    <div className="admin-registered-employees-view animate-fade-in" style={{ maxWidth: '820px', margin: '0 auto' }}>
      {/* Top Header matching Screenshot 4 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          gap: '12px',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/admin/dashboard')}
          style={{
            padding: '7px 16px',
            backgroundColor: '#374151',
            color: '#ffffff',
            borderRadius: '8px',
            fontSize: '0.825rem',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background-color 0.15s ease',
          }}
          title="Back to Dashboard"
        >
          <ArrowLeft size={15} />
          <span>BACK</span>
        </button>

        <h1
          style={{
            fontSize: '1.35rem',
            fontWeight: '700',
            color: '#0b3d2b',
            margin: 0,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          Employees
        </h1>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          style={{
            padding: '7px 16px',
            backgroundColor: '#6941c6',
            color: '#ffffff',
            borderRadius: '8px',
            fontSize: '0.825rem',
            fontWeight: '600',
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background-color 0.15s ease',
          }}
          title="Refresh list"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>REFRESH</span>
        </button>
      </div>

      {feedback && (
        <div
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '8px 14px',
            borderRadius: '8px',
            fontSize: '0.825rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '14px',
          }}
        >
          <CheckCircle2 size={15} />
          <span>{feedback}</span>
        </div>
      )}

      {/* Attendance Policy Notice matching Screenshot 4 */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '20px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.5 }}>
          <strong style={{ color: '#0f172a' }}>Attendance: Monday - Saturday</strong>
          <br />
          Sunday and company holidays are excluded
        </div>
      </div>

      {/* Employees Cards Container */}
      {employees.length === 0 ? (
        <EmptyState
          title="No registered employees found."
          description="No employee records are available. Staff who register through the portal or are added in Employee List will appear here."
          action={
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => navigate('/admin/employee-list')}
                className="btn-primary-action"
                style={{ fontSize: '0.825rem' }}
              >
                Go to Employee Directory
              </button>
            </div>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {employees.map((emp) => {
            const empName = emp.name || emp.fullName || '';
            const empEmail = emp.email || '';
            const empId = emp.id || emp.employeeId || '';
            const empRole = emp.role || emp.designation || 'Employee';
            const hasAttendance =
              emp.attendancePercentage !== undefined && emp.attendancePercentage !== null;

            return (
              <div
                key={emp.id || emp.email}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Employee Row: Avatar + Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Avatar Circle with Purple Border & Green User Icon (matches Screenshot 4) */}
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      border: '2.5px solid #6941c6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#f5f3ff',
                      flexShrink: 0,
                    }}
                  >
                    <User size={28} color="#059669" />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        margin: '0 0 3px 0',
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        color: '#0f172a',
                        lineHeight: 1.25,
                      }}
                    >
                      {empName}
                    </h3>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', wordBreak: 'break-all' }}>
                      {empEmail}
                    </div>
                    {empId && (
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                        ID: {empId} &bull; Role: {empRole}
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider Line */}
                <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0 2px 0' }} />

                {/* Attendance Line: only when real attendance data exists */}
                {hasAttendance && (
                  <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#6941c6' }}>
                    Attendance: {emp.attendancePercentage}%
                  </div>
                )}

                {/* Individual Work Assignment Action matching Screenshot 2 */}
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/assignments', { state: { prefillEmployee: empName } })}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#6941c6',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      letterSpacing: '0.4px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                  >
                    CREATE INDIVIDUAL ASSIGNMENT
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
