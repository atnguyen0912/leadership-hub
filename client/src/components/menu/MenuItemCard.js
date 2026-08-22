import React, { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

function MenuItemCard({ item, category, components = [], onEdit, onDelete, isEditing, editState, onEditChange, onEditSave, onEditCancel }) {
  const [priceHistory, setPriceHistory] = useState(null);
  const [showPriceHistory, setShowPriceHistory] = useState(false);

  const togglePriceHistory = async () => {
    if (showPriceHistory) {
      setShowPriceHistory(false);
      return;
    }
    if (!priceHistory) {
      try {
        const res = await fetch(`/api/menu/${item.id}/price-history`);
        const data = await res.json();
        setPriceHistory(data);
      } catch {
        setPriceHistory([]);
      }
    }
    setShowPriceHistory(true);
  };

  // Determine icon based on item type
  const getItemIcon = () => {
    const itemType = item.item_type || category;
    switch (itemType) {
      case 'composite': return '🍔';
      case 'ingredient': return '🧅';
      case 'bulk_ingredient': return '📦';
      case 'sellable':
      default:
        if (item.is_liquid === 1) return '🥤';
        return '🏷️';
    }
  };

  // Get item type badge
  const getItemTypeBadge = () => {
    const itemType = item.item_type || category;
    const badges = {
      sellable: { label: 'Sellable', color: '#22c55e', bg: '#dcfce7' },
      composite: { label: 'Composite', color: '#8b5cf6', bg: '#ede9fe' },
      ingredient: { label: 'Ingredient', color: '#f59e0b', bg: '#fef3c7' },
      bulk_ingredient: { label: 'Bulk', color: '#3b82f6', bg: '#dbeafe' }
    };
    const badge = badges[itemType] || badges.sellable;
    return (
      <span style={{
        fontSize: '10px',
        padding: '2px 6px',
        borderRadius: '4px',
        backgroundColor: badge.bg,
        color: badge.color,
        fontWeight: '600',
        whiteSpace: 'nowrap'
      }}>
        {badge.label}
      </span>
    );
  };

  // Determine stock status indicator
  const getStockIndicator = () => {
    if (!item.track_inventory || item.quantity_on_hand === undefined || item.quantity_on_hand === null) {
      return null;
    }

    const qty = item.quantity_on_hand;
    const isBulk = item.item_type === 'bulk_ingredient' || item.is_supply === 1;
    let color, status;

    if (qty === 0) {
      color = '#ef4444'; // red
      status = 'Out of Stock';
    } else if (qty <= (isBulk ? 2 : 20)) {
      color = '#f59e0b'; // orange/yellow
      status = 'Low Stock';
    } else {
      color = '#22c55e'; // green
      status = 'In Stock';
    }

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: color
      }}>
        <span style={{ fontSize: '10px' }}>
          {qty === 0 ? '🔴' : qty <= (isBulk ? 2 : 20) ? '🟡' : '🟢'}
        </span>
        <span>
          {isBulk && item.container_name
            ? `${qty} ${item.container_name}${qty !== 1 ? 's' : ''}`
            : `${qty} units`}
        </span>
      </div>
    );
  };

  // Get verification status indicator
  const getVerificationIndicator = () => {
    if (!item.inventory_confidence) return null;

    const indicators = {
      verified: { icon: '🟢', label: 'Verified' },
      estimated: { icon: '🟡', label: 'Estimated' },
      stale: { icon: '🔴', label: 'Needs Check' },
      never: { icon: '⚪', label: 'Never Verified' }
    };
    const indicator = indicators[item.inventory_confidence];
    if (!indicator) return null;

    return (
      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
        {indicator.icon} {indicator.label}
      </div>
    );
  };

  // Get category class for border color
  const getCategoryClass = () => {
    const itemType = item.item_type || category;
    switch (itemType) {
      case 'sellable':
        return 'menu-card-sellable';
      case 'composite':
        return 'menu-card-composite';
      case 'ingredient':
        return 'menu-card-ingredient';
      case 'bulk_ingredient':
        return 'menu-card-bulk';
      case 'supply':
        return 'menu-card-supply';
      default:
        return '';
    }
  };

  return (
    <div className={`menu-item-card ${getCategoryClass()}`}>
      {/* Header */}
      <div className="menu-card-header">
        <div className="menu-card-title">
          <span className="menu-card-icon">{getItemIcon()}</span>
          <span className="menu-card-name">{item.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {getItemTypeBadge()}
          <div className="menu-card-price">
            {item.price !== null ? formatCurrency(item.price) :
             item.cost_per_container ? `${formatCurrency(item.cost_per_container)}/container` :
             item.unit_cost ? formatCurrency(item.unit_cost) : '-'}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="menu-card-details">
        {/* Bulk ingredient info */}
        {(item.item_type === 'bulk_ingredient' || item.is_supply === 1) && item.container_name && (
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>
            📦 {item.container_name} • ~{item.servings_per_container || '?'} servings each
          </div>
        )}

        {/* Recipe info for composite items */}
        {(item.item_type === 'composite' || item.is_composite === 1) && components && components.length > 0 && (
          <div className="menu-card-recipe">
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-subtle)' }}>
              Recipe:
            </span>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {components.map((c, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  • {c.quantity || '~'}x {c.component_name}
                  {c.is_bulk === 1 && (
                    <span style={{ fontSize: '9px', color: '#3b82f6', fontStyle: 'italic' }}>
                      (bulk)
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stock count for tracked items */}
        {getStockIndicator()}

        {/* Verification status */}
        {getVerificationIndicator()}

        {/* Unit cost display for ingredients */}
        {(item.item_type === 'ingredient' || category === 'ingredient') && item.unit_cost > 0 && (
          <div style={{ fontSize: '11px', color: 'var(--color-text-subtle)' }}>
            Unit Cost: {formatCurrency(item.unit_cost)}
          </div>
        )}

        {/* Price History */}
        {item.price !== null && (
          <div style={{ marginTop: '4px' }}>
            <button
              onClick={togglePriceHistory}
              style={{
                fontSize: '11px',
                color: 'var(--color-primary)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {showPriceHistory ? 'Hide' : 'Show'} price history
            </button>
            {showPriceHistory && priceHistory && (
              priceHistory.length === 0 ? (
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  No price changes recorded
                </div>
              ) : (
                <div style={{ marginTop: '4px', fontSize: '11px' }}>
                  {priceHistory.map((entry, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '2px 0',
                      borderBottom: idx < priceHistory.length - 1 ? '1px solid var(--color-border)' : 'none',
                      color: 'var(--color-text-subtle)'
                    }}>
                      <span>
                        {entry.old_price != null ? formatCurrency(entry.old_price) : 'N/A'}
                        {' → '}
                        {entry.new_price != null ? formatCurrency(entry.new_price) : 'N/A'}
                      </span>
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(entry.changed_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* Inactive indicator */}
        {!item.active && (
          <div style={{
            fontSize: '11px',
            color: '#94a3b8',
            fontStyle: 'italic',
            marginTop: '4px'
          }}>
            Inactive
          </div>
        )}
      </div>

      {/* Edit Form or Actions */}
      {isEditing && editState ? (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '10px', marginTop: '6px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <input
              className="input"
              value={editState.name}
              onChange={(e) => onEditChange({ ...editState, name: e.target.value })}
              placeholder="Item name"
              style={{ fontSize: '13px', padding: '6px 8px' }}
            />
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--color-text-subtle)', marginBottom: '3px' }}>Type</label>
              <select
                className="input"
                value={editState.itemType || 'sellable'}
                onChange={(e) => onEditChange({ ...editState, itemType: e.target.value })}
                style={{ fontSize: '12px', padding: '5px 8px', width: '100%', boxSizing: 'border-box' }}
              >
                <option value="sellable">Sellable</option>
                <option value="composite">Composite</option>
                <option value="ingredient">Ingredient</option>
                <option value="bulk_ingredient">Bulk Ingredient</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-primary)', marginBottom: '4px' }}>
                Sell Price
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-primary)', fontWeight: '600', fontSize: '15px' }}>$</span>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={editState.price}
                  onChange={(e) => onEditChange({ ...editState, price: e.target.value })}
                  placeholder="0.00"
                  style={{ fontSize: '16px', fontWeight: '600', padding: '8px 8px 8px 24px', width: '100%', boxSizing: 'border-box', border: '2px solid var(--color-primary)', borderRadius: '6px' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                Unit Cost:
              </label>
              <input
                className="input"
                type="number"
                step="0.01"
                value={editState.unitCost}
                onChange={(e) => onEditChange({ ...editState, unitCost: e.target.value })}
                placeholder="auto from receipts"
                style={{ fontSize: '12px', padding: '4px 6px', flex: 1, color: 'var(--color-text-muted)' }}
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-subtle)' }}>
              <input
                type="checkbox"
                checked={editState.trackInventory}
                onChange={(e) => onEditChange({ ...editState, trackInventory: e.target.checked })}
              />
              Track Inventory
            </label>
            {editState.defaultCogs != null && editState.defaultCogs !== editState.unitCost && (
              <button
                type="button"
                onClick={() => onEditChange({ ...editState, unitCost: editState.defaultCogs })}
                style={{
                  fontSize: '11px', padding: '3px 8px', border: '1px solid var(--color-border)',
                  borderRadius: '4px', background: 'var(--color-bg)', color: 'var(--color-text-subtle)',
                  cursor: 'pointer', textAlign: 'left'
                }}
              >
                Use purchase COGS: {formatCurrency(parseFloat(editState.defaultCogs))}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            <button
              className="btn btn-primary btn-small"
              onClick={onEditSave}
              style={{ fontSize: '12px', padding: '4px 12px' }}
            >
              Save
            </button>
            <button
              className="btn btn-small"
              onClick={onEditCancel}
              style={{ fontSize: '12px', padding: '4px 12px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="menu-card-actions">
          <button
            className="btn btn-small"
            onClick={() => onEdit(item)}
            title="Edit item"
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              background: 'var(--color-primary)',
              color: 'white'
            }}
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}

export default MenuItemCard;
