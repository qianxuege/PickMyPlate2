/**
 * US11 — client helpers for manual calorie parsing and Flask estimate-calories API.
 */
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

import Constants from 'expo-constants';

import { supabase } from '@/lib/supabase';
import {
  estimateRestaurantDishCalories,
  parseCaloriesManualInput,
} from '@/lib/restaurant-dish-calories-api';

const mockGetSession = supabase.auth.getSession as jest.Mock;

describe('parseCaloriesManualInput', () => {
  it('returns null for empty or whitespace-only input', () => {
    expect(parseCaloriesManualInput('')).toBeNull();
    expect(parseCaloriesManualInput('   ')).toBeNull();
  });

  it('extracts digits only and parses a plain number', () => {
    expect(parseCaloriesManualInput('450')).toBe(450);
    expect(parseCaloriesManualInput('  1200  ')).toBe(1200);
  });

  it('strips non-digits (labels, commas, units)', () => {
    expect(parseCaloriesManualInput('~450 cal')).toBe(450);
    expect(parseCaloriesManualInput('1,500')).toBe(1500);
  });

  it('returns null when no digits remain', () => {
    expect(parseCaloriesManualInput('none')).toBeNull();
    expect(parseCaloriesManualInput('cal')).toBeNull();
  });

  it('returns null for values below 0 or above 20000', () => {
    expect(parseCaloriesManualInput('-100')).toBeNull();
    expect(parseCaloriesManualInput('20001')).toBeNull();
    expect(parseCaloriesManualInput('99999')).toBeNull();
  });

  it('accepts boundary 0 and 20000', () => {
    expect(parseCaloriesManualInput('0')).toBe(0);
    expect(parseCaloriesManualInput('20000')).toBe(20000);
  });
});

describe('estimateRestaurantDishCalories', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env.EXPO_PUBLIC_MENU_API_URL;
  const extra = Constants.expoConfig?.extra as { menuApiUrl?: string };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as unknown as typeof fetch;
    delete process.env.EXPO_PUBLIC_MENU_API_URL;
    if (extra) extra.menuApiUrl = undefined;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalEnv !== undefined) {
      process.env.EXPO_PUBLIC_MENU_API_URL = originalEnv;
    } else {
      delete process.env.EXPO_PUBLIC_MENU_API_URL;
    }
    if (extra) extra.menuApiUrl = undefined;
  });

  it('returns a structured error when the menu API base URL is missing', async () => {
    const result = await estimateRestaurantDishCalories('dish-1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('EXPO_PUBLIC_MENU_API_URL');
    }
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('prefers EXPO_PUBLIC_MENU_API_URL over expo extra.menuApiUrl', async () => {
    process.env.EXPO_PUBLIC_MENU_API_URL = 'https://api.example.com/';
    if (extra) extra.menuApiUrl = 'https://wrong.example.com';
    mockGetSession.mockResolvedValue({ data: { session: null } });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, calories_estimated: 100 }),
    });

    await estimateRestaurantDishCalories('abc');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/v1/restaurant-dishes/abc/estimate-calories',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('uses extra.menuApiUrl when env is unset', async () => {
    if (!extra) throw new Error('expo-constants mock must expose expoConfig.extra');
    extra.menuApiUrl = 'https://from-extra.dev';
    mockGetSession.mockResolvedValue({ data: { session: null } });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, calories_estimated: 1 }),
    });

    await estimateRestaurantDishCalories('d-1');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://from-extra.dev/v1/restaurant-dishes/d-1/estimate-calories',
      expect.any(Object),
    );
  });

  it('sends Authorization when a session access_token exists', async () => {
    process.env.EXPO_PUBLIC_MENU_API_URL = 'http://localhost:8080';
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'test-jwt' } },
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, calories_estimated: 200 }),
    });

    await estimateRestaurantDishCalories('dish-xyz');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-jwt',
        },
      }),
    );
  });

  it('returns rounded calories_estimated on success', async () => {
    process.env.EXPO_PUBLIC_MENU_API_URL = 'http://localhost:8080';
    mockGetSession.mockResolvedValue({ data: { session: null } });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, calories_estimated: 512.7 }),
    });

    const result = await estimateRestaurantDishCalories('d1');
    expect(result).toEqual({ ok: true, caloriesEstimated: 513 });
  });

  it('returns caloriesEstimated null when API omits or nulls estimate', async () => {
    process.env.EXPO_PUBLIC_MENU_API_URL = 'http://localhost:8080';
    mockGetSession.mockResolvedValue({ data: { session: null } });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, calories_estimated: null }),
    });

    let result = await estimateRestaurantDishCalories('d1');
    expect(result).toEqual({ ok: true, caloriesEstimated: null });

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    result = await estimateRestaurantDishCalories('d2');
    expect(result).toEqual({ ok: true, caloriesEstimated: null });
  });

  it('maps 429 calorie_estimate_rate_limited with retry_after_seconds', async () => {
    process.env.EXPO_PUBLIC_MENU_API_URL = 'http://localhost:8080';
    mockGetSession.mockResolvedValue({ data: { session: null } });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({
        ok: false,
        error: 'calorie_estimate_rate_limited',
        retry_after_seconds: 12,
      }),
    });

    const result = await estimateRestaurantDishCalories('d1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('12');
      expect(result.error.toLowerCase()).toContain('wait');
    }
  });

  it('maps 429 rate limit without numeric retry to a generic wait message', async () => {
    process.env.EXPO_PUBLIC_MENU_API_URL = 'http://localhost:8080';
    mockGetSession.mockResolvedValue({ data: { session: null } });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ ok: false, error: 'calorie_estimate_rate_limited' }),
    });

    const result = await estimateRestaurantDishCalories('d1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('wait');
      expect(result.error).not.toMatch(/\d/);
    }
  });

  it('returns server error string from JSON when present', async () => {
    process.env.EXPO_PUBLIC_MENU_API_URL = 'http://localhost:8080';
    mockGetSession.mockResolvedValue({ data: { session: null } });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ ok: false, error: 'calories_estimate_failed: bad' }),
    });

    const result = await estimateRestaurantDishCalories('d1');
    expect(result).toEqual({ ok: false, error: 'calories_estimate_failed: bad' });
  });

  it('returns HTTP status when response is not ok and JSON has no error string', async () => {
    process.env.EXPO_PUBLIC_MENU_API_URL = 'http://localhost:8080';
    mockGetSession.mockResolvedValue({ data: { session: null } });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });

    const result = await estimateRestaurantDishCalories('d1');
    expect(result).toEqual({ ok: false, error: 'HTTP 503' });
  });

  it('returns Invalid JSON when body is not JSON', async () => {
    process.env.EXPO_PUBLIC_MENU_API_URL = 'http://localhost:8080';
    mockGetSession.mockResolvedValue({ data: { session: null } });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected');
      },
    });

    const result = await estimateRestaurantDishCalories('d1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Invalid JSON');
    }
  });

  it('returns network error message when fetch throws', async () => {
    process.env.EXPO_PUBLIC_MENU_API_URL = 'http://localhost:8080';
    mockGetSession.mockResolvedValue({ data: { session: null } });
    (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await estimateRestaurantDishCalories('d1');
    expect(result).toEqual({ ok: false, error: 'ECONNREFUSED' });
  });
});
