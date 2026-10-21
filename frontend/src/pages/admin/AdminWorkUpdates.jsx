import React, { useState, useEffect } from 'react';
import { MessageSquare, Clock, Plus, Tag, CheckCircle2, AlertCircle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { workUpdateService } from '../../services/workUpdateService';

export default function AdminWorkUpdates() {
  const [updates, setUpdates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [tagFilter, setTagFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [empName, setEmpName] = useState('Administrator');
  const [updateText, setUpdateText] = useState('');
  const [tag, setTag] = useState('Operations');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchUpdates = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const data = await workUpdateService.getWorkUpdates();
      setUpdates(Array.isArray(data) ? data : []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch work updates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, []);

  const filtered = updates.filter((u) => tagFilter === 'ALL' || (u.tag || 'Operations') === tagFilter);

  const handlePostUpdate = async (e) => {
    e.preventDefault();
    if (!updateText.trim()) return;

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await workUpdateService.submitWorkUpdate({
        employeeName: empName.trim() || 'Administrator',
        tasksCompleted: updateText.trim(),
        tag,
      });

      setUpdateText('');
      setIsModalOpen(false);
      setSuccessMessage('Work update published successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchUpdates();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit update');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="work-updates-view animate-fade-in">
      <PageHeader
        title="Work Updates"
        subtitle="Daily standup logs, sprint activity, and status reports"
        breadcrumb={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Work Updates' }]}
        actionButton={
          <button
            type="button"
            className="btn-primary-action"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={15} />
            <span>Post Update</span>
          </button>
        }
      />

      {successMessage && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '600' }}>
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: '600' }}>
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {['ALL', 'Deployment', 'Design', 'Development', 'HR', 'Operations'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTagFilter(t)}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: '700',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: tagFilter === t ? '#0b3d2b' : '#ffffff',
              color: tagFilter === t ? '#ffffff' : '#475569',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
              transition: 'all 0.15s ease'
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No work updates available."
          description="No daily standup or progress updates posted yet. Use 'Post Update' to share activity."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((u) => (
            <div
              key={u.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '16px 20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: '600', color: '#0b3d2b', fontSize: '0.925rem' }}>{u.employeeName || u.emp}</span>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{u.time || u.date}</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: '#334155', margin: '0 0 10px 0', lineHeight: 1.45 }}>{u.tasksCompleted || u.text}</p>
              <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#0284c7', backgroundColor: '#e0f2fe', padding: '3px 10px', borderRadius: '999px' }}>
                {u.tag || 'Operations'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Post Update Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Post Standup / Work Update"
        subtitle="Share operational progress or sprint milestone notes"
      >
        <form onSubmit={handlePostUpdate}>
          <div className="form-group">
            <label className="form-label">Team Member / Author</label>
            <input
              type="text"
              required
              className="form-input-auth"
              value={empName}
              onChange={(e) => setEmpName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category Tag</label>
            <select
              className="form-input-auth"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            >
              <option value="Operations">Operations</option>
              <option value="Deployment">Deployment</option>
              <option value="Development">Development</option>
              <option value="Design">Design</option>
              <option value="HR">HR</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Update Content</label>
            <textarea
              rows={3}
              required
              className="form-input-auth"
              style={{ height: '80px', padding: '10px' }}
              placeholder="What tasks were delivered today? Any blockers?"
              value={updateText}
              onChange={(e) => setUpdateText(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn-secondary-gray"
              style={{ width: 'auto', padding: '0 16px', height: '38px' }}
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-purple"
              style={{ width: 'auto', padding: '0 18px', height: '38px' }}
            >
              Publish Update
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
