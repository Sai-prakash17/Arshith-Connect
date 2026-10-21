import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Briefcase,
  Calendar,
  CheckCircle,
  AlertCircle,
  Users,
  User,
  ChevronDown,
  Check,
  Search,
  X,
  Loader2,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import { assignmentService } from '../../services/assignmentService';
import { employeeService } from '../../services/employeeService';
import { teamService } from '../../services/teamService';

export default function AdminWorkAssignments() {
  // Mode state: 'Individual' | 'Team'
  const [assignmentMode, setAssignmentMode] = useState('Individual');

  // Directory states
  const [employees, setEmployees] = useState([]);
  const [teams, setTeams] = useState([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);

  // Selected targets
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState(null);

  // Search & picker dropdown states
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const pickerRef = useRef(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Low');
  const [completionDate, setCompletionDate] = useState('');
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const priorityRef = useRef(null);

  // Submitting & Feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Existing assignments list
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setIsPickerOpen(false);
      }
      if (priorityRef.current && !priorityRef.current.contains(event.target)) {
        setIsPriorityOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch directory (employees & teams)
  const loadDirectoryData = async () => {
    try {
      setIsLoadingDirectory(true);
      const [empData, teamData] = await Promise.allSettled([
        employeeService.getEmployees(),
        teamService.getTeams(),
      ]);

      if (empData.status === 'fulfilled' && Array.isArray(empData.value)) {
        // Only active registered employees
        const activeEmps = empData.value.filter((e) => e.status === 'Active' || !e.status);
        setEmployees(activeEmps);
      }

      if (teamData.status === 'fulfilled' && Array.isArray(teamData.value)) {
        setTeams(teamData.value);
      }
    } catch (err) {
      console.warn('Failed to fetch directory for work assignments:', err);
    } finally {
      setIsLoadingDirectory(false);
    }
  };

  // Fetch existing assignments
  const fetchAssignments = async () => {
    try {
      setIsLoadingTasks(true);
      const data = await assignmentService.getAssignments();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to fetch assignments:', err);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  useEffect(() => {
    loadDirectoryData();
    fetchAssignments();
  }, []);

  // Mode switch handler: clears stale selections to avoid accidental cross-assignments
  const handleSwitchMode = (newMode) => {
    if (newMode === assignmentMode) return;
    setAssignmentMode(newMode);
    setSelectedEmployee(null);
    setSelectedTeam(null);
    setIsPickerOpen(false);
    setPickerSearch('');
    setErrorMessage('');
  };

  // Filtered employees for picker
  const filteredEmployees = useMemo(() => {
    if (!pickerSearch.trim()) return employees;
    const q = pickerSearch.trim().toLowerCase();
    return employees.filter(
      (e) =>
        (e.full_name && e.full_name.toLowerCase().includes(q)) ||
        (e.employee_id && e.employee_id.toLowerCase().includes(q)) ||
        (e.email && e.email.toLowerCase().includes(q)) ||
        (e.department && e.department.toLowerCase().includes(q))
    );
  }, [employees, pickerSearch]);

  // Filtered teams for picker
  const filteredTeams = useMemo(() => {
    if (!pickerSearch.trim()) return teams;
    const q = pickerSearch.trim().toLowerCase();
    return teams.filter(
      (t) =>
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.department && t.department.toLowerCase().includes(q))
    );
  }, [teams, pickerSearch]);

  // Submit work assignment
  const handleAssignWork = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // 1. Validate Target Selection
    if (assignmentMode === 'Individual') {
      if (!selectedEmployee) {
        setErrorMessage('Please select an employee before assigning work.');
        return;
      }
    } else {
      if (!selectedTeam) {
        setErrorMessage('Please select a team before assigning work.');
        return;
      }
    }

    // 2. Validate Work Title
    if (!title.trim()) {
      setErrorMessage('Please enter a work title.');
      return;
    }

    // 3. Validate Completion Date
    if (!completionDate.trim()) {
      setErrorMessage('Please select a completion date.');
      return;
    }

    try {
      setIsSaving(true);

      const targetId =
        assignmentMode === 'Individual'
          ? selectedEmployee.employee_id || selectedEmployee.id
          : String(selectedTeam.id);

      const targetName =
        assignmentMode === 'Individual'
          ? selectedEmployee.full_name
          : selectedTeam.name;

      await assignmentService.createAssignment({
        title: title.trim(),
        description: description.trim(),
        assignmentType: assignmentMode,
        targetId: targetId,
        assignedTo: targetName,
        priority: priority || 'Low',
        deadline: completionDate,
        progress: 0,
      });

      // Reset form fields
      setTitle('');
      setDescription('');
      setPriority('Low');
      setCompletionDate('');
      setSelectedEmployee(null);
      setSelectedTeam(null);

      setSuccessMessage(
        assignmentMode === 'Individual'
          ? `Work assigned successfully to ${targetName}.`
          : `Work assigned successfully to Team "${targetName}".`
      );

      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);

      // Refresh existing assignments
      await fetchAssignments();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to assign work. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick progress update
  const handleUpdateProgress = async (id, newProgress) => {
    try {
      await assignmentService.updateProgress(id, newProgress);
      fetchAssignments();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update task progress');
    }
  };

  return (
    <div className="work-assignments-page animate-fade-in">
      {/* Desktop Page Header */}
      <div className="desktop-header-wrap">
        <PageHeader
          title="Work Assignments"
          subtitle="Assign sprint tasks to individuals or teams with completion deadlines and priority tracking"
          breadcrumb={[
            { label: 'Admin', path: '/admin/dashboard' },
            { label: 'Work Assignments' },
          ]}
        />
      </div>

      {/* Mobile Dark Header (matching Screenshots 2, 3, 4) */}
      <div className="mobile-dark-header">
        <h1 className="mobile-header-title">Work Assignments</h1>
      </div>

      <div className="assignments-content-wrap">
        {/* Mode Selector Tabs: Individual vs Team */}
        <div className="mode-tabs-container">
          <button
            type="button"
            className={`mode-tab-btn ${assignmentMode === 'Individual' ? 'active' : 'inactive'}`}
            onClick={() => handleSwitchMode('Individual')}
          >
            Individual
          </button>
          <button
            type="button"
            className={`mode-tab-btn ${assignmentMode === 'Team' ? 'active' : 'inactive'}`}
            onClick={() => handleSwitchMode('Team')}
          >
            Team
          </button>
        </div>

        {/* Global Feedback Banners */}
        {successMessage && (
          <div className="feedback-banner success">
            <CheckCircle size={18} className="banner-icon" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="feedback-banner error">
            <AlertCircle size={18} className="banner-icon" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Assignment Creation Card */}
        <div className="assignment-form-card">
          <form onSubmit={handleAssignWork} noValidate>
            {/* Section Heading: Select Employee or Select Team */}
            <div className="selection-section-header">
              <h2 className="selection-section-title">
                {assignmentMode === 'Individual' ? 'Select Employee' : 'Select Team'}
              </h2>

              <p className="selection-status-subtitle">
                {assignmentMode === 'Individual' ? (
                  selectedEmployee ? (
                    <span className="selected-active-label">
                      Employee: <strong>{selectedEmployee.full_name}</strong>
                      <span className="selected-subcode"> ({selectedEmployee.employee_id || selectedEmployee.email})</span>
                    </span>
                  ) : (
                    <span className="unselected-label">No employee selected</span>
                  )
                ) : selectedTeam ? (
                  <span className="selected-active-label">
                    Team: <strong>{selectedTeam.name}</strong>
                    <span className="selected-subcode">
                      {' '}
                      ({selectedTeam.memberCount || selectedTeam.members?.length || 0} members)
                    </span>
                  </span>
                ) : (
                  <span className="unselected-label">No team selected</span>
                )}
              </p>
            </div>

            {/* Target Selector Dropdown Trigger */}
            <div className="target-picker-container" ref={pickerRef}>
              <button
                type="button"
                className={`picker-trigger-box ${isPickerOpen ? 'open' : ''} ${
                  (assignmentMode === 'Individual' && selectedEmployee) ||
                  (assignmentMode === 'Team' && selectedTeam)
                    ? 'has-selection'
                    : ''
                }`}
                onClick={() => setIsPickerOpen(!isPickerOpen)}
              >
                <div className="picker-trigger-info">
                  {assignmentMode === 'Individual' ? (
                    selectedEmployee ? (
                      <div className="selected-pill">
                        <div className="avatar-chip">
                          {selectedEmployee.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="pill-text">
                          <span className="pill-name">{selectedEmployee.full_name}</span>
                          <span className="pill-desc">
                            {selectedEmployee.employee_id} • {selectedEmployee.department || 'Staff'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="placeholder-text">
                        {isLoadingDirectory
                          ? 'Loading active employees...'
                          : 'Click to choose an employee...'}
                      </span>
                    )
                  ) : selectedTeam ? (
                    <div className="selected-pill">
                      <div className="avatar-chip team-chip">
                        <Users size={14} />
                      </div>
                      <div className="pill-text">
                        <span className="pill-name">{selectedTeam.name}</span>
                        <span className="pill-desc">
                          {selectedTeam.department} •{' '}
                          {selectedTeam.memberCount || selectedTeam.members?.length || 0} members
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="placeholder-text">
                      {isLoadingDirectory
                        ? 'Loading teams...'
                        : 'Click to choose a team...'}
                    </span>
                  )}
                </div>

                <div className="picker-trigger-right">
                  {((assignmentMode === 'Individual' && selectedEmployee) ||
                    (assignmentMode === 'Team' && selectedTeam)) && (
                    <span
                      className="clear-target-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (assignmentMode === 'Individual') setSelectedEmployee(null);
                        else setSelectedTeam(null);
                      }}
                      title="Clear selection"
                    >
                      <X size={15} />
                    </span>
                  )}
                  <ChevronDown
                    size={18}
                    className={`picker-chevron ${isPickerOpen ? 'rotate' : ''}`}
                  />
                </div>
              </button>

              {/* Picker Dropdown Menu */}
              {isPickerOpen && (
                <div className="picker-dropdown-menu animate-fade-in">
                  <div className="picker-search-bar">
                    <Search size={15} className="picker-search-icon" />
                    <input
                      type="text"
                      placeholder={
                        assignmentMode === 'Individual'
                          ? 'Search employee by name, ID, or email...'
                          : 'Search team by name or department...'
                      }
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      autoFocus
                    />
                    {pickerSearch && (
                      <button
                        type="button"
                        className="picker-search-clear"
                        onClick={() => setPickerSearch('')}
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <div className="picker-options-list">
                    {assignmentMode === 'Individual' ? (
                      filteredEmployees.length === 0 ? (
                        <div className="picker-empty-state">
                          {pickerSearch
                            ? `No employees match "${pickerSearch}"`
                            : 'No active employees available.'}
                        </div>
                      ) : (
                        filteredEmployees.map((emp) => {
                          const isSelected =
                            selectedEmployee &&
                            (selectedEmployee.employee_id === emp.employee_id ||
                              selectedEmployee.id === emp.id);

                          return (
                            <div
                              key={emp.id || emp.employee_id}
                              className={`picker-option-row ${isSelected ? 'selected' : ''}`}
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setIsPickerOpen(false);
                                setPickerSearch('');
                                setErrorMessage('');
                              }}
                            >
                              <div className="option-avatar">
                                {emp.full_name ? emp.full_name.charAt(0).toUpperCase() : 'E'}
                              </div>
                              <div className="option-info">
                                <span className="option-main-text">{emp.full_name}</span>
                                <span className="option-sub-text">
                                  {emp.employee_id} • {emp.email}
                                  {emp.department ? ` • ${emp.department}` : ''}
                                </span>
                              </div>
                              {isSelected && <Check size={16} className="option-check" />}
                            </div>
                          );
                        })
                      )
                    ) : filteredTeams.length === 0 ? (
                      <div className="picker-empty-state">
                        {pickerSearch
                          ? `No teams match "${pickerSearch}"`
                          : 'No teams created yet. Create a team in Team Management first.'}
                      </div>
                    ) : (
                      filteredTeams.map((t) => {
                        const isSelected = selectedTeam && selectedTeam.id === t.id;
                        return (
                          <div
                            key={t.id}
                            className={`picker-option-row ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              setSelectedTeam(t);
                              setIsPickerOpen(false);
                              setPickerSearch('');
                              setErrorMessage('');
                            }}
                          >
                            <div className="option-avatar team-option-avatar">
                              <Users size={15} />
                            </div>
                            <div className="option-info">
                              <span className="option-main-text">{t.name}</span>
                              <span className="option-sub-text">
                                {t.department} • {t.memberCount || t.members?.length || 0} members
                                {t.leader ? ` • Lead: ${t.leader}` : ''}
                              </span>
                            </div>
                            {isSelected && <Check size={16} className="option-check" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Form Fields: Work Title, Description, Priority, Completion Date */}
            <div className="assignment-fields-container">
              {/* Work Title Input (underlined / modern style matching Screenshot 4) */}
              <div className="custom-form-group">
                <input
                  type="text"
                  className="modern-underline-input title-input"
                  placeholder="Work title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  required
                />
              </div>

              {/* Work Description Textarea */}
              <div className="custom-form-group">
                <textarea
                  className="modern-underline-textarea"
                  placeholder="Work description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Priority & Completion Date Grid */}
              <div className="priority-date-grid">
                {/* Priority Selection */}
                <div className="priority-field-group" ref={priorityRef}>
                  <label className="field-top-label">Priority</label>
                  <div
                    className={`custom-select-trigger ${isPriorityOpen ? 'open' : ''}`}
                    onClick={() => setIsPriorityOpen(!isPriorityOpen)}
                  >
                    <span className="selected-priority-value">{priority}</span>
                    <ChevronDown
                      size={18}
                      className={`select-chevron ${isPriorityOpen ? 'rotate' : ''}`}
                    />
                  </div>

                  {isPriorityOpen && (
                    <div className="priority-dropdown-menu animate-fade-in">
                      {['Low', 'Medium', 'High'].map((p) => (
                        <div
                          key={p}
                          className={`priority-option ${priority === p ? 'active' : ''}`}
                          onClick={() => {
                            setPriority(p);
                            setIsPriorityOpen(false);
                          }}
                        >
                          <span className="priority-text">{p}</span>
                          {priority === p && <Check size={16} className="priority-check" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Completion Date Picker */}
                <div className="date-field-group">
                  <label className="field-top-label">Completion Date</label>
                  <input
                    type="date"
                    className="modern-underline-input date-input"
                    placeholder="Completion date (YYYY-MM-DD)"
                    value={completionDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Assign Work Button (Vivid Purple, Full-width matching Screenshot 4) */}
              <button
                type="submit"
                className="btn-assign-work-purple"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={18} className="spinner-icon" />
                    <span>Assigning Work...</span>
                  </>
                ) : (
                  <span>Assign Work</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Work Assignments Section */}
        <div className="existing-assignments-section">
          <div className="section-title-bar">
            <h2 className="existing-section-title">Existing Work Assignments</h2>
            {tasks.length > 0 && (
              <span className="task-count-badge">
                {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
              </span>
            )}
          </div>

          {isLoadingTasks ? (
            <div className="loading-tasks-box">
              <Loader2 size={24} className="spinner-icon" />
              <span>Loading work assignments...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="no-assignments-box">
              <p className="no-assignments-text">No active work assignments.</p>
            </div>
          ) : (
            <div className="assignments-cards-grid">
              {tasks.map((task) => {
                const isTeam =
                  (task.assignmentType || task.assignment_type || '').toLowerCase() === 'team';

                let priorityClass = 'priority-low';
                if (task.priority === 'High') priorityClass = 'priority-high';
                else if (task.priority === 'Medium') priorityClass = 'priority-medium';

                return (
                  <div key={task.id || task.taskId} className="assignment-card">
                    <div className="card-top-row">
                      <div className="card-badges-wrap">
                        {/* Assignment Mode Tag */}
                        <span className={`mode-badge ${isTeam ? 'team-badge' : 'individual-badge'}`}>
                          {isTeam ? <Users size={12} /> : <User size={12} />}
                          <span>{isTeam ? 'Team' : 'Individual'}</span>
                        </span>

                        {/* Priority Badge */}
                        <span className={`priority-badge ${priorityClass}`}>
                          {task.priority || 'Low'} Priority
                        </span>
                      </div>

                      {/* Due Date */}
                      <span className="card-deadline">
                        <Calendar size={13} />
                        <span>Due: {task.deadline || 'No deadline'}</span>
                      </span>
                    </div>

                    {/* Task Title */}
                    <h3 className="card-title">{task.title}</h3>

                    {/* Assigned To */}
                    <div className="card-assignee-row">
                      <span className="assignee-label">Assigned to:</span>
                      <strong className="assignee-name">
                        {task.assignedTo || task.assignee || 'Unassigned'}
                      </strong>
                    </div>

                    {/* Description if present */}
                    {task.description && (
                      <p className="card-description">{task.description}</p>
                    )}

                    {/* Progress Bar & percentage */}
                    <div className="card-progress-section">
                      <div className="progress-label-row">
                        <span>Milestone Progress</span>
                        <strong className="progress-percent">{task.progress || 0}%</strong>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${task.progress || 0}%`,
                            backgroundColor:
                              task.progress >= 100
                                ? '#10b981'
                                : task.progress >= 50
                                ? '#0d9488'
                                : '#7047eb',
                          }}
                        />
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="card-footer-actions">
                      <span className="delegated-by-text">
                        Delegated by: {task.assignedBy || 'Administrator'}
                      </span>

                      <div className="progress-btn-group">
                        <button
                          type="button"
                          className="btn-quick-progress"
                          onClick={() =>
                            handleUpdateProgress(task.id, Math.min(100, (task.progress || 0) + 25))
                          }
                          disabled={task.progress >= 100}
                        >
                          +25% Progress
                        </button>
                        {task.progress < 100 && (
                          <button
                            type="button"
                            className="btn-mark-complete"
                            onClick={() => handleUpdateProgress(task.id, 100)}
                          >
                            Complete
                          </button>
                        )}
                        {task.progress >= 100 && (
                          <span className="status-completed-pill">
                            <Check size={12} />
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Scoped CSS Styles for Work Assignments */}
      <style>{`
        .work-assignments-page {
          width: 100%;
          min-height: 100%;
          padding-bottom: 48px;
        }

        /* Desktop Header */
        .desktop-header-wrap {
          display: block;
        }

        /* Mobile Dark Header (Screenshots 2, 3, 4) */
        .mobile-dark-header {
          display: none;
          background-color: #171126;
          padding: 22px 18px;
          margin-bottom: 20px;
        }

        .mobile-header-title {
          color: #ffffff;
          font-size: 1.45rem;
          font-weight: 800;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .assignments-content-wrap {
          max-width: 820px;
          margin: 0 auto;
        }

        /* Mode Tabs: Individual vs Team */
        .mode-tabs-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }

        .mode-tab-btn {
          height: 48px;
          border-radius: 8px;
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .mode-tab-btn.active {
          background-color: #7047eb;
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(112, 71, 235, 0.3);
        }

        .mode-tab-btn.inactive {
          background-color: #e2e8f0;
          color: #475569;
        }

        .mode-tab-btn.inactive:hover {
          background-color: #cbd5e1;
          color: #1e293b;
        }

        /* Feedback Banners */
        .feedback-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .feedback-banner.success {
          background-color: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }

        .feedback-banner.error {
          background-color: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .banner-icon {
          flex-shrink: 0;
        }

        /* Form Card */
        .assignment-form-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
          margin-bottom: 32px;
        }

        /* Selection Section Header */
        .selection-section-header {
          margin-bottom: 14px;
        }

        .selection-section-title {
          font-size: 1.2rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 6px 0;
        }

        .selection-status-subtitle {
          font-size: 0.9rem;
          margin: 0;
          color: #64748b;
        }

        .unselected-label {
          color: #64748b;
          font-weight: 500;
        }

        .selected-active-label {
          color: #0b3d2b;
          font-weight: 600;
        }

        .selected-active-label strong {
          color: #7047eb;
        }

        .selected-subcode {
          color: #64748b;
          font-size: 0.825rem;
          font-weight: normal;
        }

        /* Target Picker Trigger Box */
        .target-picker-container {
          position: relative;
          margin-bottom: 24px;
        }

        .picker-trigger-box {
          width: 100%;
          min-height: 52px;
          background-color: #f8fafc;
          border: 1.5px solid #cbd5e1;
          border-radius: 10px;
          padding: 8px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .picker-trigger-box:hover,
        .picker-trigger-box.open {
          border-color: #7047eb;
          background-color: #ffffff;
          box-shadow: 0 0 0 3px rgba(112, 71, 235, 0.12);
        }

        .picker-trigger-box.has-selection {
          background-color: #faf5ff;
          border-color: #d8b4fe;
        }

        .placeholder-text {
          color: #94a3b8;
          font-size: 0.925rem;
          font-weight: 500;
        }

        .selected-pill {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar-chip {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: #7047eb;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.85rem;
          flex-shrink: 0;
        }

        .avatar-chip.team-chip {
          background-color: #0b3d2b;
        }

        .pill-text {
          display: flex;
          flex-direction: column;
        }

        .pill-name {
          font-size: 0.925rem;
          font-weight: 700;
          color: #1e293b;
        }

        .pill-desc {
          font-size: 0.775rem;
          color: #64748b;
        }

        .picker-trigger-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .clear-target-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background-color: #e2e8f0;
          color: #475569;
          transition: background 0.2s;
        }

        .clear-target-btn:hover {
          background-color: #cbd5e1;
          color: #0f172a;
        }

        .picker-chevron {
          color: #64748b;
          transition: transform 0.2s ease;
        }

        .picker-chevron.rotate {
          transform: rotate(180deg);
        }

        /* Dropdown Menu */
        .picker-dropdown-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          z-index: 100;
          overflow: hidden;
        }

        .picker-search-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-bottom: 1px solid #e2e8f0;
          background-color: #f8fafc;
        }

        .picker-search-icon {
          color: #94a3b8;
          flex-shrink: 0;
        }

        .picker-search-bar input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 0.875rem;
          outline: none;
          color: #1e293b;
        }

        .picker-search-clear {
          background: transparent;
          border: none;
          color: #94a3b8;
          cursor: pointer;
        }

        .picker-options-list {
          max-height: 240px;
          overflow-y: auto;
          padding: 4px 0;
        }

        .picker-option-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .picker-option-row:hover {
          background-color: #f1f5f9;
        }

        .picker-option-row.selected {
          background-color: #faf5ff;
        }

        .option-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background-color: #e2e8f0;
          color: #334155;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.85rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .option-avatar.team-option-avatar {
          background-color: #e0f2fe;
          color: #0369a1;
        }

        .option-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .option-main-text {
          font-size: 0.9rem;
          font-weight: 700;
          color: #1e293b;
        }

        .option-sub-text {
          font-size: 0.775rem;
          color: #64748b;
        }

        .option-check {
          color: #7047eb;
          flex-shrink: 0;
        }

        .picker-empty-state {
          padding: 24px;
          text-align: center;
          color: #64748b;
          font-size: 0.875rem;
        }

        /* Form Inputs (Screenshot 4 Style) */
        .assignment-fields-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .custom-form-group {
          display: flex;
          flex-direction: column;
        }

        .modern-underline-input {
          width: 100%;
          padding: 12px 2px;
          border: none;
          border-bottom: 1.5px solid #cbd5e1;
          font-size: 1.05rem;
          color: #1e293b;
          background: transparent;
          outline: none;
          transition: border-color 0.2s ease;
        }

        .modern-underline-input.title-input:focus {
          border-bottom: 2px solid #00d2b4; /* Cyan/teal accent from Screenshot 4 */
        }

        .modern-underline-input::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }

        .modern-underline-textarea {
          width: 100%;
          padding: 10px 2px;
          border: none;
          border-bottom: 1.5px solid #cbd5e1;
          font-size: 0.975rem;
          color: #1e293b;
          background: transparent;
          outline: none;
          resize: vertical;
          font-family: inherit;
          transition: border-color 0.2s ease;
        }

        .modern-underline-textarea:focus {
          border-bottom: 2px solid #7047eb;
        }

        .modern-underline-textarea::placeholder {
          color: #94a3b8;
        }

        /* Priority & Date Grid */
        .priority-date-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .field-top-label {
          display: block;
          font-size: 0.85rem;
          font-weight: 700;
          color: #475569;
          margin-bottom: 6px;
        }

        .priority-field-group {
          position: relative;
        }

        .custom-select-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 2px;
          border-bottom: 1.5px solid #cbd5e1;
          cursor: pointer;
          user-select: none;
        }

        .custom-select-trigger:hover,
        .custom-select-trigger.open {
          border-bottom-color: #7047eb;
        }

        .selected-priority-value {
          font-size: 1rem;
          font-weight: 600;
          color: #1e293b;
        }

        .select-chevron {
          color: #64748b;
          transition: transform 0.2s ease;
        }

        .select-chevron.rotate {
          transform: rotate(180deg);
        }

        .priority-dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background-color: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
          z-index: 100;
          overflow: hidden;
        }

        .priority-option {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        .priority-option:hover {
          background-color: #f8fafc;
        }

        .priority-option.active {
          background-color: #faf5ff;
          font-weight: 700;
          color: #7047eb;
        }

        .priority-check {
          color: #7047eb;
        }

        .modern-underline-input.date-input {
          padding: 9px 2px;
          font-size: 0.95rem;
        }

        .modern-underline-input.date-input:focus {
          border-bottom-color: #7047eb;
        }

        /* Assign Work Button (Vivid Purple, Full Width on Mobile) */
        .btn-assign-work-purple {
          width: 100%;
          height: 48px;
          background-color: #7047eb;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-size: 1.05rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(112, 71, 235, 0.3);
          margin-top: 8px;
        }

        .btn-assign-work-purple:hover:not(:disabled) {
          background-color: #5b35d5;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(112, 71, 235, 0.35);
        }

        .btn-assign-work-purple:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .spinner-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        /* Existing Work Assignments Section */
        .existing-assignments-section {
          margin-top: 36px;
        }

        .section-title-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .existing-section-title {
          font-size: 1.3rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0;
        }

        .task-count-badge {
          font-size: 0.78rem;
          font-weight: 700;
          color: #7047eb;
          background-color: #faf5ff;
          border: 1px solid #e9d5ff;
          padding: 3px 10px;
          border-radius: 999px;
        }

        .loading-tasks-box {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 40px;
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          color: #64748b;
          font-size: 0.9rem;
        }

        .no-assignments-box {
          background-color: #ffffff;
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          padding: 36px 20px;
          text-align: center;
        }

        .no-assignments-text {
          font-size: 1rem;
          color: #64748b;
          margin: 0;
          font-weight: 500;
        }

        /* Assignment Cards */
        .assignments-cards-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .assignment-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 18px 20px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .assignment-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }

        .card-top-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }

        .card-badges-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mode-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.725rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .mode-badge.individual-badge {
          background-color: #f1f5f9;
          color: #334155;
          border: 1px solid #e2e8f0;
        }

        .mode-badge.team-badge {
          background-color: #e0f2fe;
          color: #0369a1;
          border: 1px solid #bae6fd;
        }

        .priority-badge {
          font-size: 0.725rem;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .priority-badge.priority-high {
          background-color: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        .priority-badge.priority-medium {
          background-color: #fffbeb;
          color: #b45309;
          border: 1px solid #fde68a;
        }

        .priority-badge.priority-low {
          background-color: #f0fdf4;
          color: #15803d;
          border: 1px solid #bbf7d0;
        }

        .card-deadline {
          font-size: 0.8rem;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .card-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: #0b3d2b;
          margin: 0;
          line-height: 1.35;
        }

        .card-assignee-row {
          font-size: 0.85rem;
          color: #475569;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .assignee-label {
          color: #64748b;
        }

        .assignee-name {
          color: #1e293b;
        }

        .card-description {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0;
          line-height: 1.45;
          white-space: pre-line;
        }

        .card-progress-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 4px;
        }

        .progress-label-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
          color: #64748b;
        }

        .progress-percent {
          color: #1e293b;
        }

        .progress-track {
          height: 8px;
          background-color: #e2e8f0;
          border-radius: 999px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.3s ease;
        }

        .card-footer-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid #f1f5f9;
          padding-top: 10px;
          margin-top: 4px;
          font-size: 0.78rem;
          color: #64748b;
          flex-wrap: wrap;
          gap: 8px;
        }

        .delegated-by-text {
          font-size: 0.78rem;
          color: #64748b;
        }

        .progress-btn-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-quick-progress {
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background-color: #f8fafc;
          color: #334155;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-quick-progress:hover:not(:disabled) {
          background-color: #e2e8f0;
        }

        .btn-quick-progress:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-mark-complete {
          padding: 4px 10px;
          border-radius: 6px;
          border: 1px solid #a7f3d0;
          background-color: #ecfdf5;
          color: #065f46;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-mark-complete:hover {
          background-color: #d1fae5;
        }

        .status-completed-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #059669;
          font-weight: 700;
          font-size: 0.78rem;
          background-color: #ecfdf5;
          padding: 3px 8px;
          border-radius: 6px;
        }

        /* Responsive Breakpoints */
        @media (max-width: 768px) {
          .desktop-header-wrap {
            display: none;
          }

          .mobile-dark-header {
            display: block;
            margin-left: -16px;
            margin-right: -16px;
            margin-top: -16px;
          }

          .assignments-content-wrap {
            padding: 0 4px;
          }

          .assignment-form-card {
            padding: 18px 16px;
            border-radius: 12px;
          }

          .priority-date-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .existing-section-title {
            font-size: 1.15rem;
          }

          .btn-assign-work-purple {
            font-size: 1rem;
            height: 46px;
          }
        }
      `}</style>
    </div>
  );
}
