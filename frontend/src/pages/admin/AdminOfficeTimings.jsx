import React, { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, AlertCircle, Trash2, Edit3, Plus } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { officeTimingService } from '../../services/officeTimingService';

export default function AdminOfficeTimings() {
  const [timingType, setTimingType] = useState('REGULAR'); // 'REGULAR' | 'SPECIAL'

  const [startTime, setStartTime] = useState('09:30');
  const [endTime, setEndTime] = useState('18:30');
  const [gracePeriod, setGracePeriod] = useState(2);

  // Special-day specific fields
  const [specialDate, setSpecialDate] = useState('');
  const [specialOccasion, setSpecialOccasion] = useState('');
  const [editingSpecialId, setEditingSpecialId] = useState(null);

  // List of saved special days
  const [specialDays, setSpecialDays] = useState([]);

  // Feedback states
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTimings = async () => {
    try {
      setIsLoading(true);
      const data = await officeTimingService.getOfficeTimings();
      if (data?.regular) {
        setStartTime(data.regular.startTime || '09:30');
        setEndTime(data.regular.endTime || '18:30');
        setGracePeriod(data.regular.graceMinutes ?? 2);
      }
      if (Array.isArray(data?.specialDays)) {
        setSpecialDays(
          data.specialDays.map((s) => ({
            id: s.id,
            date: s.specialDate || s.date || '',
            occasion: s.specialOccasion || s.occasion || '',
            startTime: s.startTime || '09:30',
            endTime: s.endTime || '18:30',
            graceMinutes: s.graceMinutes ?? 2,
          }))
        );
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load office timings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimings();
  }, []);

  const validateForm = () => {
    if (!startTime || !startTime.trim()) {
      return 'Office start time is required.';
    }
    if (!endTime || !endTime.trim()) {
      return 'Office end time is required.';
    }
    if (startTime >= endTime) {
      return 'Office end time must be after office start time.';
    }
    const graceNum = parseInt(gracePeriod, 10);
    if (isNaN(graceNum) || graceNum < 0 || graceNum > 180) {
      return 'Grace period must be a valid number of minutes (0 to 180).';
    }
    if (timingType === 'SPECIAL') {
      if (!specialDate) {
        return 'Please choose a special date for the custom schedule.';
      }
      if (!specialOccasion.trim()) {
        return 'Please enter a description or occasion name for the special timing.';
      }
    }
    return null;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const validationErr = validateForm();
    if (validationErr) {
      setErrorMessage(validationErr);
      return;
    }

    try {
      setIsSaving(true);
      await officeTimingService.saveOfficeTimings({
        timingType,
        startTime,
        endTime,
        graceMinutes: parseInt(gracePeriod, 10),
        specialDate: timingType === 'SPECIAL' ? specialDate : null,
        specialOccasion: timingType === 'SPECIAL' ? specialOccasion.trim() : null,
      });

      if (timingType === 'REGULAR') {
        setSuccessMessage(
          `Default office timings saved successfully: ${startTime} to ${endTime} (Grace: ${gracePeriod} mins). Settings active for company-wide attendance rules.`
        );
      } else {
        setSuccessMessage(`Special-day timing for ${specialDate} (${specialOccasion}) successfully saved.`);
        setSpecialDate('');
        setSpecialOccasion('');
        setEditingSpecialId(null);
      }
      fetchTimings();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save office timings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSpecial = (item) => {
    setTimingType('SPECIAL');
    setEditingSpecialId(item.id);
    setSpecialDate(item.date);
    setSpecialOccasion(item.occasion);
    setStartTime(item.startTime);
    setEndTime(item.endTime);
    setGracePeriod(item.graceMinutes);
    setSuccessMessage('');
    setErrorMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSpecial = async (id) => {
    if (window.confirm('Delete this special-day schedule?')) {
      try {
        await officeTimingService.deleteSpecialTiming(id);
        if (editingSpecialId === id) {
          setEditingSpecialId(null);
          setSpecialDate('');
          setSpecialOccasion('');
        }
        setSuccessMessage('Special-day schedule removed successfully.');
        setTimeout(() => setSuccessMessage(''), 3000);
        fetchTimings();
      } catch (err) {
        setErrorMessage(err.message || 'Failed to delete special timing');
      }
    }
  };

  const handleSwitchToRegular = () => {
    setTimingType('REGULAR');
    setEditingSpecialId(null);
    setSpecialDate('');
    setSpecialOccasion('');
    setErrorMessage('');
  };

  const handleSwitchToSpecial = () => {
    setTimingType('SPECIAL');
    setErrorMessage('');
  };

  return (
    <div className="office-timings-view animate-fade-in">
      <PageHeader
        title="Office Timings"
        subtitle="Set default office hours or configure timings for a specific date."
        breadcrumb={[
          { label: 'Admin', path: '/admin/dashboard' },
          { label: 'Office Timings' },
        ]}
      />


      {/* Feedback Alerts */}
      {successMessage && (
        <div className="timings-alert-success">
          <CheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="timings-alert-error">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Timing Configuration Form Card matching Screenshot 1 */}
      <form onSubmit={handleSave} className="office-timings-form-card" noValidate>
        {/* Timing Type Selector */}
        <div className="timings-field-group">
          <label className="timings-label">Timing Type</label>

          <div className="timings-type-selector">
            <div
              className="timing-radio-option"
              onClick={handleSwitchToRegular}
              role="radio"
              aria-checked={timingType === 'REGULAR'}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') handleSwitchToRegular(); }}
            >
              <div className={`timing-radio-circle ${timingType === 'REGULAR' ? 'active' : ''}`}>
                {timingType === 'REGULAR' && <div className="timing-radio-dot" />}
              </div>
              <span className="timing-radio-text">Regular Office Timings (Default)</span>
            </div>

            <div
              className="timing-radio-option"
              onClick={handleSwitchToSpecial}
              role="radio"
              aria-checked={timingType === 'SPECIAL'}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') handleSwitchToSpecial(); }}
            >
              <div className={`timing-radio-circle ${timingType === 'SPECIAL' ? 'active' : ''}`}>
                {timingType === 'SPECIAL' && <div className="timing-radio-dot" />}
              </div>
              <span className="timing-radio-text">Special-Day Timings</span>
            </div>
          </div>
        </div>

        {/* Special-Day specific date & occasion picker */}
        {timingType === 'SPECIAL' && (
          <div style={{ backgroundColor: '#f0fdf9', border: '1px solid #ccfbf1', borderRadius: '14px', padding: '16px', marginBottom: '22px' }}>
            <div style={{ fontWeight: '700', color: '#0f766e', fontSize: '0.9rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={16} />
              <span>{editingSpecialId ? 'Editing Special-Day Timing' : 'Configure Custom Schedule'}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div>
                <label className="timings-label" style={{ fontSize: '0.85rem' }}>Special Date *</label>
                <div className="timing-input-container">
                  <input
                    type="date"
                    required
                    className="timing-input-text"
                    value={specialDate}
                    onChange={(e) => setSpecialDate(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="timings-label" style={{ fontSize: '0.85rem' }}>Occasion / Description *</label>
                <div className="timing-input-container">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Diwali Eve Half-Day"
                    className="timing-input-text"
                    value={specialOccasion}
                    onChange={(e) => setSpecialOccasion(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Office Start Time Field matching Screenshot 1 */}
        <div className="timings-field-group">
          <label className="timings-label" htmlFor="office-start-time">Office Start Time</label>
          <div className="timing-input-container">
            <input
              id="office-start-time"
              type="text"
              required
              className="timing-input-time"
              placeholder="09:30"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
        </div>

        {/* Office End Time Field matching Screenshot 1 */}
        <div className="timings-field-group">
          <label className="timings-label" htmlFor="office-end-time">Office End Time</label>
          <div className="timing-input-container">
            <input
              id="office-end-time"
              type="text"
              required
              className="timing-input-time"
              placeholder="18:30"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        {/* Late Check-in Grace Period (minutes) Field matching Screenshot 1 */}
        <div className="timings-field-group">
          <label className="timings-label" htmlFor="office-grace-period">Late Check-in Grace Period (minutes)</label>
          <div className="timing-input-container">
            <input
              id="office-grace-period"
              type="number"
              min="0"
              max="180"
              required
              className="timing-input-number"
              placeholder="2"
              value={gracePeriod}
              onChange={(e) => setGracePeriod(e.target.value)}
            />
          </div>
        </div>

        {/* Submit Save Button matching Screenshot 1 */}
        <button
          type="submit"
          className="btn-save-office-timings"
          disabled={isSaving}
        >
          {isSaving ? 'Saving Office Timings...' : 'Save Office Timings'}
        </button>
      </form>

      {/* Configured Special-Day Timings Section */}
      <section style={{ marginTop: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0b3d2b', margin: 0 }}>
              Configured Special-Day Timings
            </h3>
            <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Custom working hours scheduled for holidays, events, and festival eve dismissals
            </p>
          </div>
        </div>

        {specialDays.length === 0 ? (
          <div
            style={{
              padding: '24px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px dashed #cbd5e1',
              textAlign: 'center',
              color: '#64748b',
              fontSize: '0.9rem',
            }}
          >
            No custom special-day schedules set. Select "Special-Day Timings" above to configure a specific date.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {specialDays.map((sd) => (
              <div
                key={sd.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  padding: '14px 18px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '700', color: '#0b3d2b', fontSize: '0.95rem' }}>
                      {sd.occasion}
                    </span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: '#0369a1',
                        backgroundColor: '#e0f2fe',
                        padding: '2px 8px',
                        borderRadius: '999px',
                      }}
                    >
                      {sd.date}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '4px' }}>
                    Working Hours: <strong>{sd.startTime} &ndash; {sd.endTime}</strong> &bull; Grace Period: <strong>{sd.graceMinutes} mins</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleEditSpecial(sd)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                      color: '#0f766e',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <Edit3 size={13} />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSpecial(sd.id)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid #fee2e2',
                      backgroundColor: '#fef2f2',
                      color: '#dc2626',
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
