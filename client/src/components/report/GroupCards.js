import React from 'react';
import { formatDate } from '../../utils/formatters';
import { getHourTypeColor } from '../../utils/hourTypes';

/**
 * One certificate per block of hours — a week of posters, a month of service.
 * @param {object} props - Component props
 * @param {Array} props.groups - Blocks from /api/hours/groups
 */
function GroupCards({ groups }) {
  return (
    <div className="cert-grid">
      {groups.map(group => (
        <article className="cert-card" key={group.id}>
          <p className="cert-eyebrow">
            Hawkins Leadership · {group.schoolYears.join(', ')}
          </p>
          <h3 className="cert-name">{group.name}</h3>
          <p className="cert-role">
            {group.role}{group.status === 'Former' ? ' · Former student' : ''}
          </p>

          <p className="cert-activity-title">{group.activity}</p>
          <p className="cert-hours">{group.totalFormatted}</p>
          <p className="cert-hours-decimal">
            {group.totalHours.toFixed(2)} hours over {group.days} {group.days === 1 ? 'day' : 'days'}
          </p>

          <dl className="cert-fields">
            <div><dt>Student ID</dt><dd>{group.studentId}</dd></div>
            <div><dt>Entries</dt><dd>{group.entries}</dd></div>
            <div>
              <dt>Dates</dt>
              <dd>
                {formatDate(group.startDate)}
                {group.endDate !== group.startDate && ` – ${formatDate(group.endDate)}`}
              </dd>
            </div>
            <div>
              <dt>Days served</dt>
              <dd>
                {group.days}
                {group.spanDays !== group.days && ` of ${group.spanDays}`}
              </dd>
            </div>
          </dl>

          <ul className="cert-breakdown">
            {group.byType.map(type => (
              <li key={type.value}>
                <span className="cert-swatch" style={{ backgroundColor: getHourTypeColor(type.value) }} />
                {type.label}
                <span className="cert-breakdown-value">{type.formatted}</span>
              </li>
            ))}
          </ul>

          {/* Only worth showing when the block merged more than one spelling or
              covers a category rather than a single named activity. */}
          {(group.items.length > 1 || (group.items.length === 1 && group.items[0] !== group.activity)) && (
            <p className="cert-activities">{group.items.join(' · ')}</p>
          )}

          <p className="cert-signature">Verified by ______________________________ Date ______________</p>
        </article>
      ))}
    </div>
  );
}

export default GroupCards;
