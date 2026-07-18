const TABLE_HEADERS = [
  { label: '', className: 'task-select-column' },
  { label: 'No' },
  { label: 'Assign Date' },
  { label: 'Software' },
  { label: 'Client' },
  { label: 'Task' },
  { label: 'Payroll', className: 'payroll-column' },
  { label: 'Property' },
  { label: 'Motor Vehicle' },
  { label: 'Outcome Achieved', className: 'outcome-column' },
  { label: 'Note', className: 'note-column' },
];

const SKELETON_WIDTHS = ['24px', '28px', '88px', '64px', '150px', '210px', '48px', '120px', '112px', '170px', '220px', '132px'];

export default function TaskTableSkeleton({ showCompletionTime = false }) {
  const headers = showCompletionTime
    ? [...TABLE_HEADERS, { label: 'Completion Date' }, { label: 'Status', className: 'task-status-column' }]
    : [...TABLE_HEADERS, { label: 'Status', className: 'task-status-column' }];

  return (
    <div className="task-list task-table-skeleton-wrap" role="status" aria-label="Loading tasks" aria-busy="true">
      <table className={`task-table task-table-skeleton ${showCompletionTime ? 'has-completion-time' : ''}`} aria-hidden="true">
        <thead>
          <tr>{headers.map((header, index) => <th className={header.className} key={`${header.label}-${index}`}>{header.label}</th>)}</tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }, (_, rowIndex) => (
            <tr key={rowIndex}>
              {headers.map((header, cellIndex) => (
                <td className={header.className} key={`${header.label}-${cellIndex}`}>
                  <span className="task-table-skeleton-bar" style={{ width: SKELETON_WIDTHS[Math.min(cellIndex, SKELETON_WIDTHS.length - 1)] }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
