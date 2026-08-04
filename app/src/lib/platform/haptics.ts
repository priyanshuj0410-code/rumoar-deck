// iOS Safari does not implement navigator.vibrate; these calls are silent no-ops there.
function buzz(pattern: number | number[]) {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  navigator.vibrate(pattern);
}

export const haptics = {
  tap: () => buzz(8),
  select: () => buzz(12),
  success: () => buzz([10, 40, 10]),
  warn: () => buzz([20, 60, 20]),
};
