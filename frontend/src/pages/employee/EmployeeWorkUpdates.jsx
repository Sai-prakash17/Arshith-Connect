import React, { useState, useEffect } from 'react';
import { Send, FileClock, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { workUpdateService } from '../../services/workUpdateService';

export default function EmployeeWorkUpdates() {
  const [updates, setUpdates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayUpdate, setTodayUpdate] = useState('');
  const [blockers, setBlockers] = useState('');
  const [submittedMessage, setSubmittedMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUpdates = async () => {
    try {
      setIsLoading(true);
      const data = await workUpdateService.getWorkUpdates();
      setUpdates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to fetch employee updates', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!todayUpdate.trim()) return;

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await workUpdateService.submitWorkUpdate({
        tasksCompleted: todayUpdate.trim(),
        blockers: blockers.trim() || 'None',
        tag: 'Operations',
      });

      setTodayUpdate('');
      setBlockers('');
      setSubmittedMessage('Daily work update submitted successfully to database!');
      setTimeout(() => setSubmittedMessage(''), 3500);
      fetchUpdates();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit work update');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '32px' }}>
      <PageHeader
        title="Daily Work Update"
        subtitle="Log today's accomplishments and report sprint blockers"
        breadcrumb={[{ label: 'Portal', path: '/employee/dashboard' }, { label: 'Work Update' }]}
        showBack={true}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Form Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '18px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0b3d2b', marginBottom: '14px' }}>
            Submit Today's Work Summary
          </h2>

          {submittedMessage && (
            <div
              style={{
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '0.85rem',
                fontWeight: '600',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle size={16} />
              <span>{submittedMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '0.85rem',
                fontWeight: '600',
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Tasks Completed / Progress Today *</label>
              <textarea
                required
                rows={4}
                className="form-input-auth"
                style={{ height: '95px', padding: '10px', resize: 'vertical' }}
                placeholder="List completed items, code commits, reviews, or client calls..."
                value={todayUpdate}
                onChange={(e) => setTodayUpdate(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label">Blockers / Challenges (Optional)</label>
              <input
                type="text"
                className="form-input-auth"
                placeholder="Any impediment or pending reviews..."
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn-primary-purple"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Send size={15} />
              <span>SUBMIT WORK UPDATE</span>
            </button>
          </form>
        </div>

        {/* History Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '18px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
          }}
        >
          <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0b3d2b', marginBottom: '14px' }}>
            Recent Work Submissions
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {updates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b', fontSize: '0.875rem' }}>
                <FileClock size={32} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
                <p style={{ margin: 0 }}>No work updates logged yet. Submit your first update above.</p>
              </div>
            ) : (
              updates.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '14px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '700', color: '#0b3d2b' }}>{item.date}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {item.time}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#1e293b', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                    {item.tasksCompleted}
                  </p>
                  {item.blockers && item.blockers !== 'None' && (
                    <div style={{ fontSize: '0.75rem', color: '#dc2626' }}>
                      Blocker: {item.blockers}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
