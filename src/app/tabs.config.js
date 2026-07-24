export const TASK_TABS = [
  { id: 'information-received', label: 'Information Received', title: 'Information Received', statuses: ['Initial Information Received'] },
  { id: 'todo', label: 'In Progress', title: 'In Progress', statuses: ['In Progress', 'Sent Report to client', 'On hold'] },
  { id: 'waiting-information-request', label: 'Waiting Information Request', title: 'Waiting Information Request', statuses: ['Waiting client', 'Sent query for Manager'] },
  { id: 'waiting-review', label: 'Waiting for Review', title: 'Waiting for Review', statuses: ['Waiting for review'] },
  { id: 'completed', label: 'Completed', title: 'Completed Tasks', statuses: ['Lodged/Completed'] },
  { id: 'out-to-sign', label: 'Out To Sign', title: 'Out To Sign', statuses: ['Out To Sign'] },
  { id: 'singed', label: 'Singed', title: 'Singed', statuses: ['Singed'] },
];

export const REPORT_TAB = { id: 'report', label: 'Report', title: 'Report' };
export const CLIENT_TAB = { id: 'clients', label: 'Client', title: 'Clients' };
export const ALL_TABS = [...TASK_TABS, REPORT_TAB, CLIENT_TAB];
export const TAB_IDS = new Set(ALL_TABS.map((tab) => tab.id));
export const WAITING_STATUSES = new Set(TASK_TABS
  .filter((tab) => tab.id.startsWith('waiting-'))
  .flatMap((tab) => tab.statuses));
