import React from 'react';
import { formatCurrency } from '../../utils/formatters';

function SubMenuModal({
  show,
  parentItem,
  onClose,
  onSelectItem,
  getStockStatus
}) {
  if (!show || !parentItem) return null;

  return (
    <div className="pos-modal-overlay" onClick={onClose}>
      <div className="pos-modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ color: 'var(--color-primary)', marginBottom: '16px' }}>
          Select {parentItem.name}
        </h3>
        <div className="pos-submenu-grid">
          {parentItem.subItems.map((item) => {
            const stockStatus = getStockStatus(item);
            return (
              <button
                key={item.id}
                className={`pos-item-btn ${stockStatus !== 'none' ? `stock-${stockStatus}` : ''}`}
                onClick={() => onSelectItem(item)}
              >
                <div className="pos-item-name">{item.name}</div>
                <div className="pos-item-price">{formatCurrency(item.price)}</div>
                {stockStatus !== 'none' && (
                  <div className={`pos-stock-badge ${stockStatus}`}>
                    {stockStatus === 'out' ? 'OUT' : item.quantity_on_hand}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <button
          className="btn"
          onClick={onClose}
          style={{ marginTop: '16px', width: '100%' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default SubMenuModal;
