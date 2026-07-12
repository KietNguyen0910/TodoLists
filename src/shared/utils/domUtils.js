export function isInteractiveElement(target) {
  return Boolean(target?.closest?.('button, select, input, textarea, a'));
}
