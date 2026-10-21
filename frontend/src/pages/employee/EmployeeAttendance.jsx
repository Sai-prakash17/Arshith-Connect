import React, { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, AlertCircle, Laptop, Building2, Download, Filter, Camera, X, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import AttendanceCard from '../../components/employee/AttendanceCard';
import AttendancePhotoDisplay from '../../components/employee/AttendancePhotoDisplay';
import { attendanceService } from '../../services/attendanceService';

export default function EmployeeAttendance() {
  const [selectedMonth, setSelectedMonth] = useState('October 2026');
  const [workModeFilter, setWorkModeFilter] = useState('All');
  const [personalRecords, setPersonalRecords] = useState([]);
  const [selectedEvidenceRecord, setSelectedEvidenceRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchMyAttendance = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const data = await attendanceService.getMyRecords();
      setPersonalRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch personal attendance records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAttendance();
  }, []);

  const filtered = personalRecords.filter((rec) => {
    const mode = rec.mode || rec.workMode || '';
    if (workModeFilter !== 'All' && mode.toUpperCase() !== workModeFilter.toUpperCase()) return false;
    return true;
  });

  const daysPresent = personalRecords.filter((r) => r.status === 'Present' || r.status === 'Late').length;
  const wfoDays = personalRecords.filter((r) => (r.mode || r.workMode) === 'WFO').length;
  const wfhDays = personalRecords.filter((r) => (r.mode || r.workMode) === 'WFH').length;

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      ['Date,Day,Check In,Check Out,Mode,Duration,Status', ...filtered.map((r) => `${r.date},${r.day || '--'},${r.checkIn || '--'},${r.checkOut || '--'},${r.mode || r.workMode || 'WFO'},${r.duration || '--'},${r.status}`)].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Arshith_Attendance_${selectedMonth.replace(' ', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="employee-attendance-view animate-fade-in">
      <PageHeader
        title="My Attendance"
        subtitle="Live daily check-in console and monthly attendance records"
        breadcrumb={[{ label: 'Employee', path: '/employee/dashboard' }, { label: 'Attendance' }]}
        actionButton={
          <button type="button" className="btn-primary-purple" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={14} />
            <span>Export My Records</span>
          </button>
        }
      />

      {/* Live Attendance Clock Card */}
      <AttendanceCard />

      {/* Monthly Summary Statistics */}
      <div className="admin-today-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card one-third">
          <span className="stat-card-label">DAYS PRESENT</span>
          <div className="stat-card-value stat-val-present">{daysPresent}</div>
        </div>
        <div className="stat-card one-third">
          <span className="stat-card-label">WFO DAYS</span>
          <div className="stat-card-value stat-val-wfo">{wfoDays}</div>
        </div>
        <div className="stat-card one-third">
          <span className="stat-card-label">WFH DAYS</span>
          <div className="stat-card-value stat-val-wfo">{wfhDays}</div>
        </div>
      </div>

      {/* Personal Attendance History Table */}
      <div className="management-page-card">
        <div className="filter-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} style={{ color: '#0b3d2b' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0b3d2b' }}>Filter by Work Mode:</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {['All', 'WFO', 'WFH'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setWorkModeFilter(mode)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  border: workModeFilter === mode ? '1px solid #0b3d2b' : '1px solid #e2e8f0',
                  backgroundColor: workModeFilter === mode ? '#0b3d2b' : '#ffffff',
                  color: workModeFilter === mode ? '#ffffff' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="table-responsive-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Work Mode</th>
                <th>Total Working Hours</th>
                <th>Status</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: '700', color: '#0b3d2b' }}>{row.date}</td>
                  <td style={{ color: '#475569' }}>{row.day}</td>
                  <td style={{ fontWeight: '600', color: '#0b3d2b' }}>{row.checkIn}</td>
                  <td style={{ color: '#64748b' }}>{row.checkOut}</td>
                  <td>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        backgroundColor: row.mode === 'WFO' ? '#ecfdf5' : '#eff6ff',
                        color: row.mode === 'WFO' ? '#047857' : '#1d4ed8',
                      }}
                    >
                      {row.mode === 'WFO' ? <Building2 size={12} /> : <Laptop size={12} />}
                      <span>{row.mode}</span>
                    </span>
                  </td>
                  <td style={{ fontWeight: '600' }}>{row.duration}</td>
                  <td>
                    <span className={`badge-status ${row.status === 'Present' ? 'badge-present' : 'badge-late'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td>
                    {row.hasCheckInPhoto && row.id ? (
                      <button
                        type="button"
                        onClick={() => setSelectedEvidenceRecord(row)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          backgroundColor: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          color: '#047857',
                          cursor: 'pointer',
                        }}
                        title="View check-in photo and GPS verification"
                      >
                        <Camera size={12} />
                        <span>View Photo</span>
                      </button>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evidence Lightbox Modal */}
      {selectedEvidenceRecord && (
        <div className="attendance-modal-overlay" onClick={() => setSelectedEvidenceRecord(null)}>
          <div
            className="attendance-modal-container animate-fade-in"
            style={{ maxWidth: '480px', width: '92%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="attendance-modal-header" style={{ justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#059669" />
                <h3 className="attendance-modal-title" style={{ fontSize: '1rem', margin: 0, color: '#0b3d2b', fontWeight: 700 }}>
                  Attendance Verification Evidence
                </h3>
              </div>
              <button
                type="button"
                className="lightbox-close-btn"
                onClick={() => setSelectedEvidenceRecord(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
              >
                <X size={18} />
              </button>
            </div>
            <div className="attendance-modal-body" style={{ padding: '16px' }}>
              <AttendancePhotoDisplay
                attendanceId={selectedEvidenceRecord.id}
                checkInTime={selectedEvidenceRecord.checkIn}
                checkInLatitude={selectedEvidenceRecord.checkInLatitude ?? null}
                checkInLongitude={selectedEvidenceRecord.checkInLongitude ?? null}
                checkInAccuracy={selectedEvidenceRecord.checkInLocationAccuracy ?? null}
                workMode={selectedEvidenceRecord.mode || selectedEvidenceRecord.workMode || 'WFO'}
                status={selectedEvidenceRecord.status}
              />
            </div>
            <div className="modal-actions-footer" style={{ padding: '12px 16px', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setSelectedEvidenceRecord(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
