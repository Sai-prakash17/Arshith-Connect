import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Trash2, Edit2, Megaphone, Calendar, AlertCircle, CheckCircle, ChevronDown, Check, Users } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { announcementService } from '../../services/announcementService';
import { employeeService } from '../../services/employeeService';

const ANNOUNCEMENT_TYPES = [
  { value: 'General', label: 'General', desc: 'Regular company announcements' },
  { value: 'Important', label: 'Important', desc: 'Important notices that require employee attention' },
  { value: 'Holiday', label: 'Holiday', desc: 'Company holidays and holiday-related information' },
  { value: 'Meeting', label: 'Meeting', desc: 'Meeting announcements and related information' },
];

const RECIPIENT_TYPES = [
  { value: 'All Employees', label: 'All Employees', desc: 'Broadcast to all employees across the company' },
  { value: 'Selected Members', label: 'Selected Members', desc: 'Send to specific selected employees' },
];

const PRIORITIES = [
  { value: 'Normal', label: 'Normal' },
  { value: 'High', label: 'High' },
  { value: 'Urgent', label: 'Urgent' },
  { value: 'Low', label: 'Low' },
];

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [author, setAuthor] = useState('Admin Office');
  const [priority, setPriority] = useState('Normal');
  const [announcementType, setAnnouncementType] = useState('General');
  const [recipientType, setRecipientType] = useState('All Employees');
  const [selectedEmployees, setSelectedEmployees] = useState([]);

  // Dropdown open states
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [isRecipientOpen, setIsRecipientOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);

  // Refs for outside click
  const typeRef = useRef(null);
  const recipientRef = useRef(null);
  const priorityRef = useRef(null);

  // Employee directory state
  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeeError, setEmployeeError] = useState('');

  // Form validation errors
  const [formErrors, setFormErrors] = useState({});

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

  const fetchAnnouncements = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const data = await announcementService.getAnnouncements();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch announcements');
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
      setEmployeeError('Unable to load employee directory.');
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (typeRef.current && !typeRef.current.contains(e.target)) {
        setIsTypeOpen(false);
      }
      if (recipientRef.current && !recipientRef.current.contains(e.target)) {
        setIsRecipientOpen(false);
      }
      if (priorityRef.current && !priorityRef.current.contains(e.target)) {
        setIsPriorityOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredAnnouncements = announcements.filter((item) => {
    const s = searchQuery.toLowerCase();
    return (
      (item.title || '').toLowerCase().includes(s) ||
      (item.message || '').toLowerCase().includes(s) ||
      (item.author || '').toLowerCase().includes(s) ||
      (item.announcement_type || item.announcementType || item.type || '').toLowerCase().includes(s)
    );
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setTitle('');
    setMessage('');
    setAuthor(getAdminIdentity());
    setPriority('Normal');
    setAnnouncementType('General');
    setRecipientType('All Employees');
    setSelectedEmployees([]);
    setEmployeeSearch('');
    setIsTypeOpen(false);
    setIsRecipientOpen(false);
    setIsPriorityOpen(false);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ann) => {
    setEditingItem(ann);
    setTitle(ann.title || '');
    setMessage(ann.message || '');
    setAuthor(ann.author || getAdminIdentity());
    setPriority(ann.priority || 'Normal');
    setAnnouncementType(ann.announcement_type || ann.announcementType || ann.type || 'General');
    const rType = ann.recipient_type || ann.recipientType || 'All Employees';
    setRecipientType(rType);
    const rIds = Array.isArray(ann.recipients || ann.recipient_ids || ann.recipientIds)
      ? (ann.recipients || ann.recipient_ids || ann.recipientIds)
      : [];
    setSelectedEmployees(rIds);
    setEmployeeSearch('');
    setIsTypeOpen(false);
    setIsRecipientOpen(false);
    setIsPriorityOpen(false);
    setFormErrors({});
    if (rType === 'Selected Members' && employees.length === 0) {
      loadEmployees();
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this announcement?')) {
      try {
        await announcementService.deleteAnnouncement(id);
        setSuccessMessage('Announcement deleted successfully');
        setTimeout(() => setSuccessMessage(''), 3500);
        fetchAnnouncements();
      } catch (err) {
        setErrorMessage(err.message || 'Failed to delete announcement');
      }
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!title.trim()) {
      errors.title = 'Please enter an announcement title.';
    }
    if (!message.trim()) {
      errors.message = 'Please write an announcement message.';
    }
    if (!announcementType) {
      errors.announcementType = 'Please select an announcement type.';
    }
    if (!recipientType) {
      errors.recipientType = 'Please select recipients.';
    }
    if (recipientType === 'Selected Members' && selectedEmployees.length === 0) {
      errors.recipients = 'Please select at least one employee.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    if (!validateForm()) return;

    try {
      setIsSaving(true);
      setErrorMessage('');

      const payload = {
        title: title.trim(),
        message: message.trim(),
        author: author.trim() || getAdminIdentity(),
        priority,
        announcementType,
        recipientType,
        recipients: recipientType === 'Selected Members' ? selectedEmployees : [],
      };

      if (editingItem) {
        await announcementService.updateAnnouncement(editingItem.id, payload);
        setSuccessMessage('Announcement updated successfully');
      } else {
        await announcementService.createAnnouncement(payload);
        setSuccessMessage('Announcement published successfully');
      }

      setTimeout(() => setSuccessMessage(''), 4000);
      setIsModalOpen(false);
      fetchAnnouncements();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save announcement');
    } finally {
      setIsSaving(false);
    }
  };

  // Employee selection helpers
  const filteredEmployeesList = employees.filter((emp) => {
    const q = employeeSearch.toLowerCase();
    const name = (emp.full_name || emp.fullName || emp.name || '').toLowerCase();
    const email = (emp.email || '').toLowerCase();
    const id = (emp.employee_id || emp.id || '').toLowerCase();
    return name.includes(q) || email.includes(q) || id.includes(q);
  });

  const handleToggleEmployee = (empId) => {
    setSelectedEmployees((prev) => {
      const next = prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId];
      if (next.length > 0 && formErrors.recipients) {
        setFormErrors((e) => ({ ...e, recipients: '' }));
      }
      return next;
    });
  };

  const handleSelectAll = (list) => {
    const listIds = list.map((e) => e.employee_id || e.id);
    const allSelected = listIds.every((id) => selectedEmployees.includes(id));
    if (allSelected) {
      setSelectedEmployees((prev) => prev.filter((id) => !listIds.includes(id)));
    } else {
      setSelectedEmployees((prev) => Array.from(new Set([...prev, ...listIds])));
      if (formErrors.recipients) {
        setFormErrors((e) => ({ ...e, recipients: '' }));
      }
    }
  };

  return (
    <div className="announcements-management-view animate-fade-in">
      <PageHeader
        title="Announcements Management"
        subtitle="Publish company-wide announcements, notices, and updates"
        breadcrumb={[
          { label: 'Admin', path: '/admin/dashboard' },
          { label: 'Announcements' },
        ]}
        actionButton={
          <button
            type="button"
            className="btn-primary-action"
            onClick={handleOpenAdd}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            <span>Create Announcement</span>
          </button>
        }
      />

      {successMessage && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '12px 18px', borderRadius: '12px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: '600' }}>
          <CheckCircle size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '12px 18px', borderRadius: '12px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: '600' }}>
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="management-page-card">
        {/* Search */}
        <div className="filter-toolbar">
          <div className="search-input-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search announcements by title, keywords or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* List of Announcements */}
        {filteredAnnouncements.length === 0 ? (
          <EmptyState
            title="No announcements published."
            description="No announcements match your search. Create one using the button above."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredAnnouncements.map((item) => {
              const annType = item.announcement_type || item.announcementType || item.type || 'General';
              const recipType = item.recipient_type || item.recipientType || 'All Employees';
              const recipCount = Array.isArray(item.recipients || item.recipient_ids) ? (item.recipients || item.recipient_ids).length : 0;

              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
                        {/* Type Badge */}
                        <span
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: '700',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            backgroundColor: '#ede9fe',
                            color: '#6d28d9',
                          }}
                        >
                          {annType}
                        </span>

                        {/* Priority Badge */}
                        <span
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: '700',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            backgroundColor: item.priority === 'High' || item.priority === 'Urgent' ? '#fef2f2' : '#ecfdf5',
                            color: item.priority === 'High' || item.priority === 'Urgent' ? '#dc2626' : '#047857',
                          }}
                        >
                          {item.priority || 'Normal'} Priority
                        </span>

                        {/* Audience Badge */}
                        <span
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: '600',
                            padding: '3px 10px',
                            borderRadius: '999px',
                            backgroundColor: recipType === 'Selected Members' ? '#eff6ff' : '#f1f5f9',
                            color: recipType === 'Selected Members' ? '#1d4ed8' : '#475569',
                          }}
                        >
                          {recipType === 'Selected Members' ? `Selected Members (${recipCount})` : 'All Employees'}
                        </span>

                        <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '4px' }}>
                          By <strong>{item.author}</strong> on {item.date}
                        </span>
                      </div>

                      <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0b3d2b', margin: 0 }}>
                        {item.title}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="table-action-btn btn-view-edit"
                        onClick={() => handleOpenEdit(item)}
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="table-action-btn btn-delete"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-line' }}>
                    {item.message}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Publish / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Announcement' : 'Publish Announcement'}
        subtitle="Broadcast to all employees across the company or selected members"
        maxWidth="580px"
      >
        <form onSubmit={handleSave} style={{ position: 'relative' }}>
          
          {/* 1. Announcement Title */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: '600', color: '#1e293b', marginBottom: '6px', display: 'block' }}>
              Announcement Title <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              className="form-input-auth"
              placeholder="Enter announcement title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: '' }));
              }}
              style={{
                borderColor: formErrors.title ? '#ef4444' : undefined,
                boxShadow: formErrors.title ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : undefined,
              }}
            />
            {formErrors.title && (
              <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={12} />
                {formErrors.title}
              </span>
            )}
          </div>

          {/* 2. Message Content */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ fontWeight: '600', color: '#1e293b', margin: 0 }}>
                Message Content <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                {message.length} characters
              </span>
            </div>
            <textarea
              rows={4}
              required
              className="form-input-auth"
              style={{
                height: '100px',
                padding: '10px 14px',
                resize: 'vertical',
                borderColor: formErrors.message ? '#ef4444' : undefined,
                boxShadow: formErrors.message ? '0 0 0 3px rgba(239, 68, 68, 0.1)' : undefined,
              }}
              placeholder="Write announcement message..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (formErrors.message) setFormErrors((prev) => ({ ...prev, message: '' }));
              }}
            />
            {formErrors.message && (
              <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <AlertCircle size={12} />
                {formErrors.message}
              </span>
            )}
          </div>

          {/* 3. Announcement Type and Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '16px' }}>
            
            {/* Announcement Type Dropdown (Screenshots 2 & 3) */}
            <div className="form-group" ref={typeRef} style={{ position: 'relative', marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: '600', color: '#1e293b', marginBottom: '6px', display: 'block' }}>
                Announcement Type <span style={{ color: '#ef4444' }}>*</span>
              </label>

              <div
                id="announcement-type-dropdown"
                tabIndex={0}
                role="button"
                aria-haspopup="listbox"
                aria-expanded={isTypeOpen}
                onClick={() => {
                  setIsTypeOpen(!isTypeOpen);
                  setIsRecipientOpen(false);
                  setIsPriorityOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsTypeOpen(!isTypeOpen);
                    setIsRecipientOpen(false);
                    setIsPriorityOpen(false);
                  } else if (e.key === 'Escape') {
                    setIsTypeOpen(false);
                  }
                }}
                style={{
                  width: '100%',
                  minHeight: '42px',
                  padding: '0 14px',
                  backgroundColor: '#ffffff',
                  border: isTypeOpen ? '1.5px solid #7047eb' : '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: isTypeOpen ? '0 0 0 3px rgba(112, 71, 235, 0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: '0.925rem', color: '#1e293b', fontWeight: '500' }}>
                  {announcementType || 'General'}
                </span>
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="#7047eb"
                  style={{
                    transform: isTypeOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    flexShrink: 0,
                  }}
                >
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              </div>

              {/* Type Dropdown Options (Screenshot 2) */}
              {isTypeOpen && (
                <div
                  role="listbox"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                    zIndex: 90,
                    overflowY: 'auto',
                    padding: '4px 0',
                    animation: 'fadeIn 0.15s ease-out',
                  }}
                >
                  {ANNOUNCEMENT_TYPES.map((opt) => {
                    const isSelected = opt.value === announcementType;
                    return (
                      <div
                        key={opt.value}
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={0}
                        onClick={() => {
                          setAnnouncementType(opt.value);
                          setIsTypeOpen(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setAnnouncementType(opt.value);
                            setIsTypeOpen(false);
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f5f3ff';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        style={{
                          padding: '10px 16px',
                          fontSize: '0.9rem',
                          fontWeight: isSelected ? '600' : '500',
                          color: isSelected ? '#5b21b6' : '#1e293b',
                          backgroundColor: isSelected ? '#ede9fe' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          outline: 'none',
                          transition: 'background-color 0.1s',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: isSelected ? '600' : '500' }}>{opt.label}</div>
                          <div style={{ fontSize: '0.725rem', color: '#64748b' }}>{opt.desc}</div>
                        </div>
                        {isSelected && <Check size={16} color="#7047eb" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Priority Selection */}
            <div className="form-group" ref={priorityRef} style={{ position: 'relative', marginBottom: 0 }}>
              <label className="form-label" style={{ fontWeight: '600', color: '#1e293b', marginBottom: '6px', display: 'block' }}>
                Priority
              </label>

              <div
                id="announcement-priority-dropdown"
                tabIndex={0}
                role="button"
                aria-haspopup="listbox"
                aria-expanded={isPriorityOpen}
                onClick={() => {
                  setIsPriorityOpen(!isPriorityOpen);
                  setIsTypeOpen(false);
                  setIsRecipientOpen(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsPriorityOpen(!isPriorityOpen);
                    setIsTypeOpen(false);
                    setIsRecipientOpen(false);
                  } else if (e.key === 'Escape') {
                    setIsPriorityOpen(false);
                  }
                }}
                style={{
                  width: '100%',
                  minHeight: '42px',
                  padding: '0 14px',
                  backgroundColor: '#ffffff',
                  border: isPriorityOpen ? '1.5px solid #7047eb' : '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: isPriorityOpen ? '0 0 0 3px rgba(112, 71, 235, 0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  userSelect: 'none',
                }}
              >
                <span style={{ fontSize: '0.925rem', color: '#1e293b', fontWeight: '500' }}>
                  {priority || 'Normal'}
                </span>
                <ChevronDown
                  size={16}
                  color="#64748b"
                  style={{
                    transform: isPriorityOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    flexShrink: 0,
                  }}
                />
              </div>

              {/* Priority Options */}
              {isPriorityOpen && (
                <div
                  role="listbox"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                    zIndex: 90,
                    overflowY: 'auto',
                    padding: '4px 0',
                    animation: 'fadeIn 0.15s ease-out',
                  }}
                >
                  {PRIORITIES.map((opt) => {
                    const isSelected = opt.value === priority;
                    return (
                      <div
                        key={opt.value}
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={0}
                        onClick={() => {
                          setPriority(opt.value);
                          setIsPriorityOpen(false);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setPriority(opt.value);
                            setIsPriorityOpen(false);
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        style={{
                          padding: '10px 16px',
                          fontSize: '0.9rem',
                          fontWeight: isSelected ? '600' : '500',
                          color: isSelected ? '#0b3d2b' : '#1e293b',
                          backgroundColor: isSelected ? '#f0fdf4' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          outline: 'none',
                        }}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check size={16} color="#0b3d2b" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* 4. Author / Department Field */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: '600', color: '#1e293b', marginBottom: '6px', display: 'block' }}>
              Author / Department
            </label>
            <input
              type="text"
              className="form-input-auth"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g. Farook or Admin Office"
              style={{
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
              }}
            />
          </div>

          {/* 5. Send To Dropdown (Screenshot 3) */}
          <div className="form-group" ref={recipientRef} style={{ position: 'relative', marginBottom: '16px' }}>
            <label className="form-label" style={{ fontWeight: '600', color: '#1e293b', marginBottom: '6px', display: 'block' }}>
              Send To <span style={{ color: '#ef4444' }}>*</span>
            </label>

            <div
              id="send-to-dropdown"
              tabIndex={0}
              role="button"
              aria-haspopup="listbox"
              aria-expanded={isRecipientOpen}
              onClick={() => {
                setIsRecipientOpen(!isRecipientOpen);
                setIsTypeOpen(false);
                setIsPriorityOpen(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsRecipientOpen(!isRecipientOpen);
                  setIsTypeOpen(false);
                  setIsPriorityOpen(false);
                } else if (e.key === 'Escape') {
                  setIsRecipientOpen(false);
                }
              }}
              style={{
                width: '100%',
                minHeight: '42px',
                padding: '0 14px',
                backgroundColor: '#ffffff',
                border: isRecipientOpen ? '1.5px solid #7047eb' : '1.5px solid #cbd5e1',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                outline: 'none',
                boxShadow: isRecipientOpen ? '0 0 0 3px rgba(112, 71, 235, 0.12)' : '0 1px 2px rgba(0,0,0,0.04)',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                userSelect: 'none',
              }}
            >
              <span style={{ fontSize: '0.925rem', color: '#1e293b', fontWeight: '500' }}>
                {recipientType}
              </span>
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="#7047eb"
                style={{
                  transform: isRecipientOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  flexShrink: 0,
                }}
              >
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </div>

            {/* Recipient Dropdown Options */}
            {isRecipientOpen && (
              <div
                role="listbox"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  backgroundColor: '#ffffff',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                  zIndex: 90,
                  padding: '4px 0',
                  animation: 'fadeIn 0.15s ease-out',
                }}
              >
                {RECIPIENT_TYPES.map((opt) => {
                  const isSelected = opt.value === recipientType;
                  return (
                    <div
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      tabIndex={0}
                      onClick={() => {
                        setRecipientType(opt.value);
                        setIsRecipientOpen(false);
                        if (opt.value === 'All Employees') {
                          setSelectedEmployees([]);
                          if (formErrors.recipients) {
                            setFormErrors((prev) => ({ ...prev, recipients: '' }));
                          }
                        } else if (opt.value === 'Selected Members') {
                          if (employees.length === 0) {
                            loadEmployees();
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setRecipientType(opt.value);
                          setIsRecipientOpen(false);
                          if (opt.value === 'All Employees') {
                            setSelectedEmployees([]);
                          }
                        }
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#f5f3ff';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      style={{
                        padding: '10px 16px',
                        fontSize: '0.9rem',
                        fontWeight: isSelected ? '600' : '500',
                        color: isSelected ? '#5b21b6' : '#1e293b',
                        backgroundColor: isSelected ? '#ede9fe' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        outline: 'none',
                        transition: 'background-color 0.1s',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: isSelected ? '600' : '500' }}>{opt.label}</div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b' }}>{opt.desc}</div>
                      </div>
                      {isSelected && <Check size={16} color="#7047eb" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 6. Selected Members Employee Directory Section */}
          {recipientType === 'Selected Members' && (
            <div style={{ marginBottom: '18px', animation: 'fadeIn 0.2s ease-in-out' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label className="form-label" style={{ fontWeight: '700', color: '#1e1b4b', margin: 0, fontSize: '0.925rem' }}>
                  Select Employees <span style={{ color: '#ef4444' }}>*</span>
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
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search employees by name or email..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="form-input-auth"
                  style={{
                    paddingLeft: '34px',
                    height: '38px',
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

              {/* Scrollable Checkbox List */}
              <div
                style={{
                  maxHeight: '190px',
                  overflowY: 'auto',
                  border: formErrors.recipients ? '1.5px solid #ef4444' : '1px solid #e2e8f0',
                  borderRadius: '10px',
                  backgroundColor: '#ffffff',
                }}
              >
                {isLoadingEmployees ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                    Loading active employee directory...
                  </div>
                ) : filteredEmployeesList.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.85rem', color: '#64748b' }}>
                    {employeeSearch ? 'No employees match your search.' : 'No active employees found.'}
                  </div>
                ) : (
                  filteredEmployeesList.map((emp) => {
                    const empKey = emp.employee_id || emp.id;
                    const isChecked = selectedEmployees.includes(empKey);
                    const name = emp.full_name || emp.fullName || emp.name || 'Employee';
                    const email = emp.email || '';
                    const dept = emp.department || emp.role || '';

                    return (
                      <div
                        key={empKey}
                        onClick={() => handleToggleEmployee(empKey)}
                        style={{
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer',
                          backgroundColor: isChecked ? '#f5f3ff' : 'transparent',
                          transition: 'background-color 0.12s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            style={{
                              width: '16px',
                              height: '16px',
                              cursor: 'pointer',
                              accentColor: '#6347f7',
                            }}
                          />
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1e293b' }}>
                              {name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {email}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {dept && (
                            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                              {dept}
                            </span>
                          )}
                          <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#6347f7' }}>
                            {empKey}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {formErrors.recipients && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} />
                  {formErrors.recipients}
                </span>
              )}
            </div>
          )}

          {/* 7. Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
            <button
              type="button"
              className="btn-secondary-gray"
              style={{ width: 'auto', padding: '0 18px', height: '42px' }}
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-purple"
              style={{ width: 'auto', padding: '0 24px', height: '42px', opacity: isSaving ? 0.7 : 1 }}
              disabled={isSaving}
            >
              {isSaving
                ? 'Processing...'
                : editingItem
                ? 'Update Announcement'
                : 'Publish Announcement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
