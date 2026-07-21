import { useDeferredValue, useMemo, useState } from 'react';
import { getSoftwareColor } from '../../../shared/config/softwareConfig';
import { formatPayroll } from '../../../shared/utils/valueFormatters';

function getClientRecords(tasks) {
  const clientsByKey = new Map();

  tasks
    .filter((task) => !(task.deleted || task.isDeleted))
    .forEach((task) => {
      const name = (task.title || '').trim();
      if (!name) return;

      const key = name.toLocaleLowerCase();
      const client = clientsByKey.get(key) || {
        key,
        name,
        taskCount: 0,
        software: new Set(),
        payroll: new Set(),
        properties: new Map(),
        motorVehicles: new Set(),
        softwareValues: new Set(),
        payrollValues: new Set(),
      };

      client.taskCount += 1;
      if (task.software) client.software.add(task.software);
      client.softwareValues.add(task.software || '');
      if (task.payroll) client.payroll.add(task.payroll);
      client.payrollValues.add(task.payroll || '');
      (Array.isArray(task.properties) ? task.properties : []).forEach((property) => {
        if (!property?.address) return;

        const type = property.type === 'Investment' ? 'Investment' : 'Primary';
        client.properties.set(`${property.address}\u0000${type}`, { address: property.address, type });
      });
      (Array.isArray(task.motorVehicles) ? task.motorVehicles : []).forEach((vehicle) => {
        if (vehicle) client.motorVehicles.add(vehicle);
      });

      clientsByKey.set(key, client);
    });

  return [...clientsByKey.values()]
    .map((client) => ({
      ...client,
      software: [...client.software],
      payroll: [...client.payroll],
      properties: [...client.properties.values()],
      motorVehicles: [...client.motorVehicles],
      sharedSoftware: client.softwareValues.size === 1 ? [...client.softwareValues][0] : null,
      sharedPayroll: client.payrollValues.size === 1 ? [...client.payrollValues][0] : null,
      hasMixedSoftware: client.softwareValues.size > 1,
      hasMixedPayroll: client.payrollValues.size > 1,
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

function ValueList({ values, empty = '_' }) {
  return values.length ? values.join(', ') : empty;
}

function SoftwareValueList({ values }) {
  if (!values.length) return '_';

  return values.map((software, index) => (
    <span className="client-software-value" key={software} style={{ color: getSoftwareColor(software) }}>
      {software}{index < values.length - 1 ? ', ' : ''}
    </span>
  ));
}

export default function ClientView({ tasks, onEdit, onRequireLogin, isReadOnly = false }) {
  const [expandedClientKey, setExpandedClientKey] = useState(null);
  const [clientSearch, setClientSearch] = useState('');
  const deferredClientSearch = useDeferredValue(clientSearch);
  const clients = useMemo(() => getClientRecords(tasks), [tasks]);
  const filteredClients = useMemo(() => {
    const keyword = deferredClientSearch.trim().toLocaleLowerCase();
    return keyword ? clients.filter((client) => client.name.toLocaleLowerCase().includes(keyword)) : clients;
  }, [clients, deferredClientSearch]);

  return (
    <div className="client-view">
      <div className="content-header">
        <div className="content-title"><h2>Clients</h2><span className="task-count">({clients.length})</span></div>
      </div>
      <label className="client-search"><span className="visually-hidden">Search client</span><input type="search" placeholder="Search client..." value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} /></label>
      {filteredClients.length ? (
        <div className="client-list">
          {filteredClients.map((client) => {
            const isExpanded = expandedClientKey === client.key;

            return (
              <article className={`client-card ${isExpanded ? 'is-expanded' : ''}`} key={client.key}>
                <button
                  className="client-card-trigger"
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedClientKey((current) => current === client.key ? null : client.key)}
                >
                  <span className="!flex items-center gap-1">
                    <strong>{client.name}</strong>
                    <small>({client.taskCount} task{client.taskCount === 1 ? '' : 's'})</small>
                  </span>
                  <span className="client-card-chevron" aria-hidden="true">{isExpanded ? '-' : '+'}</span>
                </button>
                {isExpanded && (
                  <>
                    <dl className="client-details">
                      <div><dt>Software</dt><dd><SoftwareValueList values={client.software} /></dd></div>
                      <div><dt>Payroll</dt><dd><ValueList values={client.payroll.map(formatPayroll)} /></dd></div>
                      <div><dt>Property</dt><dd>{client.properties.length ? client.properties.map((property) => <span className="client-property-value" key={`${property.address}-${property.type}`}>{property.address}<em>{property.type}</em></span>) : '_'}</dd></div>
                      <div><dt>Motor Vehicle</dt><dd>{client.motorVehicles.length ? client.motorVehicles.map((vehicle) => <span className="motor-vehicle-table-tag" key={vehicle}>{vehicle}</span>) : '_'}</dd></div>
                    </dl>
                    <div className="client-card-actions"><button className="button-secondary" type="button" onClick={() => { if (isReadOnly) onRequireLogin?.('edit clients'); else onEdit?.(client); }}>Edit Client</button></div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      ) : <p className="empty">No clients found.</p>}
    </div>
  );
}
