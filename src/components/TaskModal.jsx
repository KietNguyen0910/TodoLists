import { useEffect, useState } from 'react';
import { STATUS_OPTIONS } from '../statusConfig';
import OutcomeMultiSelect from './OutcomeMultiSelect';

const outcomeOptions = [
  'All bank accounts reconciled', 'No unreconciled transactions remaining', 'Duplicate transactions checked',
  'Bank balances agree to Xero', 'GST coding reviewed for unusual items', 'GST-free / input taxed items checked',
  'Large or unusual transactions reviewed', 'BAS figures agree to reports', 'Suspense account reviewed',
  'Loan accounts reviewed', 'Director loan checked', 'Payroll liabilities reviewed', 'Super payable reviewed',
  'ATO integrated client account checked', 'Payroll reconciled to STP', 'Super reconciled', 'PAYG withholding reviewed',
  'Duplicate payruns checked', 'Major variances investigated', 'Unusual expenses reviewed', 'Personal expenses identified',
  'Correct account coding confirmed', 'Asset balances reasonable', 'Liabilities reviewed', 'GST clearing checked',
  'Loan balances reasonable', 'No obvious negative balances', 'Super accrued matches payroll reports',
  'Super payable reconciled', 'Super paid by quarterly due date', 'Late super payments identified',
  'SGC risk reviewed (if applicable)', 'Clearing account reconciled', 'Super payment evidence sighted',
  'Prepare Working Papers', 'Prepare Financial Statement', 'Prepare Income Tax Return',
];

const softwareOptions = ['MYOB', 'Quickbook', 'Xero', 'Reckon'];
const initialForm = { title: '', description: '', outcomeAchieved: [], assignDate: '', deadline: '', notes: '', software: '', status: 'Initial Information Received' };

function getTodayInputDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeOutcomes(outcomeAchieved) {
  if (Array.isArray(outcomeAchieved)) return outcomeAchieved;
  return outcomeAchieved ? [outcomeAchieved] : [];
}

export default function TaskModal({ isOpen, onClose, onSubmit, initialValues, submitLabel = 'Create Task', mode = 'create', isSubmitting = false }) {
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    const createInitialForm = { ...initialForm, assignDate: getTodayInputDate() };

    setForm(isOpen ? {
      ...(initialValues ? initialForm : createInitialForm),
      ...(initialValues || {}),
      outcomeAchieved: normalizeOutcomes(initialValues?.outcomeAchieved),
    } : initialForm);
  }, [isOpen, initialValues]);

  const handleChange = ({ target: { name, value } }) => setForm((previous) => ({ ...previous, [name]: value }));
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isSubmitting && form.title.trim()) onSubmit(form);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
        <div className="modal-header">
          <h2 id="task-modal-title">{mode === 'edit' ? 'Edit Task' : 'New Task'}</h2>
          <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label>Client<input name="title" value={form.title} onChange={handleChange} required /></label>
          <label>Task<textarea name="description" value={form.description} onChange={handleChange} rows="3" /></label>
          <label>Outcome Achieved<OutcomeMultiSelect options={outcomeOptions} value={form.outcomeAchieved} onChange={(outcomes) => setForm((previous) => ({ ...previous, outcomeAchieved: outcomes }))} /></label>
          <label>Select Software<select name="software" value={form.software} onChange={handleChange}><option value="">Select software</option>{softwareOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <label>Assign Date<input type="date" name="assignDate" value={form.assignDate} onChange={handleChange} /></label>
          <label>Deadline<input type="date" name="deadline" value={form.deadline} onChange={handleChange} /></label>
          <label>Note<textarea name="notes" value={form.notes} onChange={handleChange} rows="3" /></label>
          <label>Status<select name="status" value={form.status} onChange={handleChange}>{STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
          <div className="modal-actions">
            <button type="button" className="button-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="button-primary button-loading" disabled={isSubmitting}>
              {isSubmitting && <span className="loading-spinner" aria-hidden="true" />}
              {isSubmitting ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
