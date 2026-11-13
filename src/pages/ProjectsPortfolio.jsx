import React, { useState, useEffect, useCallback } from 'react';
import { Package, RotateCw, Plus, X, Pencil, Trash2, Calendar, User, CheckCircle2, Layers } from 'lucide-react';
import projectService from '../services/projectService';

export default function ProjectsPortfolio() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Form State (for Create & Edit)
  const [formData, setFormData] = useState({
    name: '',
    category: 'Backend & Infrastructure',
    project_lead: '',
    deadline: '',
    status: 'Active',
    progress: 0,
    tags: '',
    tasks_completed: 0,
    tasks_total: 10,
    description: '',
  });
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Fetch Projects from PostgreSQL
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const response = await projectService.getProjects();
      if (response && response.success) {
        setProjects(response.data || []);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load projects from server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Summary Counters
  const totalCount = projects.length;
  const activeCount = projects.filter((p) => p.status.toLowerCase() === 'active').length;
  const completedCount = projects.filter((p) => p.status.toLowerCase() === 'completed').length;

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setFormData({
      name: '',
      category: 'Backend & Infrastructure',
      project_lead: '',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Active',
      progress: 0,
      tags: '',
      tasks_completed: 0,
      tasks_total: 10,
      description: '',
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Open Details Modal
  const handleOpenDetails = (project) => {
    setSelectedProject(project);
    setIsDetailsModalOpen(true);
  };

  // Open Edit Modal from Details
  const handleOpenEdit = (project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name || '',
      category: project.category || 'Backend & Infrastructure',
      project_lead: project.lead || project.project_lead || '',
      deadline: project.deadline || '',
      status: project.status || 'Active',
      progress: project.progress || 0,
      tags: Array.isArray(project.tags) ? project.tags.join(', ') : '',
      tasks_completed: project.tasks_completed || 0,
      tasks_total: project.tasks_total || 10,
      description: project.description || '',
    });
    setFormError('');
    setIsDetailsModalOpen(false);
    setIsEditModalOpen(true);
  };

  // Handle Create Project Submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Project name is required.');
      return;
    }
    if (!formData.category.trim()) {
      setFormError('Category is required.');
      return;
    }
    if (!formData.project_lead.trim()) {
      setFormError('Project lead is required.');
      return;
    }
    if (!formData.deadline) {
      setFormError('Deadline is required.');
      return;
    }

    setFormSubmitting(true);
    try {
      const response = await projectService.createProject({
        name: formData.name.trim(),
        category: formData.category.trim(),
        project_lead: formData.project_lead.trim(),
        deadline: formData.deadline,
        status: formData.status,
        progress: parseInt(formData.progress, 10) || 0,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        tasks_completed: parseInt(formData.tasks_completed, 10) || 0,
        tasks_total: parseInt(formData.tasks_total, 10) || 0,
        description: formData.description.trim(),
      });

      if (response && response.success) {
        setIsCreateModalOpen(false);
        setSuccessMessage(`Project "${response.data.name}" (${response.data.project_code}) created successfully.`);
        setTimeout(() => setSuccessMessage(''), 3500);
        await fetchProjects();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to create project.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Edit Project Submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Project name is required.');
      return;
    }
    if (!formData.category.trim()) {
      setFormError('Category is required.');
      return;
    }
    if (!formData.project_lead.trim()) {
      setFormError('Project lead is required.');
      return;
    }

    setFormSubmitting(true);
    try {
      const response = await projectService.updateProject(selectedProject.id, {
        name: formData.name.trim(),
        category: formData.category.trim(),
        project_lead: formData.project_lead.trim(),
        deadline: formData.deadline,
        status: formData.status,
        progress: parseInt(formData.progress, 10) || 0,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        tasks_completed: parseInt(formData.tasks_completed, 10) || 0,
        tasks_total: parseInt(formData.tasks_total, 10) || 0,
        description: formData.description.trim(),
      });

      if (response && response.success) {
        setIsEditModalOpen(false);
        setSuccessMessage(`Project "${response.data.name}" updated successfully.`);
        setTimeout(() => setSuccessMessage(''), 3500);
        await fetchProjects();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to update project.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Handle Delete Project
  const handleDeleteProject = async (project) => {
    if (!window.confirm(`Are you sure you want to delete project "${project.name}" (${project.project_code})? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await projectService.deleteProject(project.id);
      if (response && response.success) {
        setIsDetailsModalOpen(false);
        setIsEditModalOpen(false);
        setSuccessMessage(`Project "${project.name}" deleted successfully.`);
        setTimeout(() => setSuccessMessage(''), 3500);
        await fetchProjects();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete project.');
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedStatus('All');
  };

  // Filtered Projects computation
  const filteredProjects = projects.filter((project) => {
    // Search Query (name or project_code)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = project.name.toLowerCase().includes(q);
      const matchCode = (project.project_code || '').toLowerCase().includes(q);
      const matchLead = (project.lead || project.project_lead || '').toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchLead) {
        return false;
      }
    }

    // Category Filter
    if (selectedCategory !== 'All' && selectedCategory !== 'All Categories (3)') {
      const pCat = project.category.toLowerCase();
      const sCat = selectedCategory.toLowerCase();
      if (sCat === 'frontend' && !pCat.includes('frontend')) return false;
      if (sCat.includes('backend') && !pCat.includes('backend') && !pCat.includes('infra')) return false;
      if (sCat.includes('devops') && !pCat.includes('devops') && !pCat.includes('integrations') && !pCat.includes('email')) return false;
      if (!['frontend', 'backend & infra', 'devops & email'].includes(sCat) && pCat !== sCat) {
        return false;
      }
    }

    // Status Filter
    if (selectedStatus !== 'All' && selectedStatus !== 'All Statuses') {
      if (project.status.toLowerCase() !== selectedStatus.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="page-container">
      {/* Header Card */}
      <div className="page-header-card">
        <div>
          <h1 className="page-title">Projects Portfolio</h1>
          <p className="page-subtitle">
            Organize high-level organizational initiatives, track multi-member velocity, and link deliverables.
          </p>
        </div>
        <div className="header-card-actions">
          <span className="chunk-pill">
            <Package size={14} />
            Dynamic Chunk: Projects.chunk.js
          </span>
          <span className="counter-badge-blue">Total: {totalCount}</span>
          <span className="counter-badge-green">Active: {activeCount}</span>
          <button
            type="button"
            className="btn-secondary"
            onClick={fetchProjects}
            title="Reload projects data"
          >
            <RotateCw size={13} />
            Refresh
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleOpenCreateModal}
          >
            <Plus size={14} />
            New Project
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

      {/* Category Tabs Row (Matching Reference Layout) */}
      <div className="category-tabs-row">
        {[
          { key: 'All', label: `All Categories (${totalCount})` },
          { key: 'Frontend', label: 'Frontend' },
          { key: 'Backend & Infra', label: 'Backend & Infra' },
          { key: 'DevOps & Email', label: 'DevOps & Email' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`category-tab-btn ${selectedCategory === tab.key ? 'active' : ''}`}
            onClick={() => setSelectedCategory(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search and Filters Controls Row */}
      <div className="task-filters-row">
        <div className="filter-search-controls" style={{ flex: 1, gap: '12px' }}>
          <input
            type="text"
            className="search-input"
            style={{ width: '280px' }}
            placeholder="Search by project name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className="select-filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Review">Review</option>
            <option value="Completed">Completed</option>
            <option value="On Hold">On Hold</option>
          </select>

          {(searchQuery || selectedCategory !== 'All' || selectedStatus !== 'All') && (
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12.5px' }}
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Projects Grid / Loading / Empty State */}
      {loading ? (
        <div className="loading-card">Loading projects from PostgreSQL database...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="empty-state-card">
          No projects found matching your search and filter criteria.
        </div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="project-card"
              onClick={() => handleOpenDetails(project)}
              title="Click to view details, edit, or delete"
            >
              <div>
                <div className="project-card-header">
                  <span className="project-id-badge">{project.project_code}</span>
                  <span
                    className={
                      project.status.toLowerCase() === 'active'
                        ? 'project-status-active'
                        : project.status.toLowerCase() === 'review'
                        ? 'project-status-review'
                        : project.status.toLowerCase() === 'completed'
                        ? 'project-status-completed'
                        : 'project-status-onhold'
                    }
                  >
                    {project.status}
                  </span>
                </div>

                <h2 className="project-name">{project.name}</h2>
                <div className="project-category">{project.category}</div>

                <p className="project-desc">{project.description || 'No description provided.'}</p>
              </div>

              <div>
                <div className="velocity-section">
                  <div className="velocity-label-row">
                    <span>Completion Velocity</span>
                    <strong>{project.progress}%</strong>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}
                    ></div>
                  </div>
                </div>

                <div className="project-meta-divider">
                  <div className="meta-item">
                    Lead: <strong>{project.lead || project.project_lead}</strong>
                  </div>
                  <div className="meta-item">
                    Deadline: <strong>{project.deadline}</strong>
                  </div>
                  <div className="meta-item">
                    Tasks: <strong>{project.tasks || `${project.tasks_completed || 0}/${project.tasks_total || 0}`}</strong>
                  </div>
                </div>

                <div className="tech-tags-row">
                  {project.tags && project.tags.length > 0 ? (
                    project.tags.map((tag) => (
                      <span key={tag} className="tech-tag">
                        #{tag.replace(/^#/, '')}
                      </span>
                    ))
                  ) : (
                    <span className="tech-tag">#General</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 1. Create New Project Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="card-heading" style={{ margin: 0 }}>Create New Project</h2>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="form-error-text" style={{ marginBottom: '12px' }}>
                    ⚠ {formError}
                  </div>
                )}

                <div className="task-form-group">
                  <label className="form-label">Project Name *</label>
                  <input
                    type="text"
                    className="task-input"
                    placeholder="e.g. Enterprise Security Gateway"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row-2col">
                  <div>
                    <label className="form-label">Category *</label>
                    <input
                      type="text"
                      className="task-input"
                      placeholder="e.g. Backend & Infrastructure"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Project Lead *</label>
                    <input
                      type="text"
                      className="task-input"
                      placeholder="e.g. Krush Gabani"
                      value={formData.project_lead}
                      onChange={(e) => setFormData({ ...formData, project_lead: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row-2col">
                  <div>
                    <label className="form-label">Deadline *</label>
                    <input
                      type="date"
                      className="task-input"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Status</label>
                    <select
                      className="contact-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Review">Review</option>
                      <option value="Completed">Completed</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-2col">
                  <div>
                    <label className="form-label">Progress Velocity (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="task-input"
                      value={formData.progress}
                      onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Tasks (Done / Total)</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        className="task-input"
                        placeholder="Done"
                        value={formData.tasks_completed}
                        onChange={(e) => setFormData({ ...formData, tasks_completed: e.target.value })}
                      />
                      <span>/</span>
                      <input
                        type="number"
                        min="1"
                        className="task-input"
                        placeholder="Total"
                        value={formData.tasks_total}
                        onChange={(e) => setFormData({ ...formData, tasks_total: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="task-form-group">
                  <label className="form-label">Technology Tags (comma-separated)</label>
                  <input
                    type="text"
                    className="task-input"
                    placeholder="e.g. React19, Node.js, PostgreSQL, Docker"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>

                <div className="task-form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Description</label>
                  <textarea
                    className="task-textarea"
                    rows={3}
                    placeholder="Provide overview of scope and key objectives..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Saving...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Project Details Modal */}
      {isDetailsModalOpen && selectedProject && (
        <div className="modal-overlay" onClick={() => setIsDetailsModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="project-id-badge">{selectedProject.project_code}</span>
                <span
                  className={
                    selectedProject.status.toLowerCase() === 'active'
                      ? 'project-status-active'
                      : selectedProject.status.toLowerCase() === 'review'
                      ? 'project-status-review'
                      : selectedProject.status.toLowerCase() === 'completed'
                      ? 'project-status-completed'
                      : 'project-status-onhold'
                  }
                >
                  {selectedProject.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <h2 className="project-name" style={{ fontSize: '20px', marginBottom: '4px' }}>
                {selectedProject.name}
              </h2>
              <div className="project-category" style={{ marginBottom: '16px' }}>
                {selectedProject.category}
              </div>

              <p className="project-desc" style={{ minHeight: 'unset', marginBottom: '20px' }}>
                {selectedProject.description || 'No description provided.'}
              </p>

              <div className="velocity-section" style={{ marginBottom: '20px' }}>
                <div className="velocity-label-row">
                  <span>Completion Velocity</span>
                  <strong>{selectedProject.progress}%</strong>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(100, Math.max(0, selectedProject.progress))}%` }}
                  ></div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div className="meta-item">
                  Lead: <strong>{selectedProject.lead || selectedProject.project_lead}</strong>
                </div>
                <div className="meta-item">
                  Deadline: <strong>{selectedProject.deadline}</strong>
                </div>
                <div className="meta-item">
                  Task Completion: <strong>{selectedProject.tasks || `${selectedProject.tasks_completed || 0}/${selectedProject.tasks_total || 0}`}</strong>
                </div>
                <div className="meta-item">
                  Created Date: <strong>{selectedProject.created_at ? new Date(selectedProject.created_at).toLocaleDateString() : 'N/A'}</strong>
                </div>
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: '8px' }}>Technology Tags</label>
                <div className="tech-tags-row">
                  {selectedProject.tags && selectedProject.tags.length > 0 ? (
                    selectedProject.tags.map((tag) => (
                      <span key={tag} className="tech-tag">
                        #{tag.replace(/^#/, '')}
                      </span>
                    ))
                  ) : (
                    <span className="tech-tag">#General</span>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              <button
                type="button"
                className="btn-action-delete"
                style={{ padding: '8px 16px', fontSize: '13px' }}
                onClick={() => handleDeleteProject(selectedProject)}
              >
                <Trash2 size={14} />
                Delete Project
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsDetailsModalOpen(false)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => handleOpenEdit(selectedProject)}
                >
                  <Pencil size={14} />
                  Edit Project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Edit Project Modal */}
      {isEditModalOpen && selectedProject && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="card-heading" style={{ margin: 0 }}>
                  Edit Project ({selectedProject.project_code})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="form-error-text" style={{ marginBottom: '12px' }}>
                    ⚠ {formError}
                  </div>
                )}

                <div className="task-form-group">
                  <label className="form-label">Project Name *</label>
                  <input
                    type="text"
                    className="task-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row-2col">
                  <div>
                    <label className="form-label">Category *</label>
                    <input
                      type="text"
                      className="task-input"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Project Lead *</label>
                    <input
                      type="text"
                      className="task-input"
                      value={formData.project_lead}
                      onChange={(e) => setFormData({ ...formData, project_lead: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-row-2col">
                  <div>
                    <label className="form-label">Deadline *</label>
                    <input
                      type="date"
                      className="task-input"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Status</label>
                    <select
                      className="contact-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Review">Review</option>
                      <option value="Completed">Completed</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  </div>
                </div>

                <div className="form-row-2col">
                  <div>
                    <label className="form-label">Progress Velocity (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="task-input"
                      value={formData.progress}
                      onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Tasks (Done / Total)</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        className="task-input"
                        value={formData.tasks_completed}
                        onChange={(e) => setFormData({ ...formData, tasks_completed: e.target.value })}
                      />
                      <span>/</span>
                      <input
                        type="number"
                        min="1"
                        className="task-input"
                        value={formData.tasks_total}
                        onChange={(e) => setFormData({ ...formData, tasks_total: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="task-form-group">
                  <label className="form-label">Technology Tags (comma-separated)</label>
                  <input
                    type="text"
                    className="task-input"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  />
                </div>

                <div className="task-form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Description</label>
                  <textarea
                    className="task-textarea"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
