import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { formatCurrency, formatDateTime } from '../utils/formatters';

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

  // Sidebar navigation state
  const [activeSection, setActiveSection] = useState('dashboard');
  const [activeSubSection, setActiveSubSection] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Legacy tab state (for backwards compatibility during transition)
  const [activeTab, setActiveTab] = useState('sessions');

  // Create session form
  const [sessionName, setSessionName] = useState('');
  const [sessionProgramId, setSessionProgramId] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);
  const [isTestSession, setIsTestSession] = useState(false);

  // Program management
  const [newProgramName, setNewProgramName] = useState('');
  const [addingProgram, setAddingProgram] = useState(false);

  // Menu management
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemParentId, setNewItemParentId] = useState('');
  const [newItemNeedsIngredients, setNewItemNeedsIngredients] = useState(false);
  const [addingMenuItem, setAddingMenuItem] = useState(false);

  // Edit menu item
  const [editingMenuItemId, setEditingMenuItemId] = useState(null);
  const [editMenuItemName, setEditMenuItemName] = useState('');
  const [editMenuItemPrice, setEditMenuItemPrice] = useState('');
  const [editMenuItemUnitCost, setEditMenuItemUnitCost] = useState('');
  const [editMenuItemTrackInventory, setEditMenuItemTrackInventory] = useState(true);

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
  const [dropIndicator, setDropIndicator] = useState(null); // { itemId, position: 'before'|'after'|'into', parentId }

  // Collapsed categories
  const [collapsedCategories, setCollapsedCategories] = useState(new Set());

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

  // Purchases state
  const [purchases, setPurchases] = useState([]);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [purchaseFormData, setPurchaseFormData] = useState({
    vendor: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    items: [{ menuItemId: '', itemName: '', quantity: '', lineTotal: '' }],
    tax: '',
    deliveryFee: '',
    otherFees: '',
    notes: ''
  });
  const [submittingPurchase, setSubmittingPurchase] = useState(false);
  const [purchaseItemSearchQueries, setPurchaseItemSearchQueries] = useState({});
  const [purchaseItemDropdownOpen, setPurchaseItemDropdownOpen] = useState(null);

  // Quick create item modal
  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);
  const [quickCreateData, setQuickCreateData] = useState({
    name: '',
    isSupply: false,
    unitCost: '',
    quantity: ''
  });
  const [quickCreateForIndex, setQuickCreateForIndex] = useState(null);

  // Stock update state
  const [showStockUpdateForm, setShowStockUpdateForm] = useState(false);
  const [stockUpdateData, setStockUpdateData] = useState({
    menuItemId: '',
    quantity: '',
    unitCost: '',
    notes: ''
  });

  // Inventory state
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [inventoryLots, setInventoryLots] = useState([]);
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({
    adjustmentType: 'lost',
    quantity: '',
    notes: ''
  });

  // CashApp and reimbursement state
  const [cashAppBalance, setCashAppBalance] = useState(0);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');

  // Profit distribution state
  const [showDistributeModal, setShowDistributeModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [distributionAmounts, setDistributionAmounts] = useState({});
  const [sessionDistributions, setSessionDistributions] = useState({});

  // Losses state
  const [losses, setLosses] = useState([]);
  const [lossesSummary, setLossesSummary] = useState({ byType: [], totals: { total_count: 0, total_amount: 0 } });
  const [showAddLossForm, setShowAddLossForm] = useState(false);
  const [lossFormData, setLossFormData] = useState({
    sessionId: '',
    programId: '',
    lossType: 'spoilage',
    amount: '',
    description: ''
  });

  // Reports state
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportSummary, setReportSummary] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Session details view state
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [sessionDetailsData, setSessionDetailsData] = useState(null);
  const [sessionOrders, setSessionOrders] = useState([]);
  const [loadingSessionDetails, setLoadingSessionDetails] = useState(false);

  // Inventory movements state
  const [inventoryTransactions, setInventoryTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Program charges state
  const [programCharges, setProgramCharges] = useState([]);
  const [programChargesSummary, setProgramChargesSummary] = useState([]);
  const [loadingCharges, setLoadingCharges] = useState(false);

  // Reimbursement state
  const [reimbursementData, setReimbursementData] = useState(null);
  const [reimbursementLedger, setReimbursementLedger] = useState([]);
  const [loadingReimbursement, setLoadingReimbursement] = useState(false);

  // Composite item editing state
  const [editingCompositeItem, setEditingCompositeItem] = useState(null);
  const [compositeComponents, setCompositeComponents] = useState([]);
  const [availableComponents, setAvailableComponents] = useState([]);
  const [loadingComponents, setLoadingComponents] = useState(false);

  useEffect(() => {
    fetchData();
    fetchPurchases();
    fetchInventory();
    fetchCashAppBalance();
    fetchLosses();
  }, []);

  const fetchPurchases = async () => {
    try {
      const response = await fetch('/api/purchases');
      const data = await response.json();
      if (response.ok) {
        setPurchases(data);
      }
    } catch (err) {
      console.error('Failed to fetch purchases:', err);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/inventory');
      const data = await response.json();
      if (response.ok) {
        setInventoryItems(data);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    }
  };

  const fetchCashAppBalance = async () => {
    try {
      const response = await fetch('/api/cashapp/balance');
      const data = await response.json();
      if (response.ok) {
        setCashAppBalance(data.balance || 0);
      }
    } catch (err) {
      console.error('Failed to fetch CashApp balance:', err);
    }
  };

  const fetchLosses = async () => {
    try {
      const [lossesRes, summaryRes] = await Promise.all([
        fetch('/api/losses'),
        fetch('/api/losses/summary')
      ]);
      const lossesData = await lossesRes.json();
      const summaryData = await summaryRes.json();
      if (lossesRes.ok) {
        setLosses(lossesData);
      }
      if (summaryRes.ok) {
        setLossesSummary(summaryData);
      }
    } catch (err) {
      console.error('Failed to fetch losses:', err);
    }
  };

  const fetchSessionDetails = async (session) => {
    setLoadingSessionDetails(true);
    setSelectedSession(session);
    setShowSessionDetails(true);

    try {
      const [ordersRes, summaryRes] = await Promise.all([
        fetch(`/api/orders/session/${session.id}`),
        fetch(`/api/orders/session/${session.id}/summary`)
      ]);

      const ordersData = await ordersRes.json();
      const summaryData = await summaryRes.json();

      if (ordersRes.ok) {
        setSessionOrders(ordersData);
      }
      if (summaryRes.ok) {
        setSessionDetailsData(summaryData);
      }
    } catch (err) {
      console.error('Failed to fetch session details:', err);
    } finally {
      setLoadingSessionDetails(false);
    }
  };

  const fetchInventoryTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const response = await fetch('/api/inventory/transactions?limit=200');
      const data = await response.json();
      if (response.ok) {
        setInventoryTransactions(data);
      }
    } catch (err) {
      console.error('Failed to fetch inventory transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const fetchProgramCharges = async () => {
    setLoadingCharges(true);
    try {
      const [chargesRes, summaryRes] = await Promise.all([
        fetch('/api/cashbox/program-charges?limit=100'),
        fetch('/api/cashbox/program-charges/summary')
      ]);
      const chargesData = await chargesRes.json();
      const summaryData = await summaryRes.json();

      if (chargesRes.ok) setProgramCharges(chargesData);
      if (summaryRes.ok) setProgramChargesSummary(summaryData);
    } catch (err) {
      console.error('Failed to fetch program charges:', err);
    } finally {
      setLoadingCharges(false);
    }
  };

  const fetchReimbursementData = async () => {
    setLoadingReimbursement(true);
    try {
      const [summaryRes, ledgerRes] = await Promise.all([
        fetch('/api/cashbox/reimbursement'),
        fetch('/api/cashbox/reimbursement/ledger?limit=50')
      ]);
      const summaryData = await summaryRes.json();
      const ledgerData = await ledgerRes.json();

      if (summaryRes.ok) setReimbursementData(summaryData);
      if (ledgerRes.ok) setReimbursementLedger(ledgerData);
    } catch (err) {
      console.error('Failed to fetch reimbursement data:', err);
    } finally {
      setLoadingReimbursement(false);
    }
  };

  const fetchInventoryLots = async (itemId) => {
    try {
      const response = await fetch(`/api/inventory/${itemId}/lots`);
      const data = await response.json();
      if (response.ok) {
        setInventoryLots(data);
      }
    } catch (err) {
      console.error('Failed to fetch inventory lots:', err);
    }
  };

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
          name: isTestSession ? `[PRACTICE] ${sessionName.trim()}` : sessionName.trim(),
          programId: parseInt(sessionProgramId),
          createdBy: 'admin',
          isTest: isTestSession
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create session');
      }

      setSuccess(isTestSession ? 'Practice session created!' : 'Session created successfully!');
      setSessionName('');
      setIsTestSession(false);
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

    // Store values before resetting form
    const itemName = newItemName.trim();
    const itemPrice = newItemPrice;
    const needsIngredients = newItemNeedsIngredients && newItemPrice;

    try {
      const response = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: itemName,
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
      setNewItemNeedsIngredients(false);

      // If needs ingredients, refresh data first then open composite editor
      if (needsIngredients && data.id) {
        await fetchData();
        openCompositeEditor({ id: data.id, name: itemName });
      } else {
        fetchData();
      }
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
    setEditMenuItemUnitCost(item.unit_cost ? item.unit_cost.toString() : '');
    setEditMenuItemTrackInventory(item.track_inventory !== 0);
  };

  const cancelEditingMenuItem = () => {
    setEditingMenuItemId(null);
    setEditMenuItemName('');
    setEditMenuItemPrice('');
    setEditMenuItemUnitCost('');
    setEditMenuItemTrackInventory(true);
  };

  const handleUpdateMenuItem = async (id) => {
    if (!editMenuItemName.trim()) return;

    setError('');
    setSuccess('');

    try {
      // Update menu item (name, price)
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

      // Update inventory settings (unit cost, track inventory)
      const inventoryResponse = await fetch(`/api/menu/${id}/inventory`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitCost: parseFloat(editMenuItemUnitCost) || 0,
          trackInventory: editMenuItemTrackInventory
        })
      });

      if (!inventoryResponse.ok) {
        const invData = await inventoryResponse.json();
        throw new Error(invData.error || 'Failed to update inventory settings');
      }

      setSuccess('Menu item updated successfully!');
      cancelEditingMenuItem();
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Composite item functions
  const openCompositeEditor = async (item) => {
    setEditingCompositeItem(item);
    setLoadingComponents(true);

    try {
      // Fetch current components for this item
      const componentsRes = await fetch(`/api/menu/${item.id}/components`);
      const componentsData = await componentsRes.json();
      setCompositeComponents(componentsData.map(c => ({
        componentItemId: c.component_item_id,
        componentName: c.component_name,
        quantity: c.quantity
      })));

      // Fetch all available items that can be components (items with price, not composite themselves)
      const allItemsRes = await fetch('/api/menu/flat');
      const allItems = await allItemsRes.json();
      // Filter out the current item and items that are already composite
      setAvailableComponents(allItems.filter(i => i.id !== item.id && !i.is_composite));
    } catch (err) {
      console.error('Failed to fetch components:', err);
      setError('Failed to load component data');
    } finally {
      setLoadingComponents(false);
    }
  };

  const closeCompositeEditor = () => {
    setEditingCompositeItem(null);
    setCompositeComponents([]);
    setAvailableComponents([]);
  };

  const addComponent = (componentItem) => {
    // Check if already added
    if (compositeComponents.find(c => c.componentItemId === componentItem.id)) {
      return;
    }
    setCompositeComponents([...compositeComponents, {
      componentItemId: componentItem.id,
      componentName: componentItem.name,
      quantity: 1
    }]);
  };

  const removeComponent = (componentItemId) => {
    setCompositeComponents(compositeComponents.filter(c => c.componentItemId !== componentItemId));
  };

  const updateComponentQuantity = (componentItemId, quantity) => {
    setCompositeComponents(compositeComponents.map(c =>
      c.componentItemId === componentItemId
        ? { ...c, quantity: Math.max(0.25, parseFloat(quantity) || 1) }
        : c
    ));
  };

  const saveCompositeComponents = async () => {
    if (!editingCompositeItem) return;

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/menu/${editingCompositeItem.id}/components`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          components: compositeComponents.map(c => ({
            componentItemId: c.componentItemId,
            quantity: c.quantity
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save components');
      }

      setSuccess(`Components saved for "${editingCompositeItem.name}"`);
      closeCompositeEditor();
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
  // parentId is passed for sub-items to identify their parent category
  const handleDragStart = (e, item, parentId = null) => {
    e.stopPropagation();
    const itemParentId = parentId !== null ? parentId : item.parent_id;
    setDraggedItem({ ...item, parent_id: itemParentId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, item, parentId = null) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem || draggedItem.id === item.id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    let position;
    const targetIsCategory = item.price === null;
    const isCollapsed = targetIsCategory && collapsedCategories.has(item.id);
    const targetIsSubItem = parentId !== null;
    const draggedIsCategory = draggedItem.price === null;

    // If dragging a category, never allow 'into' another category
    if (draggedIsCategory && targetIsCategory) {
      // Categories can only go before/after other categories, not into
      position = y < height / 2 ? 'before' : 'after';
    } else if (targetIsCategory && isCollapsed) {
      // Hovering over a collapsed category - always 'into'
      position = 'into';
    } else if (targetIsCategory && !targetIsSubItem) {
      // Expanded category - can drop into it or before/after
      if (y < height * 0.25) {
        position = 'before';
      } else if (y > height * 0.75) {
        position = 'after';
      } else {
        position = 'into';
      }
    } else {
      // Regular item - before or after
      position = y < height / 2 ? 'before' : 'after';
    }

    setDropIndicator({ itemId: item.id, position, parentId });
    setDragOverItem(item);
  };

  const handleDragLeave = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverItem(null);
      setDropIndicator(null);
    }
  };

  const handleDrop = async (e, targetItem, targetParentId = null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverItem(null);

    const currentDropIndicator = dropIndicator;
    setDropIndicator(null);

    if (!draggedItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      return;
    }

    const position = currentDropIndicator?.position || 'after';
    const draggedParentId = draggedItem.parent_id;
    const targetIsCategory = targetItem.price === null;
    const targetIsTopLevel = targetParentId === null && targetItem.parent_id === null;
    const draggedIsCategory = draggedItem.price === null;

    console.log('handleDrop:', {
      position,
      draggedItem: draggedItem.name,
      targetItem: targetItem.name,
      draggedIsCategory,
      targetIsCategory,
      targetIsTopLevel,
      draggedParentId,
      targetParentId
    });

    try {
      // Case 1: Dropping INTO a category (position is 'into')
      // Prevent categories from being nested inside other categories
      if (position === 'into' && targetIsCategory) {
        if (draggedIsCategory) {
          setError('Categories cannot be placed inside other categories');
          setDraggedItem(null);
          return;
        }

        await fetch(`/api/menu/${draggedItem.id}/set-parent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentId: targetItem.id })
        });
        fetchData();
        setDraggedItem(null);
        return;
      }

      // Case 2: Dragged item is a sub-item, dropping on a top-level item (promote to top level)
      if (draggedParentId !== null && targetIsTopLevel && !targetIsCategory) {
        // First promote to top level
        await fetch(`/api/menu/${draggedItem.id}/set-parent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentId: null })
        });

        // Then reorder
        const updatedItems = await fetch('/api/menu/all').then(r => r.json());
        const items = [...updatedItems];
        const dragIndex = items.findIndex(i => i.id === draggedItem.id);
        let dropIndex = items.findIndex(i => i.id === targetItem.id);

        if (dragIndex !== -1 && dropIndex !== -1) {
          items.splice(dragIndex, 1);
          dropIndex = items.findIndex(i => i.id === targetItem.id);
          if (position === 'after') dropIndex++;
          items.splice(dropIndex, 0, { ...draggedItem, parent_id: null });

          await fetch('/api/menu/reorder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items })
          });
        }
        fetchData();
        setDraggedItem(null);
        return;
      }

      // Case 3: Dropping a top-level item onto a sub-item (add to that category)
      if (draggedParentId === null && targetParentId !== null && !draggedIsCategory) {
        await fetch(`/api/menu/${draggedItem.id}/set-parent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentId: targetParentId })
        });
        fetchData();
        setDraggedItem(null);
        return;
      }

      // Case 4: Both items are sub-items of the same parent (reorder within category)
      if (draggedParentId !== null && targetParentId !== null && draggedParentId === targetParentId) {
        const parentItem = menuItems.find(item => item.id === draggedParentId);
        if (!parentItem || !parentItem.subItems) {
          setDraggedItem(null);
          return;
        }

        const subItems = [...parentItem.subItems];
        const dragIndex = subItems.findIndex(i => i.id === draggedItem.id);
        let dropIndex = subItems.findIndex(i => i.id === targetItem.id);

        if (dragIndex === -1 || dropIndex === -1) {
          setDraggedItem(null);
          return;
        }

        subItems.splice(dragIndex, 1);
        dropIndex = subItems.findIndex(i => i.id === targetItem.id);
        if (dropIndex === -1) {
          dropIndex = subItems.length;
        } else if (position === 'after') {
          dropIndex++;
        }
        subItems.splice(dropIndex, 0, { ...draggedItem });

        await fetch('/api/menu/reorder-subitems', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentId: draggedParentId, items: subItems })
        });
        fetchData();
        setDraggedItem(null);
        return;
      }

      // Case 5: Both are top-level items (reorder at top level)
      if (draggedParentId === null && targetIsTopLevel) {
        const items = [...menuItems];
        const dragIndex = items.findIndex(i => i.id === draggedItem.id);
        let dropIndex = items.findIndex(i => i.id === targetItem.id);

        if (dragIndex === -1 || dropIndex === -1) {
          setDraggedItem(null);
          return;
        }

        items.splice(dragIndex, 1);
        dropIndex = items.findIndex(i => i.id === targetItem.id);
        if (dropIndex === -1) {
          dropIndex = items.length;
        } else if (position === 'after') {
          dropIndex++;
        }
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

  // Toggle category collapse
  const toggleCategoryCollapse = (categoryId) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
    setDropIndicator(null);
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

  // Purchase form handlers
  const handlePurchaseItemChange = (index, field, value) => {
    setPurchaseFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  // Select a menu item from the dropdown and auto-fill name
  const handleSelectPurchaseItem = (index, menuItem) => {
    setPurchaseFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        menuItemId: menuItem.id.toString(),
        itemName: menuItem.name
      };
      return { ...prev, items: newItems };
    });
    // Clear search and close dropdown
    setPurchaseItemSearchQueries(prev => ({ ...prev, [index]: '' }));
    setPurchaseItemDropdownOpen(null);
  };

  // Clear the menu item link
  const handleClearPurchaseItemLink = (index) => {
    setPurchaseFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        menuItemId: '',
        itemName: ''
      };
      return { ...prev, items: newItems };
    });
    setPurchaseItemSearchQueries(prev => ({ ...prev, [index]: '' }));
  };

  // Filter items based on search query
  const getFilteredPurchaseItems = (searchQuery) => {
    const { sellableItems, supplyItems } = getAllPurchaseItems();
    const query = (searchQuery || '').toLowerCase();
    if (!query) return { sellableItems, supplyItems };
    return {
      sellableItems: sellableItems.filter(i => i.name.toLowerCase().includes(query)),
      supplyItems: supplyItems.filter(i => i.name.toLowerCase().includes(query))
    };
  };

  // Open quick create modal
  const openQuickCreateModal = (index, prefillName) => {
    setQuickCreateForIndex(index);
    setQuickCreateData({
      name: prefillName || '',
      isSupply: false,
      unitCost: '',
      quantity: ''
    });
    setShowQuickCreateModal(true);
    setPurchaseItemDropdownOpen(null);
  };

  const addPurchaseItem = () => {
    setPurchaseFormData(prev => ({
      ...prev,
      items: [...prev.items, { menuItemId: '', itemName: '', quantity: '', lineTotal: '' }]
    }));
  };

  const removePurchaseItem = (index) => {
    if (purchaseFormData.items.length > 1) {
      setPurchaseFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
      // Clean up search queries
      setPurchaseItemSearchQueries(prev => {
        const newQueries = { ...prev };
        delete newQueries[index];
        return newQueries;
      });
    }
  };

  const resetPurchaseForm = () => {
    setPurchaseFormData({
      vendor: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      items: [{ menuItemId: '', itemName: '', quantity: '', lineTotal: '' }],
      tax: '',
      deliveryFee: '',
      otherFees: '',
      notes: ''
    });
    setShowPurchaseForm(false);
  };

  const handleSubmitPurchase = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Check for unlinked items and warn
    const unlinkedItems = purchaseFormData.items.filter(i => !i.menuItemId && i.itemName);
    if (unlinkedItems.length > 0) {
      const itemNames = unlinkedItems.map(i => i.itemName).join(', ');
      const confirmed = window.confirm(
        `${unlinkedItems.length} item(s) are not linked to inventory and won't update stock:\n\n${itemNames}\n\nContinue anyway?`
      );
      if (!confirmed) return;
    }

    setSubmittingPurchase(true);

    try {
      // Prepare items with proper naming
      const items = purchaseFormData.items.map(item => ({
        menuItemId: item.menuItemId ? parseInt(item.menuItemId) : null,
        itemName: item.itemName || (item.menuItemId ? menuItems.find(m => m.id === parseInt(item.menuItemId))?.name : 'Unknown Item'),
        quantity: parseInt(item.quantity) || 1,
        lineTotal: parseFloat(item.lineTotal) || 0
      }));

      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor: purchaseFormData.vendor,
          purchaseDate: purchaseFormData.purchaseDate,
          items,
          tax: purchaseFormData.tax,
          deliveryFee: purchaseFormData.deliveryFee,
          otherFees: purchaseFormData.otherFees,
          notes: purchaseFormData.notes,
          createdBy: user?.name || 'admin'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create purchase');
      }

      setSuccess(`Purchase created! Total: ${formatCurrency(data.total)} (${data.overheadPercent}% overhead distributed)`);
      resetPurchaseForm();
      fetchPurchases();
      fetchData(); // Refresh menu items to show updated quantities
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingPurchase(false);
    }
  };

  // Quick create a new inventory item from purchase entry
  const handleQuickCreateItem = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Create the menu item with is_supply flag
      const response = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickCreateData.name,
          price: quickCreateData.isSupply ? null : 0, // Supplies have no price
          isSupply: quickCreateData.isSupply
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create item');
      }

      const newItemId = data.id;

      // Update inventory settings if unit cost provided
      if (quickCreateData.unitCost) {
        await fetch(`/api/menu/${newItemId}/inventory`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            unitCost: parseFloat(quickCreateData.unitCost) || 0,
            trackInventory: true
          })
        });
      }

      // Refresh menu items
      await fetchData();

      // Select the new item in the purchase form
      if (quickCreateForIndex !== null) {
        handleSelectPurchaseItem(quickCreateForIndex, { id: newItemId, name: quickCreateData.name });
      }

      // Close modal
      setShowQuickCreateModal(false);
      setQuickCreateData({ name: '', isSupply: false, unitCost: '', quantity: '' });
      setQuickCreateForIndex(null);

    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeletePurchase = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase? This will reverse inventory changes.')) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/purchases/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete purchase');
      }

      setSuccess('Purchase deleted and inventory reversed.');
      fetchPurchases();
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Stock update handlers
  const resetStockUpdateForm = () => {
    setStockUpdateData({
      menuItemId: '',
      quantity: '',
      unitCost: '',
      notes: ''
    });
    setShowStockUpdateForm(false);
  };

  const handleSubmitStockUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/purchases/stock-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuItemId: parseInt(stockUpdateData.menuItemId),
          quantity: parseInt(stockUpdateData.quantity),
          unitCost: parseFloat(stockUpdateData.unitCost) || 0,
          notes: stockUpdateData.notes,
          createdBy: user?.name || 'admin'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update stock');
      }

      setSuccess(`Stock updated! Added ${data.quantity} units. (Non-reimbursable)`);
      resetStockUpdateForm();
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Calculate purchase subtotal for display
  const calculatePurchaseSubtotal = () => {
    return purchaseFormData.items.reduce((sum, item) => sum + (parseFloat(item.lineTotal) || 0), 0);
  };

  const calculatePurchaseTotal = () => {
    const subtotal = calculatePurchaseSubtotal();
    const tax = parseFloat(purchaseFormData.tax) || 0;
    const deliveryFee = parseFloat(purchaseFormData.deliveryFee) || 0;
    const otherFees = parseFloat(purchaseFormData.otherFees) || 0;
    return subtotal + tax + deliveryFee + otherFees;
  };

  // Profit distribution handlers
  const handleOpenDistribute = async (session) => {
    setSelectedSession(session);
    // Initialize with even split
    const profit = session.profit || 0;
    const evenSplit = programs.length > 0 ? Math.floor(profit / programs.length * 100) / 100 : 0;
    const amounts = {};
    programs.forEach(p => {
      amounts[p.id] = evenSplit;
    });
    setDistributionAmounts(amounts);
    setShowDistributeModal(true);
  };

  const handleDistributionChange = (programId, value) => {
    setDistributionAmounts(prev => ({
      ...prev,
      [programId]: parseFloat(value) || 0
    }));
  };

  const getTotalDistribution = () => {
    return Object.values(distributionAmounts).reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0);
  };

  const handleSubmitDistribution = async () => {
    if (!selectedSession) return;
    setError('');
    setSuccess('');

    const distributions = Object.entries(distributionAmounts)
      .filter(([_, amount]) => amount > 0)
      .map(([programId, amount]) => ({
        programId: parseInt(programId),
        amount: parseFloat(amount)
      }));

    if (distributions.length === 0) {
      setError('Please enter at least one distribution amount');
      return;
    }

    try {
      const response = await fetch(`/api/cashbox/sessions/${selectedSession.id}/distribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          distributions,
          distributedBy: user?.name || 'admin'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to distribute profit');
      }

      setSuccess('Profit distributed successfully!');
      setShowDistributeModal(false);
      setSelectedSession(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchSessionDistributions = async (sessionId) => {
    try {
      const response = await fetch(`/api/cashbox/sessions/${sessionId}/distributions`);
      const data = await response.json();
      if (response.ok) {
        setSessionDistributions(prev => ({ ...prev, [sessionId]: data }));
      }
    } catch (err) {
      console.error('Failed to fetch distributions:', err);
    }
  };

  // CashApp withdrawal handler
  const handleCashAppWithdraw = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (amount > cashAppBalance) {
      setError('Amount exceeds available balance');
      return;
    }

    try {
      const response = await fetch('/api/cashapp/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          notes: 'Manual withdrawal',
          withdrawnBy: user?.name || 'admin'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to withdraw');
      }

      setSuccess(`Withdrew ${formatCurrency(amount)} from CashApp. New balance: ${formatCurrency(data.newBalance)}`);
      setCashAppBalance(data.newBalance);
      setWithdrawAmount('');
      setShowWithdrawModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  // Loss handlers
  const handleAddLoss = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const amount = parseFloat(lossFormData.amount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      const response = await fetch('/api/losses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: lossFormData.sessionId || null,
          programId: lossFormData.programId || null,
          lossType: lossFormData.lossType,
          amount,
          description: lossFormData.description,
          recordedBy: user?.name || 'admin'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record loss');
      }

      setSuccess('Loss recorded successfully');
      setShowAddLossForm(false);
      setLossFormData({
        sessionId: '',
        programId: '',
        lossType: 'spoilage',
        amount: '',
        description: ''
      });
      fetchLosses();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteLoss = async (lossId) => {
    if (!window.confirm('Are you sure you want to delete this loss record?')) return;

    try {
      const response = await fetch(`/api/losses/${lossId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete loss');
      }

      setSuccess('Loss record deleted');
      fetchLosses();
    } catch (err) {
      setError(err.message);
    }
  };

  const getLossTypeLabel = (type) => {
    const labels = {
      'cash_discrepancy': 'Cash Discrepancy',
      'inventory_discrepancy': 'Inventory Discrepancy',
      'spoilage': 'Spoilage',
      'other': 'Other'
    };
    return labels[type] || type;
  };

  // Report handlers
  const fetchReportSummary = async () => {
    setLoadingReport(true);
    try {
      let url = '/api/reports/summary';
      const params = new URLSearchParams();
      if (reportStartDate) params.append('startDate', reportStartDate);
      if (reportEndDate) params.append('endDate', reportEndDate);
      if (params.toString()) url += '?' + params.toString();

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setReportSummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch report summary:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  const downloadReport = (reportType) => {
    let url = `/api/reports/${reportType}?format=csv`;
    if (reportStartDate) url += `&startDate=${reportStartDate}`;
    if (reportEndDate) url += `&endDate=${reportEndDate}`;
    window.open(url, '_blank');
  };

  // Get sellable menu items (excludes composites - they need ingredients, not direct purchase)
  const getSellableMenuItems = () => {
    const items = [];
    menuItems.forEach(item => {
      if (item.price !== null && item.active && !item.is_supply && !item.is_composite) {
        items.push(item);
      }
      if (item.subItems) {
        item.subItems.forEach(sub => {
          if (sub.price !== null && sub.active && !sub.is_supply && !sub.is_composite) {
            items.push(sub);
          }
        });
      }
    });
    return items;
  };

  // Get all items including supplies for purchase entry (excludes composites)
  const getAllPurchaseItems = () => {
    const sellableItems = [];
    const supplyItems = [];
    menuItems.forEach(item => {
      if (item.is_supply) {
        supplyItems.push({ ...item, category: 'supply' });
      } else if (item.price !== null && item.active && !item.is_composite) {
        sellableItems.push({ ...item, category: 'sellable' });
      }
      if (item.subItems) {
        item.subItems.forEach(sub => {
          if (sub.is_supply) {
            supplyItems.push({ ...sub, category: 'supply' });
          } else if (sub.price !== null && sub.active && !sub.is_composite) {
            sellableItems.push({ ...sub, category: 'sellable' });
          }
        });
      }
    });
    return { sellableItems, supplyItems, all: [...sellableItems, ...supplyItems] };
  };

  // Inventory handlers
  const handleViewLots = (item) => {
    setSelectedInventoryItem(item);
    fetchInventoryLots(item.id);
  };

  const handleCloseLotsView = () => {
    setSelectedInventoryItem(null);
    setInventoryLots([]);
  };

  const handleOpenAdjustment = (item) => {
    setSelectedInventoryItem(item);
    setShowAdjustmentForm(true);
    setAdjustmentData({
      adjustmentType: 'lost',
      quantity: '',
      notes: ''
    });
  };

  const handleCloseAdjustment = () => {
    setShowAdjustmentForm(false);
    setSelectedInventoryItem(null);
    setAdjustmentData({
      adjustmentType: 'lost',
      quantity: '',
      notes: ''
    });
  };

  const handleSubmitAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedInventoryItem) return;

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/inventory/${selectedInventoryItem.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustmentType: adjustmentData.adjustmentType,
          quantity: adjustmentData.adjustmentType === 'count_adjustment'
            ? parseInt(adjustmentData.quantity)
            : -Math.abs(parseInt(adjustmentData.quantity)),
          notes: adjustmentData.notes,
          createdBy: user?.name || 'admin'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to adjust inventory');
      }

      setSuccess(`Inventory adjusted: ${data.adjustmentType} - ${Math.abs(data.quantityChange)} units`);
      handleCloseAdjustment();
      fetchInventory();
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

  // Navigation helper
  const navigateTo = (section, subSection = null) => {
    setActiveSection(section);
    setActiveSubSection(subSection);
    // Map to legacy tabs for content rendering
    const tabMap = {
      'dashboard': 'sessions',
      'sessions-active': 'sessions',
      'sessions-history': 'history',
      'inventory-stock': 'inventory',
      'inventory-lots': 'inventory',
      'inventory-movements': 'inventory',
      'inventory-count': 'inventory',
      'purchases-history': 'purchases',
      'purchases-new': 'purchases',
      'purchases-stock': 'purchases',
      'programs-list': 'programs',
      'programs-earnings': 'earnings',
      'programs-charges': 'programs',
      'financials-cashbox': 'payments',
      'financials-cashapp': 'payments',
      'financials-reimbursement': 'payments',
      'financials-losses': 'losses',
      'menu': 'menu',
      'reports': 'reports'
    };
    const key = subSection ? `${section}-${subSection}` : section;
    if (tabMap[key]) {
      setActiveTab(tabMap[key]);
    }
    if (section === 'reports') {
      fetchReportSummary();
    }
    if (section === 'inventory' && subSection === 'movements') {
      fetchInventoryTransactions();
    }
    if (section === 'programs' && subSection === 'charges') {
      fetchProgramCharges();
    }
    if (section === 'financials' && subSection === 'reimbursement') {
      fetchReimbursementData();
    }
  };

  // Sidebar section configuration
  const sidebarSections = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    {
      id: 'sessions',
      label: 'Sessions',
      icon: '🎫',
      subItems: [
        { id: 'active', label: 'Active Sessions' },
        { id: 'history', label: 'Session History' }
      ]
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: '📦',
      subItems: [
        { id: 'stock', label: 'Current Stock' },
        { id: 'lots', label: 'Lot Tracking' },
        { id: 'movements', label: 'Movements' },
        { id: 'count', label: 'Inventory Count' }
      ]
    },
    {
      id: 'purchases',
      label: 'Purchases',
      icon: '🧾',
      subItems: [
        { id: 'history', label: 'Purchase History' },
        { id: 'new', label: 'Enter Purchase' },
        { id: 'stock', label: 'Stock Update' }
      ]
    },
    {
      id: 'programs',
      label: 'Programs',
      icon: '🏷️',
      subItems: [
        { id: 'list', label: 'List & Balances' },
        { id: 'earnings', label: 'Earnings' },
        { id: 'charges', label: 'Charges' }
      ]
    },
    {
      id: 'financials',
      label: 'Financials',
      icon: '💰',
      subItems: [
        { id: 'cashbox', label: 'Main Cashbox' },
        { id: 'cashapp', label: 'CashApp' },
        { id: 'reimbursement', label: 'Reimbursement' },
        { id: 'losses', label: 'Losses' }
      ]
    },
    { id: 'menu', label: 'Menu', icon: '🍔' },
    { id: 'reports', label: 'Reports', icon: '📈' }
  ];

  // Check if a section is expanded
  const isSectionExpanded = (sectionId) => {
    return activeSection === sectionId;
  };

  return (
    <div>
      <Navbar user={user} onLogout={onLogout} />
      <div className="cashbox-layout">
        {/* Sidebar */}
        <div className={`cashbox-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-header">
            <h2 style={{ color: '#22c55e', fontSize: '16px', margin: 0 }}>
              {!sidebarCollapsed && 'Concessions'}
            </h2>
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{ background: 'none', border: 'none', color: '#4a7c59', cursor: 'pointer', fontSize: '16px' }}
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
          </div>

          <nav className="sidebar-nav">
            {sidebarSections.map(section => (
              <div key={section.id} className="sidebar-section">
                <button
                  className={`sidebar-item ${activeSection === section.id ? 'active' : ''}`}
                  onClick={() => {
                    if (section.subItems) {
                      if (activeSection === section.id) {
                        // Already on this section, toggle or go to first sub
                        navigateTo(section.id, section.subItems[0].id);
                      } else {
                        navigateTo(section.id, section.subItems[0].id);
                      }
                    } else {
                      navigateTo(section.id);
                    }
                  }}
                >
                  <span className="sidebar-icon">{section.icon}</span>
                  {!sidebarCollapsed && <span className="sidebar-label">{section.label}</span>}
                </button>

                {/* Sub-items */}
                {!sidebarCollapsed && section.subItems && isSectionExpanded(section.id) && (
                  <div className="sidebar-subitems">
                    {section.subItems.map(sub => (
                      <button
                        key={sub.id}
                        className={`sidebar-subitem ${activeSubSection === sub.id ? 'active' : ''}`}
                        onClick={() => navigateTo(section.id, sub.id)}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Main Content */}
        <div className="cashbox-main">
          {error && <div className="card"><div className="error-message">{error}</div></div>}
          {success && <div className="card"><div className="success-message">{success}</div></div>}

          {/* Dashboard Section */}
          {activeSection === 'dashboard' && (
            <div>
              <h1 className="page-title">Concessions Dashboard</h1>

              {/* Quick Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="card" style={{ textAlign: 'center' }}>
                  <p style={{ color: '#4a7c59', fontSize: '12px', margin: '0 0 4px 0' }}>Main Cashbox</p>
                  <p style={{ color: '#22c55e', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                    {formatCurrency(cashbox?.totalValue || 0)}
                  </p>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <p style={{ color: '#4a7c59', fontSize: '12px', margin: '0 0 4px 0' }}>Active Sessions</p>
                  <p style={{ color: '#22c55e', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                    {sessions.filter(s => s.status === 'active').length}
                  </p>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <p style={{ color: '#4a7c59', fontSize: '12px', margin: '0 0 4px 0' }}>CashApp Balance</p>
                  <p style={{ color: '#00D632', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                    {formatCurrency(cashAppBalance)}
                  </p>
                </div>
                <div className="card" style={{ textAlign: 'center' }}>
                  <p style={{ color: '#4a7c59', fontSize: '12px', margin: '0 0 4px 0' }}>Low Stock Items</p>
                  <p style={{ color: inventoryItems.filter(i => i.quantity_on_hand <= 5 && i.quantity_on_hand > 0).length > 0 ? '#eab308' : '#22c55e', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                    {inventoryItems.filter(i => i.quantity_on_hand <= 5 && i.quantity_on_hand > 0).length}
                  </p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="card">
                <h2 style={{ color: '#22c55e', fontSize: '16px', marginBottom: '16px' }}>Quick Actions</h2>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => navigateTo('sessions', 'active')}>
                    New Session
                  </button>
                  <button className="btn" onClick={() => navigateTo('purchases', 'new')}>
                    Enter Purchase
                  </button>
                  <button className="btn" onClick={() => navigateTo('inventory', 'count')}>
                    Inventory Count
                  </button>
                  <button className="btn" onClick={() => navigateTo('reports')}>
                    View Reports
                  </button>
                </div>
              </div>

              {/* Active Sessions */}
              {sessions.filter(s => s.status === 'active').length > 0 && (
                <div className="card" style={{ marginTop: '16px' }}>
                  <h2 style={{ color: '#22c55e', fontSize: '16px', marginBottom: '16px' }}>Active Sessions</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sessions.filter(s => s.status === 'active').map(session => (
                      <div key={session.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#1a1a1a',
                        padding: '12px',
                        borderRadius: '8px'
                      }}>
                        <div>
                          <p style={{ color: '#22c55e', margin: 0, fontWeight: 'bold' }}>{session.name}</p>
                          <p style={{ color: '#4a7c59', margin: 0, fontSize: '12px' }}>{session.program_name}</p>
                        </div>
                        <button
                          className="btn btn-small btn-primary"
                          onClick={() => navigate(`/cashbox/session/${session.id}`)}
                        >
                          Open POS
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Low Stock Alert */}
              {inventoryItems.filter(i => i.quantity_on_hand <= 5 && i.quantity_on_hand > 0).length > 0 && (
                <div className="card" style={{ marginTop: '16px', borderLeft: '4px solid #eab308' }}>
                  <h2 style={{ color: '#eab308', fontSize: '16px', marginBottom: '12px' }}>Low Stock Alert</h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {inventoryItems.filter(i => i.quantity_on_hand <= 5 && i.quantity_on_hand > 0).map(item => (
                      <span key={item.id} style={{
                        background: '#eab30822',
                        color: '#eab308',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '13px'
                      }}>
                        {item.name}: {item.quantity_on_hand} left
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Financials - Cashbox SubSection */}
          {activeSection === 'financials' && activeSubSection === 'cashbox' && cashbox && (
            <div>
              <h1 className="page-title">Main Cashbox</h1>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '18px', color: '#22c55e' }}>Cash Denominations</h2>
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
            </div>
          )}

          {/* Sessions - Active (Create + Active Sessions) */}
          {activeSection === 'sessions' && activeSubSection === 'active' && (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-end', paddingBottom: '4px' }}>
                  <input
                    type="checkbox"
                    id="practiceMode"
                    checked={isTestSession}
                    onChange={(e) => setIsTestSession(e.target.checked)}
                    style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                  />
                  <label htmlFor="practiceMode" style={{ color: isTestSession ? '#eab308' : '#4a7c59', cursor: 'pointer', fontSize: '14px' }}>
                    Practice Mode
                  </label>
                </div>
                <button
                  type="submit"
                  className={`btn ${isTestSession ? '' : 'btn-primary'}`}
                  disabled={creatingSession}
                  style={{ alignSelf: 'flex-end', background: isTestSession ? '#eab308' : undefined }}
                >
                  {creatingSession ? 'Creating...' : isTestSession ? 'Create Practice' : 'Create Session'}
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
                    Created: {formatDateTime(session.created_at)}
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

          {/* Programs - List & Balances */}
          {activeSection === 'programs' && activeSubSection === 'list' && (
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
                            {formatDateTime(entry.created_at)}
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

          {/* Programs - Earnings */}
          {activeSection === 'programs' && activeSubSection === 'earnings' && (
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

          {/* Menu Section */}
          {activeSection === 'menu' && (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: newItemPrice ? 'pointer' : 'not-allowed', opacity: newItemPrice ? 1 : 0.5 }}>
                    <input
                      type="checkbox"
                      checked={newItemNeedsIngredients}
                      onChange={(e) => setNewItemNeedsIngredients(e.target.checked)}
                      disabled={!newItemPrice}
                    />
                    <span style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>Needs ingredients</span>
                  </label>
                  {newItemNeedsIngredients && newItemPrice && (
                    <small style={{ color: '#9ca3af', fontSize: '11px' }}>
                      (configure after adding)
                    </small>
                  )}
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
                {menuItems.map((item, index) => (
                  <div key={item.id} style={{ position: 'relative', marginBottom: '8px' }}>
                    {/* Drop indicator before item */}
                    {dropIndicator?.itemId === item.id && dropIndicator?.position === 'before' && dropIndicator?.parentId === null && (
                      <div style={{
                        height: '4px',
                        background: '#22c55e',
                        borderRadius: '2px',
                        marginBottom: '4px',
                        boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)'
                      }} />
                    )}
                    <div
                      draggable={editingMenuItemId !== item.id}
                      onDragStart={(e) => handleDragStart(e, item, null)}
                      onDragOver={(e) => handleDragOver(e, item, null)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, item, null)}
                      onDragEnd={handleDragEnd}
                      style={{
                        background: dropIndicator?.itemId === item.id && dropIndicator?.position === 'into' ? '#2a4a2a' : '#1a1a1a',
                        padding: '12px',
                        borderRadius: '8px',
                        cursor: editingMenuItemId === item.id ? 'default' : 'grab',
                        opacity: draggedItem?.id === item.id ? 0.5 : 1,
                        border: dropIndicator?.itemId === item.id && dropIndicator?.position === 'into' ? '2px dashed #22c55e' : '2px solid transparent',
                        transition: 'background 0.15s ease, border 0.15s ease'
                      }}
                    >
                    {editingMenuItemId === item.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                        </div>
                        {item.price !== null && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <label style={{ color: '#4a7c59', fontSize: '12px' }}>Unit Cost:</label>
                            <input
                              type="number"
                              className="input"
                              step="0.01"
                              min="0"
                              value={editMenuItemUnitCost}
                              onChange={(e) => setEditMenuItemUnitCost(e.target.value)}
                              placeholder="0.00"
                              style={{ width: '80px' }}
                            />
                            <label style={{ color: '#4a7c59', fontSize: '12px', marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="checkbox"
                                checked={editMenuItemTrackInventory}
                                onChange={(e) => setEditMenuItemTrackInventory(e.target.checked)}
                              />
                              Track Inventory
                            </label>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px' }}>
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
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#4a7c59', cursor: 'grab' }}>☰</span>
                          <strong style={{ color: item.active ? '#22c55e' : '#666' }}>
                            {item.name}
                          </strong>
                          {item.price !== null && (
                            <>
                              <span style={{ color: '#4ade80', marginLeft: '12px' }}>
                                {formatCurrency(item.price)}
                              </span>
                              {item.unit_cost > 0 && (
                                <span style={{ color: '#6b7280', marginLeft: '6px', fontSize: '11px' }}>
                                  (cost: {formatCurrency(item.unit_cost)})
                                </span>
                              )}
                              {item.is_composite === 1 && (
                                <span style={{
                                  color: '#f59e0b',
                                  marginLeft: '8px',
                                  fontSize: '11px',
                                  background: 'rgba(245, 158, 11, 0.15)',
                                  padding: '2px 6px',
                                  borderRadius: '4px'
                                }}>
                                  Composite ({item.components?.length || 0})
                                </span>
                              )}
                              {item.track_inventory === 0 && (
                                <span style={{
                                  color: '#9ca3af',
                                  marginLeft: '8px',
                                  fontSize: '10px',
                                  fontStyle: 'italic'
                                }}>
                                  (no tracking)
                                </span>
                              )}
                              {item.track_inventory !== 0 && item.quantity_on_hand !== undefined && item.quantity_on_hand !== null && (
                                <span style={{
                                  color: item.quantity_on_hand <= 5 ? '#ef4444' : '#6b7280',
                                  marginLeft: '8px',
                                  fontSize: '11px'
                                }}>
                                  Stock: {item.quantity_on_hand}
                                </span>
                              )}
                            </>
                          )}
                          {item.price === null && (
                            <>
                              <span style={{ color: '#4a7c59', marginLeft: '12px', fontSize: '12px' }}>
                                (Category - {item.subItems?.length || 0} items)
                              </span>
                              {item.subItems && item.subItems.length > 0 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleCategoryCollapse(item.id); }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#4ade80',
                                    cursor: 'pointer',
                                    marginLeft: '8px',
                                    fontSize: '14px',
                                    padding: '2px 6px'
                                  }}
                                  title={collapsedCategories.has(item.id) ? 'Expand' : 'Collapse'}
                                >
                                  {collapsedCategories.has(item.id) ? '▶' : '▼'}
                                </button>
                              )}
                            </>
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
                          {item.price !== null && (
                            <button
                              className="btn btn-small"
                              onClick={() => openCompositeEditor(item)}
                              style={{ background: item.is_composite ? '#f59e0b' : '#4a5568' }}
                              title={item.is_composite ? 'Edit composite components' : 'Make this a composite item'}
                            >
                              Components
                            </button>
                          )}
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
                    {item.subItems && item.subItems.length > 0 && !collapsedCategories.has(item.id) && (
                      <div style={{ marginTop: '8px', paddingLeft: '20px' }}>
                        {item.subItems.map((sub, subIndex) => (
                          <div key={sub.id} style={{ position: 'relative' }}>
                            {/* Drop indicator before sub-item */}
                            {dropIndicator?.itemId === sub.id && dropIndicator?.position === 'before' && dropIndicator?.parentId === item.id && (
                              <div style={{
                                height: '3px',
                                background: '#22c55e',
                                borderRadius: '2px',
                                marginBottom: '2px',
                                boxShadow: '0 0 6px rgba(34, 197, 94, 0.5)'
                              }} />
                            )}
                            <div
                              draggable={editingMenuItemId !== sub.id}
                              onDragStart={(e) => handleDragStart(e, sub, item.id)}
                              onDragOver={(e) => handleDragOver(e, sub, item.id)}
                              onDragLeave={handleDragLeave}
                              onDrop={(e) => handleDrop(e, sub, item.id)}
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
                                background: 'transparent',
                                borderRadius: '4px',
                                transition: 'background 0.15s ease'
                              }}
                            >
                            {editingMenuItemId === sub.id ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                                </div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <label style={{ color: '#4a7c59', fontSize: '11px' }}>Cost:</label>
                                  <input
                                    type="number"
                                    className="input"
                                    step="0.01"
                                    min="0"
                                    value={editMenuItemUnitCost}
                                    onChange={(e) => setEditMenuItemUnitCost(e.target.value)}
                                    placeholder="0.00"
                                    style={{ width: '70px', padding: '4px' }}
                                  />
                                  <label style={{ color: '#4a7c59', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <input
                                      type="checkbox"
                                      checked={editMenuItemTrackInventory}
                                      onChange={(e) => setEditMenuItemTrackInventory(e.target.checked)}
                                    />
                                    Track
                                  </label>
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
                              </div>
                            ) : (
                              <>
                                <span style={{ color: sub.active ? '#4ade80' : '#666', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ color: '#4a7c59', cursor: 'grab', fontSize: '12px' }}>☰</span>
                                  {sub.name} - {formatCurrency(sub.price)}
                                  {sub.unit_cost > 0 && (
                                    <span style={{ color: '#6b7280', fontSize: '10px' }}>
                                      (cost: {formatCurrency(sub.unit_cost)})
                                    </span>
                                  )}
                                  {sub.is_composite === 1 && (
                                    <span style={{
                                      color: '#f59e0b',
                                      fontSize: '10px',
                                      background: 'rgba(245, 158, 11, 0.15)',
                                      padding: '1px 4px',
                                      borderRadius: '3px'
                                    }}>
                                      Composite ({sub.components?.length || 0})
                                    </span>
                                  )}
                                  {sub.track_inventory === 0 && (
                                    <span style={{ color: '#9ca3af', fontSize: '9px', fontStyle: 'italic' }}>
                                      (no track)
                                    </span>
                                  )}
                                  {sub.track_inventory !== 0 && sub.quantity_on_hand !== undefined && sub.quantity_on_hand !== null && (
                                    <span style={{
                                      color: sub.quantity_on_hand <= 5 ? '#ef4444' : '#6b7280',
                                      fontSize: '10px'
                                    }}>
                                      Stock: {sub.quantity_on_hand}
                                    </span>
                                  )}
                                  {!sub.active && <span style={{ color: '#666', marginLeft: '8px' }}>(Inactive)</span>}
                                </span>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  <button
                                    className="btn btn-small"
                                    onClick={() => startEditingMenuItem(sub)}
                                    style={{ padding: '4px 8px', fontSize: '12px' }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="btn btn-small"
                                    onClick={() => openCompositeEditor(sub)}
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '12px',
                                      background: sub.is_composite ? '#f59e0b' : '#4a5568'
                                    }}
                                    title={sub.is_composite ? 'Edit components' : 'Make composite'}
                                  >
                                    Components
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
                            {/* Drop indicator after sub-item */}
                            {dropIndicator?.itemId === sub.id && dropIndicator?.position === 'after' && dropIndicator?.parentId === item.id && (
                              <div style={{
                                height: '3px',
                                background: '#22c55e',
                                borderRadius: '2px',
                                marginTop: '2px',
                                boxShadow: '0 0 6px rgba(34, 197, 94, 0.5)'
                              }} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    </div>
                    {/* Drop indicator after top-level item */}
                    {dropIndicator?.itemId === item.id && dropIndicator?.position === 'after' && dropIndicator?.parentId === null && (
                      <div style={{
                        height: '4px',
                        background: '#22c55e',
                        borderRadius: '2px',
                        marginTop: '4px',
                        marginBottom: '4px',
                        boxShadow: '0 0 8px rgba(34, 197, 94, 0.5)'
                      }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Composite Item Editor Modal */}
        {editingCompositeItem && (
          <div className="modal-overlay" onClick={closeCompositeEditor}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}
            >
              <h2 style={{ marginBottom: '16px', color: '#22c55e' }}>
                Edit Components: {editingCompositeItem.name}
              </h2>

              {loadingComponents ? (
                <p style={{ textAlign: 'center', color: '#4a7c59' }}>Loading components...</p>
              ) : (
                <>
                  <p style={{ color: '#4a7c59', fontSize: '13px', marginBottom: '16px' }}>
                    A composite item is made up of other items. When sold, inventory is deducted from its components.
                    <br />
                    Example: Hot Dog = 1 Bun + 1 Wiener
                  </p>

                  {/* Current Components */}
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ color: '#4ade80', marginBottom: '12px', fontSize: '15px' }}>
                      Current Components
                    </h3>
                    {compositeComponents.length === 0 ? (
                      <p style={{ color: '#666', fontSize: '13px' }}>
                        No components yet. This item is not composite.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {compositeComponents.map((comp) => (
                          <div
                            key={comp.componentItemId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '10px',
                              background: '#1a1a1a',
                              borderRadius: '6px'
                            }}
                          >
                            <span style={{ flex: 1, color: '#4ade80' }}>
                              {comp.componentName}
                            </span>
                            <input
                              type="number"
                              className="input"
                              step="0.25"
                              min="0.25"
                              value={comp.quantity}
                              onChange={(e) => updateComponentQuantity(comp.componentItemId, e.target.value)}
                              style={{ width: '80px', padding: '6px' }}
                            />
                            <button
                              className="btn btn-danger btn-small"
                              onClick={() => removeComponent(comp.componentItemId)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Component */}
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ color: '#4ade80', marginBottom: '12px', fontSize: '15px' }}>
                      Add Component
                    </h3>
                    {availableComponents.length === 0 ? (
                      <p style={{ color: '#666', fontSize: '13px' }}>
                        No available items to add as components.
                      </p>
                    ) : (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                        gap: '8px'
                      }}>
                        {availableComponents
                          .filter(item => !compositeComponents.find(c => c.componentItemId === item.id))
                          .map((item) => (
                            <button
                              key={item.id}
                              className="btn btn-small"
                              onClick={() => addComponent(item)}
                              style={{
                                background: '#2a2a2a',
                                padding: '8px 12px',
                                textAlign: 'left'
                              }}
                            >
                              + {item.name}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                      className="btn"
                      onClick={closeCompositeEditor}
                      style={{ background: '#666' }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={saveCompositeComponents}
                    >
                      Save Components
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

          {/* Purchases - History & New */}
          {activeSection === 'purchases' && (activeSubSection === 'history' || activeSubSection === 'new') && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', color: '#22c55e', margin: 0 }}>
                Purchase Entry & Stock Updates
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowPurchaseForm(true)}
                >
                  + New Purchase
                </button>
                <button
                  className="btn"
                  onClick={() => setShowStockUpdateForm(true)}
                  style={{ background: '#4a7c59' }}
                >
                  + Stock Update
                </button>
              </div>
            </div>

            <p style={{ color: '#4a7c59', fontSize: '13px', marginBottom: '16px' }}>
              <strong>New Purchase:</strong> Enter receipts with tax/fees - costs are distributed to calculate true unit costs (reimbursable).<br />
              <strong>Stock Update:</strong> Manual inventory additions without receipts (non-reimbursable).
            </p>

            {/* Purchase History */}
            <h3 style={{ marginBottom: '12px', fontSize: '16px', color: '#4ade80' }}>
              Recent Purchases
            </h3>
            {purchases.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#4a7c59' }}>No purchases yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Vendor</th>
                      <th>Items</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map((purchase) => (
                      <tr key={purchase.id}>
                        <td style={{ fontSize: '13px' }}>{purchase.purchase_date}</td>
                        <td>{purchase.vendor || '-'}</td>
                        <td>{purchase.item_count} item(s)</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#22c55e' }}>
                          {formatCurrency(purchase.total)}
                        </td>
                        <td>
                          <button
                            className="btn btn-danger btn-small"
                            onClick={() => handleDeletePurchase(purchase.id)}
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Purchase Form Modal */}
        {showPurchaseForm && (
          <div className="pos-modal-overlay" onClick={resetPurchaseForm}>
            <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
              <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>New Purchase Entry</h3>

              <form onSubmit={handleSubmitPurchase}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label>Vendor</label>
                    <input
                      type="text"
                      className="input"
                      value={purchaseFormData.vendor}
                      onChange={(e) => setPurchaseFormData(prev => ({ ...prev, vendor: e.target.value }))}
                      placeholder="e.g., Costco"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label>Purchase Date</label>
                    <input
                      type="date"
                      className="input"
                      value={purchaseFormData.purchaseDate}
                      onChange={(e) => setPurchaseFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <h4 style={{ color: '#4ade80', marginBottom: '8px' }}>Line Items</h4>
                {purchaseFormData.items.map((item, index) => (
                  <div key={index} style={{
                    background: '#1a1a1a',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      {/* Searchable Item Dropdown */}
                      <div className="form-group" style={{ flex: 3, minWidth: '200px', marginBottom: 0, position: 'relative' }}>
                        <label>Link to Inventory Item</label>
                        {item.menuItemId ? (
                          // Selected item display
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#2a2a2a',
                            border: '1px solid #4ade80',
                            borderRadius: '4px',
                            padding: '8px 12px'
                          }}>
                            <span style={{ flex: 1, color: '#fff' }}>
                              {item.itemName || getAllPurchaseItems().all.find(m => m.id === parseInt(item.menuItemId))?.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleClearPurchaseItemLink(index)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#9ca3af',
                                cursor: 'pointer',
                                padding: '2px 6px'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          // Search input with dropdown
                          <>
                            <input
                              type="text"
                              className="input"
                              value={purchaseItemSearchQueries[index] || ''}
                              onChange={(e) => {
                                setPurchaseItemSearchQueries(prev => ({ ...prev, [index]: e.target.value }));
                                setPurchaseItemDropdownOpen(index);
                              }}
                              onFocus={() => setPurchaseItemDropdownOpen(index)}
                              placeholder="Search or type item name..."
                            />
                            {purchaseItemDropdownOpen === index && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                background: '#1a1a1a',
                                border: '1px solid #333',
                                borderRadius: '4px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                zIndex: 100,
                                marginTop: '4px'
                              }}>
                                {(() => {
                                  const { sellableItems, supplyItems } = getFilteredPurchaseItems(purchaseItemSearchQueries[index]);
                                  const hasResults = sellableItems.length > 0 || supplyItems.length > 0;
                                  const searchQuery = purchaseItemSearchQueries[index] || '';

                                  return (
                                    <>
                                      {sellableItems.length > 0 && (
                                        <>
                                          <div style={{ padding: '6px 12px', color: '#9ca3af', fontSize: '11px', borderBottom: '1px solid #333' }}>
                                            MENU ITEMS
                                          </div>
                                          {sellableItems.map(mi => (
                                            <div
                                              key={mi.id}
                                              onClick={() => handleSelectPurchaseItem(index, mi)}
                                              style={{
                                                padding: '8px 12px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #222'
                                              }}
                                              onMouseEnter={(e) => e.target.style.background = '#2a2a2a'}
                                              onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                            >
                                              {mi.name}
                                            </div>
                                          ))}
                                        </>
                                      )}
                                      {supplyItems.length > 0 && (
                                        <>
                                          <div style={{ padding: '6px 12px', color: '#9ca3af', fontSize: '11px', borderBottom: '1px solid #333' }}>
                                            SUPPLIES
                                          </div>
                                          {supplyItems.map(mi => (
                                            <div
                                              key={mi.id}
                                              onClick={() => handleSelectPurchaseItem(index, mi)}
                                              style={{
                                                padding: '8px 12px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid #222',
                                                color: '#9ca3af'
                                              }}
                                              onMouseEnter={(e) => e.target.style.background = '#2a2a2a'}
                                              onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                            >
                                              {mi.name} <span style={{ fontSize: '10px' }}>(supply)</span>
                                            </div>
                                          ))}
                                        </>
                                      )}
                                      {/* Create new option */}
                                      <div
                                        onClick={() => openQuickCreateModal(index, searchQuery)}
                                        style={{
                                          padding: '8px 12px',
                                          cursor: 'pointer',
                                          color: '#4ade80',
                                          borderTop: hasResults ? '1px solid #333' : 'none'
                                        }}
                                        onMouseEnter={(e) => e.target.style.background = '#2a2a2a'}
                                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                      >
                                        + Create "{searchQuery || 'new item'}"
                                      </div>
                                      {/* Use without linking */}
                                      {searchQuery && (
                                        <div
                                          onClick={() => {
                                            handlePurchaseItemChange(index, 'itemName', searchQuery);
                                            setPurchaseItemSearchQueries(prev => ({ ...prev, [index]: '' }));
                                            setPurchaseItemDropdownOpen(null);
                                          }}
                                          style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            color: '#9ca3af',
                                            fontSize: '12px'
                                          }}
                                          onMouseEnter={(e) => e.target.style.background = '#2a2a2a'}
                                          onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                        >
                                          Use "{searchQuery}" without linking
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                          </>
                        )}
                        {/* Show unlinked item name if set */}
                        {!item.menuItemId && item.itemName && (
                          <div style={{ marginTop: '4px', fontSize: '11px', color: '#eab308' }}>
                            ⚠ Not linked: {item.itemName}
                          </div>
                        )}
                      </div>
                      <div className="form-group" style={{ flex: 1, minWidth: '70px', marginBottom: 0 }}>
                        <label>Qty</label>
                        <input
                          type="number"
                          className="input"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handlePurchaseItemChange(index, 'quantity', e.target.value)}
                          placeholder="12"
                          required
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1, minWidth: '80px', marginBottom: 0 }}>
                        <label>Line Total</label>
                        <input
                          type="number"
                          className="input"
                          step="0.01"
                          min="0"
                          value={item.lineTotal}
                          onChange={(e) => handlePurchaseItemChange(index, 'lineTotal', e.target.value)}
                          placeholder="5.99"
                          required
                        />
                      </div>
                      {purchaseFormData.items.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-danger btn-small"
                          onClick={() => removePurchaseItem(index)}
                          style={{ padding: '6px 10px' }}
                        >
                          X
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn btn-small"
                  onClick={addPurchaseItem}
                  style={{ marginBottom: '16px' }}
                >
                  + Add Item
                </button>

                <h4 style={{ color: '#4ade80', marginBottom: '8px' }}>Overhead Costs</h4>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: '100px', marginBottom: 0 }}>
                    <label>Tax</label>
                    <input
                      type="number"
                      className="input"
                      step="0.01"
                      min="0"
                      value={purchaseFormData.tax}
                      onChange={(e) => setPurchaseFormData(prev => ({ ...prev, tax: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: '100px', marginBottom: 0 }}>
                    <label>Delivery Fee</label>
                    <input
                      type="number"
                      className="input"
                      step="0.01"
                      min="0"
                      value={purchaseFormData.deliveryFee}
                      onChange={(e) => setPurchaseFormData(prev => ({ ...prev, deliveryFee: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: '100px', marginBottom: 0 }}>
                    <label>Other Fees</label>
                    <input
                      type="number"
                      className="input"
                      step="0.01"
                      min="0"
                      value={purchaseFormData.otherFees}
                      onChange={(e) => setPurchaseFormData(prev => ({ ...prev, otherFees: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <input
                    type="text"
                    className="input"
                    value={purchaseFormData.notes}
                    onChange={(e) => setPurchaseFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional notes..."
                  />
                </div>

                {/* Purchase Summary */}
                <div style={{
                  background: '#1a1a1a',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#4a7c59' }}>Subtotal:</span>
                    <span style={{ color: '#4ade80' }}>{formatCurrency(calculatePurchaseSubtotal())}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: '#4a7c59' }}>Overhead:</span>
                    <span style={{ color: '#4ade80' }}>
                      {formatCurrency((parseFloat(purchaseFormData.tax) || 0) + (parseFloat(purchaseFormData.deliveryFee) || 0) + (parseFloat(purchaseFormData.otherFees) || 0))}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid #333', paddingTop: '8px' }}>
                    <span style={{ color: '#22c55e' }}>Total:</span>
                    <span style={{ color: '#22c55e' }}>{formatCurrency(calculatePurchaseTotal())}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn" onClick={resetPurchaseForm} style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submittingPurchase}
                    style={{ flex: 1 }}
                  >
                    {submittingPurchase ? 'Saving...' : 'Save Purchase'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quick Create Item Modal */}
        {showQuickCreateModal && (
          <div className="pos-modal-overlay" onClick={() => setShowQuickCreateModal(false)}>
            <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>Create New Item</h3>
              <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '16px' }}>
                Create a new inventory item to link to this purchase.
              </p>

              <form onSubmit={handleQuickCreateItem}>
                <div className="form-group">
                  <label>Item Name</label>
                  <input
                    type="text"
                    className="input"
                    value={quickCreateData.name}
                    onChange={(e) => setQuickCreateData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Hot Dog Buns"
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label>Item Type</label>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="itemType"
                        checked={!quickCreateData.isSupply}
                        onChange={() => setQuickCreateData(prev => ({ ...prev, isSupply: false }))}
                      />
                      <span>Sellable Item</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="itemType"
                        checked={quickCreateData.isSupply}
                        onChange={() => setQuickCreateData(prev => ({ ...prev, isSupply: true }))}
                      />
                      <span>Supply (plates, utensils, etc.)</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Unit Cost (optional)</label>
                  <input
                    type="number"
                    className="input"
                    step="0.01"
                    min="0"
                    value={quickCreateData.unitCost}
                    onChange={(e) => setQuickCreateData(prev => ({ ...prev, unitCost: e.target.value }))}
                    placeholder="0.00"
                  />
                  <small style={{ color: '#9ca3af', fontSize: '11px' }}>
                    Default cost per unit (can be overridden by purchase)
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowQuickCreateModal(false)}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    Create & Link
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Stock Update Modal */}
        {showStockUpdateForm && (
          <div className="pos-modal-overlay" onClick={resetStockUpdateForm}>
            <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>Manual Stock Update</h3>
              <p style={{ color: '#4a7c59', fontSize: '13px', marginBottom: '16px' }}>
                Add inventory without a receipt. These items are <strong>non-reimbursable</strong>.
              </p>

              <form onSubmit={handleSubmitStockUpdate}>
                <div className="form-group">
                  <label>Menu Item</label>
                  <select
                    className="input"
                    value={stockUpdateData.menuItemId}
                    onChange={(e) => setStockUpdateData(prev => ({ ...prev, menuItemId: e.target.value }))}
                    required
                  >
                    <option value="">-- Select Item --</option>
                    {getSellableMenuItems().map(mi => (
                      <option key={mi.id} value={mi.id}>{mi.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Quantity to Add</label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    value={stockUpdateData.quantity}
                    onChange={(e) => setStockUpdateData(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="e.g., 24"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Unit Cost (optional)</label>
                  <input
                    type="number"
                    className="input"
                    step="0.01"
                    min="0"
                    value={stockUpdateData.unitCost}
                    onChange={(e) => setStockUpdateData(prev => ({ ...prev, unitCost: e.target.value }))}
                    placeholder="e.g., 0.50"
                  />
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <input
                    type="text"
                    className="input"
                    value={stockUpdateData.notes}
                    onChange={(e) => setStockUpdateData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g., Donation from parent"
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn" onClick={resetStockUpdateForm} style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    Add Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

          {/* Inventory - Stock */}
          {activeSection === 'inventory' && activeSubSection === 'stock' && (
          <div className="card">
            <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>
              Inventory Levels
            </h2>
            <p style={{ color: '#4a7c59', fontSize: '13px', marginBottom: '16px' }}>
              View current inventory levels, FIFO lots, and make adjustments for lost/wasted/donated items.
            </p>

            {inventoryItems.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#4a7c59' }}>No inventory items found.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th style={{ textAlign: 'center' }}>On Hand</th>
                      <th style={{ textAlign: 'right' }}>Unit Cost</th>
                      <th style={{ textAlign: 'right' }}>Value</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryItems.filter(item => item.active).map((item) => (
                      <tr key={item.id} style={{ background: item.quantity_on_hand <= 0 ? '#2a1a1a' : 'transparent' }}>
                        <td>
                          <span style={{ color: item.quantity_on_hand <= 5 ? '#ef4444' : '#4ade80' }}>
                            {item.name}
                          </span>
                          {item.quantity_on_hand <= 5 && item.quantity_on_hand > 0 && (
                            <span style={{ color: '#f59e0b', fontSize: '11px', marginLeft: '8px' }}>LOW</span>
                          )}
                          {item.quantity_on_hand <= 0 && (
                            <span style={{ color: '#ef4444', fontSize: '11px', marginLeft: '8px' }}>OUT</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: item.quantity_on_hand <= 0 ? '#ef4444' : '#22c55e' }}>
                          {item.quantity_on_hand || 0}
                        </td>
                        <td style={{ textAlign: 'right', color: '#4a7c59' }}>
                          {formatCurrency(item.unit_cost || 0)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#4ade80' }}>
                          {formatCurrency((item.quantity_on_hand || 0) * (item.unit_cost || 0))}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              className="btn btn-small"
                              onClick={() => handleViewLots(item)}
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                            >
                              Lots
                            </button>
                            <button
                              className="btn btn-small"
                              onClick={() => handleOpenAdjustment(item)}
                              style={{ padding: '4px 8px', fontSize: '12px', background: '#4a7c59' }}
                            >
                              Adjust
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #22c55e' }}>
                      <td style={{ fontWeight: 'bold', color: '#22c55e' }}>Total Value</td>
                      <td></td>
                      <td></td>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#22c55e' }}>
                        {formatCurrency(inventoryItems.filter(i => i.active).reduce((sum, item) => sum + ((item.quantity_on_hand || 0) * (item.unit_cost || 0)), 0))}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Inventory Lots Modal */}
        {selectedInventoryItem && !showAdjustmentForm && (
          <div className="pos-modal-overlay" onClick={handleCloseLotsView}>
            <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', maxHeight: '80vh', overflow: 'auto' }}>
              <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>
                {selectedInventoryItem.name} - FIFO Lots
              </h3>
              <p style={{ color: '#4a7c59', fontSize: '13px', marginBottom: '16px' }}>
                Inventory is sold using FIFO (First In, First Out). Oldest lots are used first.
              </p>

              {inventoryLots.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#4a7c59' }}>No inventory lots found.</p>
              ) : (
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Purchase Date</th>
                      <th style={{ textAlign: 'center' }}>Remaining</th>
                      <th style={{ textAlign: 'right' }}>Unit Cost</th>
                      <th style={{ textAlign: 'center' }}>Reimb.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryLots.map((lot) => (
                      <tr key={lot.id}>
                        <td style={{ fontSize: '13px', color: '#4ade80' }}>
                          {lot.purchase_date}
                          {lot.vendor && <span style={{ color: '#4a7c59', marginLeft: '4px' }}>({lot.vendor})</span>}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                          {lot.quantity_remaining} / {lot.quantity_original}
                        </td>
                        <td style={{ textAlign: 'right', color: '#4a7c59' }}>
                          {formatCurrency(lot.unit_cost)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {lot.is_reimbursable ? (
                            <span style={{ color: '#22c55e' }}>Yes</span>
                          ) : (
                            <span style={{ color: '#f59e0b' }}>No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <button
                className="btn"
                onClick={handleCloseLotsView}
                style={{ marginTop: '16px', width: '100%' }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Inventory Adjustment Modal */}
        {showAdjustmentForm && selectedInventoryItem && (
          <div className="pos-modal-overlay" onClick={handleCloseAdjustment}>
            <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>
                Adjust: {selectedInventoryItem.name}
              </h3>
              <p style={{ color: '#4a7c59', fontSize: '13px', marginBottom: '16px' }}>
                Current on hand: <strong>{selectedInventoryItem.quantity_on_hand || 0}</strong>
              </p>

              <form onSubmit={handleSubmitAdjustment}>
                <div className="form-group">
                  <label>Adjustment Type</label>
                  <select
                    className="input"
                    value={adjustmentData.adjustmentType}
                    onChange={(e) => setAdjustmentData(prev => ({ ...prev, adjustmentType: e.target.value }))}
                    required
                  >
                    <option value="lost">Lost</option>
                    <option value="wasted">Wasted / Spoiled</option>
                    <option value="donated">Donated</option>
                    <option value="count_adjustment">Count Adjustment (+/-)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    {adjustmentData.adjustmentType === 'count_adjustment'
                      ? 'Quantity Change (+ or -)'
                      : 'Quantity to Remove'}
                  </label>
                  <input
                    type="number"
                    className="input"
                    value={adjustmentData.quantity}
                    onChange={(e) => setAdjustmentData(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder={adjustmentData.adjustmentType === 'count_adjustment' ? 'e.g., -5 or +3' : 'e.g., 5'}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <input
                    type="text"
                    className="input"
                    value={adjustmentData.notes}
                    onChange={(e) => setAdjustmentData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Reason for adjustment..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn" onClick={handleCloseAdjustment} style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    Apply Adjustment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

          {/* Inventory - Lots */}
          {activeSection === 'inventory' && activeSubSection === 'lots' && (
            <div className="card">
              <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>
                Inventory Lot Tracking (FIFO)
              </h2>
              <p style={{ color: '#4a7c59', fontSize: '13px', marginBottom: '16px' }}>
                View inventory lots by purchase date. Items are sold using First-In-First-Out costing.
              </p>

              <div className="form-group" style={{ maxWidth: '300px', marginBottom: '16px' }}>
                <label>Select Item</label>
                <select
                  className="input"
                  value={selectedInventoryItem?.id || ''}
                  onChange={(e) => {
                    const item = inventoryItems.find(i => i.id === parseInt(e.target.value));
                    setSelectedInventoryItem(item);
                    if (item) fetchInventoryLots(item.id);
                  }}
                >
                  <option value="">-- Select Item --</option>
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name} ({item.quantity_on_hand} on hand)</option>
                  ))}
                </select>
              </div>

              {selectedInventoryItem && inventoryLots.length > 0 && (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Purchase Date</th>
                        <th style={{ textAlign: 'center' }}>Original Qty</th>
                        <th style={{ textAlign: 'center' }}>Remaining</th>
                        <th style={{ textAlign: 'right' }}>Unit Cost</th>
                        <th>Reimbursable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryLots.map(lot => (
                        <tr key={lot.id}>
                          <td>{lot.purchase_date}</td>
                          <td style={{ textAlign: 'center' }}>{lot.quantity_original}</td>
                          <td style={{ textAlign: 'center', color: lot.quantity_remaining <= 0 ? '#4a7c59' : '#22c55e' }}>
                            {lot.quantity_remaining}
                          </td>
                          <td style={{ textAlign: 'right' }}>{formatCurrency(lot.unit_cost)}</td>
                          <td>
                            <span style={{ color: lot.is_reimbursable ? '#22c55e' : '#eab308' }}>
                              {lot.is_reimbursable ? 'Yes' : 'No'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedInventoryItem && inventoryLots.length === 0 && (
                <p style={{ color: '#4a7c59', textAlign: 'center' }}>No lots found for this item.</p>
              )}
            </div>
          )}

          {/* Inventory - Movements */}
          {activeSection === 'inventory' && activeSubSection === 'movements' && (
            <div className="card">
              <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>
                Inventory Movements
              </h2>
              <p style={{ color: '#4a7c59', fontSize: '13px', marginBottom: '16px' }}>
                Audit log of all inventory changes - sales, purchases, adjustments, and counts.
              </p>

              {loadingTransactions ? (
                <p style={{ color: '#4a7c59', textAlign: 'center' }}>Loading transactions...</p>
              ) : inventoryTransactions.length === 0 ? (
                <p style={{ color: '#4a7c59', textAlign: 'center' }}>No inventory movements recorded yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Item</th>
                        <th>Type</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Unit Cost</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryTransactions.map(tx => (
                        <tr key={tx.id}>
                          <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                            {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td>{tx.menu_item_name}</td>
                          <td>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              background: tx.transaction_type === 'sale' ? '#ef444433' :
                                         tx.transaction_type === 'purchase' ? '#22c55e33' :
                                         tx.transaction_type === 'stock_update' ? '#3b82f633' :
                                         '#eab30833',
                              color: tx.transaction_type === 'sale' ? '#ef4444' :
                                     tx.transaction_type === 'purchase' ? '#22c55e' :
                                     tx.transaction_type === 'stock_update' ? '#3b82f6' :
                                     '#eab308'
                            }}>
                              {tx.transaction_type}
                            </span>
                          </td>
                          <td style={{
                            textAlign: 'center',
                            color: tx.quantity_change > 0 ? '#22c55e' : '#ef4444'
                          }}>
                            {tx.quantity_change > 0 ? '+' : ''}{tx.quantity_change}
                          </td>
                          <td style={{ textAlign: 'right' }}>{formatCurrency(tx.unit_cost_at_time || 0)}</td>
                          <td style={{ fontSize: '12px', color: '#4a7c59' }}>{tx.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Inventory - Count */}
          {activeSection === 'inventory' && activeSubSection === 'count' && (
            <div>
              <h1 className="page-title">Inventory Count</h1>

              <div className="card" style={{ marginBottom: '16px' }}>
                <p style={{ color: '#4a7c59', fontSize: '13px', marginBottom: '16px' }}>
                  Enter actual quantities for each item. Discrepancies will be automatically recorded.
                </p>

                {inventoryItems.filter(i => i.price !== null).length === 0 ? (
                  <p style={{ color: '#4a7c59', textAlign: 'center' }}>No inventory items to count.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th style={{ textAlign: 'center' }}>Expected</th>
                          <th style={{ textAlign: 'center', width: '120px' }}>Actual Count</th>
                          <th style={{ textAlign: 'center' }}>Difference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryItems.filter(i => i.price !== null && i.active !== 0).map(item => {
                          const countInputId = `count-${item.id}`;
                          const inputEl = document.getElementById(countInputId);
                          const actualValue = inputEl ? parseInt(inputEl.value) : null;
                          const diff = actualValue !== null && !isNaN(actualValue) ? actualValue - (item.quantity_on_hand || 0) : null;

                          return (
                            <tr key={item.id}>
                              <td>{item.name}</td>
                              <td style={{ textAlign: 'center', color: '#4ade80' }}>{item.quantity_on_hand || 0}</td>
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  id={countInputId}
                                  type="number"
                                  className="input"
                                  min="0"
                                  placeholder="—"
                                  style={{ width: '80px', textAlign: 'center' }}
                                  defaultValue=""
                                />
                              </td>
                              <td style={{ textAlign: 'center' }}>—</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={async () => {
                      const counts = [];
                      inventoryItems.filter(i => i.price !== null && i.active !== 0).forEach(item => {
                        const inputEl = document.getElementById(`count-${item.id}`);
                        if (inputEl && inputEl.value !== '') {
                          counts.push({
                            menuItemId: item.id,
                            expectedQuantity: item.quantity_on_hand || 0,
                            actualQuantity: parseInt(inputEl.value) || 0
                          });
                        }
                      });

                      if (counts.length === 0) {
                        setError('Please enter at least one count');
                        return;
                      }

                      try {
                        const response = await fetch('/api/inventory/count', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ counts, countedBy: 'admin' })
                        });
                        const data = await response.json();
                        if (response.ok) {
                          const discrepancies = data.results.filter(r => r.discrepancy !== 0);
                          setSuccess(`Count saved! ${counts.length} items counted, ${discrepancies.length} discrepancies recorded.`);
                          fetchInventory();
                          // Clear inputs
                          inventoryItems.forEach(item => {
                            const inputEl = document.getElementById(`count-${item.id}`);
                            if (inputEl) inputEl.value = '';
                          });
                        } else {
                          setError(data.error || 'Failed to save count');
                        }
                      } catch (err) {
                        setError('Failed to save count: ' + err.message);
                      }
                    }}
                  >
                    Save Count
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      inventoryItems.forEach(item => {
                        const inputEl = document.getElementById(`count-${item.id}`);
                        if (inputEl) inputEl.value = '';
                      });
                    }}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Purchases - Stock Update */}
          {activeSection === 'purchases' && activeSubSection === 'stock' && (
            <div className="card">
              <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>
                Manual Stock Update
              </h2>
              <p style={{ color: '#4a7c59', fontSize: '13px', marginBottom: '16px' }}>
                Add inventory without a receipt. These items are marked as <strong style={{ color: '#eab308' }}>non-reimbursable</strong>.
              </p>

              <form onSubmit={handleSubmitStockUpdate} style={{ maxWidth: '400px' }}>
                <div className="form-group">
                  <label>Menu Item</label>
                  <select
                    className="input"
                    value={stockUpdateData.menuItemId}
                    onChange={(e) => setStockUpdateData(prev => ({ ...prev, menuItemId: e.target.value }))}
                    required
                  >
                    <option value="">-- Select Item --</option>
                    {getSellableMenuItems().map(mi => (
                      <option key={mi.id} value={mi.id}>{mi.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Quantity to Add</label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    value={stockUpdateData.quantity}
                    onChange={(e) => setStockUpdateData(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="e.g., 24"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Unit Cost (optional)</label>
                  <input
                    type="number"
                    className="input"
                    step="0.01"
                    min="0"
                    value={stockUpdateData.unitCost}
                    onChange={(e) => setStockUpdateData(prev => ({ ...prev, unitCost: e.target.value }))}
                    placeholder="e.g., 0.50"
                  />
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <input
                    type="text"
                    className="input"
                    value={stockUpdateData.notes}
                    onChange={(e) => setStockUpdateData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g., Donation from parent"
                  />
                </div>

                <button type="submit" className="btn btn-primary">
                  Add Stock
                </button>
              </form>
            </div>
          )}

          {/* Programs - Charges */}
          {activeSection === 'programs' && activeSubSection === 'charges' && (
            <div>
              <h1 className="page-title">Program Charges</h1>

              {loadingCharges ? (
                <div className="card"><p style={{ color: '#4a7c59', textAlign: 'center' }}>Loading charges...</p></div>
              ) : (
                <>
                  {/* Summary by Program */}
                  <div className="card" style={{ marginBottom: '16px' }}>
                    <h2 style={{ marginBottom: '16px', fontSize: '16px', color: '#22c55e' }}>
                      Charges by Program
                    </h2>
                    {programChargesSummary.length === 0 ? (
                      <p style={{ color: '#4a7c59', textAlign: 'center' }}>No charges recorded.</p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Program</th>
                              <th style={{ textAlign: 'center' }}># Charges</th>
                              <th style={{ textAlign: 'right' }}>Comps</th>
                              <th style={{ textAlign: 'right' }}>Discounts</th>
                              <th style={{ textAlign: 'right' }}>Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {programChargesSummary.filter(p => p.total_charged > 0).map(p => (
                              <tr key={p.program_id}>
                                <td>{p.program_name}</td>
                                <td style={{ textAlign: 'center' }}>{p.charge_count}</td>
                                <td style={{ textAlign: 'right', color: '#eab308' }}>{formatCurrency(p.total_comps)}</td>
                                <td style={{ textAlign: 'right', color: '#f97316' }}>{formatCurrency(p.total_discounts)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>{formatCurrency(p.total_charged)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Charge History */}
                  <div className="card">
                    <h2 style={{ marginBottom: '16px', fontSize: '16px', color: '#22c55e' }}>
                      Recent Charges
                    </h2>
                    {programCharges.length === 0 ? (
                      <p style={{ color: '#4a7c59', textAlign: 'center' }}>No charges recorded yet.</p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Session</th>
                              <th>Program</th>
                              <th>Type</th>
                              <th style={{ textAlign: 'right' }}>Amount</th>
                              <th>Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {programCharges.map(charge => (
                              <tr key={charge.id}>
                                <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                                  {new Date(charge.created_at).toLocaleDateString()}
                                </td>
                                <td>{charge.session_name || '—'}</td>
                                <td>{charge.program_name}</td>
                                <td>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    background: charge.charge_type === 'comp' ? '#eab30833' : '#f9731633',
                                    color: charge.charge_type === 'comp' ? '#eab308' : '#f97316'
                                  }}>
                                    {charge.charge_type}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right', color: '#ef4444' }}>{formatCurrency(charge.amount)}</td>
                                <td style={{ fontSize: '12px', color: '#4a7c59' }}>{charge.reason || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Financials - Reimbursement */}
          {activeSection === 'financials' && activeSubSection === 'reimbursement' && (
            <div>
              <h1 className="page-title">Reimbursement Tracking</h1>

              {loadingReimbursement ? (
                <div className="card"><p style={{ color: '#4a7c59', textAlign: 'center' }}>Loading reimbursement data...</p></div>
              ) : reimbursementData && (
                <>
                  {/* Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                    <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #3b82f6' }}>
                      <p style={{ color: '#4a7c59', fontSize: '12px', margin: '0 0 4px 0' }}>Total COGS (Reimbursable)</p>
                      <p style={{ color: '#3b82f6', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                        {formatCurrency(reimbursementData.totalCogsOwed)}
                      </p>
                    </div>
                    <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #ef4444' }}>
                      <p style={{ color: '#4a7c59', fontSize: '12px', margin: '0 0 4px 0' }}>ASB Losses (Deducted)</p>
                      <p style={{ color: '#ef4444', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                        -{formatCurrency(reimbursementData.asbLosses)}
                      </p>
                    </div>
                    <div className="card" style={{ textAlign: 'center', borderLeft: '4px solid #22c55e' }}>
                      <p style={{ color: '#4a7c59', fontSize: '12px', margin: '0 0 4px 0' }}>Gross Owed</p>
                      <p style={{ color: '#22c55e', fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
                        {formatCurrency(reimbursementData.grossOwed)}
                      </p>
                    </div>
                  </div>

                  {/* Received Breakdown */}
                  <div className="card" style={{ marginBottom: '16px' }}>
                    <h2 style={{ marginBottom: '16px', fontSize: '16px', color: '#22c55e' }}>
                      Amounts Received
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                      <div style={{ background: '#6B1CD122', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ color: '#a855f7', fontSize: '11px', margin: '0 0 4px 0' }}>Zelle Received</p>
                        <p style={{ color: '#a855f7', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                          {formatCurrency(reimbursementData.zelleReceived)}
                        </p>
                      </div>
                      <div style={{ background: '#00D63222', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ color: '#00D632', fontSize: '11px', margin: '0 0 4px 0' }}>CashApp Withdrawn</p>
                        <p style={{ color: '#00D632', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                          {formatCurrency(reimbursementData.cashappWithdrawn)}
                        </p>
                      </div>
                      <div style={{ background: '#22c55e22', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ color: '#22c55e', fontSize: '11px', margin: '0 0 4px 0' }}>Cashbox Reimbursed</p>
                        <p style={{ color: '#22c55e', fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
                          {formatCurrency(reimbursementData.cashboxReimbursed)}
                        </p>
                      </div>
                    </div>
                    <div style={{ marginTop: '16px', padding: '12px', background: '#1a1a1a', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#4a7c59' }}>Total Received:</span>
                      <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{formatCurrency(reimbursementData.totalReceived)}</span>
                    </div>
                  </div>

                  {/* Remaining */}
                  <div className="card" style={{
                    marginBottom: '16px',
                    background: reimbursementData.remaining > 0 ? 'linear-gradient(135deg, #eab30811, #eab30822)' : 'linear-gradient(135deg, #22c55e11, #22c55e22)',
                    borderLeft: `4px solid ${reimbursementData.remaining > 0 ? '#eab308' : '#22c55e'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h2 style={{ margin: 0, fontSize: '16px', color: reimbursementData.remaining > 0 ? '#eab308' : '#22c55e' }}>
                          {reimbursementData.remaining > 0 ? 'Remaining to Collect' : 'Fully Reimbursed'}
                        </h2>
                        <p style={{ margin: '4px 0 0 0', color: '#4a7c59', fontSize: '13px' }}>
                          {reimbursementData.remaining > 0 ? 'Outstanding balance to be collected from ASB' : 'All reimbursable costs have been recovered'}
                        </p>
                      </div>
                      <p style={{ color: reimbursementData.remaining > 0 ? '#eab308' : '#22c55e', fontSize: '32px', fontWeight: 'bold', margin: 0 }}>
                        {formatCurrency(Math.abs(reimbursementData.remaining))}
                      </p>
                    </div>
                  </div>

                  {/* Ledger History */}
                  {reimbursementLedger.length > 0 && (
                    <div className="card">
                      <h2 style={{ marginBottom: '16px', fontSize: '16px', color: '#22c55e' }}>
                        Recent Ledger Entries
                      </h2>
                      <div style={{ overflowX: 'auto' }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Type</th>
                              <th>Session</th>
                              <th style={{ textAlign: 'right' }}>Amount</th>
                              <th>Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reimbursementLedger.map(entry => (
                              <tr key={entry.id}>
                                <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                                  {new Date(entry.created_at).toLocaleDateString()}
                                </td>
                                <td>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    background: entry.entry_type.includes('received') || entry.entry_type.includes('withdrawal') || entry.entry_type.includes('reimbursement') ? '#22c55e33' : '#3b82f633',
                                    color: entry.entry_type.includes('received') || entry.entry_type.includes('withdrawal') || entry.entry_type.includes('reimbursement') ? '#22c55e' : '#3b82f6'
                                  }}>
                                    {entry.entry_type.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td>{entry.session_name || '—'}</td>
                                <td style={{ textAlign: 'right', color: '#22c55e' }}>{formatCurrency(entry.amount)}</td>
                                <td style={{ fontSize: '12px', color: '#4a7c59' }}>{entry.notes || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Financials - CashApp */}
          {activeSection === 'financials' && activeSubSection === 'cashapp' && (
          <div className="card">
            <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>
              Digital Payments
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {/* CashApp Balance Card */}
              <div style={{ background: '#00D632', padding: '20px', borderRadius: '12px' }}>
                <h3 style={{ color: '#000', fontSize: '14px', marginBottom: '4px', fontWeight: 'normal' }}>
                  CashApp Balance
                </h3>
                <p style={{ color: '#000', fontSize: '28px', fontWeight: 'bold', marginBottom: '12px' }}>
                  {formatCurrency(cashAppBalance)}
                </p>
                {cashAppBalance > 0 && (
                  <button
                    className="btn"
                    onClick={() => setShowWithdrawModal(true)}
                    style={{ background: '#000', color: '#00D632', padding: '8px 16px' }}
                  >
                    Withdraw
                  </button>
                )}
              </div>

              {/* Zelle Info Card */}
              <div style={{ background: '#6B1CD1', padding: '20px', borderRadius: '12px' }}>
                <h3 style={{ color: '#fff', fontSize: '14px', marginBottom: '4px', fontWeight: 'normal' }}>
                  Zelle Payments
                </h3>
                <p style={{ color: '#fff', fontSize: '14px', marginBottom: '8px' }}>
                  Zelle payments go directly to your bank account
                </p>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                  Auto-applied to reimbursement
                </p>
              </div>
            </div>

            <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px' }}>
              <h3 style={{ color: '#4ade80', fontSize: '14px', marginBottom: '12px' }}>How Digital Payments Work</h3>
              <ul style={{ color: '#4a7c59', fontSize: '13px', lineHeight: '1.8', paddingLeft: '20px' }}>
                <li><strong style={{ color: '#00D632' }}>CashApp</strong>: Payments accumulate in your CashApp balance. Withdraw when needed for reimbursement.</li>
                <li><strong style={{ color: '#6B1CD1' }}>Zelle</strong>: Goes directly to your bank - automatically applied to what ASB owes you.</li>
                <li><strong style={{ color: '#4ade80' }}>Cash</strong>: Stays in the session drawer, then goes to the main cashbox.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Withdraw Modal */}
        {showWithdrawModal && (
          <div className="pos-modal-overlay" onClick={() => setShowWithdrawModal(false)}>
            <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <h3 style={{ color: '#00D632', marginBottom: '16px' }}>Withdraw from CashApp</h3>

              <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4a7c59' }}>Available Balance:</span>
                  <span style={{ color: '#00D632', fontWeight: 'bold' }}>{formatCurrency(cashAppBalance)}</span>
                </div>
              </div>

              <form onSubmit={handleCashAppWithdraw}>
                <div className="form-group">
                  <label>Amount to Withdraw</label>
                  <input
                    type="number"
                    className="input"
                    step="0.01"
                    min="0.01"
                    max={cashAppBalance}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    style={{ fontSize: '20px', textAlign: 'center' }}
                    autoFocus
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => setWithdrawAmount(String(cashAppBalance))}
                  style={{ marginBottom: '16px', width: '100%' }}
                >
                  Withdraw All ({formatCurrency(cashAppBalance)})
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn" onClick={() => setShowWithdrawModal(false)} style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={(parseFloat(withdrawAmount) || 0) <= 0 || (parseFloat(withdrawAmount) || 0) > cashAppBalance}
                    style={{ flex: 1, background: '#00D632' }}
                  >
                    Withdraw
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

          {/* Financials - Losses */}
          {activeSection === 'financials' && activeSubSection === 'losses' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', color: '#22c55e', margin: 0 }}>
                Loss Tracking
              </h2>
              <button
                className="btn btn-primary"
                onClick={() => setShowAddLossForm(true)}
              >
                + Record Loss
              </button>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ color: '#4a7c59', fontSize: '12px', marginBottom: '4px' }}>Total Losses</p>
                <p style={{ color: '#ef4444', fontSize: '24px', fontWeight: 'bold' }}>
                  {formatCurrency(lossesSummary.totals?.total_amount || 0)}
                </p>
                <p style={{ color: '#4a7c59', fontSize: '11px' }}>
                  {lossesSummary.totals?.total_count || 0} records
                </p>
              </div>
              {lossesSummary.byType?.map(item => (
                <div key={item.loss_type} style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                  <p style={{ color: '#4a7c59', fontSize: '12px', marginBottom: '4px' }}>{getLossTypeLabel(item.loss_type)}</p>
                  <p style={{ color: '#fbbf24', fontSize: '20px', fontWeight: 'bold' }}>
                    {formatCurrency(item.total_amount)}
                  </p>
                  <p style={{ color: '#4a7c59', fontSize: '11px' }}>
                    {item.count} records
                  </p>
                </div>
              ))}
            </div>

            {/* Loss Records Table */}
            {losses.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#4ade80' }}>No losses recorded.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Description</th>
                      <th>Session/Program</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {losses.map(loss => (
                      <tr key={loss.id}>
                        <td>{new Date(loss.created_at).toLocaleDateString()}</td>
                        <td>
                          <span style={{
                            background: loss.loss_type === 'cash_discrepancy' ? '#ef444433' :
                                       loss.loss_type === 'inventory_discrepancy' ? '#f9731633' :
                                       loss.loss_type === 'spoilage' ? '#eab30833' : '#6b728033',
                            color: loss.loss_type === 'cash_discrepancy' ? '#ef4444' :
                                   loss.loss_type === 'inventory_discrepancy' ? '#f97316' :
                                   loss.loss_type === 'spoilage' ? '#eab308' : '#9ca3af',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {getLossTypeLabel(loss.loss_type)}
                          </span>
                        </td>
                        <td style={{ color: '#ef4444', fontWeight: 'bold' }}>{formatCurrency(loss.amount)}</td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {loss.description || '-'}
                        </td>
                        <td>
                          {loss.session_start ? new Date(loss.session_start).toLocaleDateString() : ''}
                          {loss.program_name ? ` (${loss.program_name})` : ''}
                          {!loss.session_start && !loss.program_name && '-'}
                        </td>
                        <td>
                          <button
                            className="btn btn-small"
                            onClick={() => handleDeleteLoss(loss.id)}
                            style={{ background: '#ef4444', color: '#fff', padding: '4px 8px' }}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Add Loss Modal */}
        {showAddLossForm && (
          <div className="pos-modal-overlay" onClick={() => setShowAddLossForm(false)}>
            <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <h3 style={{ color: '#ef4444', marginBottom: '16px' }}>Record Loss</h3>

              <form onSubmit={handleAddLoss}>
                <div className="form-group">
                  <label>Loss Type *</label>
                  <select
                    className="input"
                    value={lossFormData.lossType}
                    onChange={(e) => setLossFormData({ ...lossFormData, lossType: e.target.value })}
                    required
                  >
                    <option value="spoilage">Spoilage</option>
                    <option value="cash_discrepancy">Cash Discrepancy</option>
                    <option value="inventory_discrepancy">Inventory Discrepancy</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Amount ($) *</label>
                  <input
                    type="number"
                    className="input"
                    step="0.01"
                    min="0.01"
                    value={lossFormData.amount}
                    onChange={(e) => setLossFormData({ ...lossFormData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <input
                    type="text"
                    className="input"
                    value={lossFormData.description}
                    onChange={(e) => setLossFormData({ ...lossFormData, description: e.target.value })}
                    placeholder="What happened?"
                  />
                </div>

                <div className="form-group">
                  <label>Related Session (optional)</label>
                  <select
                    className="input"
                    value={lossFormData.sessionId}
                    onChange={(e) => setLossFormData({ ...lossFormData, sessionId: e.target.value })}
                  >
                    <option value="">-- None --</option>
                    {sessions.filter(s => s.status === 'closed').map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} - {new Date(s.start_time).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Charged To Program (optional)</label>
                  <select
                    className="input"
                    value={lossFormData.programId}
                    onChange={(e) => setLossFormData({ ...lossFormData, programId: e.target.value })}
                  >
                    <option value="">-- ASB (General) --</option>
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button type="button" className="btn" onClick={() => setShowAddLossForm(false)} style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#ef4444' }}>
                    Record Loss
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

          {/* Reports Section */}
          {activeSection === 'reports' && (
          <div className="card">
            <h2 style={{ marginBottom: '16px', fontSize: '18px', color: '#22c55e' }}>
              Reports & Exports
            </h2>

            {/* Date Filters */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Start Date</label>
                <input
                  type="date"
                  className="input"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>End Date</label>
                <input
                  type="date"
                  className="input"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={fetchReportSummary}
                disabled={loadingReport}
              >
                {loadingReport ? 'Loading...' : 'Update Summary'}
              </button>
              <button
                className="btn"
                onClick={() => { setReportStartDate(''); setReportEndDate(''); fetchReportSummary(); }}
              >
                Clear Filters
              </button>
            </div>

            {/* Summary Cards */}
            {reportSummary && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px' }}>
                  <h3 style={{ color: '#4a7c59', fontSize: '12px', marginBottom: '8px' }}>Sessions</h3>
                  <p style={{ color: '#22c55e', fontSize: '24px', fontWeight: 'bold' }}>{reportSummary.sessions?.closed_sessions || 0}</p>
                  <p style={{ color: '#4a7c59', fontSize: '12px' }}>Total Profit: {formatCurrency(reportSummary.sessions?.total_profit || 0)}</p>
                </div>
                <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px' }}>
                  <h3 style={{ color: '#4a7c59', fontSize: '12px', marginBottom: '8px' }}>Orders</h3>
                  <p style={{ color: '#22c55e', fontSize: '24px', fontWeight: 'bold' }}>{reportSummary.orders?.total_orders || 0}</p>
                  <p style={{ color: '#4a7c59', fontSize: '12px' }}>Revenue: {formatCurrency(reportSummary.orders?.total_revenue || 0)}</p>
                </div>
                <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px' }}>
                  <h3 style={{ color: '#4a7c59', fontSize: '12px', marginBottom: '8px' }}>COGS</h3>
                  <p style={{ color: '#f97316', fontSize: '24px', fontWeight: 'bold' }}>{formatCurrency(reportSummary.orders?.total_cogs || 0)}</p>
                  <p style={{ color: '#4a7c59', fontSize: '12px' }}>Discounts: {formatCurrency(reportSummary.orders?.total_discounts || 0)}</p>
                </div>
                <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px' }}>
                  <h3 style={{ color: '#4a7c59', fontSize: '12px', marginBottom: '8px' }}>Losses</h3>
                  <p style={{ color: '#ef4444', fontSize: '24px', fontWeight: 'bold' }}>{formatCurrency(reportSummary.losses?.total_loss_amount || 0)}</p>
                  <p style={{ color: '#4a7c59', fontSize: '12px' }}>{reportSummary.losses?.total_losses || 0} records</p>
                </div>
              </div>
            )}

            {/* Payment Breakdown */}
            {reportSummary?.orders && (
              <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                <h3 style={{ color: '#22c55e', fontSize: '14px', marginBottom: '12px' }}>Revenue by Payment Method</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: '#22c55e', fontSize: '20px', fontWeight: 'bold' }}>
                      {formatCurrency(reportSummary.orders.cash_revenue || 0)}
                    </p>
                    <p style={{ color: '#4a7c59', fontSize: '12px' }}>Cash</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: '#00D632', fontSize: '20px', fontWeight: 'bold' }}>
                      {formatCurrency(reportSummary.orders.cashapp_revenue || 0)}
                    </p>
                    <p style={{ color: '#4a7c59', fontSize: '12px' }}>CashApp</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ color: '#a855f7', fontSize: '20px', fontWeight: 'bold' }}>
                      {formatCurrency(reportSummary.orders.zelle_revenue || 0)}
                    </p>
                    <p style={{ color: '#4a7c59', fontSize: '12px' }}>Zelle</p>
                  </div>
                </div>
              </div>
            )}

            {/* Export Buttons */}
            <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px' }}>
              <h3 style={{ color: '#22c55e', fontSize: '14px', marginBottom: '16px' }}>Export Data (CSV)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                <button className="btn" onClick={() => downloadReport('sessions')}>
                  Sessions
                </button>
                <button className="btn" onClick={() => downloadReport('orders')}>
                  Orders
                </button>
                <button className="btn" onClick={() => downloadReport('inventory')}>
                  Inventory
                </button>
                <button className="btn" onClick={() => downloadReport('purchases')}>
                  Purchases
                </button>
                <button className="btn" onClick={() => downloadReport('losses')}>
                  Losses
                </button>
                <button className="btn" onClick={() => downloadReport('programs')}>
                  Programs
                </button>
                <button className="btn" onClick={() => downloadReport('reimbursement')}>
                  Reimbursement
                </button>
              </div>
            </div>
          </div>
        )}

          {/* Sessions - History */}
          {activeSection === 'sessions' && activeSubSection === 'history' && (
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
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.filter(s => s.status === 'closed' || s.status === 'cancelled').map((session) => (
                      <tr key={session.id}>
                        <td style={{ fontSize: '13px' }}>{formatDateTime(session.closed_at || session.created_at)}</td>
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
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              className="btn btn-small"
                              onClick={() => fetchSessionDetails(session)}
                              style={{ padding: '4px 8px', fontSize: '12px', background: '#3b82f6' }}
                            >
                              View
                            </button>
                            {session.status === 'closed' && session.profit > 0 && (
                              <button
                                className="btn btn-small btn-primary"
                                onClick={() => handleOpenDistribute(session)}
                                style={{ padding: '4px 8px', fontSize: '12px' }}
                              >
                                Distribute
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Profit Distribution Modal */}
        {showDistributeModal && selectedSession && (
          <div className="pos-modal-overlay" onClick={() => setShowDistributeModal(false)}>
            <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <h3 style={{ color: '#22c55e', marginBottom: '16px' }}>
                Distribute Profit: {selectedSession.name}
              </h3>

              <div style={{ background: '#1a1a1a', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#4a7c59' }}>Session Profit:</span>
                  <span style={{ color: '#22c55e', fontWeight: 'bold' }}>
                    {formatCurrency(selectedSession.profit)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#4a7c59' }}>Total Allocated:</span>
                  <span style={{
                    color: Math.abs(getTotalDistribution() - selectedSession.profit) < 0.01 ? '#22c55e' : '#eab308',
                    fontWeight: 'bold'
                  }}>
                    {formatCurrency(getTotalDistribution())}
                  </span>
                </div>
                {Math.abs(getTotalDistribution() - selectedSession.profit) >= 0.01 && (
                  <p style={{ color: '#eab308', fontSize: '12px', marginTop: '8px' }}>
                    Remaining: {formatCurrency(selectedSession.profit - getTotalDistribution())}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: '#4ade80', display: 'block', marginBottom: '8px' }}>
                  Allocate to Programs:
                </label>
                {programs.map(program => (
                  <div key={program.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px',
                    background: '#1a1a1a',
                    padding: '8px 12px',
                    borderRadius: '6px'
                  }}>
                    <span style={{ flex: 1, color: '#4ade80' }}>{program.name}</span>
                    <input
                      type="number"
                      className="input"
                      step="0.01"
                      min="0"
                      value={distributionAmounts[program.id] || ''}
                      onChange={(e) => handleDistributionChange(program.id, e.target.value)}
                      style={{ width: '100px', textAlign: 'right' }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => {
                    const evenSplit = Math.floor(selectedSession.profit / programs.length * 100) / 100;
                    const amounts = {};
                    programs.forEach(p => { amounts[p.id] = evenSplit; });
                    setDistributionAmounts(amounts);
                  }}
                  style={{ flex: 1 }}
                >
                  Even Split
                </button>
                <button
                  type="button"
                  className="btn btn-small"
                  onClick={() => {
                    const amounts = {};
                    programs.forEach(p => { amounts[p.id] = 0; });
                    if (programs.length > 0) {
                      amounts[selectedSession.program_id || programs[0].id] = selectedSession.profit;
                    }
                    setDistributionAmounts(amounts);
                  }}
                  style={{ flex: 1 }}
                >
                  Session Program
                </button>
              </div>

              {error && <div className="error-message" style={{ marginBottom: '12px' }}>{error}</div>}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="btn" onClick={() => setShowDistributeModal(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitDistribution}
                  style={{ flex: 1 }}
                >
                  Save Distribution
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session Details Modal */}
        {showSessionDetails && selectedSession && (
          <div className="pos-modal-overlay" onClick={() => setShowSessionDetails(false)}>
            <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '85vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ color: '#22c55e', margin: 0 }}>
                  {selectedSession.name}
                  {selectedSession.is_test === 1 && (
                    <span style={{ marginLeft: '8px', padding: '2px 8px', background: '#eab308', color: '#000', fontSize: '12px', borderRadius: '4px' }}>
                      PRACTICE
                    </span>
                  )}
                </h3>
                <button className="btn btn-small" onClick={() => setShowSessionDetails(false)}>Close</button>
              </div>

              {loadingSessionDetails ? (
                <p style={{ textAlign: 'center', color: '#4a7c59' }}>Loading session details...</p>
              ) : (
                <>
                  {/* Session Summary */}
                  <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                    <h4 style={{ color: '#4ade80', margin: '0 0 12px 0', fontSize: '14px' }}>Session Summary</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                      <div>
                        <p style={{ color: '#4a7c59', fontSize: '11px', margin: 0 }}>Program</p>
                        <p style={{ color: '#4ade80', fontSize: '14px', margin: 0, fontWeight: 'bold' }}>{selectedSession.program_name}</p>
                      </div>
                      <div>
                        <p style={{ color: '#4a7c59', fontSize: '11px', margin: 0 }}>Orders</p>
                        <p style={{ color: '#22c55e', fontSize: '18px', margin: 0, fontWeight: 'bold' }}>{sessionDetailsData?.total_orders || 0}</p>
                      </div>
                      <div>
                        <p style={{ color: '#4a7c59', fontSize: '11px', margin: 0 }}>Revenue</p>
                        <p style={{ color: '#22c55e', fontSize: '18px', margin: 0, fontWeight: 'bold' }}>{formatCurrency(sessionDetailsData?.total_revenue || 0)}</p>
                      </div>
                      <div>
                        <p style={{ color: '#4a7c59', fontSize: '11px', margin: 0 }}>Profit</p>
                        <p style={{ color: selectedSession.profit >= 0 ? '#22c55e' : '#ef4444', fontSize: '18px', margin: 0, fontWeight: 'bold' }}>
                          {formatCurrency(selectedSession.profit || 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cash Flow */}
                  <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                    <h4 style={{ color: '#4ade80', margin: '0 0 12px 0', fontSize: '14px' }}>Cash Flow</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#4a7c59' }}>Starting Cash:</span>
                        <span style={{ color: '#4ade80' }}>{formatCurrency(selectedSession.start_total || 0)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#4a7c59' }}>Ending Cash:</span>
                        <span style={{ color: '#4ade80' }}>{formatCurrency(selectedSession.end_total || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Revenue by Payment Method */}
                  <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                    <h4 style={{ color: '#4ade80', margin: '0 0 12px 0', fontSize: '14px' }}>Revenue by Payment Method</h4>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 100px', background: '#22c55e22', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                        <p style={{ color: '#22c55e', fontSize: '10px', margin: '0 0 4px 0' }}>CASH</p>
                        <p style={{ color: '#22c55e', fontSize: '18px', margin: 0, fontWeight: 'bold' }}>
                          {formatCurrency(sessionDetailsData?.cash_total || 0)}
                        </p>
                      </div>
                      <div style={{ flex: '1 1 100px', background: '#00D63222', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                        <p style={{ color: '#00D632', fontSize: '10px', margin: '0 0 4px 0' }}>CASHAPP</p>
                        <p style={{ color: '#00D632', fontSize: '18px', margin: 0, fontWeight: 'bold' }}>
                          {formatCurrency(sessionDetailsData?.cashapp_total || 0)}
                        </p>
                      </div>
                      <div style={{ flex: '1 1 100px', background: '#6B1CD122', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                        <p style={{ color: '#a855f7', fontSize: '10px', margin: '0 0 4px 0' }}>ZELLE</p>
                        <p style={{ color: '#a855f7', fontSize: '18px', margin: 0, fontWeight: 'bold' }}>
                          {formatCurrency(sessionDetailsData?.zelle_total || 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Discounts & COGS */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px' }}>
                      <h4 style={{ color: '#eab308', margin: '0 0 12px 0', fontSize: '14px' }}>Discounts & Comps</h4>
                      <div style={{ fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: '#4a7c59' }}>Total Discounts:</span>
                          <span style={{ color: '#eab308' }}>{formatCurrency(sessionDetailsData?.total_discounts || 0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#4a7c59' }}>Comp Orders:</span>
                          <span style={{ color: '#eab308' }}>{sessionDetailsData?.comp_count || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px' }}>
                      <h4 style={{ color: '#3b82f6', margin: '0 0 12px 0', fontSize: '14px' }}>Cost of Goods Sold</h4>
                      <div style={{ fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: '#4a7c59' }}>Total COGS:</span>
                          <span style={{ color: '#3b82f6' }}>{formatCurrency(sessionDetailsData?.total_cogs || 0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#4a7c59' }}>Reimbursable:</span>
                          <span style={{ color: '#3b82f6' }}>{formatCurrency(sessionDetailsData?.total_cogs_reimbursable || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items Sold Breakdown */}
                  {sessionDetailsData?.itemBreakdown && sessionDetailsData.itemBreakdown.length > 0 && (
                    <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                      <h4 style={{ color: '#4ade80', margin: '0 0 12px 0', fontSize: '14px' }}>Items Sold</h4>
                      <table style={{ width: '100%', fontSize: '13px' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', color: '#4a7c59', padding: '4px 8px' }}>Item</th>
                            <th style={{ textAlign: 'right', color: '#4a7c59', padding: '4px 8px' }}>Qty</th>
                            <th style={{ textAlign: 'right', color: '#4a7c59', padding: '4px 8px' }}>Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessionDetailsData.itemBreakdown.map((item, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: '4px 8px', color: '#e5e7eb' }}>{item.name}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', color: '#4ade80' }}>{item.total_quantity}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', color: '#22c55e' }}>{formatCurrency(item.total_sales)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Order History */}
                  <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '8px' }}>
                    <h4 style={{ color: '#4ade80', margin: '0 0 12px 0', fontSize: '14px' }}>
                      Order History ({sessionOrders.length} orders)
                    </h4>
                    {sessionOrders.length === 0 ? (
                      <p style={{ color: '#4a7c59', textAlign: 'center', fontSize: '13px' }}>No orders in this session.</p>
                    ) : (
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {sessionOrders.map(order => (
                          <div
                            key={order.id}
                            style={{
                              background: '#111',
                              padding: '10px',
                              borderRadius: '6px',
                              marginBottom: '8px',
                              borderLeft: order.is_comp ? '3px solid #eab308' : order.discount_amount > 0 ? '3px solid #f97316' : '3px solid #22c55e'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ color: '#4a7c59', fontSize: '11px' }}>
                                  {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  background: order.payment_method === 'cash' ? '#22c55e33' :
                                             order.payment_method === 'cashapp' ? '#00D63233' : '#6B1CD133',
                                  color: order.payment_method === 'cash' ? '#22c55e' :
                                         order.payment_method === 'cashapp' ? '#00D632' : '#a855f7'
                                }}>
                                  {order.payment_method === 'cashapp' ? 'CashApp' : order.payment_method === 'zelle' ? 'Zelle' : 'Cash'}
                                </span>
                                {order.is_comp ? (
                                  <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', background: '#eab30833', color: '#eab308' }}>
                                    COMP
                                  </span>
                                ) : null}
                              </div>
                              <span style={{ color: '#22c55e', fontWeight: 'bold', fontSize: '14px' }}>
                                {formatCurrency(order.final_total || order.subtotal)}
                              </span>
                            </div>
                            <p style={{ color: '#e5e7eb', fontSize: '12px', margin: '4px 0 0 0' }}>
                              {order.items_summary || 'Items not available'}
                            </p>
                            {order.discount_amount > 0 && !order.is_comp && (
                              <p style={{ color: '#f97316', fontSize: '11px', margin: '4px 0 0 0' }}>
                                Discount: -{formatCurrency(order.discount_amount)}
                                {order.discount_reason && ` (${order.discount_reason})`}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        </div>
      </div>
    </div>
  );
}

export default CashBoxAdmin;
