import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';

function ConcessionSession({ user, onLogout }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [cashbox, setCashbox] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Denomination form state (for start/close)
  const [quarters, setQuarters] = useState(0);
  const [bills1, setBills1] = useState(0);
  const [bills5, setBills5] = useState(0);
  const [bills10, setBills10] = useState(0);
  const [bills20, setBills20] = useState(0);
  const [bills50, setBills50] = useState(0);
  const [bills100, setBills100] = useState(0);

  // POS state (for active session)
  const [orderItems, setOrderItems] = useState({});
  const [amountTendered, setAmountTendered] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [sessionSales, setSessionSales] = useState(0);

  // Sub-menu modal
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [subMenuParent, setSubMenuParent] = useState(null);

  // Checkout modal
  const [showCheckout, setShowCheckout] = useState(false);

  // Edit mode for reordering menu items
  const [editMode, setEditMode] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);

  // Grid configuration
  const GRID_COLS = 4;
  const GRID_ROWS = 3;

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [sessionRes, cashboxRes, menuRes] = await Promise.all([
        fetch(`/api/cashbox/sessions/${id}`),
        fetch('/api/cashbox'),
        fetch('/api/menu')
      ]);

      const sessionData = await sessionRes.json();
      const cashboxData = await cashboxRes.json();
      const menuData = await menuRes.json();

      if (!sessionRes.ok) throw new Error(sessionData.error);
      if (!cashboxRes.ok) throw new Error(cashboxData.error);
      if (!menuRes.ok) throw new Error(menuData.error);

      setSession(sessionData);
      setCashbox(cashboxData);
      setMenuItems(menuData);

      // Fetch session sales total
      if (sessionData.status === 'active') {
        const salesRes = await fetch(`/api/orders/session/${id}/summary`);
        if (salesRes.ok) {
          const salesData = await salesRes.json();
          setSessionSales(salesData.totalSales || 0);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateFormTotal = () => {
    return (
      quarters * 0.25 +
      bills1 * 1 +
      bills5 * 5 +
      bills10 * 10 +
      bills20 * 20 +
      bills50 * 50 +
      bills100 * 100
    );
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

  const handleStartSession = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const response = await fetch(`/api/cashbox/sessions/${id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quarters,
          bills_1: bills1,
          bills_5: bills5,
          bills_10: bills10,
          bills_20: bills20,
          bills_50: bills50,
          bills_100: bills100,
          startedBy: user.studentId || 'admin'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start session');
      }

      setSuccess(`Session started! Starting cash: ${formatCurrency(data.startTotal)}`);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSession = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!window.confirm('Are you sure you want to close this session? This cannot be undone.')) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/cashbox/sessions/${id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quarters,
          bills_1: bills1,
          bills_5: bills5,
          bills_10: bills10,
          bills_20: bills20,
          bills_50: bills50,
          bills_100: bills100,
          closedBy: user.studentId || 'admin'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to close session');
      }

      setSuccess(`Session closed! Ending cash: ${formatCurrency(data.endTotal)}, Profit: ${formatCurrency(data.profit)}`);
      setShowCheckout(false);
      setTimeout(() => navigate('/cashbox'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // POS Functions
  const handleItemClick = (item) => {
    if (item.hasSubMenu && item.subItems && item.subItems.length > 0) {
      setSubMenuParent(item);
      setShowSubMenu(true);
    } else if (item.price !== null) {
      addToOrder(item);
    }
  };

  const addToOrder = (item) => {
    setOrderItems(prev => ({
      ...prev,
      [item.id]: {
        ...item,
        quantity: (prev[item.id]?.quantity || 0) + 1
      }
    }));
    setShowSubMenu(false);
    setSubMenuParent(null);
  };

  const removeFromOrder = (itemId) => {
    setOrderItems(prev => {
      const current = prev[itemId];
      if (!current || current.quantity <= 1) {
        const { [itemId]: removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [itemId]: {
          ...current,
          quantity: current.quantity - 1
        }
      };
    });
  };

  const clearOrder = () => {
    setOrderItems({});
    setAmountTendered('');
    setSuccess('');
    setError('');
  };

  const calculateSubtotal = () => {
    return Object.values(orderItems).reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
  };

  const calculateChange = () => {
    const tendered = parseFloat(amountTendered) || 0;
    return tendered - calculateSubtotal();
  };

  const handleCompleteOrder = async () => {
    const subtotal = calculateSubtotal();
    if (subtotal === 0) {
      setError('Please add items to the order');
      return;
    }

    const tendered = parseFloat(amountTendered) || 0;
    if (tendered < subtotal) {
      setError('Amount tendered is less than total');
      return;
    }

    setError('');
    setSubmittingOrder(true);

    try {
      const items = Object.values(orderItems).map(item => ({
        menuItemId: item.id,
        quantity: item.quantity,
        unitPrice: item.price
      }));

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          items,
          amountTendered: tendered
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete order');
      }

      setSuccess(`Order complete! Change: ${formatCurrency(data.changeGiven)}`);
      setOrderItems({});
      setAmountTendered('');
      setSessionSales(prev => prev + subtotal);

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const getItemQuantity = (itemId) => {
    return orderItems[itemId]?.quantity || 0;
  };

  // Get item at a specific grid position
  const getItemAtPosition = (row, col) => {
    return menuItems.find(item => item.grid_row === row && item.grid_col === col);
  };

  // Drag and drop handlers for grid-based edit mode
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCellDragOver = (e, row, col) => {
    e.preventDefault();
    setDragOverCell({ row, col });
  };

  const handleCellDragLeave = () => {
    setDragOverCell(null);
  };

  const handleCellDrop = async (e, row, col) => {
    e.preventDefault();
    if (!draggedItem) {
      setDragOverCell(null);
      return;
    }

    // Check if there's already an item at this position
    const existingItem = getItemAtPosition(row, col);

    // Update items locally
    const newItems = menuItems.map(item => {
      if (item.id === draggedItem.id) {
        // Move dragged item to new position
        return { ...item, grid_row: row, grid_col: col };
      }
      if (existingItem && item.id === existingItem.id) {
        // Swap: move existing item to dragged item's old position
        return { ...item, grid_row: draggedItem.grid_row, grid_col: draggedItem.grid_col };
      }
      return item;
    });

    setMenuItems(newItems);

    // Save to backend
    try {
      const updates = [{ id: draggedItem.id, gridRow: row, gridCol: col }];
      if (existingItem) {
        updates.push({ id: existingItem.id, gridRow: draggedItem.grid_row, gridCol: draggedItem.grid_col });
      }
      await fetch('/api/menu/grid-positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updates })
      });
    } catch (err) {
      console.error('Failed to save position:', err);
    }

    setDraggedItem(null);
    setDragOverCell(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverCell(null);
  };

  // Handle dropping item back to the bank (remove from grid)
  const handleBankDrop = async (e) => {
    e.preventDefault();
    if (!draggedItem) return;

    // Set grid position to -1, -1 to indicate "not on grid"
    const newItems = menuItems.map(item => {
      if (item.id === draggedItem.id) {
        return { ...item, grid_row: -1, grid_col: -1 };
      }
      return item;
    });

    setMenuItems(newItems);

    // Save to backend
    try {
      await fetch('/api/menu/grid-positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: draggedItem.id, gridRow: -1, gridCol: -1 }] })
      });
    } catch (err) {
      console.error('Failed to remove from grid:', err);
    }

    setDraggedItem(null);
    setDragOverCell(null);
  };

  // Get items that are on the grid (have valid positions)
  const getItemsOnGrid = () => {
    return menuItems.filter(item =>
      item.grid_row >= 0 && item.grid_row < GRID_ROWS &&
      item.grid_col >= 0 && item.grid_col < GRID_COLS
    );
  };

  // Get items that are NOT on the grid (available in bank)
  const getItemsInBank = () => {
    return menuItems.filter(item =>
      item.grid_row < 0 || item.grid_col < 0 ||
      item.grid_row >= GRID_ROWS || item.grid_col >= GRID_COLS
    );
  };

  // Generate grid cells
  const generateGrid = () => {
    const cells = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const item = getItemAtPosition(row, col);
        const isDropTarget = dragOverCell?.row === row && dragOverCell?.col === col;
        cells.push({ row, col, item, isDropTarget });
      }
    }
    return cells;
  };

  // In normal mode, only show cells that have items
  const getActiveGridItems = () => {
    return menuItems.filter(item =>
      item.grid_row >= 0 && item.grid_row < GRID_ROWS &&
      item.grid_col >= 0 && item.grid_col < GRID_COLS
    );
  };

  // Save menu to CSV file
  const handleSaveMenuToCSV = async () => {
    try {
      const response = await fetch('/api/menu/save-to-csv', {
        method: 'POST'
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save menu');
      }

      setSuccess(data.message);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Get responsive grid settings based on screen width
  const getGridSettings = () => {
    const width = window.innerWidth;
    if (width < 600) {
      // Phone
      return { minButtonSize: 80, maxCols: 3, gap: 8 };
    } else if (width < 1024) {
      // Tablet
      return { minButtonSize: 100, maxCols: 4, gap: 10 };
    } else {
      // Desktop
      return { minButtonSize: 100, maxCols: 5, gap: 12 };
    }
  };

  // Calculate columns based on item count and screen size
  const getOptimalCols = (itemCount) => {
    const { maxCols } = getGridSettings();
    if (itemCount <= 2) return Math.min(2, maxCols);
    if (itemCount <= 4) return Math.min(2, maxCols);
    if (itemCount <= 6) return Math.min(3, maxCols);
    if (itemCount <= 9) return Math.min(3, maxCols);
    return Math.min(4, maxCols);
  };

  // Calculate expected cash in box
  const expectedCashInBox = (session?.start_total || 0) + sessionSales;

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

  if (!session) {
    return (
      <div>
        <Navbar user={user} onLogout={onLogout} />
        <div className="container">
          <div className="card">
            <div className="error-message">Session not found</div>
          </div>
        </div>
      </div>
    );
  }

  const isStartMode = session.status === 'created';
  const isActiveMode = session.status === 'active';
  const isClosed = session.status === 'closed' || session.status === 'cancelled';

  // Active session - show POS interface
  if (isActiveMode) {
    const subtotal = calculateSubtotal();
    const change = calculateChange();

    return (
      <div className="pos-container">
        {/* Header */}
        <div className="pos-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: '#111',
          borderBottom: '1px solid #2a2a2a',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 auto' }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ color: '#22c55e', fontSize: '18px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {session.name}
              </h1>
              <p className="pos-header-subtitle" style={{ color: '#4ade80', fontSize: '11px', margin: 0 }}>
                {session.program_name}
              </p>
            </div>
          </div>
          {/* Stats - Hidden on mobile */}
          <div className="pos-header-stats" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#4a7c59', fontSize: '10px' }}>Start:</div>
              <div style={{ color: '#4ade80', fontSize: '13px', fontWeight: 'bold' }}>
                {formatCurrency(session.start_total)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#4a7c59', fontSize: '10px' }}>Expected:</div>
              <div style={{ color: '#22c55e', fontSize: '13px', fontWeight: 'bold' }}>
                {formatCurrency(expectedCashInBox)}
              </div>
            </div>
          </div>
          {/* Action buttons */}
          <div className="pos-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {editMode && (
              <button
                className="btn btn-small"
                onClick={handleSaveMenuToCSV}
                style={{ background: '#065f46' }}
              >
                Save CSV
              </button>
            )}
            <button
              className={`btn btn-small ${editMode ? 'btn-primary' : ''}`}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? 'Done' : 'Edit'}
            </button>
            <button
              className="btn btn-danger btn-small"
              onClick={() => setShowCheckout(true)}
            >
              Close
            </button>
            <button
              className="btn btn-small"
              onClick={() => navigate('/cashbox')}
            >
              Exit
            </button>
          </div>
        </div>

        {error && <div className="pos-message error">{error}</div>}
        {success && <div className="pos-message success">{success}</div>}

        <div className="pos-main">
          {/* Edit mode - show grid with item bank */}
          {editMode ? (
            <div className="pos-edit-container">
                {/* Menu Grid */}
                <div className="pos-menu pos-edit-grid-area" style={{ flex: 1 }}>
                  <div
                    className="pos-menu-grid pos-edit-grid"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                      gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
                      gap: '8px',
                      padding: '12px',
                      height: '100%'
                    }}
                  >
                    {generateGrid().map(({ row, col, item, isDropTarget }) => (
                      <div
                        key={`${row}-${col}`}
                        className={`pos-grid-cell ${isDropTarget ? 'drag-over' : ''}`}
                        onDragOver={(e) => handleCellDragOver(e, row, col)}
                        onDragLeave={handleCellDragLeave}
                        onDrop={(e) => handleCellDrop(e, row, col)}
                        style={{
                          minHeight: '70px',
                          border: '2px dashed #4a7c59',
                          borderRadius: '8px',
                          background: isDropTarget ? 'rgba(34, 197, 94, 0.3)' : 'rgba(74, 124, 89, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {item ? (
                          <button
                            className="pos-item-btn edit-mode"
                            draggable
                            onDragStart={(e) => handleDragStart(e, item)}
                            onDragEnd={handleDragEnd}
                            style={{
                              width: '100%',
                              height: '100%',
                              cursor: 'grab',
                              minHeight: '60px'
                            }}
                          >
                            <div style={{
                              position: 'absolute',
                              top: '2px',
                              left: '4px',
                              fontSize: '10px',
                              color: '#22c55e'
                            }}>
                              ☰
                            </div>
                            <div className="pos-item-name" style={{ fontSize: '11px' }}>{item.name}</div>
                            {item.price !== null && (
                              <div className="pos-item-price" style={{ fontSize: '12px' }}>{formatCurrency(item.price)}</div>
                            )}
                            {item.hasSubMenu && (
                              <div className="pos-item-submenu-indicator" style={{ fontSize: '14px' }}>...</div>
                            )}
                          </button>
                        ) : (
                          <span style={{ color: '#4a7c59', fontSize: '10px' }}>Drop</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Item Bank - Bottom drawer on mobile, sidebar on desktop */}
                <div
                  className="pos-item-bank"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleBankDrop}
                >
                  <div className="pos-item-bank-header">
                    <span>Available Items</span>
                    <span style={{ fontSize: '10px', color: '#4a7c59' }}>Drag to grid</span>
                  </div>
                  <div className="pos-item-bank-items">
                    {getItemsInBank().length === 0 ? (
                      <p style={{ color: '#4a7c59', fontSize: '11px', textAlign: 'center', margin: 0, padding: '8px' }}>
                        Drag items here to remove from grid
                      </p>
                    ) : (
                      getItemsInBank().map((item) => (
                        <div
                          key={item.id}
                          className="pos-bank-item"
                          draggable
                          onDragStart={(e) => handleDragStart(e, item)}
                          onDragEnd={handleDragEnd}
                        >
                          <span className="pos-bank-item-name">{item.name}</span>
                          {item.price !== null ? (
                            <span className="pos-bank-item-price">${item.price.toFixed(2)}</span>
                          ) : (
                            <span className="pos-bank-item-price">▼</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
            </div>
          ) : (
            /* Normal mode - responsive grid with minimum button sizes and scrolling */
            (() => {
              const activeItems = getActiveGridItems();
              const { minButtonSize, gap } = getGridSettings();
              const cols = getOptimalCols(activeItems.length);

              return (
                <div className="pos-menu" style={{ overflow: 'auto' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${cols}, minmax(${minButtonSize}px, 1fr))`,
                      gridAutoRows: `minmax(${minButtonSize}px, auto)`,
                      gap: `${gap}px`,
                      padding: '16px'
                    }}
                  >
                    {activeItems.length === 0 ? (
                      <div style={{
                        gridColumn: '1 / -1',
                        textAlign: 'center',
                        padding: '40px',
                        color: '#4a7c59'
                      }}>
                        <p>No menu items configured.</p>
                        <p style={{ fontSize: '14px' }}>Click "Edit Menu" to add items to the grid.</p>
                      </div>
                    ) : (
                      activeItems.map((item) => (
                        <button
                          key={item.id}
                          className={`pos-item-btn ${item.hasSubMenu ? 'has-submenu' : ''}`}
                          onClick={() => handleItemClick(item)}
                          style={{
                            minHeight: `${minButtonSize}px`,
                            height: '100%'
                          }}
                        >
                          <div className="pos-item-name">{item.name}</div>
                          {item.price !== null && (
                            <div className="pos-item-price">{formatCurrency(item.price)}</div>
                          )}
                          {item.hasSubMenu && (
                            <div className="pos-item-submenu-indicator">...</div>
                          )}
                          {getItemQuantity(item.id) > 0 && (
                            <div className="pos-item-qty">{getItemQuantity(item.id)}</div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })()
          )}

          {/* Order Summary */}
          <div className="pos-order">
            <h2 style={{ color: '#22c55e', fontSize: '16px', marginBottom: '12px' }}>Order</h2>

            {Object.keys(orderItems).length === 0 ? (
              <p style={{ color: '#4a7c59', textAlign: 'center' }}>No items added</p>
            ) : (
              <div className="pos-order-items">
                {Object.values(orderItems).map((item) => (
                  <div key={item.id} className="pos-order-item">
                    <div className="pos-order-item-info">
                      <span className="pos-order-item-qty">{item.quantity}x</span>
                      <span className="pos-order-item-name">{item.name}</span>
                    </div>
                    <div className="pos-order-item-actions">
                      <span className="pos-order-item-price">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                      <button
                        className="pos-qty-btn"
                        onClick={() => removeFromOrder(item.id)}
                      >
                        -
                      </button>
                      <button
                        className="pos-qty-btn"
                        onClick={() => addToOrder(item)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pos-order-totals">
              <div className="pos-total-row">
                <span>Subtotal:</span>
                <span style={{ fontWeight: 'bold', color: '#22c55e' }}>{formatCurrency(subtotal)}</span>
              </div>

              <div className="pos-payment">
                <label style={{ color: '#4ade80', fontSize: '14px' }}>Amount Given:</label>
                <input
                  type="number"
                  className="input"
                  step="0.01"
                  min="0"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder="0.00"
                  style={{ fontSize: '18px', textAlign: 'right' }}
                />
              </div>

              {parseFloat(amountTendered) > 0 && (
                <div className="pos-total-row" style={{ fontSize: '18px' }}>
                  <span>Change:</span>
                  <span style={{
                    fontWeight: 'bold',
                    color: change >= 0 ? '#22c55e' : '#ef4444'
                  }}>
                    {formatCurrency(change)}
                  </span>
                </div>
              )}
            </div>

            <div className="pos-actions">
              <button
                className="btn"
                onClick={clearOrder}
                style={{ flex: 1 }}
              >
                Clear
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCompleteOrder}
                disabled={submittingOrder || subtotal === 0}
                style={{ flex: 2 }}
              >
                {submittingOrder ? 'Processing...' : 'Complete Order'}
              </button>
            </div>
          </div>
        </div>

        {/* Sub-menu Modal */}
        {showSubMenu && subMenuParent && (
          <div className="pos-modal-overlay" onClick={() => setShowSubMenu(false)}>
            <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>
                Select {subMenuParent.name}
              </h3>
              <div className="pos-submenu-grid">
                {subMenuParent.subItems.map((item) => (
                  <button
                    key={item.id}
                    className="pos-item-btn"
                    onClick={() => addToOrder(item)}
                  >
                    <div className="pos-item-name">{item.name}</div>
                    <div className="pos-item-price">{formatCurrency(item.price)}</div>
                  </button>
                ))}
              </div>
              <button
                className="btn"
                onClick={() => setShowSubMenu(false)}
                style={{ marginTop: '16px', width: '100%' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Checkout Modal */}
        {showCheckout && (
          <div className="pos-modal-overlay" onClick={() => setShowCheckout(false)}>
            <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>Close Session</h3>

              <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#4a7c59' }}>Starting Cash:</span>
                  <span style={{ color: '#4ade80' }}>{formatCurrency(session.start_total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#4a7c59' }}>Total Sales:</span>
                  <span style={{ color: '#4ade80' }}>{formatCurrency(sessionSales)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #2a2a2a', paddingTop: '8px' }}>
                  <span style={{ color: '#22c55e', fontWeight: 'bold' }}>Expected in Box:</span>
                  <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{formatCurrency(expectedCashInBox)}</span>
                </div>
              </div>

              <p style={{ color: '#4ade80', marginBottom: '12px', fontSize: '14px' }}>
                Count all cash and enter the amounts below:
              </p>

              <form onSubmit={handleCloseSession}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>Quarters</label>
                    <input type="number" className="input" min="0" value={quarters}
                      onChange={(e) => setQuarters(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>$1 Bills</label>
                    <input type="number" className="input" min="0" value={bills1}
                      onChange={(e) => setBills1(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>$5 Bills</label>
                    <input type="number" className="input" min="0" value={bills5}
                      onChange={(e) => setBills5(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>$10 Bills</label>
                    <input type="number" className="input" min="0" value={bills10}
                      onChange={(e) => setBills10(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>$20 Bills</label>
                    <input type="number" className="input" min="0" value={bills20}
                      onChange={(e) => setBills20(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>$50 Bills</label>
                    <input type="number" className="input" min="0" value={bills50}
                      onChange={(e) => setBills50(parseInt(e.target.value) || 0)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px' }}>$100 Bills</label>
                    <input type="number" className="input" min="0" value={bills100}
                      onChange={(e) => setBills100(parseInt(e.target.value) || 0)} />
                  </div>
                </div>

                <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#4a7c59' }}>Counted Total:</span>
                    <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{formatCurrency(calculateFormTotal())}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #2a2a2a', paddingTop: '8px' }}>
                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>Profit:</span>
                    <span style={{
                      color: calculateFormTotal() - session.start_total >= 0 ? '#22c55e' : '#ef4444',
                      fontWeight: 'bold',
                      fontSize: '18px'
                    }}>
                      {formatCurrency(calculateFormTotal() - session.start_total)}
                    </span>
                  </div>
                </div>

                {error && <div className="error-message" style={{ marginBottom: '12px' }}>{error}</div>}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setShowCheckout(false)}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger"
                    disabled={submitting}
                    style={{ flex: 1 }}
                  >
                    {submitting ? 'Closing...' : 'Close Session'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Start mode or closed mode - show regular view
  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      <div className="container">
        <button
          className="btn"
          onClick={() => navigate('/cashbox')}
          style={{ marginBottom: '16px' }}
        >
          Back to CashBox
        </button>

        <h1 className="page-title">{session.name}</h1>

        {error && <div className="card"><div className="error-message">{error}</div></div>}
        {success && <div className="card"><div className="success-message">{success}</div></div>}

        {/* Session Info */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h2 style={{ color: '#22c55e', fontSize: '18px', marginBottom: '8px' }}>
                {session.program_name}
              </h2>
              <p style={{ color: '#4a7c59', fontSize: '14px' }}>
                Created: {formatDate(session.created_at)}
              </p>
            </div>
            <span className={`status-badge ${session.status === 'created' ? 'pending' : session.status === 'active' ? 'approved' : session.status === 'closed' ? 'completed' : 'rejected'}`}>
              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            </span>
          </div>

          {isClosed && (
            <div style={{
              background: '#1a1a1a',
              padding: '16px',
              borderRadius: '8px',
              marginTop: '16px'
            }}>
              <h3 style={{ color: '#22c55e', fontSize: '16px', marginBottom: '12px' }}>Session Results</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p style={{ color: '#4a7c59', fontSize: '14px' }}>Starting Cash</p>
                  <p style={{ color: '#22c55e', fontSize: '20px', fontWeight: 'bold' }}>
                    {formatCurrency(session.start_total)}
                  </p>
                </div>
                <div>
                  <p style={{ color: '#4a7c59', fontSize: '14px' }}>Ending Cash</p>
                  <p style={{ color: '#22c55e', fontSize: '20px', fontWeight: 'bold' }}>
                    {formatCurrency(session.end_total)}
                  </p>
                </div>
              </div>
              <div style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid #2a2a2a',
                textAlign: 'center'
              }}>
                <p style={{ color: '#4a7c59', fontSize: '14px' }}>Profit</p>
                <p style={{
                  color: session.profit >= 0 ? '#22c55e' : '#ef4444',
                  fontSize: '28px',
                  fontWeight: 'bold'
                }}>
                  {formatCurrency(session.profit)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Start Session Form */}
        {isStartMode && (
          <div className="card">
            <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>
              Enter Starting Cash
            </h2>
            <p style={{ color: '#4ade80', marginBottom: '16px', fontSize: '14px' }}>
              Enter the cash you are taking from the main cashbox to start this session.
            </p>

            {cashbox && (
              <div style={{
                background: '#1a1a1a',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '14px',
                color: '#4a7c59'
              }}>
                Main Cashbox Available: {formatCurrency(cashbox.totalValue)}
              </div>
            )}

            <form onSubmit={handleStartSession}>
              <div className="denomination-inputs">
                <div className="form-group">
                  <label htmlFor="quarters">Quarters</label>
                  <input type="number" id="quarters" className="input" min="0"
                    max={cashbox?.quarters || 0} value={quarters}
                    onChange={(e) => setQuarters(parseInt(e.target.value) || 0)} />
                  <small style={{ color: '#4a7c59' }}>Available: {cashbox?.quarters || 0}</small>
                </div>
                <div className="form-group">
                  <label htmlFor="bills1">$1 Bills</label>
                  <input type="number" id="bills1" className="input" min="0"
                    max={cashbox?.bills_1 || 0} value={bills1}
                    onChange={(e) => setBills1(parseInt(e.target.value) || 0)} />
                  <small style={{ color: '#4a7c59' }}>Available: {cashbox?.bills_1 || 0}</small>
                </div>
                <div className="form-group">
                  <label htmlFor="bills5">$5 Bills</label>
                  <input type="number" id="bills5" className="input" min="0"
                    max={cashbox?.bills_5 || 0} value={bills5}
                    onChange={(e) => setBills5(parseInt(e.target.value) || 0)} />
                  <small style={{ color: '#4a7c59' }}>Available: {cashbox?.bills_5 || 0}</small>
                </div>
                <div className="form-group">
                  <label htmlFor="bills10">$10 Bills</label>
                  <input type="number" id="bills10" className="input" min="0"
                    max={cashbox?.bills_10 || 0} value={bills10}
                    onChange={(e) => setBills10(parseInt(e.target.value) || 0)} />
                  <small style={{ color: '#4a7c59' }}>Available: {cashbox?.bills_10 || 0}</small>
                </div>
                <div className="form-group">
                  <label htmlFor="bills20">$20 Bills</label>
                  <input type="number" id="bills20" className="input" min="0"
                    max={cashbox?.bills_20 || 0} value={bills20}
                    onChange={(e) => setBills20(parseInt(e.target.value) || 0)} />
                  <small style={{ color: '#4a7c59' }}>Available: {cashbox?.bills_20 || 0}</small>
                </div>
                <div className="form-group">
                  <label htmlFor="bills50">$50 Bills</label>
                  <input type="number" id="bills50" className="input" min="0"
                    max={cashbox?.bills_50 || 0} value={bills50}
                    onChange={(e) => setBills50(parseInt(e.target.value) || 0)} />
                  <small style={{ color: '#4a7c59' }}>Available: {cashbox?.bills_50 || 0}</small>
                </div>
                <div className="form-group">
                  <label htmlFor="bills100">$100 Bills</label>
                  <input type="number" id="bills100" className="input" min="0"
                    max={cashbox?.bills_100 || 0} value={bills100}
                    onChange={(e) => setBills100(parseInt(e.target.value) || 0)} />
                  <small style={{ color: '#4a7c59' }}>Available: {cashbox?.bills_100 || 0}</small>
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: '#1a1a1a',
                borderRadius: '8px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                <span style={{ color: '#4ade80' }}>Starting Cash Total: </span>
                <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '24px' }}>
                  {formatCurrency(calculateFormTotal())}
                </span>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%' }}
                disabled={submitting}
              >
                {submitting ? 'Starting...' : 'Start Session'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default ConcessionSession;
