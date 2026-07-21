import { getClientProfiles, getClientSoftwareByName, getClientSuggestions, getClientSyncCount, getSoftwareSyncCount } from './softwareSync';

describe('client software sync', () => {
  const tasks = [
    { _id: 'active-myob', title: 'Nguyen Family Trust', software: 'MYOB' },
    { _id: 'completed-xero', title: 'nguyen family trust', software: 'Xero', status: 'Lodged/Completed' },
    { _id: 'deleted-xero', title: 'Nguyen Family Trust', software: 'Xero', deleted: true },
  ];

  it('matches active client tasks case-insensitively and includes completed tasks', () => {
    expect(getSoftwareSyncCount(tasks, 'NGUYEN FAMILY TRUST', 'MYOB', 'active-myob')).toBe(1);
  });

  it('does not include deleted tasks in client software values', () => {
    expect([...getClientSoftwareByName(tasks).get('nguyen family trust')]).toEqual(['MYOB', 'Xero']);
  });

  it('counts a task once when any shared client field differs', () => {
    const sharedTasks = [
      { _id: 'same', title: 'Client', payroll: 'MYOB', properties: [{ address: '1 Main St', type: 'Primary' }], motorVehicles: ['Toyota'] },
      { _id: 'different', title: 'client', payroll: 'Xero', properties: [], motorVehicles: ['Mazda'] },
    ];

    expect(getClientSyncCount(sharedTasks, 'CLIENT', {
      payroll: 'MYOB',
      properties: [{ address: '1 Main St', type: 'Primary' }],
      motorVehicles: ['Toyota'],
    }, 'same')).toBe(1);
  });

  it('builds reusable client profiles without deleted data and leaves conflicting fields blank', () => {
    const profiles = getClientProfiles([
      { _id: 'first', title: 'Coast Pty Ltd', software: 'Xero', payroll: 'Xero', properties: [{ address: '1 Main St', type: 'Primary' }], motorVehicles: ['Toyota'] },
      { _id: 'second', title: 'coast pty ltd', software: 'MYOB', payroll: 'Xero', properties: [{ address: '1 Main St', type: 'Primary' }, { address: '2 Beach Rd', type: 'Investment' }], motorVehicles: ['Toyota', 'Mazda'] },
      { _id: 'deleted', title: 'Coast Pty Ltd', software: 'Reckon', payroll: 'Reckon', deleted: true },
    ]);

    expect(profiles).toEqual([{
      key: 'coast pty ltd',
      name: 'Coast Pty Ltd',
      software: '',
      payroll: 'Xero',
      properties: [{ address: '1 Main St', type: 'Primary' }, { address: '2 Beach Rd', type: 'Investment' }],
      motorVehicles: ['Toyota', 'Mazda'],
    }]);
  });

  it('ranks prefix client suggestions before contains matches and limits results', () => {
    const profiles = [
      { key: 'acme', name: 'Acme' },
      { key: 'coastal', name: 'Coastal' },
      { key: 'paper acorn', name: 'Paper Acorn' },
      { key: 'delta', name: 'Delta' },
      { key: 'client 1', name: 'Client 1' },
      { key: 'client 2', name: 'Client 2' },
      { key: 'client 3', name: 'Client 3' },
      { key: 'client 4', name: 'Client 4' },
      { key: 'client 5', name: 'Client 5' },
      { key: 'client 6', name: 'Client 6' },
      { key: 'client 7', name: 'Client 7' },
      { key: 'client 8', name: 'Client 8' },
      { key: 'client 9', name: 'Client 9' },
    ];

    expect(getClientSuggestions(profiles, 'ac').map((profile) => profile.name)).toEqual(['Acme', 'Paper Acorn']);
    expect(getClientSuggestions(profiles, 'client')).toHaveLength(8);
    expect(getClientSuggestions(profiles, '')).toEqual([]);
  });
});
