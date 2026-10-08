import React from 'react';
import { formatDate } from '../../utils/formatters';

/**
 * One row per student, covering the whole selected period.
 * @param {object} props - Component props
 * @param {Array} props.students - Student summaries from /api/hours/report
 * @param {Array} props.hourTypes - Hour categories, for the breakdown columns
 */
function StudentTable({ students, hourTypes }) {
  return (
    <div className="report-table-wrap">
      <table className="report-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Student</th>
            <th>ID</th>
            <th>Role</th>
            <th>Status</th>
            <th className="num">Total</th>
            <th className="num">Hours</th>
            <th className="num">Entries</th>
            <th className="num">Days</th>
            <th>First</th>
            <th>Last</th>
            {hourTypes.map(type => <th key={type.value} className="num">{type.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {students.map(student => (
            <tr key={student.studentId}>
              <td>{student.rank}</td>
              <td className="report-name">{student.name}</td>
              <td>{student.studentId}</td>
              <td>{student.role}</td>
              <td>{student.status}</td>
              <td className="num">{student.totalFormatted}</td>
              <td className="num">{student.totalHours.toFixed(2)}</td>
              <td className="num">{student.entries}</td>
              <td className="num">{student.daysServed}</td>
              <td>{student.firstDate ? formatDate(student.firstDate) : '—'}</td>
              <td>{student.lastDate ? formatDate(student.lastDate) : '—'}</td>
              {student.byType.map(type => (
                <td key={type.value} className="num">
                  {type.hours ? type.hours.toFixed(2) : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StudentTable;
