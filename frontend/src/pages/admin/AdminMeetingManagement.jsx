import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Users,
  XCircle,
  Edit2,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Check,
  UserCheck,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { meetingService } from '../../services/meetingService';
import { employeeService } from '../../services/employeeService';

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
  return String(dateVal);
};

const formatTime12h = (timeStr) => {
  if (!timeStr) return '';
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const hDisplay = h < 10 ? `0${h}` : `${h}`;
  return `${hDisplay}:${m} ${ampm}`;
};

export default function AdminMeetingManagement() {
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Authenticated Admin Identity
  const getAdminIdentity = () => {
    try {
      const stored = localStorage.getItem('arshith_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u?.name) return u.name;
        if (u?.fullName) return u.fullName;
        if (u?.email) return u.email.split('@')[0];
      }
    } catch (e) {
      // ignore
    }
    return 'Farook';
  };

  // Form states
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [description, setDescription] = useState('');
  const [organizer, setOrganizer] = useState(() => getAdminIdentity());
  const [room, setRoom] = useState('Google Meet');

  // Recipient selection states (Screenshots 2, 3, 4)
  const [recipientType, setRecipientType] = useState('All Employees'); // 'All Employees' | 'Selected Members'
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Employee list states for Selected Members
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeeError, setEmployeeError] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchMeetings = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const data = await meetingService.getMeetings();
      setMeetings(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch meetings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      setIsLoadingEmployees(true);
      setEmployeeError('');
      const data = await employeeService.getEmployees();
      const activeEmps = (Array.isArray(data) ? data : []).filter(
        (e) => e.status !== 'Inactive' && e.status !== 'Rejected'
      );
      setEmployees(activeEmps);
    } catch (err) {
      setEmployeeError('Unable to load employees. Please try again.');
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const filteredMeetings = meetings.filter((item) => {
    const matchesSearch =
      (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.organizer || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.status.toUpperCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenAdd = () => {
    setEditingMeeting(null);
    setTitle('');
    setDate('');
    setStartTime('10:00');
    setEndTime('11:00');
    setDescription('');
    setOrganizer(getAdminIdentity());
    setRoom('Google Meet');
    setRecipientType('All Employees');
    setSelectedEmployees([]);
    setEmployeeSearch('');
    setIsDropdownOpen(false);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m) => {
    setEditingMeeting(m);
    setTitle(m.title || '');
    setDate(m.date || '');
    if (m.start_time && m.end_time) {
      setStartTime(m.start_time);
      setEndTime(m.end_time);
    } else if (m.time && m.time.includes('-')) {
      const parts = m.time.split('-');
      setStartTime(parts[0].trim());
      setEndTime(parts[1].trim());
    } else {
      setStartTime('10:00');
      setEndTime('11:00');
    }
    setDescription(m.description || '');
    setOrganizer(m.organizer || getAdminIdentity());
    setRoom(m.room || m.link || 'Google Meet');
    const rType = m.recipient_type || 'All Employees';
    setRecipientType(rType);
    const rIds = Array.isArray(m.recipient_ids) ? m.recipient_ids : [];
    setSelectedEmployees(rIds);
    setEmployeeSearch('');
    setIsDropdownOpen(false);
    setFormErrors({});
    if (rType === 'Selected Members') {
      loadEmployees();
    }
    setIsModalOpen(true);
  };

  const handleCancelMeeting = async (id) => {
    if (window.confirm('Are you sure you want to cancel this meeting?')) {
      try {
        await meetingService.updateMeeting(id, { status: 'Cancelled' });
        setSuccessMessage('Meeting cancelled successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchMeetings();
      } catch (err) {
        setErrorMessage(err.message || 'Failed to cancel meeting');
      }
    }
  };

  const toggleEmployeeSelection = (employeeId) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
    if (formErrors.recipients) {
      setFormErrors((prev) => ({ ...prev, recipients: '' }));
    }
  };

  const handleSelectAll = (filteredList) => {
    const allIds = filteredList.map((e) => e.employee_id || e.id);
    const allSelected = allIds.every((id) => selectedEmployees.includes(id));
    if (allSelected) {
      setSelectedEmployees((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelectedEmployees((prev) => Array.from(new Set([...prev, ...allIds])));
    }
    if (formErrors.recipients) {
      setFormErrors((prev) => ({ ...prev, recipients: '' }));
    }
  };

  const filteredEmployeesList = employees.filter((emp) => {
    const q = employeeSearch.toLowerCase().trim();
    if (!q) return true;
    const name = (emp.full_name || emp.name || '').toLowerCase();
    const email = (emp.email || '').toLowerCase();
    const id = (emp.employee_id || emp.id || '').toLowerCase();
    return name.includes(q) || email.includes(q) || id.includes(q);
  });

  const handleSave = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Please enter a meeting title.';
    }
    if (!date) {
      newErrors.date = 'Please select a valid meeting date.';
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      if (date < todayStr) {
        newErrors.date = 'Meeting date cannot be in the past.';
      }
    }

    if (startTime && endTime && startTime >= endTime) {
      newErrors.time = 'End time must be later than start time.';
    }

    if (recipientType === 'Selected Members' && selectedEmployees.length === 0) {
      newErrors.recipients = 'Please select at least one employee.';
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      setErrorMessage(Object.values(newErrors)[0]);
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setFormErrors({});

      const formattedTime = `${formatTime12h(startTime)} - ${formatTime12h(endTime)}`;

      const payload = {
        title: title.trim(),
        date,
        time: formattedTime,
        startTime,
        endTime,
        duration: '30 mins',
        organizer: organizer.trim() || getAdminIdentity(),
        room: room.trim() || 'Google Meet',
        link: room.trim().startsWith('http') ? room.trim() : 'https://meet.google.com/new',
        description: description.trim() || 'General discussion.',
        recipientType,
        recipients: recipientType === 'Selected Members' ? selectedEmployees : [],
      };

      if (editingMeeting) {
        await meetingService.updateMeeting(editingMeeting.id, payload);
        setSuccessMessage('Meeting updated successfully');
      } else {
        await meetingService.createMeeting(payload);
        setSuccessMessage('Meeting scheduled successfully');
      }

      setTimeout(() => setSuccessMessage(''), 4000);
      setIsModalOpen(false);
      fetchMeetings();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save meeting');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="meeting-management-view animate-fade-in">
      <PageHeader
        title="Meeting Management"
        subtitle="Schedule, organize, and monitor employee company meetings"
        breadcrumb={[
          { label: 'Admin', path: '/admin/dashboard' },
          { label: 'Meetings' },
        ]}
        actionButton={
          <button
            type="button"
            className="btn-primary-action"
            onClick={handleOpenAdd}
          >
            <Plus size={16} />
            <span>Schedule Meeting</span>
          </button>
        }
      />

      {successMessage && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '12px 16px', borderRadius: '12px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
          <CheckCircle size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '12px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '600' }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="management-page-card">
        {/* Filter Toolbar */}
        <div className="filter-toolbar">
          <div className="search-input-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search meetings by title, organizer, or agenda..."
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
              <option value="SCHEDULED">Scheduled</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Meeting Cards Grid */}
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            Loading scheduled meetings...
          </div>
        ) : filteredMeetings.length === 0 ? (
          <EmptyState
            title="No meetings found"
            description="No scheduled meetings match your current search and filter criteria."
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {filteredMeetings.map((item) => {
              const isCancelled = item.status === 'Cancelled';
              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    padding: '18px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative',
                    opacity: isCancelled ? 0.75 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <span
                          style={{
                            backgroundColor: isCancelled ? '#f1f5f9' : '#eff6ff',
                            color: isCancelled ? '#64748b' : '#2563eb',
                            fontSize: '0.725rem',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          {item.platform || 'Google Meet'}
                        </span>
                        <span
                          style={{
                            backgroundColor: item.recipient_type === 'Selected Members' ? '#fdf4ff' : '#f0fdf4',
                            color: item.recipient_type === 'Selected Members' ? '#a21caf' : '#15803d',
                            fontSize: '0.725rem',
                            fontWeight: '600',
                            padding: '3px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          {item.recipient_type === 'Selected Members' ? 'Selected Members' : 'All Employees'}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#0b3d2b', margin: 0 }}>
                        {item.title}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        className="table-action-btn btn-edit"
                        onClick={() => handleOpenEdit(item)}
                        title="Edit meeting"
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                      {!isCancelled && (
                        <button
                          type="button"
                          className="table-action-btn btn-delete"
                          onClick={() => handleCancelMeeting(item.id)}
                          title="Cancel meeting"
                        >
                          <XCircle size={13} />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                    {item.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748b', paddingTop: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={14} color="#0d9488" />
                      <span>{formatDateSafe(item.date)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Clock size={14} color="#6941c6" />
                      <span>{item.time}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Users size={14} color="#2563eb" />
                      <span>{item.organizer} ({item.attendees} attendees)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <MapPin size={14} color="#ea580c" />
                      <span>{item.room || item.link}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMeeting ? 'Edit Meeting Details' : 'Schedule New Meeting'}
        subtitle="Set up participant briefings, agendas, and virtual rooms"
      >
        <form onSubmit={handleSave} style={{ maxHeight: '80vh', overflowY: 'auto', paddingRight: '4px' }}>
          {/* Meeting Title */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>
              Meeting Title
            </label>
            <input
              type="text"
              required
              className="form-input-auth"
              placeholder="e.g. Q4 Strategy Review"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: '' }));
              }}
              style={{
                borderColor: formErrors.title ? '#ef4444' : undefined,
              }}
            />
            {formErrors.title && (
              <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                {formErrors.title}
              </span>
            )}
          </div>

          {/* Date and Location/Room */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>
                Date
              </label>
              <input
                type="date"
                required
                className="form-input-auth"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (formErrors.date) setFormErrors((prev) => ({ ...prev, date: '' }));
                }}
                style={{
                  borderColor: formErrors.date ? '#ef4444' : undefined,
                }}
              />
              {formErrors.date && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                  {formErrors.date}
                </span>
              )}
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>
                Meeting Room / Link
              </label>
              <input
                type="text"
                className="form-input-auth"
                placeholder="Google Meet or Room A"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
          </div>

          {/* Start Time and End Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>
                Start Time
              </label>
              <input
                type="time"
                required
                className="form-input-auth"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  if (formErrors.time) setFormErrors((prev) => ({ ...prev, time: '' }));
                }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '600', color: '#1e293b', marginBottom: '6px' }}>
                End Time
              </label>
              <input
                type="time"
                required
                className="form-input-auth"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  if (formErrors.time) setFormErrors((prev) => ({ ...prev, time: '' }));
                }}
                style={{
                  borderColor: formErrors.time ? '#ef4444' : undefined,
                }}
              />
            </div>
          </div>
          {formErrors.time && (
            <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '-8px', marginBottom: '12px', display: 'block' }}>
              {formErrors.time}
            </span>
          )}

          {/* Organizer Field (Screenshot 1) */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={{ fontWeight: '700', color: '#1e293b', marginBottom: '6px', fontSize: '0.95rem' }}>
              Organizer
            </label>
            <input
              type="text"
              required
              className="form-input-auth"
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              style={{
                border: '1.5px solid #8b5cf6',
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '0.95rem',
                fontWeight: '500',
                color: '#1e293b',
                backgroundColor: '#ffffff',
                boxShadow: '0 0 0 3px rgba(139, 92, 246, 0.08)',
              }}
            />
          </div>

          {/* Description & Agenda (Screenshot 1) */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: '700', color: '#1e293b', marginBottom: '6px', fontSize: '0.95rem' }}>
              Description & Agenda
            </label>
            <textarea
              rows={3}
              className="form-input-auth"
              style={{ height: '70px', padding: '10px 14px', resize: 'none', borderRadius: '10px' }}
              placeholder="Meeting topics and requirements..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Send Meeting To Dropdown (Screenshots 2, 3, 4) */}
          <div className="form-group" ref={dropdownRef} style={{ position: 'relative', marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: '700', color: '#1e1b4b', marginBottom: '8px', fontSize: '0.95rem' }}>
              Send Meeting To
            </label>
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '0.95rem',
                fontWeight: '500',
                color: '#1e293b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                userSelect: 'none',
              }}
            >
              <span>{recipientType}</span>
              <ChevronDown
                size={18}
                color="#64748b"
                style={{
                  transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                }}
              />
            </div>

            {/* Dropdown Options (Screenshot 3) */}
            {isDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                  zIndex: 70,
                  overflow: 'hidden',
                  padding: '4px 0',
                }}
              >
                <div
                  onClick={() => {
                    setRecipientType('All Employees');
                    setSelectedEmployees([]);
                    setIsDropdownOpen(false);
                    if (formErrors.recipients) {
                      setFormErrors((prev) => ({ ...prev, recipients: '' }));
                    }
                  }}
                  style={{
                    padding: '12px 18px',
                    fontSize: '0.95rem',
                    color: '#1e293b',
                    cursor: 'pointer',
                    fontWeight: recipientType === 'All Employees' ? '600' : '400',
                    backgroundColor: recipientType === 'All Employees' ? '#f5f3ff' : '#ffffff',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      recipientType === 'All Employees' ? '#f5f3ff' : '#ffffff')
                  }
                >
                  All Employees
                </div>
                <div
                  onClick={() => {
                    setRecipientType('Selected Members');
                    setIsDropdownOpen(false);
                    if (employees.length === 0) {
                      loadEmployees();
                    }
                  }}
                  style={{
                    padding: '12px 18px',
                    fontSize: '0.95rem',
                    color: '#1e293b',
                    cursor: 'pointer',
                    fontWeight: recipientType === 'Selected Members' ? '600' : '400',
                    backgroundColor: recipientType === 'Selected Members' ? '#f5f3ff' : '#ffffff',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      recipientType === 'Selected Members' ? '#f5f3ff' : '#ffffff')
                  }
                >
                  Selected Members
                </div>
              </div>
            )}
          </div>

          {/* Select Members Section (Screenshot 2) */}
          {recipientType === 'Selected Members' && (
            <div style={{ marginBottom: '16px', animation: 'fadeIn 0.2s ease-in-out' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label className="form-label" style={{ fontWeight: '700', color: '#1e1b4b', margin: 0, fontSize: '0.95rem' }}>
                  Select Members
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.775rem', color: selectedEmployees.length > 0 ? '#6347f7' : '#64748b', fontWeight: '600' }}>
                    {selectedEmployees.length} {selectedEmployees.length === 1 ? 'employee' : 'employees'} selected
                  </span>
                  {filteredEmployeesList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSelectAll(filteredEmployeesList)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6347f7',
                        fontSize: '0.775rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                      }}
                    >
                      {filteredEmployeesList.every((e) => selectedEmployees.includes(e.employee_id || e.id))
                        ? 'Deselect All'
                        : 'Select All'}
                    </button>
                  )}
                </div>
              </div>

              {/* Employee Search */}
              <div style={{ position: 'relative', marginBottom: '10px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '11px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search employees by name or email..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="form-input-auth"
                  style={{
                    paddingLeft: '34px',
                    height: '36px',
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                />
              </div>

              {employeeError && (
                <div style={{ color: '#b91c1c', backgroundColor: '#fef2f2', padding: '8px 12px', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '8px' }}>
                  {employeeError}
                </div>
              )}

              {/* Scrollable Employee Checkbox List (Screenshot 2) */}
              <div
                style={{
                  maxHeight: '190px',
                  overflowY: 'auto',
                  border: formErrors.recipients ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '8px',
                  backgroundColor: '#fafafa',
                }}
              >
                {isLoadingEmployees ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    Loading employee directory...
                  </div>
                ) : filteredEmployeesList.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                    {employeeSearch ? 'No matching employees found.' : 'No active employees available.'}
                  </div>
                ) : (
                  filteredEmployeesList.map((emp) => {
                    const empIdentifier = emp.employee_id || emp.id;
                    const isSelected = selectedEmployees.includes(empIdentifier);
                    return (
                      <div
                        key={empIdentifier}
                        onClick={() => toggleEmployeeSelection(empIdentifier)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 14px',
                          backgroundColor: isSelected ? '#f5f3ff' : '#ffffff',
                          border: isSelected ? '1px solid #c4b5fd' : '1px solid #f1f5f9',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          marginBottom: '6px',
                          transition: 'background-color 0.15s ease, border-color 0.15s ease',
                          userSelect: 'none',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}} // toggled by parent onClick
                          style={{
                            width: '18px',
                            height: '18px',
                            accentColor: '#6347f7',
                            cursor: 'pointer',
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.925rem', lineHeight: '1.2' }}>
                            {emp.full_name || emp.name}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '2px' }}>
                            {emp.email}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {formErrors.recipients && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                  {formErrors.recipients}
                </span>
              )}
            </div>
          )}

          {/* Schedule Meeting Button (Screenshots 2, 3, 4) */}
          <button
            type="submit"
            disabled={isSaving}
            style={{
              width: '100%',
              backgroundColor: '#6347f7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '13px',
              fontSize: '0.925rem',
              fontWeight: '700',
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(99, 71, 247, 0.28)',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background-color 0.15s ease, transform 0.1s ease',
            }}
            onMouseEnter={(e) => !isSaving && (e.currentTarget.style.backgroundColor = '#5338db')}
            onMouseLeave={(e) => !isSaving && (e.currentTarget.style.backgroundColor = '#6347f7')}
          >
            {isSaving ? 'Processing...' : editingMeeting ? 'UPDATE MEETING' : 'SCHEDULE MEETING'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
