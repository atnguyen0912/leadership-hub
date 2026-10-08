import React from 'react';
import { formatDate } from '../../utils/formatters';

/**
 * One row per certificate-sized block of hours.
 * @param {object} props - Component props
 * @param {Array} props.groups - Blocks from /api/hours/groups
 */
function GroupTable({ groups }) {
  return (
    <div className="report-table-wrap">
      <table className="report-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>ID</th>
            <th>Role</th>
            <th>Activity</th>
            <th>Dates</th>
            <th className="num">Days</th>
            <th className="num">Span</th>
            <th className="num">Entries</th>
            <th className="num">Total</th>
            <th className="num">Hours</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody>
          {groups.map(group => (
            <tr key={group.id}>
              <td className="report-name">{group.name}</td>
              <td>{group.studentId}</td>
              <td>{group.role}</td>
              <td>{group.activity}</td>
              <td>
                {formatDate(group.startDate)}
                {group.endDate !== group.startDate && ` – ${formatDate(group.endDate)}`}
              </td>
              <td className="num">{group.days}</td>
              <td className="num">{group.spanDays}</td>
              <td className="num">{group.entries}</td>
              <td className="num">{group.totalFormatted}</td>
              <td className="num">{group.totalHours.toFixed(2)}</td>
              <td>{group.byType.map(type => type.label).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default GroupTable;
