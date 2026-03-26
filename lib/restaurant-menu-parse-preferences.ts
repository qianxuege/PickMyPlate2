import { DIETARY_OPTIONS } from '@/lib/diner-preferences';

/**
 * For restaurant parsing we want the backend to allow tag generation
 * for the same chip vocabulary the UI can render (dietary + spice).
 *
 * Backend enforces that generated tags are a subset of "allowed_tags".
 */
export function buildRestaurantMenuParseUserPreferences(): Record<string, unknown> {
  return {
    dietary: [...DIETARY_OPTIONS],
    // Allow tagging only the "Spicy" label for now (matches the provided UI).
    spice_label: 'Spicy',
    budget_tier: null,
    cuisines: [],
    smart_tags: [],
  };
}

