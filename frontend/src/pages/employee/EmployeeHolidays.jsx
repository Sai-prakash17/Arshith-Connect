import React, { useState, useEffect } from 'react';
import { Sun, Calendar, Search } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { holidayService } from '../../services/holidayService';

export default function EmployeeHolidays() {
  const [holidays, setHolidays] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        setIsLoading(true);
        const data = await holidayService.getHolidays();
        setHolidays(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Failed to fetch holidays', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHolidays();
  }, []);

  const filteredHolidays = holidays.filter(
    (h) =>
      (h.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (h.type || '').toLowerCase().includes(search.toLowerCase()) ||
      (h.date || '').includes(search)
  );

  const nextHoliday = holidays[0] || {
    name: 'Upcoming Holiday',
    date: '2026-10-20',
    type: 'National Holiday',
    description: 'Annual corporate celebration'
  };

  return (
    <div className="employee-holidays-view animate-fade-in">
      <PageHeader
        title="Company Holidays"
        subtitle="Annual observed holidays, festival leaves, and non-working days"
        breadcrumb={[{ label: 'Employee', path: '/employee/dashboard' }, { label: 'Holidays' }]}
      />

      {/* Next Upcoming Holiday Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0b3d2b 0%, #14532d 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          color: '#ffffff',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: '#86efac' }}>
            Next Upcoming Holiday
          </span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '4px 0' }}>
            {nextHoliday.name}
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#dcfce7', margin: 0 }}>
            {nextHoliday.date} &bull; {nextHoliday.type}
          </p>
        </div>

        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(4px)',
            borderRadius: '12px',
            padding: '10px 18px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '1.6rem', fontWeight: '800', lineHeight: 1 }}>4</div>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#bbf7d0', marginTop: '3px' }}>
            Days Remaining
          </div>
        </div>
      </div>

      {/* Holidays List */}
      <div className="management-page-card">
        <div className="filter-toolbar">
          <div className="search-input-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search holidays by name or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Holiday Name</th>
                <th>Date</th>
                <th>Holiday Type</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredHolidays.map((hol) => (
                <tr key={hol.id}>
                  <td style={{ fontWeight: '700', color: '#0b3d2b' }}>{hol.name}</td>
                  <td style={{ fontWeight: '600' }}>{hol.date}</td>
                  <td>
                    <span className="badge-status badge-present">
                      {hol.type}
                    </span>
                  </td>
                  <td style={{ color: '#475569' }}>{hol.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
