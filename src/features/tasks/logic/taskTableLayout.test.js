import { getEmptyTaskTableColumnClasses } from './taskTableLayout';

describe('task table layout', () => {
  it('marks only columns with no data across the visible tasks as empty', () => {
    const classes = getEmptyTaskTableColumnClasses([
      { title: 'Coates Estates', description: 'BAS', software: 'Xero', payroll: false },
      { title: 'Jose Ronquillo', description: 'Tax return', software: '', payroll: null },
    ]);

    expect(classes).toContain('is-property-empty');
    expect(classes).toContain('is-motor-vehicle-empty');
    expect(classes).toContain('is-outcome-empty');
    expect(classes).toContain('is-note-empty');
    expect(classes).not.toContain('is-software-empty');
    expect(classes).not.toContain('is-payroll-empty');
  });
});
