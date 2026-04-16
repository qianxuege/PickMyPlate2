import {
  dishDbToIngredientFormRows,
  fallbackIngredientNamesFromDishName,
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

  it('parses JSON string of an array', () => {
    const json = JSON.stringify([{ name: 'a', origin: 'b' }]);
    expect(parseIngredientItemsFromDb(json)).toEqual([{ name: 'a', origin: 'b' }]);
  });

  it('parses wrapper objects with items or ingredients', () => {
    expect(parseIngredientItemsFromDb({ items: [{ name: 'x' }] })).toEqual([{ name: 'x', origin: null }]);
    expect(parseIngredientItemsFromDb({ ingredients: [{ ingredient: ' y ' }] })).toEqual([
      { name: 'y', origin: null },
    ]);
  });

  it('accepts ingredient as alternate to name', () => {
    expect(parseIngredientItemsFromDb([{ ingredient: 'flour', origin: 'local' }])).toEqual([
      { name: 'flour', origin: 'local' },
    ]);
  });

  it('accepts plain strings in a jsonb array', () => {
    expect(parseIngredientItemsFromDb(['  corn ', 'butter'])).toEqual([
      { name: 'corn', origin: null },
      { name: 'butter', origin: null },
    ]);
  });
});

describe('fallbackIngredientNamesFromDishName', () => {
  it('splits words for simple snacks', () => {
    expect(fallbackIngredientNamesFromDishName('Pop corn')).toEqual(['Pop', 'corn']);
  });

  it('splits on "and" before whitespace', () => {
    expect(fallbackIngredientNamesFromDishName('Fish and chips')).toEqual(['Fish', 'chips']);
  });
});

describe('dishDbToIngredientFormRows', () => {
  it('prefers ingredient_items over legacy ingredients', () => {
    const rows = dishDbToIngredientFormRows({
      ingredient_items: [{ name: 'from items' }],
      ingredients: ['legacy only'],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe('from items');
  });

  it('falls back to legacy ingredients when items empty', () => {
    const rows = dishDbToIngredientFormRows({
      ingredient_items: [],
      ingredients: ['  a  ', 'b'],
    });
    expect(rows.map((r) => r.name)).toEqual(['a', 'b']);
  });

  it('falls back to dish name when DB has no ingredients', () => {
    const rows = dishDbToIngredientFormRows({
      ingredient_items: [],
      ingredients: [],
      name: 'Pop corn',
    });
    expect(rows.map((r) => r.name)).toEqual(['Pop', 'corn']);
  });
});

describe('normalizeIngredientItemsForPersist', () => {
  it('trims, drops fully blank rows, coerces empty origin to null', () => {
    const r = normalizeIngredientItemsForPersist([
      { name: '  a  ', origin: '   ' },
      { name: '', origin: '' },
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

  it('rejects empty ingredient name when origin is set', () => {
    const r = normalizeIngredientItemsForPersist([{ name: '', origin: 'Spain' }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/name/i);
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
