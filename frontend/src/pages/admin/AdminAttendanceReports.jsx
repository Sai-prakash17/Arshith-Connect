import React, { useState, useEffect } from 'react';
import { Search, Download, Calendar, Filter, FileSpreadsheet, AlertCircle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { attendanceService } from '../../services/attendanceService';

export default function AdminAttendanceReports() {
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [dateRange, setDateRange] = useState('');

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const data = await attendanceService.getRecords();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load attendance records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      (rec.employeeName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rec.employeeId || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || rec.status?.toUpperCase() === statusFilter;
    const matchesMode = modeFilter === 'ALL' || rec.workMode?.toUpperCase() === modeFilter;
    const matchesDate = !dateRange || rec.date === dateRange;
    return matchesSearch && matchesStatus && matchesMode && matchesDate;
  });

  // Calculate live report metrics
  const totalPresent = filteredRecords.filter((r) => r.status === 'Present').length;
  const totalLate = filteredRecords.filter((r) => r.status === 'Late').length;
  const totalAbsent = filteredRecords.filter((r) => r.status === 'Absent').length;
  const totalWFO = filteredRecords.filter((r) => r.workMode === 'WFO').length;
  const totalWFH = filteredRecords.filter((r) => r.workMode === 'WFH').length;

  // Frontend CSV Export
  const handleExportCSV = () => {
    const headers = ['ID', 'Employee ID', 'Employee Name', 'Department', 'Date', 'Check In', 'Check Out', 'Work Mode', 'Status'];
    const rows = filteredRecords.map((r) => [
      r.id,
      r.employeeId,
      `"${r.employeeName}"`,
      `"${r.department}"`,
      r.date,
      r.checkIn,
      r.checkOut,
      r.workMode,
      r.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Arshith_Attendance_Report_${dateRange || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="reports-management-view animate-fade-in">
      <PageHeader
        title="Attendance Reports"
        subtitle="Exportable attendance analytics, logs, and departmental breakdown"
        breadcrumb={[
          { label: 'Admin', path: '/admin/dashboard' },
          { label: 'Reports' },
        ]}
        actionButton={
          <button
            type="button"
            className="btn-export-csv"
            onClick={handleExportCSV}
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>
        }
      />

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px',
          marginBottom: '24px'
        }}
      >
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>PRESENT</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#047857' }}>{totalPresent}</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>LATE</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#f59e0b' }}>{totalLate}</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>ABSENT</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#ef4444' }}>{totalAbsent}</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>WFO</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0b3d2b' }}>{totalWFO}</div>
        </div>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>WFH</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#2563eb' }}>{totalWFH}</div>
        </div>
      </div>

      <div className="management-page-card">
        {/* Filter Toolbar */}
        <div className="filter-toolbar">
          <div className="search-input-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Filter report records by employee name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-actions-group">
            <input
              type="date"
              className="filter-select"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            />

            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="ABSENT">Absent</option>
            </select>

            <select
              className="filter-select"
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
            >
              <option value="ALL">All Modes</option>
              <option value="WFO">WFO</option>
              <option value="WFH">WFH</option>
            </select>
          </div>
        </div>

        {/* Report Data Table */}
        {filteredRecords.length === 0 ? (
          <EmptyState
            title="No records found"
            description="No attendance records available for reporting."
          />
        ) : (
          <div className="table-responsive-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Work Mode</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec) => {
                  let statusBadgeClass = 'badge-absent';
                  if (rec.status.toUpperCase() === 'PRESENT') statusBadgeClass = 'badge-present';
                  if (rec.status.toUpperCase() === 'LATE') statusBadgeClass = 'badge-late';

                  return (
                    <tr key={rec.id}>
                      <td>
                        <div style={{ fontWeight: '700', color: '#0b3d2b' }}>
                          {rec.employeeName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {rec.employeeId}
                        </div>
                      </td>
                      <td>{rec.department}</td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            backgroundColor: rec.workMode === 'WFO' ? '#f0fdf4' : '#eff6ff',
                            color: rec.workMode === 'WFO' ? '#15803d' : '#1d4ed8',
                          }}
                        >
                          {rec.workMode}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600' }}>{rec.checkIn}</td>
                      <td style={{ color: '#64748b' }}>{rec.checkOut}</td>
                      <td>
                        <span className={`badge-status ${statusBadgeClass}`}>
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
