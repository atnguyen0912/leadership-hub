import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';

function ManageStudents() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Tab state
  const [activeTab, setActiveTab] = useState('students');

  // Add student form
  const [newStudentId, setNewStudentId] = useState('');
  const [newName, setNewName] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // CSV upload
  const [uploadResult, setUploadResult] = useState(null);

  // Lead type loading state
  const [leadLoading, setLeadLoading] = useState(null);

  // CSV save/download state
  const [savingCSV, setSavingCSV] = useState(false);

  // Permission groups state
  const [permissionGroups, setPermissionGroups] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupFormData, setGroupFormData] = useState({ name: '', description: '', permissions: [] });
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);

  // Student ID validation: 6 digits + M/F/X + 3 digits (e.g., 123456M789)
  const STUDENT_ID_REGEX = /^\d{6}[MFX]\d{3}$/;

  const validateStudentId = (id) => {
    return STUDENT_ID_REGEX.test(id);
  };

  useEffect(() => {
    fetchStudents();
    fetchPermissionGroups();
    fetchAvailablePermissions();
  }, []);

  const fetchPermissionGroups = async () => {
    try {
      const response = await fetch('/api/permissions/groups');
      const data = await response.json();
      if (response.ok) {
        setPermissionGroups(data);
      }
    } catch (err) {
      console.error('Error fetching permission groups:', err);
    }
  };

  const fetchAvailablePermissions = async () => {
    try {
      const response = await fetch('/api/permissions/available');
      const data = await response.json();
      if (response.ok) {
        setAvailablePermissions(data);
      }
    } catch (err) {
      console.error('Error fetching permissions:', err);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/permissions/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupFormData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess('Permission group created successfully!');
      setShowGroupForm(false);
      setGroupFormData({ name: '', description: '', permissions: [] });
      fetchPermissionGroups();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    if (!selectedGroup) return;
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/permissions/groups/${selectedGroup.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupFormData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess('Permission group updated successfully!');
      setShowGroupForm(false);
      setSelectedGroup(null);
      setGroupFormData({ name: '', description: '', permissions: [] });
      fetchPermissionGroups();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this permission group?')) return;
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/permissions/groups/${groupId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess('Permission group deleted successfully!');
      fetchPermissionGroups();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditGroup = (group) => {
    setSelectedGroup(group);
    setGroupFormData({
      name: group.name,
      description: group.description || '',
      permissions: group.permissions || []
    });
    setShowGroupForm(true);
  };

  const handleManageMembers = async (group) => {
    setSelectedGroup(group);
    setShowMemberModal(true);
    setSelectedStudents([]);
    setMemberSearch('');

    // Fetch fresh group data with members
    try {
      const response = await fetch(`/api/permissions/groups/${group.id}`);
      const data = await response.json();
      if (response.ok) {
        setSelectedGroup(data);
      }
    } catch (err) {
      console.error('Error fetching group details:', err);
    }
  };

  const handleAddMembers = async () => {
    if (!selectedGroup || selectedStudents.length === 0) return;
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/permissions/groups/${selectedGroup.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedStudents })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess(`Added ${data.added} member(s) to ${selectedGroup.name}`);
      setSelectedStudents([]);
      handleManageMembers(selectedGroup);
      fetchPermissionGroups();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRemoveMember = async (studentId) => {
    if (!selectedGroup) return;
    setError('');

    try {
      const response = await fetch(`/api/permissions/groups/${selectedGroup.id}/members/${studentId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      handleManageMembers(selectedGroup);
      fetchPermissionGroups();
    } catch (err) {
      setError(err.message);
    }
  };

  const togglePermission = (permission) => {
    setGroupFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const getFilteredStudentsForModal = () => {
    if (!selectedGroup) return [];
    const memberIds = (selectedGroup.members || []).map(m => m.student_id);
    return students.filter(s =>
      !memberIds.includes(s.student_id) &&
      (s.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
       s.student_id.toLowerCase().includes(memberSearch.toLowerCase()))
    );
  };

  const groupPermissionsByCategory = () => {
    const grouped = {};
    availablePermissions.forEach(p => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });
    return grouped;
  };

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch students');
      }

      setStudents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate student ID format
    if (!validateStudentId(newStudentId)) {
      setError('Invalid Student ID format. Must be 6 digits + M/F/X + 3 digits (e.g., 123456M789)');
      return;
    }

    setAddLoading(true);

    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: newStudentId, name: newName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add student');
      }

      setSuccess('Student added successfully!');
      setNewStudentId('');
      setNewName('');
      fetchStudents();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!window.confirm('Are you sure you want to remove this student? This will also delete all their logged hours.')) {
      return;
    }

    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove student');
      }

      setSuccess('Student removed successfully!');
      fetchStudents();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/students/upload-csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload CSV');
      }

      setUploadResult(data);
      if (data.added > 0) {
        setSuccess(`Successfully added ${data.added} student(s)!`);
      }
      fetchStudents();
    } catch (err) {
      setError(err.message);
    }

    // Reset file input
    e.target.value = '';
  };

  const handleSetLeadType = async (studentId, leadType) => {
    setLeadLoading(studentId);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/students/${studentId}/set-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update lead status');
      }

      const typeLabel = leadType === 'events' ? 'Events Lead' :
                        leadType === 'concessions' ? 'Concessions Lead' : 'Regular Student';
      setSuccess(`Updated to ${typeLabel} successfully!`);
      fetchStudents();
    } catch (err) {
      setError(err.message);
    } finally {
      setLeadLoading(null);
    }
  };

  const getLeadTypeLabel = (student) => {
    if (!student.is_lead || !student.lead_type) return null;
    if (student.lead_type === 'events') return 'Events';
    if (student.lead_type === 'concessions') return 'Concessions';
    return student.lead_type;
  };

  const getLeadTypeColor = (leadType) => {
    if (leadType === 'events') return 'var(--color-info)';
    if (leadType === 'concessions') return 'var(--color-primary)';
    return 'var(--color-text-muted)';
  };

  // Save students to CSV file on server
  const handleSaveToCSV = async () => {
    setSavingCSV(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/students/save-to-csv', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save CSV');
      }

      setSuccess(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCSV(false);
    }
  };

  // Download students as CSV file
  const handleDownloadCSV = () => {
    window.open('/api/students/csv', '_blank');
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="admin-table-layout">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const renderPermissionGroupsTab = () => (
    <>
      {/* Permission Groups List */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-primary)' }}>Permission Groups</h2>
          <button
            className="btn btn-primary btn-small"
            onClick={() => {
              setSelectedGroup(null);
              setGroupFormData({ name: '', description: '', permissions: [] });
              setShowGroupForm(true);
            }}
          >
            + New Group
          </button>
        </div>

        {permissionGroups.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No permission groups yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {permissionGroups.map(group => (
              <div
                key={group.id}
                style={{
                  padding: '16px',
                  background: 'var(--color-bg-input)',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '16px' }}>{group.name}</h3>
                    {group.description && (
                      <p style={{ margin: '4px 0 0', color: 'var(--color-text-subtle)', fontSize: '13px' }}>{group.description}</p>
                    )}
                    <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 8px',
                        background: 'rgba(74, 124, 89, 0.19)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: 'var(--color-text-muted)'
                      }}>
                        {group.member_count || 0} member{group.member_count !== 1 ? 's' : ''}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        background: 'rgba(59, 130, 246, 0.19)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: 'var(--color-info)'
                      }}>
                        {(group.permissions || []).length} permission{(group.permissions || []).length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-small"
                      onClick={() => handleManageMembers(group)}
                      style={{ background: 'var(--color-info)' }}
                    >
                      Members
                    </button>
                    <button
                      className="btn btn-small"
                      onClick={() => handleEditGroup(group)}
                    >
                      Edit
                    </button>
                    {!['Admin', 'Member'].includes(group.name) && (
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => handleDeleteGroup(group.id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Group Form Modal */}
      {showGroupForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--color-bg)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginBottom: '16px', color: 'var(--color-primary)' }}>
              {selectedGroup ? 'Edit Permission Group' : 'Create Permission Group'}
            </h2>
            <form onSubmit={selectedGroup ? handleUpdateGroup : handleCreateGroup}>
              <div className="form-group">
                <label>Group Name</label>
                <input
                  type="text"
                  className="input"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  className="input"
                  value={groupFormData.description}
                  onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label style={{ marginBottom: '12px', display: 'block' }}>Permissions</label>
                {Object.entries(groupPermissionsByCategory()).map(([category, perms]) => (
                  <div key={category} style={{ marginBottom: '16px' }}>
                    <h4 style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginBottom: '8px' }}>{category}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                      {perms.map(perm => (
                        <label
                          key={perm.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px',
                            background: groupFormData.permissions.includes(perm.key) ? 'rgba(34, 197, 94, 0.13)' : 'var(--color-bg-input)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            border: `1px solid ${groupFormData.permissions.includes(perm.key) ? 'var(--color-primary)' : 'var(--color-border)'}`
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={groupFormData.permissions.includes(perm.key)}
                            onChange={() => togglePermission(perm.key)}
                          />
                          <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setShowGroupForm(false);
                    setSelectedGroup(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {selectedGroup ? 'Update Group' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Management Modal */}
      {showMemberModal && selectedGroup && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--color-bg)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2 style={{ marginBottom: '16px', color: 'var(--color-primary)' }}>
              Manage Members: {selectedGroup.name}
            </h2>

            {/* Current Members */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
                Current Members ({(selectedGroup.members || []).length})
              </h3>
              {(selectedGroup.members || []).length === 0 ? (
                <p style={{ color: 'var(--color-text-subtle)', fontSize: '13px' }}>No members in this group yet.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(selectedGroup.members || []).map(member => (
                    <div
                      key={member.student_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 12px',
                        background: 'var(--color-bg-input)',
                        borderRadius: '20px',
                        fontSize: '13px'
                      }}
                    >
                      <span style={{ color: 'var(--color-text-muted)' }}>{member.name}</span>
                      <button
                        onClick={() => handleRemoveMember(member.student_id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-danger)',
                          cursor: 'pointer',
                          padding: '0 4px',
                          fontSize: '16px'
                        }}
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Members */}
            <div>
              <h3 style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>Add Members</h3>
              <input
                type="text"
                className="input"
                placeholder="Search students..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                style={{ marginBottom: '12px' }}
              />
              <div style={{ maxHeight: '200px', overflow: 'auto', marginBottom: '12px' }}>
                {getFilteredStudentsForModal().slice(0, 50).map(student => (
                  <label
                    key={student.student_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      background: selectedStudents.includes(student.student_id) ? 'rgba(34, 197, 94, 0.13)' : 'transparent',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.student_id)}
                      onChange={() => toggleStudentSelection(student.student_id)}
                    />
                    <span style={{ color: 'var(--color-text-muted)' }}>{student.name}</span>
                    <span style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>({student.student_id})</span>
                  </label>
                ))}
              </div>
              {selectedStudents.length > 0 && (
                <button className="btn btn-primary" onClick={handleAddMembers}>
                  Add {selectedStudents.length} Selected
                </button>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button
                className="btn"
                onClick={() => {
                  setShowMemberModal(false);
                  setSelectedGroup(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div>
      <Navbar />
      <div className="admin-table-layout">
        <h1 className="page-title">Manage Students</h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            className={`btn ${activeTab === 'students' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('students')}
            style={{ flex: 1 }}
          >
            Students
          </button>
          <button
            className={`btn ${activeTab === 'permissions' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('permissions')}
            style={{ flex: 1 }}
          >
            Permission Groups
          </button>
        </div>

        {error && <div className="card"><div className="error-message">{error}</div></div>}
        {success && <div className="card"><div className="success-message">{success}</div></div>}

        {activeTab === 'permissions' ? renderPermissionGroupsTab() : (
        <>
        {/* Add Student Form */}
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--color-primary)' }}>Add Student</h2>
          <form onSubmit={handleAddStudent}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="studentId">Student ID</label>
                <input
                  type="text"
                  id="studentId"
                  className="input"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value.toUpperCase())}
                  placeholder="e.g., 123456M789"
                  pattern="\d{6}[MFX]\d{3}"
                  maxLength={10}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  className="input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., John Smith"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={addLoading}>
                {addLoading ? 'Adding...' : 'Add'}
              </button>
            </div>
          </form>
        </div>

        {/* CSV Upload */}
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--color-primary)' }}>Upload CSV Roster</h2>
          <p style={{ marginBottom: '12px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
            CSV file should have columns: student_id, name
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            className="input"
            style={{ padding: '8px' }}
          />
          {uploadResult && uploadResult.errors.length > 0 && (
            <div style={{ marginTop: '12px', padding: '12px', background: 'var(--color-bg-input)', border: '1px solid var(--color-warning)', borderRadius: '8px' }}>
              <p style={{ fontWeight: 500, marginBottom: '8px', color: 'var(--color-warning)' }}>Warnings:</p>
              <ul style={{ marginLeft: '20px', fontSize: '14px', color: 'var(--color-warning)' }}>
                {uploadResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Save/Export CSV */}
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--color-primary)' }}>Export Students</h2>
          <p style={{ marginBottom: '12px', color: 'var(--color-text-muted)', fontSize: '14px' }}>
            Save students to CSV to persist data between deployments, or download for backup.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary"
              onClick={handleSaveToCSV}
              disabled={savingCSV}
            >
              {savingCSV ? 'Saving...' : 'Save to Server CSV'}
            </button>
            <button
              className="btn"
              onClick={handleDownloadCSV}
              style={{ background: 'var(--color-text-subtle)' }}
            >
              Download CSV
            </button>
          </div>
        </div>

        {/* Students Table */}
        <div className="card">
          <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--color-primary)' }}>All Students ({students.length})</h2>
          {students.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No students registered yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th style={{ width: '180px' }}>Lead Role</th>
                    <th style={{ width: '100px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const leadLabel = getLeadTypeLabel(student);
                    return (
                      <tr key={student.student_id}>
                        <td>{student.student_id}</td>
                        <td>
                          {student.name}
                          {leadLabel && (
                            <span style={{
                              marginLeft: '8px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 600,
                              background: getLeadTypeColor(student.lead_type),
                              color: 'var(--color-text)'
                            }}>
                              {leadLabel}
                            </span>
                          )}
                        </td>
                        <td>
                          <select
                            className="input"
                            value={student.lead_type || ''}
                            onChange={(e) => handleSetLeadType(student.student_id, e.target.value || null)}
                            disabled={leadLoading === student.student_id}
                            style={{
                              padding: '6px 8px',
                              minHeight: '36px',
                              fontSize: '13px',
                              background: student.lead_type ? getLeadTypeColor(student.lead_type) + '20' : undefined,
                              borderColor: student.lead_type ? getLeadTypeColor(student.lead_type) : undefined
                            }}
                          >
                            <option value="">None</option>
                            <option value="events">Events Lead</option>
                            <option value="concessions">Concessions Lead</option>
                          </select>
                        </td>
                        <td>
                          <button
                            className="btn btn-danger btn-small"
                            onClick={() => handleDeleteStudent(student.student_id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
}

export default ManageStudents;
