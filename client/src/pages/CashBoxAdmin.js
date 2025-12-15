import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { useAuth } from '../contexts';
import {
  DashboardSection,
  ReportsSection,
  ActiveSessionsSection,
  SessionHistorySection,
  CashboxSection,
  ProgramsListSection,
  InventoryStockSection,
  ReimbursementSection,
  CashAppSection,
  LossesSection,
  ProgramsEarningsSection,
  InventoryLotsSection,
  InventoryMovementsSection,
  InventoryCountSection
} from '../components/cashbox';

function CashBoxAdmin() {
  const { user } = useAuth();
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
    items: [{ menuItemId: '', itemName: '', quantity: '', lineTotal: '', crvPerUnit: '' }],
    tax: '',
    deliveryFee: '',
    otherFees: '',
    notes: ''
  });
  const [submittingPurchase, setSubmittingPurchase] = useState(false);
  const [purchaseItemSearchQueries, setPurchaseItemSearchQueries] = useState({});
  const [purchaseItemDropdownOpen, setPurchaseItemDropdownOpen] = useState(null);

  // Keyboard navigation state
  const [focusedRowIndex, setFocusedRowIndex] = useState(null);
  const [confirmedRows, setConfirmedRows] = useState(new Set());
  const purchaseRowRefs = useRef([]);

  // Auto-populate quantity hints
  const [purchaseItemHints, setPurchaseItemHints] = useState({});

  // Edit existing purchase
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);
  const [editingPurchaseData, setEditingPurchaseData] = useState(null);
  const [loadingPurchaseDetails, setLoadingPurchaseDetails] = useState(false);

  // Inventory refresh state
  const [refreshingInventory, setRefreshingInventory] = useState(false);

  // Quick create item modal
  const [showQuickCreateModal, setShowQuickCreateModal] = useState(false);
  const [quickCreateData, setQuickCreateData] = useState({
    name: '',
    isSupply: false,
    unitCost: '',
    quantity: '',
    price: '',
    componentOf: '' // Parent menu item ID if making this a component
  });
  const [quickCreateForIndex, setQuickCreateForIndex] = useState(null);

  // Purchase templates (quick-add bundles)
  const [purchaseTemplates, setPurchaseTemplates] = useState([]);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

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
    fetchPurchaseTemplates();
    fetchInventory();
    fetchCashAppBalance();
    fetchLosses();
  }, []);

  // Refresh inventory when accessing the inventory stock section
  useEffect(() => {
    if (activeSection === 'inventory' && activeSubSection === 'stock') {
      refreshInventoryData();
    }
  }, [activeSection, activeSubSection]);

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

  const fetchPurchaseTemplates = async () => {
    try {
      const response = await fetch('/api/purchase-templates');
      const data = await response.json();
      if (response.ok) {
        setPurchaseTemplates(data);
      }
    } catch (err) {
      console.error('Failed to fetch purchase templates:', err);
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

  // Select a menu item from the dropdown and auto-fill name + quantity
  const handleSelectPurchaseItem = async (index, menuItem) => {
    setPurchaseFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        menuItemId: menuItem.id.toString(),
        itemName: menuItem.name,
        // Auto-fill from default_purchase_quantity if available
        quantity: menuItem.default_purchase_quantity || newItems[index].quantity || ''
      };
      return { ...prev, items: newItems };
    });
    // Clear search and close dropdown
    setPurchaseItemSearchQueries(prev => ({ ...prev, [index]: '' }));
    setPurchaseItemDropdownOpen(null);

    // Fetch last purchased quantity hint
    try {
      const response = await fetch(`/api/purchases/last-quantity/${menuItem.id}`);
      const data = await response.json();
      if (data.quantity) {
        setPurchaseItemHints(prev => ({
          ...prev,
          [index]: { lastQty: data.quantity, lastDate: data.purchase_date }
        }));
      }
    } catch (err) {
      console.error('Failed to fetch last quantity:', err);
    }
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
      items: [...prev.items, { menuItemId: '', itemName: '', quantity: '', lineTotal: '', crvPerUnit: '' }]
    }));
  };

  const removePurchaseItem = (index) => {
    if (purchaseFormData.items.length > 1) {
      setPurchaseFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
      // Clean up search queries and hints
      setPurchaseItemSearchQueries(prev => {
        const newQueries = { ...prev };
        delete newQueries[index];
        return newQueries;
      });
      setPurchaseItemHints(prev => {
        const newHints = { ...prev };
        delete newHints[index];
        return newHints;
      });
      // Clean up confirmed rows
      setConfirmedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(index);
        return newSet;
      });
    }
  };

  // Keyboard navigation handler for purchase rows
  const handlePurchaseKeyDown = (e, rowIndex) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (rowIndex < purchaseFormData.items.length - 1) {
          setFocusedRowIndex(rowIndex + 1);
          setTimeout(() => {
            purchaseRowRefs.current[rowIndex + 1]?.querySelector('input')?.focus();
          }, 0);
        } else {
          // At last row, add new row and focus it
          addPurchaseItem();
          setTimeout(() => {
            const newIndex = rowIndex + 1;
            setFocusedRowIndex(newIndex);
            purchaseRowRefs.current[newIndex]?.querySelector('input')?.focus();
          }, 50);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (rowIndex > 0) {
          setFocusedRowIndex(rowIndex - 1);
          setTimeout(() => {
            purchaseRowRefs.current[rowIndex - 1]?.querySelector('input')?.focus();
          }, 0);
        }
        break;

      case 'Enter':
        // Don't trigger if inside a dropdown or if already handled by input
        if (purchaseItemDropdownOpen === rowIndex) return;
        e.preventDefault();
        // Confirm/lock current row
        if (!confirmedRows.has(rowIndex)) {
          setConfirmedRows(prev => new Set([...prev, rowIndex]));
        }
        // Move to next row
        if (rowIndex < purchaseFormData.items.length - 1) {
          setFocusedRowIndex(rowIndex + 1);
          setTimeout(() => {
            purchaseRowRefs.current[rowIndex + 1]?.querySelector('input')?.focus();
          }, 0);
        }
        break;

      case 'Escape':
        // Unlock row for editing
        setConfirmedRows(prev => {
          const newSet = new Set(prev);
          newSet.delete(rowIndex);
          return newSet;
        });
        break;

      default:
        break;
    }
  };

  // Duplicate a purchase row
  const duplicatePurchaseItem = (index) => {
    const itemToDuplicate = purchaseFormData.items[index];
    setPurchaseFormData(prev => ({
      ...prev,
      items: [
        ...prev.items.slice(0, index + 1),
        { ...itemToDuplicate },
        ...prev.items.slice(index + 1)
      ]
    }));
  };

  // Quick-add template - expand template into multiple rows
  const handleQuickAddTemplate = async (templateId) => {
    if (!templateId) return;
    try {
      const response = await fetch(`/api/purchase-templates/${templateId}/items`);
      const items = await response.json();
      if (response.ok && items.length > 0) {
        // Convert template items to purchase form items
        const newItems = items.map(item => ({
          menuItemId: item.menu_item_id ? item.menu_item_id.toString() : '',
          itemName: item.menu_item_name || item.item_name,
          quantity: (item.default_quantity || 1).toString(),
          lineTotal: '',
          crvPerUnit: ''
        }));
        // Add to existing items (replace first empty item or append)
        setPurchaseFormData(prev => {
          const existingItems = prev.items.filter(i => i.menuItemId || i.itemName || i.quantity || i.lineTotal);
          return {
            ...prev,
            items: [...existingItems, ...newItems]
          };
        });
      }
    } catch (err) {
      console.error('Failed to load template items:', err);
    }
  };

  // Save current items as a new template
  const handleSaveAsTemplate = async () => {
    if (!newTemplateName.trim()) {
      setError('Please enter a template name');
      return;
    }
    const validItems = purchaseFormData.items.filter(i => i.menuItemId || i.itemName);
    if (validItems.length === 0) {
      setError('Add some items first before saving as template');
      return;
    }
    try {
      const response = await fetch('/api/purchase-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTemplateName.trim(),
          items: validItems.map(item => ({
            menuItemId: item.menuItemId ? parseInt(item.menuItemId) : null,
            itemName: item.itemName,
            defaultQuantity: parseInt(item.quantity) || 1
          }))
        })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(`Template "${newTemplateName}" created!`);
        setNewTemplateName('');
        setShowCreateTemplateModal(false);
        fetchPurchaseTemplates();
      } else {
        setError(data.error || 'Failed to create template');
      }
    } catch (err) {
      setError('Failed to create template');
    }
  };

  // Delete a template
  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      const response = await fetch(`/api/purchase-templates/${templateId}`, { method: 'DELETE' });
      if (response.ok) {
        fetchPurchaseTemplates();
      }
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  // Load purchase for editing
  const loadPurchaseForEdit = async (purchaseId) => {
    setLoadingPurchaseDetails(true);
    try {
      const response = await fetch(`/api/purchases/${purchaseId}`);
      const data = await response.json();
      if (response.ok) {
        setEditingPurchaseId(purchaseId);
        setEditingPurchaseData({
          vendor: data.vendor || '',
          purchaseDate: data.purchase_date,
          items: data.items.map(item => ({
            id: item.id,
            menuItemId: item.menu_item_id ? item.menu_item_id.toString() : '',
            itemName: item.item_name || item.menu_item_name || '',
            quantity: item.quantity.toString(),
            lineTotal: item.line_total.toString(),
            crvPerUnit: (item.crv_per_unit || 0).toString()
          })),
          tax: data.tax.toString(),
          deliveryFee: data.delivery_fee.toString(),
          otherFees: data.other_fees.toString(),
          notes: data.notes || ''
        });
      } else {
        setError(data.error || 'Failed to load purchase details');
      }
    } catch (err) {
      setError('Failed to load purchase details');
    } finally {
      setLoadingPurchaseDetails(false);
    }
  };

  // Update existing purchase
  const handleUpdatePurchase = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmittingPurchase(true);

    try {
      const response = await fetch(`/api/purchases/${editingPurchaseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor: editingPurchaseData.vendor,
          purchaseDate: editingPurchaseData.purchaseDate,
          items: editingPurchaseData.items.map(item => ({
            menuItemId: item.menuItemId ? parseInt(item.menuItemId) : null,
            itemName: item.itemName,
            quantity: parseInt(item.quantity) || 1,
            lineTotal: parseFloat(item.lineTotal) || 0,
            crvPerUnit: parseFloat(item.crvPerUnit) || 0
          })),
          tax: editingPurchaseData.tax,
          deliveryFee: editingPurchaseData.deliveryFee,
          otherFees: editingPurchaseData.otherFees,
          notes: editingPurchaseData.notes
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setSuccess('Purchase updated successfully');
      setEditingPurchaseId(null);
      setEditingPurchaseData(null);
      fetchPurchases();
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingPurchase(false);
    }
  };

  // Edit purchase item change handler
  const handleEditPurchaseItemChange = (index, field, value) => {
    setEditingPurchaseData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  // Add item to editing purchase
  const addEditPurchaseItem = () => {
    setEditingPurchaseData(prev => ({
      ...prev,
      items: [...prev.items, { menuItemId: '', itemName: '', quantity: '', lineTotal: '', crvPerUnit: '' }]
    }));
  };

  // Remove item from editing purchase
  const removeEditPurchaseItem = (index) => {
    if (editingPurchaseData.items.length > 1) {
      setEditingPurchaseData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  // Refresh inventory data
  const refreshInventoryData = async () => {
    setRefreshingInventory(true);
    try {
      const response = await fetch('/api/inventory');
      const data = await response.json();
      if (response.ok) {
        setInventoryItems(data);
      }
    } catch (err) {
      console.error('Failed to refresh inventory:', err);
    } finally {
      setRefreshingInventory(false);
    }
  };

  const resetPurchaseForm = () => {
    setPurchaseFormData({
      vendor: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      items: [{ menuItemId: '', itemName: '', quantity: '', lineTotal: '', crvPerUnit: '' }],
      tax: '',
      deliveryFee: '',
      otherFees: '',
      notes: ''
    });
    setShowPurchaseForm(false);
    setFocusedRowIndex(null);
    setConfirmedRows(new Set());
    setPurchaseItemHints({});
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
      // Prepare items with proper naming (including CRV)
      const items = purchaseFormData.items.map(item => ({
        menuItemId: item.menuItemId ? parseInt(item.menuItemId) : null,
        itemName: item.itemName || (item.menuItemId ? menuItems.find(m => m.id === parseInt(item.menuItemId))?.name : 'Unknown Item'),
        quantity: parseInt(item.quantity) || 1,
        lineTotal: parseFloat(item.lineTotal) || 0,
        crvPerUnit: parseFloat(item.crvPerUnit) || 0
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

    // Validate price for sellable items
    if (!quickCreateData.isSupply && !quickCreateData.price) {
      setError('Price is required for sellable items');
      return;
    }

    try {
      // Create the menu item with is_supply flag
      const response = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickCreateData.name,
          price: quickCreateData.isSupply ? null : parseFloat(quickCreateData.price) || 0,
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

      // If componentOf is set, add this item as a component of the parent menu item
      if (quickCreateData.componentOf) {
        await fetch(`/api/menu/${quickCreateData.componentOf}/components`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            components: [{ componentItemId: newItemId, quantity: 1 }],
            append: true // Append to existing components
          })
        });
        // Mark the parent as composite
        await fetch(`/api/menu/${quickCreateData.componentOf}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isComposite: true })
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
      setQuickCreateData({ name: '', isSupply: false, unitCost: '', quantity: '', price: '', componentOf: '' });
      setQuickCreateForIndex(null);
      setSuccess(`Item "${quickCreateData.name}" created${quickCreateData.componentOf ? ' and linked as component' : ''}`);

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

  // Mark liquid item usage (percentage)
  const handleMarkUsage = async (itemId, usagePercent) => {
    try {
      const response = await fetch(`/api/inventory/${itemId}/mark-usage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usagePercent,
          createdBy: user?.name || 'admin'
        })
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(`Usage marked: ${usagePercent}%${data.quantityDecremented ? ' (jar emptied)' : ''}`);
      } else {
        setError(data.error || 'Failed to mark usage');
      }
    } catch (err) {
      setError('Failed to mark usage');
    }
  };

  // Toggle liquid tracking for an item
  const handleToggleLiquid = async (itemId, isLiquid) => {
    try {
      const response = await fetch(`/api/inventory/${itemId}/liquid`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLiquid })
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to update item');
      }
    } catch (err) {
      setError('Failed to update item');
    }
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
        <Navbar />
        <div className="admin-table-layout">
          <p style={{ color: 'var(--color-primary)' }}>Loading...</p>
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
      <Navbar />
      <div className="cashbox-layout">
        {/* Sidebar */}
        <div className={`cashbox-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="sidebar-header">
            <h2 style={{ color: 'var(--color-primary)', fontSize: '16px', margin: 0 }}>
              {!sidebarCollapsed && 'Concessions'}
            </h2>
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-subtle)', cursor: 'pointer', fontSize: '16px' }}
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
            <DashboardSection
              cashbox={cashbox}
              sessions={sessions}
              cashAppBalance={cashAppBalance}
              inventoryItems={inventoryItems}
              onNavigate={navigateTo}
              onOpenPOS={(sessionId) => navigate(`/cashbox/session/${sessionId}`)}
            />
          )}

          {/* Financials - Cashbox SubSection */}
          {activeSection === 'financials' && activeSubSection === 'cashbox' && cashbox && (
            <CashboxSection
              cashbox={cashbox}
              editingCashbox={editingCashbox}
              setEditingCashbox={setEditingCashbox}
              editValues={{
                quarters: editQuarters,
                bills1: editBills1,
                bills5: editBills5,
                bills10: editBills10,
                bills20: editBills20,
                bills50: editBills50,
                bills100: editBills100
              }}
              setEditValues={(values) => {
                setEditQuarters(values.quarters);
                setEditBills1(values.bills1);
                setEditBills5(values.bills5);
                setEditBills10(values.bills10);
                setEditBills20(values.bills20);
                setEditBills50(values.bills50);
                setEditBills100(values.bills100);
              }}
              onUpdateCashbox={handleUpdateCashbox}
            />
          )}

          {/* Sessions - Active (Create + Active Sessions) */}
          {activeSection === 'sessions' && activeSubSection === 'active' && (
            <ActiveSessionsSection
              sessions={sessions}
              programs={programs}
              sessionName={sessionName}
              setSessionName={setSessionName}
              sessionProgramId={sessionProgramId}
              setSessionProgramId={setSessionProgramId}
              isTestSession={isTestSession}
              setIsTestSession={setIsTestSession}
              creatingSession={creatingSession}
              onCreateSession={handleCreateSession}
              onViewSession={(id) => navigate(`/concession-session/${id}`)}
              onCancelSession={handleCancelSession}
              getStatusBadgeClass={getStatusBadgeClass}
            />
          )}

          {/* Programs - List & Balances */}
          {activeSection === 'programs' && activeSubSection === 'list' && (
            <ProgramsListSection
              programs={programs}
              newProgramName={newProgramName}
              setNewProgramName={setNewProgramName}
              addingProgram={addingProgram}
              onAddProgram={handleAddProgram}
              editingProgramId={editingProgramId}
              editProgramName={editProgramName}
              setEditProgramName={setEditProgramName}
              onStartEditProgram={startEditingProgram}
              onUpdateProgram={handleUpdateProgram}
              onCancelEditProgram={cancelEditingProgram}
              onViewLog={openProgramLog}
              onOpenTransaction={openTransactionModal}
              onDeactivateProgram={handleDeactivateProgram}
            />
          )}

        {/* Transaction Modal */}
        {transactionProgramId && (
          <div className="pos-modal-overlay" onClick={closeTransactionModal}>
            <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '16px' }}>
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
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '16px' }}>
                {programs.find(p => p.id === logProgramId)?.name} - Transaction Log
              </h3>

              {loadingLog ? (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>Loading...</p>
              ) : programLog.length === 0 ? (
                <p style={{ color: 'var(--color-text-subtle)', textAlign: 'center' }}>No transactions yet.</p>
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
                          <td style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                            {formatDateTime(entry.created_at)}
                          </td>
                          <td style={{ fontSize: '13px', color: 'var(--color-text-subtle)' }}>
                            {entry.session_id === 0 ? 'Manual Adjustment' : entry.session_name || `Session #${entry.session_id}`}
                          </td>
                          <td style={{
                            textAlign: 'right',
                            fontWeight: 'bold',
                            color: entry.amount >= 0 ? 'var(--color-primary)' : 'var(--color-danger)'
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
            <ProgramsEarningsSection programsWithEarnings={programsWithEarnings} />
          )}

          {/* Menu Section */}
          {activeSection === 'menu' && (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ fontSize: '18px', color: 'var(--color-primary)', margin: 0 }}>
                Manage Menu Items
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-small"
                  onClick={handleDownloadMenuCSV}
                  style={{ background: 'var(--color-text-subtle)' }}
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
                    <small style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
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

            <p style={{ color: 'var(--color-text-subtle)', fontSize: '12px', marginBottom: '12px' }}>
              Drag items to reorder. Drag an item onto a category (no price) to make it a sub-item.
            </p>

            {menuItems.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No menu items yet.</p>
            ) : (
              <div>
                {menuItems.map((item, index) => (
                  <div key={item.id} style={{ position: 'relative', marginBottom: '8px' }}>
                    {/* Drop indicator before item */}
                    {dropIndicator?.itemId === item.id && dropIndicator?.position === 'before' && dropIndicator?.parentId === null && (
                      <div style={{
                        height: '4px',
                        background: 'var(--color-primary)',
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
                        background: dropIndicator?.itemId === item.id && dropIndicator?.position === 'into' ? 'rgba(34, 197, 94, 0.15)' : 'var(--color-bg-input)',
                        padding: '12px',
                        borderRadius: '8px',
                        cursor: editingMenuItemId === item.id ? 'default' : 'grab',
                        opacity: draggedItem?.id === item.id ? 0.5 : 1,
                        border: dropIndicator?.itemId === item.id && dropIndicator?.position === 'into' ? '2px dashed var(--color-primary)' : '2px solid transparent',
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
                            <label style={{ color: 'var(--color-text-subtle)', fontSize: '12px' }}>Unit Cost:</label>
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
                            <label style={{ color: 'var(--color-text-subtle)', fontSize: '12px', marginLeft: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                          <span style={{ color: 'var(--color-text-subtle)', cursor: 'grab' }}>☰</span>
                          <strong style={{ color: item.active ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                            {item.name}
                          </strong>
                          {item.price !== null && (
                            <>
                              <span style={{ color: 'var(--color-text-muted)', marginLeft: '12px' }}>
                                {formatCurrency(item.price)}
                              </span>
                              {item.unit_cost > 0 && (
                                <span style={{ color: 'var(--color-text-muted)', marginLeft: '6px', fontSize: '11px' }}>
                                  (cost: {formatCurrency(item.unit_cost)})
                                </span>
                              )}
                              {item.is_composite === 1 && (
                                <span style={{
                                  color: 'var(--color-warning)',
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
                                  color: 'var(--color-text-muted)',
                                  marginLeft: '8px',
                                  fontSize: '10px',
                                  fontStyle: 'italic'
                                }}>
                                  (no tracking)
                                </span>
                              )}
                              {item.track_inventory !== 0 && item.quantity_on_hand !== undefined && item.quantity_on_hand !== null && (
                                <span style={{
                                  color: item.quantity_on_hand <= 5 ? 'var(--color-danger)' : 'var(--color-text-muted)',
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
                              <span style={{ color: 'var(--color-text-subtle)', marginLeft: '12px', fontSize: '12px' }}>
                                (Category - {item.subItems?.length || 0} items)
                              </span>
                              {item.subItems && item.subItems.length > 0 && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); toggleCategoryCollapse(item.id); }}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'var(--color-text-muted)',
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
                            <span style={{ color: 'var(--color-text-muted)', marginLeft: '12px', fontSize: '12px' }}>
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
                              style={{ background: item.is_composite ? 'var(--color-warning)' : 'var(--color-text-muted)' }}
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
                                style={{ background: 'var(--color-text-muted)' }}
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
                                style={{ background: 'var(--color-primary)' }}
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
                                background: 'var(--color-primary)',
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
                                borderBottom: '1px solid var(--color-border)',
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
                                  <label style={{ color: 'var(--color-text-subtle)', fontSize: '11px' }}>Cost:</label>
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
                                  <label style={{ color: 'var(--color-text-subtle)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
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
                                <span style={{ color: sub.active ? 'var(--color-text-muted)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <span style={{ color: 'var(--color-text-subtle)', cursor: 'grab', fontSize: '12px' }}>☰</span>
                                  {sub.name} - {formatCurrency(sub.price)}
                                  {sub.unit_cost > 0 && (
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>
                                      (cost: {formatCurrency(sub.unit_cost)})
                                    </span>
                                  )}
                                  {sub.is_composite === 1 && (
                                    <span style={{
                                      color: 'var(--color-warning)',
                                      fontSize: '10px',
                                      background: 'rgba(245, 158, 11, 0.15)',
                                      padding: '1px 4px',
                                      borderRadius: '3px'
                                    }}>
                                      Composite ({sub.components?.length || 0})
                                    </span>
                                  )}
                                  {sub.track_inventory === 0 && (
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '9px', fontStyle: 'italic' }}>
                                      (no track)
                                    </span>
                                  )}
                                  {sub.track_inventory !== 0 && sub.quantity_on_hand !== undefined && sub.quantity_on_hand !== null && (
                                    <span style={{
                                      color: sub.quantity_on_hand <= 5 ? 'var(--color-danger)' : 'var(--color-text-muted)',
                                      fontSize: '10px'
                                    }}>
                                      Stock: {sub.quantity_on_hand}
                                    </span>
                                  )}
                                  {!sub.active && <span style={{ color: 'var(--color-text-muted)', marginLeft: '8px' }}>(Inactive)</span>}
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
                                      background: sub.is_composite ? 'var(--color-warning)' : 'var(--color-text-muted)'
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
                                        style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--color-text-muted)' }}
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
                                        style={{ padding: '4px 8px', fontSize: '12px', background: 'var(--color-primary)' }}
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
                                background: 'var(--color-primary)',
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
                        background: 'var(--color-primary)',
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
              <h2 style={{ marginBottom: '16px', color: 'var(--color-primary)' }}>
                Edit Components: {editingCompositeItem.name}
              </h2>

              {loadingComponents ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-subtle)' }}>Loading components...</p>
              ) : (
                <>
                  <p style={{ color: 'var(--color-text-subtle)', fontSize: '13px', marginBottom: '16px' }}>
                    A composite item is made up of other items. When sold, inventory is deducted from its components.
                    <br />
                    Example: Hot Dog = 1 Bun + 1 Wiener
                  </p>

                  {/* Current Components */}
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ color: 'var(--color-text-muted)', marginBottom: '12px', fontSize: '15px' }}>
                      Current Components
                    </h3>
                    {compositeComponents.length === 0 ? (
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
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
                              background: 'var(--color-bg-input)',
                              borderRadius: '6px'
                            }}
                          >
                            <span style={{ flex: 1, color: 'var(--color-text-muted)' }}>
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
                    <h3 style={{ color: 'var(--color-text-muted)', marginBottom: '12px', fontSize: '15px' }}>
                      Add Component
                    </h3>
                    {availableComponents.length === 0 ? (
                      <p style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
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
                                background: 'var(--color-border)',
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
                      style={{ background: 'var(--color-text-muted)' }}
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
              <h2 style={{ fontSize: '18px', color: 'var(--color-primary)', margin: 0 }}>
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
                  style={{ background: 'var(--color-text-subtle)' }}
                >
                  + Stock Update
                </button>
              </div>
            </div>

            <p style={{ color: 'var(--color-text-subtle)', fontSize: '13px', marginBottom: '16px' }}>
              <strong>New Purchase:</strong> Enter receipts with tax/fees - costs are distributed to calculate true unit costs (reimbursable).<br />
              <strong>Stock Update:</strong> Manual inventory additions without receipts (non-reimbursable).
            </p>

            {/* Purchase History */}
            <h3 style={{ marginBottom: '12px', fontSize: '16px', color: 'var(--color-text-muted)' }}>
              Recent Purchases
            </h3>
            {purchases.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-subtle)' }}>No purchases yet.</p>
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
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                          {formatCurrency(purchase.total)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              className="btn btn-small"
                              onClick={() => loadPurchaseForEdit(purchase.id)}
                              disabled={loadingPurchaseDetails}
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                            >
                              {loadingPurchaseDetails ? '...' : 'View/Edit'}
                            </button>
                            <button
                              className="btn btn-danger btn-small"
                              onClick={() => handleDeletePurchase(purchase.id)}
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                            >
                              Delete
                            </button>
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

        {/* Purchase Form Modal */}
        {showPurchaseForm && (
          <div className="pos-modal-overlay" onClick={resetPurchaseForm}>
            <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '16px' }}>New Purchase Entry</h3>

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

                {/* Line Items Header with Quick Add */}
                <div className="purchase-toolbar">
                  <h4 style={{ color: 'var(--color-text-muted)', margin: 0 }}>Line Items</h4>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {purchaseTemplates.length > 0 && (
                      <select
                        className="quick-add-select"
                        value=""
                        onChange={(e) => handleQuickAddTemplate(e.target.value)}
                      >
                        <option value="">Quick Add Template...</option>
                        {purchaseTemplates.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.item_count} items)</option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      className="btn btn-small"
                      onClick={() => setShowCreateTemplateModal(true)}
                      title="Save current items as template"
                    >
                      Save Template
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)', marginBottom: '8px' }}>
                  <strong>Keyboard:</strong> ↑↓ navigate rows • Enter confirms row • Esc unlocks row • Tab between fields
                </div>

                {/* Spreadsheet Table */}
                <div style={{ overflowX: 'auto' }}>
                  <table className="purchase-spreadsheet">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th style={{ textAlign: 'center' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Line $</th>
                        <th style={{ textAlign: 'right' }}>CRV/ea</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                        <th style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {purchaseFormData.items.map((item, index) => {
                        const rowTotal = (parseFloat(item.lineTotal) || 0) + ((parseFloat(item.crvPerUnit) || 0) * (parseInt(item.quantity) || 0));
                        return (
                          <tr
                            key={index}
                            ref={el => purchaseRowRefs.current[index] = el}
                            tabIndex={0}
                            onKeyDown={(e) => handlePurchaseKeyDown(e, index)}
                            onFocus={() => setFocusedRowIndex(index)}
                            className={`${focusedRowIndex === index ? 'focused-row' : ''} ${confirmedRows.has(index) ? 'confirmed-row' : ''}`}
                          >
                            {/* Item Cell */}
                            <td className="item-cell">
                              {item.menuItemId ? (
                                <div className="purchase-item-selected">
                                  <span>{item.itemName || getAllPurchaseItems().all.find(m => m.id === parseInt(item.menuItemId))?.name}</span>
                                  <button type="button" onClick={() => handleClearPurchaseItemLink(index)}>✕</button>
                                </div>
                              ) : (
                                <>
                                  <input
                                    type="text"
                                    className="spreadsheet-input"
                                    value={purchaseItemSearchQueries[index] || ''}
                                    onChange={(e) => {
                                      setPurchaseItemSearchQueries(prev => ({ ...prev, [index]: e.target.value }));
                                      setPurchaseItemDropdownOpen(index);
                                    }}
                                    onFocus={() => setPurchaseItemDropdownOpen(index)}
                                    placeholder="Search item..."
                                  />
                                  {purchaseItemDropdownOpen === index && (
                                    <div className="purchase-item-dropdown">
                                      {(() => {
                                        const { sellableItems, supplyItems } = getFilteredPurchaseItems(purchaseItemSearchQueries[index]);
                                        const hasResults = sellableItems.length > 0 || supplyItems.length > 0;
                                        const searchQuery = purchaseItemSearchQueries[index] || '';
                                        return (
                                          <>
                                            {sellableItems.length > 0 && (
                                              <>
                                                <div className="purchase-item-dropdown-header">MENU ITEMS</div>
                                                {sellableItems.map(mi => (
                                                  <div key={mi.id} className="purchase-item-dropdown-option" onClick={() => handleSelectPurchaseItem(index, mi)}>
                                                    {mi.name}
                                                  </div>
                                                ))}
                                              </>
                                            )}
                                            {supplyItems.length > 0 && (
                                              <>
                                                <div className="purchase-item-dropdown-header">SUPPLIES</div>
                                                {supplyItems.map(mi => (
                                                  <div key={mi.id} className="purchase-item-dropdown-option" onClick={() => handleSelectPurchaseItem(index, mi)} style={{ color: 'var(--color-text-muted)' }}>
                                                    {mi.name} <span style={{ fontSize: '10px' }}>(supply)</span>
                                                  </div>
                                                ))}
                                              </>
                                            )}
                                            <div className="purchase-item-dropdown-option" onClick={() => openQuickCreateModal(index, searchQuery)}>
                                              + Create "{searchQuery || 'new item'}"
                                            </div>
                                            {searchQuery && (
                                              <div className="purchase-item-dropdown-option" onClick={() => {
                                                handlePurchaseItemChange(index, 'itemName', searchQuery);
                                                setPurchaseItemSearchQueries(prev => ({ ...prev, [index]: '' }));
                                                setPurchaseItemDropdownOpen(null);
                                              }} style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
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
                              {!item.menuItemId && item.itemName && (
                                <div className="purchase-unlinked-warning">⚠ {item.itemName}</div>
                              )}
                            </td>

                            {/* Qty Cell */}
                            <td className="qty-cell">
                              <input
                                type="number"
                                className="spreadsheet-input"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handlePurchaseItemChange(index, 'quantity', e.target.value)}
                                placeholder="0"
                                style={{ textAlign: 'center' }}
                              />
                              {purchaseItemHints[index]?.lastQty && (
                                <span className="purchase-hint">L:{purchaseItemHints[index].lastQty}</span>
                              )}
                            </td>

                            {/* Line Total Cell */}
                            <td className="currency-cell">
                              <input
                                type="number"
                                className="spreadsheet-input"
                                step="0.01"
                                min="0"
                                value={item.lineTotal}
                                onChange={(e) => handlePurchaseItemChange(index, 'lineTotal', e.target.value)}
                                placeholder="0.00"
                              />
                            </td>

                            {/* CRV Cell */}
                            <td className="currency-cell">
                              <input
                                type="number"
                                className="spreadsheet-input"
                                step="0.01"
                                min="0"
                                value={item.crvPerUnit}
                                onChange={(e) => handlePurchaseItemChange(index, 'crvPerUnit', e.target.value)}
                                placeholder="0.00"
                              />
                            </td>

                            {/* Total Cell (readonly) */}
                            <td className="total-cell">
                              {formatCurrency(rowTotal)}
                            </td>

                            {/* Actions Cell */}
                            <td className="actions-cell">
                              <button type="button" className="btn btn-small" onClick={() => duplicatePurchaseItem(index)} title="Duplicate">⊕</button>
                              {purchaseFormData.items.length > 1 && (
                                <button type="button" className="btn btn-danger btn-small" onClick={() => removePurchaseItem(index)}>X</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  className="btn btn-small"
                  onClick={addPurchaseItem}
                  style={{ marginBottom: '16px' }}
                >
                  + Add Row
                </button>

                {/* Create Template Modal */}
                {showCreateTemplateModal && (
                  <div className="modal-overlay" onClick={() => setShowCreateTemplateModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                      <h3 style={{ marginBottom: '16px' }}>Save as Template</h3>
                      <div className="form-group">
                        <label>Template Name</label>
                        <input
                          type="text"
                          className="input"
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          placeholder="e.g., Condiments Restock"
                        />
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                        This will save {purchaseFormData.items.filter(i => i.menuItemId || i.itemName).length} items as a reusable template.
                      </p>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn" onClick={() => setShowCreateTemplateModal(false)}>Cancel</button>
                        <button type="button" className="btn btn-primary" onClick={handleSaveAsTemplate}>Save Template</button>
                      </div>
                    </div>
                  </div>
                )}

                <h4 style={{ color: 'var(--color-text-muted)', marginBottom: '8px' }}>Overhead Costs</h4>
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
                  background: 'var(--color-bg-input)',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--color-text-subtle)' }}>Subtotal:</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(calculatePurchaseSubtotal())}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--color-text-subtle)' }}>Overhead:</span>
                    <span style={{ color: 'var(--color-text-muted)' }}>
                      {formatCurrency((parseFloat(purchaseFormData.tax) || 0) + (parseFloat(purchaseFormData.deliveryFee) || 0) + (parseFloat(purchaseFormData.otherFees) || 0))}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                    <span style={{ color: 'var(--color-primary)' }}>Total:</span>
                    <span style={{ color: 'var(--color-primary)' }}>{formatCurrency(calculatePurchaseTotal())}</span>
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

        {/* Edit Purchase Modal */}
        {editingPurchaseId && editingPurchaseData && (
          <div className="pos-modal-overlay" onClick={() => { setEditingPurchaseId(null); setEditingPurchaseData(null); }}>
            <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '16px' }}>Edit Purchase #{editingPurchaseId}</h3>

              <form onSubmit={handleUpdatePurchase}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label>Vendor</label>
                    <input
                      type="text"
                      className="input"
                      value={editingPurchaseData.vendor}
                      onChange={(e) => setEditingPurchaseData(prev => ({ ...prev, vendor: e.target.value }))}
                      placeholder="e.g., Costco"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                    <label>Purchase Date</label>
                    <input
                      type="date"
                      className="input"
                      value={editingPurchaseData.purchaseDate}
                      onChange={(e) => setEditingPurchaseData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <h4 style={{ color: 'var(--color-text-muted)', marginBottom: '8px' }}>Line Items</h4>
                {editingPurchaseData.items.map((item, index) => (
                  <div key={index} style={{
                    background: 'var(--color-bg-input)',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div className="form-group" style={{ flex: 2, minWidth: '150px', marginBottom: 0 }}>
                        <label>Item Name</label>
                        <input
                          type="text"
                          className="input"
                          value={item.itemName}
                          onChange={(e) => handleEditPurchaseItemChange(index, 'itemName', e.target.value)}
                          placeholder="Item name"
                          required
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1, minWidth: '70px', marginBottom: 0 }}>
                        <label>Qty</label>
                        <input
                          type="number"
                          className="input"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleEditPurchaseItemChange(index, 'quantity', e.target.value)}
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
                          onChange={(e) => handleEditPurchaseItemChange(index, 'lineTotal', e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group" style={{ flex: 1, minWidth: '70px', marginBottom: 0 }}>
                        <label>CRV/ea</label>
                        <input
                          type="number"
                          className="input"
                          step="0.01"
                          min="0"
                          value={item.crvPerUnit}
                          onChange={(e) => handleEditPurchaseItemChange(index, 'crvPerUnit', e.target.value)}
                          placeholder="0.05"
                        />
                      </div>
                      {editingPurchaseData.items.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-danger btn-small"
                          onClick={() => removeEditPurchaseItem(index)}
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
                  onClick={addEditPurchaseItem}
                  style={{ marginBottom: '16px' }}
                >
                  + Add Item
                </button>

                <h4 style={{ color: 'var(--color-text-muted)', marginBottom: '8px' }}>Overhead Costs</h4>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  <div className="form-group" style={{ flex: 1, minWidth: '100px', marginBottom: 0 }}>
                    <label>Tax</label>
                    <input
                      type="number"
                      className="input"
                      step="0.01"
                      min="0"
                      value={editingPurchaseData.tax}
                      onChange={(e) => setEditingPurchaseData(prev => ({ ...prev, tax: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: '100px', marginBottom: 0 }}>
                    <label>Delivery Fee</label>
                    <input
                      type="number"
                      className="input"
                      step="0.01"
                      min="0"
                      value={editingPurchaseData.deliveryFee}
                      onChange={(e) => setEditingPurchaseData(prev => ({ ...prev, deliveryFee: e.target.value }))}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1, minWidth: '100px', marginBottom: 0 }}>
                    <label>Other Fees</label>
                    <input
                      type="number"
                      className="input"
                      step="0.01"
                      min="0"
                      value={editingPurchaseData.otherFees}
                      onChange={(e) => setEditingPurchaseData(prev => ({ ...prev, otherFees: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <input
                    type="text"
                    className="input"
                    value={editingPurchaseData.notes}
                    onChange={(e) => setEditingPurchaseData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Optional notes..."
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn" onClick={() => { setEditingPurchaseId(null); setEditingPurchaseData(null); }} style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submittingPurchase}
                    style={{ flex: 1 }}
                  >
                    {submittingPurchase ? 'Saving...' : 'Update Purchase'}
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
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '16px' }}>Create New Item</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginBottom: '16px' }}>
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

                {/* Price field - required for sellable items */}
                {!quickCreateData.isSupply && (
                  <div className="form-group">
                    <label>Selling Price *</label>
                    <input
                      type="number"
                      className="input"
                      step="0.01"
                      min="0"
                      value={quickCreateData.price}
                      onChange={(e) => setQuickCreateData(prev => ({ ...prev, price: e.target.value }))}
                      placeholder="2.00"
                      required
                    />
                    <small style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
                      The price customers pay for this item
                    </small>
                  </div>
                )}

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
                  <small style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
                    Default cost per unit (can be overridden by purchase)
                  </small>
                </div>

                {/* Component linking - add as component of existing item */}
                <div className="form-group">
                  <label>Add as Component of (optional)</label>
                  <select
                    className="input"
                    value={quickCreateData.componentOf}
                    onChange={(e) => setQuickCreateData(prev => ({ ...prev, componentOf: e.target.value }))}
                  >
                    <option value="">-- None (standalone item) --</option>
                    {menuItems.filter(m => m.price !== null && !m.is_supply).map(item => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <small style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>
                    Link this item as an ingredient/component of another menu item
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
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '16px' }}>Manual Stock Update</h3>
              <p style={{ color: 'var(--color-text-subtle)', fontSize: '13px', marginBottom: '16px' }}>
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
            <InventoryStockSection
              inventoryItems={inventoryItems}
              onViewLots={handleViewLots}
              onOpenAdjustment={handleOpenAdjustment}
              onRefresh={refreshInventoryData}
              isRefreshing={refreshingInventory}
              onMarkUsage={handleMarkUsage}
              onToggleLiquid={handleToggleLiquid}
            />
          )}

        {/* Inventory Lots Modal */}
        {selectedInventoryItem && !showAdjustmentForm && (
          <div className="pos-modal-overlay" onClick={handleCloseLotsView}>
            <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', maxHeight: '80vh', overflow: 'auto' }}>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '16px' }}>
                {selectedInventoryItem.name} - FIFO Lots
              </h3>
              <p style={{ color: 'var(--color-text-subtle)', fontSize: '13px', marginBottom: '16px' }}>
                Inventory is sold using FIFO (First In, First Out). Oldest lots are used first.
              </p>

              {inventoryLots.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-subtle)' }}>No inventory lots found.</p>
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
                        <td style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                          {lot.purchase_date}
                          {lot.vendor && <span style={{ color: 'var(--color-text-subtle)', marginLeft: '4px' }}>({lot.vendor})</span>}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                          {lot.quantity_remaining} / {lot.quantity_original}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--color-text-subtle)' }}>
                          {formatCurrency(lot.unit_cost)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {lot.is_reimbursable ? (
                            <span style={{ color: 'var(--color-primary)' }}>Yes</span>
                          ) : (
                            <span style={{ color: 'var(--color-warning)' }}>No</span>
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
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '16px' }}>
                Adjust: {selectedInventoryItem.name}
              </h3>
              <p style={{ color: 'var(--color-text-subtle)', fontSize: '13px', marginBottom: '16px' }}>
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
            <InventoryLotsSection
              inventoryItems={inventoryItems}
              selectedInventoryItem={selectedInventoryItem}
              setSelectedInventoryItem={setSelectedInventoryItem}
              inventoryLots={inventoryLots}
              onFetchLots={fetchInventoryLots}
            />
          )}

          {/* Inventory - Movements */}
          {activeSection === 'inventory' && activeSubSection === 'movements' && (
            <InventoryMovementsSection
              loadingTransactions={loadingTransactions}
              inventoryTransactions={inventoryTransactions}
            />
          )}

          {/* Inventory - Count */}
          {activeSection === 'inventory' && activeSubSection === 'count' && (
            <InventoryCountSection
              inventoryItems={inventoryItems}
              setError={setError}
              setSuccess={setSuccess}
              fetchInventory={fetchInventory}
            />
          )}

          {/* Purchases - Stock Update */}
          {activeSection === 'purchases' && activeSubSection === 'stock' && (
            <div className="card">
              <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--color-primary)' }}>
                Manual Stock Update
              </h2>
              <p style={{ color: 'var(--color-text-subtle)', fontSize: '13px', marginBottom: '16px' }}>
                Add inventory without a receipt. These items are marked as <strong style={{ color: 'var(--color-warning)' }}>non-reimbursable</strong>.
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
                <div className="card"><p style={{ color: 'var(--color-text-subtle)', textAlign: 'center' }}>Loading charges...</p></div>
              ) : (
                <>
                  {/* Summary by Program */}
                  <div className="card" style={{ marginBottom: '16px' }}>
                    <h2 style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--color-primary)' }}>
                      Charges by Program
                    </h2>
                    {programChargesSummary.length === 0 ? (
                      <p style={{ color: 'var(--color-text-subtle)', textAlign: 'center' }}>No charges recorded.</p>
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
                                <td style={{ textAlign: 'right', color: 'var(--color-warning)' }}>{formatCurrency(p.total_comps)}</td>
                                <td style={{ textAlign: 'right', color: 'var(--color-warning)' }}>{formatCurrency(p.total_discounts)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-danger)' }}>{formatCurrency(p.total_charged)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Charge History */}
                  <div className="card">
                    <h2 style={{ marginBottom: '16px', fontSize: '16px', color: 'var(--color-primary)' }}>
                      Recent Charges
                    </h2>
                    {programCharges.length === 0 ? (
                      <p style={{ color: 'var(--color-text-subtle)', textAlign: 'center' }}>No charges recorded yet.</p>
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
                                    background: charge.charge_type === 'comp' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(249, 115, 22, 0.2)',
                                    color: 'var(--color-warning)'
                                  }}>
                                    {charge.charge_type}
                                  </span>
                                </td>
                                <td style={{ textAlign: 'right', color: 'var(--color-danger)' }}>{formatCurrency(charge.amount)}</td>
                                <td style={{ fontSize: '12px', color: 'var(--color-text-subtle)' }}>{charge.reason || '—'}</td>
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
            <ReimbursementSection
              loadingReimbursement={loadingReimbursement}
              reimbursementData={reimbursementData}
              reimbursementLedger={reimbursementLedger}
            />
          )}

          {/* Financials - CashApp */}
          {activeSection === 'financials' && activeSubSection === 'cashapp' && (
            <CashAppSection
              cashAppBalance={cashAppBalance}
              showWithdrawModal={showWithdrawModal}
              setShowWithdrawModal={setShowWithdrawModal}
              withdrawAmount={withdrawAmount}
              setWithdrawAmount={setWithdrawAmount}
              onWithdraw={handleCashAppWithdraw}
            />
          )}

          {/* Financials - Losses */}
          {activeSection === 'financials' && activeSubSection === 'losses' && (
            <LossesSection
              losses={losses}
              lossesSummary={lossesSummary}
              showAddLossForm={showAddLossForm}
              setShowAddLossForm={setShowAddLossForm}
              lossFormData={lossFormData}
              setLossFormData={setLossFormData}
              sessions={sessions}
              programs={programs}
              onAddLoss={handleAddLoss}
              onDeleteLoss={handleDeleteLoss}
            />
          )}

          {/* Reports Section */}
          {activeSection === 'reports' && (
            <ReportsSection
              reportStartDate={reportStartDate}
              setReportStartDate={setReportStartDate}
              reportEndDate={reportEndDate}
              setReportEndDate={setReportEndDate}
              reportSummary={reportSummary}
              loadingReport={loadingReport}
              onFetchReport={fetchReportSummary}
              onClearFilters={() => { setReportStartDate(''); setReportEndDate(''); fetchReportSummary(); }}
              onDownloadReport={downloadReport}
            />
          )}

          {/* Sessions - History */}
          {activeSection === 'sessions' && activeSubSection === 'history' && (
            <SessionHistorySection
              sessions={sessions}
              getStatusBadgeClass={getStatusBadgeClass}
              onViewSession={fetchSessionDetails}
              onDistribute={handleOpenDistribute}
            />
          )}

        {/* Profit Distribution Modal */}
        {showDistributeModal && selectedSession && (
          <div className="pos-modal-overlay" onClick={() => setShowDistributeModal(false)}>
            <div className="pos-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <h3 style={{ color: 'var(--color-primary)', marginBottom: '16px' }}>
                Distribute Profit: {selectedSession.name}
              </h3>

              <div style={{ background: 'var(--color-bg-input)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: 'var(--color-text-subtle)' }}>Session Profit:</span>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>
                    {formatCurrency(selectedSession.profit)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-subtle)' }}>Total Allocated:</span>
                  <span style={{
                    color: Math.abs(getTotalDistribution() - selectedSession.profit) < 0.01 ? 'var(--color-primary)' : 'var(--color-warning)',
                    fontWeight: 'bold'
                  }}>
                    {formatCurrency(getTotalDistribution())}
                  </span>
                </div>
                {Math.abs(getTotalDistribution() - selectedSession.profit) >= 0.01 && (
                  <p style={{ color: 'var(--color-warning)', fontSize: '12px', marginTop: '8px' }}>
                    Remaining: {formatCurrency(selectedSession.profit - getTotalDistribution())}
                  </p>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px' }}>
                  Allocate to Programs:
                </label>
                {programs.map(program => (
                  <div key={program.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px',
                    background: 'var(--color-bg-input)',
                    padding: '8px 12px',
                    borderRadius: '6px'
                  }}>
                    <span style={{ flex: 1, color: 'var(--color-text-muted)' }}>{program.name}</span>
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
                <h3 style={{ color: 'var(--color-primary)', margin: 0 }}>
                  {selectedSession.name}
                  {selectedSession.is_test === 1 && (
                    <span style={{ marginLeft: '8px', padding: '2px 8px', background: 'var(--color-warning)', color: 'var(--color-bg)', fontSize: '12px', borderRadius: '4px' }}>
                      PRACTICE
                    </span>
                  )}
                </h3>
                <button className="btn btn-small" onClick={() => setShowSessionDetails(false)}>Close</button>
              </div>

              {loadingSessionDetails ? (
                <p style={{ textAlign: 'center', color: 'var(--color-text-subtle)' }}>Loading session details...</p>
              ) : (
                <>
                  {/* Session Summary */}
                  <div style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                    <h4 style={{ color: 'var(--color-text-muted)', margin: '0 0 12px 0', fontSize: '14px' }}>Session Summary</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
                      <div>
                        <p style={{ color: 'var(--color-text-subtle)', fontSize: '11px', margin: 0 }}>Program</p>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', margin: 0, fontWeight: 'bold' }}>{selectedSession.program_name}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-text-subtle)', fontSize: '11px', margin: 0 }}>Orders</p>
                        <p style={{ color: 'var(--color-primary)', fontSize: '18px', margin: 0, fontWeight: 'bold' }}>{sessionDetailsData?.total_orders || 0}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-text-subtle)', fontSize: '11px', margin: 0 }}>Revenue</p>
                        <p style={{ color: 'var(--color-primary)', fontSize: '18px', margin: 0, fontWeight: 'bold' }}>{formatCurrency(sessionDetailsData?.total_revenue || 0)}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-text-subtle)', fontSize: '11px', margin: 0 }}>Profit</p>
                        <p style={{ color: selectedSession.profit >= 0 ? 'var(--color-primary)' : 'var(--color-danger)', fontSize: '18px', margin: 0, fontWeight: 'bold' }}>
                          {formatCurrency(selectedSession.profit || 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Cash Flow */}
                  <div style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                    <h4 style={{ color: 'var(--color-text-muted)', margin: '0 0 12px 0', fontSize: '14px' }}>Cash Flow</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-text-subtle)' }}>Starting Cash:</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(selectedSession.start_total || 0)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--color-text-subtle)' }}>Ending Cash:</span>
                        <span style={{ color: 'var(--color-text-muted)' }}>{formatCurrency(selectedSession.end_total || 0)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Revenue by Payment Method */}
                  <div style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                    <h4 style={{ color: 'var(--color-text-muted)', margin: '0 0 12px 0', fontSize: '14px' }}>Revenue by Payment Method</h4>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 100px', background: 'rgba(34, 197, 94, 0.13)', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                        <p style={{ color: 'var(--color-primary)', fontSize: '10px', margin: '0 0 4px 0' }}>CASH</p>
                        <p style={{ color: 'var(--color-primary)', fontSize: '18px', margin: 0, fontWeight: 'bold' }}>
                          {formatCurrency(sessionDetailsData?.cash_total || 0)}
                        </p>
                      </div>
                      <div style={{ flex: '1 1 100px', background: 'rgba(0, 214, 50, 0.13)', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                        <p style={{ color: 'var(--color-primary)', fontSize: '10px', margin: '0 0 4px 0' }}>CASHAPP</p>
                        <p style={{ color: 'var(--color-primary)', fontSize: '18px', margin: 0, fontWeight: 'bold' }}>
                          {formatCurrency(sessionDetailsData?.cashapp_total || 0)}
                        </p>
                      </div>
                      <div style={{ flex: '1 1 100px', background: 'rgba(107, 28, 209, 0.13)', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
                        <p style={{ color: 'var(--color-primary)', fontSize: '10px', margin: '0 0 4px 0' }}>ZELLE</p>
                        <p style={{ color: 'var(--color-primary)', fontSize: '18px', margin: 0, fontWeight: 'bold' }}>
                          {formatCurrency(sessionDetailsData?.zelle_total || 0)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Discounts & COGS */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px' }}>
                      <h4 style={{ color: 'var(--color-warning)', margin: '0 0 12px 0', fontSize: '14px' }}>Discounts & Comps</h4>
                      <div style={{ fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--color-text-subtle)' }}>Total Discounts:</span>
                          <span style={{ color: 'var(--color-warning)' }}>{formatCurrency(sessionDetailsData?.total_discounts || 0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--color-text-subtle)' }}>Comp Orders:</span>
                          <span style={{ color: 'var(--color-warning)' }}>{sessionDetailsData?.comp_count || 0}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px' }}>
                      <h4 style={{ color: 'var(--color-info)', margin: '0 0 12px 0', fontSize: '14px' }}>Cost of Goods Sold</h4>
                      <div style={{ fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ color: 'var(--color-text-subtle)' }}>Total COGS:</span>
                          <span style={{ color: 'var(--color-info)' }}>{formatCurrency(sessionDetailsData?.total_cogs || 0)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--color-text-subtle)' }}>Reimbursable:</span>
                          <span style={{ color: 'var(--color-info)' }}>{formatCurrency(sessionDetailsData?.total_cogs_reimbursable || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items Sold Breakdown */}
                  {sessionDetailsData?.itemBreakdown && sessionDetailsData.itemBreakdown.length > 0 && (
                    <div style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                      <h4 style={{ color: 'var(--color-text-muted)', margin: '0 0 12px 0', fontSize: '14px' }}>Items Sold</h4>
                      <table style={{ width: '100%', fontSize: '13px' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', color: 'var(--color-text-subtle)', padding: '4px 8px' }}>Item</th>
                            <th style={{ textAlign: 'right', color: 'var(--color-text-subtle)', padding: '4px 8px' }}>Qty</th>
                            <th style={{ textAlign: 'right', color: 'var(--color-text-subtle)', padding: '4px 8px' }}>Revenue</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessionDetailsData.itemBreakdown.map((item, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: '4px 8px', color: 'var(--color-text)' }}>{item.name}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--color-text-muted)' }}>{item.total_quantity}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--color-primary)' }}>{formatCurrency(item.total_sales)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Order History */}
                  <div style={{ background: 'var(--color-bg-input)', padding: '16px', borderRadius: '8px' }}>
                    <h4 style={{ color: 'var(--color-text-muted)', margin: '0 0 12px 0', fontSize: '14px' }}>
                      Order History ({sessionOrders.length} orders)
                    </h4>
                    {sessionOrders.length === 0 ? (
                      <p style={{ color: 'var(--color-text-subtle)', textAlign: 'center', fontSize: '13px' }}>No orders in this session.</p>
                    ) : (
                      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {sessionOrders.map(order => (
                          <div
                            key={order.id}
                            style={{
                              background: 'var(--color-bg)',
                              padding: '10px',
                              borderRadius: '6px',
                              marginBottom: '8px',
                              borderLeft: order.is_comp ? '3px solid var(--color-warning)' : order.discount_amount > 0 ? '3px solid var(--color-warning)' : '3px solid var(--color-primary)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ color: 'var(--color-text-subtle)', fontSize: '11px' }}>
                                  {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span style={{
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  background: order.payment_method === 'cash' ? 'rgba(34, 197, 94, 0.2)' :
                                             order.payment_method === 'cashapp' ? 'rgba(0, 214, 50, 0.2)' : 'rgba(107, 28, 209, 0.2)',
                                  color: order.payment_method === 'cash' ? 'var(--color-primary)' :
                                         order.payment_method === 'cashapp' ? 'var(--color-primary)' : 'rgb(168, 85, 247)'
                                }}>
                                  {order.payment_method === 'cashapp' ? 'CashApp' : order.payment_method === 'zelle' ? 'Zelle' : 'Cash'}
                                </span>
                                {order.is_comp ? (
                                  <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', background: 'rgba(234, 179, 8, 0.2)', color: 'var(--color-warning)' }}>
                                    COMP
                                  </span>
                                ) : null}
                              </div>
                              <span style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '14px' }}>
                                {formatCurrency(order.final_total || order.subtotal)}
                              </span>
                            </div>
                            <p style={{ color: 'var(--color-text)', fontSize: '12px', margin: '4px 0 0 0' }}>
                              {order.items_summary || 'Items not available'}
                            </p>
                            {order.discount_amount > 0 && !order.is_comp && (
                              <p style={{ color: 'var(--color-warning)', fontSize: '11px', margin: '4px 0 0 0' }}>
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
