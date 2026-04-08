import {
  parsePreferenceText,
  normalizeTagKey,
  type ParsedSmartTag,
  type SmartTagCategory,
} from '@/lib/parseSmartPreferences';

// ---------------------------------------------------------------------------
// normalizeTagKey
// ---------------------------------------------------------------------------

describe('normalizeTagKey', () => {
  it('lowercases the label and prepends category', () => {
    expect(normalizeTagKey('Peanut Allergy', 'allergy')).toBe('allergy:peanut allergy');
  });

  it('trims leading and trailing whitespace from label', () => {
    expect(normalizeTagKey('  shellfish  ', 'dislike')).toBe('dislike:shellfish');
  });

  it('produces unique keys for different categories with the same label', () => {
    const k1 = normalizeTagKey('Spicy Food', 'like');
    const k2 = normalizeTagKey('Spicy Food', 'dislike');
    expect(k1).not.toBe(k2);
  });

  it('works for all four valid categories', () => {
    const categories: SmartTagCategory[] = ['allergy', 'dislike', 'like', 'preference'];
    categories.forEach((cat) => {
      expect(normalizeTagKey('Test', cat)).toBe(`${cat}:test`);
    });
  });
});

// ---------------------------------------------------------------------------
// parsePreferenceText — empty / whitespace input
// ---------------------------------------------------------------------------

describe('parsePreferenceText — empty input', () => {
  it('returns empty array for empty string', () => {
    expect(parsePreferenceText('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(parsePreferenceText('   ')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// parsePreferenceText — allergy patterns
// (exercises capitalizeFirst and titleCaseWords internally)
// ---------------------------------------------------------------------------

describe('parsePreferenceText — allergy patterns', () => {
  it('parses "allergic to X" into an allergy tag', () => {
    const result = parsePreferenceText('allergic to peanuts');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<ParsedSmartTag>({ category: 'allergy', label: 'Peanuts allergy' });
  });

  it('parses "X allergy" into an allergy tag', () => {
    const result = parsePreferenceText('shellfish allergy');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<ParsedSmartTag>({ category: 'allergy', label: 'Shellfish allergy' });
  });

  it('parses "I have a X allergy" into an allergy tag', () => {
    const result = parsePreferenceText("I have a nut allergy");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<ParsedSmartTag>({ category: 'allergy', label: 'Nut allergy' });
  });
});

// ---------------------------------------------------------------------------
// parsePreferenceText — dislike patterns
// ---------------------------------------------------------------------------

describe('parsePreferenceText — dislike patterns', () => {
  it('parses "don\'t like X" into a dislike tag', () => {
    const result = parsePreferenceText("don't like cilantro");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<ParsedSmartTag>({ category: 'dislike', label: 'No Cilantro' });
  });

  it('parses "I do not like X" into a dislike tag', () => {
    const result = parsePreferenceText('I do not like olives');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<ParsedSmartTag>({ category: 'dislike', label: 'No Olives' });
  });

  it('parses "dislike X" into a dislike tag', () => {
    const result = parsePreferenceText('dislike mushrooms');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<ParsedSmartTag>({ category: 'dislike', label: 'No Mushrooms' });
  });

  it('parses "hate X" into a dislike tag', () => {
    const result = parsePreferenceText('hate anchovies');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<ParsedSmartTag>({ category: 'dislike', label: 'No Anchovies' });
  });

  it('parses "no X" into a dislike tag', () => {
    const result = parsePreferenceText('no onions');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<ParsedSmartTag>({ category: 'dislike', label: 'No onions' });
  });
});

// ---------------------------------------------------------------------------
// parsePreferenceText — like patterns
// ---------------------------------------------------------------------------

describe('parsePreferenceText — like patterns', () => {
  it('parses "loves X" into a like tag', () => {
    const result = parsePreferenceText('loves spicy food');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<ParsedSmartTag>({ category: 'like', label: 'Loves Spicy Food' });
  });

  it('parses "i like X" into a like tag', () => {
    const result = parsePreferenceText('i like sushi');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<ParsedSmartTag>({ category: 'like', label: 'Likes Sushi' });
  });
});

// ---------------------------------------------------------------------------
// parsePreferenceText — preference / keyword patterns
// ---------------------------------------------------------------------------

describe('parsePreferenceText — preference patterns', () => {
  it('recognises "keto" as a preference tag', () => {
    const result = parsePreferenceText('keto');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<ParsedSmartTag>({ category: 'preference', label: 'Keto' });
  });

  it('recognises "halal" as a preference tag', () => {
    const result = parsePreferenceText('halal');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<ParsedSmartTag>({ category: 'preference', label: 'Halal' });
  });

  it('recognises "high protein" as a preference tag', () => {
    const result = parsePreferenceText('high protein');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<ParsedSmartTag>({ category: 'preference', label: 'High Protein' });
  });

  it('falls back to preference for unrecognised free text', () => {
    const result = parsePreferenceText('warm meals only');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject<ParsedSmartTag>({ category: 'preference', label: 'Warm meals only' });
  });
});

// ---------------------------------------------------------------------------
// parsePreferenceText — clause splitting (exercises splitClauses internally)
// ---------------------------------------------------------------------------

describe('parsePreferenceText — clause splitting', () => {
  it('splits on comma to produce multiple tags', () => {
    const result = parsePreferenceText("allergic to peanuts, don't like cilantro");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject<ParsedSmartTag>({ category: 'allergy', label: 'Peanuts allergy' });
    expect(result[1]).toMatchObject<ParsedSmartTag>({ category: 'dislike', label: 'No Cilantro' });
  });

  it('splits on "and" to produce multiple tags', () => {
    const result = parsePreferenceText('keto and halal');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject<ParsedSmartTag>({ category: 'preference', label: 'Keto' });
    expect(result[1]).toMatchObject<ParsedSmartTag>({ category: 'preference', label: 'Halal' });
  });

  it('splits on semicolon to produce multiple tags', () => {
    const result = parsePreferenceText('loves sushi; no onions');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject<ParsedSmartTag>({ category: 'like', label: 'Loves Sushi' });
    expect(result[1]).toMatchObject<ParsedSmartTag>({ category: 'dislike', label: 'No onions' });
  });

  it('deduplicates identical tags in the same input', () => {
    const result = parsePreferenceText("don't like cilantro, don't like cilantro");
    expect(result).toHaveLength(1);
  });
});
