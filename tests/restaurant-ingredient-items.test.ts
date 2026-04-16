import {
  ingredientNamesForLegacy,
  MAX_DISH_INGREDIENT_ORIGIN_LEN,
  normalizeIngredientItemsForPersist,
  parseIngredientItemsFromDb,
} from '@/lib/restaurant-ingredient-items';

describe('parseIngredientItemsFromDb', () => {
  it('returns empty for non-array', () => {
    expect(parseIngredientItemsFromDb(null)).toEqual([]);
    expect(parseIngredientItemsFromDb({})).toEqual([]);
  });

  it('parses valid objects and skips bad entries', () => {
    expect(
      parseIngredientItemsFromDb([
        { name: '  garlic  ', origin: ' Spain ' },
        { name: '', origin: 'x' },
        { name: 'salt', origin: '' },
      ]),
    ).toEqual([
      { name: 'garlic', origin: 'Spain' },
      { name: 'salt', origin: null },
    ]);
  });
});

describe('normalizeIngredientItemsForPersist', () => {
  it('trims, drops blank names, coerces empty origin to null', () => {
    const r = normalizeIngredientItemsForPersist([
      { name: '  a  ', origin: '   ' },
      { name: '', origin: 'ignored' },
      { name: 'b', origin: 'local' },
    ]);
    expect(r).toEqual({
      ok: true,
      items: [
        { name: 'a', origin: null },
        { name: 'b', origin: 'local' },
      ],
    });
  });

  it('rejects origin longer than max', () => {
    const r = normalizeIngredientItemsForPersist([
      { name: 'x', origin: 'a'.repeat(MAX_DISH_INGREDIENT_ORIGIN_LEN + 1) },
    ]);
    expect(r.ok).toBe(false);
  });
});

describe('ingredientNamesForLegacy', () => {
  it('maps names', () => {
    expect(
      ingredientNamesForLegacy([
        { name: 'a', origin: null },
        { name: 'b', origin: 'c' },
      ]),
    ).toEqual(['a', 'b']);
  });
});
