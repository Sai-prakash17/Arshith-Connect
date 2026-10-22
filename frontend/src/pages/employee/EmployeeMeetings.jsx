import React, { useState, useEffect } from 'react';
import { Video, Calendar, Clock, Users, ExternalLink, Plus } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { meetingService } from '../../services/meetingService';

export default function EmployeeMeetings() {
  const [meetings, setMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        setIsLoading(true);
        const data = await meetingService.getMeetings();
        setMeetings(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Failed to fetch meetings', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMeetings();
  }, []);

  const handleJoinMeeting = (link) => {
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="employee-meetings-view animate-fade-in">
      <PageHeader
        title="Team Meetings"
        subtitle="Scheduled video conferences, standups, and departmental discussions"
        breadcrumb={[{ label: 'Employee', path: '/employee/dashboard' }, { label: 'Meetings' }]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {meetings.map((mtg) => (
          <div
            key={mtg.id}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '20px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span
                  style={{
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    fontSize: '0.725rem',
                    fontWeight: '700',
                    padding: '3px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {mtg.platform}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{mtg.duration}</span>
              </div>

              <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0b3d2b', marginBottom: '8px' }}>
                {mtg.title}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.825rem', color: '#64748b', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} />
                  <span>{mtg.time} &bull; {mtg.date}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={14} />
                  <span>Host: {mtg.host} ({mtg.attendees} attendees)</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary-purple"
              onClick={() => handleJoinMeeting(mtg.link)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}
            >
              <Video size={16} />
              <span>Join Video Call</span>
              <ExternalLink size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
