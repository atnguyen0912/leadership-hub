import React from 'react';
import { formatCurrency } from '../../utils/formatters';

function MenuItemCard({ item, category, components = [], onEdit, onDelete }) {
  // Determine icon based on item type
  const getItemIcon = () => {
    if (item.is_composite === 1) return '🧩';
    if (item.is_liquid === 1) return '🥤';
    return '📦';
  };

  // Determine stock status indicator
  const getStockIndicator = () => {
    if (!item.track_inventory || item.quantity_on_hand === undefined || item.quantity_on_hand === null) {
      return null;
    }

    const qty = item.quantity_on_hand;
    let color, status;

    if (qty === 0) {
      color = '#ef4444'; // red
      status = 'Out of Stock';
    } else if (qty <= 20) {
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
          {qty === 0 ? '🔴' : qty <= 20 ? '🟡' : '🟢'}
        </span>
        <span>{qty} units</span>
      </div>
    );
  };

  // Get category class for border color
  const getCategoryClass = () => {
    switch (category) {
      case 'sellable':
        return 'menu-card-sellable';
      case 'ingredient':
        return 'menu-card-ingredient';
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
        <div className="menu-card-price">
          {item.price !== null ? formatCurrency(item.price) :
           item.unit_cost ? formatCurrency(item.unit_cost) : '-'}
        </div>
      </div>

      {/* Details */}
      <div className="menu-card-details">
        {/* Recipe info for composite items */}
        {item.is_composite === 1 && components && components.length > 0 && (
          <div className="menu-card-recipe">
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--color-text-subtle)' }}>
              Recipe:
            </span>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {components.map((c, idx) => (
                <div key={idx}>
                  • {c.quantity}x {c.component_name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stock count for tracked items */}
        {getStockIndicator()}

        {/* Unit cost display for ingredients */}
        {category === 'ingredient' && item.unit_cost && (
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
          ⚙️ Edit
        </button>
      </div>
    </div>
  );
}

export default MenuItemCard;
