import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

function CashBoxAdmin({ user, onLogout }) {
  const navigate = useNavigate();
  const [cashbox, setCashbox] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [programsWithEarnings, setProgramsWithEarnings] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('sessions');

  // Create session form
  const [sessionName, setSessionName] = useState('');
  const [sessionProgramId, setSessionProgramId] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);

  // Program management
  const [newProgramName, setNewProgramName] = useState('');
  const [addingProgram, setAddingProgram] = useState(false);

  // Menu management
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemParentId, setNewItemParentId] = useState('');
  const [addingMenuItem, setAddingMenuItem] = useState(false);

  // Edit menu item
  const [editingMenuItemId, setEditingMenuItemId] = useState(null);
  const [editMenuItemName, setEditMenuItemName] = useState('');
  const [editMenuItemPrice, setEditMenuItemPrice] = useState('');

  // Edit program
  const [editingProgramId, setEditingProgramId] = useState(null);
  const [editProgramName, setEditProgramName] = useState('');

  // Program transactions
  const [transactionProgramId, setTransactionProgramId] = useState(null);
  const [transactionType, setTransactionType] = useState('deposit');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');

  // Program log view
  const [logProgramId, setLogProgramId] = useState(null);
  const [programLog, setProgramLog] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);

  // Drag and drop for menu items
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);

  // CSV operations
  const [savingCSV, setSavingCSV] = useState(false);

  // Edit main cashbox
  const [editingCashbox, setEditingCashbox] = useState(false);
  const [editQuarters, setEditQuarters] = useState(0);
  const [editBills1, setEditBills1] = useState(0);
  const [editBills5, setEditBills5] = useState(0);
  const [editBills10, setEditBills10] = useState(0);
  const [editBills20, setEditBills20] = useState(0);
  const [editBills50, setEditBills50] = useState(0);
  const [editBills100, setEditBills100] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [cashboxRes, sessionsRes, programsRes, earningsRes, menuRes] = await Promise.all([
        fetch('/api/cashbox'),
        fetch('/api/cashbox/sessions?limit=50'),
        fetch('/api/cashbox/programs'),
        fetch('/api/cashbox/programs/earnings'),
        fetch('/api/menu/all')
      ]);

      const cashboxData = await cashboxRes.json();
      const sessionsData = await sessionsRes.json();
      const programsData = await programsRes.json();
      const earningsData = await earningsRes.json();
      const menuData = await menuRes.json();

      if (!cashboxRes.ok) throw new Error(cashboxData.error);
      if (!sessionsRes.ok) throw new Error(sessionsData.error);
      if (!programsRes.ok) throw new Error(programsData.error);
      if (!earningsRes.ok) throw new Error(earningsData.error);
      if (!menuRes.ok) throw new Error(menuData.error);

      setCashbox(cashboxData);
      setSessions(sessionsData);
      setPrograms(programsData);
      setProgramsWithEarnings(earningsData);
      setMenuItems(menuData);

      if (programsData.length > 0 && !sessionProgramId) {
        setSessionProgramId(programsData[0].id.toString());
      }

      // Initialize edit values
      setEditQuarters(cashboxData.quarters);
      setEditBills1(cashboxData.bills_1);
      setEditBills5(cashboxData.bills_5);
      setEditBills10(cashboxData.bills_10);
      setEditBills20(cashboxData.bills_20);
      setEditBills50(cashboxData.bills_50);
      setEditBills100(cashboxData.bills_100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'created': return 'pending';
      case 'active': return 'approved';
      case 'closed': return 'completed';
      case 'cancelled': return 'rejected';
      default: return '';
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!sessionName.trim() || !sessionProgramId) return;

    setError('');
    setSuccess('');
    setCreatingSession(true);

    try {
      const response = await fetch('/api/cashbox/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: sessionName.trim(),
          programId: parseInt(sessionProgramId),
          createdBy: 'admin'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create session');
      }

      setSuccess('Session created successfully!');
      setSessionName('');
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingSession(false);
    }
  };

  const handleCancelSession = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this session?')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/cashbox/sessions/${id}/cancel`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel session');
      }

      setSuccess('Session cancelled.');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddProgram = async (e) => {
    e.preventDefault();
    if (!newProgramName.trim()) return;

    setError('');
    setSuccess('');
    setAddingProgram(true);

    try {
      const response = await fetch('/api/cashbox/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProgramName.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add program');
      }

      setSuccess('Program added successfully!');
      setNewProgramName('');
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingProgram(false);
    }
  };

  const handleDeactivateProgram = async (id, name) => {
    if (!window.confirm(`Are you sure you want to deactivate "${name}"?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/cashbox/programs/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deactivate program');
      }

      setSuccess('Program deactivated.');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddMenuItem = async (e) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    setError('');
    setSuccess('');
    setAddingMenuItem(true);

    try {
      const response = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItemName.trim(),
          price: newItemPrice ? parseFloat(newItemPrice) : null,
          parentId: newItemParentId ? parseInt(newItemParentId) : null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add menu item');
      }

      setSuccess('Menu item added successfully!');
      setNewItemName('');
      setNewItemPrice('');
      setNewItemParentId('');
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setAddingMenuItem(false);
    }
  };

  const handleDeactivateMenuItem = async (id, name) => {
    if (!window.confirm(`Are you sure you want to deactivate "${name}"? The item will be hidden but kept for records.`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/menu/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to deactivate menu item');
      }

      setSuccess('Menu item deactivated.');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteMenuItem = async (id, name) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE "${name}"? This cannot be undone!`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/menu/${id}/permanent`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete menu item');
      }

      setSuccess('Menu item permanently deleted.');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReactivateMenuItem = async (id, name) => {
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/menu/${id}/reactivate`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reactivate menu item');
      }

      setSuccess(`"${name}" has been reactivated.`);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEditingMenuItem = (item) => {
    setEditingMenuItemId(item.id);
    setEditMenuItemName(item.name);
    setEditMenuItemPrice(item.price !== null ? item.price.toString() : '');
  };

  const cancelEditingMenuItem = () => {
    setEditingMenuItemId(null);
    setEditMenuItemName('');
    setEditMenuItemPrice('');
  };

  const handleUpdateMenuItem = async (id) => {
    if (!editMenuItemName.trim()) return;

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/menu/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editMenuItemName.trim(),
          price: editMenuItemPrice ? parseFloat(editMenuItemPrice) : null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update menu item');
      }

      setSuccess('Menu item updated successfully!');
      cancelEditingMenuItem();
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEditingProgram = (program) => {
    setEditingProgramId(program.id);
    setEditProgramName(program.name);
  };

  const cancelEditingProgram = () => {
    setEditingProgramId(null);
    setEditProgramName('');
  };

  const handleUpdateProgram = async (id) => {
    if (!editProgramName.trim()) return;

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/cashbox/programs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editProgramName.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update program');
      }

      setSuccess('Program updated successfully!');
      cancelEditingProgram();
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const openTransactionModal = (program) => {
    setTransactionProgramId(program.id);
    setTransactionType('deposit');
    setTransactionAmount('');
    setTransactionDescription('');
  };

  const closeTransactionModal = () => {
    setTransactionProgramId(null);
    setTransactionAmount('');
    setTransactionDescription('');
  };

  const handleProgramTransaction = async () => {
    if (!transactionAmount || parseFloat(transactionAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/cashbox/programs/${transactionProgramId}/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: transactionType,
          amount: parseFloat(transactionAmount),
          description: transactionDescription.trim() || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process transaction');
      }

      setSuccess(`${transactionType === 'deposit' ? 'Deposit' : 'Withdrawal'} of ${formatCurrency(data.amount)} successful. New balance: ${formatCurrency(data.newTotal)}`);
      closeTransactionModal();
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Program log functions
  const openProgramLog = async (program) => {
    setLogProgramId(program.id);
    setLoadingLog(true);
    setProgramLog([]);

    try {
      const response = await fetch(`/api/cashbox/programs/${program.id}/earnings`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load log');
      }

      setProgramLog(data.earnings_history || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingLog(false);
    }
  };

  const closeProgramLog = () => {
    setLogProgramId(null);
    setProgramLog([]);
  };

  // Drag and drop handlers for menu items
  const handleDragStart = (e, item, isSubItem = false, parentId = null) => {
    setDraggedItem({ ...item, isSubItem, parent_id: parentId || item.parent_id });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, item, isSubItem = false) => {
    e.preventDefault();
    // Allow drag over any item (for moving into categories)
    if (draggedItem) {
      setDragOverItem({ ...item, isSubItem });
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
  };

  const handleDrop = async (e, targetItem, isSubItem = false, targetParentId = null) => {
    e.preventDefault();
    setDragOverItem(null);

    if (!draggedItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      return;
    }

    // Get the actual parent_id for the target
    const actualTargetParentId = targetParentId || targetItem.parent_id;

    try {
      // Case 1: Dropping a top-level item onto a category (move into category)
      if (!draggedItem.isSubItem && !isSubItem && targetItem.price === null && draggedItem.price !== null) {
        const response = await fetch(`/api/menu/${draggedItem.id}/set-parent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentId: targetItem.id })
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.error || 'Failed to move item');
        } else {
          setSuccess(data.message);
        }
        fetchData();
        setDraggedItem(null);
        return;
      }

      // Case 2: Dropping a sub-item to top level (make it top-level)
      if (draggedItem.isSubItem && !isSubItem && targetItem.price !== null) {
        // If dropping onto another top-level item with price, make dragged item top-level
        const response = await fetch(`/api/menu/${draggedItem.id}/set-parent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentId: null })
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.error || 'Failed to move item');
        } else {
          setSuccess(data.message);
        }
        fetchData();
        setDraggedItem(null);
        return;
      }

      // Case 3: Reordering sub-items within same parent
      if (draggedItem.isSubItem && isSubItem && draggedItem.parent_id === actualTargetParentId) {
        const parentItem = menuItems.find(item => item.id === draggedItem.parent_id);
        if (!parentItem || !parentItem.subItems) {
          setDraggedItem(null);
          return;
        }

        const subItems = [...parentItem.subItems];
        const dragIndex = subItems.findIndex(i => i.id === draggedItem.id);
        const dropIndex = subItems.findIndex(i => i.id === targetItem.id);

        if (dragIndex === -1 || dropIndex === -1) {
          setDraggedItem(null);
          return;
        }

        subItems.splice(dragIndex, 1);
        subItems.splice(dropIndex, 0, { ...draggedItem });

        await fetch('/api/menu/reorder-subitems', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentId: draggedItem.parent_id, items: subItems })
        });

        fetchData();
        setDraggedItem(null);
        return;
      }

      // Case 4: Reordering top-level items
      if (!draggedItem.isSubItem && !isSubItem) {
        const items = [...menuItems];
        const dragIndex = items.findIndex(i => i.id === draggedItem.id);
        const dropIndex = items.findIndex(i => i.id === targetItem.id);

        if (dragIndex === -1 || dropIndex === -1) {
          setDraggedItem(null);
          return;
        }

        items.splice(dragIndex, 1);
        items.splice(dropIndex, 0, draggedItem);

        await fetch('/api/menu/reorder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items })
        });

        fetchData();
      }
    } catch (err) {
      setError('Failed to move/reorder items');
    }

    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  // Move sub-item to top level
  const handleMoveToTopLevel = async (item) => {
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/menu/${item.id}/set-parent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentId: null })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to move item');
      }

      setSuccess(data.message);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Save menu to CSV file on server
  const handleSaveMenuToCSV = async () => {
    setSavingCSV(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/menu/save-to-csv', {
        method: 'POST'
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save menu to CSV');
      }

      setSuccess(data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCSV(false);
    }
  };

  // Download menu as CSV file
  const handleDownloadMenuCSV = () => {
    window.open('/api/menu/csv', '_blank');
  };

  const handleUpdateCashbox = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/cashbox/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quarters: editQuarters,
          bills_1: editBills1,
          bills_5: editBills5,
          bills_10: editBills10,
          bills_20: editBills20,
          bills_50: editBills50,
          bills_100: editBills100
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update cashbox');
      }

      setSuccess('Cashbox updated successfully!');
      setEditingCashbox(false);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar user={user} onLogout={onLogout} />
        <div className="container">
          <p style={{ color: '#22c55e' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Get parent items (items with no price) for sub-menu selection
  const parentItems = menuItems.filter(item => item.price === null);

  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      <div className="container">
        <h1 className="page-title">CashBox Admin</h1>

        {error && <div className="card"><div className="error-message">{error}</div></div>}
        {success && <div className="card"><div className="success-message">{success}</div></div>}

        {/* Main CashBox Balance */}
        {cashbox && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', color: '#22c55e' }}>Main CashBox Balance</h2>
              <button
                className="btn btn-small"
                onClick={() => setEditingCashbox(!editingCashbox)}
              >
                {editingCashbox ? 'Cancel' : 'Edit Counts'}
              </button>
            </div>

            {editingCashbox ? (
              <form onSubmit={handleUpdateCashbox}>
                <div className="denomination-inputs">
                  <div className="form-group">
                    <label>Quarters</label>
                    <input type="number" className="input" min="0" value={editQuarters} onChange={(e) => setEditQuarters(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label>$1 Bills</label>
                    <input type="number" className="input" min="0" value={editBills1} onChange={(e) => setEditBills1(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label>$5 Bills</label>
                    <input type="number" className="input" min="0" value={editBills5} onChange={(e) => setEditBills5(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label>$10 Bills</label>
                    <input type="number" className="input" min="0" value={editBills10} onChange={(e) => setEditBills10(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label>$20 Bills</label>
                    <input type="number" className="input" min="0" value={editBills20} onChange={(e) => setEditBills20(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label>$50 Bills</label>
                    <input type="number" className="input" min="0" value={editBills50} onChange={(e) => setEditBills50(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group">
                    <label>$100 Bills</label>
                    <input type="number" className="input" min="0" value={editBills100} onChange={(e) => setEditBills100(parseInt(e.target.value) || 0)} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }}>
                  Save Changes
                </button>
              </form>
            ) : (
              <>
                <div className="cashbox-totals">
                  <div className="denomination-card">
                    <div className="label">Quarters</div>
                    <div className="count">{cashbox.quarters}</div>
                    <div className="value">{formatCurrency(cashbox.quarters * 0.25)}</div>
                  </div>
                  <div className="denomination-card">
                    <div className="label">$1 Bills</div>
                    <div className="count">{cashbox.bills_1}</div>
                    <div className="value">{formatCurrency(cashbox.bills_1)}</div>
                  </div>
                  <div className="denomination-card">
                    <div className="label">$5 Bills</div>
                    <div className="count">{cashbox.bills_5}</div>
                    <div className="value">{formatCurrency(cashbox.bills_5 * 5)}</div>
                  </div>
                  <div className="denomination-card">
                    <div className="label">$10 Bills</div>
                    <div className="count">{cashbox.bills_10}</div>
                    <div className="value">{formatCurrency(cashbox.bills_10 * 10)}</div>
                  </div>
                  <div className="denomination-card">
                    <div className="label">$20 Bills</div>
                    <div className="count">{cashbox.bills_20}</div>
                    <div className="value">{formatCurrency(cashbox.bills_20 * 20)}</div>
                  </div>
                  <div className="denomination-card">
                    <div className="label">$50 Bills</div>
                    <div className="count">{cashbox.bills_50}</div>
                    <div className="value">{formatCurrency(cashbox.bills_50 * 50)}</div>
                  </div>
                  <div className="denomination-card">
                    <div className="label">$100 Bills</div>
                    <div className="count">{cashbox.bills_100}</div>
                    <div className="value">{formatCurrency(cashbox.bills_100 * 100)}</div>
                  </div>
                </div>
                <div className="cashbox-total">
                  Total: {formatCurrency(cashbox.totalValue)}
                </div>
              </>
            )}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="tab-nav">
          <button
            className={activeTab === 'sessions' ? 'active' : ''}
            onClick={() => setActiveTab('sessions')}
          >
            Sessions
          </button>
          <button
            className={activeTab === 'programs' ? 'active' : ''}
            onClick={() => setActiveTab('programs')}
          >
            Programs
          </button>
          <button
            className={activeTab === 'earnings' ? 'active' : ''}
            onClick={() => setActiveTab('earnings')}
          >
            Earnings
          </button>
          <button
            className={activeTab === 'menu' ? 'active' : ''}
            onClick={() => setActiveTab('menu')}
          >
            Menu
          </button>
          <button
            className={activeTab === 'history' ? 'active' : ''}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
        </div>

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="card">
            <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>
              Create New Session
            </h2>
            <form onSubmit={handleCreateSession} style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div className="form-group" style={{ flex: '2', minWidth: '200px', marginBottom: 0 }}>
                  <label htmlFor="sessionName">Session Name</label>
                  <input
                    type="text"
                    id="sessionName"
                    className="input"
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="e.g., Girls Basketball 12/11"
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: '1', minWidth: '150px', marginBottom: 0 }}>
                  <label htmlFor="sessionProgram">Program</label>
                  <select
                    id="sessionProgram"
                    className="input"
                    value={sessionProgramId}
                    onChange={(e) => setSessionProgramId(e.target.value)}
                    required
                  >
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingSession}
                  style={{ alignSelf: 'flex-end' }}
                >
                  {creatingSession ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </form>

            <h3 style={{ marginBottom: '12px', fontSize: '16px', color: '#4ade80' }}>
              Active Sessions
            </h3>
            {sessions.filter(s => s.status === 'created' || s.status === 'active').length === 0 ? (
              <p style={{ textAlign: 'center', color: '#4a7c59' }}>No active sessions.</p>
            ) : (
              sessions.filter(s => s.status === 'created' || s.status === 'active').map((session) => (
                <div key={session.id} className="session-card" style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ color: '#22c55e' }}>{session.name}</strong>
                      <div style={{ color: '#4ade80', fontSize: '14px' }}>{session.program_name}</div>
                    </div>
                    <span className={`status-badge ${getStatusBadgeClass(session.status)}`}>
                      {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                    </span>
                  </div>
                  <div style={{ marginTop: '8px', color: '#4a7c59', fontSize: '14px' }}>
                    Created: {formatDate(session.created_at)}
                    {session.start_total > 0 && (
                      <span style={{ marginLeft: '16px' }}>
                        Started: {formatCurrency(session.start_total)}
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-small"
                      onClick={() => navigate(`/concession-session/${session.id}`)}
                    >
                      View
                    </button>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={() => handleCancelSession(session.id)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Programs Tab */}
        {activeTab === 'programs' && (
          <div className="card">
            <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>
              Manage Programs
            </h2>

            <form onSubmit={handleAddProgram} style={{ marginBottom: '24px' }}>
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
              <p style={{ textAlign: 'center', color: '#4ade80' }}>No programs yet.</p>
            ) : (
              <div>
                {programs.map((program) => (
                  <div key={program.id} style={{
                    background: '#1a1a1a',
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
                          onClick={() => handleUpdateProgram(program.id)}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-small"
                          onClick={cancelEditingProgram}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <strong style={{ color: '#22c55e', fontSize: '16px' }}>{program.name}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-small"
                            onClick={() => openProgramLog(program)}
                            style={{ background: '#4a7c59' }}
                          >
                            View Log
                          </button>
                          <button
                            className="btn btn-small"
                            onClick={() => openTransactionModal(program)}
                            style={{ background: '#22c55e' }}
                          >
                            $ Withdraw/Deposit
                          </button>
                          <button
                            className="btn btn-small"
                            onClick={() => startEditingProgram(program)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-small"
                            onClick={() => handleDeactivateProgram(program.id, program.name)}
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
        )}

        {/* Transaction Modal */}
        {transactionProgramId && (
          <div className="pos-modal-overlay" onClick={closeTransactionModal}>
            <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>
                {programs.find(p => p.id === transactionProgramId)?.name} - Transaction
              </h3>

              <div className="form-group">
                <label>Transaction Type</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn ${transactionType === 'deposit' ? 'btn-primary' : ''}`}
                    onClick={() => setTransactionType('deposit')}
                    style={{ flex: 1 }}
                  >
                    Deposit
                  </button>
                  <button
                    type="button"
                    className={`btn ${transactionType === 'withdraw' ? 'btn-danger' : ''}`}
                    onClick={() => setTransactionType('withdraw')}
                    style={{ flex: 1 }}
                  >
                    Withdraw
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  className="input"
                  step="0.01"
                  min="0.01"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  placeholder="0.00"
                  style={{ fontSize: '18px' }}
                />
              </div>

              <div className="form-group">
                <label>Description (optional)</label>
                <input
                  type="text"
                  className="input"
                  value={transactionDescription}
                  onChange={(e) => setTransactionDescription(e.target.value)}
                  placeholder="e.g., Equipment purchase"
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button
                  className="btn"
                  onClick={closeTransactionModal}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  className={`btn ${transactionType === 'withdraw' ? 'btn-danger' : 'btn-primary'}`}
                  onClick={handleProgramTransaction}
                  style={{ flex: 1 }}
                >
                  {transactionType === 'deposit' ? 'Deposit' : 'Withdraw'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Program Log Modal */}
        {logProgramId && (
          <div className="pos-modal-overlay" onClick={closeProgramLog}>
            <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', maxHeight: '80vh', overflow: 'auto' }}>
              <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>
                {programs.find(p => p.id === logProgramId)?.name} - Transaction Log
              </h3>

              {loadingLog ? (
                <p style={{ color: '#4ade80', textAlign: 'center' }}>Loading...</p>
              ) : programLog.length === 0 ? (
                <p style={{ color: '#4a7c59', textAlign: 'center' }}>No transactions yet.</p>
              ) : (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left' }}>Date</th>
                        <th style={{ textAlign: 'left' }}>Source</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {programLog.map((entry, index) => (
                        <tr key={index}>
                          <td style={{ fontSize: '13px', color: '#4ade80' }}>
                            {formatDate(entry.created_at)}
                          </td>
                          <td style={{ fontSize: '13px', color: '#4a7c59' }}>
                            {entry.session_id === 0 ? 'Manual Adjustment' : entry.session_name || `Session #${entry.session_id}`}
                          </td>
                          <td style={{
                            textAlign: 'right',
                            fontWeight: 'bold',
                            color: entry.amount >= 0 ? '#22c55e' : '#ef4444'
                          }}>
                            {entry.amount >= 0 ? '+' : ''}{formatCurrency(entry.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                className="btn"
                onClick={closeProgramLog}
                style={{ marginTop: '16px', width: '100%' }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Earnings Tab */}
        {activeTab === 'earnings' && (
          <div className="card">
            <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>
              Program Earnings
            </h2>

            {programsWithEarnings.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#4ade80' }}>No programs yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Program</th>
                      <th style={{ textAlign: 'right' }}>Total Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programsWithEarnings.map((program) => (
                      <tr key={program.id}>
                        <td>{program.name}</td>
                        <td style={{
                          textAlign: 'right',
                          color: program.total_earnings >= 0 ? '#22c55e' : '#ef4444',
                          fontWeight: 'bold'
                        }}>
                          {formatCurrency(program.total_earnings)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #22c55e' }}>
                      <td style={{ fontWeight: 'bold', color: '#22c55e' }}>Total</td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#22c55e' }}>
                        {formatCurrency(programsWithEarnings.reduce((sum, p) => sum + p.total_earnings, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Menu Tab */}
        {activeTab === 'menu' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', color: '#22c55e', margin: 0 }}>
                Manage Menu Items
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-small"
                  onClick={handleDownloadMenuCSV}
                  style={{ background: '#4a7c59' }}
                >
                  Download CSV
                </button>
                <button
                  className="btn btn-small btn-primary"
                  onClick={handleSaveMenuToCSV}
                  disabled={savingCSV}
                >
                  {savingCSV ? 'Saving...' : 'Save to CSV'}
                </button>
              </div>
            </div>

            <form onSubmit={handleAddMenuItem} style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ flex: '2', minWidth: '150px', marginBottom: 0 }}>
                  <label htmlFor="itemName">Item Name</label>
                  <input
                    type="text"
                    id="itemName"
                    className="input"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g., Hot Dog"
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: '1', minWidth: '100px', marginBottom: 0 }}>
                  <label htmlFor="itemPrice">Price (leave empty for category)</label>
                  <input
                    type="number"
                    id="itemPrice"
                    className="input"
                    step="0.01"
                    min="0"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="e.g., 3.00"
                  />
                </div>
                <div className="form-group" style={{ flex: '1', minWidth: '150px', marginBottom: 0 }}>
                  <label htmlFor="itemParent">Parent Category</label>
                  <select
                    id="itemParent"
                    className="input"
                    value={newItemParentId}
                    onChange={(e) => setNewItemParentId(e.target.value)}
                  >
                    <option value="">None (Top Level)</option>
                    {parentItems.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={addingMenuItem}
                >
                  {addingMenuItem ? 'Adding...' : 'Add Item'}
                </button>
              </div>
            </form>

            <p style={{ color: '#4a7c59', fontSize: '12px', marginBottom: '12px' }}>
              Drag items to reorder. Drag an item onto a category (no price) to make it a sub-item.
            </p>

            {menuItems.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#4ade80' }}>No menu items yet.</p>
            ) : (
              <div>
                {menuItems.map((item) => (
                  <div
                    key={item.id}
                    draggable={editingMenuItemId !== item.id}
                    onDragStart={(e) => handleDragStart(e, item, false)}
                    onDragOver={(e) => handleDragOver(e, item, false)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, item, false)}
                    onDragEnd={handleDragEnd}
                    style={{
                      background: dragOverItem?.id === item.id && !draggedItem?.isSubItem ? '#2a3a2a' : '#1a1a1a',
                      padding: '12px',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      cursor: editingMenuItemId === item.id ? 'default' : 'grab',
                      opacity: draggedItem?.id === item.id ? 0.5 : 1,
                      border: dragOverItem?.id === item.id && !draggedItem?.isSubItem ? '2px dashed #22c55e' : '2px solid transparent',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {editingMenuItemId === item.id ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          className="input"
                          value={editMenuItemName}
                          onChange={(e) => setEditMenuItemName(e.target.value)}
                          placeholder="Item name"
                          style={{ flex: 2, minWidth: '120px' }}
                        />
                        {item.price !== null && (
                          <input
                            type="number"
                            className="input"
                            step="0.01"
                            min="0"
                            value={editMenuItemPrice}
                            onChange={(e) => setEditMenuItemPrice(e.target.value)}
                            placeholder="Price"
                            style={{ flex: 1, minWidth: '80px' }}
                          />
                        )}
                        <button
                          className="btn btn-primary btn-small"
                          onClick={() => handleUpdateMenuItem(item.id)}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-small"
                          onClick={cancelEditingMenuItem}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#4a7c59', cursor: 'grab' }}>☰</span>
                          <strong style={{ color: item.active ? '#22c55e' : '#666' }}>
                            {item.name}
                          </strong>
                          {item.price !== null && (
                            <span style={{ color: '#4ade80', marginLeft: '12px' }}>
                              {formatCurrency(item.price)}
                            </span>
                          )}
                          {item.price === null && (
                            <span style={{ color: '#4a7c59', marginLeft: '12px', fontSize: '12px' }}>
                              (Category)
                            </span>
                          )}
                          {!item.active && (
                            <span style={{ color: '#666', marginLeft: '12px', fontSize: '12px' }}>
                              (Inactive)
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="btn btn-small"
                            onClick={() => startEditingMenuItem(item)}
                          >
                            Edit
                          </button>
                          {item.active ? (
                            <>
                              <button
                                className="btn btn-small"
                                onClick={() => handleDeactivateMenuItem(item.id, item.name)}
                                style={{ background: '#666' }}
                              >
                                Deactivate
                              </button>
                              <button
                                className="btn btn-danger btn-small"
                                onClick={() => handleDeleteMenuItem(item.id, item.name)}
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-small"
                                onClick={() => handleReactivateMenuItem(item.id, item.name)}
                                style={{ background: '#22c55e' }}
                              >
                                Reactivate
                              </button>
                              <button
                                className="btn btn-danger btn-small"
                                onClick={() => handleDeleteMenuItem(item.id, item.name)}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    {item.subItems && item.subItems.length > 0 && (
                      <div style={{ marginTop: '8px', paddingLeft: '20px' }}>
                        {item.subItems.map((sub) => (
                          <div
                            key={sub.id}
                            draggable={editingMenuItemId !== sub.id}
                            onDragStart={(e) => handleDragStart(e, sub, true, item.id)}
                            onDragOver={(e) => handleDragOver(e, sub, true)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, sub, true, item.id)}
                            onDragEnd={handleDragEnd}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '6px 8px',
                              borderBottom: '1px solid #2a2a2a',
                              flexWrap: 'wrap',
                              gap: '6px',
                              cursor: editingMenuItemId === sub.id ? 'default' : 'grab',
                              opacity: draggedItem?.id === sub.id ? 0.5 : 1,
                              background: dragOverItem?.id === sub.id && dragOverItem?.isSubItem ? '#2a3a2a' : 'transparent',
                              borderRadius: '4px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {editingMenuItemId === sub.id ? (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                                <input
                                  type="text"
                                  className="input"
                                  value={editMenuItemName}
                                  onChange={(e) => setEditMenuItemName(e.target.value)}
                                  placeholder="Item name"
                                  style={{ flex: 2, minWidth: '100px', padding: '6px' }}
                                />
                                <input
                                  type="number"
                                  className="input"
                                  step="0.01"
                                  min="0"
                                  value={editMenuItemPrice}
                                  onChange={(e) => setEditMenuItemPrice(e.target.value)}
                                  placeholder="Price"
                                  style={{ flex: 1, minWidth: '70px', padding: '6px' }}
                                />
                                <button
                                  className="btn btn-primary btn-small"
                                  onClick={() => handleUpdateMenuItem(sub.id)}
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                >
                                  Save
                                </button>
                                <button
                                  className="btn btn-small"
                                  onClick={cancelEditingMenuItem}
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <>
                                <span style={{ color: sub.active ? '#4ade80' : '#666', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: '#4a7c59', cursor: 'grab', fontSize: '12px' }}>☰</span>
                                  {sub.name} - {formatCurrency(sub.price)}
                                  {!sub.active && <span style={{ color: '#666', marginLeft: '8px' }}>(Inactive)</span>}
                                </span>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  <button
                                    className="btn btn-small"
                                    onClick={() => handleMoveToTopLevel(sub)}
                                    style={{ padding: '4px 8px', fontSize: '11px', background: '#4a7c59' }}
                                    title="Move to top level"
                                  >
                                    ↑ Top
                                  </button>
                                  <button
                                    className="btn btn-small"
                                    onClick={() => startEditingMenuItem(sub)}
                                    style={{ padding: '4px 8px', fontSize: '12px' }}
                                  >
                                    Edit
                                  </button>
                                  {sub.active ? (
                                    <>
                                      <button
                                        className="btn btn-small"
                                        onClick={() => handleDeactivateMenuItem(sub.id, sub.name)}
                                        style={{ padding: '4px 8px', fontSize: '12px', background: '#666' }}
                                      >
                                        Deactivate
                                      </button>
                                      <button
                                        className="btn btn-danger btn-small"
                                        onClick={() => handleDeleteMenuItem(sub.id, sub.name)}
                                        style={{ padding: '4px 8px', fontSize: '12px' }}
                                      >
                                        Delete
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        className="btn btn-small"
                                        onClick={() => handleReactivateMenuItem(sub.id, sub.name)}
                                        style={{ padding: '4px 8px', fontSize: '12px', background: '#22c55e' }}
                                      >
                                        Reactivate
                                      </button>
                                      <button
                                        className="btn btn-danger btn-small"
                                        onClick={() => handleDeleteMenuItem(sub.id, sub.name)}
                                        style={{ padding: '4px 8px', fontSize: '12px' }}
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="card">
            <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>
              Session History
            </h2>
            {sessions.filter(s => s.status === 'closed' || s.status === 'cancelled').length === 0 ? (
              <p style={{ textAlign: 'center', color: '#4ade80' }}>No closed sessions yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Session</th>
                      <th>Program</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Profit</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.filter(s => s.status === 'closed' || s.status === 'cancelled').map((session) => (
                      <tr key={session.id}>
                        <td>{formatDate(session.closed_at || session.created_at)}</td>
                        <td>{session.name}</td>
                        <td>{session.program_name}</td>
                        <td>{formatCurrency(session.start_total)}</td>
                        <td>{formatCurrency(session.end_total)}</td>
                        <td style={{
                          color: session.profit >= 0 ? '#22c55e' : '#ef4444',
                          fontWeight: 'bold'
                        }}>
                          {formatCurrency(session.profit)}
                        </td>
                        <td>
                          <span className={`status-badge ${getStatusBadgeClass(session.status)}`}>
                            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CashBoxAdmin;
