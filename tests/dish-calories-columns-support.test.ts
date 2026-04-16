/**
 * Unit tests for graceful-degradation helpers used when calories columns
 * may be missing from PostgREST / DB (US11 migration not applied yet).
 */
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

import {
  isMissingDishCaloriesColumnsError,
  stripDishCaloriesFields,
} from '@/lib/dish-calories-columns-support';

describe('isMissingDishCaloriesColumnsError', () => {
  it('returns false for null', () => {
    expect(isMissingDishCaloriesColumnsError(null)).toBe(false);
  });

  it('returns false when message does not mention calorie columns', () => {
    expect(isMissingDishCaloriesColumnsError({ message: 'relation does not exist' } as any)).toBe(false);
  });

  it('returns false when calories columns are mentioned but not as missing-column errors', () => {
    expect(
      isMissingDishCaloriesColumnsError({
        message: 'calories_manual is required',
      } as any),
    ).toBe(false);
  });

  it('returns true for PostgREST schema cache error on calories_estimated', () => {
    expect(
      isMissingDishCaloriesColumnsError({
        message: 'Could not find the calories_estimated column of restaurant_menu_dishes in the schema cache',
      } as any),
    ).toBe(true);
  });

  it('returns true for calories_manual column does not exist', () => {
    expect(
      isMissingDishCaloriesColumnsError({
        message: 'column calories_manual does not exist',
      } as any),
    ).toBe(true);
  });
});

describe('stripDishCaloriesFields', () => {
  it('removes calories_manual and calories_estimated', () => {
    const row = {
      id: 'd1',
      name: 'Soup',
      calories_manual: 100,
      calories_estimated: 200,
    };
    const out = stripDishCaloriesFields(row);
    expect(out).toEqual({ id: 'd1', name: 'Soup' });
    expect('calories_manual' in out).toBe(false);
    expect('calories_estimated' in out).toBe(false);
  });

  it('passes through rows without calorie keys', () => {
    const row = { id: 'd1', name: 'Soup' };
    expect(stripDishCaloriesFields(row)).toEqual(row);
  });
});
