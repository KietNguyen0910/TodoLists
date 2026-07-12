export const STATUS_MAP = {
  'Lodged/Completed': {
    label: 'Lodged/Completed',
    color: '#fff',
    column: 'done',
  },
  'Waiting for review': {
    label: 'Waiting for review',
    color: '#f59e0b',
    column: 'waiting',
  },
  'Waiting client': {
    label: 'Waiting client',
    color: '#f97316',
    column: 'waiting',
  },
  'Sent query for Manager': {
    label: 'Sent query for Manager',
    color: '#7c3aed',
    column: 'waiting',
  },
  'In Progress': {
    label: 'In Progress',
    color: '#1ddb18',
    column: 'inprogress',
  },
  'Initial Information Received': {
    label: 'Initial Information Received',
    color: '#06b6d4',
    column: 'inprogress',
  },
  'On hold': {
    label: 'On hold',
    color: '#ef4444',
    column: 'waiting',
  },
  'Sent Report to client': {
    label: 'Sent Report to client',
    color: '#0f766e',
    column: 'inprogress',
  },
};

export const STATUS_OPTIONS = Object.keys(STATUS_MAP);
