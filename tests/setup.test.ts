/**
 * Smoke test — verifies Jest + ts-jest + path alias resolution are working.
 */
import { isAppRole } from '@/lib/app-role';

describe('Jest setup', () => {
  it('runs TypeScript tests', () => {
    const add = (a: number, b: number): number => a + b;
    expect(add(1, 2)).toBe(3);
  });

  it('resolves @/ path aliases', () => {
    expect(isAppRole('diner')).toBe(true);
    expect(isAppRole('unknown')).toBe(false);
  });
});
