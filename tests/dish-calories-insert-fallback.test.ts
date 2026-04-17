/**
 * insertDishesWithCaloriesColumnFallback — retry when calories columns are missing (US11 not migrated).
 */
jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

import { supabase } from '@/lib/supabase';
import { insertDishesWithCaloriesColumnFallback } from '@/lib/dish-calories-columns-support';

const mockFrom = supabase.from as jest.Mock;

describe('insertDishesWithCaloriesColumnFallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('inserts once when the first insert succeeds', async () => {
    const insert = jest.fn().mockResolvedValue({ error: null, data: [] });
    mockFrom.mockReturnValue({ insert });
    const rows = [{ id: '1', name: 'A', calories_manual: 1, calories_estimated: 2 }];
    const { error } = await insertDishesWithCaloriesColumnFallback('diner_scanned_dishes', rows);
    expect(error).toBeNull();
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toEqual(rows);
  });

  it('strips calories fields and retries when PostgREST reports missing columns', async () => {
    const missingColErr = {
      message: 'column calories_estimated of relation diner_scanned_dishes does not exist',
    };
    const insert = jest
      .fn()
      .mockResolvedValueOnce({ error: missingColErr, data: null })
      .mockResolvedValueOnce({ error: null, data: [] });
    mockFrom.mockReturnValue({ insert });
    const rows = [
      {
        id: '1',
        section_id: 's',
        calories_manual: 400,
        calories_estimated: 500,
        name: 'Soup',
      },
    ];
    const { error } = await insertDishesWithCaloriesColumnFallback('diner_scanned_dishes', rows);
    expect(error).toBeNull();
    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert.mock.calls[0][0]).toEqual(rows);
    expect(insert.mock.calls[1][0]).toEqual([{ id: '1', section_id: 's', name: 'Soup' }]);
  });

  it('returns the first error when it is not a missing-calories-columns error', async () => {
    const insert = jest.fn().mockResolvedValue({ error: { message: 'permission denied' }, data: null });
    mockFrom.mockReturnValue({ insert });
    const { error } = await insertDishesWithCaloriesColumnFallback('restaurant_menu_dishes', [{}]);
    expect(error?.message).toBe('permission denied');
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
