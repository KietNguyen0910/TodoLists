import { useEffect, useState } from 'react';
import TagInput from '../../tasks/components/TagInput';
import { getSoftwareColor } from '../../../shared/config/softwareConfig';

const SOFTWARE_OPTIONS = ['MYOB', 'Quickbook', 'Xero', 'Reckon'];
const PAYROLL_OPTIONS = [{ value: '', label: 'N/A', color: '#64748b' }, ...SOFTWARE_OPTIONS.map((option) => ({ value: option, label: option, color: getSoftwareColor(option) }))];

function normalizeProperties(properties) {
  return (Array.isArray(properties) ? properties : [])
    .filter((property) => property && typeof property.address === 'string' && property.address.trim())
    .map((property) => ({
      address: property.address.trim(),
      type: property.type === 'Investment' ? 'Investment' : 'Primary',
    }));
}

function normalizeMotorVehicles(motorVehicles) {
  return (Array.isArray(motorVehicles) ? motorVehicles : [])
    .filter((vehicle) => typeof vehicle === 'string' && vehicle.trim())
    .map((vehicle) => vehicle.trim());
}

export default function ClientModal({ isOpen, client, onClose, onSubmit, isSubmitting = false }) {
  const [form, setForm] = useState({ title: '', software: '', payroll: '', properties: [], motorVehicles: [] });
  const [dirtyFields, setDirtyFields] = useState(new Set());
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyType, setPropertyType] = useState('Primary');

  useEffect(() => {
    if (!isOpen || !client) return;

    setForm({
      title: client.name,
      software: client.sharedSoftware ?? '',
      payroll: PAYROLL_OPTIONS.some((option) => option.value === client.sharedPayroll) ? client.sharedPayroll : '',
      properties: normalizeProperties(client.properties),
      motorVehicles: normalizeMotorVehicles(client.motorVehicles),
    });
    setDirtyFields(new Set());
    setPropertyAddress('');
    setPropertyType('Primary');
  }, [client, isOpen]);

  if (!isOpen || !client) return null;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setDirtyFields((current) => new Set(current).add(field));
  };
  const addProperty = () => {
    const address = propertyAddress.trim();
    if (!address) return;

    updateField('properties', [...form.properties, { address, type: propertyType }]);
    setPropertyAddress('');
  };
  const removeProperty = (index) => updateField('properties', form.properties.filter((_, propertyIndex) => propertyIndex !== index));
  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const pendingAddress = propertyAddress.trim();
    const fieldsToSubmit = new Set(dirtyFields);
    const values = {
      ...form,
      properties: pendingAddress ? [...form.properties, { address: pendingAddress, type: propertyType }] : form.properties,
    };
    if (pendingAddress) fieldsToSubmit.add('properties');
    if (fieldsToSubmit.has('title') && !values.title.trim()) return;

    const updates = [...fieldsToSubmit].reduce((result, field) => ({ ...result, [field]: values[field] }), {});
    onSubmit({ clientName: client.name, updates });
  };

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }}>
      <div className="modal-card client-modal" role="dialog" aria-modal="true" aria-labelledby="client-modal-title">
        <div className="modal-header">
          <h2 id="client-modal-title">Edit Client</h2>
          <button className="modal-close" type="button" aria-label="Close" disabled={isSubmitting} onClick={onClose}>&times;</button>
        </div>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label>Client<input value={form.title} disabled={isSubmitting} onChange={(event) => updateField('title', event.target.value)} required /></label>
          <label>Select Software
            <select value={form.software} disabled={isSubmitting} onChange={(event) => updateField('software', event.target.value)} style={{ color: form.software ? getSoftwareColor(form.software) : undefined }}>
              <option value="">{client.hasMixedSoftware ? 'Multiple values - choose to update' : 'Select software'}</option>
              {SOFTWARE_OPTIONS.map((option) => <option className="font-semibold" key={option} value={option} style={{ color: getSoftwareColor(option) }}>{option}</option>)}
            </select>
          </label>
          <label>Payroll
            <select value={form.payroll} disabled={isSubmitting} onChange={(event) => updateField('payroll', event.target.value)} style={{ color: PAYROLL_OPTIONS.find((option) => option.value === form.payroll)?.color }}>
              {PAYROLL_OPTIONS.map((option) => <option className="font-semibold" key={option.value} value={option.value} style={{ color: option.color }}>{option.label}</option>)}
            </select>
            {client.hasMixedPayroll && form.payroll === '' && <small className="field-hint">Multiple values - choose to update</small>}
          </label>
          <div className="form-field">
            <span>Property</span>
            <input value={propertyAddress} placeholder="Enter property address" disabled={isSubmitting} onChange={(event) => setPropertyAddress(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addProperty(); } }} />
            <div className="radio-group" role="radiogroup" aria-label="Property type">
              <label className={`radio-option ${propertyType === 'Primary' ? 'is-selected' : ''}`}><input type="radio" name="clientPropertyType" checked={propertyType === 'Primary'} disabled={isSubmitting} onChange={() => setPropertyType('Primary')} /> Primary</label>
              <label className={`radio-option ${propertyType === 'Investment' ? 'is-selected' : ''}`}><input type="radio" name="clientPropertyType" checked={propertyType === 'Investment'} disabled={isSubmitting} onChange={() => setPropertyType('Investment')} /> Investment</label>
            </div>
            <button className="button-secondary property-add-button" type="button" disabled={isSubmitting || !propertyAddress.trim()} onClick={addProperty}>Add property</button>
            {form.properties.length > 0 && <ul className="property-list">{form.properties.map((property, index) => <li key={`${property.address}-${index}`}><span><strong>{property.address}</strong><em>{property.type}</em></span><button type="button" aria-label={`Remove ${property.address}`} disabled={isSubmitting} onClick={() => removeProperty(index)}>&times;</button></li>)}</ul>}
          </div>
          <div className="form-field">
            <span>Motor Vehicle</span>
            <TagInput value={form.motorVehicles} disabled={isSubmitting} placeholder="Enter a motor vehicle and press Enter" onChange={(motorVehicles) => updateField('motorVehicles', motorVehicles)} />
          </div>
          <div className="modal-actions">
            <button className="button-secondary" type="button" disabled={isSubmitting} onClick={onClose}>Cancel</button>
            <button className="button-primary button-loading" type="submit" disabled={isSubmitting || dirtyFields.size === 0 && !propertyAddress.trim()}>{isSubmitting ? 'Saving...' : 'Update Client'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
