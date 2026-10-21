import React, { useState, useEffect, useCallback } from 'react';
import { Search, Check, X, Filter, AlertCircle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import { leaveService } from '../../services/leaveService';

const formatDateSafe = (dateVal) => {
  if (!dateVal) return '-';
  if (typeof dateVal === 'string') {
    if (/^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/.test(dateVal.trim())) {
      return dateVal.trim();
    }
    const datePart = dateVal.split('T')[0].split(' ')[0];
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 0 && month <= 11) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${day < 10 ? '0' + day : day} ${months[month]} ${year}`;
      }
    }
  }
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day < 10 ? '0' + day : day} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch (e) {
    // fallback
  }
  return String(dateVal);
};

export default function AdminLeaveManagement() {
  const [leaves, setLeaves] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  const loadLeaves = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await leaveService.getLeaves();
      setLeaves(data || []);
    } catch (err) {
      console.error('Failed to load leaves', err);
      setLeaves([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeaves();
  }, [loadLeaves]);

  const filteredLeaves = leaves.filter((item) => {
    const name = item.employeeName || item.employee_name || '';
    const id = item.employeeId || item.employee_id || '';
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || (item.status || '').toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await leaveService.updateLeaveStatus(id, newStatus);
      await loadLeaves();
    } catch (err) {
      console.error('Failed to update leave', err);
    }
  };

  return (
    <div className="leave-management-view animate-fade-in">
      <PageHeader
        title="Leave Management"
        subtitle="Review, approve, or decline employee leave applications"
        breadcrumb={[
          { label: 'Admin', path: '/admin/dashboard' },
          { label: 'Leave Management' },
        ]}
      />

      <div className="management-page-card">
        {/* Filter Toolbar */}
        <div className="filter-toolbar">
          <div className="search-input-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by Employee Name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-actions-group">
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {filteredLeaves.length === 0 ? (
          <EmptyState
            title="No leave requests found"
            description="No leave requests match your search query and filters."
          />
        ) : (
          <div className="table-responsive-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Dates & Duration</th>
                  <th>Reason</th>
                  <th>Requested On</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeaves.map((leave) => {
                  let badgeClass = 'badge-pending';
                  if (leave.status === 'Approved') badgeClass = 'badge-approved';
                  if (leave.status === 'Rejected') badgeClass = 'badge-rejected';

                  const empName = leave.employeeName || leave.employee_name || 'Employee';
                  const empId = leave.employeeId || leave.employee_id || '';
                  const leaveType = leave.leaveType || leave.leave_type || leave.type || '-';
                  const fromDate = formatDateSafe(leave.startDate || leave.start_date || leave.from_date || leave.from);
                  const toDate = formatDateSafe(leave.endDate || leave.end_date || leave.to_date || leave.to);
                  const daysCount = leave.daysCount ?? leave.days ?? leave.days_count ?? 1;
                  const reqDate = formatDateSafe(leave.requestDate || leave.applied_date || leave.appliedDate || leave.applied_on || leave.appliedOn);

                  const durationType = leave.duration_type || leave.durationType || 'Full-Day Leave';
                  const isHourly = durationType === 'Hourly Leave' || leave.hours_count != null || leave.hours != null;
                  const startTime = leave.start_time || leave.startTime;
                  const endTime = leave.end_time || leave.endTime;
                  const hoursCount = leave.hours_count ?? leave.hoursCount ?? leave.hours;

                  return (
                    <tr key={leave.id || leave.request_id}>
                      <td>
                        <div style={{ fontWeight: '700', color: '#0b3d2b' }}>
                          {empName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {empId}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: '600', color: '#1e293b' }}>
                          {leaveType}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600', color: '#1e293b' }}>
                          {isHourly
                            ? `${fromDate}${startTime && endTime ? ` (${startTime} - ${endTime})` : ''}`
                            : `${fromDate} to ${toDate}`}
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: isHourly ? '#6d28d9' : '#64748b',
                            fontWeight: isHourly ? '600' : 'normal',
                          }}
                        >
                          {isHourly
                            ? `${hoursCount} hr${hoursCount === 1 ? '' : 's'} (Hourly Leave)`
                            : `${daysCount} ${daysCount === 1 ? 'day' : 'days'}`}
                        </div>
                      </td>
                      <td style={{ maxWidth: '240px', fontSize: '0.825rem', color: '#475569' }}>
                        {leave.reason}
                      </td>
                      <td style={{ fontSize: '0.825rem', color: '#64748b' }}>
                        {reqDate}
                      </td>
                      <td>
                        <span className={`badge-status ${badgeClass}`}>
                          {leave.status}
                        </span>
                      </td>
                      <td>
                        {leave.status === 'Pending' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              className="table-action-btn btn-approve"
                              onClick={() => handleStatusUpdate(leave.id, 'Approved')}
                              title="Approve leave"
                            >
                              <Check size={14} />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              className="table-action-btn btn-reject"
                              onClick={() => handleStatusUpdate(leave.id, 'Rejected')}
                              title="Reject leave"
                            >
                              <X size={14} />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            Decided
                          </span>
                        )}
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
