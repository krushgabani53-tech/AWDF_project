import React, { useState, useEffect, useCallback } from 'react';
import { RotateCw, CheckCircle2, Lock, Pencil, Trash2, X, Check } from 'lucide-react';
import taskService from '../services/taskService';

export default function MyTasks({ onTasksCountChange }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [validationError, setValidationError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters State
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');

  // Edit State
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('Medium');
  const [editError, setEditError] = useState('');

  // Fetch tasks from PostgreSQL backend
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await taskService.getTasks();
      if (response && response.success) {
        setTasks(response.data || []);
        if (onTasksCountChange) {
          onTasksCountChange(response.data?.length || 0);
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Unable to connect to the backend server.');
    } finally {
      setLoading(false);
    }
  }, [onTasksCountChange]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Compute counters
  const ongoingCount = tasks.filter((t) => t.status === 'ongoing').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const allCount = tasks.length;

  // Handle Create Task
  const handleAddTask = async (e) => {
    e.preventDefault();
    setValidationError('');
    setSuccessMessage('');
    setErrorMessage('');

    if (!title.trim()) {
      setValidationError('Task title is required.');
      return;
    }
    if (title.trim().length < 3) {
      setValidationError('Task title must be at least 3 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await taskService.createTask({
        title: title.trim(),
        description: description.trim(),
        priority,
      });

      if (response && response.success) {
        setTitle('');
        setDescription('');
        setPriority('Medium');
        setSuccessMessage('Task successfully added to the board.');
        setTimeout(() => setSuccessMessage(''), 3500);
        await fetchTasks();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Mark Completed (Protocol 5)
  const handleCompleteTask = async (id) => {
    setErrorMessage('');
    try {
      const response = await taskService.completeTask(id);
      if (response && response.success) {
        setSuccessMessage('Task marked as Completed and permanently locked under Protocol 5.');
        setTimeout(() => setSuccessMessage(''), 3500);
        await fetchTasks();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete task.');
    }
  };

  // Handle Delete Task (Ongoing only)
  const handleDeleteTask = async (id, taskTitle) => {
    if (!window.confirm(`Are you sure you want to delete ongoing task "${taskTitle}"?`)) {
      return;
    }
    setErrorMessage('');
    try {
      const response = await taskService.deleteTask(id);
      if (response && response.success) {
        setSuccessMessage('Task deleted successfully.');
        setTimeout(() => setSuccessMessage(''), 3000);
        await fetchTasks();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete task.');
    }
  };

  // Start Editing Task
  const handleStartEdit = (task) => {
    if (task.status === 'completed') {
      alert('Protocol 5: Completed tasks are permanently locked and cannot be edited.');
      return;
    }
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPriority(task.priority || 'Medium');
    setEditError('');
  };

  // Cancel Editing
  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditTitle('');
    setEditDescription('');
    setEditPriority('Medium');
    setEditError('');
  };

  // Save Task Edit
  const handleSaveEdit = async (id) => {
    if (!editTitle.trim() || editTitle.trim().length < 3) {
      setEditError('Task title must be at least 3 characters.');
      return;
    }

    try {
      const response = await taskService.updateTask(id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        priority: editPriority,
      });

      if (response && response.success) {
        setEditingTaskId(null);
        setSuccessMessage('Task updated successfully.');
        setTimeout(() => setSuccessMessage(''), 3000);
        await fetchTasks();
      }
    } catch (err) {
      setEditError(err.message || 'Failed to update task.');
    }
  };

  // Format timestamp helper
  const formatTimestamp = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Filter and Search Tasks
  const filteredTasks = tasks.filter((task) => {
    // Status Filter
    if (filterStatus === 'ongoing' && task.status !== 'ongoing') return false;
    if (filterStatus === 'completed' && task.status !== 'completed') return false;

    // Search query matching task title or description
    if (
      searchQuery &&
      !task.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !(task.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    // Priority filter
    if (
      filterPriority !== 'all' &&
      task.priority.toLowerCase() !== filterPriority.toLowerCase()
    ) {
      return false;
    }

    return true;
  });

  return (
    <div className="page-container">
      {/* Top Banner Card with Summary Counters */}
      <div className="page-header-card">
        <div>
          <h1 className="page-title">Personal Workspace</h1>
          <p className="page-subtitle">
            Plan, execute, and finalize your daily deliverables.
          </p>
        </div>
        <div className="header-card-actions">
          <span className="counter-badge-blue">ONGOING: {ongoingCount}</span>
          <span className="counter-badge-green">DONE: {completedCount}</span>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              fetchTasks();
              setSearchQuery('');
              setFilterStatus('all');
              setFilterPriority('all');
            }}
            title="Reload task data"
          >
            <RotateCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* Global Notifications */}
      {errorMessage && (
        <div className="error-notification">
          <span>⚠ {errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="form-notification" style={{ marginBottom: '20px' }}>
          ✓ {successMessage}
        </div>
      )}

      {/* Create New Task Form */}
      <div className="create-task-card">
        <h2 className="card-heading">+ Create New Task</h2>
        <form onSubmit={handleAddTask}>
          <div className="task-form-group">
            <input
              type="text"
              className="task-input"
              placeholder="Task Title (min 3 chars)"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (validationError) setValidationError('');
              }}
            />
            {validationError && (
              <div className="form-error-text">{validationError}</div>
            )}
          </div>

          <div className="task-form-group">
            <textarea
              className="task-textarea"
              placeholder="Additional Instructions or notes (optional)"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="task-form-bottom">
            <select
              className="priority-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
              <option value="Critical">Critical Priority</option>
            </select>

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Task to Board'}
            </button>
          </div>
        </form>
      </div>

      {/* Filters & Search Row */}
      <div className="task-filters-row">
        <div className="filter-pills-group">
          <button
            type="button"
            className={`filter-pill-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All Tasks ({allCount})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filterStatus === 'ongoing' ? 'active' : ''}`}
            onClick={() => setFilterStatus('ongoing')}
          >
            Ongoing ({ongoingCount})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filterStatus === 'completed' ? 'active' : ''}`}
            onClick={() => setFilterStatus('completed')}
          >
            Completed ({completedCount})
          </button>
        </div>

        <div className="filter-search-controls">
          <input
            type="text"
            className="search-input"
            placeholder="Search by task title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className="select-filter"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="critical">Critical Priority</option>
          </select>
        </div>
      </div>

      {/* Task List / Loading / Empty State */}
      {loading ? (
        <div className="loading-card">Loading tasks from workspace database...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="empty-state-card">
          No tasks found matching your filter criteria.
        </div>
      ) : (
        <div className="tasks-list">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`task-card ${task.status === 'completed' ? 'completed' : ''}`}
            >
              <div className="task-info-left">
                {/* Standard View */}
                {editingTaskId !== task.id ? (
                  <>
                    <div className="task-title-row">
                      <span
                        className={`task-item-title ${
                          task.status === 'completed' ? 'done' : ''
                        }`}
                      >
                        {task.title}
                      </span>

                      {/* Priority Badge */}
                      <span
                        className={`badge ${
                          task.priority.toLowerCase() === 'critical'
                            ? 'badge-critical'
                            : task.priority.toLowerCase() === 'high'
                            ? 'badge-high'
                            : task.priority.toLowerCase() === 'low'
                            ? 'badge-low'
                            : 'badge-medium'
                        }`}
                      >
                        {task.priority} Priority
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`badge ${
                          task.status === 'completed' ? 'badge-completed' : 'badge-ongoing'
                        }`}
                      >
                        {task.status === 'completed' ? 'Completed' : 'Ongoing'}
                      </span>
                    </div>

                    {task.description && (
                      <p className="task-desc">{task.description}</p>
                    )}

                    <div className="task-timestamp">
                      <span>Created: {formatTimestamp(task.created_at)}</span>
                      {task.status === 'completed' && task.completed_at && (
                        <span style={{ marginLeft: '14px', color: '#15803d', fontWeight: '500' }}>
                          ✓ Completed: {formatTimestamp(task.completed_at)}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  /* Inline Edit Mode */
                  <div className="edit-task-box">
                    <div style={{ marginBottom: '10px' }}>
                      <label className="form-label">Edit Task Title</label>
                      <input
                        type="text"
                        className="task-input"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                      />
                      {editError && (
                        <div className="form-error-text">{editError}</div>
                      )}
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                      <label className="form-label">Edit Instructions</label>
                      <textarea
                        className="task-textarea"
                        rows={2}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <select
                        className="priority-select"
                        style={{ minWidth: '150px' }}
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value)}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>

                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '7px 14px', fontSize: '12.5px' }}
                        onClick={() => handleSaveEdit(task.id)}
                      >
                        <Check size={14} />
                        Save
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '7px 14px', fontSize: '12.5px' }}
                        onClick={handleCancelEdit}
                      >
                        <X size={14} />
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Task Action Buttons */}
              <div className="task-actions">
                {task.status === 'ongoing' ? (
                  <>
                    <button
                      type="button"
                      className="btn-action-edit"
                      onClick={() => handleStartEdit(task)}
                      title="Edit task"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>

                    <button
                      type="button"
                      className="btn-action-delete"
                      onClick={() => handleDeleteTask(task.id, task.title)}
                      title="Delete ongoing task"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>

                    <button
                      type="button"
                      className="complete-btn"
                      onClick={() => handleCompleteTask(task.id)}
                      title="Mark as completed under Protocol 5"
                    >
                      Mark Done
                    </button>
                  </>
                ) : (
                  <span className="locked-indicator" title="Permanent lock under Protocol 5">
                    <Lock size={13} />
                    Finalized (Protocol 5)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
