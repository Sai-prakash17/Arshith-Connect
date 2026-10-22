import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  CalendarOff,
  Sun,
  Video,
  Megaphone,
  Users,
  UserCheck,
  Briefcase,
  FileText,
  Clock,
  UserPlus,
  FileBarChart,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import ManagementCard from '../../components/common/ManagementCard';

export default function AdminManagement() {
  const navigate = useNavigate();

  const managementModules = [
    { title: 'Attendance', desc: 'Manage daily check-ins, logs, and work modes', icon: CalendarCheck, path: '/admin/attendance', color: 'green', badge: 'Daily' },
    { title: 'Leave Management', desc: 'Review, approve, or reject employee leave requests', icon: CalendarOff, path: '/admin/leaves', color: 'green', badge: '3 Pending' },
    { title: 'Holiday Management', desc: 'Schedule and publish annual company holidays', icon: Sun, path: '/admin/holidays', color: 'orange', badge: 'Annual' },
    { title: 'Meeting Management', desc: 'Organize video meetings and team standups', icon: Video, path: '/admin/meetings', color: 'blue', badge: 'Active' },
    { title: 'Announcements', desc: 'Broadcast notices and critical updates to staff', icon: Megaphone, path: '/admin/announcements', color: 'purple', badge: 'Broadcast' },
    { title: 'Employees', desc: 'Department breakdown and staff distribution', icon: Users, path: '/admin/employees', color: 'green', badge: 'Roster' },
    { title: 'Employee List', desc: 'Complete searchable staff directory and details', icon: UserCheck, path: '/admin/employees/list', color: 'green', badge: 'Directory' },
    { title: 'Teams', desc: 'Departmental teams, team leads, and project assignments', icon: Users, path: '/admin/teams', color: 'blue', badge: 'Structure' },
    { title: 'Work Assignments', desc: 'Task delegation, priorities, assignees, and deadlines', icon: Briefcase, path: '/admin/assignments', color: 'orange', badge: 'Tasks' },
    { title: 'Work Updates', desc: 'Daily task status reports and blocker alerts from staff', icon: Clock, path: '/admin/updates', color: 'purple', badge: 'Daily Feed' },
    { title: 'Registration Requests', desc: 'Review and approve newly registered employee profiles', icon: UserPlus, path: '/admin/registration-requests', color: 'orange', badge: 'Approval' },
    { title: 'Attendance Reports', desc: 'Generate and export monthly attendance summaries', icon: FileBarChart, path: '/admin/reports', color: 'blue', badge: 'Export' },
  ];

  return (
    <div className="admin-management-view animate-fade-in">
      <PageHeader
        title="Administration Modules"
        subtitle="Centralized management console for all organizational operations and workforce controls"
        breadcrumb={[{ label: 'Admin', path: '/admin/dashboard' }, { label: 'Management' }]}
      />

      <div className="management-cards-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '14px' }}>
        {managementModules.map((mod, idx) => (
          <ManagementCard
            key={idx}
            title={mod.title}
            description={mod.desc}
            icon={mod.icon}
            colorScheme={mod.color}
            badgeText={mod.badge}
            onClick={() => navigate(mod.path)}
          />
        ))}
      </div>
    </div>
  );
}
