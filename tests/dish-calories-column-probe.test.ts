/**
 * Calories-column existence probes — must not cache "exists" on transient errors.
 */
jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

import { supabase } from '@/lib/supabase';
import {
  resetDishCaloriesColumnProbes,
  dinerScannedDishesHasCaloriesColumns,
  restaurantMenuDishesHasCaloriesColumns,
} from '@/lib/dish-calories-columns-support';

const mockFrom = supabase.from as jest.Mock;

describe('dinerScannedDishesHasCaloriesColumns', () => {
  beforeEach(() => {
    resetDishCaloriesColumnProbes();
    jest.clearAllMocks();
  });

  it('caches true only after a successful probe', async () => {
    const limit = jest.fn().mockResolvedValue({ data: [], error: null });
    mockFrom.mockReturnValue({ select: jest.fn().mockReturnThis(), limit });
    await expect(dinerScannedDishesHasCaloriesColumns()).resolves.toBe(true);
    await expect(dinerScannedDishesHasCaloriesColumns()).resolves.toBe(true);
    expect(limit).toHaveBeenCalledTimes(1);
  });

  it('does not cache true on non-missing-column errors; retries probe on next call', async () => {
    const limit = jest
      .fn()
      .mockResolvedValueOnce({ data: [], error: { message: 'JWT expired' } })
      .mockResolvedValueOnce({ data: [], error: null });
    mockFrom.mockReturnValue({ select: jest.fn().mockReturnThis(), limit });
    await expect(dinerScannedDishesHasCaloriesColumns()).resolves.toBe(false);
    await expect(dinerScannedDishesHasCaloriesColumns()).resolves.toBe(true);
    expect(limit).toHaveBeenCalledTimes(2);
  });

  it('returns false on missing-column errors without caching true', async () => {
    const limit = jest.fn().mockResolvedValue({
      data: [],
      error: {
        message: 'Could not find the calories_estimated column of diner_scanned_dishes in the schema cache',
      },
    });
    mockFrom.mockReturnValue({ select: jest.fn().mockReturnThis(), limit });
    await expect(dinerScannedDishesHasCaloriesColumns()).resolves.toBe(false);
    await expect(dinerScannedDishesHasCaloriesColumns()).resolves.toBe(false);
    expect(limit).toHaveBeenCalledTimes(2);
  });
});

describe('restaurantMenuDishesHasCaloriesColumns', () => {
  beforeEach(() => {
    resetDishCaloriesColumnProbes();
    jest.clearAllMocks();
  });

  it('does not cache true on non-missing-column errors', async () => {
    const limit = jest
      .fn()
      .mockResolvedValueOnce({ data: [], error: { message: 'permission denied for table' } })
      .mockResolvedValueOnce({ data: [], error: null });
    mockFrom.mockReturnValue({ select: jest.fn().mockReturnThis(), limit });
    await expect(restaurantMenuDishesHasCaloriesColumns()).resolves.toBe(false);
    await expect(restaurantMenuDishesHasCaloriesColumns()).resolves.toBe(true);
    expect(limit).toHaveBeenCalledTimes(2);
  });
});
