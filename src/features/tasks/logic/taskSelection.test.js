import { getTaskRangeIds } from './taskSelection';

describe('task range selection', () => {
  const tasks = Array.from({ length: 10 }, (_, index) => ({ _id: String(index + 1) }));

  it('returns every visible task between the anchor and clicked task', () => {
    expect(getTaskRangeIds(tasks, '1', '9')).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
  });

  it('works when the clicked task appears before the anchor', () => {
    expect(getTaskRangeIds(tasks, '9', '7')).toEqual(['7', '8', '9']);
  });
});
