import React, { useState, useEffect } from 'react';
import { Megaphone, Calendar, Tag, Search } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { announcementService } from '../../services/announcementService';

export default function EmployeeAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [filterPriority, setFilterPriority] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        setIsLoading(true);
        const data = await announcementService.getAnnouncements();
        setAnnouncements(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Failed to fetch announcements', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnnouncements();
  }, []);

  const filtered = announcements.filter(
    (ann) => filterPriority === 'All' || ann.priority === filterPriority
  );

  return (
    <div className="employee-announcements-view animate-fade-in">
      <PageHeader
        title="Announcements & Notices"
        subtitle="Official company circulars, policy updates, and operational notices"
        breadcrumb={[{ label: 'Employee', path: '/employee/dashboard' }, { label: 'Announcements' }]}
      />

      <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
        {['All', 'High', 'Normal'].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setFilterPriority(p)}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: '600',
              border: filterPriority === p ? '1px solid #0b3d2b' : '1px solid #e2e8f0',
              backgroundColor: filterPriority === p ? '#0b3d2b' : '#ffffff',
              color: filterPriority === p ? '#ffffff' : '#475569',
              cursor: 'pointer',
            }}
          >
            {p === 'All' ? 'All Notices' : `${p} Priority`}
          </button>
        ))}
      </div>

      <div className="announcements-list">
        {filtered.map((item) => (
          <div key={item.id} className="announcement-item-card" style={{ padding: '20px' }}>
            <div className="announcement-top-meta">
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontWeight: '700', color: '#0b3d2b' }}>{item.author}</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#ede9fe',
                    color: '#6d28d9',
                  }}
                >
                  {item.announcement_type || item.announcementType || item.type || 'General'}
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    backgroundColor: item.priority === 'High' || item.priority === 'Urgent' ? '#fee2e2' : '#ecfdf5',
                    color: item.priority === 'High' || item.priority === 'Urgent' ? '#dc2626' : '#047857',
                  }}
                >
                  {item.priority || 'Normal'}
                </span>
              </div>
              <span>{item.date}</span>
            </div>

            <div className="announcement-item-title" style={{ fontSize: '1.05rem', margin: '4px 0 8px 0' }}>
              {item.title}
            </div>

            <div className="announcement-item-body" style={{ fontSize: '0.88rem', lineHeight: '1.55', whiteSpace: 'pre-line' }}>
              {item.message}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
