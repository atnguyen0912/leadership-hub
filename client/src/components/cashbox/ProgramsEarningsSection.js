import React from 'react';
import { formatCurrency } from '../../utils/formatters';

function ProgramsEarningsSection({ programsWithEarnings }) {
  const totalEarnings = programsWithEarnings.reduce((sum, p) => sum + p.total_earnings, 0);

  return (
    <div className="card">
      <h2 style={{ marginBottom: '16px', fontSize: '18px', color: 'var(--color-primary)' }}>
        Program Earnings
      </h2>

      {programsWithEarnings.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No programs yet.</p>
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
                    color: program.total_earnings >= 0 ? 'var(--color-primary)' : 'var(--color-danger)',
                    fontWeight: 'bold'
                  }}>
                    {formatCurrency(program.total_earnings)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--color-primary)' }}>
                <td style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>Total</td>
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                  {formatCurrency(totalEarnings)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

export default ProgramsEarningsSection;
