/**
 * Display rules for dish calories (US11): manual wins over AI estimate.
 */

export function dishCaloriesPrimaryText(
  caloriesManual: number | null | undefined,
  caloriesEstimated: number | null | undefined,
): string {
  const manual = normalizeCalories(caloriesManual);
  if (manual !== null) return `${manual} cal`;
  const est = normalizeCalories(caloriesEstimated);
  if (est !== null) return `~${est} cal (estimated)`;
  return 'Calories unavailable';
}

export function dishCaloriesUsesMutedStyle(
  caloriesManual: number | null | undefined,
  caloriesEstimated: number | null | undefined,
): boolean {
  return normalizeCalories(caloriesManual) === null && normalizeCalories(caloriesEstimated) === null;
}

function normalizeCalories(v: number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const n = Math.round(v);
  if (n < 0) return null;
  return n;
}
