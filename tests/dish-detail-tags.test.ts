import {
  deriveDishInfoTags,
  derivePersonalizedDietaryIndicators,
  personalizedDietaryTagSet,
} from '@/lib/dish-detail-tags';
import type { DinerPreferenceSnapshot } from '@/lib/diner-preferences';

const prefs: DinerPreferenceSnapshot = {
  budget_tier: null,
  spice_level: null,
  dietaryKeys: ['Dairy-free'],
  cuisineNames: [],
  smartTags: [
    { id: 'allergy-1', category: 'allergy', label: 'Seafood allergy' },
    { id: 'dislike-1', category: 'dislike', label: 'No Cilantro' },
    { id: 'like-1', category: 'like', label: 'Loves Garlic' },
  ],
};

describe('personalizedDietaryTagSet', () => {
  it('uses saved dietary preferences and personalized safe tags', () => {
    expect(Array.from(personalizedDietaryTagSet(prefs)).sort()).toEqual([
      'cilantro-free',
      'dairy-free',
      'seafood-free',
    ]);
  });
});

describe('derivePersonalizedDietaryIndicators', () => {
  it('only treats tags from personalized dietary preferences as dietary indicators', () => {
    expect(
      derivePersonalizedDietaryIndicators(
        ['Dairy-free', 'Seafood-free', 'Cilantro-free', 'Vegetarian', 'Contains seafood', 'Contains cilantro'],
        prefs
      )
    ).toEqual(['Dairy Free', 'Seafood Free', 'Cilantro Free']);
  });

  it('does not use a hardcoded dietary fallback when preferences are absent', () => {
    expect(derivePersonalizedDietaryIndicators(['Vegetarian', 'Dairy-free'], null)).toEqual([]);
  });
});

describe('deriveDishInfoTags', () => {
  it('keeps non-dietary personalized and warning tags in the general tag list', () => {
    expect(
      deriveDishInfoTags(
        ['Dairy-free', 'Seafood-free', 'Cilantro-free', 'Contains seafood', 'Contains cilantro', 'Loves Garlic', '$$'],
        0,
        null,
        prefs
      )
    ).toEqual(['Contains Seafood', 'Contains Cilantro', 'Loves Garlic']);
  });
});
