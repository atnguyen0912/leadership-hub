import React from 'react';

const DENOMINATIONS = [
  { key: 'quarters', label: 'Quarters', value: 0.25, dbField: 'quarters' },
  { key: 'bills1', label: '$1 Bills', value: 1, dbField: 'bills_1' },
  { key: 'bills5', label: '$5 Bills', value: 5, dbField: 'bills_5' },
  { key: 'bills10', label: '$10 Bills', value: 10, dbField: 'bills_10' },
  { key: 'bills20', label: '$20 Bills', value: 20, dbField: 'bills_20' },
  { key: 'bills50', label: '$50 Bills', value: 50, dbField: 'bills_50' },
  { key: 'bills100', label: '$100 Bills', value: 100, dbField: 'bills_100' }
];

function DenominationForm({
  values,
  onChange,
  maxValues,
  showAvailable,
  compact
}) {
  const handleChange = (key, value) => {
    onChange({ ...values, [key]: parseInt(value) || 0 });
  };

  if (compact) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
        {DENOMINATIONS.map(denom => (
          <div className="form-group" style={{ marginBottom: 0 }} key={denom.key}>
            <label style={{ fontSize: '12px' }}>{denom.label}</label>
            <input
              type="number"
              className="input"
              min="0"
              value={values[denom.key] || 0}
              onChange={(e) => handleChange(denom.key, e.target.value)}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="denomination-inputs">
      {DENOMINATIONS.map(denom => (
        <div className="form-group" key={denom.key}>
          <label htmlFor={denom.key}>{denom.label}</label>
          <input
            type="number"
            id={denom.key}
            className="input"
            min="0"
            max={maxValues ? maxValues[denom.dbField] || undefined : undefined}
            value={values[denom.key] || 0}
            onChange={(e) => handleChange(denom.key, e.target.value)}
          />
          {showAvailable && maxValues && (
            <small style={{ color: 'var(--color-text-subtle)' }}>
              Available: {maxValues[denom.dbField] || 0}
            </small>
          )}
        </div>
      ))}
    </div>
  );
}

// Helper to calculate total from denomination values
export function calculateDenominationTotal(values) {
  return (
    (values.quarters || 0) * 0.25 +
    (values.bills1 || 0) * 1 +
    (values.bills5 || 0) * 5 +
    (values.bills10 || 0) * 10 +
    (values.bills20 || 0) * 20 +
    (values.bills50 || 0) * 50 +
    (values.bills100 || 0) * 100
  );
}

export default DenominationForm;
