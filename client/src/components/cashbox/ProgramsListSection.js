import React from 'react';

function ProgramsListSection({
  programs,
  newProgramName,
  setNewProgramName,
  addingProgram,
  onAddProgram,
  editingProgramId,
  editProgramName,
  setEditProgramName,
  onStartEditProgram,
  onUpdateProgram,
  onCancelEditProgram,
  onViewLog,
  onOpenTransaction,
  onDeactivateProgram
}) {
  return (
    <div className="card">
      <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--color-primary)' }}>
        Manage Programs
      </h2>

      <form onSubmit={onAddProgram} style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="programName">New Program Name</label>
            <input
              type="text"
              id="programName"
              className="input"
              value={newProgramName}
              onChange={(e) => setNewProgramName(e.target.value)}
              placeholder="e.g., Football"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={addingProgram}
          >
            {addingProgram ? 'Adding...' : 'Add Program'}
          </button>
        </div>
      </form>

      {programs.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No programs yet.</p>
      ) : (
        <div>
          {programs.map((program) => (
            <div key={program.id} style={{
              background: 'var(--color-bg-input)',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '8px'
            }}>
              {editingProgramId === program.id ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="input"
                    value={editProgramName}
                    onChange={(e) => setEditProgramName(e.target.value)}
                    style={{ flex: 1, minWidth: '150px' }}
                  />
                  <button
                    className="btn btn-primary btn-small"
                    onClick={() => onUpdateProgram(program.id)}
                  >
                    Save
                  </button>
                  <button
                    className="btn btn-small"
                    onClick={onCancelEditProgram}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <strong style={{ color: 'var(--color-primary)', fontSize: '16px' }}>{program.name}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-small"
                      onClick={() => onViewLog(program)}
                      style={{ background: 'var(--color-text-subtle)' }}
                    >
                      View Log
                    </button>
                    <button
                      className="btn btn-small"
                      onClick={() => onOpenTransaction(program)}
                      style={{ background: 'var(--color-primary)' }}
                    >
                      $ Withdraw/Deposit
                    </button>
                    <button
                      className="btn btn-small"
                      onClick={() => onStartEditProgram(program)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => onDeactivateProgram(program.id, program.name)}
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProgramsListSection;
