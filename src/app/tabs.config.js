export const TASK_TABS = [
  { id: 'information-received', label: 'Information Received', title: 'Information Received', statuses: ['Initial Information Received'] },
  { id: 'todo', label: 'In Progress', title: 'In Progress', statuses: ['In Progress', 'On hold'] },
  { id: 'waiting-information-request', label: 'Waiting Information Request', title: 'Waiting Information Request', statuses: ['Waiting client', 'Sent query for Manager'] },
  { id: 'waiting-review', label: 'Waiting for Final Review', title: 'Waiting for Final Review', statuses: ['Waiting for final Review', 'Waiting for review'] },
  { id: 'out-to-sign', label: 'Sent Report to Client', title: 'Sent Report to Client', statuses: ['Out To Sign', 'Sent Report to client'] },
  { id: 'completed', label: 'Lodged/Completed', title: 'Lodged/Completed', statuses: ['Lodged/Completed'] },
  { id: 'singed', label: 'Signed', title: 'Signed', statuses: ['Singed'] },
];

export const REPORT_TAB = { id: 'report', label: 'Report', title: 'Report' };
export const CLIENT_TAB = { id: 'clients', label: 'Client', title: 'Clients' };
export const ALL_TABS = [...TASK_TABS, REPORT_TAB, CLIENT_TAB];
export const TAB_IDS = new Set(ALL_TABS.map((tab) => tab.id));
export const WAITING_STATUSES = new Set(TASK_TABS
  .filter((tab) => tab.id.startsWith('waiting-'))
  .flatMap((tab) => tab.statuses));
