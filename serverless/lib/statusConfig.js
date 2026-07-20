const STATUS_MAP = {
  'Lodged/Completed': { label: 'Lodged/Completed', color: '#16a34a', column: 'done' },
  'Waiting for review': { label: 'Waiting for review', color: '#f59e0b', column: 'waiting' },
  'Waiting client': { label: 'Waiting client', color: '#f97316', column: 'waiting' },
  'Sent query for Manager': { label: 'Sent Query to Manager', color: '#7c3aed', column: 'waiting' },
  'In Progress': { label: 'In Progress', color: '#2563eb', column: 'inprogress' },
  'Initial Information Received': { label: 'Initial Information Received', color: '#06b6d4', column: 'inprogress' },
  'On hold': { label: 'On hold', color: '#ef4444', column: 'waiting' },
  'Sent Report to client': { label: 'Sent Report to client', color: '#0f766e', column: 'inprogress' },
};

const STATUS_OPTIONS = Object.keys(STATUS_MAP);

const COLUMN_CONFIG = {
  done: { title: 'Done', borderColor: '#16a34a' },
  inprogress: { title: 'In Progress', borderColor: '#2563eb' },
  waiting: { title: 'Waiting', borderColor: '#6b7280' },
};

module.exports = { STATUS_MAP, STATUS_OPTIONS, COLUMN_CONFIG };
