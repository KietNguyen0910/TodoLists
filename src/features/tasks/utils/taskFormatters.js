import { formatDate, formatDateTime } from '../../../shared/utils/dateUtils';
import { formatPayroll } from '../../../shared/utils/valueFormatters';

export function hexToRgba(hex, alpha = 0.12) {
  const normalized = hex.replace('#', '').length === 3
    ? hex.replace('#', '').split('').map((char) => char + char).join('')
    : hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);

  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

export function formatTaskDate(value) {
  return formatDate(value, 'No date');
}

export { formatDateTime, formatPayroll };
