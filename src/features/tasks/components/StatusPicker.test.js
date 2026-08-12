import { shouldOpenStatusPickerAbove } from './StatusPicker';

describe('status picker placement', () => {
  const tableViewport = { top: 32, bottom: 640 };

  it('opens upward when a row near the bottom has insufficient space below', () => {
    expect(shouldOpenStatusPickerAbove({ top: 520, bottom: 556 }, tableViewport, 420)).toBe(true);
  });

  it('opens downward when a row near the top has sufficient space below', () => {
    expect(shouldOpenStatusPickerAbove({ top: 58, bottom: 94 }, tableViewport, 420)).toBe(false);
  });
});
