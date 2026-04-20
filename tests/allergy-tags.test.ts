import {
  allergyDishTags,
  allergyLabelToBase,
  avoidanceDishTags,
  avoidanceLabelToBase,
  smartTagFilterLabel,
} from '@/lib/allergy-tags';

describe('allergyLabelToBase', () => {
  it('removes allergy suffix and title-cases the allergen', () => {
    expect(allergyLabelToBase('seafood allergy')).toBe('Seafood');
  });

  it('normalizes common plural allergen labels', () => {
    expect(allergyLabelToBase('Peanuts allergy')).toBe('Peanut');
    expect(allergyLabelToBase('tree nuts allergy')).toBe('Tree nut');
  });
});

describe('allergyDishTags', () => {
  it('builds content, warning, and safe tags for allergy preferences', () => {
    expect(allergyDishTags('Seafood allergy')).toEqual(['Seafood', 'Contains seafood', 'Seafood-free']);
  });
});

describe('smartTagFilterLabel', () => {
  it('uses the safe tag as the filter chip for allergies', () => {
    expect(smartTagFilterLabel({ category: 'allergy', label: 'Seafood allergy' })).toBe('Seafood-free');
  });

  it('uses the safe tag as the filter chip for dislikes', () => {
    expect(smartTagFilterLabel({ category: 'dislike', label: 'No Cilantro' })).toBe('Cilantro-free');
  });

  it('keeps likes and generic preferences unchanged', () => {
    expect(smartTagFilterLabel({ category: 'like', label: 'Loves Garlic' })).toBe('Loves Garlic');
    expect(smartTagFilterLabel({ category: 'preference', label: 'High Protein' })).toBe('High Protein');
  });
});

describe('avoidanceLabelToBase', () => {
  it('removes dislike prefixes and title-cases the avoided ingredient', () => {
    expect(avoidanceLabelToBase('No Cilantro')).toBe('Cilantro');
    expect(avoidanceLabelToBase('No Olives')).toBe('Olive');
  });
});

describe('avoidanceDishTags', () => {
  it('builds content, warning, and safe tags for dislike preferences', () => {
    expect(avoidanceDishTags('No Cilantro')).toEqual(['Cilantro', 'Contains cilantro', 'Cilantro-free']);
  });
});
