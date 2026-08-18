import { getStatusLabel, normalizeStatusValue } from './statusConfig';

describe('status display labels', () => {
  it('uses title case labels while retaining legacy persisted values', () => {
    expect(getStatusLabel('Waiting for final Review')).toBe('Waiting for Final Review');
    expect(getStatusLabel('Sent Report to client')).toBe('Sent Report to Client');
    expect(normalizeStatusValue('Waiting for review')).toBe('Waiting for final Review');
  });
});
