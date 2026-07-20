import { useEffect, useState } from 'react';
import DatePickerInput from '../shared/components/DatePickerInput';
import { OUTCOME_PHASES } from '../features/outcomes/config/outcomeConfig';
import { getOutcomeProgress } from '../features/outcomes/logic/outcomeProgress';
import OutcomeMultiSelect from '../features/outcomes/components/OutcomeMultiSelect';
import { getSoftwareColor } from '../shared/config/softwareConfig';
import { getStatusLabel, STATUS_OPTIONS } from '../shared/config/statusConfig';
import { exportTask } from '../features/tasks/utils/taskExport';
import TagInput from '../features/tasks/components/TagInput';

const softwareOptions = ['MYOB', 'Quickbook', 'Xero', 'Reckon'];
const payrollOptions = [{ value: '', label: 'N/A', color: '#64748b' }, ...softwareOptions.map((option) => ({ value: option, label: option, color: getSoftwareColor(option) }))];
const initialForm = { title: '', description: '', outcomeAchieved: [], assignDate: '', deadline: '', notes: '', software: '', payroll: '', properties: [], motorVehicles: [], status: 'Initial Information Received' };

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

function normalizeProperties(properties) {
  if (!Array.isArray(properties)) return [];

  return properties
    .filter((property) => property && typeof property.address === 'string' && property.address.trim())
    .map((property) => ({
      address: property.address.trim(),
      type: property.type === 'Investment' ? 'Investment' : 'Primary',
    }));
}

function normalizeMotorVehicles(motorVehicles) {
  if (!Array.isArray(motorVehicles)) return [];

  return motorVehicles.filter((vehicle) => typeof vehicle === 'string' && vehicle.trim()).map((vehicle) => vehicle.trim());
}

export default function TaskModal({ isOpen, onClose, onSubmit, initialValues, clientSoftwareByName = new Map(), submitLabel = 'Create Task', mode = 'create', isSubmitting = false }) {
  const [form, setForm] = useState(initialForm);
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyType, setPropertyType] = useState('Primary');
  const outcomeProgress = getOutcomeProgress(form.outcomeAchieved);

  useEffect(() => {
    const createInitialForm = { ...initialForm, assignDate: getTodayInputDate() };

    setForm(isOpen ? {
      ...(initialValues ? initialForm : createInitialForm),
      ...(initialValues || {}),
      outcomeAchieved: normalizeOutcomes(initialValues?.outcomeAchieved),
      payroll: payrollOptions.some((option) => option.value === initialValues?.payroll) ? initialValues.payroll : '',
      properties: normalizeProperties(initialValues?.properties),
      motorVehicles: normalizeMotorVehicles(initialValues?.motorVehicles),
    } : initialForm);
    setPropertyAddress('');
    setPropertyType('Primary');
  }, [isOpen, initialValues]);

  const handleChange = ({ target: { name, value } }) => {
    if (name !== 'title' || mode !== 'create') {
      setForm((previous) => ({ ...previous, [name]: value }));
      return;
    }

    const softwareValues = clientSoftwareByName.get(value.trim().toLocaleLowerCase());
    const sharedSoftware = softwareValues?.size === 1 ? [...softwareValues][0] : '';
    setForm((previous) => ({ ...previous, title: value, software: sharedSoftware }));
  };
  const handlePayrollChange = ({ target: { value } }) => setForm((previous) => ({ ...previous, payroll: value }));
  const addProperty = () => {
    const address = propertyAddress.trim();
    if (!address) return;

    setForm((previous) => ({
      ...previous,
      properties: [...previous.properties, { address, type: propertyType }],
    }));
    setPropertyAddress('');
  };
  const removeProperty = (index) => setForm((previous) => ({
    ...previous,
    properties: previous.properties.filter((_, propertyIndex) => propertyIndex !== index),
  }));
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isSubmitting && form.title.trim()) {
      const pendingAddress = propertyAddress.trim();
      onSubmit({
        ...form,
        properties: pendingAddress
          ? [...form.properties, { address: pendingAddress, type: propertyType }]
          : form.properties,
      });
    }
  };
  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget && !isSubmitting) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={handleOverlayClick}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="task-modal-title">
        <div className="modal-header">
          <h2 id="task-modal-title">{mode === 'edit' ? 'Edit Task' : 'New Task'}</h2>
          <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>×</button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label>Client<input name="title" value={form.title} onChange={handleChange} required /></label>
          <label>Task<textarea name="description" value={form.description} onChange={handleChange} rows="3" /></label>
          <label>Outcome Achieved<OutcomeMultiSelect options={OUTCOME_PHASES} value={form.outcomeAchieved} progressLabel={outcomeProgress.label} onChange={(outcomes) => setForm((previous) => ({ ...previous, outcomeAchieved: outcomes }))} /></label>
          <label>Select Software<select name="software" value={form.software} onChange={handleChange} style={{ color: form.software ? getSoftwareColor(form.software) : undefined }}><option value="">Select software</option>{softwareOptions.map((option) => <option className='font-semibold' key={option} value={option} style={{ color: getSoftwareColor(option) }}>{option}</option>)}</select>{mode === 'create' && clientSoftwareByName.get(form.title.trim().toLocaleLowerCase())?.size > 1 && <small className="field-hint">Multiple software values found. Choose one to standardise this client.</small>}</label>
          <label>Payroll<select name="payroll" value={form.payroll} disabled={isSubmitting} onChange={handlePayrollChange} style={{ color: payrollOptions.find((option) => option.value === form.payroll)?.color }}>
            {payrollOptions.map((option) => <option className="font-semibold" key={option.value} value={option.value} style={{ color: option.color }}>{option.label}</option>)}
          </select></label>
          <div className="form-field">
            <span>Property</span>
            <div className="flex gap-3">
              <input value={propertyAddress} placeholder="Enter property address" disabled={isSubmitting} onChange={(event) => setPropertyAddress(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addProperty(); } }} />
              <div className="flex gap-1 radio-group shrink-0" role="radiogroup" aria-label="Property type">
                <label className={`radio-option ${propertyType === 'Primary' ? 'is-selected' : ''}`}><input type="radio" name="propertyType" checked={propertyType === 'Primary'} disabled={isSubmitting} onChange={() => setPropertyType('Primary')} /> Primary</label>
                <label className={`radio-option ${propertyType === 'Investment' ? 'is-selected' : ''}`}><input type="radio" name="propertyType" checked={propertyType === 'Investment'} disabled={isSubmitting} onChange={() => setPropertyType('Investment')} /> Investment</label>
              </div>
            </div>

            <button className="button-secondary property-add-button" type="button" disabled={isSubmitting || !propertyAddress.trim()} onClick={addProperty}>Add property</button>
            {form.properties.length > 0 && <ul className="property-list">{form.properties.map((property, index) => <li key={`${property.address}-${index}`}><span><strong>{property.address}</strong><em>{property.type}</em></span><button type="button" aria-label={`Remove ${property.address}`} disabled={isSubmitting} onClick={() => removeProperty(index)}>×</button></li>)}</ul>}
          </div>
          <div className="form-field">
            <span>Motor Vehicle</span>
            <TagInput value={form.motorVehicles} disabled={isSubmitting} placeholder="Enter a motor vehicle and press Enter" onChange={(motorVehicles) => setForm((previous) => ({ ...previous, motorVehicles }))} />
          </div>
          <label>Assign Date<DatePickerInput name="assignDate" ariaLabel="Assign date" value={form.assignDate} onChange={(assignDate) => setForm((previous) => ({ ...previous, assignDate }))} /></label>
          <label>Deadline<DatePickerInput name="deadline" ariaLabel="Deadline" value={form.deadline} onChange={(deadline) => setForm((previous) => ({ ...previous, deadline }))} /></label>
          <label>Note<textarea name="notes" value={form.notes} onChange={handleChange} rows="6" /></label>
          <label>Status<select name="status" value={form.status} onChange={handleChange}>{STATUS_OPTIONS.map((option) => <option key={option} value={option}>{getStatusLabel(option)}</option>)}</select></label>
          <div className="modal-actions">
            {mode === 'edit' && <button type="button" className="button-secondary" onClick={() => exportTask({ ...initialValues, ...form })} disabled={isSubmitting}>Export</button>}
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
