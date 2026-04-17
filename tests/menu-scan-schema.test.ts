import {
  validateParsedMenu,
  parsedMenuHasItems,
  dishRowToParsedItem,
  assembleParsedMenu,
  parseMenuItemIngredients,
  structuredIngredientsForPersist,
  MENU_SCAN_SCHEMA_VERSION,
  type DinerScannedDishRow,
  type DinerMenuSectionRow,
  type ParsedMenuItem,
} from '@/lib/menu-scan-schema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validMenu(): Record<string, unknown> {
  return {
    schema_version: MENU_SCAN_SCHEMA_VERSION,
    restaurant_name: 'Test Restaurant',
    sections: [
      {
        id: 'sec-1',
        title: 'Appetizers',
        items: [
          {
            id: 'dish-1',
            name: 'Spring Roll',
            description: 'Crispy rolls',
            price: { amount: 8.99, currency: 'USD', display: '$8.99' },
            spice_level: 1,
            tags: ['Vegetarian'],
            ingredients: ['cabbage', 'carrot'],
          },
        ],
      },
    ],
  };
}

function validDishRow(overrides: Partial<DinerScannedDishRow> = {}): DinerScannedDishRow {
  return {
    id: 'dish-1',
    section_id: 'sec-1',
    sort_order: 0,
    name: 'Spring Roll',
    description: 'Crispy rolls',
    price_amount: 8.99,
    price_currency: 'USD',
    price_display: '$8.99',
    spice_level: 1,
    tags: ['Vegetarian'],
    ingredients: ['cabbage', 'carrot'],
    image_url: null,
    calories_manual: null,
    calories_estimated: null,
    ...overrides,
  };
}

function validSectionRow(overrides: Partial<DinerMenuSectionRow> = {}): DinerMenuSectionRow {
  return {
    id: 'sec-1',
    scan_id: 'scan-1',
    title: 'Appetizers',
    sort_order: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseMenuItemIngredients
// ---------------------------------------------------------------------------

describe('parseMenuItemIngredients', () => {
  it('splits comma- and semicolon-separated strings', () => {
    expect(parseMenuItemIngredients('a, b;c')).toEqual({
      names: ['a', 'b', 'c'],
      items: [
        { name: 'a', origin: null },
        { name: 'b', origin: null },
        { name: 'c', origin: null },
      ],
    });
  });

  it('accepts string array entries', () => {
    expect(parseMenuItemIngredients([' x ', 'y'])).toEqual({
      names: ['x', 'y'],
      items: [
        { name: 'x', origin: null },
        { name: 'y', origin: null },
      ],
    });
  });

  it('accepts object array with optional origin', () => {
    expect(
      parseMenuItemIngredients([
        { name: 'Tomato', origin: 'Spain' },
        { name: 'Salt', origin: null },
      ]),
    ).toEqual({
      names: ['Tomato', 'Salt'],
      items: [
        { name: 'Tomato', origin: 'Spain' },
        { name: 'Salt', origin: null },
      ],
    });
  });

  it('drops blank entries and objects without a name', () => {
    expect(parseMenuItemIngredients(['', '  ', { name: '  ' }, { name: 'OK' }])).toEqual({
      names: ['OK'],
      items: [{ name: 'OK', origin: null }],
    });
  });

  it('accepts ingredient as alternate to name on objects', () => {
    expect(parseMenuItemIngredients([{ ingredient: '  corn  ', origin: 'US' }])).toEqual({
      names: ['corn'],
      items: [{ name: 'corn', origin: 'US' }],
    });
  });

  it('returns empty for unknown primitives', () => {
    expect(parseMenuItemIngredients(42)).toEqual({ names: [], items: [] });
  });
});

describe('structuredIngredientsForPersist', () => {
  function minItem(over: Partial<ParsedMenuItem>): ParsedMenuItem {
    return {
      id: 'dish-1',
      name: 'Dish',
      description: null,
      price: { amount: 1, currency: 'USD', display: '$1' },
      spice_level: 0,
      tags: [],
      ingredients: ['a', 'b'],
      ...over,
    };
  }

  it('builds rows from ingredients when ingredientItems omitted', () => {
    expect(structuredIngredientsForPersist(minItem({}))).toEqual([
      { name: 'a', origin: null },
      { name: 'b', origin: null },
    ]);
  });

  it('prefers ingredientItems when present', () => {
    expect(
      structuredIngredientsForPersist(
        minItem({ ingredientItems: [{ name: 'x', origin: 'local' }], ingredients: ['ignored'] }),
      ),
    ).toEqual([{ name: 'x', origin: 'local' }]);
  });

  it('derives rows from dish name when ingredients are empty', () => {
    expect(
      structuredIngredientsForPersist(
        minItem({ name: 'Pop corn', ingredients: [], ingredientItems: undefined }),
      ),
    ).toEqual([
      { name: 'Pop', origin: null },
      { name: 'corn', origin: null },
    ]);
  });
});

// ---------------------------------------------------------------------------
// validateParsedMenu
// ---------------------------------------------------------------------------

describe('validateParsedMenu', () => {
  it('returns error when input is null', () => {
    const result = validateParsedMenu(null);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/body must be an object/);
  });

  it('returns error when input is a primitive string', () => {
    const result = validateParsedMenu('not an object');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/body must be an object/);
  });

  it('returns error when schema_version is wrong', () => {
    const result = validateParsedMenu({ ...validMenu(), schema_version: 99 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/schema_version/);
  });

  it('returns error when restaurant_name is a number', () => {
    const result = validateParsedMenu({ ...validMenu(), restaurant_name: 42 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/restaurant_name/);
  });

  it('returns error when sections is not an array', () => {
    const result = validateParsedMenu({ ...validMenu(), sections: 'bad' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/sections/);
  });

  it('returns error when a section is missing id', () => {
    const menu = validMenu();
    (menu.sections as Array<Record<string, unknown>>)[0].id = '';
    const result = validateParsedMenu(menu);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Invalid section at index 0/);
  });

  it('returns error when a section is missing title', () => {
    const menu = validMenu();
    (menu.sections as Array<Record<string, unknown>>)[0].title = '';
    const result = validateParsedMenu(menu);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Invalid section at index 0/);
  });

  it('returns error when a dish has invalid spice_level', () => {
    const menu = validMenu();
    const items = ((menu.sections as Array<Record<string, unknown>>)[0].items as Array<Record<string, unknown>>);
    items[0].spice_level = 5;
    const result = validateParsedMenu(menu);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Invalid section at index 0/);
  });

  it('returns error when a dish price is missing currency', () => {
    const menu = validMenu();
    const items = ((menu.sections as Array<Record<string, unknown>>)[0].items as Array<Record<string, unknown>>);
    (items[0].price as Record<string, unknown>).currency = '';
    const result = validateParsedMenu(menu);
    expect(result.ok).toBe(false);
  });

  it('returns ok:true for a valid minimal menu', () => {
    const result = validateParsedMenu(validMenu());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.schema_version).toBe(MENU_SCAN_SCHEMA_VERSION);
      expect(result.value.sections).toHaveLength(1);
    }
  });

  it('accepts null restaurant_name', () => {
    const result = validateParsedMenu({ ...validMenu(), restaurant_name: null });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.restaurant_name).toBeNull();
  });

  it('accepts a menu with multiple sections and items', () => {
    const menu = validMenu();
    (menu.sections as unknown[]).push({
      id: 'sec-2',
      title: 'Mains',
      items: [
        {
          id: 'dish-2',
          name: 'Noodles',
          description: null,
          price: { amount: null, currency: 'USD', display: null },
          spice_level: 0,
          tags: [],
          ingredients: [],
        },
      ],
    });
    const result = validateParsedMenu(menu);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.sections).toHaveLength(2);
  });

  it('accepts empty sections array', () => {
    const result = validateParsedMenu({ ...validMenu(), sections: [] });
    expect(result.ok).toBe(true);
  });

  it('accepts ingredients as undefined (treated as empty array)', () => {
    const menu = validMenu();
    const items = ((menu.sections as Array<Record<string, unknown>>)[0].items as Array<Record<string, unknown>>);
    delete items[0].ingredients;
    const result = validateParsedMenu(menu);
    expect(result.ok).toBe(true);
  });

  it('accepts ingredients as a comma-separated string and exposes ingredientItems', () => {
    const menu = validMenu();
    const items = ((menu.sections as Array<Record<string, unknown>>)[0].items as Array<Record<string, unknown>>);
    items[0].ingredients = 'cabbage, carrot';
    const result = validateParsedMenu(menu);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const dish = result.value.sections[0].items[0];
      expect(dish.ingredients).toEqual(['cabbage', 'carrot']);
      expect(dish.ingredientItems).toEqual([
        { name: 'cabbage', origin: null },
        { name: 'carrot', origin: null },
      ]);
    }
  });

  it('accepts ingredients as objects with optional origin', () => {
    const menu = validMenu();
    const items = ((menu.sections as Array<Record<string, unknown>>)[0].items as Array<Record<string, unknown>>);
    items[0].ingredients = [{ name: 'Beef', origin: 'Local ranch' }, { name: 'Salt' }];
    const result = validateParsedMenu(menu);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const dish = result.value.sections[0].items[0];
      expect(dish.ingredients).toEqual(['Beef', 'Salt']);
      expect(dish.ingredientItems).toEqual([
        { name: 'Beef', origin: 'Local ranch' },
        { name: 'Salt', origin: null },
      ]);
    }
  });

  it('fills ingredients from dish name when LLM returns empty list', () => {
    const menu = validMenu();
    const items = ((menu.sections as Array<Record<string, unknown>>)[0].items as Array<Record<string, unknown>>);
    items[0].name = 'Pop corn';
    items[0].ingredients = [];
    const result = validateParsedMenu(menu);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const dish = result.value.sections[0].items[0];
      expect(dish.ingredients).toEqual(['Pop', 'corn']);
      expect(dish.ingredientItems).toEqual([
        { name: 'Pop', origin: null },
        { name: 'corn', origin: null },
      ]);
    }
  });

  it('uses ingredient_items when ingredients is empty', () => {
    const menu = validMenu();
    const items = ((menu.sections as Array<Record<string, unknown>>)[0].items as Array<Record<string, unknown>>);
    items[0].ingredients = [];
    items[0].ingredient_items = [{ ingredient: 'kernels' }];
    const result = validateParsedMenu(menu);
    expect(result.ok).toBe(true);
    if (result.ok) {
      const dish = result.value.sections[0].items[0];
      expect(dish.ingredients).toEqual(['kernels']);
      expect(dish.ingredientItems).toEqual([{ name: 'kernels', origin: null }]);
    }
  });
});

// ---------------------------------------------------------------------------
// parsedMenuHasItems
// ---------------------------------------------------------------------------

describe('parsedMenuHasItems', () => {
  it('returns false when sections array is empty', () => {
    const result = validateParsedMenu({ ...validMenu(), sections: [] });
    expect(result.ok).toBe(true);
    if (result.ok) expect(parsedMenuHasItems(result.value)).toBe(false);
  });

  it('returns false when all sections have no items', () => {
    const menu = {
      ...validMenu(),
      sections: [{ id: 'sec-1', title: 'Empty', items: [] }],
    };
    const result = validateParsedMenu(menu);
    expect(result.ok).toBe(true);
    if (result.ok) expect(parsedMenuHasItems(result.value)).toBe(false);
  });

  it('returns true when at least one section has items', () => {
    const result = validateParsedMenu(validMenu());
    expect(result.ok).toBe(true);
    if (result.ok) expect(parsedMenuHasItems(result.value)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// dishRowToParsedItem
// ---------------------------------------------------------------------------

describe('dishRowToParsedItem', () => {
  it('maps all fields correctly from a valid row', () => {
    const row = validDishRow();
    const item = dishRowToParsedItem(row);
    expect(item.id).toBe('dish-1');
    expect(item.name).toBe('Spring Roll');
    expect(item.description).toBe('Crispy rolls');
    expect(item.price.amount).toBe(8.99);
    expect(item.price.currency).toBe('USD');
    expect(item.price.display).toBe('$8.99');
    expect(item.spice_level).toBe(1);
    expect(item.tags).toEqual(['Vegetarian']);
    expect(item.ingredients).toEqual(['cabbage', 'carrot']);
    expect(item.image_url).toBeNull();
    expect(item.ingredientItems).toBeUndefined();
  });

  it('includes ingredientItems when ingredient_items json is present', () => {
    const row = validDishRow({
      ingredient_items: [
        { name: 'Tomato', origin: 'Local farm' },
        { name: 'Salt', origin: null },
      ],
    });
    const item = dishRowToParsedItem(row);
    expect(item.ingredientItems).toEqual([
      { name: 'Tomato', origin: 'Local farm' },
      { name: 'Salt', origin: null },
    ]);
  });

  it('maps null description and price fields correctly', () => {
    const row = validDishRow({ description: null, price_amount: null, price_display: null });
    const item = dishRowToParsedItem(row);
    expect(item.description).toBeNull();
    expect(item.price.amount).toBeNull();
    expect(item.price.display).toBeNull();
  });

  it('clamps spice_level above 3 down to 3', () => {
    const row = validDishRow({ spice_level: 5 as 0 | 1 | 2 | 3 });
    const item = dishRowToParsedItem(row);
    expect(item.spice_level).toBe(3);
  });

  it('clamps negative spice_level up to 0', () => {
    const row = validDishRow({ spice_level: -1 as 0 | 1 | 2 | 3 });
    const item = dishRowToParsedItem(row);
    expect(item.spice_level).toBe(0);
  });

  it('returns empty arrays for non-array tags and ingredients', () => {
    const row = validDishRow({ tags: null as unknown as string[], ingredients: null as unknown as string[] });
    const item = dishRowToParsedItem(row);
    expect(item.tags).toEqual([]);
    expect(item.ingredients).toEqual([]);
  });

  it('maps image_url string correctly', () => {
    const row = validDishRow({ image_url: 'https://example.com/img.jpg' });
    const item = dishRowToParsedItem(row);
    expect(item.image_url).toBe('https://example.com/img.jpg');
  });
});

// ---------------------------------------------------------------------------
// assembleParsedMenu
// ---------------------------------------------------------------------------

describe('assembleParsedMenu', () => {
  it('returns empty sections when no sections provided', () => {
    const menu = assembleParsedMenu('My Restaurant', [], []);
    expect(menu.restaurant_name).toBe('My Restaurant');
    expect(menu.sections).toHaveLength(0);
  });

  it('sets restaurant_name to null when passed null', () => {
    const menu = assembleParsedMenu(null, [], []);
    expect(menu.restaurant_name).toBeNull();
  });

  it('sorts sections by sort_order ascending', () => {
    const sections = [
      validSectionRow({ id: 'sec-2', title: 'Mains', sort_order: 2 }),
      validSectionRow({ id: 'sec-1', title: 'Appetizers', sort_order: 1 }),
    ];
    const menu = assembleParsedMenu(null, sections, []);
    expect(menu.sections[0].title).toBe('Appetizers');
    expect(menu.sections[1].title).toBe('Mains');
  });

  it('sorts dishes within a section by sort_order ascending', () => {
    const sections = [validSectionRow()];
    const dishes = [
      validDishRow({ id: 'dish-2', name: 'Noodles', sort_order: 2 }),
      validDishRow({ id: 'dish-1', name: 'Spring Roll', sort_order: 1 }),
    ];
    const menu = assembleParsedMenu(null, sections, dishes);
    expect(menu.sections[0].items[0].name).toBe('Spring Roll');
    expect(menu.sections[0].items[1].name).toBe('Noodles');
  });

  it('places dishes in their correct section', () => {
    const sections = [
      validSectionRow({ id: 'sec-1', title: 'Appetizers', sort_order: 0 }),
      validSectionRow({ id: 'sec-2', title: 'Mains', sort_order: 1 }),
    ];
    const dishes = [
      validDishRow({ id: 'dish-1', section_id: 'sec-1', sort_order: 0 }),
      validDishRow({ id: 'dish-2', section_id: 'sec-2', sort_order: 0 }),
    ];
    const menu = assembleParsedMenu(null, sections, dishes);
    expect(menu.sections[0].items).toHaveLength(1);
    expect(menu.sections[1].items).toHaveLength(1);
    expect(menu.sections[0].items[0].id).toBe('dish-1');
    expect(menu.sections[1].items[0].id).toBe('dish-2');
  });

  it('produces empty items for a section with no matching dishes', () => {
    const sections = [validSectionRow({ id: 'sec-1' })];
    const dishes = [validDishRow({ section_id: 'sec-99' })];
    const menu = assembleParsedMenu(null, sections, dishes);
    expect(menu.sections[0].items).toHaveLength(0);
  });

  it('sets schema_version correctly', () => {
    const menu = assembleParsedMenu(null, [], []);
    expect(menu.schema_version).toBe(MENU_SCAN_SCHEMA_VERSION);
  });
});
