export const SOFTWARE_COLORS = {
  MYOB: '#7919ef',
  Quickbook: '#2ca11c',
  Xero: '#1ab4d7',
  Reckon: '#ff5548',
};

export const SOFTWARE_OPTIONS = Object.keys(SOFTWARE_COLORS);

export function getSoftwareColor(software) {
  return SOFTWARE_COLORS[software] || '#0f172a';
}
