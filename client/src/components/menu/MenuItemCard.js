import React from 'react';
import { formatCurrency } from '../../utils/formatters';

function MenuItemCard({ item, category, components = [], onEdit, onDelete }) {
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

      {/* Actions */}
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
    </div>
  );
}

export default MenuItemCard;
