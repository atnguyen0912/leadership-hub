import React from 'react';
import { formatDate } from '../../utils/formatters';
import { getHourTypeColor } from '../../utils/hourTypes';

/**
 * One certificate per student, covering the whole selected period.
 * @param {object} props - Component props
 * @param {Array} props.students - Student summaries from /api/hours/report
 * @param {string} props.yearLabel - School year the report covers
 * @param {boolean} props.allYears - Whether the report spans every year
 */
function StudentCards({ students, yearLabel, allYears }) {
  return (
    <div className="cert-grid">
      {students.map(student => (
        <article className="cert-card" key={student.studentId}>
          <p className="cert-eyebrow">
            Hawkins Leadership · {allYears ? (student.schoolYears.join(', ') || yearLabel) : yearLabel}
          </p>
          <h3 className="cert-name">{student.name}</h3>
          <p className="cert-role">
            {student.role}{student.status === 'Former' ? ' · Former student' : ''}
          </p>

          <p className="cert-hours">{student.totalFormatted}</p>
          <p className="cert-hours-decimal">{student.totalHours.toFixed(2)} service hours</p>

          <dl className="cert-fields">
            <div><dt>Student ID</dt><dd>{student.studentId}</dd></div>
            <div><dt>Entries</dt><dd>{student.entries}</dd></div>
            <div><dt>Days served</dt><dd>{student.daysServed}</dd></div>
            <div>
              <dt>Service period</dt>
              <dd>
                {student.firstDate
                  ? `${formatDate(student.firstDate)} – ${formatDate(student.lastDate)}`
                  : '—'}
              </dd>
            </div>
          </dl>

          <ul className="cert-breakdown">
            {student.byType.filter(type => type.hours > 0).map(type => (
              <li key={type.value}>
                <span className="cert-swatch" style={{ backgroundColor: getHourTypeColor(type.value) }} />
                {type.label}
                <span className="cert-breakdown-value">{type.formatted}</span>
              </li>
            ))}
          </ul>

          {student.activities.length > 0 && (
            <p className="cert-activities">{student.activities.join(' · ')}</p>
          )}

          <p className="cert-signature">Verified by ______________________________ Date ______________</p>
        </article>
      ))}
    </div>
  );
}

export default StudentCards;
