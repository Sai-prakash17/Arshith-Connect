import React, { useState, useEffect } from 'react';
import { Briefcase, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { assignmentService } from '../../services/assignmentService';

export default function EmployeeWorkAssignments() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setIsLoading(true);
        const data = await assignmentService.getAssignments();
        setTasks(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Failed to fetch assignments', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssignments();
  }, []);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '32px' }}>
      <PageHeader
        title="Work Assignments"
        subtitle="Current sprint tasks, milestones, and deliverable deadlines"
        breadcrumb={[{ label: 'Portal', path: '/employee/dashboard' }, { label: 'Work Assignments' }]}
        showBack={true}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {tasks.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '36px',
              textAlign: 'center',
              border: '1px dashed #cbd5e1',
              color: '#64748b',
            }}
          >
            <Briefcase size={36} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: '#0b3d2b', marginBottom: '4px' }}>
              No Active Work Assignments
            </h3>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>
              You are all caught up! New tasks assigned by your project lead will appear here.
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      color: task.priority === 'High' ? '#dc2626' : '#2563eb',
                      backgroundColor: task.priority === 'High' ? '#fef2f2' : '#eff6ff',
                      padding: '3px 8px',
                      borderRadius: '20px',
                    }}
                  >
                    {task.priority || 'Normal'} Priority
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={13} />
                    Due: {task.deadline || 'Upcoming'}
                  </span>
                </div>

                <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#0b3d2b', marginBottom: '6px' }}>
                  {task.title}
                </h3>
                <p style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.45, marginBottom: '16px' }}>
                  {task.description || 'Deliver project milestones according to team sprint requirements.'}
                </p>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>
                  <span>Progress</span>
                  <span>{task.progress || 0}%</span>
                </div>
                <div style={{ height: '7px', backgroundColor: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${task.progress || 0}%`,
                      height: '100%',
                      backgroundColor: '#10b981',
                      borderRadius: '999px',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
