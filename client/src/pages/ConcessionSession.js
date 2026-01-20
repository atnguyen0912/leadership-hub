import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { useAuth } from '../contexts';
import {
  SubMenuModal,
  DiscountModal,
  PaymentModal,
  OrderHistoryModal
} from '../components/concession';

function ConcessionSession() {
  const { user } = useAuth();
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

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash', 'cashapp', 'zelle'

  // Discount/Comp
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [discountChargedTo, setDiscountChargedTo] = useState('asb'); // 'asb', 'program', or program id
  const [isComp, setIsComp] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [sessionDiscountsTotal, setSessionDiscountsTotal] = useState(0);

  // Order history
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [orderHistory, setOrderHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Edit mode for reordering menu items
  const [editMode, setEditMode] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedBankItem, setSelectedBankItem] = useState(null); // For tap-to-place on mobile

  // Detect touch device
  const isTouchDevice = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  };

  // Grid configuration
  const GRID_COLS = 4;
  const GRID_ROWS = 3;

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [sessionRes, cashboxRes, menuRes, programsRes] = await Promise.all([
        fetch(`/api/cashbox/sessions/${id}`),
        fetch('/api/cashbox'),
        fetch('/api/menu'),
        fetch('/api/cashbox/programs')
      ]);

      const sessionData = await sessionRes.json();
      const cashboxData = await cashboxRes.json();
      const menuData = await menuRes.json();
      const programsData = await programsRes.json();

      if (!sessionRes.ok) throw new Error(sessionData.error);
      if (!cashboxRes.ok) throw new Error(cashboxData.error);
      if (!menuRes.ok) throw new Error(menuData.error);

      setSession(sessionData);
      setCashbox(cashboxData);
      setMenuItems(menuData);
      setPrograms(programsData || []);

      // Fetch session sales and discounts total
      if (sessionData.status === 'active') {
        const salesRes = await fetch(`/api/orders/session/${id}/summary`);
        if (salesRes.ok) {
          const salesData = await salesRes.json();
          setSessionSales(salesData.totalSales || 0);
          setSessionDiscountsTotal(salesData.totalDiscounts || 0);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderHistory = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/orders/session/${id}`);
      if (response.ok) {
        const data = await response.json();
        setOrderHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch order history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleShowOrderHistory = () => {
    setShowOrderHistory(true);
    fetchOrderHistory();
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
    return tendered - getFinalTotal();
  };

  // Open payment modal when ready to complete order
  const handleOpenPayment = () => {
    const subtotal = calculateSubtotal();
    if (subtotal === 0) {
      setError('Please add items to the order');
      return;
    }
    setError('');
    setPaymentMethod('cash');
    setAmountTendered('');
    setDiscountAmount('');
    setDiscountReason('');
    setDiscountChargedTo('asb');
    setIsComp(false);
    setShowPaymentModal(true);
  };

  // Open discount modal
  const handleOpenDiscount = (comp = false) => {
    const subtotal = calculateSubtotal();
    if (subtotal === 0) {
      setError('Please add items to the order');
      return;
    }
    setError('');
    setIsComp(comp);
    setDiscountAmount(comp ? String(subtotal) : '');
    setDiscountReason('');
    setDiscountChargedTo('asb');
    setShowDiscountModal(true);
  };

  const handleApplyDiscount = () => {
    const amount = parseFloat(discountAmount) || 0;
    const subtotal = calculateSubtotal();
    if (amount <= 0) {
      setError('Please enter a valid discount amount');
      return;
    }
    if (amount > subtotal) {
      setError('Discount cannot exceed order total');
      return;
    }
    setShowDiscountModal(false);
    // Open payment modal with discount applied
    setShowPaymentModal(true);
  };

  const getAppliedDiscount = () => {
    return parseFloat(discountAmount) || 0;
  };

  const getFinalTotal = () => {
    return Math.max(0, calculateSubtotal() - getAppliedDiscount());
  };

  const handleCompleteOrder = async () => {
    const subtotal = calculateSubtotal();
    if (subtotal === 0) {
      setError('Please add items to the order');
      return;
    }

    const discount = getAppliedDiscount();
    const finalTotal = getFinalTotal();

    // For cash payments, validate amount tendered
    if (paymentMethod === 'cash') {
      const tendered = parseFloat(amountTendered) || 0;
      if (tendered < finalTotal) {
        setError('Amount tendered is less than total');
        return;
      }
    }

    setError('');
    setSubmittingOrder(true);

    try {
      const items = Object.values(orderItems).map(item => ({
        menuItemId: item.id,
        quantity: item.quantity,
        unitPrice: item.price
      }));

      // Determine charged to program ID
      let chargedTo = null;
      if (discount > 0) {
        if (discountChargedTo === 'asb') {
          chargedTo = null; // ASB absorbs the cost
        } else if (discountChargedTo === 'program') {
          chargedTo = session.program_id; // Current program
        } else {
          chargedTo = parseInt(discountChargedTo); // Other program
        }
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.id,
          items,
          amountTendered: paymentMethod === 'cash' ? parseFloat(amountTendered) || finalTotal : finalTotal,
          paymentMethod,
          discountAmount: discount,
          discountChargedTo: chargedTo,
          discountReason,
          isComp
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete order');
      }

      let successMsg = 'Order complete!';
      if (discount > 0) {
        successMsg = isComp ? 'Comp order complete!' : `Order complete! (${formatCurrency(discount)} discount)`;
      } else if (paymentMethod === 'cash' && data.changeGiven > 0) {
        successMsg = `Order complete! Change: ${formatCurrency(data.changeGiven)}`;
      } else if (paymentMethod === 'cashapp') {
        successMsg = `Order complete! CashApp: ${formatCurrency(finalTotal)}`;
      } else if (paymentMethod === 'zelle') {
        successMsg = `Order complete! Zelle: ${formatCurrency(finalTotal)}`;
      }

      setSuccess(successMsg);
      setOrderItems({});
      setAmountTendered('');
      setDiscountAmount('');
      setDiscountReason('');
      setShowPaymentModal(false);
      setSessionSales(prev => prev + finalTotal);
      if (discount > 0) {
        setSessionDiscountsTotal(prev => prev + discount);
      }

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

  // Get stock status for inventory display
  const getStockStatus = (item) => {
    // Don't show stock for categories (no price), composite items, or items that don't track inventory
    if (item.price === null || item.is_composite || item.track_inventory === 0) return 'none';
    const qty = item.quantity_on_hand || 0;
    if (qty <= 0) return 'out';
    if (qty <= 5) return 'low';
    return 'ok';
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

  // Handle tap-to-place: select a bank item
  const handleBankItemTap = (item) => {
    if (selectedBankItem?.id === item.id) {
      // Deselect if tapping same item
      setSelectedBankItem(null);
    } else {
      setSelectedBankItem(item);
      setSelectedItem(null); // Clear grid item selection
    }
  };

  // Handle tap-to-place: place selected item in grid cell
  const handleCellTap = async (row, col) => {
    if (!selectedBankItem) return;

    const existingItem = getItemAtPosition(row, col);

    // Update the selected bank item's position
    const newItems = menuItems.map(item => {
      if (item.id === selectedBankItem.id) {
        return { ...item, grid_row: row, grid_col: col };
      }
      // If there was an item in this cell, move it to bank
      if (existingItem && item.id === existingItem.id) {
        return { ...item, grid_row: -1, grid_col: -1 };
      }
      return item;
    });

    setMenuItems(newItems);

    // Save to backend
    try {
      const updates = [{ id: selectedBankItem.id, gridRow: row, gridCol: col }];
      if (existingItem) {
        updates.push({ id: existingItem.id, gridRow: -1, gridCol: -1 });
      }
      await fetch('/api/menu/grid-positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updates })
      });
    } catch (err) {
      console.error('Failed to save position:', err);
    }

    setSelectedBankItem(null);
  };

  // Handle tap on grid item: remove from grid (send to bank)
  const handleGridItemTap = async (item) => {
    // If tapping an already selected item, deselect
    if (selectedItem?.id === item.id) {
      setSelectedItem(null);
      return;
    }

    // If there's a selected bank item, swap positions
    if (selectedBankItem) {
      const newItems = menuItems.map(i => {
        if (i.id === selectedBankItem.id) {
          return { ...i, grid_row: item.grid_row, grid_col: item.grid_col };
        }
        if (i.id === item.id) {
          return { ...i, grid_row: -1, grid_col: -1 };
        }
        return i;
      });

      setMenuItems(newItems);

      try {
        await fetch('/api/menu/grid-positions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: [
              { id: selectedBankItem.id, gridRow: item.grid_row, gridCol: item.grid_col },
              { id: item.id, gridRow: -1, gridCol: -1 }
            ]
          })
        });
      } catch (err) {
        console.error('Failed to save position:', err);
      }

      setSelectedBankItem(null);
      return;
    }

    // Otherwise select this item for span editing
    setSelectedItem(item);
    setSelectedBankItem(null);
  };

  // Handle updating item span
  const handleSpanChange = async (itemId, rowSpan, colSpan) => {
    // Update locally
    const newItems = menuItems.map(item => {
      if (item.id === itemId) {
        return { ...item, row_span: rowSpan, col_span: colSpan };
      }
      return item;
    });
    setMenuItems(newItems);

    // Update selected item if it's the one being changed
    if (selectedItem && selectedItem.id === itemId) {
      setSelectedItem({ ...selectedItem, row_span: rowSpan, col_span: colSpan });
    }

    // Save to backend
    try {
      await fetch(`/api/menu/${itemId}/span`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowSpan, colSpan })
      });
    } catch (err) {
      console.error('Failed to update span:', err);
    }
  };

  // Get items that are on the grid (have valid positions) - excludes supplies
  const getItemsOnGrid = () => {
    return menuItems.filter(item =>
      !item.is_supply &&
      item.grid_row >= 0 && item.grid_row < GRID_ROWS &&
      item.grid_col >= 0 && item.grid_col < GRID_COLS
    );
  };

  // Get items that are NOT on the grid (available in bank) - excludes supplies
  const getItemsInBank = () => {
    return menuItems.filter(item =>
      !item.is_supply && (
        item.grid_row < 0 || item.grid_col < 0 ||
        item.grid_row >= GRID_ROWS || item.grid_col >= GRID_COLS
      )
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

  // In normal mode, get items with safe spans (no overlaps, no overflow) - excludes supplies
  const getActiveGridItems = () => {
    const validItems = menuItems.filter(item =>
      !item.is_supply &&
      item.grid_row >= 0 && item.grid_row < GRID_ROWS &&
      item.grid_col >= 0 && item.grid_col < GRID_COLS
    );

    // Track which cells are occupied
    const occupiedCells = new Set();
    const safeItems = [];

    // Sort by position (top-left first) to give priority to earlier items
    const sortedItems = [...validItems].sort((a, b) => {
      if (a.grid_row !== b.grid_row) return a.grid_row - b.grid_row;
      return a.grid_col - b.grid_col;
    });

    for (const item of sortedItems) {
      // Clamp spans to not exceed grid boundaries
      const maxRowSpan = Math.min(item.row_span || 1, GRID_ROWS - item.grid_row);
      const maxColSpan = Math.min(item.col_span || 1, GRID_COLS - item.grid_col);

      // Find the largest span that doesn't overlap
      let safeRowSpan = 1;
      let safeColSpan = 1;

      // Try to expand column span first, then row span
      for (let cs = maxColSpan; cs >= 1; cs--) {
        for (let rs = maxRowSpan; rs >= 1; rs--) {
          let canPlace = true;

          // Check all cells this item would occupy
          for (let r = item.grid_row; r < item.grid_row + rs && canPlace; r++) {
            for (let c = item.grid_col; c < item.grid_col + cs && canPlace; c++) {
              const cellKey = `${r},${c}`;
              if (occupiedCells.has(cellKey)) {
                canPlace = false;
              }
            }
          }

          if (canPlace) {
            safeRowSpan = rs;
            safeColSpan = cs;
            break;
          }
        }
        if (safeRowSpan > 1 || safeColSpan > 1) break;
      }

      // Mark cells as occupied
      for (let r = item.grid_row; r < item.grid_row + safeRowSpan; r++) {
        for (let c = item.grid_col; c < item.grid_col + safeColSpan; c++) {
          occupiedCells.add(`${r},${c}`);
        }
      }

      safeItems.push({
        ...item,
        safe_row_span: safeRowSpan,
        safe_col_span: safeColSpan
      });
    }

    return safeItems;
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
        <Navbar />
        <div className="admin-table-layout">
          <p style={{ color: 'var(--color-primary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div>
        <Navbar />
        <div className="admin-table-layout">
          <button
            className="btn"
            onClick={() => navigate('/cashbox')}
            style={{ marginBottom: '16px' }}
          >
            ← Back to CashBox
          </button>
          <div className="card">
            <div className="error-message">{error || 'Session not found'}</div>
          </div>
        </div>
      </div>
    );
  }

  const isStartMode = session.status === 'created';
  const isActiveMode = session.status === 'active';
  const isClosed = session.status === 'closed' || session.status === 'cancelled';

  // Handle ending practice session
  const handleEndPracticeSession = async () => {
    if (!window.confirm('End practice session? All practice orders will be deleted.')) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/cashbox/sessions/${id}/end-practice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to end practice session');
      }

      setSuccess(`Practice session ended. ${data.ordersDeleted} practice orders cleared.`);
      setShowCheckout(false);
      setTimeout(() => navigate('/cashbox'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Active session - show POS interface
  if (isActiveMode) {
    const subtotal = calculateSubtotal();
    const change = calculateChange();
    const isTestSession = session.is_test === 1;

    return (
      <div className="pos-container">
        {/* Practice Mode Banner */}
        {isTestSession && (
          <div style={{
            background: 'linear-gradient(90deg, #eab308, #ca8a04)',
            color: '#000',
            textAlign: 'center',
            padding: '8px 16px',
            fontWeight: 'bold',
            fontSize: '14px',
            letterSpacing: '1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '18px' }}>⚠</span>
            PRACTICE MODE - No real transactions
            <span style={{ fontSize: '18px' }}>⚠</span>
          </div>
        )}

        {/* Header */}
        <div className="pos-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: 'var(--color-bg-card-solid)',
          borderBottom: '1px solid var(--color-border)',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: '1 1 auto' }}>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ color: 'var(--color-primary)', fontSize: '18px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {session.name}
              </h1>
              <p className="pos-header-subtitle" style={{ color: 'var(--color-text-muted)', fontSize: '11px', margin: 0 }}>
                {session.program_name}
              </p>
            </div>
          </div>
          {/* Stats - Hidden on mobile */}
          <div className="pos-header-stats" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--color-text-subtle)', fontSize: '10px' }}>Start:</div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', fontWeight: 'bold' }}>
                {formatCurrency(session.start_total)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'var(--color-text-subtle)', fontSize: '10px' }}>Expected:</div>
              <div style={{ color: 'var(--color-primary)', fontSize: '13px', fontWeight: 'bold' }}>
                {formatCurrency(expectedCashInBox)}
              </div>
            </div>
            {sessionDiscountsTotal > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: 'var(--color-warning)', fontSize: '10px' }}>Given:</div>
                <div style={{ color: 'var(--color-warning)', fontSize: '13px', fontWeight: 'bold' }}>
                  {formatCurrency(sessionDiscountsTotal)}
                </div>
              </div>
            )}
          </div>
          {/* Action buttons */}
          <div className="pos-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className={`btn btn-small ${editMode ? 'btn-primary' : ''}`}
              onClick={() => setEditMode(!editMode)}
            >
              {editMode ? 'Done' : 'Edit'}
            </button>
            <button
              className="btn btn-small"
              onClick={handleShowOrderHistory}
              style={{ background: 'var(--color-info)' }}
            >
              History
            </button>
            <button
              className={`btn btn-small ${isTestSession ? '' : 'btn-danger'}`}
              onClick={() => {
                if (isTestSession) fetchOrderHistory();
                setShowCheckout(true);
              }}
              style={isTestSession ? { background: '#eab308', color: '#000' } : {}}
            >
              {isTestSession ? 'End Practice' : 'Close'}
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
                        className={`pos-grid-cell ${isDropTarget ? 'drag-over' : ''} ${selectedBankItem && !item ? 'tap-target' : ''}`}
                        onDragOver={(e) => handleCellDragOver(e, row, col)}
                        onDragLeave={handleCellDragLeave}
                        onDrop={(e) => handleCellDrop(e, row, col)}
                        onClick={() => !item && handleCellTap(row, col)}
                        style={{
                          minHeight: '70px',
                          border: selectedBankItem && !item ? '2px solid var(--color-primary)' : '2px dashed var(--color-text-subtle)',
                          borderRadius: '8px',
                          background: selectedBankItem && !item
                            ? 'rgba(34, 197, 94, 0.2)'
                            : isDropTarget
                              ? 'rgba(34, 197, 94, 0.3)'
                              : 'rgba(74, 124, 89, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          cursor: selectedBankItem && !item ? 'pointer' : 'default'
                        }}
                      >
                        {item ? (
                          <button
                            className={`pos-item-btn edit-mode ${selectedItem?.id === item.id ? 'selected' : ''} ${selectedBankItem ? 'swap-target' : ''}`}
                            draggable={!isTouchDevice()}
                            onDragStart={(e) => handleDragStart(e, item)}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGridItemTap(item);
                            }}
                            style={{
                              width: '100%',
                              height: '100%',
                              cursor: isTouchDevice() ? 'pointer' : 'grab',
                              minHeight: '60px',
                              outline: selectedItem?.id === item.id ? '3px solid var(--color-primary)' : selectedBankItem ? '2px dashed var(--color-warning)' : 'none'
                            }}
                          >
                            {!isTouchDevice() && (
                              <div style={{
                                position: 'absolute',
                                top: '2px',
                                left: '4px',
                                fontSize: '10px',
                                color: 'var(--color-primary)'
                              }}>
                                ☰
                              </div>
                            )}
                            {((item.row_span || 1) > 1 || (item.col_span || 1) > 1) && (
                              <div style={{
                                position: 'absolute',
                                top: '2px',
                                right: '4px',
                                fontSize: '9px',
                                color: 'var(--color-text-muted)',
                                background: 'var(--color-bg-input)',
                                padding: '1px 3px',
                                borderRadius: '3px'
                              }}>
                                {item.col_span || 1}x{item.row_span || 1}
                              </div>
                            )}
                            <div className="pos-item-name" style={{ fontSize: '11px' }}>{item.name}</div>
                            {item.price !== null && (
                              <div className="pos-item-price" style={{ fontSize: '12px' }}>{formatCurrency(item.price)}</div>
                            )}
                            {item.hasSubMenu && (
                              <div className="pos-item-submenu-indicator" style={{ fontSize: '14px' }}>...</div>
                            )}
                          </button>
                        ) : (
                          <span style={{
                            color: selectedBankItem ? 'var(--color-primary)' : 'var(--color-text-subtle)',
                            fontSize: '10px',
                            fontWeight: selectedBankItem ? 'bold' : 'normal'
                          }}>
                            {selectedBankItem ? 'Tap here' : (isTouchDevice() ? 'Tap' : 'Drop')}
                          </span>
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
                    <span style={{ fontSize: '10px', color: 'var(--color-text-subtle)' }}>
                      {isTouchDevice() ? 'Tap to place' : 'Drag to grid'}
                    </span>
                  </div>
                  {selectedBankItem && (
                    <div style={{
                      padding: '6px 10px',
                      background: 'rgba(34, 197, 94, 0.2)',
                      borderBottom: '1px solid var(--color-primary)',
                      fontSize: '11px',
                      color: 'var(--color-primary)'
                    }}>
                      Selected: <strong>{selectedBankItem.name}</strong> — tap a cell to place
                      <button
                        onClick={() => setSelectedBankItem(null)}
                        style={{
                          marginLeft: '8px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--color-warning)',
                          cursor: 'pointer',
                          fontSize: '11px'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                  <div className="pos-item-bank-items">
                    {getItemsInBank().length === 0 ? (
                      <p style={{ color: 'var(--color-text-subtle)', fontSize: '11px', textAlign: 'center', margin: 0, padding: '8px' }}>
                        {isTouchDevice() ? 'Tap grid items to remove' : 'Drag items here to remove from grid'}
                      </p>
                    ) : (
                      getItemsInBank().map((item) => (
                        <div
                          key={item.id}
                          className={`pos-bank-item ${selectedBankItem?.id === item.id ? 'selected' : ''}`}
                          draggable={!isTouchDevice()}
                          onDragStart={(e) => handleDragStart(e, item)}
                          onDragEnd={handleDragEnd}
                          onClick={() => handleBankItemTap(item)}
                          style={{
                            cursor: 'pointer',
                            background: selectedBankItem?.id === item.id ? 'rgba(34, 197, 94, 0.3)' : undefined,
                            borderColor: selectedBankItem?.id === item.id ? 'var(--color-primary)' : undefined
                          }}
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

                {/* Span Controls - shown when item is selected */}
                {selectedItem && (
                  <div style={{
                    background: 'var(--color-bg-input)',
                    padding: '12px',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '14px' }}>
                      {selectedItem.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Width:</span>
                      {[1, 2, 3, 4].map(n => (
                        <button
                          key={`col-${n}`}
                          onClick={() => handleSpanChange(selectedItem.id, selectedItem.row_span || 1, n)}
                          style={{
                            width: '28px',
                            height: '28px',
                            border: 'none',
                            borderRadius: '4px',
                            background: (selectedItem.col_span || 1) === n ? 'var(--color-primary)' : 'var(--color-border)',
                            color: (selectedItem.col_span || 1) === n ? 'var(--color-bg)' : 'var(--color-text-muted)',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Height:</span>
                      {[1, 2, 3].map(n => (
                        <button
                          key={`row-${n}`}
                          onClick={() => handleSpanChange(selectedItem.id, n, selectedItem.col_span || 1)}
                          style={{
                            width: '28px',
                            height: '28px',
                            border: 'none',
                            borderRadius: '4px',
                            background: (selectedItem.row_span || 1) === n ? 'var(--color-primary)' : 'var(--color-border)',
                            color: (selectedItem.row_span || 1) === n ? 'var(--color-bg)' : 'var(--color-text-muted)',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setSelectedItem(null)}
                      style={{
                        marginLeft: 'auto',
                        padding: '4px 12px',
                        border: 'none',
                        borderRadius: '4px',
                        background: 'var(--color-border)',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Done
                    </button>
                  </div>
                )}
            </div>
          ) : (
            /* Normal mode - fixed 4x3 grid on all screen sizes */
            <div className="pos-menu" style={{ overflow: 'auto', padding: '8px' }}>
              <div className="pos-fixed-grid">
                {getActiveGridItems().length === 0 ? (
                  <div style={{
                    gridColumn: '1 / -1',
                    gridRow: '1 / -1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text-subtle)'
                  }}>
                    <p>No menu items configured.</p>
                    <p style={{ fontSize: '14px' }}>Click "Edit" to add items to the grid.</p>
                  </div>
                ) : (
                  getActiveGridItems().map((item) => {
                    // Use safe spans that account for overlaps and boundaries
                    const rowSpan = item.safe_row_span || 1;
                    const colSpan = item.safe_col_span || 1;
                    const stockStatus = getStockStatus(item);
                    return (
                      <button
                        key={item.id}
                        className={`pos-item-btn ${item.hasSubMenu ? 'has-submenu' : ''} ${stockStatus !== 'none' ? `stock-${stockStatus}` : ''}`}
                        onClick={() => handleItemClick(item)}
                        style={{
                          gridRow: `${item.grid_row + 1} / span ${rowSpan}`,
                          gridColumn: `${item.grid_col + 1} / span ${colSpan}`,
                          minHeight: '0',
                          padding: '4px'
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
                        {stockStatus !== 'none' && (
                          <div className={`pos-stock-badge ${stockStatus}`}>
                            {stockStatus === 'out' ? 'OUT' : item.quantity_on_hand}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="pos-order">
            <h2 style={{ color: 'var(--color-primary)', fontSize: '16px', marginBottom: '12px' }}>Order</h2>

            {Object.keys(orderItems).length === 0 ? (
              <p style={{ color: 'var(--color-text-subtle)', textAlign: 'center' }}>No items added</p>
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
                <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>{formatCurrency(subtotal)}</span>
              </div>

              <div className="pos-payment">
                <label style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Amount Given:</label>
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
                    color: change >= 0 ? 'var(--color-primary)' : 'var(--color-danger)'
                  }}>
                    {formatCurrency(change)}
                  </span>
                </div>
              )}
            </div>

            <div className="pos-actions" style={{ flexWrap: 'wrap', gap: '6px' }}>
              <button
                className="btn"
                onClick={clearOrder}
                style={{ flex: '1 1 45%' }}
              >
                Clear
              </button>
              <button
                className="btn"
                onClick={() => handleOpenDiscount(false)}
                disabled={submittingOrder || subtotal === 0}
                style={{ flex: '1 1 45%', background: 'var(--color-warning)' }}
              >
                Discount
              </button>
              <button
                className="btn"
                onClick={() => handleOpenDiscount(true)}
                disabled={submittingOrder || subtotal === 0}
                style={{ flex: '1 1 45%', background: '#9333ea' }}
              >
                Comp
              </button>
              <button
                className="btn btn-primary"
                onClick={handleOpenPayment}
                disabled={submittingOrder || subtotal === 0}
                style={{ flex: '1 1 45%' }}
              >
                Pay
              </button>
            </div>
          </div>
        </div>

        {/* Sub-menu Modal */}
        <SubMenuModal
          show={showSubMenu && !!subMenuParent}
          parentItem={subMenuParent}
          onClose={() => setShowSubMenu(false)}
          onSelectItem={addToOrder}
          getStockStatus={getStockStatus}
        />

        {/* Discount Modal */}
        <DiscountModal
          show={showDiscountModal}
          onClose={() => setShowDiscountModal(false)}
          isComp={isComp}
          orderTotal={calculateSubtotal()}
          discountAmount={discountAmount}
          setDiscountAmount={setDiscountAmount}
          discountChargedTo={discountChargedTo}
          setDiscountChargedTo={setDiscountChargedTo}
          discountReason={discountReason}
          setDiscountReason={setDiscountReason}
          onApply={handleApplyDiscount}
          session={session}
          programs={programs}
          error={error}
        />

        {/* Payment Modal */}
        <PaymentModal
          show={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          isComp={isComp}
          subtotal={calculateSubtotal()}
          appliedDiscount={getAppliedDiscount()}
          finalTotal={getFinalTotal()}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          amountTendered={amountTendered}
          setAmountTendered={setAmountTendered}
          onComplete={handleCompleteOrder}
          submitting={submittingOrder}
          error={error}
          session={session}
          discountChargedTo={discountChargedTo}
          setDiscountChargedTo={setDiscountChargedTo}
        />

        {/* Checkout Modal */}
        {showCheckout && (
          <div className="pos-modal-overlay" onClick={() => setShowCheckout(false)}>
            <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              {/* Practice Session - Simplified close */}
              {isTestSession ? (
                <>
                  <h3 style={{ color: '#eab308', marginBottom: '16px' }}>End Practice Session</h3>

                  <div style={{
                    background: 'linear-gradient(135deg, #eab30822, #ca8a0422)',
                    border: '1px solid #eab308',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    textAlign: 'center'
                  }}>
                    <p style={{ color: '#eab308', fontSize: '16px', marginBottom: '8px', fontWeight: 'bold' }}>
                      This is a Practice Session
                    </p>
                    <p style={{ color: '#4a7c59', fontSize: '14px' }}>
                      No real inventory or cash was affected.
                    </p>
                  </div>

                  <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#4a7c59' }}>Practice Orders:</span>
                      <span style={{ color: '#eab308' }}>{orderHistory.length || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#4a7c59' }}>Practice Sales:</span>
                      <span style={{ color: '#eab308' }}>{formatCurrency(sessionSales)}</span>
                    </div>
                  </div>

                  <p style={{ color: '#f97316', marginBottom: '16px', fontSize: '13px', textAlign: 'center' }}>
                    All practice orders will be permanently deleted.
                  </p>

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
                      type="button"
                      className="btn"
                      onClick={handleEndPracticeSession}
                      disabled={submitting}
                      style={{ flex: 1, background: '#eab308', color: '#000' }}
                    >
                      {submitting ? 'Ending...' : 'End Practice'}
                    </button>
                  </div>
                </>
              ) : (
                /* Real Session - Full close flow */
                <>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '16px' }}>Close Session</h3>

              <div style={{ background: 'var(--color-bg-input)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--color-text-subtle)' }}>Starting Cash:</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(session.start_total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--color-text-subtle)' }}>Total Sales:</span>
                  <span style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(sessionSales)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Expected in Box:</span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{formatCurrency(expectedCashInBox)}</span>
                </div>
              </div>

              <p style={{ color: 'var(--color-text-muted)', marginBottom: '12px', fontSize: '14px' }}>
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

                <div style={{ background: 'var(--color-bg-input)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--color-text-subtle)' }}>Counted Total:</span>
                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 'bold' }}>{formatCurrency(calculateFormTotal())}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                    <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Profit:</span>
                    <span style={{
                      color: calculateFormTotal() - session.start_total >= 0 ? 'var(--color-primary)' : 'var(--color-danger)',
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
                </>
              )}
            </div>
          </div>
        )}

        {/* Order History Modal */}
        <OrderHistoryModal
          show={showOrderHistory}
          onClose={() => setShowOrderHistory(false)}
          orders={orderHistory}
          loading={loadingHistory}
        />
      </div>
    );
  }

  // Start mode or closed mode - show regular view
  return (
    <div>
      <Navbar />
      <div className="admin-table-layout">
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
                Created: {formatDateTime(session.created_at)}
              </p>
            </div>
            <span className={`status-badge ${session.status === 'created' ? 'pending' : session.status === 'active' ? 'approved' : session.status === 'closed' ? 'completed' : 'rejected'}`}>
              {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
            </span>
          </div>

          {isClosed && (
            <div style={{
              background: 'var(--color-bg-input)',
              padding: '16px',
              borderRadius: '8px',
              marginTop: '16px'
            }}>
              <h3 style={{ color: 'var(--color-primary)', fontSize: '16px', marginBottom: '12px' }}>Session Results</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p style={{ color: 'var(--color-text-subtle)', fontSize: '14px' }}>Starting Cash</p>
                  <p style={{ color: 'var(--color-primary)', fontSize: '20px', fontWeight: 'bold' }}>
                    {formatCurrency(session.start_total)}
                  </p>
                </div>
                <div>
                  <p style={{ color: 'var(--color-text-subtle)', fontSize: '14px' }}>Ending Cash</p>
                  <p style={{ color: 'var(--color-primary)', fontSize: '20px', fontWeight: 'bold' }}>
                    {formatCurrency(session.end_total)}
                  </p>
                </div>
              </div>
              <div style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '1px solid var(--color-border)',
                textAlign: 'center'
              }}>
                <p style={{ color: 'var(--color-text-subtle)', fontSize: '14px' }}>Profit</p>
                <p style={{
                  color: session.profit >= 0 ? 'var(--color-primary)' : 'var(--color-danger)',
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
            <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--color-primary)' }}>
              Enter Starting Cash
            </h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '16px', fontSize: '14px' }}>
              Enter the cash you are taking from the main cashbox to start this session.
            </p>

            {cashbox && (
              <div style={{
                background: 'var(--color-bg-input)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '14px',
                color: 'var(--color-text-subtle)'
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
                  <small style={{ color: 'var(--color-text-subtle)' }}>Available: {cashbox?.quarters || 0}</small>
                </div>
                <div className="form-group">
                  <label htmlFor="bills1">$1 Bills</label>
                  <input type="number" id="bills1" className="input" min="0"
                    max={cashbox?.bills_1 || 0} value={bills1}
                    onChange={(e) => setBills1(parseInt(e.target.value) || 0)} />
                  <small style={{ color: 'var(--color-text-subtle)' }}>Available: {cashbox?.bills_1 || 0}</small>
                </div>
                <div className="form-group">
                  <label htmlFor="bills5">$5 Bills</label>
                  <input type="number" id="bills5" className="input" min="0"
                    max={cashbox?.bills_5 || 0} value={bills5}
                    onChange={(e) => setBills5(parseInt(e.target.value) || 0)} />
                  <small style={{ color: 'var(--color-text-subtle)' }}>Available: {cashbox?.bills_5 || 0}</small>
                </div>
                <div className="form-group">
                  <label htmlFor="bills10">$10 Bills</label>
                  <input type="number" id="bills10" className="input" min="0"
                    max={cashbox?.bills_10 || 0} value={bills10}
                    onChange={(e) => setBills10(parseInt(e.target.value) || 0)} />
                  <small style={{ color: 'var(--color-text-subtle)' }}>Available: {cashbox?.bills_10 || 0}</small>
                </div>
                <div className="form-group">
                  <label htmlFor="bills20">$20 Bills</label>
                  <input type="number" id="bills20" className="input" min="0"
                    max={cashbox?.bills_20 || 0} value={bills20}
                    onChange={(e) => setBills20(parseInt(e.target.value) || 0)} />
                  <small style={{ color: 'var(--color-text-subtle)' }}>Available: {cashbox?.bills_20 || 0}</small>
                </div>
                <div className="form-group">
                  <label htmlFor="bills50">$50 Bills</label>
                  <input type="number" id="bills50" className="input" min="0"
                    max={cashbox?.bills_50 || 0} value={bills50}
                    onChange={(e) => setBills50(parseInt(e.target.value) || 0)} />
                  <small style={{ color: 'var(--color-text-subtle)' }}>Available: {cashbox?.bills_50 || 0}</small>
                </div>
                <div className="form-group">
                  <label htmlFor="bills100">$100 Bills</label>
                  <input type="number" id="bills100" className="input" min="0"
                    max={cashbox?.bills_100 || 0} value={bills100}
                    onChange={(e) => setBills100(parseInt(e.target.value) || 0)} />
                  <small style={{ color: 'var(--color-text-subtle)' }}>Available: {cashbox?.bills_100 || 0}</small>
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: 'var(--color-bg-input)',
                borderRadius: '8px',
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Starting Cash Total: </span>
                <span style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '24px' }}>
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
