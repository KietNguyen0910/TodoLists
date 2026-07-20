import { getClientSoftwareByName, getClientSyncCount, getSoftwareSyncCount } from './softwareSync';

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
});
