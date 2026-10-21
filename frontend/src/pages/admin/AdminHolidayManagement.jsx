import React, { useState, useEffect } from 'react';
import { Search, Plus, Trash2, Edit2, CalendarDays, AlertCircle, CheckCircle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { holidayService } from '../../services/holidayService';

export default function AdminHolidayManagement() {
  const [holidays, setHolidays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('2026');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formType, setFormType] = useState('National Holiday');

  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const data = await holidayService.getHolidays();
      setHolidays(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch holidays from server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const filteredHolidays = holidays.filter((item) => {
    const matchesSearch =
      (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = yearFilter === 'ALL' || item.date?.startsWith(yearFilter);
    return matchesSearch && matchesYear;
  });

  const handleOpenAdd = () => {
    setEditingHoliday(null);
    setFormName('');
    setFormDate('');
    setFormDescription('');
    setFormType('National Holiday');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (h) => {
    setEditingHoliday(h);
    setFormName(h.name);
    setFormDate(h.date);
    setFormDescription(h.description || '');
    setFormType(h.type || 'National Holiday');
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to remove this holiday from the calendar?')) {
      try {
        await holidayService.deleteHoliday(id);
        setSuccessMessage('Holiday deleted successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchHolidays();
      } catch (err) {
        setErrorMessage(err.message || 'Failed to delete holiday');
      }
    }
  };

  const handleSaveHoliday = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formDate) return;

    try {
      setIsSaving(true);
      setErrorMessage('');
      if (editingHoliday) {
        await holidayService.updateHoliday(editingHoliday.id, {
          name: formName.trim(),
          date: formDate,
          description: formDescription.trim(),
          type: formType,
        });
        setSuccessMessage('Holiday updated successfully');
      } else {
        await holidayService.addHoliday({
          name: formName.trim(),
          date: formDate,
          description: formDescription.trim(),
          type: formType,
        });
        setSuccessMessage('Holiday created successfully');
      }
      setTimeout(() => setSuccessMessage(''), 3000);
      setIsModalOpen(false);
      fetchHolidays();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save holiday');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="holiday-management-view animate-fade-in">
      <PageHeader
        title="Holiday Management"
        subtitle="Manage official calendar holidays and non-working business days"
        breadcrumb={[
          { label: 'Admin', path: '/admin/dashboard' },
          { label: 'Holidays' },
        ]}
        actionButton={
          <button
            type="button"
            className="btn-primary-action"
            onClick={handleOpenAdd}
          >
            <Plus size={16} />
            <span>Add Holiday</span>
          </button>
        }
      />

      {successMessage && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '600' }}>
          <CheckCircle size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '600' }}>
          <AlertCircle size={16} />
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
              placeholder="Search holidays by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-actions-group">
            <select
              className="filter-select"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <option value="ALL">All Years</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
          </div>
        </div>

        {/* Holidays Table */}
        {filteredHolidays.length === 0 ? (
          <EmptyState
            title="No holidays found"
            description="No holidays match your filter criteria. Click 'Add Holiday' to create one."
          />
        ) : (
          <div className="table-responsive-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Holiday Name</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHolidays.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: '#fff7ed',
                            color: '#ea580c',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <CalendarDays size={16} />
                        </div>
                        <span style={{ fontWeight: '700', color: '#0b3d2b' }}>
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontWeight: '600', color: '#1e293b', whiteSpace: 'nowrap' }}>
                      {item.date}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '999px',
                          backgroundColor:
                            item.type === 'National Holiday' ? '#ecfdf5' : '#eff6ff',
                          color: item.type === 'National Holiday' ? '#047857' : '#1d4ed8'
                        }}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td style={{ maxWidth: '280px', color: '#475569', fontSize: '0.825rem' }}>
                      {item.description}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          className="table-action-btn btn-view-edit"
                          onClick={() => handleOpenEdit(item)}
                          title="Edit Holiday"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="table-action-btn btn-delete"
                          onClick={() => handleDelete(item.id)}
                          title="Delete Holiday"
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Holiday Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingHoliday ? 'Edit Company Holiday' : 'Add New Company Holiday'}
        subtitle="Manage calendar non-working day for organization"
      >
        <form onSubmit={handleSaveHoliday}>
          <div className="form-group">
            <label className="form-label">Holiday Name</label>
            <input
              type="text"
              required
              className="form-input-auth"
              placeholder="e.g. Diwali Festival"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input
                type="date"
                required
                className="form-input-auth"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Type</label>
              <select
                className="form-input-auth"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
              >
                <option value="National Holiday">National Holiday</option>
                <option value="Company Holiday">Company Holiday</option>
                <option value="Optional Holiday">Optional Holiday</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              rows={3}
              className="form-input-auth"
              style={{ height: '70px', padding: '10px', resize: 'none' }}
              placeholder="Brief details about the holiday..."
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn-secondary-gray"
              style={{ width: 'auto', padding: '0 18px', height: '42px' }}
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-purple"
              style={{ width: 'auto', padding: '0 22px', height: '42px' }}
            >
              {editingHoliday ? 'Update Holiday' : 'Create Holiday'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
